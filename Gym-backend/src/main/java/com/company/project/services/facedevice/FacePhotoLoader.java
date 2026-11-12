package com.company.project.services.facedevice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Base64;
import java.util.Iterator;

/**
 * Reads a member's photo (stored as /uploads/photos/<file> on this server, an absolute URL,
 * or a data: URI) and shrinks it to a size face terminals accept.
 */
@Component
public class FacePhotoLoader {

    private static final int MAX_SIDE = 1024;
    private static final int MAX_BYTES_UNTOUCHED = 300 * 1024;
    private static final int MAX_DOWNLOAD = 8 * 1024 * 1024;

    private final Path photosDir;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public FacePhotoLoader(@Value("${app.storage.photos-dir:${user.dir}/uploads/photos}") String photosDir) {
        this.photosDir = Paths.get(photosDir).toAbsolutePath().normalize();
    }

    /** The photo as base64 JPEG/PNG, or null when it can't be found or read (message in {@code why}). */
    public String loadBase64(String photoUrl, StringBuilder why) {
        byte[] bytes;
        try {
            bytes = read(photoUrl);
        } catch (Exception e) {
            why.append("Photo could not be read: ").append(e.getMessage());
            return null;
        }
        if (bytes == null || bytes.length == 0) {
            why.append("Photo file not found (").append(photoUrl).append(")");
            return null;
        }
        return Base64.getEncoder().encodeToString(shrink(bytes));
    }

    /** The public address the middleware may download the photo from, when one can be built. */
    public String publicUrl(String photoUrl, String photoBaseUrl) {
        if (photoUrl == null) return null;
        String p = photoUrl.trim();
        if (p.startsWith("http://") || p.startsWith("https://")) return p;
        if (photoBaseUrl == null || photoBaseUrl.isBlank() || !p.startsWith("/")) return null;
        return HeystarClient.stripSlash(photoBaseUrl) + p;
    }

    private byte[] read(String photoUrl) throws Exception {
        String p = photoUrl.trim();
        if (p.startsWith("data:")) {
            int comma = p.indexOf(',');
            return comma < 0 ? null : Base64.getMimeDecoder().decode(p.substring(comma + 1));
        }
        int marker = p.indexOf("/uploads/photos/");
        if (marker >= 0) {
            String name = p.substring(marker + "/uploads/photos/".length());
            int q = name.indexOf('?');
            if (q >= 0) name = name.substring(0, q);
            Path file = photosDir.resolve(java.net.URLDecoder.decode(name, java.nio.charset.StandardCharsets.UTF_8)).normalize();
            if (file.startsWith(photosDir) && Files.isRegularFile(file)) return Files.readAllBytes(file);
            if (!p.startsWith("http")) return null;
        }
        if (p.startsWith("http://") || p.startsWith("https://")) {
            HttpRequest req = HttpRequest.newBuilder(URI.create(p)).timeout(Duration.ofSeconds(20)).GET().build();
            HttpResponse<byte[]> res = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
            if (res.statusCode() >= 400) throw new IllegalStateException("HTTP " + res.statusCode() + " from " + p);
            byte[] body = res.body();
            if (body != null && body.length > MAX_DOWNLOAD) throw new IllegalStateException("photo is larger than 8 MB");
            return body;
        }
        return null;
    }

    /** Large photos are scaled to at most 1024px and re-encoded as JPEG; formats Java can't decode pass through. */
    static byte[] shrink(byte[] bytes) {
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(bytes));
            if (img == null) return bytes;
            int w = img.getWidth();
            int h = img.getHeight();
            if (Math.max(w, h) <= MAX_SIDE && bytes.length <= MAX_BYTES_UNTOUCHED) return bytes;
            double scale = Math.min(1.0, (double) MAX_SIDE / Math.max(w, h));
            int nw = Math.max(1, (int) Math.round(w * scale));
            int nh = Math.max(1, (int) Math.round(h * scale));
            BufferedImage out = new BufferedImage(nw, nh, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = out.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setColor(java.awt.Color.WHITE);
            g.fillRect(0, 0, nw, nh);
            g.drawImage(img, 0, 0, nw, nh, null);
            g.dispose();

            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
            if (!writers.hasNext()) return bytes;
            ImageWriter writer = writers.next();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
                writer.setOutput(ios);
                ImageWriteParam param = writer.getDefaultWriteParam();
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(0.85f);
                writer.write(null, new IIOImage(out, null, null), param);
            } finally {
                writer.dispose();
            }
            return baos.toByteArray();
        } catch (Exception e) {
            return bytes;
        }
    }
}
