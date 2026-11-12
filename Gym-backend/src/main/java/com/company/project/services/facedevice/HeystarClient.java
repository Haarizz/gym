package com.company.project.services.facedevice;

import com.company.project.entities.FaceDevice;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Talks to a Heystar face terminal through its HTTP middleware: the same three calls,
 * parameters and success rule as the old GymBios PHP cron (heystar.php):
 * form-encoded POSTs carrying deviceKey + secret, and {"code":"000"} means success.
 */
@Component
public class HeystarClient {

    public static final String OK_CODE = "000";

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * One middleware answer. {@code reachable} is false when no HTTP answer came back at all;
     * {@code deviceProblem} marks answers that mean "try again later" (gateway / device offline /
     * timeout), the PHP cron's retry rule.
     */
    public record Result(boolean ok, boolean reachable, boolean deviceProblem, String code, String message) {
        public String describe() {
            if (!reachable) return "Middleware not reachable: " + message;
            String c = code == null ? "" : "code " + code;
            if (message == null || message.isBlank()) return c.isEmpty() ? "No message" : c;
            return c.isEmpty() ? message : message + " (" + c + ")";
        }
    }

    /** Creates or updates the person: name, access group, verify style and the valid-from/to window. */
    public Result createPerson(FaceDevice d, String sn, String name, long validFromMs, long validToMs) {
        Map<String, String> p = base(d);
        p.put("sn", sn);
        p.put("name", name);
        p.put("type", "1");
        p.put("acGroupNumber", String.valueOf(d.getAccessGroup()));
        p.put("verifyStyle", String.valueOf(d.getVerifyStyle()));
        p.put("expiredType", "1");          // 1 = time-based validity
        p.put("validTimeBegin", String.valueOf(validFromMs));
        p.put("validTimeEnd", String.valueOf(validToMs));
        return post(d, "/api/person/create", p);
    }

    /** Uploads (merges) the person's face photo. */
    public Result uploadFace(FaceDevice d, String sn, String imgBase64, String imgUrl) {
        Map<String, String> p = base(d);
        p.put("personSn", sn);
        if (imgUrl != null) p.put("imgUrl", imgUrl);
        p.put("imgBase64", imgBase64);
        return post(d, "/api/face/merge", p);
    }

    /** Removes the person's face so the terminal no longer recognises them. */
    public Result deleteFace(FaceDevice d, String sn) {
        Map<String, String> p = base(d);
        p.put("personSn", sn);
        return post(d, "/api/face/delete", p);
    }

    private Map<String, String> base(FaceDevice d) {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("deviceKey", d.getDeviceKey());
        p.put("secret", d.getDeviceSecret());
        return p;
    }

    private Result post(FaceDevice d, String path, Map<String, String> params) {
        String body = params.entrySet().stream()
                .map(e -> enc(e.getKey()) + "=" + enc(e.getValue()))
                .collect(Collectors.joining("&"));
        HttpResponse<String> res;
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(stripSlash(d.getMiddlewareUrl()) + path))
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            res = http.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Result(false, false, true, null, "interrupted");
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return new Result(false, false, true, null, msg);
        }

        String raw = res.body() == null ? "" : res.body().trim();
        String code = null;
        String msg = null;
        try {
            JsonNode n = mapper.readTree(raw);
            if (n != null && n.isObject()) {
                if (n.hasNonNull("code")) code = n.get("code").asText();
                if (n.hasNonNull("msg")) msg = n.get("msg").asText();
                else if (n.hasNonNull("message")) msg = n.get("message").asText();
            }
        } catch (Exception ignored) {
            // not JSON — keep the raw text as the message
        }
        if (msg == null) msg = raw.length() > 300 ? raw.substring(0, 300) + "…" : raw;
        if (res.statusCode() >= 400 && code == null) {
            return new Result(false, true, res.statusCode() >= 500, String.valueOf(res.statusCode()),
                    "HTTP " + res.statusCode() + (msg.isBlank() ? "" : ": " + msg));
        }
        boolean ok = OK_CODE.equals(code);
        return new Result(ok, true, !ok && isDeviceProblem(msg), code, msg);
    }

    /** The PHP cron's rule: these messages mean the device or its gateway is down — retry later. */
    static boolean isDeviceProblem(String msg) {
        if (msg == null) return false;
        String m = msg.toLowerCase(Locale.ROOT);
        return m.contains("gateway") || m.contains("device") || m.contains("timeout")
                || m.contains("connection") || m.contains("offline");
    }

    static String stripSlash(String url) {
        String u = url == null ? "" : url.trim();
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        return u;
    }

    private static String enc(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }
}
