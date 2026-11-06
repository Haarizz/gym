// Dependency-free .xlsx workbook writer (Office Open XML), the multi-sheet big brother of
// xlsx-export.ts: styled cells (fonts, fills, borders, number formats), real dates and numbers,
// formulas with cached results, merged cells, frozen panes, autofilters, print setup and native
// Excel charts. Parts are deflate-compressed when the browser has CompressionStream (all current
// browsers), otherwise stored — both are valid zips Excel, LibreOffice and Google Sheets open.

export type XValue = string | number | boolean | Date | null | undefined;

export interface XStyle {
  bold?: boolean;
  italic?: boolean;
  size?: number;
  /** "RRGGBB" */
  color?: string;
  fill?: string;
  numFmt?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "center" | "bottom";
  wrap?: boolean;
  indent?: number;
  /** Borders: thin box, or a single top/bottom rule (double for grand totals). */
  border?: "box" | "bottom" | "top" | "topDouble" | "bottomMedium";
  borderColor?: string;
}

export interface XCell {
  v?: XValue;
  /** Formula without the leading "=", e.g. SUBTOTAL(109,C7:C40). `v` is its cached result. */
  f?: string;
  s?: XStyle;
}

export type XChartType = "bar" | "stacked-bar" | "hbar" | "line" | "area" | "pie" | "donut";

export interface XChart {
  type: XChartType;
  title?: string;
  /** Category labels range (one column) and their cached values. */
  categories: { sheet: string; col: number; fromRow: number; toRow: number; cache: string[] };
  series: { nameCell: { col: number; row: number }; name: string; col: number; cache: number[]; color?: string }[];
  /** Points colours for pie/donut slices. */
  pointColors?: string[];
  numFmt?: string;
  /** Zero-based anchor box in cells. */
  anchor: { col: number; row: number; toCol: number; toRow: number };
}

export class XSheet {
  readonly rows = new Map<number, Map<number, XCell>>();
  readonly colWidths: number[] = [];
  readonly rowHeights = new Map<number, number>();
  readonly merges: string[] = [];
  readonly charts: XChart[] = [];
  freeze?: { row: number; col?: number };
  autoFilter?: { fromRow: number; toRow: number; fromCol: number; toCol: number };
  printTitleRows?: { from: number; to: number };
  landscape = false;
  showGridLines = true;
  tabColor?: string;

  constructor(public name: string) {}

  set(row: number, col: number, cell: XCell | XValue): void {
    let r = this.rows.get(row);
    if (!r) { r = new Map(); this.rows.set(row, r); }
    r.set(col, isCell(cell) ? cell : { v: cell as XValue });
  }

  merge(row: number, col: number, toRow: number, toCol: number): void {
    if (toRow === row && toCol === col) return;
    this.merges.push(`${ref(row, col)}:${ref(toRow, toCol)}`);
  }

  get lastRow(): number {
    return this.rows.size ? Math.max(...this.rows.keys()) : -1;
  }
}

const isCell = (c: unknown): c is XCell =>
  !!c && typeof c === "object" && !(c instanceof Date) && ("v" in (c as object) || "f" in (c as object) || "s" in (c as object));

