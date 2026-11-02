import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import styles from './PhotoZoomViewer.module.css';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const STEP = 0.5;
const DOUBLE_CLICK_SCALE = 2.5;

interface PhotoZoomViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src?: string;
  name?: string;
}

interface View {
  scale: number;
  x: number;
  y: number;
}

const RESET: View = { scale: 1, x: 0, y: 0 };

/**
 * Enlarged member photo with zoom (buttons, mouse wheel, double-click, pinch)
 * and drag-to-pan while zoomed in.
 */
export function PhotoZoomViewer({ open, onOpenChange, src, name }: PhotoZoomViewerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>(RESET);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);

  useEffect(() => {
    setView(RESET);
  }, [src, open]);

  // Frame size in layout px, plus the ratio to screen px (body renders at zoom 0.9).
  const measure = useCallback(() => {
    const el = frameRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const size = el.offsetWidth || rect.width;
    return { rect, size, ratio: rect.width / size || 1 };
  }, []);

  const clamp = useCallback((next: View): View => {
    const m = measure();
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
    if (!m || scale === 1) return { scale, x: 0, y: 0 };
    const limit = ((scale - 1) * m.size) / 2;
    return {
      scale,
      x: Math.min(limit, Math.max(-limit, next.x)),
      y: Math.min(limit, Math.max(-limit, next.y)),
    };
  }, [measure]);

  // Zoom keeping the given screen point (or the centre) fixed under the cursor.
  const zoomTo = useCallback((scale: number, clientX?: number, clientY?: number) => {
    setView(prev => {
      const m = measure();
      const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      if (!m || clientX === undefined || clientY === undefined) {
        const k = target / prev.scale;
        return clamp({ scale: target, x: prev.x * k, y: prev.y * k });
      }
      const cx = (clientX - m.rect.left) / m.ratio - m.size / 2;
      const cy = (clientY - m.rect.top) / m.ratio - m.size / 2;
      const k = target / prev.scale;
      return clamp({ scale: target, x: cx - k * (cx - prev.x), y: cy - k * (cy - prev.y) });
    });
  }, [clamp, measure]);

  // Native listener so preventDefault works (React's wheel handler is passive).
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView(prev => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const m = measure();
        const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
        if (!m) return prev;
        const cx = (e.clientX - m.rect.left) / m.ratio - m.size / 2;
        const cy = (e.clientY - m.rect.top) / m.ratio - m.size / 2;
        const k = target / prev.scale;
        return clamp({ scale: target, x: cx - k * (cx - prev.x), y: cy - k * (cy - prev.y) });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, src, clamp, measure]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    const point = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, point);

    if (pointers.current.size === 2 && pinchDistance.current) {
      const [a, b] = Array.from(pointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = distance / pinchDistance.current;
      pinchDistance.current = distance;
      setView(prev => {
        const m = measure();
        if (!m) return prev;
        const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
        const cx = ((a.x + b.x) / 2 - m.rect.left) / m.ratio - m.size / 2;
        const cy = ((a.y + b.y) / 2 - m.rect.top) / m.ratio - m.size / 2;
        const k = target / prev.scale;
        return clamp({ scale: target, x: cx - k * (cx - prev.x), y: cy - k * (cy - prev.y) });
      });
      return;
    }

    const ratio = measure()?.ratio ?? 1;
    const dx = (point.x - last.x) / ratio;
    const dy = (point.y - last.y) / ratio;
    setView(prev => (prev.scale === 1 ? prev : clamp({ ...prev, x: prev.x + dx, y: prev.y + dy })));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (view.scale > 1) setView(RESET);
    else zoomTo(DOUBLE_CLICK_SCALE, e.clientX, e.clientY);
  };

  const frameClass = [
    styles.frame,
    view.scale > 1 ? styles.zoomed : '',
    dragging && view.scale > 1 ? styles.dragging : '',
  ].filter(Boolean).join(' ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle>Member Photo</DialogTitle>
          <DialogDescription>{name}</DialogDescription>
        </DialogHeader>
        {src && (
          <>
            <div
              ref={frameRef}
              className={frameClass}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onDoubleClick={onDoubleClick}
            >
              <img
                src={src}
                alt={name}
                draggable={false}
                className={styles.image}
                style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
              />
            </div>
            <div className={styles.toolbar}>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => zoomTo(view.scale - STEP)}
                disabled={view.scale <= MIN_SCALE}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className={styles.zoomLabel}>{Math.round(view.scale * 100)}%</span>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => zoomTo(view.scale + STEP)}
                disabled={view.scale >= MAX_SCALE}
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => setView(RESET)}
                disabled={view.scale === 1}
                title="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className={styles.hint}>Scroll or double-click to zoom · drag to move</div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
