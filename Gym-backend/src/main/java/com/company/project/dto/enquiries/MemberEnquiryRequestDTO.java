package com.company.project.dto.enquiries;

/** Member app: { "category": "BILLING", "subject": "...", "message": "..." }. Web reply: { "reply": "..." }. */
public class MemberEnquiryRequestDTO {
    private String category;
    private String subject;
    private String message;
    private String reply;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
}
