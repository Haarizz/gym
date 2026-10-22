import { useRef } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Copy, Printer } from "lucide-react";
import { Button } from "../ui/button";
import { walkInUrl } from "../../utils/supabase/walk-in-registration-service";

/**
 * QR for walk-in self-registration: the branch poster (Branch Settings) or a staff
 * member's personal code (Check In). Scanning opens the public /w/... page.
 */
export function WalkInQr({ path, title, subtitle }: { path: string; title: string; subtitle?: string }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const url = walkInUrl(path);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  // Prints just the QR as a poster, not the whole settings page.
  const print = () => {
    const svg = qrRef.current?.querySelector("svg")?.outerHTML;
    const win = window.open("", "_blank", "width=480,height=640");
    if (!svg || !win) return;
    const escape = (v: string) => v.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    win.document.write(`<!doctype html><html><head><title>${escape(title)}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:48px 24px;color:#0f172a}
      h1{font-size:28px;margin:0 0 8px}p{font-size:16px;color:#475569;margin:0 0 32px}svg{width:320px;height:320px}</style>
      </head><body><h1>${escape(title)}</h1><p>${escape(subtitle || "Scan to register as a walk-in visitor")}</p>${svg}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={qrRef} className="bg-white p-3 rounded-lg border">
        <QRCode value={url} size={168} />
      </div>
      <p className="text-xs text-muted-foreground break-all text-center max-w-xs">{url}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy className="h-4 w-4 mr-2" />Copy link
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={print}>
          <Printer className="h-4 w-4 mr-2" />Print
        </Button>
      </div>
    </div>
  );
}
