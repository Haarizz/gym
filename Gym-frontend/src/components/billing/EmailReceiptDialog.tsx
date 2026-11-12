import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, FileText, Loader2, Mail, Paperclip, Send, Settings, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useCurrency } from "../../utils/currency";
import { useInvoiceTitle, getCompanyDetails } from "../../utils/company-details";
import type { Receipt } from "../../utils/supabase/receipts-service";
import { buildSavedReceiptDocument, type ReceiptDocumentKind } from "../../utils/receipt-invoice";
import { htmlToPdfBlob, blobToBase64 } from "../../utils/html-to-pdf";
import { composeReceiptEmail } from "../../utils/receipt-email";
import {
  receiptEmailService, receiptEmailError, type ReceiptEmailInfo,
} from "../../utils/supabase/receipt-email-service";
import styles from "./EmailReceiptDialog.module.css";

/**
 * Billing › Email receipt / Email invoice. Pre-fills the member's email and a message worded for
 * the receipt (new membership, renewal, upgrade, downgrade, add-on, day pass, payment, request),
 * renders the same document Print shows into a PDF, and emails it through the gym's mailbox
 * (GymOS › Settings › Email).
 */
export function EmailReceiptDialog({ receipt, document: initialDocument, onClose }: {
  receipt: Receipt | null;
  document: ReceiptDocumentKind;
  onClose: () => void;
}) {
  const { currencyCode, currency } = useCurrency();
  const invoiceLabel = useInvoiceTitle();
  const [docKind, setDocKind] = useState<ReceiptDocumentKind>(initialDocument);
  const [info, setInfo] = useState<ReceiptEmailInfo | null>(null);
  const [gymName, setGymName] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [edited, setEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"" | "preview" | "pdf" | "send">("");
  const previewUrl = useRef<string | null>(null);

  const open = !!receipt;

  // Load the member's address, the send history and the gym name when the dialog opens.
  useEffect(() => {
    if (!receipt) return;
    let alive = true;
    setDocKind(initialDocument);
    setEdited(false);
    setInfo(null);
    setTo("");
    setLoading(true);
    Promise.all([
      receiptEmailService.info(receipt.id).catch((e) => {
        toast.error(receiptEmailError(e, "Could not load the member's email"));
        return null;
      }),
      getCompanyDetails().catch(() => null),
    ]).then(([i, company]) => {
      if (!alive) return;
      setInfo(i);
      setTo(i?.memberEmail ?? "");
      setGymName(company?.name ?? "");
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [receipt, initialDocument]);

  // (Re)write the draft for the chosen document until the user edits it.
  useEffect(() => {
    if (!receipt || edited) return;
    const draft = composeReceiptEmail({
      receipt, document: docKind, invoiceLabel, gymName, currencyPrefix: currency.textPrefix,
    });
    setSubject(draft.subject);
    setMessage(draft.message);
  }, [receipt, docKind, invoiceLabel, gymName, currency.textPrefix, edited]);

  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);

  if (!receipt) return null;

  const docLabel = docKind === "INVOICE" ? invoiceLabel : "Receipt";
  const docNo = docKind === "INVOICE" ? receipt.invoice_no || receipt.receipt_no : receipt.receipt_no;
  const fileName = `${docLabel.replace(/\s+/g, "-")}-${docNo}.pdf`;
  const mailReady = info?.mailConfigured ?? true;
  const lastSent = info?.history?.slice(0, 3) ?? [];

  const makePdf = async () => {
    const { html, company, colors } = await buildSavedReceiptDocument(receipt, currencyCode, docKind);
    const blob = await htmlToPdfBlob(html);
    if (!blob.size) throw new Error("The PDF came out empty");
    return { blob, company, colors };
  };

  const preview = async () => {
    setBusy("preview");
    try {
      const { blob } = await makePdf();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(blob);
      window.open(previewUrl.current, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the PDF");
    } finally {
      setBusy("");
    }
  };

  const send = async () => {
    if (!to.trim()) { toast.error("Enter the member's email address"); return; }
    if (!subject.trim() || !message.trim()) { toast.error("Subject and message can't be empty"); return; }
    try {
      setBusy("pdf");
      const { blob, company, colors } = await makePdf();
      const pdfBase64 = await blobToBase64(blob);
      setBusy("send");
      const r = await receiptEmailService.send(receipt.id, {
        document: docKind, to: to.trim(), subject: subject.trim(), message,
        companyName: company.name, accentColor: colors.primary, pdfBase64, pdfFileName: fileName,
      });
      toast.success(r.message, { description: `${docLabel} ${docNo} — ${receipt.member_name}` });
      onClose();
    } catch (e) {
      toast.error(receiptEmailError(e, e instanceof Error ? e.message : "The email could not be sent"), { duration: 12000 });
      receiptEmailService.info(receipt.id).then(setInfo).catch(() => {});
    } finally {
      setBusy("");
    }
  };

  const sending = busy === "pdf" || busy === "send";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !sending) onClose(); }}>
      <DialogContent className={styles.dialog} style={{ maxWidth: "min(640px, calc(100% - 2rem))" }}>
        <DialogHeader>
          <DialogTitle className={styles.title}><Mail className={styles.titleIcon} /> Email {docLabel.toLowerCase()}</DialogTitle>
          <DialogDescription>
            {docLabel} {docNo} — {receipt.member_name}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className={styles.loading}><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
        ) : (
          <div className={styles.body}>
            {!mailReady && (
              <div className={styles.note} data-tone="red">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Email isn't set up for this gym yet.{" "}
                  <Link to="/gymos?section=settings&tab=email" className={styles.link} onClick={onClose}><Settings className={styles.inlineIcon} /> Set up email</Link>
                </span>
              </div>
            )}

            <div className={styles.segment} role="tablist" aria-label="Document">
              {(["RECEIPT", "INVOICE"] as ReceiptDocumentKind[]).map((d) => (
                <button key={d} type="button" role="tab" aria-selected={docKind === d} data-active={docKind === d || undefined}
                  className={styles.segmentBtn} onClick={() => setDocKind(d)} disabled={sending}>
                  {d === "INVOICE" ? <FileText className={styles.inlineIcon} /> : <Paperclip className={styles.inlineIcon} />}
                  {d === "INVOICE" ? invoiceLabel : "Payment receipt"}
                </button>
              ))}
            </div>

            <div className={styles.field}>
              <Label htmlFor="email-to">To</Label>
              <Input id="email-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="member@example.com" disabled={sending} />
              {!info?.memberEmail && (
                <div className={styles.hint} data-tone="amber">This member has no email on their profile — type one here (it isn't saved to the profile).</div>
              )}
              <div className={styles.hint}>Separate several addresses with commas.</div>
            </div>

            <div className={styles.field}>
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" value={subject} onChange={(e) => { setSubject(e.target.value); setEdited(true); }} disabled={sending} />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <Label htmlFor="email-message">Message</Label>
                {edited && (
                  <button type="button" className={styles.reset} onClick={() => setEdited(false)} disabled={sending}>Reset to suggested text</button>
                )}
              </div>
              <Textarea id="email-message" value={message} rows={12} className={styles.textarea}
                onChange={(e) => { setMessage(e.target.value); setEdited(true); }} disabled={sending} />
            </div>

            <div className={styles.attachment}>
              <Paperclip className="h-4 w-4" />
              <span className={styles.attachmentName}>{fileName}</span>
              <Button type="button" variant="outline" size="sm" onClick={preview} disabled={!!busy}>
                {busy === "preview" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />} Preview PDF
              </Button>
            </div>

            {lastSent.length > 0 && (
              <div className={styles.history}>
                <div className={styles.historyTitle}>Sent before</div>
                {lastSent.map((h, i) => (
                  <div key={i} className={styles.historyRow} data-tone={h.status === "SENT" ? "green" : "red"}>
                    {h.status === "SENT" ? <CheckCircle2 className={styles.inlineIcon} /> : <XCircle className={styles.inlineIcon} />}
                    <span>
                      {h.documentType === "INVOICE" ? invoiceLabel : "Receipt"} to {h.toEmail} ·{" "}
                      {new Date(h.sentAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      {h.sentBy ? ` · by ${h.sentBy}` : ""}
                      {h.status === "FAILED" && h.error ? ` — ${h.error}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={send} disabled={loading || sending || !mailReady}>
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {busy === "pdf" ? "Creating PDF…" : "Sending…"}</> : <><Send className="h-4 w-4 mr-2" /> Send email</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
