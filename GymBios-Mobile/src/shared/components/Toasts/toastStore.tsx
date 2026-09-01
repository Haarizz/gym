export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  id?: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  /** ms before auto-dismiss. Pass 0 to make it sticky (no auto-dismiss). */
  duration?: number;
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
  createdAt: number;
}

type Listener = (toasts: ToastItem[]) => void;

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  info: 3000,
  warning: 4000,
  error: 4500,
};

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  listeners.forEach((l) => l(toasts));
}

function genId(): string {
  counter += 1;
  return `toast-${Date.now()}-${counter}`;
}

/** Show a toast. Returns its id, which you can pass back to `hide`. */
function show(options: ToastOptions): string {
  const id = options.id ?? genId();
  const variant = options.variant ?? 'info';
  const duration = options.duration ?? DEFAULT_DURATIONS[variant];

  const item: ToastItem = {
    id,
    title: options.title,
    message: options.message,
    variant,
    duration,
    action: options.action,
    createdAt: Date.now(),
  };

  // If something re-shows the same id (e.g. a repeated error), replace it
  // instead of stacking duplicates.
  toasts = [...toasts.filter((t) => t.id !== id), item];
  emit();
  return id;
}

function hide(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function hideAll() {
  toasts = [];
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

function getToasts() {
  return toasts;
}

/**
 * Import this anywhere — components, axios interceptors, redux thunks,
 * plain utils — and call it directly. No hook, no context, no ref needed.
 *
 *   import { toast } from './toast';
 *   toast.error('Could not save changes. Try again.');
 */
export const toast = {
  show,
  hide,
  hideAll,
  success: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    show({ ...options, message, variant: 'success' }),
  error: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    show({ ...options, message, variant: 'error' }),
  warning: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    show({ ...options, message, variant: 'warning' }),
  info: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    show({ ...options, message, variant: 'info' }),
};

export const toastStore = { subscribe, getToasts, show, hide, hideAll };