package com.company.project.services.email;

import com.company.project.entities.EmailSettings;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.EmailSettingsRepository;
import com.company.project.services.EmailService;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** GymOS › Settings › Email: the gym's SMTP mailbox — read, save, and send a test email. */
@Service
public class EmailSettingsService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s,;]+@[^@\\s,;]+\\.[^@\\s,;]+$");
    private static final int MAX_PDF_BYTES = 5 * 1024 * 1024;

    private final EmailSettingsRepository repository;
    private final GymMailResolver resolver;
    private final EmailService emailService;

    public EmailSettingsService(EmailSettingsRepository repository, GymMailResolver resolver, EmailService emailService) {
        this.repository = repository;
        this.resolver = resolver;
        this.emailService = emailService;
    }

    // ------------------------------------------------------------------ wire types (camelCase)

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record Request(Boolean enabled, String host, Integer port, String security, String username,
                          /** Blank keeps the saved password. */ String password, Boolean clearPassword,
                          String fromEmail, String fromName, String replyTo) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record Response(boolean saved, boolean enabled, String host, Integer port, String security, String username,
                           boolean hasPassword, String fromEmail, String fromName, String replyTo,
                           OffsetDateTime lastTestAt, Boolean lastTestOk, String lastTestMessage,
                           /** The server's SMTP_* settings exist (used when the gym has none). */ boolean serverFallback,
                           /** Which account emails go out through right now: GYM, SERVER or NONE. */ String activeSource) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record TestRequest(String to, String pdfBase64, String pdfFileName) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record TestResult(boolean ok, String message, OffsetDateTime testedAt) {}

    // ------------------------------------------------------------------ read / save

    public Response get() {
        return toResponse(repository.findFirstByOrderByIdAsc().orElse(null));
    }

    public Response save(Request req) {
        EmailSettings s = repository.findFirstByOrderByIdAsc().orElseGet(EmailSettings::new);
        if (req.enabled() != null) s.setEnabled(req.enabled());
        if (req.host() != null) s.setHost(blankToNull(req.host()));
        if (req.port() != null) {
            if (req.port() < 1 || req.port() > 65535) throw new IllegalArgumentException("Port must be between 1 and 65535");
            s.setPort(req.port());
        }
        if (req.security() != null) {
            String sec = req.security().trim().toUpperCase(Locale.ROOT);
            if (!List.of(EmailSettings.SSL, EmailSettings.STARTTLS, EmailSettings.NONE).contains(sec)) {
                throw new IllegalArgumentException("Security must be SSL, STARTTLS or NONE");
            }
            s.setSecurity(sec);
        }
        if (req.username() != null) s.setUsername(blankToNull(req.username()));
        if (Boolean.TRUE.equals(req.clearPassword())) s.setPasswordEnc(null);
        if (StringUtils.hasText(req.password())) s.setPasswordEnc(resolver.encrypt(req.password()));
        if (req.fromEmail() != null) s.setFromEmail(validEmail(req.fromEmail(), "From email", false));
        if (req.fromName() != null) s.setFromName(blankToNull(req.fromName()));
        if (req.replyTo() != null) s.setReplyTo(validEmail(req.replyTo(), "Reply-to email", false));

        if (s.isEnabled()) {
            if (!StringUtils.hasText(s.getHost())) throw new IllegalArgumentException("SMTP host is required");
            if (s.getPort() == null) throw new IllegalArgumentException("SMTP port is required");
            if (!StringUtils.hasText(s.getFromEmail())) throw new IllegalArgumentException("From email is required");
            if (StringUtils.hasText(s.getUsername()) && !StringUtils.hasText(s.getPasswordEnc())) {
                throw new IllegalArgumentException("Enter the mailbox password");
            }
        }
        return toResponse(repository.save(s));
    }

    // ------------------------------------------------------------------ test

    /** Sends a test email through the SAVED gym settings (not the server fallback), optionally with a PDF. */
    public TestResult test(TestRequest req) {
        String to = validEmail(req.to(), "Send test to", true);
        EmailSettings s = repository.findFirstByOrderByIdAsc().orElse(null);
        if (s == null || !StringUtils.hasText(s.getHost()) || s.getPort() == null || !StringUtils.hasText(s.getFromEmail())) {
            throw new BusinessRuleViolationException("Fill in and save the SMTP host, port and from email first.");
        }
        List<EmailService.Attachment> attachments = List.of();
        if (StringUtils.hasText(req.pdfBase64())) {
            byte[] pdf;
            try {
                String b64 = req.pdfBase64();
                int comma = b64.indexOf(',');
                if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
                pdf = Base64.getMimeDecoder().decode(b64);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("The test PDF could not be read");
            }
            if (pdf.length > MAX_PDF_BYTES) throw new IllegalArgumentException("The test PDF is larger than 5 MB");
            if (pdf.length < 5 || !new String(pdf, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).startsWith("%PDF")) {
                throw new IllegalArgumentException("The attachment is not a PDF");
            }
            String name = StringUtils.hasText(req.pdfFileName())
                    ? req.pdfFileName().replaceAll("[^A-Za-z0-9._ -]", "_") : "Test-Invoice.pdf";
            if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")) name += ".pdf";
            attachments = List.of(new EmailService.Attachment(name, "application/pdf", pdf));
        }

        LocalDateTime at = LocalDateTime.now();
        boolean ok;
        String message;
        try {
            GymMailResolver.GymMail g = GymMailResolver.build(s, resolver.decrypt(s));
            EmailService.send(g.sender(), g.fromEmail(), g.fromName(), g.replyTo(), to,
                    "GymBios test email" + (attachments.isEmpty() ? "" : " (with test invoice)"),
                    testBody(s, at, !attachments.isEmpty()), attachments);
            ok = true;
            message = "Test email sent to " + to + (attachments.isEmpty() ? "" : " with the test invoice attached")
                    + ". Check the inbox (and the spam folder).";
        } catch (Exception e) {
            ok = false;
            message = explain(e, s);
        }
        if (s.getId() != null) repository.recordTest(s.getId(), at, ok, message);
        return new TestResult(ok, message, at.atOffset(ZoneOffset.UTC));
    }

    /** Turns JavaMail's exception chain into something a gym owner can act on. */
    static String explain(Throwable e, EmailSettings s) {
        String where = s.getHost() + ":" + s.getPort();
        Throwable root = e;
        for (Throwable t = e; t != null; t = t.getCause()) {
            root = t;
            String cls = t.getClass().getName();
            if (cls.endsWith("AuthenticationFailedException")) {
                return "The mail server rejected the username or password. Check them — for Gmail or Outlook use an "
                        + "App Password, not your normal password. (" + nz(t.getMessage()) + ")";
            }
            if (t instanceof java.net.UnknownHostException) {
                return "Mail server \"" + s.getHost() + "\" was not found. Check the SMTP host spelling.";
            }
            if (t instanceof javax.net.ssl.SSLException) {
                return "The secure connection to " + where + " failed. Port 465 normally uses SSL and port 587 uses "
                        + "STARTTLS — check the Security setting matches the port. (" + nz(t.getMessage()) + ")";
            }
            if (t instanceof java.net.SocketTimeoutException || t instanceof java.net.ConnectException) {
                return "Couldn't connect to " + where + ". Check the host and port, and that this server is allowed "
                        + "to make outgoing SMTP connections (some hosts block ports 25/465/587). (" + nz(t.getMessage()) + ")";
            }
            if (cls.endsWith("SendFailedException") || cls.endsWith("SMTPAddressFailedException")) {
                return "The mail server refused the message: " + nz(t.getMessage())
                        + ". Many servers only allow sending From the mailbox you log in with.";
            }
        }
        return "Sending failed: " + nz(root.getMessage());
    }

    private static String testBody(EmailSettings s, LocalDateTime at, boolean withInvoice) {
        String row = "<tr><td style=\"padding:4px 14px 4px 0;color:#64748b\">%s</td><td style=\"padding:4px 0\">%s</td></tr>";
        return "<div style=\"font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:600px\">"
                + "<h2 style=\"color:#15803d;margin:0 0 8px\">✓ Your email settings work</h2>"
                + "<p>This is a test email from GymBios. If you can read it, GymBios can send emails for your gym — "
                + "daily reports, receipts and notifications will go out through this mailbox.</p>"
                + (withInvoice ? "<p>A <strong>test invoice (PDF)</strong> is attached so you can check attachments arrive "
                + "and open correctly. It is a sample only — not a real invoice.</p>" : "")
                + "<table style=\"font-size:14px;border-collapse:collapse;margin-top:8px\">"
                + String.format(row, "Server", esc(s.getHost() + ":" + s.getPort()))
                + String.format(row, "Security", esc(s.getSecurity()))
                + String.format(row, "Sent from", esc((s.getFromName() != null ? s.getFromName() + " " : "") + "<" + s.getFromEmail() + ">"))
                + String.format(row, "Sent at (UTC)", esc(at.format(DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", Locale.ENGLISH))))
                + "</table>"
                + "<p style=\"color:#94a3b8;font-size:12px;margin-top:20px\">Sent from GymOS › Settings › Email.</p></div>";
    }

    // ------------------------------------------------------------------ helpers

    private Response toResponse(EmailSettings s) {
        boolean server = emailService.isServerConfigured();
        boolean gymUsable = GymMailResolver.isUsable(s);
        String active = gymUsable ? "GYM" : server ? "SERVER" : "NONE";
        if (s == null) {
            return new Response(false, true, null, 465, EmailSettings.SSL, null, false, null, null, null,
                    null, null, null, server, active);
        }
        return new Response(true, s.isEnabled(), s.getHost(), s.getPort(), s.getSecurity(), s.getUsername(),
                StringUtils.hasText(s.getPasswordEnc()), s.getFromEmail(), s.getFromName(), s.getReplyTo(),
                s.getLastTestAt() == null ? null : s.getLastTestAt().atOffset(ZoneOffset.UTC),
                s.getLastTestOk(), s.getLastTestMessage(), server, active);
    }

    private static String validEmail(String raw, String label, boolean required) {
        String e = raw == null ? "" : raw.trim();
        if (e.isEmpty()) {
            if (required) throw new IllegalArgumentException(label + " is required");
            return null;
        }
        if (!EMAIL.matcher(e).matches()) throw new IllegalArgumentException(label + " is not a valid email address: " + e);
        return e;
    }

    private static String blankToNull(String s) {
        return s == null || s.trim().isEmpty() ? null : s.trim();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static String esc(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
