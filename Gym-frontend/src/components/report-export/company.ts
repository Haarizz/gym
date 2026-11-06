import { getCompanyDetails } from "../../utils/company-details";
import { resolveBackendImageUrl } from "../../utils/resolve-image-url";
import type { ReportCompany } from "./types";

const logoCache = new Map<string, Promise<ReportCompany["logo"]>>();

/**
 * Loads the logo and re-encodes it as a PNG data URL with its natural size, so jsPDF (PNG/JPEG
 * only) and the print frame get the same image. A missing or broken logo resolves to null and the
 * header simply has no logo column — never an empty box.
 */
function loadLogo(src: string): Promise<ReportCompany["logo"]> {
  if (!src) return Promise.resolve(null);
  const hit = logoCache.get(src);
  if (hit) return hit;
  const p = new Promise<ReportCompany["logo"]>((resolve) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), 6000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return resolve(null);
        // Plenty for a ~45 mm wide logo at print resolution, without bloating the PDF.
        const scale = Math.min(1, 900 / w, 450 / h);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const g = canvas.getContext("2d");
        if (!g) return resolve(null);
        g.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height });
      } catch {
        resolve(null); // tainted canvas (logo on a host without CORS) — skip it rather than fail
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = String(resolveBackendImageUrl(src));
  });
  logoCache.set(src, p);
  p.then((v) => { if (!v) logoCache.delete(src); });
  return p;
}

/**
 * Company header for a report: the branch's Settings › Company Details, with the TRN only when
 * that branch is VAT registered (getCompanyDetails blanks it when Tax Configuration's VAT switch is
 * off). The company stamp is deliberately not part of a report header.
 */
export async function loadReportCompany(branchId?: number | null): Promise<ReportCompany> {
  const c = await getCompanyDetails(branchId ?? undefined);
  const logo = await loadLogo(c.logo);
  return {
    name: (c.name || "").trim(),
    nameLocal: (c.nameLocal || "").trim(),
    address: c.addressSet === false ? "" : (c.address || "").trim(),
    phone: (c.phone || "").trim(),
    email: (c.email || "").trim(),
    trn: (c.trn || "").trim(),
    logo,
  };
}
