import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Archive, Calculator, CheckCircle, ChevronDown, ChevronRight, Clock, LayoutGrid, PackagePlus, CreditCard, DollarSign, Dumbbell, Eye, GlassWater, Heart, Inbox,
  Lock, Minus, Package, Pause, Percent, Pill as PillIcon, Plus, Printer, Receipt, RefreshCw, RotateCcw, Settings, Shirt,
  ShoppingCart, StickyNote, Tag, Ticket, Trash2, TrendingUp, User, UtensilsCrossed, X, XCircle, Search, Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { productsService, type Product } from "../utils/supabase/products-service";
import { accountHeadsService, type AccountHead } from "../utils/supabase/account-heads-service";
import { membersService } from "../utils/supabase/members-service";
import { resolveBackendImageUrl } from "../utils/resolve-image-url";
import { useFavorites } from "../hooks/useFavorites";
import { usePaymentManager } from "../payments/usePaymentManager";
import { PAYMENT_TYPES, type PaymentType } from "../payments/paymentModel";
import type { CreditCustomer } from "../payments/modals/CreditModal";
import { posApi } from "./api";
import { usePos } from "./PosContext";
import { useApproval } from "./components/Approval";
import { Money, type PickedMember } from "./components/Shared";
import { BillDiscountDialog, LineEditDialog, NoteDialog } from "./components/CartDialogs";
import { HeldSalesDialog, PriceCheckDialog, ReceiptDialog, ReturnDialog, SalesLookupDialog } from "./components/SaleDialogs";
import { CashMovementDialog } from "./components/SessionDialogs";
import { LockScreen } from "./components/LockScreen";
import { CheckoutScreen } from "./components/CheckoutScreen";
import { QuickAddProductDialog } from "./components/QuickAddProduct";
import { dayChip } from "./components/BusinessDay";
import {
  CouponDialog, CreditBalanceDialog, CustomerDropdown, PromotionsDialog, TerminalConfigDialog, branchDisplay, findMemberByCode,
  loadDisplay, type TerminalDisplay,
} from "./components/TerminalDialogs";
import { getTaxDefaults, salesDiscountFor, salesTaxFor, type TaxDefaults } from "../utils/supabase/tax-defaults-service";
import { discountLimit, priceCart, r2, type BillDiscount, type CartLine, type PricedLine, type PromoRule } from "./pricing";
import type { HeldSale, Sale } from "./types";
import s from "./pos.module.css";

interface CartState {
  lines: CartLine[];
  member: PickedMember | null;
  bill: BillDiscount | null;
  /** Promotion or coupon applied to the sale (one per sale). */
  promo: PromoRule | null;
  note: string;
  heldSaleId: number | null;
}

const EMPTY_CART: CartState = { lines: [], member: null, bill: null, promo: null, note: "", heldSaleId: null };
const cartKey = (sessionId: number) => `gymbios.pos.cart.${sessionId}`;

