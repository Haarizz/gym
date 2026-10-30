import { printFontReady, withPrintFont } from "./print-font";

let activePrintFrame: HTMLIFrameElement | null = null;

/**
 * Waits for the page's closing animations (a dropdown or dialog that started the print).
 * The print dialog freezes the page; a menu caught mid-animation never finishes closing
 * and stays on screen, ignoring clicks. Endless animations (spinners) are skipped, and
 * it never waits more than half a second.
 */
function pageAnimationsSettled(maxMs = 500): Promise<void> {
  return new Promise<void>((resolve) => {
    // One frame first, so a menu closed by the same click has started its animation.
    requestAnimationFrame(() => {
      const running = (document.getAnimations?.() ?? []).filter((a) => {
        const end = a.effect?.getComputedTiming().endTime;
        return a.playState === "running" && typeof end === "number" && Number.isFinite(end);
      });
      if (running.length === 0) return resolve();
      const timer = setTimeout(resolve, maxMs);
      Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  });
}

/**
 * Prints a complete HTML document through an off-screen iframe, so the user
 * only sees the browser's print dialog — no extra tab or window. The document's
 * own @page rule controls paper size and margins.
 */
export function printHtml(html: string) {
  activePrintFrame?.remove();
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("tabindex", "-1");
  // Off-screen at A4 size rather than 0×0 / hidden: Safari and Firefox can print
  // a blank page from an invisible or zero-sized frame.
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);
  activePrintFrame = frame;

  const doc = frame.contentDocument!;
  doc.open();
  // The caller decides when to print; drop any print-on-load script in the document.
  doc.write(withPrintFont(html.replace(/<script[\s\S]*?<\/script>/gi, "")));
  doc.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    const win = frame.contentWindow;
    if (!win) return;
    const cleanup = () => {
      if (activePrintFrame === frame) activePrintFrame = null;
      frame.remove();
    };
    win.addEventListener("afterprint", () => setTimeout(cleanup, 100), { once: true });
    // Fallback in case afterprint never fires
    setTimeout(cleanup, 60_000);
    win.focus();
    win.print();
  };

  // Wait for the logo and web fonts so they appear in the printout, but not forever
  const pending = Array.from(doc.images).filter((img) => !img.complete);
  const imagesReady = new Promise<void>((resolve) => {
    if (pending.length === 0) return resolve();
    let left = pending.length;
    const done = () => { if (--left === 0) resolve(); };
    pending.forEach((img) => { img.onload = done; img.onerror = done; });
  });
  const fontsReady = printFontReady(doc);
  Promise.all([imagesReady, fontsReady, pageAnimationsSettled()]).then(() => setTimeout(doPrint, 50));
  setTimeout(doPrint, 3000);
}
