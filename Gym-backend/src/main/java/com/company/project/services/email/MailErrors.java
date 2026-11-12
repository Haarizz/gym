package com.company.project.services.email;

/** Turns JavaMail's exception chain into advice a gym owner can act on. */
public final class MailErrors {

    private MailErrors() {}

    /** {@code host} / {@code port} may be null (then the message just says "the mail server"). */
    public static String explain(Throwable e, String host, Integer port) {
        String where = host != null ? host + (port != null ? ":" + port : "") : "the mail server";
        Throwable root = e;
        for (Throwable t = e; t != null; t = t.getCause()) {
            root = t;
            String cls = t.getClass().getName();
            if (t instanceof IllegalStateException && String.valueOf(t.getMessage()).contains("not configured")) {
                return "Email isn't set up for this gym yet. Add your mailbox in GymOS › Settings › Email.";
            }
            if (cls.endsWith("AuthenticationFailedException")) {
                return "The mail server rejected the username or password. Check them — for Gmail or Outlook use an "
                        + "App Password, not your normal password. (" + nz(t.getMessage()) + ")";
            }
            if (t instanceof java.net.UnknownHostException) {
                return "Mail server \"" + (host != null ? host : nz(t.getMessage())) + "\" was not found. Check the SMTP host spelling.";
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

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