export function colName(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** A1 reference from zero-based row/col. */
export const ref = (row: number, col: number) => `${colName(col)}${row + 1}`;
export const absRef = (row: number, col: number) => `$${colName(col)}$${row + 1}`;

export function sheetRef(sheet: string): string {
  return `'${sheet.replace(/'/g, "''")}'`;
}

const esc = (s: string) =>
  s
    // Characters XML 1.0 cannot carry at all (control chars) — dropped rather than corrupting the file.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Excel serial date from a JS Date using its local calendar fields. */
function excelSerial(d: Date): number {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  return utc / 86400000 + 25569;
}

// ── styles ─────────────────────────────────────────────────────────────────

class StyleRegistry {
  private fonts = ['<font><sz val="10"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>'];
  private fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  private borders = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  private numFmts: string[] = [];
  private xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  private keyToXf = new Map<string, number>([["{}", 0]]);
  private lookup = (list: string[], xml: string) => {
    const i = list.indexOf(xml);
    if (i >= 0) return i;
    list.push(xml);
    return list.length - 1;
  };

  id(style?: XStyle): number {
    if (!style) return 0;
    const key = JSON.stringify(style);
    const hit = this.keyToXf.get(key);
    if (hit != null) return hit;

    const font = `<font>${style.bold ? "<b/>" : ""}${style.italic ? "<i/>" : ""}<sz val="${style.size ?? 10}"/><color rgb="FF${(style.color ?? "1F2937").toUpperCase()}"/><name val="Calibri"/><family val="2"/></font>`;
    const fontId = this.lookup(this.fonts, font);
    const fillId = style.fill
      ? this.lookup(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${style.fill.toUpperCase()}"/><bgColor indexed="64"/></patternFill></fill>`)
      : 0;
    let borderId = 0;
    if (style.border) {
      const c = `<color rgb="FF${(style.borderColor ?? "D5DBDB").toUpperCase()}"/>`;
      const side = (name: string, kind?: string) => (kind ? `<${name} style="${kind}">${c}</${name}>` : `<${name}/>`);
      const b = style.border;
      const xml = `<border>${side("left", b === "box" ? "thin" : undefined)}${side("right", b === "box" ? "thin" : undefined)}${side("top", b === "box" || b === "top" ? "thin" : b === "topDouble" ? "double" : undefined)}${side("bottom", b === "box" || b === "bottom" ? "thin" : b === "bottomMedium" ? "medium" : undefined)}<diagonal/></border>`;
      borderId = this.lookup(this.borders, xml);
    }
    let numFmtId = 0;
    if (style.numFmt) {
      const builtin: Record<string, number> = { "0": 1, "0.00": 2, "#,##0": 3, "#,##0.00": 4, "0%": 9, "0.00%": 10 };
      numFmtId = builtin[style.numFmt] ?? 164 + this.lookup(this.numFmts, style.numFmt);
    }
    const align = style.align || style.valign || style.wrap || style.indent
      ? `<alignment${style.align ? ` horizontal="${style.align}"` : ""}${style.valign ? ` vertical="${style.valign}"` : ' vertical="center"'}${style.wrap ? ' wrapText="1"' : ""}${style.indent ? ` indent="${style.indent}"` : ""}/>`
      : "";
    const xf = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ""} applyFont="1"${fillId ? ' applyFill="1"' : ""}${borderId ? ' applyBorder="1"' : ""}${align ? ' applyAlignment="1">' + align + "</xf>" : "/>"}`;
    this.xfs.push(xf);
    const id = this.xfs.length - 1;
    this.keyToXf.set(key, id);
    return id;
  }

  xml(): string {
    const numFmts = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join("")}</numFmts>`
      : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts}<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts><fills count="${this.fills.length}">${this.fills.join("")}</fills><borders count="${this.borders.length}">${this.borders.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
}

// ── worksheet ─────────────────────────────────────────────────────────────

function cellXml(row: number, col: number, cell: XCell, styles: StyleRegistry): string {
  const r = ref(row, col);
  const s = styles.id(cell.s);
  const sAttr = s ? ` s="${s}"` : "";
  const v = cell.v;
  if (cell.f) {
    const cached = typeof v === "number" && Number.isFinite(v) ? `<v>${v}</v>` : "";
    return `<c r="${r}"${sAttr}><f>${esc(cell.f)}</f>${cached}</c>`;
  }
  if (v == null || v === "") return s ? `<c r="${r}"${sAttr}/>` : "";
  if (typeof v === "number") return Number.isFinite(v) ? `<c r="${r}"${sAttr}><v>${v}</v></c>` : "";
  if (typeof v === "boolean") return `<c r="${r}"${sAttr} t="b"><v>${v ? 1 : 0}</v></c>`;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : `<c r="${r}"${sAttr}><v>${excelSerial(v)}</v></c>`;
  return `<c r="${r}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
}

function sheetXml(sheet: XSheet, index: number, styles: StyleRegistry, hasDrawing: boolean): string {
  const rowsXml: string[] = [];
  const rowKeys = [...sheet.rows.keys()].sort((a, b) => a - b);
  let maxCol = 0;
  for (const r of rowKeys) {
    const cells = sheet.rows.get(r)!;
    const cols = [...cells.keys()].sort((a, b) => a - b);
    maxCol = Math.max(maxCol, cols[cols.length - 1] ?? 0);
    const ht = sheet.rowHeights.get(r);
    rowsXml.push(`<row r="${r + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ""}>${cols.map((c) => cellXml(r, c, cells.get(c)!, styles)).join("")}</row>`);
  }
  for (const [r, ht] of sheet.rowHeights) {
    if (!sheet.rows.has(r)) rowsXml.push(`<row r="${r + 1}" ht="${ht}" customHeight="1"/>`);
  }
  rowsXml.sort((a, b) => Number(/r="(\d+)"/.exec(a)![1]) - Number(/r="(\d+)"/.exec(b)![1]));

  const lastRow = Math.max(0, sheet.lastRow);
  const dim = `<dimension ref="A1:${ref(lastRow, Math.max(0, maxCol))}"/>`;
  const sheetPr = `<sheetPr>${sheet.tabColor ? `<tabColor rgb="FF${sheet.tabColor}"/>` : ""}<pageSetUpPr fitToPage="1"/></sheetPr>`;
  let pane = "";
  if (sheet.freeze && (sheet.freeze.row > 0 || (sheet.freeze.col ?? 0) > 0)) {
    const fr = sheet.freeze.row;
    const fc = sheet.freeze.col ?? 0;
    const tl = ref(fr, fc);
    const active = fr && fc ? "bottomRight" : fr ? "bottomLeft" : "topRight";
    pane = `<pane${fc ? ` xSplit="${fc}"` : ""}${fr ? ` ySplit="${fr}"` : ""} topLeftCell="${tl}" activePane="${active}" state="frozen"/><selection pane="${active}" activeCell="${tl}" sqref="${tl}"/>`;
  }
  const views = `<sheetViews><sheetView${sheet.showGridLines ? "" : ' showGridLines="0"'}${index === 0 ? ' tabSelected="1"' : ""} workbookViewId="0">${pane}</sheetView></sheetViews>`;
  const cols = sheet.colWidths.length
    ? `<cols>${sheet.colWidths.map((w, i) => (w ? `<col min="${i + 1}" max="${i + 1}" width="${Math.round(w * 100) / 100}" customWidth="1"/>` : "")).join("")}</cols>`
    : "";
  const filter = sheet.autoFilter
    ? `<autoFilter ref="${ref(sheet.autoFilter.fromRow, sheet.autoFilter.fromCol)}:${ref(sheet.autoFilter.toRow, sheet.autoFilter.toCol)}"/>`
    : "";
  const merges = sheet.merges.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
  const margins = `<pageMargins left="0.6" right="0.6" top="0.7" bottom="0.7" header="0.3" footer="0.3"/>`;
  const setup = `<pageSetup paperSize="9" orientation="${sheet.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>`;
  const footer = `<headerFooter><oddFooter>&amp;L&amp;8&amp;A&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter>`;
  const drawing = hasDrawing ? `<drawing r:id="rId1"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${sheetPr}${dim}${views}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rowsXml.join("")}</sheetData>${filter}${merges}${margins}${setup}${footer}${drawing}</worksheet>`;
}

// ── charts ────────────────────────────────────────────────────────────────

const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const C = 'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"';
const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

const solid = (hex: string) => `<a:solidFill><a:srgbClr val="${hex.replace("#", "").toUpperCase()}"/></a:solidFill>`;
const txPr = (sz: number, color = "595959") =>
  `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}">${solid(color)}</a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;

/** Axis labels drop decimals: "AED "#,##0.00 → "AED "#,##0. */
const axisFormat = (f?: string) => (f ? f.replace(/#,##0.00/g, "#,##0").replace(/0.0%/g, "0%") : "General");

function chartXml(chart: XChart, palette: string[]): string {
  const sheet = sheetRef(chart.categories.sheet);
  const cat = chart.categories;
  const catRange = `${sheet}!${absRef(cat.fromRow, cat.col)}:${absRef(cat.toRow, cat.col)}`;
  const strCache = `<c:strCache><c:ptCount val="${cat.cache.length}"/>${cat.cache.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join("")}</c:strCache>`;
  const fmt = chart.numFmt ? esc(chart.numFmt) : "General";
  const isPie = chart.type === "pie" || chart.type === "donut";

  const ser = chart.series.map((s, i) => {
    const color = s.color || palette[i % palette.length];
    const tx = `<c:tx><c:strRef><c:f>${sheet}!${absRef(s.nameCell.row, s.nameCell.col)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${esc(s.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;
    const val = `<c:val><c:numRef><c:f>${sheet}!${absRef(cat.fromRow, s.col)}:${absRef(cat.toRow, s.col)}</c:f><c:numCache><c:formatCode>${fmt}</c:formatCode><c:ptCount val="${s.cache.length}"/>${s.cache.map((v, j) => (Number.isFinite(v) ? `<c:pt idx="${j}"><c:v>${v}</c:v></c:pt>` : "")).join("")}</c:numCache></c:numRef></c:val>`;
    const cats = `<c:cat><c:strRef><c:f>${catRange}</c:f>${strCache}</c:strRef></c:cat>`;
    const head = `<c:idx val="${i}"/><c:order val="${i}"/>${tx}`;
    if (isPie) {
      const dpts = cat.cache.map((_, j) => `<c:dPt><c:idx val="${j}"/><c:bubble3D val="0"/><c:spPr>${solid(chart.pointColors?.[j] || palette[j % palette.length])}<a:ln w="12700">${solid("FFFFFF")}</a:ln></c:spPr></c:dPt>`).join("");
      const lbls = `<c:dLbls><c:numFmt formatCode="0.0%" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900, "FFFFFF")}<c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="0"/></c:dLbls>`;
      return `<c:ser>${head}${dpts}${lbls}${cats}${val}</c:ser>`;
    }
    if (chart.type === "line") {
      return `<c:ser>${head}<c:spPr><a:ln w="28575" cap="rnd">${solid(color)}<a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr>${solid("FFFFFF")}<a:ln w="15875">${solid(color)}</a:ln></c:spPr></c:marker>${cats}${val}<c:smooth val="0"/></c:ser>`;
    }
    if (chart.type === "area") {
      return `<c:ser>${head}<c:spPr><a:solidFill><a:srgbClr val="${color.replace("#", "").toUpperCase()}"><a:alpha val="35000"/></a:srgbClr></a:solidFill><a:ln w="22225">${solid(color)}</a:ln></c:spPr>${cats}${val}</c:ser>`;
    }
    const single = chart.series.length === 1 && chart.pointColors?.length
      ? cat.cache.map((_, j) => `<c:dPt><c:idx val="${j}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/><c:spPr>${solid(chart.pointColors![j] || color)}</c:spPr></c:dPt>`).join("")
      : "";
    return `<c:ser>${head}<c:spPr>${solid(color)}</c:spPr><c:invertIfNegative val="0"/>${single}${cats}${val}</c:ser>`;
  }).join("");

  const axes = `<c:catAx><c:axId val="500000001"/><c:scaling><c:orientation val="${chart.type === "hbar" ? "maxMin" : "minMax"}"/></c:scaling><c:delete val="0"/><c:axPos val="${chart.type === "hbar" ? "l" : "b"}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:spPr><a:ln w="9525">${solid("BFBFBF")}</a:ln></c:spPr>${txPr(900)}<c:crossAx val="500000002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`
    + `<c:valAx><c:axId val="500000002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${chart.type === "hbar" ? "b" : "l"}"/><c:majorGridlines><c:spPr><a:ln w="9525">${solid("E7E6E1")}</a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${esc(axisFormat(chart.numFmt))}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${txPr(900)}<c:crossAx val="500000001"/><c:crosses val="${chart.type === "hbar" ? "max" : "autoZero"}"/><c:crossBetween val="between"/></c:valAx>`;
  const axIds = `<c:axId val="500000001"/><c:axId val="500000002"/>`;

  let plot: string;
  switch (chart.type) {
    case "pie":
      plot = `<c:pieChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/></c:pieChart>`;
      break;
    case "donut":
      plot = `<c:doughnutChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>`;
      break;
    case "line":
      plot = `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}<c:marker val="1"/>${axIds}</c:lineChart>${axes}`;
      break;
    case "area":
      plot = `<c:areaChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}${axIds}</c:areaChart>${axes}`;
      break;
    default: {
      const stacked = chart.type === "stacked-bar";
      plot = `<c:barChart><c:barDir val="${chart.type === "hbar" ? "bar" : "col"}"/><c:grouping val="${stacked ? "stacked" : "clustered"}"/><c:varyColors val="0"/>${ser}<c:gapWidth val="${stacked ? 60 : 80}"/>${stacked ? '<c:overlap val="100"/>' : ""}${axIds}</c:barChart>${axes}`;
    }
  }
  const title = chart.title
    ? `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="en-US" sz="1200" b="1">${solid("1F2937")}</a:rPr><a:t>${esc(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
    : `<c:autoTitleDeleted val="1"/>`;
  const legend = isPie || chart.series.length > 1
    ? `<c:legend><c:legendPos val="${isPie ? "r" : "b"}"/><c:overlay val="0"/>${txPr(900, "404040")}</c:legend>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace ${C} ${A} ${R}><c:roundedCorners val="0"/><c:chart>${title}<c:plotArea><c:layout/>${plot}</c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr>${solid("FFFFFF")}<a:ln w="9525">${solid("E3E3E3")}</a:ln></c:spPr></c:chartSpace>`;
}

function drawingXml(charts: XChart[], firstChartNo: number): string {
  const anchors = charts.map((ch, i) => {
    const a = ch.anchor;
    return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${a.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${a.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Chart ${firstChartNo + i}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart ${C} ${R} r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ${A}>${anchors}</xdr:wsDr>`;
}

// ── zip ───────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  const CS = (globalThis as any).CompressionStream;
  if (!CS) return null;
  try {
    const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CS("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function zip(files: { name: string; data: Uint8Array }[]): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const packed = f.data.length > 256 ? await deflateRaw(f.data) : null;
    const method = packed ? 8 : 0;
    const body = packed ?? f.data;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, method, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, body.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, body);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, method, true);
    cd.setUint16(12, dosTime, true);
    cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, body.length, true);
    cd.setUint32(24, f.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + body.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}

