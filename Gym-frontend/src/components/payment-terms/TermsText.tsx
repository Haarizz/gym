import React from "react";

export type TermsBlock = { kind: "heading" | "paragraph"; text: string };

/**
 * Splits plain-text terms into blocks: blank lines separate paragraphs, and a short
 * single line in ALL CAPS (e.g. "REFUND POLICY") is a heading. Same rule as the mobile
 * app's TermsText and the Settings › Terms & Conditions preview.
 */
export function parseTerms(terms: string): TermsBlock[] {
  return terms
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((text) => {
      const isHeading =
        !text.includes("\n") && text.length <= 80 && /\p{L}/u.test(text) && text === text.toUpperCase();
      return { kind: isHeading ? "heading" : "paragraph", text };
    });
}

/** Terms rendered as headings + paragraphs (inline styles: the Tailwind bundle is prebuilt). */
export function TermsText({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 10 }}>
      {parseTerms(text).map((block, i) =>
        block.kind === "heading" ? (
          <p key={i} style={{ fontWeight: 800, letterSpacing: "0.02em", marginTop: 4, fontSize: "0.85rem", color: "var(--foreground)" }}>
            {block.text}
          </p>
        ) : (
          <p
            key={i}
            style={{
              whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.55,
              fontSize: compact ? "0.8125rem" : "0.875rem", color: "var(--foreground)", opacity: 0.88,
            }}
          >
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Opens a printable copy of terms sets (for the member to take home / sign on paper). */
export function printTerms(opts: {
  heading: string;
  sub?: string;
  companyName?: string;
  terms: { title: string; content: string }[];
  signatureFor?: string | null;
}) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return false;
  const body = opts.terms.map((t) => `
    <section>
      <h2>${escapeHtml(t.title)}</h2>
      ${parseTerms(t.content).map((b) => b.kind === "heading"
        ? `<h3>${escapeHtml(b.text)}</h3>`
        : `<p>${escapeHtml(b.text)}</p>`).join("")}
    </section>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(opts.heading)}</title>
    <style>
      body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111;margin:32px;line-height:1.55}
      header{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:18px}
      header .co{font-size:13px;color:#555;text-transform:uppercase;letter-spacing:.06em}
      h1{font-size:20px;margin:4px 0 0} .sub{font-size:13px;color:#444;margin-top:4px}
      h2{font-size:15px;margin:22px 0 8px} h3{font-size:12px;letter-spacing:.04em;margin:14px 0 4px}
      p{font-size:13px;margin:0 0 8px;white-space:pre-wrap}
      .sign{margin-top:48px;display:flex;gap:48px} .sign div{flex:1;border-top:1px solid #111;padding-top:6px;font-size:12px;color:#444}
      @media print{body{margin:16mm}}
    </style></head><body>
    <header>${opts.companyName ? `<div class="co">${escapeHtml(opts.companyName)}</div>` : ""}
      <h1>${escapeHtml(opts.heading)}</h1>${opts.sub ? `<div class="sub">${escapeHtml(opts.sub)}</div>` : ""}</header>
    ${body}
    <div class="sign"><div>${escapeHtml(opts.signatureFor || "Member")} — signature &amp; date</div><div>Staff — signature &amp; date</div></div>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`);
  w.document.close();
  return true;
}
