package com.company.project.community.global.content;

import com.company.project.community.global.CommunityException;
import com.company.project.controlplane.community.store.CommunityPostStore.NewImage;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

/**
 * Server-side content limits (C9), enforced before anything is persisted.
 * The database repeats the size/type/dimension limits as CHECK constraints, so
 * a bypass of this class still can't store oversized content.
 *
 * Images are judged by their bytes, not their declared type: the magic bytes
 * must match the declared JPEG/PNG type, and dimensions come from the decoder
 * reading the header (the pixels are never decoded, so a small file claiming
 * huge dimensions can't exhaust memory).
 */
@Component
public class CommunityContentValidator {

    public static final int MAX_TOPIC = 140;
    public static final int MAX_POST = 1000;
    public static final int MAX_COMMENT = 500;
    public static final int MAX_IMAGE_BYTES = 1_572_864;
    public static final int MAX_IMAGE_DIMENSION = 2048;
    public static final int MAX_REPORT_DETAILS = 500;
    public static final int MAX_MODERATION_REASON = 500;
    public static final Set<String> POST_TYPES = Set.of("achievement", "question", "tip");
    public static final Set<String> ASPECT_RATIOS = Set.of("1:1", "4:5", "9:16");
    public static final Set<String> REPORT_REASONS = Set.of("SPAM", "HARASSMENT", "HATE", "NUDITY", "VIOLENCE", "SELF_HARM", "OTHER");

    public record ValidPost(String topic, String content, String type) {}

    public ValidPost post(String topic, String content, String type) {
        String t = trimToNull(topic);
        String c = trimToNull(content);
        if (t == null) {
            throw CommunityException.invalid("TOPIC_REQUIRED", "Topic is required");
        }
        if (t.length() > MAX_TOPIC) {
            throw CommunityException.invalid("TOPIC_TOO_LONG", "Topic can be at most " + MAX_TOPIC + " characters");
        }
        if (c == null) {
            throw CommunityException.invalid("CONTENT_REQUIRED", "Content is required");
        }
        if (c.length() > MAX_POST) {
            throw CommunityException.invalid("CONTENT_TOO_LONG", "Posts can be at most " + MAX_POST + " characters");
        }
        String normalizedType = type == null || type.isBlank() ? "achievement" : type.trim().toLowerCase(Locale.ROOT);
        if (!POST_TYPES.contains(normalizedType)) {
            throw CommunityException.invalid("INVALID_TYPE", "Post type must be one of " + POST_TYPES);
        }
        return new ValidPost(t, c, normalizedType);
    }

    public String comment(String content) {
        String c = trimToNull(content);
        if (c == null) {
            throw CommunityException.invalid("CONTENT_REQUIRED", "Comment content is required");
        }
        if (c.length() > MAX_COMMENT) {
            throw CommunityException.invalid("CONTENT_TOO_LONG", "Comments can be at most " + MAX_COMMENT + " characters");
        }
        return c;
    }

    public String reportReason(String reason) {
        String r = reason == null ? null : reason.trim().toUpperCase(Locale.ROOT);
        if (r == null || !REPORT_REASONS.contains(r)) {
            throw CommunityException.invalid("INVALID_REASON", "Reason must be one of " + REPORT_REASONS);
        }
        return r;
    }

    public String optionalText(String value, int max, String code) {
        String v = trimToNull(value);
        if (v != null && v.length() > max) {
            throw CommunityException.invalid(code, "Text can be at most " + max + " characters");
        }
        return v;
    }

    /**
     * Parses and validates a {@code data:image/(jpeg|png);base64,...} URL.
     * Returns null when no image was supplied.
     */
    public NewImage image(String dataUrl, String aspectRatio, Integer cropPosition, Integer cropZoom) {
        if (dataUrl == null || dataUrl.isBlank()) {
            return null;
        }
        int comma = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:") || comma < 0) {
            throw CommunityException.invalid("IMAGE_INVALID", "Image must be a base64 data URL");
        }
        String header = dataUrl.substring(5, comma).toLowerCase(Locale.ROOT);
        if (!header.endsWith(";base64")) {
            throw CommunityException.invalid("IMAGE_INVALID", "Image must be base64 encoded");
        }
        String declared = header.substring(0, header.length() - ";base64".length());
        if (!declared.equals("image/jpeg") && !declared.equals("image/png")) {
            throw CommunityException.invalid("IMAGE_TYPE_NOT_ALLOWED", "Only JPEG and PNG images are allowed");
        }

        // Reject before decoding when the encoded length alone proves it's too big.
        long encodedLength = dataUrl.length() - comma - 1L;
        if (encodedLength / 4 * 3 > MAX_IMAGE_BYTES + 3) {
            throw CommunityException.invalid("IMAGE_TOO_LARGE", "Images can be at most 1.5 MB");
        }
        byte[] bytes;
        try {
            bytes = Base64.getMimeDecoder().decode(dataUrl.substring(comma + 1));
        } catch (IllegalArgumentException e) {
            throw CommunityException.invalid("IMAGE_INVALID", "Image data isn't valid base64");
        }
        if (bytes.length == 0) {
            throw CommunityException.invalid("IMAGE_INVALID", "Image is empty");
        }
        if (bytes.length > MAX_IMAGE_BYTES) {
            throw CommunityException.invalid("IMAGE_TOO_LARGE", "Images can be at most 1.5 MB");
        }
        String actual = sniff(bytes);
        if (!declared.equals(actual)) {
            throw CommunityException.invalid("IMAGE_TYPE_MISMATCH", "Image content doesn't match its declared type");
        }
        int[] dims = dimensions(bytes);
        if (dims[0] < 1 || dims[1] < 1 || dims[0] > MAX_IMAGE_DIMENSION || dims[1] > MAX_IMAGE_DIMENSION) {
            throw CommunityException.invalid("IMAGE_DIMENSIONS", "Images can be at most " + MAX_IMAGE_DIMENSION + "×" + MAX_IMAGE_DIMENSION);
        }

        String ratio = aspectRatio == null || aspectRatio.isBlank() ? "1:1" : aspectRatio.trim();
        if (!ASPECT_RATIOS.contains(ratio)) {
            throw CommunityException.invalid("IMAGE_ASPECT_RATIO", "Aspect ratio must be one of " + ASPECT_RATIOS);
        }
        if (cropPosition != null && (cropPosition < 0 || cropPosition > 100)) {
            throw CommunityException.invalid("IMAGE_CROP", "Crop position must be between 0 and 100");
        }
        if (cropZoom != null && (cropZoom < 100 || cropZoom > 300)) {
            throw CommunityException.invalid("IMAGE_CROP", "Zoom must be between 100 and 300");
        }
        return new NewImage(actual, bytes, dims[0], dims[1], ratio, cropPosition, cropZoom, sha256(bytes));
    }

    static String sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return "image/png";
        }
        return "unknown";
    }

    /** Reads width/height from the image header only. */
    private static int[] dimensions(byte[] bytes) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                throw CommunityException.invalid("IMAGE_INVALID", "Image can't be read");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                return new int[]{reader.getWidth(0), reader.getHeight(0)};
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw CommunityException.invalid("IMAGE_INVALID", "Image can't be read");
        }
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
