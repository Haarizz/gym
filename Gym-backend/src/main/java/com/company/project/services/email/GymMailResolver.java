package com.company.project.services.email;

import com.company.project.controlplane.service.CredentialEncryptionService;
import com.company.project.entities.EmailSettings;
import com.company.project.repositories.EmailSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Optional;
import java.util.Properties;

/**
 * The current gym's own SMTP mailbox (GymOS › Settings › Email), read from the gym's database
 * on every send so a saved change applies at once and each tenant uses its own account.
 * Empty when the gym hasn't set one up (or switched it off) — the server's SMTP_* settings
 * are used then.
 */
@Component
public class GymMailResolver {

    private static final Logger log = LoggerFactory.getLogger(GymMailResolver.class);
    private static final String TIMEOUT_MS = "20000";

    private final EmailSettingsRepository repository;
    private final CredentialEncryptionService crypto;

    public GymMailResolver(EmailSettingsRepository repository, CredentialEncryptionService crypto) {
        this.repository = repository;
        this.crypto = crypto;
    }

    /** A ready mail sender plus the From / Reply-To to use with it. */
    public record GymMail(JavaMailSenderImpl sender, String fromEmail, String fromName, String replyTo) {}

    public Optional<GymMail> current() {
        EmailSettings s;
        try {
            s = repository.findFirstByOrderByIdAsc().orElse(null);
        } catch (Exception e) {
            // e.g. a gym database the V129 catch-up hasn't reached yet
            log.debug("Email settings not readable: {}", e.getMessage());
            return Optional.empty();
        }
        if (!isUsable(s)) return Optional.empty();
        try {
            return Optional.of(build(s, decrypt(s)));
        } catch (Exception e) {
            log.warn("Gym email settings are unusable, falling back to the server's SMTP: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public static boolean isUsable(EmailSettings s) {
        return s != null && s.isEnabled() && StringUtils.hasText(s.getHost()) && s.getPort() != null
                && StringUtils.hasText(s.getFromEmail());
    }

    String decrypt(EmailSettings s) {
        return StringUtils.hasText(s.getPasswordEnc()) ? crypto.decrypt(s.getPasswordEnc()) : null;
    }

    public String encrypt(String plain) {
        return crypto.encrypt(plain);
    }

    static GymMail build(EmailSettings s, String password) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(s.getHost().trim());
        sender.setPort(s.getPort());
        sender.setDefaultEncoding("UTF-8");
        boolean auth = StringUtils.hasText(s.getUsername());
        if (auth) {
            sender.setUsername(s.getUsername().trim());
            sender.setPassword(password == null ? "" : password);
        }
        Properties p = sender.getJavaMailProperties();
        p.put("mail.transport.protocol", "smtp");
        p.put("mail.smtp.auth", String.valueOf(auth));
        p.put("mail.smtp.connectiontimeout", TIMEOUT_MS);
        p.put("mail.smtp.timeout", TIMEOUT_MS);
        p.put("mail.smtp.writetimeout", TIMEOUT_MS);
        switch (s.getSecurity() == null ? EmailSettings.SSL : s.getSecurity()) {
            case EmailSettings.SSL -> {
                p.put("mail.smtp.ssl.enable", "true");
                p.put("mail.smtp.ssl.checkserveridentity", "true");
            }
            case EmailSettings.STARTTLS -> {
                p.put("mail.smtp.starttls.enable", "true");
                p.put("mail.smtp.starttls.required", "true");
            }
            default -> {
                p.put("mail.smtp.starttls.enable", "false");
            }
        }
        return new GymMail(sender, s.getFromEmail().trim(),
                StringUtils.hasText(s.getFromName()) ? s.getFromName().trim() : null,
                StringUtils.hasText(s.getReplyTo()) ? s.getReplyTo().trim() : null);
    }
}