// ── workbook ──────────────────────────────────────────────────────────────

/** Excel sheet name rules: ≤31 chars, no []:*?/\ , unique within the workbook. */
export function safeSheetName(name: string, taken: Set<string>): string {
  const base = (name.replace(/[\\/?*[\]:]/g, " ").replace(/^'+|'+$/g, "").replace(/\s+/g, " ").trim() || "Sheet").slice(0, 31);
  let n = base;
  let i = 2;
  while (taken.has(n.toLowerCase())) {
    const suffix = ` (${i++})`;
    n = base.slice(0, 31 - suffix.length) + suffix;
  }
  taken.add(n.toLowerCase());
  return n;
}

export interface WorkbookMeta {
  title?: string;
  author?: string;
  company?: string;
}

export async function buildWorkbook(sheets: XSheet[], meta: WorkbookMeta = {}, palette: string[] = []): Promise<Blob> {
  const enc = new TextEncoder();
  const styles = new StyleRegistry();
  const files: { name: string; data: Uint8Array }[] = [];
  const overrides: string[] = [];
  const definedNames: string[] = [];
  let chartNo = 1;

  sheets.forEach((sheet, i) => {
    const n = i + 1;
    const hasDrawing = sheet.charts.length > 0;
    files.push({ name: `xl/worksheets/sheet${n}.xml`, data: enc.encode(sheetXml(sheet, i, styles, hasDrawing)) });
    overrides.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    const sref = sheetRef(sheet.name);
    if (sheet.autoFilter) {
      const af = sheet.autoFilter;
      definedNames.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${esc(`${sref}!${absRef(af.fromRow, af.fromCol)}:${absRef(af.toRow, af.toCol)}`)}</definedName>`);
    }
    if (sheet.printTitleRows) {
      definedNames.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${esc(`${sref}!$${sheet.printTitleRows.from + 1}:$${sheet.printTitleRows.to + 1}`)}</definedName>`);
    }
    if (hasDrawing) {
      files.push({ name: `xl/worksheets/_rels/sheet${n}.xml.rels`, data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`) });
      files.push({ name: `xl/drawings/drawing${n}.xml`, data: enc.encode(drawingXml(sheet.charts, chartNo)) });
      overrides.push(`<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
      const rels: string[] = [];
      sheet.charts.forEach((ch, ci) => {
        const no = chartNo++;
        files.push({ name: `xl/charts/chart${no}.xml`, data: enc.encode(chartXml(ch, palette)) });
        overrides.push(`<Override PartName="/xl/charts/chart${no}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
        rels.push(`<Relationship Id="rId${ci + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${no}.xml"/>`);
      });
      files.push({ name: `xl/drawings/_rels/drawing${n}.xml.rels`, data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`) });
    }
  });

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  files.unshift(
    { name: "[Content_Types].xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${overrides.join("")}</Types>`) },
    { name: "_rels/.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`) },
    { name: "docProps/core.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(meta.title ?? "")}</dc:title><dc:creator>${esc(meta.author ?? "GymBios")}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`) },
    { name: "docProps/app.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>GymBios</Application>${meta.company ? `<Company>${esc(meta.company)}</Company>` : ""}</Properties>`) },
    { name: "xl/workbook.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="15000" activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${definedNames.length ? `<definedNames>${definedNames.join("")}</definedNames>` : ""}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
  );
  // Styles last: every sheet registered its cell styles above.
  files.push({ name: "xl/styles.xml", data: enc.encode(styles.xml()) });

  const bytes = await zip(files);
  return new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
