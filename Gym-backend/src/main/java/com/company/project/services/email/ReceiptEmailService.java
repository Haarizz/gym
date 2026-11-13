package com.company.project.services.email;

import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.entities.ReceiptEmail;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptEmailRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.services.EmailService;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Billing › Email receipt / Email invoice: emails a member their payment receipt or tax invoice
 * as a PDF, with a message the staff member can edit. The PDF is rendered in the browser from the
 * same document as Print (so it is identical); the message is plain text turned into a simple
 * branded HTML email here, and every attempt is logged in receipt_emails.
 */
@Service
public class ReceiptEmailService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s,;]+@[^@\\s,;]+\\.[^@\\s,;]+$");
    private static final Pattern HEX = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final int MAX_PDF_BYTES = 10 * 1024 * 1024;
    private static final int MAX_RECIPIENTS = 5;

    private final ReceiptRepository receiptRepository;
    private final MemberRepository memberRepository;
    private final ReceiptEmailRepository logRepository;
    private final EmailService emailService;

    public ReceiptEmailService(ReceiptRepository receiptRepository, MemberRepository memberRepository,
                               ReceiptEmailRepository logRepository, EmailService emailService) {
        this.receiptRepository = receiptRepository;
        this.memberRepository = memberRepository;
        this.logRepository = logRepository;
        this.emailService = emailService;
    }

    // ------------------------------------------------------------------ wire types (camelCase)

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record SendRequest(String document, String to, String subject, String message,
                              String companyName, String accentColor, String pdfBase64, String pdfFileName) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record SendResult(boolean ok, String message, String to, OffsetDateTime sentAt) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record HistoryItem(String documentType, String toEmail, String subject, String status, String error,
                              String sentBy, OffsetDateTime sentAt) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record Info(String memberEmail, String memberName, boolean mailConfigured, List<HistoryItem> history) {}

    // ------------------------------------------------------------------ info

    public Info info(Long receiptId) {
        Receipt r = find(receiptId);
        String email = null;
        if (r.getMemberDbId() != null) {
            email = memberRepository.findById(r.getMemberDbId()).map(Member::getEmail).orElse(null);
        }
        return new Info(isPlaceholder(email) ? null : email.trim(), r.getMemberName(),
                emailService.isConfigured(), history(receiptId));
    }

    /**
     * Addresses that look real but reach nobody: family dependents' "@family.local" and the old
     * GymBios's "&lt;phone&gt;@temp.local" kept on imported members (same rule as MemberAppAccountService).
     */
    static boolean isPlaceholder(String email) {
        if (!StringUtils.hasText(email)) return true;
        String e = email.trim().toLowerCase(Locale.ROOT);
        return e.endsWith("@family.local") || e.endsWith("@temp.local");
    }

    // ------------------------------------------------------------------ send

    public SendResult send(Long receiptId, SendRequest req) {
        Receipt r = find(receiptId);
        String doc = req.document() == null ? "" : req.document().trim().toUpperCase(Locale.ROOT);
        if (!ReceiptEmail.RECEIPT.equals(doc) && !ReceiptEmail.INVOICE.equals(doc)) {
            throw new IllegalArgumentException("document must be RECEIPT or INVOICE");
        }
        List<String> to = recipients(req.to());
        String subject = req.subject() == null ? "" : req.subject().trim().replaceAll("[\\r\\n]+", " ");
        if (subject.isEmpty()) throw new IllegalArgumentException("Subject is required");
        if (subject.length() > 200) throw new IllegalArgumentException("Subject is too long (200 characters max)");
        String message = req.message() == null ? "" : req.message().trim();
        if (message.isEmpty()) throw new IllegalArgumentException("Message is required");
        if (message.length() > 10_000) throw new IllegalArgumentException("Message is too long");
        byte[] pdf = pdf(req.pdfBase64());
        String fileName = fileName(req.pdfFileName(), doc, r);
        if (!emailService.isConfigured()) {
            throw new BusinessRuleViolationException("Email isn't set up for this gym yet. Add your mailbox in GymOS › Settings › Email.");
        }

        String html = html(message, req.companyName(), req.accentColor(), fileName);
        List<EmailService.Attachment> files = List.of(new EmailService.Attachment(fileName, "application/pdf", pdf));
        LocalDateTime at = LocalDateTime.now();
        String toJoined = String.join(", ", to);
        try {
            // One email per address, so members never see each other's addresses.
            for (String address : to) emailService.sendEmail(address, subject, html, files);
        } catch (Exception e) {
            String why = MailErrors.explain(e, null, null);
            log(r, doc, toJoined, subject, ReceiptEmail.FAILED, why, at);
            throw new BusinessRuleViolationException(why);
        }
        log(r, doc, toJoined, subject, ReceiptEmail.SENT, null, at);
        String what = ReceiptEmail.INVOICE.equals(doc) ? "Invoice" : "Receipt";
        return new SendResult(true, what + " emailed to " + toJoined + ".", toJoined, at.atOffset(ZoneOffset.UTC));
    }

    // ------------------------------------------------------------------ helpers

    private List<HistoryItem> history(Long receiptId) {
        try {
            return logRepository.findTop20ByReceiptIdOrderBySentAtDesc(receiptId).stream()
                    .map(e -> new HistoryItem(e.getDocumentType(), e.getToEmail(), e.getSubject(), e.getStatus(),
                            e.getError(), e.getSentBy(), e.getSentAt() == null ? null : e.getSentAt().atOffset(ZoneOffset.UTC)))
                    .toList();
        } catch (Exception e) {
            return List.of(); // a gym database the V134 catch-up hasn't reached yet
        }
    }

    private void log(Receipt r, String doc, String to, String subject, String status, String error, LocalDateTime at) {
        try {
            ReceiptEmail e = new ReceiptEmail();
            e.setReceiptId(r.getId());
            e.setDocumentType(doc);
            e.setToEmail(to);
            e.setSubject(subject.length() > 250 ? subject.substring(0, 250) : subject);
            e.setStatus(status);
            e.setError(error);
            e.setSentBy(currentUser());
            e.setSentAt(at);
            e.setBranchId(r.getBranchId());
            logRepository.save(e);
        } catch (Exception ignored) {
            // the email itself is what matters; never fail the send over its log line
        }
    }

    static List<String> recipients(String raw) {
        List<String> out = new ArrayList<>();
        if (raw != null) {
            for (String part : raw.split("[,;\\s]+")) {
                String e = part.trim();
                if (e.isEmpty()) continue;
                if (!EMAIL.matcher(e).matches()) throw new IllegalArgumentException("Not a valid email address: " + e);
                if (isPlaceholder(e)) {
                    throw new IllegalArgumentException(e + " is a placeholder address, not a real mailbox. "
                            + "Enter the member's real email.");
                }
                if (out.stream().noneMatch(e::equalsIgnoreCase)) out.add(e);
            }
        }
        if (out.isEmpty()) throw new IllegalArgumentException("Enter the member's email address");
        if (out.size() > MAX_RECIPIENTS) throw new IllegalArgumentException("Up to " + MAX_RECIPIENTS + " email addresses");
        return out;
    }

    private static byte[] pdf(String base64) {
        if (!StringUtils.hasText(base64)) throw new IllegalArgumentException("The PDF is missing");
        byte[] pdf;
        try {
            String b64 = base64;
            int comma = b64.indexOf(',');
            if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
            pdf = Base64.getMimeDecoder().decode(b64);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("The PDF could not be read");
        }
        if (pdf.length > MAX_PDF_BYTES) throw new IllegalArgumentException("The PDF is larger than 10 MB");
        if (pdf.length < 5 || !new String(pdf, 0, 5, StandardCharsets.US_ASCII).startsWith("%PDF")) {
            throw new IllegalArgumentException("The attachment is not a PDF");
        }
        return pdf;
    }

    private static String fileName(String requested, String doc, Receipt r) {
        String base = StringUtils.hasText(requested) ? requested
                : (ReceiptEmail.INVOICE.equals(doc) ? "Invoice-" : "Receipt-")
                  + (ReceiptEmail.INVOICE.equals(doc) && StringUtils.hasText(r.getInvoiceNo()) ? r.getInvoiceNo() : r.getReceiptNo());
        String name = base.replaceAll("[^A-Za-z0-9._ -]", "_").trim();
        if (name.isEmpty()) name = "Document";
        if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")) name += ".pdf";
        return name;
    }

    /** The staff-edited plain-text message as a simple branded HTML email. */
    static String html(String message, String companyName, String accentColor, String attachmentName) {
        String accent = accentColor != null && HEX.matcher(accentColor.trim()).matches() ? accentColor.trim() : "#2B7A78";
        StringBuilder body = new StringBuilder();
        for (String para : message.replace("\r\n", "\n").split("\\n\\s*\\n")) {
            if (para.isBlank()) continue;
            body.append("<p style=\"margin:0 0 14px\">").append(esc(para.trim()).replace("\n", "<br>")).append("</p>");
        }
        String header = StringUtils.hasText(companyName)
                ? "<div style=\"background:" + accent + ";color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold\">"
                  + esc(companyName.trim()) + "</div>"
                : "<div style=\"background:" + accent + ";height:6px\"></div>";
        return "<div style=\"background:#f4f6f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif\">"
                + "<div style=\"max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb\">"
                + header
                + "<div style=\"padding:24px;font-size:15px;line-height:1.6;color:#1f2937\">" + body + "</div>"
                + "<div style=\"padding:12px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px\">"
                + "📎 " + esc(attachmentName) + " is attached to this email.</div>"
                + "</div></div>";
    }

    private Receipt find(Long id) {
        return receiptRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Receipt not found: " + id));
    }

    private static String currentUser() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a == null ? null : a.getName();
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
