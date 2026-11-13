package com.company.project.services;

import com.company.project.dto.MembershipApplicationDTOs.ApplicationFamilyMember;
import com.company.project.entities.MembershipApplication;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;

/**
 * The email an applicant gets when staff approve or reject their membership application
 * (Approvals → Applications). Plain inline-styled HTML; every value typed by the applicant
 * or by staff is escaped.
 */
final class MembershipApplicationEmails {

    private static final String ACCENT = "#2B7A78";

    private MembershipApplicationEmails() {}

    /** Who and where the email is from, worked out by the service. */
    record Context(String gymName, String branchName, String branchPhone, String branchEmail, String currencyCode) {}

    record Email(String subject, String html) {}

    static Email rejected(MembershipApplication app, Context c) {
        String subject = "Your membership application at " + place(c);
        StringBuilder body = new StringBuilder()
                .append(p("Hi " + esc(app.getFullName()) + ","))
                .append(p("Thank you for applying for the <strong>" + esc(app.getPlanName()) + "</strong> membership at <strong>"
                        + esc(place(c)) + "</strong> (reference <strong>" + esc(app.getReference()) + "</strong>)."))
                .append(p("Unfortunately we can't approve your application at this time."))
                .append(p("<strong>Reason from the gym:</strong>"))
                .append("<div style=\"margin:0 0 14px;padding:12px 16px;background:#f8fafc;border-left:4px solid " + ACCENT
                        + ";white-space:normal\">" + multiline(app.getRejectionReason()) + "</div>");
        if (MembershipApplication.PAYMENT_REFUNDED.equals(app.getPaymentStatus())) {
            body.append(p("The " + esc(money(app.getAmount(), c.currencyCode())) + " you paid"
                    + cardSuffix(app) + " has been refunded."));
        } else {
            body.append(p("No payment was taken."));
        }
        body.append(p("If you have questions or would like to apply again, please contact the gym."));
        return new Email(subject, layout(c, body.toString()));
    }

    static Email approved(MembershipApplication app, Context c) {
        String subject = "Welcome to " + place(c) + ": your membership is approved";
        StringBuilder body = new StringBuilder()
                .append(p("Hi " + esc(app.getFullName()) + ","))
                .append(p("Good news: your application for the <strong>" + esc(app.getPlanName()) + "</strong> membership at <strong>"
                        + esc(place(c)) + "</strong> (reference <strong>" + esc(app.getReference()) + "</strong>) has been approved."
                        + " Your membership starts today."));
        if (StringUtils.hasText(app.getMemberCode())) {
            body.append("<div style=\"margin:0 0 14px;padding:14px 16px;background:#f8fafc;border-radius:8px;text-align:center\">"
                    + "<div style=\"font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px\">Your member ID</div>"
                    + "<div style=\"font-size:22px;font-weight:bold;letter-spacing:2px;color:#111827\">" + esc(app.getMemberCode())
                    + "</div></div>");
        }
        if (app.getAmount() != null && app.getAmount().signum() > 0) {
            String how = MembershipApplication.METHOD_ONLINE.equals(app.getPaymentMethod())
                    ? "paid by card" + cardSuffix(app)
                    : "paid in cash at the front desk";
            body.append(p("Payment: " + esc(money(app.getAmount(), c.currencyCode())) + ", " + how + "."));
        }
        List<String> household = app.getFamilyMembers() == null ? List.of()
                : app.getFamilyMembers().stream().map(ApplicationFamilyMember::name)
                        .filter(StringUtils::hasText).map(String::trim).toList();
        if (!household.isEmpty()) {
            body.append(p("Also added to your membership: " + esc(String.join(", ", household)) + "."));
        }
        body.append(p("Keep your member ID handy for your first visit. The front desk can also set you up on the GymBios app."));
        return new Email(subject, layout(c, body.toString()));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    /** "Fitzone · Main Branch", or just one of them when the other is missing or the same. */
    static String place(Context c) {
        String gym = StringUtils.hasText(c.gymName()) ? c.gymName().trim() : null;
        String branch = StringUtils.hasText(c.branchName()) ? c.branchName().trim() : null;
        if (gym == null) return branch != null ? branch : "the gym";
        if (branch == null || branch.equalsIgnoreCase(gym)) return gym;
        return gym + " · " + branch;
    }

    private static String layout(Context c, String body) {
        String header = StringUtils.hasText(c.gymName()) ? c.gymName().trim() : place(c);
        StringBuilder contact = new StringBuilder();
        if (StringUtils.hasText(c.branchPhone())) contact.append(esc(c.branchPhone().trim()));
        if (StringUtils.hasText(c.branchEmail())) {
            if (!contact.isEmpty()) contact.append(" · ");
            contact.append(esc(c.branchEmail().trim()));
        }
        String footer = contact.isEmpty() ? ""
                : "<div style=\"padding:12px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px\">"
                  + esc(place(c)) + "<br>" + contact + "</div>";
        return "<div style=\"background:#f4f6f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif\">"
                + "<div style=\"max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb\">"
                + "<div style=\"background:" + ACCENT + ";color:#ffffff;padding:18px 24px;font-size:18px;font-weight:bold\">"
                + esc(header) + "</div>"
                + "<div style=\"padding:24px;font-size:15px;line-height:1.6;color:#1f2937\">" + body + "</div>"
                + footer
                + "</div></div>";
    }

    private static String p(String html) {
        return "<p style=\"margin:0 0 14px\">" + html + "</p>";
    }

    /** Escaped, keeping the writer's line breaks. */
    static String multiline(String text) {
        if (text == null) return "";
        return esc(text.trim()).replace("\r\n", "\n").replace("\n", "<br>");
    }

    private static String cardSuffix(MembershipApplication app) {
        return StringUtils.hasText(app.getCardLast4()) ? " (card ending " + esc(app.getCardLast4()) + ")" : "";
    }

    static String money(BigDecimal amount, String currency) {
        String n = Objects.requireNonNullElse(amount, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP).toPlainString();
        return StringUtils.hasText(currency) ? currency.trim() + " " + n : n;
    }

    private static String esc(String s) {
        return s == null ? "" : HtmlUtils.htmlEscape(s);
    }
}
