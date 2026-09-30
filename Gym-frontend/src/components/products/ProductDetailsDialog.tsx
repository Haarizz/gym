import React, { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Edit, Package, QrCode, X } from 'lucide-react';
import { Button } from '../ui/button';
import { CurrencyGlyph } from '../../utils/currency';
import type { Product } from '../../utils/supabase/products-service';
import styles from './ProductDetailsDialog.module.css';

const money = (n: number) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function stockPill(status: string, isActive = true) {
  if (!isActive) return <span className={styles.pill}>Inactive</span>;
  if (status === 'OUT_OF_STOCK') return <span className={`${styles.pill} ${styles.pillRed}`}>Insufficient</span>;
  if (status === 'LOW_STOCK') return <span className={`${styles.pill} ${styles.pillAmber}`}>Low Stock</span>;
  return <span className={`${styles.pill} ${styles.pillGreen}`}>In Stock</span>;
}

/**
 * Product details box opened by clicking a row on the Products page.
 * Built on the Radix dialog primitives (focus trap, Esc / outside click to
 * close) with its own layout so it can go full-screen on phones.
 */
export function ProductDetailsDialog({ product, onClose, onEdit, onPrintBarcode }: {
  product: Product | null;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onPrintBarcode: (p: Product) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => setImageIndex(0), [product?.id]);

  const p = product;
  const images = p?.imageUrls?.filter(Boolean) ?? [];
  const margin = p && p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : null;
  const extraUnits = (p?.units ?? []).filter(u => u.unit && u.unit !== p?.defaultUnit);

  return (
    <DialogPrimitive.Root open={!!p} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content className={styles.content} aria-describedby={undefined}>
          {p && <>
            <div className={styles.head}>
              <div style={{ minWidth: 0 }}>
                <DialogPrimitive.Title className={styles.title}>{p.name}</DialogPrimitive.Title>
                <div className={styles.sub}>
                  <span className={`${styles.pill} ${styles.mono}`}>{p.sku}</span>
                  {p.categoryName && <span className={`${styles.pill} ${styles.pillPrimary}`}>{p.categoryName}</span>}
                  {stockPill(p.stockStatus, p.isActive)}
                  <span className={styles.pill}>{p.enabledForPos ? 'Visible in POS' : 'Hidden from POS'}</span>
                  {p.hasVariants && <span className={styles.pill}>Variants</span>}
                  {p.hasRecipe && <span className={styles.pill}>Recipe</span>}
                </div>
              </div>
              <DialogPrimitive.Close className={styles.close} aria-label="Close product details">
                <X size={20} />
              </DialogPrimitive.Close>
            </div>

            <div className={styles.body}>
              <div className={styles.gallery}>
                <div className={styles.mainImage}>
                  {images.length > 0 ? (
                    <img src={images[Math.min(imageIndex, images.length - 1)]} alt={p.name} />
                  ) : (
                    <div className={styles.noImage}><Package size={48} /><span>No photo</span></div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className={styles.thumbs}>
                    {images.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`${styles.thumb} ${i === imageIndex ? styles.thumbActive : ''}`}
                        onClick={() => setImageIndex(i)}
                        aria-label={`Show photo ${i + 1}`}
                      >
                        <img src={src} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.info}>
                <div className={styles.tiles}>
                  <div className={styles.tile}><span className={styles.tileLabel}>Selling price</span><span className={styles.tileValue}><CurrencyGlyph /> {money(p.sellingPrice)}</span></div>
                  <div className={styles.tile}><span className={styles.tileLabel}>Cost price</span><span className={styles.tileValue}><CurrencyGlyph /> {money(p.costPrice)}</span></div>
                  <div className={styles.tile}><span className={styles.tileLabel}>Margin</span><span className={styles.tileValue}>{margin == null ? '—' : `${margin.toFixed(1)}%`}</span></div>
                  <div className={styles.tile}><span className={styles.tileLabel}>In stock</span><span className={styles.tileValue}>{p.totalStock} {p.defaultUnit ?? ''}</span></div>
                </div>

                <section className={styles.section}>
                  <h3>Details</h3>
                  <div className={styles.facts}>
                    <div className={styles.fact}><span>Brand</span><span>{p.brand || '—'}</span></div>
                    <div className={styles.fact}><span>Barcode</span><span className={styles.mono}>{p.barcode || '—'}</span></div>
                    <div className={styles.fact}><span>Unit</span><span>{p.defaultUnit || '—'}</span></div>
                    <div className={styles.fact}><span>Tax rate</span><span>{p.taxRate != null ? `${p.taxRate}%` : '—'}</span></div>
                    <div className={styles.fact}><span>Supplier</span><span>{p.supplier || '—'}</span></div>
                    <div className={styles.fact}><span>Stock value</span><span><CurrencyGlyph /> {money(p.inventoryValue)}</span></div>
                  </div>
                </section>

                {p.description && (
                  <section className={styles.section}>
                    <h3>Description</h3>
                    <p className={styles.desc}>{p.description}</p>
                  </section>
                )}

                <section className={styles.section}>
                  <h3>Stock by warehouse</h3>
                  {p.stockByWarehouse?.length ? (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead><tr><th>Warehouse</th><th>In stock</th><th>Reorder at</th><th>Status</th></tr></thead>
                        <tbody>
                          {p.stockByWarehouse.map(s => (
                            <tr key={s.id}>
                              <td>{s.warehouseName}</td>
                              <td>{s.currentStock}</td>
                              <td>{s.reorderLevel}</td>
                              <td>{stockPill(s.stockStatus)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className={styles.desc} style={{ color: 'var(--muted-foreground)' }}>No stock recorded yet.</p>}
                </section>

                {extraUnits.length > 0 && (
                  <section className={styles.section}>
                    <h3>Other units</h3>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead><tr><th>Unit</th><th>Contains</th><th>Cost</th><th>Price</th></tr></thead>
                        <tbody>
                          {extraUnits.map(u => (
                            <tr key={u.id}>
                              <td>{u.unit}</td>
                              <td>{u.conversionFactor ?? 1} {p.defaultUnit ?? ''}</td>
                              <td>{u.costPrice != null ? money(u.costPrice) : '—'}</td>
                              <td>{u.sellingPrice != null ? money(u.sellingPrice) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            </div>

            <div className={styles.foot}>
              <Button variant="outline" onClick={() => onPrintBarcode(p)}><QrCode className="h-4 w-4" /> Print barcode</Button>
              <Button onClick={() => onEdit(p)}><Edit className="h-4 w-4" /> Edit product</Button>
            </div>
          </>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
