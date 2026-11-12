package com.company.project.services;

import com.company.project.services.email.GymMailResolver;
import com.company.project.services.email.GymMailResolver.GymMail;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

/**
 * Sends every GymBios email. Uses the gym's own mailbox when one is set up in
 * GymOS › Settings › Email (GymMailResolver, per gym database); otherwise the server-wide
 * SMTP_* / MESSAGE_EMAIL_FROM settings.
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final GymMailResolver gymMail;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${messaging.email.from:}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender, GymMailResolver gymMail) {
        this.mailSender = mailSender;
        this.gymMail = gymMail;
    }

    /** A file attached to an email. */
    public record Attachment(String fileName, String contentType, byte[] content) {}

    /** True when this gym (or, failing that, the server) has an SMTP account to send with. */
    public boolean isConfigured() {
        return gymMail.current().isPresent() || isServerConfigured();
    }

    /** The server-wide SMTP_* settings, used when the gym has none of its own. */
    public boolean isServerConfigured() {
        return StringUtils.hasText(mailHost) && StringUtils.hasText(fromEmail);
    }

    public void sendEmail(String to, String subject, String htmlContent) {
        sendEmail(to, subject, htmlContent, List.of());
    }

    public void sendEmail(String to, String subject, String htmlContent, List<Attachment> attachments) {
        Optional<GymMail> gym = gymMail.current();
        if (gym.isPresent()) {
            GymMail g = gym.get();
            send(g.sender(), g.fromEmail(), g.fromName(), g.replyTo(), to, subject, htmlContent, attachments);
            return;
        }
        if (!isServerConfigured()) {
            throw new IllegalStateException("SMTP email is not configured");
        }
        send(mailSender, fromEmail, null, null, to, subject, htmlContent, attachments);
    }

    /** Sends through an explicit sender — Settings › Email's test uses it so the error is the gym account's own. */
    public static void send(JavaMailSender sender, String from, String fromName, String replyTo,
                            String to, String subject, String htmlContent, List<Attachment> attachments) {
        try {
            MimeMessage message = sender.createMimeMessage();
            boolean multipart = attachments != null && !attachments.isEmpty();
            MimeMessageHelper helper = new MimeMessageHelper(message, multipart, "UTF-8");
            helper.setTo(to);
            if (StringUtils.hasText(fromName)) helper.setFrom(from, fromName);
            else helper.setFrom(from);
            if (StringUtils.hasText(replyTo)) helper.setReplyTo(replyTo);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            if (multipart) {
                for (Attachment a : attachments) {
                    helper.addAttachment(a.fileName(), new ByteArrayResource(a.content()), a.contentType());
                }
            }
            sender.send(message);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to send email: " + ex.getMessage(), ex);
        }
    }
}