function loadCart(sessionId: number): CartState {
  try {
    const raw = sessionStorage.getItem(cartKey(sessionId));
    return raw ? { ...EMPTY_CART, ...JSON.parse(raw) } : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

async function loadPosProducts(): Promise<Product[]> {
  const all: Product[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await productsService.getProducts({ status: "ACTIVE", enabledForPos: true, page, size: 200 });
    all.push(...res.products);
    if (page >= (res.pagination.totalPages || 1) || res.products.length === 0) break;
  }
  return all.filter((p) => p.isActive && p.enabledForPos);
}

function lineFromProduct(p: Product, tax: TaxDefaults | null): CartLine {
  const img = p.imageUrls?.[0] ? String(resolveBackendImageUrl(p.imageUrls[0])) : null;
  return {
    key: `${p.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    productId: p.id,
    name: p.name,
    sku: p.sku || null,
    barcode: p.barcode || null,
    categoryName: p.categoryName || null,
    imageUrl: img,
    listPrice: Number(p.sellingPrice) || 0,
    unitPrice: Number(p.sellingPrice) || 0,
    priceOverridden: false,
    quantity: 1,
    // BillBull: the product's discount is pre-filled; the line tax follows the branch tax policy.
    discountType: "PERCENT",
    discountValue: salesDiscountFor(p),
    taxRate: salesTaxFor(p, tax),
    costPrice: Number(p.costPrice) || 0,
    stock: typeof p.totalStock === "number" ? p.totalStock : null,
    allowDiscount: p.allowDiscount !== false,
    maxDiscount: p.allowDiscount === false ? 0 : Number(p.maxDiscountPercent) || 0,
  };
}

const isTyping = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
};

const categoryIcon = (name: string, size = 16) => {
  const n = name.toLowerCase();
  if (/supplement|protein|vitamin|nutrition|whey|creatine/.test(n)) return <PillIcon size={size} />;
  if (/drink|beverage|water|juice|shake|cafe/.test(n)) return <GlassWater size={size} />;
  if (/snack|food|bar|meal/.test(n)) return <UtensilsCrossed size={size} />;
  if (/apparel|cloth|wear|shirt|merch/.test(n)) return <Shirt size={size} />;
  if (/equipment|gear|accessor|glove|belt/.test(n)) return <Dumbbell size={size} />;
  return <Package size={size} />;
};

type Feedback = { type: "success" | "error" | "customer"; message: string };
type Mode = "none" | "qty" | "discount" | "price";

export function Terminal() {
  const pos = usePos();
  const { settings, session, terminalName, go, printSale, openDrawer, dayStatus, setSession, refreshDayStatus } = pos;
  const [confirmClose, setConfirmClose] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const { withApproval, askPin } = useApproval();
  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites();

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<AccountHead[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lastAdded, setLastAdded] = useState<{ productId: number; key: string } | null>(null);
  const [cart, setCart] = useState<CartState>(() => (session ? loadCart(session.id) : EMPTY_CART));
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [locked, setLocked] = useState(false);
  const [display, setDisplay] = useState<TerminalDisplay>(() => loadDisplay() ?? branchDisplay(settings));
  const [salesDone, setSalesDone] = useState(0);

  // Dialog state
  const [editLine, setEditLine] = useState<CartLine | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [showCredit, setShowCredit] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [showPromos, setShowPromos] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  // Compact (BillBull Trade POS): functions slide-over, keyboard-highlighted quick pick, last purchase.
  const [showFunctions, setShowFunctions] = useState(false);
  const [pickIndex, setPickIndex] = useState(-1);
  const [lastPurchase, setLastPurchase] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [custOpen, setCustOpen] = useState(false);
  const [lookupMode, setLookupMode] = useState<"reprint" | "return" | null>(null);
  const [returnSale, setReturnSale] = useState<Sale | null>(null);
  const [receipt, setReceipt] = useState<{ sale: Sale; reprint: boolean } | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [paying, setPaying] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomer[]>([]);

  // Right panel / keypad
  const [rightTab, setRightTab] = useState<"actions" | "history">("actions");
  const [mode, setMode] = useState<Mode>("none");
  const [numpadValue, setNumpadValue] = useState("");
  const [discType, setDiscType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [history, setHistory] = useState<Sale[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [quickIds, setQuickIds] = useState<{ recent: number[] | null; top: number[] | null }>({ recent: null, top: null });

  const searchRef = useRef<HTMLInputElement>(null);
  // Branch tax policy (Settings › Tax Configuration) for new cart lines.
  const taxDefaultsRef = useRef<TaxDefaults | null>(null);
  useEffect(() => { getTaxDefaults().then((d) => { taxDefaultsRef.current = d; }).catch(() => undefined); }, []);
  const entryRef = useRef<HTMLInputElement>(null);
  const scanBuffer = useRef<{ text: string; last: number }>({ text: "", last: 0 });
  const lastActivity = useRef(Date.now());
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusLayout = display.template === "focus";
  const compactLayout = display.template === "compact";
  const showCats = !focusLayout && display.template !== "compact" && !display.hideCategories;
  const showItems = !focusLayout && !display.hideItems;

  // ── Data ────────────────────────────────────────────────────────────────
  const reloadProducts = useCallback(() => {
    setProductsLoading(true);
    loadPosProducts().then(setProducts).catch((e) => toast.error(`Could not load products: ${e.message}`)).finally(() => setProductsLoading(false));
  }, []);
  useEffect(() => {
    reloadProducts();
    accountHeadsService.getBankAccounts().then(setBankAccounts).catch(() => setBankAccounts([]));
  }, [reloadProducts]);

  useEffect(() => {
    if (!session) return;
    try { sessionStorage.setItem(cartKey(session.id), JSON.stringify(cart)); } catch { /* storage blocked */ }
  }, [cart, session]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Heartbeat: Live Sessions shows how long each till has been idle.
  useEffect(() => {
    if (!session || session.status !== "OPEN") return;
    const beat = () => { if (document.visibilityState === "visible") posApi.touchSession(session.id).catch(() => undefined); };
    beat();
    const t = setInterval(beat, 60_000);
    return () => clearInterval(t);
  }, [session?.id, session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep toasts off the Actions column / Checkout button while selling.
  useEffect(() => {
    document.body.classList.add(s.toastShift);
    return () => document.body.classList.remove(s.toastShift);
  }, []);

  // Terminals without their own display override follow the branch default.
  useEffect(() => { if (!loadDisplay()) setDisplay(branchDisplay(settings)); }, [settings]);

  // Idle auto-lock
  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); };
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    const minutes = settings.idleLockMinutes;
    const t = minutes > 0 ? setInterval(() => {
      if (!locked && Date.now() - lastActivity.current > minutes * 60_000) lock("Idle timeout");
    }, 10_000) : null;
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      if (t) clearInterval(t);
    };
  }, [settings.idleLockMinutes, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = useCallback((type: Feedback["type"], message: string) => {
    setFeedback({ type, message });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2600);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────
  const activeLines = useMemo(() => cart.lines.filter((l) => !l.voided), [cart.lines]);
  const voidedLines = useMemo(() => cart.lines.filter((l) => l.voided), [cart.lines]);
  const totals = useMemo(() => priceCart(activeLines, cart.bill, settings.taxInclusive, cart.promo), [activeLines, cart.bill, settings.taxInclusive, cart.promo]);
  /** What a promotion / coupon applies to: the basket after line and bill discounts. */
  const promoBase = r2(totals.subtotal - totals.lineDiscount - totals.billDiscount);
  const voidTotals = useMemo(() => priceCart(voidedLines, null, settings.taxInclusive), [voidedLines, settings.taxInclusive]);
  // A line is over its limit above the product's own max discount (or the cashier limit without one).
  const discountOverLimit = activeLines.some((l) => {
    const pl = totals.lines.find((x) => x.key === l.key);
    return pl ? pl.discountPercent > discountLimit(l, settings.maxCashierDiscountPercent) + 1e-9 : false;
  });
  const pricedByKey = useMemo(() => {
    const m = new Map<string, PricedLine>();
    totals.lines.forEach((l) => m.set(l.key, l));
    voidTotals.lines.forEach((l) => m.set(l.key, l));
    return m;
  }, [totals, voidTotals]);
  const hasItems = activeLines.length > 0;

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.categoryName || "Uncategorized", (map.get(p.categoryName || "Uncategorized") || 0) + 1));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const matchesQuery = useCallback((p: Product, q: string) =>
    p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q), []);

  const gridProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base: Product[];
    if (category === "recent" || category === "top") {
      const ids = (category === "recent" ? quickIds.recent : quickIds.top) ?? [];
      const byId = new Map(products.map((p) => [p.id, p]));
      base = ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
    } else {
      base = products.filter((p) => category === "all" ? true : category === "fav" ? favoriteIds.has(p.id) : (p.categoryName || "Uncategorized") === category);
    }
    return q ? base.filter((p) => matchesQuery(p, q)) : base;
  }, [products, category, query, favoriteIds, quickIds, matchesQuery]);

  // ── Cart ops ────────────────────────────────────────────────────────────
  const addProduct = useCallback((p: Product, qty = 1) => {
    setCart((c) => {
      const existing = c.lines.find((l) => l.productId === p.id && !l.voided && !l.priceOverridden && l.discountType === "PERCENT"
        && l.discountValue === salesDiscountFor(p) && !l.note);
      if (existing) {
        if (existing.stock != null && existing.quantity + qty > existing.stock) toast.warning(`Only ${existing.stock} of ${p.name} in stock.`);
        setFocusKey(existing.key);
        setLastAdded({ productId: p.id, key: existing.key });
        return { ...c, lines: c.lines.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + qty } : l)) };
      }
      const line = { ...lineFromProduct(p, taxDefaultsRef.current), quantity: qty };
      if (line.stock != null && line.stock < qty) toast.warning(`${p.name} shows ${line.stock} in stock.`);
      setFocusKey(line.key);
      setLastAdded({ productId: p.id, key: line.key });
      // Newest line on top, like BillBull.
      return { ...c, lines: [line, ...c.lines] };
    });
  }, []);

  const findByCode = useCallback((code: string) => {
    const c = code.trim();
    if (!c) return null;
    const lc = c.toLowerCase();
    return products.find((p) => p.barcode === c) || products.find((p) => (p.sku || "").toLowerCase() === lc) || null;
  }, [products]);

  /** One entry point for scans, the search box and the keypad: "3*CODE" adds three; a member ID or mobile sets the customer. */
  const handleEntry = useCallback(async (raw: string, fromGrid: boolean) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const m = trimmed.match(/^(\d{1,3})[*x](.+)$/i);
    const qty = m ? Math.max(1, parseInt(m[1], 10)) : 1;
    const value = m ? m[2].trim() : trimmed;
    const clear = () => { setEntry(""); if (fromGrid) setQuery(""); };

    const exact = findByCode(value);
    if (exact) {
      addProduct(exact, qty);
      flash("success", qty > 1 ? `${exact.name} ×${qty} added` : `${exact.name} added`);
      clear();
      return;
    }
    if (fromGrid) {
      const q = value.toLowerCase();
      const hits = products.filter((p) => matchesQuery(p, q));
      if (hits.length === 1) {
        addProduct(hits[0], qty);
        flash("success", qty > 1 ? `${hits[0].name} ×${qty} added` : `${hits[0].name} added`);
        clear();
        return;
      }
    }
    if (!m) {
      const member = await findMemberByCode(value);
      if (member) {
        setCart((c) => ({ ...c, member }));
        flash("customer", `Customer set: ${member.name}`);
        clear();
        return;
      }
    }
    if (fromGrid) flash("error", `No exact match — showing results for "${value}"`);
    else { flash("error", `No product found: ${value}`); setEntry(""); }
  }, [findByCode, addProduct, flash, products, matchesQuery]);

  const updateLine = (key: string, patch: Partial<CartLine>) =>
    setCart((c) => ({ ...c, lines: c.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));

  /** Voiding needs a supervisor PIN when POS settings say so (cashiers only). */
  const ensureVoidAllowed = async (what: string) => {
    if (!settings.requireSupervisorForVoid || settings.currentUserIsSupervisor) return { ok: true, approved: null as string | null };
    const pin = await askPin(`Supervisor approval is required to ${what}.`);
    if (!pin) return { ok: false, approved: null };
    const { valid } = await posApi.verifyPin(pin).catch(() => ({ valid: false }));
    if (!valid) { toast.error("Incorrect supervisor PIN."); return { ok: false, approved: null }; }
    return { ok: true, approved: "Supervisor PIN" };
  };

  /** BillBull VOID mode: the line stays on screen marked [VOID] and leaves the total; voiding it again restores it. */
  const voidLine = async (line: CartLine) => {
    if (line.voided) { updateLine(line.key, { voided: false }); return; }
    const gate = await ensureVoidAllowed(`void ${line.name}`);
    if (!gate.ok) return;
    updateLine(line.key, { voided: true });
    if (focusKey === line.key) setFocusKey(null);
    posApi.logEvent("LINE_VOID", `${line.quantity} × ${line.name}${gate.approved ? " (approved)" : ""}`, { posSessionId: session?.id, amount: r2(line.unitPrice * line.quantity), terminalName });
  };

  /** Quantity stepped to zero removes the line outright. */
  const removeLine = async (line: CartLine) => {
    const gate = await ensureVoidAllowed(`remove ${line.name}`);
    if (!gate.ok) return;
    setCart((c) => ({ ...c, lines: c.lines.filter((l) => l.key !== line.key) }));
    if (focusKey === line.key) setFocusKey(null);
    posApi.logEvent("LINE_VOID", `${line.quantity} × ${line.name} removed${gate.approved ? " (approved)" : ""}`, { posSessionId: session?.id, amount: r2(line.unitPrice * line.quantity), terminalName });
  };

  const changeQty = async (line: CartLine, delta: number) => {
    const next = line.quantity + delta;
    if (next <= 0) return removeLine(line);
    if (delta > 0 && line.stock != null && next > line.stock) toast.warning(`Only ${line.stock} of ${line.name} in stock.`);
    updateLine(line.key, { quantity: next });
  };

  const clearCart = async (force = false) => {
    if (cart.lines.length === 0) { setCart(EMPTY_CART); return; }
    if (!force && hasItems) {
      const gate = await ensureVoidAllowed("clear the sale");
      if (!gate.ok) return;
      posApi.logEvent("CART_CLEAR", `${activeLines.length} line(s), ${totals.total.toFixed(2)}`, { posSessionId: session?.id, amount: totals.total, terminalName });
    }
    setCart(EMPTY_CART);
    setFocusKey(null);
    setLastAdded(null);
    setMode("none");
  };

  // ── Hold / recall ───────────────────────────────────────────────────────
  const hold = async () => {
    if (!hasItems) return;
    try {
      const h = await posApi.holdSale({
        posSessionId: session?.id ?? null,
        label: cart.member?.name || undefined,
        memberId: cart.member?.id ?? null,
        memberName: cart.member?.name ?? null,
        cartJson: JSON.stringify({ ...cart, lines: activeLines }),
        itemCount: totals.itemCount,
        total: totals.total,
        terminalName: terminalName || null,
      });
      toast.success(`Sale held as ${h.holdNumber}`);
      setCart(EMPTY_CART);
      setFocusKey(null);
      setLastAdded(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const recall = (h: HeldSale) => {
    try {
      const saved = JSON.parse(h.cartJson) as CartState;
      const byId = new Map(products.map((p) => [p.id, p]));
      const lines = (saved.lines || []).filter((l) => !l.voided).map((l) => {
        const p = byId.get(l.productId);
        if (!p) return l;
        const list = Number(p.sellingPrice) || 0;
        return { ...l, listPrice: list, unitPrice: l.priceOverridden ? l.unitPrice : list, taxRate: Number(p.taxRate) || 0, stock: p.totalStock ?? l.stock };
      });
      setCart({ ...EMPTY_CART, ...saved, lines, heldSaleId: null });
      toast.success(`${h.holdNumber} recalled`);
    } catch {
      toast.error("That held sale could not be read.");
    }
  };

  // ── Payment ─────────────────────────────────────────────────────────────
  const paymentManager = usePaymentManager({ invoiceTotal: totals.total });
  const offeredTypes = useMemo<PaymentType[]>(() => [
    PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE,
    ...(cart.member && (walletBalance ?? 0) > 0 ? [PAYMENT_TYPES.WALLET] : []),
    ...(settings.allowCreditSales ? [PAYMENT_TYPES.CREDIT] : []),
  ], [settings.allowCreditSales, cart.member, walletBalance]);

  // Reward-wallet balance of the selected member, offered as a tender at checkout.
  useEffect(() => {
    setWalletBalance(null);
    if (!cart.member) return;
    let live = true;
    posApi.wallet(cart.member.id).then((w) => { if (live) setWalletBalance(Number(w.balance) || 0); }).catch(() => undefined);
    return () => { live = false; };
  }, [cart.member, salesDone]);

  const searchCreditCustomers = useCallback((q: string) => {
    if (!q.trim()) { setCreditCustomers([]); return; }
    membersService.getMembers({ search: q.trim() }, { limit: 10 })
      .then((r) => setCreditCustomers((r.members || []).map((m) => ({ code: String(m.id), name: `${m.name}${m.member_id ? ` (${m.member_id})` : ""}` }))))
      .catch(() => setCreditCustomers([]));
  }, []);

  const startPayment = () => {
    if (!session) { toast.error("Open a session first."); return; }
    if (session.stale) { toast.error("This session is from a previous business day — close it (X-Report) first."); return; }
    if (!hasItems) return;
    if (settings.requireCustomer && !cart.member) { toast.error("Select a member for this sale (required by POS settings)."); return; }
    setMode("none");
    paymentManager.clearLines();
    setCompletedSale(null);
    setShowPay(true);
  };

  const completePayment = async () => {
    if (!session) return;
    if (totals.total > 0 && !paymentManager.settleable) { toast.error("Allocate the full amount before completing the sale."); return; }
    setPaying(true);
    const lineNotes = activeLines.filter((l) => l.note).map((l) => `${l.name}: ${l.note}`);
    const notes = [cart.note, ...lineNotes].filter(Boolean).join("\n") || null;
    try {
      const sale = await withApproval((pin) => posApi.checkout({
        posSessionId: session.id,
        memberId: cart.member?.id ?? null,
        memberName: cart.member?.name ?? null,
        items: activeLines.map((l) => ({
          productId: l.productId,
          productName: l.name,
          productSku: l.sku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          priceOverridden: l.priceOverridden,
          discountPercent: l.discountType === "PERCENT" ? l.discountValue : 0,
          discountAmount: l.discountType === "AMOUNT" ? l.discountValue : 0,
        })),
        billDiscountType: cart.bill?.type ?? null,
        billDiscountValue: cart.bill?.value ?? null,
        discountCode: cart.promo?.code || null,
        promotionId: cart.promo && !cart.promo.code ? cart.promo.promotionId : null,
        paymentAllocations: paymentManager.paymentLines.map((p) => ({
          type: p.paymentType as "CASH" | "CARD" | "ONLINE" | "CREDIT" | "WALLET",
          subtype: p.paymentSubtype,
          amount: r2(p.amount),
          reference: p.reference,
          bankAccountId: p.bankAccountId ? Number(p.bankAccountId) : null,
          bankAccountName: p.bankAccountName,
          customerCode: p.customerCode,
          customerName: p.customerName,
        })),
        notes,
        terminalName: terminalName || null,
        supervisorPin: pin,
        heldSaleId: cart.heldSaleId,
      }));
      if (!sale) return;
      const cashUsed = paymentManager.paymentLines.some((p) => p.paymentType === PAYMENT_TYPES.CASH);
      const kick = cashUsed && settings.openDrawerOnCash;
      if (voidedLines.length) {
        posApi.logEvent("LINE_VOID", `Voided on ${sale.transactionNumber}: ${voidedLines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}`,
          { referenceType: "SaleTransaction", referenceId: sale.id, referenceNumber: sale.transactionNumber, posSessionId: session.id, amount: voidTotals.total, terminalName });
      }
      setCart(EMPTY_CART);
      setFocusKey(null);
      setLastAdded(null);
      setLastSale(sale);
      setCompletedSale(sale);
      setSalesDone((n) => n + 1);
      setQuickIds({ recent: null, top: null });
      // Stock shown on cards changed — refresh quietly in the background.
      reloadProducts();
      if (settings.autoPrintReceipt) printSale(sale, { openDrawer: kick });
      else if (kick) openDrawer(`Cash sale ${sale.transactionNumber}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  // ── Misc actions ────────────────────────────────────────────────────────
  /**
   * Locks the terminal. Open terminal dialogs are closed first — a dialog left above the lock
   * screen would stay usable and keep focus away from the password box. A step that can't be
   * closed from here (supervisor PIN prompt, card/cash entry) must be finished first.
   */
  const lock = (why = "Locked by cashier") => {
    setEditLine(null); setShowBill(false); setShowNote(false); setShowHeld(false); setShowPrice(false);
    setShowCash(false); setShowCredit(false); setShowConfig(false); setCustOpen(false); setShowCoupon(false); setShowPromos(false);
    setShowQuickAdd(false); setShowFunctions(false);
    setLookupMode(null); setReturnSale(null); setReceipt(null);
    setTimeout(() => {
      if (document.querySelector("[role=dialog][data-state=open]")) {
        if (why === "Locked by cashier") toast.info("Finish the open step before locking the terminal.");
        return;
      }
      setLocked(true);
      posApi.logEvent("TERMINAL_LOCK", why, { posSessionId: session?.id ?? null, terminalName });
    }, 260);
  };

  const manualDrawer = async () => {
    const ok = await openDrawer("Manual open (no sale)");
    if (!ok) toast.info("No receipt printer with a cash drawer is configured for this terminal (POS Console › Printers).");
  };

  const pickForReprint = async (sale: Sale) => {
    setLookupMode(null);
    try {
      const updated = await withApproval((pin) => posApi.reprint(sale.id, pin));
      if (updated) setReceipt({ sale: updated, reprint: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pickForReturn = async (sale: Sale) => {
    setLookupMode(null);
    try {
      setReturnSale(await posApi.sale(sale.id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const anyDialog = Boolean(editLine || showBill || showNote || showPay || showHeld || showPrice || showCash || showCredit || showConfig || showCoupon || showPromos || showQuickAdd || showFunctions || confirmClose
    || lookupMode || returnSale || receipt || locked);

  // ── Keyboard: hotkeys + barcode wedge ───────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked) return;
      const fkeys: Record<string, () => void> = {
        F2: startPayment,
        F3: () => hasItems && setShowBill(true),
        F4: () => setLookupMode("return"),
        F5: () => setLookupMode("reprint"),
        F6: hold,
        F7: () => setShowHeld(true),
        F8: () => setShowPrice(true),
        F9: () => setShowCash(true),
        F10: () => lastSale && setReceipt({ sale: lastSale, reprint: false }),
        F12: () => lock(),
      };
      if (fkeys[e.key]) {
        e.preventDefault();
        if (!anyDialog || e.key === "F12") fkeys[e.key]();
        return;
      }
      if (anyDialog || custOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); (focusLayout ? entryRef : searchRef).current?.focus(); return; }
      if (e.key === "Delete" && !isTyping(e.target) && focusKey) {
        const line = cart.lines.find((l) => l.key === focusKey);
        if (line) { e.preventDefault(); voidLine(line); }
        return;
      }
      if ((e.key === "+" || e.key === "-") && !isTyping(e.target) && focusKey) {
        const line = cart.lines.find((l) => l.key === focusKey && !l.voided);
        if (line) { e.preventDefault(); changeQty(line, e.key === "+" ? 1 : -1); }
        return;
      }
      // Keyboard-wedge scanners type fast and end with Enter — capture them anywhere outside an input.
      if (isTyping(e.target)) return;
      const nowMs = Date.now();
      const buf = scanBuffer.current;
      if (e.key === "Enter") {
        if (buf.text.length >= 3) { e.preventDefault(); handleEntry(buf.text, false); }
        buf.text = "";
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buf.text = nowMs - buf.last > 80 ? e.key : buf.text + e.key;
        buf.last = nowMs;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (anyDialog || custOpen || mode !== "none") return;
    (focusLayout ? entryRef : searchRef).current?.focus();
  }, [anyDialog, custOpen, mode, focusLayout]);

  // ── Quick strips / history ──────────────────────────────────────────────
  useEffect(() => {
    if (category === "recent" && quickIds.recent === null) {
      posApi.sales({ size: 40 }).then((p) => {
        const ids: number[] = [];
        p.transactions.forEach((t) => t.items.forEach((i) => { if (!ids.includes(i.productId)) ids.push(i.productId); }));
        setQuickIds((q) => ({ ...q, recent: ids }));
      }).catch(() => setQuickIds((q) => ({ ...q, recent: [] })));
    }
    if (category === "top" && quickIds.top === null) {
      const d = new Date(); d.setDate(d.getDate() - 30);
      posApi.analytics(d.toISOString().slice(0, 10)).then((a) => setQuickIds((q) => ({ ...q, top: a.topItems.map((i) => i.productId).filter((x): x is number => x != null) })))
        .catch(() => setQuickIds((q) => ({ ...q, top: [] })));
    }
  }, [category, quickIds]);

  useEffect(() => {
    if (rightTab !== "history" || !cart.member) { setHistory([]); return; }
    setHistoryLoading(true);
    posApi.sales({ memberId: cart.member.id, size: 15 }).then((p) => setHistory(p.transactions)).catch(() => setHistory([])).finally(() => setHistoryLoading(false));
  }, [rightTab, cart.member, salesDone]);

  useEffect(() => {
    if (!compactLayout || !cart.member) { setLastPurchase(null); return; }
    let live = true;
    posApi.sales({ memberId: cart.member.id, size: 1 })
      .then((p) => { if (live) setLastPurchase(p.transactions[0]?.createdAt ?? null); })
      .catch(() => { if (live) setLastPurchase(null); });
    return () => { live = false; };
  }, [compactLayout, cart.member, salesDone]);

  // ── Keypad modes (Add Qty / Discount / Price) ───────────────────────────
  const focusLine = cart.lines.find((l) => l.key === focusKey && !l.voided) ?? null;
  const focusPriced = focusLine ? pricedByKey.get(focusLine.key) ?? null : null;

  const toggleMode = (m: Exclude<Mode, "none">) => {
    if (m === "price" && !settings.allowPriceOverride) { toast.error("Price overrides are disabled in POS settings."); return; }
    setMode((cur) => (cur === m ? "none" : m));
    setNumpadValue("");
    setEntry("");
    if (m === "discount") setDiscType("PERCENT");
  };

  /** Applies the keypad value to the selected line; false when there is nothing to apply. */
  const applyMode = (raw: string) => {
    if (!focusLine || mode === "none") return false;
    const v = parseFloat(raw);
    if (!Number.isFinite(v) || v < 0) return false;
    if (mode === "qty") {
      const q = Math.round(v);
      if (q <= 0) removeLine(focusLine);
      else {
        if (focusLine.stock != null && q > focusLine.stock) toast.warning(`Only ${focusLine.stock} of ${focusLine.name} in stock.`);
        updateLine(focusLine.key, { quantity: q });
      }
    } else if (mode === "discount") {
      if (focusLine.allowDiscount === false) { toast.error(`Discounts are not allowed on ${focusLine.name}.`); return false; }
      const gross = focusLine.unitPrice * focusLine.quantity;
      updateLine(focusLine.key, discType === "PERCENT"
        ? { discountType: "PERCENT", discountValue: Math.min(v, 100) }
        : { discountType: "AMOUNT", discountValue: Math.min(v, r2(gross)) });
    } else {
      const price = r2(v);
      updateLine(focusLine.key, { unitPrice: price, priceOverridden: price !== r2(focusLine.listPrice) });
    }
    setMode("none");
    setNumpadValue("");
    setEntry("");
    return true;
  };

  const cancelMode = () => { setMode("none"); setNumpadValue(""); setEntry(""); };

  /** Cart Focus keypad Enter/ADD: applies the open mode to the selected line, otherwise scans. */
  const submitFocusEntry = () => {
    if (mode === "none") { handleEntry(entry, false); return; }
    if (!focusLine) { flash("error", "Click a cart item to select it"); return; }
    if (!applyMode(entry)) flash("error", "Enter a valid number");
  };

  // ── Actions (shared by both templates; Configure can hide any of them) ──
  const icon = (n: React.ReactNode) => n;
  const removeTarget = () => focusLine ?? activeLines[0] ?? null;
  const actions: { id: string; label: string; icon: React.ReactNode; tone: string; onClick: () => void; disabled?: boolean; active?: boolean }[] = [
    { id: "add-qty", label: "Add Qty", icon: icon(<Plus />), tone: s.tBlue, onClick: () => toggleMode("qty"), disabled: !hasItems, active: mode === "qty" },
    { id: "discount", label: focusLayout ? "Discount" : "Disc %", icon: icon(<Percent />), tone: s.tTeal, onClick: () => toggleMode("discount"), disabled: !hasItems, active: mode === "discount" },
    { id: "price", label: "Price", icon: icon(<Tag />), tone: s.tPurple, onClick: () => toggleMode("price"), disabled: !hasItems, active: mode === "price" },
    { id: "remove", label: focusLayout ? "Remove Item" : "Remove", icon: icon(<Trash2 />), tone: s.tRed, onClick: () => { const l = removeTarget(); if (l) voidLine(l); }, disabled: !hasItems },
    { id: "quick-add-product", label: "Quick Add Product", icon: icon(<PackagePlus />), tone: s.tEmerald, onClick: () => setShowQuickAdd(true) },
    { id: "held", label: "Held Bills", icon: icon(<Pause />), tone: s.tAmber, onClick: () => setShowHeld(true) },
    { id: "hold", label: "Hold Bill", icon: icon(<Archive />), tone: s.tAmber, onClick: hold, disabled: !hasItems },
    { id: "bill-discount", label: "Bill Discount", icon: icon(<Tag />), tone: s.tPink, onClick: () => setShowBill(true), disabled: !hasItems },
    { id: "coupons", label: "Coupons", icon: icon(<Ticket />), tone: s.tPink, onClick: () => setShowCoupon(true), disabled: !hasItems },
    { id: "promotions", label: "Promotions", icon: icon(<Zap />), tone: s.tAmber, onClick: () => setShowPromos(true), disabled: !hasItems },
    { id: "return", label: "Return", icon: icon(<RotateCcw />), tone: s.tPurple, onClick: () => setLookupMode("return") },
    { id: "price-chk", label: "Price Check", icon: icon(<Calculator />), tone: s.tCyan, onClick: () => setShowPrice(true) },
    { id: "credit-balance", label: "Credit Balance", icon: icon(<CreditCard />), tone: s.tViolet, onClick: () => setShowCredit(true) },
    { id: "cash-drop", label: "Cash Drawer", icon: icon(<DollarSign />), tone: s.tEmerald, onClick: () => setShowCash(true), disabled: !session },
    { id: "open-drawer", label: "Open Drawer", icon: icon(<Inbox />), tone: s.tEmerald, onClick: manualDrawer },
    { id: "last-receipt", label: "Last Receipt", icon: icon(<Receipt />), tone: s.tGray, onClick: () => lastSale && setReceipt({ sale: lastSale, reprint: false }), disabled: !lastSale },
    { id: "reprint", label: "Reprint", icon: icon(<Printer />), tone: s.tGray, onClick: () => setLookupMode("reprint") },
    { id: "note", label: "Sale Note", icon: icon(<StickyNote />), tone: s.tSky, onClick: () => setShowNote(true) },
    { id: "lock-pos", label: "Lock POS", icon: icon(<Lock />), tone: s.tSlate, onClick: () => lock() },
    { id: "suspend", label: "Suspend Session", icon: icon(<Pause />), tone: s.tSlate, onClick: () => suspendSession(), disabled: !session || hasItems },
    { id: "close-session", label: "Close Session", icon: icon(<XCircle />), tone: s.tRed, onClick: () => { if (session) setConfirmClose(true); } },
  ];
  const visibleActions = actions.filter((a) => !display.hiddenButtons.includes(a.id));
  /** BillBull groups the shared functions the same way in the Compact Functions panel. */
  const ACTION_GROUP: Record<string, string> = {
    "quick-add-product": "Sales", held: "Sales", hold: "Sales", "bill-discount": "Sales", coupons: "Sales", promotions: "Sales", return: "Sales", note: "Sales",
    "price-chk": "Lookup", "credit-balance": "Lookup",
    "cash-drop": "Cash & Receipts", "open-drawer": "Cash & Receipts", "last-receipt": "Cash & Receipts", reprint: "Cash & Receipts",
    "lock-pos": "Session", suspend: "Session", "close-session": "Session",
  };
  // Compact rows carry their own qty / remove controls (double-click edits), so the keypad modes stay out.
  const functionGroups = ["Sales", "Lookup", "Cash & Receipts", "Session"].map((g) => ({
    name: g, buttons: visibleActions.filter((a) => ACTION_GROUP[a.id] === g),
  })).filter((g) => g.buttons.length > 0);

  /** Steps away without closing: nothing can be sold until the session is resumed. */
  const suspendSession = async () => {
    if (!session) return;
    if (hasItems) { toast.error("Hold or finish the current sale before suspending."); return; }
    setSessionBusy(true);
    try {
      const s2 = await posApi.suspendSession(session.id);
      setSession(s2);
      refreshDayStatus();
      toast.success(`${s2.sessionNumber} suspended`);
      go("dashboard");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSessionBusy(false);
    }
  };

  /** BillBull: "Close Session" starts the closing workflow (selling stops), then the X-Report closes it. */
  const beginClosing = async () => {
    if (!session) return;
    setSessionBusy(true);
    try {
      const s2 = await posApi.beginClosure(session.id);
      setSession(s2);
      setConfirmClose(false);
      refreshDayStatus();
      pos.showXReport();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSessionBusy(false);
    }
  };

  const resumeSession = async () => {
    if (!session) return;
    setSessionBusy(true);
    try {
      setSession(await posApi.resumeSession(session.id));
      refreshDayStatus();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSessionBusy(false);
    }
  };

  // What stops selling right now, if anything (BillBull's blocking overlays).
  const block: { title: string; text: string; primary: { label: string; onClick: () => void }; secondary?: { label: string; onClick: () => void } } | null =
    !session ? null
    : session.stale ? {
        title: "Previous business day",
        text: `${session.sessionNumber} was opened on ${session.businessDate}. Close it with an X-Report before selling on ${dayStatus?.tradingDate ?? "today"}.`,
        primary: { label: "Close session (X-Report)", onClick: () => pos.showXReport() },
        secondary: { label: "Dashboard", onClick: () => go("dashboard") },
      }
    : session.closingStartedAt ? {
        title: "Closing in progress",
        text: `${session.sessionNumber} is being closed${session.closingStartedBy ? ` (started by ${session.closingStartedBy})` : ""}. Selling has stopped — count the drawer to finish, or ask a supervisor to cancel the close.`,
        primary: { label: "Continue closing (X-Report)", onClick: () => pos.showXReport() },
        secondary: { label: "Dashboard", onClick: () => go("dashboard") },
      }
    : session.status === "SUSPENDED" ? {
        title: "Session suspended",
        text: `${session.sessionNumber} is on hold${session.suspendedBy ? ` (by ${session.suspendedBy})` : ""}. Resume it to continue selling.`,
        primary: { label: "Resume session", onClick: resumeSession },
        secondary: { label: "Dashboard", onClick: () => go("dashboard") },
      }
    : dayStatus?.phase === "CLOSED" ? {
        title: "Business day closed",
        text: `Trading for ${dayStatus.tradingDate} has ended. Close this session and run the Day Close; sales resume when the next business day opens.`,
        primary: { label: "Close session (X-Report)", onClick: () => pos.showXReport() },
        secondary: { label: "Dashboard", onClick: () => go("dashboard") },
      }
    : null;
  const chip = dayChip(dayStatus, Boolean(session?.stale), session?.businessDate ?? null);

  const pills = [
    { id: "all", label: "All Items" },
    { id: "fav", label: "Favourites ❤️" },
    { id: "recent", label: "Recently Sold" },
    { id: "top", label: "Top Sold" },
  ];

  const creditParty = cart.member ? { code: String(cart.member.id), name: cart.member.name, roleLabel: "Member", accountLabel: "Accounts Receivable" } : undefined;
  const saleNo = (session?.transactionCount ?? 0) + salesDone + 1;
  const invoiceLabel = `SALE-${String(saleNo).padStart(4, "0")}`;
  const vatLabel = settings.taxInclusive ? "VAT (Incl.)" : "VAT";
  const itemQty = activeLines.reduce((a, l) => a + l.quantity, 0);

  // ── Shared pieces ───────────────────────────────────────────────────────
  const promoRow = cart.promo && (
    <div className={`${s.totalsRow} ${totals.promoError ? "" : s.bbGreen}`} style={totals.promoError ? { color: "#B45309" } : undefined}>
      <span>
        <Ticket size={11} style={{ display: "inline", verticalAlign: -1 }} /> {cart.promo.name}{cart.promo.code ? ` (${cart.promo.code})` : ""}
        {" "}<button type="button" className={s.removeBtn} style={{ height: 14 }} onClick={() => setCart((c) => ({ ...c, promo: null }))} title="Remove promotion"><X size={11} /></button>
        {totals.promoError && <span style={{ display: "block", fontSize: 10 }}>{totals.promoError}</span>}
      </span>
      <span>−<Money value={totals.promoDiscount} /></span>
    </div>
  );

  const feedbackBar = feedback && (
    <div className={`${s.bbFeedback} ${feedback.type === "success" ? s.bbFbOk : feedback.type === "customer" ? s.bbFbCust : s.bbFbErr}`}>
      {feedback.type === "success" ? <CheckCircle size={14} /> : feedback.type === "customer" ? <User size={14} /> : <XCircle size={14} />}
      {feedback.message}
    </div>
  );

  const customerBar = (
    <div className={s.bbCustBar}>
      <button type="button" className={s.bbCustBtn} onClick={() => setCustOpen((o) => !o)}>
        <span className={s.bbCustAvatar}>{cart.member ? cart.member.name.charAt(0).toUpperCase() : <User size={14} />}</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className={s.bbCustName}>{cart.member?.name ?? "Walk-in Customer"}</span>
          <span className={s.bbCustSub}>
            {cart.member ? [cart.member.memberCode, cart.member.phone].filter(Boolean).join(" · ") || "Member" : settings.requireCustomer ? "Select a member (required)" : "Walk-in"}
          </span>
        </span>
        <ChevronDown size={16} style={{ opacity: 0.7, flexShrink: 0, transform: custOpen ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {custOpen && (
        <CustomerDropdown selectedId={cart.member?.id ?? null} onClose={() => setCustOpen(false)}
          onPick={(m) => { setCart((c) => ({ ...c, member: m })); setCustOpen(false); }} />
      )}
    </div>
  );

  const cartRows = (variant: "classic" | "focus") => (
    <div className={s.bbRows}>
      {cart.lines.length === 0 && (
        <div className={s.bbEmpty}>
          <ShoppingCart size={variant === "focus" ? 56 : 40} />
          {variant === "focus" ? <div>Scan a barcode to begin</div> : <><div>Cart is empty</div><small>Tap items to add</small></>}
        </div>
      )}
      {cart.lines.map((l, idx) => {
        const p = pricedByKey.get(l.key);
        const amount = p ? (settings.taxInclusive ? p.total : p.taxable) : r2(l.unitPrice * l.quantity);
        const selected = focusKey === l.key && !l.voided;
        return (
          <div key={l.key}
            className={`${s.bbRow} ${variant === "focus" ? s.bbRowFocus : ""} ${l.voided ? s.bbRowVoid : selected ? s.bbRowSel : idx % 2 ? s.bbRowAlt : ""}`}
            onClick={() => {
              if (l.voided) return;
              // While a keypad mode is open (and always in Cart Focus) a tap picks the row; otherwise it toggles.
              setFocusKey(variant === "focus" || mode !== "none" ? l.key : selected ? null : l.key);
            }}
            onDoubleClick={() => { if (!l.voided) setEditLine(l); }}>
            <div style={{ minWidth: 0 }}>
              <div className={s.bbRowName}>{l.name}{l.voided && <span className={s.bbVoidTag}>[VOID]</span>}</div>
              {!l.voided && <div className={variant === "focus" ? s.bbRowCodeAccent : s.bbRowCode}>{l.barcode || l.sku || `#${l.productId}`}</div>}
              {!l.voided && p && p.discountAmount > 0 && (
                <div className={s.bbRowDisc}>−{l.discountType === "PERCENT" ? `${p.discountPercent.toFixed(p.discountPercent % 1 ? 1 : 0)}%` : <Money value={p.discountAmount} />} disc</div>
              )}
              {!l.voided && l.priceOverridden && <div className={s.bbRowOver}>price changed</div>}
              {!l.voided && l.note && <div className={s.bbRowCode}>{l.note}</div>}
            </div>
            <div className={s.bbQty} onClick={(e) => e.stopPropagation()}>
              {!l.voided && <button type="button" onClick={() => changeQty(l, -1)} aria-label="Decrease"><Minus size={11} /></button>}
              <span>{l.voided ? `- ${l.quantity}` : l.quantity}</span>
              {!l.voided && <button type="button" onClick={() => changeQty(l, 1)} aria-label="Increase"><Plus size={11} /></button>}
            </div>
            <span className={s.bbRate}>{l.voided ? "- " : ""}{l.unitPrice.toFixed(2)}</span>
            <span className={`${s.bbAmt} ${variant === "focus" && !l.voided ? s.bbAmtAccent : ""}`}>{l.voided ? "- " : ""}<Money value={amount} /></span>
            <button type="button" className={`${s.bbVoid} ${variant === "focus" || l.voided ? s.bbVoidShown : ""}`} onClick={(e) => { e.stopPropagation(); voidLine(l); }}
              title={l.voided ? "Restore line" : "Void line"}><XCircle size={14} /></button>
          </div>
        );
      })}
    </div>
  );

  const actionGrid = (big: boolean) => (
    <div className={`${s.bbActions} ${big ? s.bbActionsBig : ""}`}>
      {visibleActions.map((a) => (
        <button key={a.id} type="button" className={`${s.bbAction} ${a.tone} ${a.active ? s.bbActionOn : ""}`} disabled={a.disabled} onClick={a.onClick}>
          {a.icon}
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );

  const historyPanel = (
    <div className={s.bbRightScroll} style={{ padding: 10 }}>
      {!cart.member ? (
        <div className={s.bbEmpty} style={{ minHeight: 140 }}><User size={30} /><small>{focusLayout ? "Select a customer to view history" : "Select customer"}</small></div>
      ) : (
        <div className={s.stack} style={{ gap: 7 }}>
          <div className={s.bbHistHead}>
            <span className={s.bbCustDot}>{cart.member.name.charAt(0).toUpperCase()}</span>
            <div style={{ minWidth: 0 }}><div className={s.bbRowName}>{cart.member.name}</div><div className={s.bbRowCode}>{cart.member.memberCode || "Member"}</div></div>
          </div>
          {historyLoading && <div className={s.bbHistHint}><RefreshCw size={12} className={s.spin} />Loading…</div>}
          {!historyLoading && history.length === 0 && <div className={s.bbEmpty} style={{ minHeight: 80 }}><Receipt size={20} /><small>No previous purchases</small></div>}
          {!historyLoading && history.map((h) => (
            <button key={h.id} type="button" className={s.bbHistRow} onClick={() => pickForReprint(h)}>
              <span style={{ minWidth: 0 }}>
                <span className={s.bbRowName}>{h.transactionNumber}</span>
                <span className={s.bbRowCode}>{new Date(h.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {h.items.length} items</span>
                {focusLayout && <span className={s.bbHistMode}>{h.paymentSummary}</span>}
              </span>
              <span className={s.bbHistRight}>
                <span className={s.bbHistAmt}><Money value={h.totalAmount} /></span>
                <span className={s.bbHistEye}><Eye size={13} /></span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const checkoutButton = (
    <button type="button" className={s.bbCheckout} disabled={!hasItems || !session} onClick={startPayment}>
      <span className={s.bbCheckoutTop}><CreditCard size={22} /> CHECKOUT</span>
      {hasItems && <span className={s.bbCheckoutAmt}><Money value={totals.total} /></span>}
    </button>
  );

  const rightTabs = (labels: [string, string]) => (
    <div className={`${s.bbTabs} ${focusLayout ? s.bbTabsFocus : ""}`}>
      <button type="button" className={rightTab === "actions" ? s.bbTabOn : ""} onClick={() => setRightTab("actions")}>{labels[0]}</button>
      <button type="button" className={rightTab === "history" ? s.bbTabOn : ""} onClick={() => setRightTab("history")}>{labels[1]}</button>
    </div>
  );

  const pressNumpad = (k: string) => setNumpadValue((v) => (k === "back" ? v.slice(0, -1) : k === "." && v.includes(".") ? v : (v + k).slice(0, 10)));

  // Classic inline numpad (right column).
  const inlineNumpad = mode !== "none" && (
    <div className={s.bbNumpad}>
      <div className={s.rowBetween} style={{ marginBottom: 8 }}>
        <span className={`${s.bbNumpadTitle} ${mode === "qty" ? s.cBlue : mode === "discount" ? s.cTeal : s.cPurple}`}>
          {mode === "qty" ? "Set Quantity" : mode === "discount" ? "Set Discount" : "Set Price"}
        </span>
        <button type="button" className={s.bbCancel} onClick={cancelMode}>✕ Cancel</button>
      </div>
      {focusPriced ? (
        <div className={s.bbNumpadCtx}>
          <div className={s.bbRowName}>{focusPriced.name}</div>
          <div className={s.bbRowCode}>
            {mode === "qty" && `Current qty: ${focusPriced.quantity}`}
            {mode === "discount" && `Current disc: ${focusPriced.discountType === "PERCENT" ? `${focusPriced.discountValue}%` : focusPriced.discountValue.toFixed(2)}`}
            {mode === "price" && `Current price: ${focusPriced.unitPrice.toFixed(2)}`}
          </div>
        </div>
      ) : (
        <div className={s.bbNumpadWarn}>← Select a cart row first</div>
      )}
      {mode === "discount" && (
        <div className={s.bbToggle}>
          <button type="button" className={discType === "PERCENT" ? s.bbToggleOn : ""} onClick={() => setDiscType("PERCENT")}>% Percent</button>
          <button type="button" className={discType === "AMOUNT" ? s.bbToggleOn : ""} onClick={() => setDiscType("AMOUNT")}>{pos.currencyCode} Amt</button>
        </div>
      )}
      <input className={s.bbNumpadInput} value={numpadValue} placeholder="0" autoFocus inputMode="decimal"
        onChange={(e) => setNumpadValue(e.target.value.replace(/[^0-9.]/g, ""))}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (numpadValue) applyMode(numpadValue); } else if (e.key === "Escape") cancelMode(); }} />
      <div className={s.bbKeys}>
        {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"].map((k) => (
          <button key={k} type="button" className={k === "back" ? s.bbKeyBack : ""} onClick={() => pressNumpad(k)}>{k === "back" ? "⌫" : k}</button>
        ))}
      </div>
      <div className={s.bbKeyRow}>
        <button type="button" className={s.bbKeyClear} onClick={() => setNumpadValue("")}>Clear</button>
        <button type="button" className={s.bbKeyEnter} disabled={!focusLine || !numpadValue} onClick={() => applyMode(numpadValue)}>Enter ↵</button>
      </div>
      {mode !== "qty" && !settings.currentUserIsSupervisor && (mode === "discount" || settings.requireSupervisorForPriceOverride) && (
        <div className={s.bbNumpadHint}>
          {mode === "discount" ? `Above ${focusLine ? discountLimit(focusLine, settings.maxCashierDiscountPercent) : settings.maxCashierDiscountPercent}% needs a supervisor at checkout.` : "Price changes need a supervisor at checkout."}
        </div>
      )}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={s.terminal}>
      {/* Top bar */}
      <div className={s.bbTopBar}>
        <div className={s.bbTopLeft}>
          <button type="button" className={s.bbBack} onClick={() => go("dashboard")}>← Dashboard</button>
          <div className={s.bbSession}>
            <div className={s.bbSessionNo}>Session: {session?.sessionNumber ?? "—"}</div>
            <div className={s.bbSessionTime}>{now.toLocaleDateString("en-GB")} • {now.toLocaleTimeString("en-GB")}</div>
          </div>
          <span className={`${s.bbDayChip} ${chip.tone === "bad" ? s.bbDayChipBad : chip.tone === "warn" ? s.bbDayChipWarn : ""}`}>
            <span className={s.bbDayDot} />
            {chip.text}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {compactLayout && <button type="button" className={s.trFunctionsBtn} onClick={() => setShowFunctions(true)}><LayoutGrid size={15} />Functions</button>}
          <button type="button" className={s.bbConfigure} onClick={() => setShowConfig(true)}><Settings size={15} />Configure</button>
        </div>
      </div>

      {focusLayout ? (
        /* ══════════ CART FOCUS: Cart | Last item + keypad + total | Functions ══════════ */
        <div className={s.bbBody}>
          <div className={`${s.bbCart} ${s.bbCartFocus}`}>
            {customerBar}
            <div className={`${s.bbTableHead} ${s.bbTableHeadFocus}`}>
              <span>Item</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Rate</span><span style={{ textAlign: "right" }}>Amt</span><span />
            </div>
            {cartRows("focus")}
            <div className={s.bbFocusFoot}>
              <div className={s.bbFocusStats}>
                <div><div className={s.bbFocusStatLabel}>Items</div><div className={s.bbFocusStatValue}>{itemQty}</div></div>
                <span className={s.bbFocusSep} />
                <div><div className={s.bbFocusStatLabel}>Invoice #</div><div className={s.bbFocusStatValue}>{saleNo}</div></div>
              </div>
              <div className={s.bbFocusLinks}>
                <button type="button" disabled={!hasItems} onClick={hold}><Pause size={14} />Hold</button>
                <span className={s.bbFocusSep} style={{ height: 16 }} />
                <button type="button" disabled={!cart.lines.length} onClick={() => clearCart()}><X size={14} />Clear</button>
              </div>
            </div>
          </div>

          <div className={s.bbFocusMid}>
            {(() => {
              const line = lastAdded ? cart.lines.find((l) => l.key === lastAdded.key && !l.voided) : null;
              const p = line ? pricedByKey.get(line.key) : null;
              if (!line || !p) {
                return (
                  <div className={s.bbLastEmpty}>
                    <div className={s.bbLastEmptyIcon}><Clock size={24} /></div>
                    <div className={s.bbLastKicker}>Last Scanned Item</div>
                    <small>Scan a barcode to see item details</small>
                  </div>
                );
              }
              return (
                <div className={s.bbLast}>
                  <div className={s.rowBetween} style={{ marginBottom: 12 }}>
                    <span className={s.bbLastKicker}>Last Scanned Item</span>
                    <span className={s.bbLastAdded}>{line.name} added</span>
                  </div>
                  <div className={s.bbLastMain}>
                    <div className={s.bbLastIcon}>{line.imageUrl && settings.showProductImages ? <img src={line.imageUrl} alt="" /> : <Package size={24} />}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className={s.bbLastName}>{line.name}</div>
                      <div className={s.bbLastCode}>{line.barcode || line.sku || `#${line.productId}`}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className={s.bbLastLabel}>Line Total</div>
                      <div className={s.bbLastTotal}><Money value={p.total} /></div>
                    </div>
                  </div>
                  <div className={s.bbLastGrid}>
                    <div><span>Qty</span><b>x{p.quantity}</b></div>
                    <div><span>Unit Price</span><b><Money value={p.unitPrice} /></b></div>
                    <div><span>Discount</span><b>{p.discountPercent.toFixed(p.discountPercent % 1 ? 1 : 0)}%</b></div>
                    <div><span>VAT ({p.taxRate}%)</span><b><Money value={p.tax} /></b></div>
                    <div><span>Net Price</span><b><Money value={p.taxable} /></b></div>
                    <div><span>Stock</span><b>{line.stock != null ? `${line.stock} units` : "--"}</b></div>
                  </div>
                </div>
              );
            })()}

            <div className={s.bbFocusPad}>
              {mode !== "none" && (
                <div className={s.bbModeBox}>
                  <div className={s.bbModeTitle}>{mode === "qty" ? "Qty Mode" : mode === "price" ? "Price Mode" : "Discount Mode"}</div>
                  <div className={`${s.small} ${s.muted}`}>{focusLine ? `Item: ${focusLine.name}` : "Click a cart item to select it"}</div>
                  {mode === "discount" && focusLine && (
                    <div className={s.bbToggle} style={{ marginTop: 8, marginBottom: 0 }}>
                      <button type="button" className={discType === "PERCENT" ? s.bbToggleOn : ""} onClick={() => setDiscType("PERCENT")}>% Percent</button>
                      <button type="button" className={discType === "AMOUNT" ? s.bbToggleOn : ""} onClick={() => setDiscType("AMOUNT")}>{pos.currencyCode} Amount</button>
                    </div>
                  )}
                  <button type="button" className={s.bbModeCancel} onClick={cancelMode}>Cancel</button>
                </div>
              )}
              <div className={s.bbScannerReady}><span />Scanner Ready</div>
              <div className={s.bbEntryBox}>
                <input ref={entryRef} value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="Scan barcode or enter 3*CODE.."
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { if (mode !== "none") cancelMode(); else setEntry(""); return; }
                    if (e.key === "Enter") { e.preventDefault(); submitFocusEntry(); }
                  }} />
                <button type="button" onClick={() => submitFocusEntry()}>ADD</button>
              </div>
              {feedbackBar}
              <div className={s.bbBigKeys}>
                {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((k) => (
                  <button key={k} type="button" onClick={() => setEntry((v) => v + k)}>{k}</button>
                ))}
                <button type="button" className={s.bbBigKeyStar} onClick={() => setEntry((v) => v + (mode === "none" ? "*" : "."))}>{mode === "none" ? "×" : "."}</button>
                <button type="button" onClick={() => setEntry((v) => v + "0")}>0</button>
                <button type="button" className={s.bbBigKeyBack} onClick={() => setEntry((v) => v.slice(0, -1))}>⌫</button>
              </div>
              <div className={s.bbBigKeyRow}>
                <button type="button" className={s.bbBigClear} onClick={() => { setEntry(""); if (mode !== "none") cancelMode(); }}>Clear</button>
                <button type="button" className={s.bbBigEnter} onClick={() => submitFocusEntry()}>Enter ↵</button>
              </div>
            </div>

            <div className={s.bbFocusTotals}>
              <div className={s.totalsRow}><span>Subtotal</span><Money value={totals.subtotal} /></div>
              {totals.billDiscount > 0 && <div className={`${s.totalsRow} ${s.bbGreen}`}><span>Bill Discount</span><span>−<Money value={totals.billDiscount} /></span></div>}
              {promoRow}
              <div className={s.totalsRow}><span>{vatLabel}</span><Money value={totals.tax} /></div>
              {voidedLines.length > 0 && <div className={`${s.totalsRow} ${s.bbRed}`}><span>Voided Items ({voidedLines.length})</span><span>− <Money value={voidTotals.total} /></span></div>}
            </div>
            <div className={s.bbFocusTotal}>
              <div>
                <div className={s.bbTotalLabel}>Invoice Total</div>
                {totals.totalDiscount > 0 && <div className={s.bbFocusDisc}>Disc: −<Money value={totals.totalDiscount} /></div>}
              </div>
              <div className={s.bbFocusTotalValue}><Money value={totals.total} /></div>
            </div>
          </div>

          <div className={`${s.bbRight} ${s.bbRightFocus}`}>
            {rightTabs(["Functions", "History"])}
            {rightTab === "actions" ? <div className={s.bbRightScroll}>{actionGrid(true)}</div> : historyPanel}
            {checkoutButton}
          </div>
        </div>
      ) : compactLayout ? (
        /* ══════════ COMPACT (BillBull Trade POS): search | customer + quick pick | invoice ══════════ */
        <div className={s.trBody}>
          <div className={s.trTier}>
            <div className={s.trTierLeft}>
              <span className={s.trTierIcon}><ShoppingCart size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <div className={s.trTierTitle}>Compact — Trade POS</div>
                <div className={s.trTierSub}>{pos.terminal?.counterName ? `${pos.terminal.counterName} • ` : ""}{pos.terminalName || "Terminal"}</div>
              </div>
            </div>
            <div className={s.trTierTime}>
              <span>{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              <small>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</small>
            </div>
          </div>

          <div className={s.trMain}>
            <div className={s.trSearchWrap}>
              <div className={s.trSearch}>
                <Search size={18} />
                <input ref={searchRef} value={query} placeholder="Scan barcode or type item code / name…"
                  onChange={(e) => { setQuery(e.target.value); setPickIndex(-1); }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const n = gridProducts.length;
                      if (n) setPickIndex((i) => Math.max(-1, Math.min(n - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const picked = pickIndex >= 0 ? gridProducts[pickIndex] : null;
                      if (picked) { addProduct(picked); flash("success", `${picked.name} added`); setPickIndex(-1); }
                      else handleEntry(query, true);
                    } else if (e.key === "Escape") { setQuery(""); setPickIndex(-1); }
                  }} />
                {query && <button type="button" className={s.trSearchClear} onClick={() => { setQuery(""); setPickIndex(-1); searchRef.current?.focus(); }} title="Clear search"><X size={18} /></button>}
              </div>
              {feedbackBar}
            </div>

            <div className={s.trCols}>
              <section className={s.trLeft} aria-label="Customer and quick pick">
                <div className={s.trCustWrap}>
                  <button type="button" className={s.trCustCard} onClick={() => setCustOpen((o) => !o)}>
                    <span className={s.trCustAvatar}>{cart.member ? cart.member.name.charAt(0).toUpperCase() : <User size={18} />}</span>
                    <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                      <span className={s.trCustName}>{cart.member?.name ?? "Walk-in Customer"}</span>
                      <span className={s.trCustSub}>
                        {cart.member ? [cart.member.memberCode, cart.member.phone].filter(Boolean).join(" • ") || "Member" : settings.requireCustomer ? "Select a member (required)" : "Walk-in — tap to search customers"}
                      </span>
                    </span>
                    <ChevronDown size={18} style={{ flexShrink: 0, transform: custOpen ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
                  </button>
                  {custOpen && (
                    <CustomerDropdown selectedId={cart.member?.id ?? null} onClose={() => setCustOpen(false)}
                      onPick={(m) => { setCart((c) => ({ ...c, member: m })); setCustOpen(false); }} />
                  )}
                </div>
                {cart.member && (
                  <div className={s.trFin}>
                    <div className={s.trFinDue}>
                      <span className={s.trFinLabel}>Balance Due</span>
                      <span className={s.trFinDueValue}><Money value={cart.member.outstandingBalance} /></span>
                    </div>
                    <div className={s.trFinLast}>
                      <span className={s.trFinLabel}>Last Purchase</span>
                      <span className={s.trFinLastValue}><Clock size={13} />{lastPurchase ? new Date(lastPurchase).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "No purchases yet"}</span>
                    </div>
                  </div>
                )}
                <div className={s.trPickHead}>
                  <span>Quick Pick — Frequent Items</span>
                  <small>↑↓ to browse · Enter to add</small>
                </div>
                <div className={s.trPickList} role="listbox" aria-label="Quick pick products">
                  {productsLoading && products.length === 0 && Array.from({ length: 8 }).map((_, i) => <div key={i} className={s.trPickSkel} />)}
                  {gridProducts.map((p, i) => {
                    const img = settings.showProductImages && p.imageUrls?.[0] ? String(resolveBackendImageUrl(p.imageUrls[0])) : null;
                    return (
                      <div key={p.id} role="option" aria-selected={i === pickIndex} className={`${s.trPick} ${i === pickIndex ? s.trPickOn : ""}`}
                        ref={(el) => { if (el && i === pickIndex) el.scrollIntoView({ block: "nearest" }); }}
                        onClick={() => { setPickIndex(i); addProduct(p); }}>
                        <span className={s.trPickImg}>{img ? <img src={img} alt={p.name} loading="lazy" /> : <Package size={20} />}</span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span className={s.trPickName}>{p.name}</span>
                          <span className={s.trPickCode}>{p.barcode || p.sku || p.id} • {p.defaultUnit || "UNIT"}</span>
                        </span>
                        <span className={s.trPickPrice}><Money value={p.sellingPrice} /></span>
                      </div>
                    );
                  })}
                  {!productsLoading && gridProducts.length === 0 && (
                    <div className={s.bbEmpty} style={{ minHeight: 180, height: "auto" }}><Package size={36} /><small>No products found — try another search.</small></div>
                  )}
                </div>
              </section>

              <section className={s.trRight} aria-label="Invoice">
                <div className={s.trInvHead}>
                  <span className={s.trInvTitle}>
                    <ShoppingCart size={18} /> Invoice Items
                    {activeLines.length > 0 && <span className={s.trInvCount}>{activeLines.length}</span>}
                  </span>
                  <span className={s.trInvTools}>
                    <span className={s.trInvNo}>{invoiceLabel}</span>
                    <button type="button" className={s.trTool} disabled={!hasItems || !session} onClick={hold} title="Hold invoice"><Pause size={16} /></button>
                    <button type="button" className={`${s.trTool} ${s.trToolGreen}`} disabled={!session} onClick={() => setShowCash(true)} title="Cash drop / out"><DollarSign size={16} /></button>
                    <span className={s.trToolSep} />
                    <button type="button" className={`${s.trTool} ${s.trToolRed}`} disabled={!cart.lines.length} onClick={() => clearCart()} title="Clear invoice"><X size={16} /></button>
                  </span>
                </div>
                <div className={s.trInvList}>
                  {cart.lines.length === 0 && (
                    <div className={s.bbEmpty}><ShoppingCart size={40} /><div>Cart is empty</div><small>Scan a barcode or select a product from the quick pick.</small></div>
                  )}
                  {cart.lines.map((l) => {
                    const p = pricedByKey.get(l.key);
                    const amount = p ? (settings.taxInclusive ? p.total : p.taxable) : r2(l.unitPrice * l.quantity);
                    const selected = focusKey === l.key && !l.voided;
                    return (
                      <div key={l.key} className={`${s.trRow} ${l.voided ? s.trRowVoid : selected ? s.trRowSel : ""}`}
                        onClick={() => { if (!l.voided) setFocusKey(selected ? null : l.key); }}
                        onDoubleClick={() => { if (!l.voided) setEditLine(l); }}>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span className={s.trRowName}>{l.voided && <XCircle size={14} />}{l.name}</span>
                          <span className={s.trRowCode}>{l.barcode || l.sku || `#${l.productId}`}{p && p.discountAmount > 0 && !l.voided ? ` • −${p.discountAmount.toFixed(2)} disc` : ""}{l.priceOverridden && !l.voided ? " • price changed" : ""}</span>
                        </span>
                        <span className={s.trQty} onClick={(e) => e.stopPropagation()}>
                          <button type="button" disabled={l.voided} onClick={() => changeQty(l, -1)} aria-label="Decrease quantity"><Minus size={12} /></button>
                          <span>{l.quantity}</span>
                          <button type="button" disabled={l.voided} onClick={() => changeQty(l, 1)} aria-label="Increase quantity"><Plus size={12} /></button>
                        </span>
                        <span className={s.trRowRight}>
                          <span className={s.trRowHint}>double-click to edit</span>
                          <span className={s.trRowAmtLine}>
                            <span className={`${s.trRowAmt} ${l.voided ? s.trStrike : ""}`}><Money value={amount} /></span>
                            <button type="button" className={s.trRowDel} onClick={(e) => { e.stopPropagation(); voidLine(l); }} title={l.voided ? "Restore line" : "Remove item"}>
                              {l.voided ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                            </button>
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className={s.trFoot}>
                  <div className={s.trFootMeta}><span>{itemQty} units total</span><span>{cart.member?.name ?? "Walk-in Customer"}</span></div>
                  <div className={s.trFootSums}>
                    <div><span>Subtotal</span><Money value={totals.subtotal} /></div>
                    {totals.lineDiscount + totals.billDiscount > 0 && <div className={s.bbGreen}><span>Discount</span><span>−<Money value={totals.lineDiscount + totals.billDiscount} /></span></div>}
                    {promoRow}
                    <div><span>{vatLabel}</span><Money value={totals.tax} /></div>
                  </div>
                  <div className={s.trFootTotal}>
                    <div>
                      <div className={s.trGrandLabel}>Grand Total</div>
                      <div className={s.trGrand}><Money value={totals.total} /></div>
                    </div>
                    <button type="button" className={s.trCheckout} disabled={!hasItems || !session} onClick={startPayment}>Checkout <ChevronRight size={24} /></button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {showFunctions && (
            <div className={s.trFnOverlay} role="dialog" aria-modal="true" aria-label="POS functions"
              onKeyDown={(e) => { if (e.key === "Escape") setShowFunctions(false); }}>
              <button type="button" className={s.trFnScrim} aria-label="Close functions" onClick={() => setShowFunctions(false)} />
              <aside className={s.trFnPanel}>
                <div className={s.trFnHead}>
                  <div><div className={s.trFnKicker}>Compact POS</div><div className={s.trFnTitle}>Functions</div></div>
                  <button type="button" className={s.trTool} autoFocus onClick={() => setShowFunctions(false)} aria-label="Close"><X size={18} /></button>
                </div>
                <p className={s.trFnHint}>Tap a function to open its workflow.</p>
                <div className={s.trFnBody}>
                  {functionGroups.map((g) => (
                    <section key={g.name}>
                      <h3 className={s.trFnGroup}>{g.name}</h3>
                      <div className={s.trFnGrid}>
                        {g.buttons.map((a) => (
                          <button key={a.id} type="button" className={`${s.bbAction} ${a.tone}`} disabled={a.disabled}
                            onClick={() => { setShowFunctions(false); a.onClick(); }}>
                            {a.icon}<span>{a.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </aside>
            </div>
          )}
        </div>
      ) : (
        /* ══════════ CLASSIC: Cart | Categories + Items | Functions ══════════ */
        <div className={s.bbBody}>
          <div className={s.bbCart}>
            {customerBar}
            <div className={s.bbCartHead}>
              <span className={s.bbCartTitle}><ShoppingCart size={14} /> Cart {cart.lines.length > 0 && <span className={s.bbCount}>{cart.lines.length}</span>}</span>
              <span className={s.bbInv}>{invoiceLabel}</span>
              <button type="button" className={s.removeBtn} disabled={!cart.lines.length} onClick={() => clearCart()} title="Clear sale"><X size={15} /></button>
            </div>
            <div className={s.bbTableHead}>
              <span>Item</span><span style={{ textAlign: "center" }}>Qty</span><span style={{ textAlign: "right" }}>Rate</span><span style={{ textAlign: "right" }}>Amt</span><span />
            </div>
            {cartRows("classic")}
            <div className={s.bbTotals}>
              <div className={s.totalsRow}><span>Subtotal</span><Money value={totals.subtotal} /></div>
              {totals.lineDiscount > 0 && <div className={`${s.totalsRow} ${s.bbGreen}`}><span>Discount</span><span>−<Money value={totals.lineDiscount} /></span></div>}
              {totals.billDiscount > 0 && (
                <div className={`${s.totalsRow} ${s.bbGreen}`}>
                  <span>Bill Discount{cart.bill?.type === "PERCENT" ? ` (${cart.bill.value}%)` : ""} <button type="button" className={s.removeBtn} style={{ height: 14 }} onClick={() => setCart((c) => ({ ...c, bill: null }))} title="Remove bill discount"><X size={11} /></button></span>
                  <span>−<Money value={totals.billDiscount} /></span>
                </div>
              )}
              {promoRow}
              <div className={s.totalsRow}><span>{vatLabel}</span><Money value={totals.tax} /></div>
              {voidedLines.length > 0 && <div className={`${s.totalsRow} ${s.bbRed}`}><span>Voided Items ({voidedLines.length})</span><span>− <Money value={voidTotals.total} /></span></div>}
              {cart.note && <div className={s.totalsRow}><span><StickyNote size={11} style={{ display: "inline", verticalAlign: -1 }} /> {cart.note.slice(0, 40)}</span></div>}
            </div>
            <div className={s.bbTotalBar}>
              <div>
                <div className={s.bbTotalLabel}>Total</div>
                <div className={s.bbTotalValue}><Money value={totals.total} /></div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className={s.bbBarBtn} disabled={!hasItems || !session} onClick={hold}><Pause size={12} />Hold</button>
                <button type="button" className={s.bbBarBtn} disabled={!cart.lines.length} onClick={() => clearCart()}><X size={12} />Clear</button>
              </div>
            </div>
          </div>

          <div className={s.bbMiddle}>
            {showCats && (
              <div className={s.bbCats}>
                <div className={s.bbCatsTitle}>Categories</div>
                <div className={s.bbCatGrid}>
                  <button type="button" className={`${s.bbCat} ${category === "all" ? s.bbCatOn : ""}`} onClick={() => setCategory("all")}>
                    <span className={s.bbCatIcon}><Package size={16} /></span>
                    <span className={s.bbCatName}>All Items</span>
                    <span className={s.bbCatCount}>{products.length} items</span>
                  </button>
                  {categories.map(([name, count]) => (
                    <button key={name} type="button" className={`${s.bbCat} ${category === name ? s.bbCatOn : ""}`} onClick={() => setCategory(name)}>
                      <span className={s.bbCatIcon}>{categoryIcon(name)}</span>
                      <span className={s.bbCatName}>{name}</span>
                      <span className={s.bbCatCount}>{count} items</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showItems ? (
              <div className={s.bbItems}>
                <div className={s.bbSearchBar}>
                  <div className={s.bbSearchRow}>
                    <div className={s.bbSearch}>
                      <Search size={14} />
                      <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                        placeholder="Scan or search — item, barcode, SKU, member…"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleEntry(query, true); }
                          else if (e.key === "Escape") setQuery("");
                        }} />
                    </div>
                    <button type="button" className={s.bbAddBtn} onClick={() => handleEntry(query, true)}>Add</button>
                  </div>
                  {feedbackBar}
                  <div className={s.bbPills}>
                    {pills.map((p) => (
                      <button key={p.id} type="button" className={`${s.bbPill} ${category === p.id ? s.bbPillOn : ""}`} onClick={() => setCategory(p.id)}>{p.label}</button>
                    ))}
                    {!showCats && categories.map(([name]) => (
                      <button key={name} type="button" className={`${s.bbPill} ${category === name ? s.bbPillOn : ""}`} onClick={() => setCategory(name)}>{name}</button>
                    ))}
                  </div>
                </div>

                <div className={s.bbGridWrap}>
                  <div className={s.bbGrid}>
                    {gridProducts.map((p) => {
                      const stock = typeof p.totalStock === "number" ? p.totalStock : null;
                      const img = settings.showProductImages && p.imageUrls?.[0] ? String(resolveBackendImageUrl(p.imageUrls[0])) : null;
                      const fav = isFavorite(p.id);
                      return (
                        <div key={p.id} role="button" tabIndex={0} className={s.bbCard}
                          onClick={() => addProduct(p)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addProduct(p); } }}>
                          <div className={s.bbCardImg}>
                            {img ? <img src={img} alt={p.name} loading="lazy" /> : <Package size={28} />}
                            <button type="button" className={`${s.bbFav} ${fav ? s.favOn : ""}`} title={fav ? "Remove from favourites" : "Add to favourites"}
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}>
                              <Heart size={14} fill={fav ? "#ef4444" : "none"} stroke={fav ? "#ef4444" : "#9ca3af"} />
                            </button>
                            {settings.showStockOnCards && stock !== null && stock > 0 && stock <= 5 && <span className={s.bbLow}>LOW</span>}
                            {settings.showStockOnCards && stock !== null && stock <= 0 && <span className={s.bbOut}>OUT</span>}
                          </div>
                          <div className={s.bbCardBody}>
                            <div className={s.bbCardName}>{p.name}</div>
                            <div className={s.bbCardCode}>{p.barcode || p.sku || p.id}</div>
                            <div className={s.bbCardFoot}>
                              <span className={s.bbCardPrice}><Money value={p.sellingPrice} /></span>
                              {settings.showStockOnCards && stock !== null && (
                                <span className={`${s.bbStock} ${stock > 10 ? s.bbStockOk : stock > 0 ? s.bbStockLow : s.bbStockOut}`}>{stock}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {productsLoading && products.length === 0 && (
                    <div className={s.bbGrid}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`${s.bbCard} ${s.bbSkeleton}`}><div className={s.bbCardImg} /><div className={s.bbCardBody}><div className={s.bbSkelLine} /><div className={s.bbSkelLine} style={{ width: "66%" }} /></div></div>
                      ))}
                    </div>
                  )}
                  {!productsLoading && gridProducts.length === 0 && (
                    <div className={s.bbEmpty} style={{ minHeight: 200, height: "auto" }}>
                      {category === "fav" ? <Heart size={40} /> : category === "recent" ? <Clock size={40} /> : category === "top" ? <TrendingUp size={40} /> : <Package size={40} />}
                      <small>
                        {category === "fav" ? <>No favourite products yet.<br />Tap the heart icon to add products.</>
                          : category === "recent" ? "No recently sold products."
                          : category === "top" ? "No sales data available."
                          : "No items found"}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={s.bbItems}>
                <div className={s.bbSearchBar}>
                  <div className={s.bbSearchRow}>
                    <div className={s.bbSearch}>
                      <Search size={14} />
                      <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Scan or search — item, barcode, SKU, member…"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEntry(query, true); } }} />
                    </div>
                    <button type="button" className={s.bbAddBtn} onClick={() => handleEntry(query, true)}>Add</button>
                  </div>
                  {feedbackBar}
                </div>
                <div className={s.bbEmpty}><Package size={40} /><small>Items panel hidden — scan or search to add.</small></div>
              </div>
            )}
          </div>

          <div className={s.bbRight}>
            {rightTabs(["Actions", "History"])}
            {rightTab === "actions" ? (
              <div className={s.bbRightScroll}>
                {inlineNumpad}
                {actionGrid(false)}
              </div>
            ) : historyPanel}
            {checkoutButton}
          </div>
        </div>
      )}

      {/* Checkout (BillBull-style full screen: live receipt preview + payment allocation) */}
      <CheckoutScreen
        open={showPay}
        totals={totals}
        member={cart.member}
        bill={cart.bill}
        promo={cart.promo}
        note={cart.note}
        onNoteChange={(note) => setCart((c) => ({ ...c, note }))}
        manager={paymentManager}
        bankAccounts={bankAccounts}
        customers={creditCustomers}
        onSearchCustomers={searchCreditCustomers}
        offeredTypes={offeredTypes}
        walletBalance={walletBalance}
        creditParty={creditParty}
        approvalNotice={(discountOverLimit || (totals.hasPriceOverride && settings.requireSupervisorForPriceOverride)) && !settings.currentUserIsSupervisor
          ? `This sale has a ${totals.hasPriceOverride ? "price override" : "discount above the allowed limit"} — you'll be asked for the supervisor PIN.`
          : null}
        paying={paying}
        onCancel={() => { if (!paying) { setShowPay(false); paymentManager.clearLines(); } }}
        onSettle={completePayment}
        completedSale={completedSale}
        onNewSale={() => { setShowPay(false); setCompletedSale(null); paymentManager.clearLines(); }}
        onReprint={() => { setShowPay(false); setCompletedSale(null); setLookupMode("reprint"); }}
      />

      <LineEditDialog line={editLine} open={Boolean(editLine)} onOpenChange={(o) => !o && setEditLine(null)}
        onSave={(patch) => editLine && updateLine(editLine.key, patch)} onRemove={() => editLine && voidLine(editLine)} />
      <BillDiscountDialog open={showBill} onOpenChange={setShowBill} value={cart.bill}
        subtotal={r2(totals.subtotal - totals.lineDiscount)} onApply={(bill) => setCart((c) => ({ ...c, bill }))} />
      <NoteDialog open={showNote} onOpenChange={setShowNote} value={cart.note} onSave={(note) => setCart((c) => ({ ...c, note }))} />
      <HeldSalesDialog open={showHeld} onOpenChange={setShowHeld} onRecall={recall}
        blockedReason={hasItems ? "Hold or clear the current sale before recalling another." : null} />
      <PriceCheckDialog open={showPrice} onOpenChange={setShowPrice} products={products} onAdd={(p) => addProduct(p)} />
      <CashMovementDialog open={showCash} onOpenChange={setShowCash} />
      <QuickAddProductDialog open={showQuickAdd} onOpenChange={setShowQuickAdd} initialName={query || entry}
        onCreated={(p) => { addProduct(p); setQuery(""); flash("success", `${p.name} added`); reloadProducts(); }} />
      <CouponDialog open={showCoupon} onOpenChange={setShowCoupon} base={promoBase} current={cart.promo}
        onApply={(promo) => { setCart((c) => ({ ...c, promo })); toast.success(`${promo.name} applied`); }}
        onRemove={() => setCart((c) => ({ ...c, promo: null }))} />
      <PromotionsDialog open={showPromos} onOpenChange={setShowPromos} base={promoBase} current={cart.promo}
        onApply={(promo) => { setCart((c) => ({ ...c, promo })); toast.success(`${promo.name} applied`); }}
        onRemove={() => setCart((c) => ({ ...c, promo: null }))} />
      <CreditBalanceDialog open={showCredit} onOpenChange={setShowCredit} initialMember={cart.member}
        onUseMember={(m) => setCart((c) => ({ ...c, member: m }))} onOpenCustomers={() => go("customers")} />
      <TerminalConfigDialog open={showConfig} onOpenChange={setShowConfig} value={display} onApply={setDisplay}
        buttons={actions.map((a) => ({ id: a.id, label: a.label }))} />
      <SalesLookupDialog open={lookupMode !== null} onOpenChange={(o) => !o && setLookupMode(null)} mode={lookupMode ?? "reprint"}
        onPick={(sale) => (lookupMode === "return" ? pickForReturn(sale) : pickForReprint(sale))} />
      <ReturnDialog sale={returnSale} open={Boolean(returnSale)} onOpenChange={(o) => !o && setReturnSale(null)} bankAccounts={bankAccounts}
        onReturned={() => reloadProducts()} />
      <ReceiptDialog sale={receipt?.sale ?? null} open={Boolean(receipt)} reprint={receipt?.reprint} onOpenChange={(o) => !o && setReceipt(null)} />
      {block && !showPay && (
        <div className={s.bbBlock} role="alertdialog" aria-label={block.title}>
          <div className={s.bbBlockCard}>
            <div className={s.bbBlockTitle}>{block.title}</div>
            <div className={s.bbBlockText}>{block.text}</div>
            <div className={s.bbBlockActions}>
              {block.secondary && <Button variant="outline" onClick={block.secondary.onClick}>{block.secondary.label}</Button>}
              <Button className="bg-[#2B7A78] hover:bg-[#236862] text-white" disabled={sessionBusy} onClick={block.primary.onClick}>{block.primary.label}</Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent style={{ maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle>Close {session?.sessionNumber}?</DialogTitle>
            <DialogDescription>
              Selling stops now and the X-Report opens to count the drawer. Only a supervisor can put the session back into service.
              {hasItems ? " The current cart is kept on this terminal." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClose(false)}>Keep selling</Button>
            <Button className="bg-[#E63946] hover:bg-[#d32f3d] text-white" disabled={sessionBusy} onClick={beginClosing}>Start closing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {locked && <LockScreen onUnlock={() => { setLocked(false); lastActivity.current = Date.now(); }} />}
    </div>
  );
}
