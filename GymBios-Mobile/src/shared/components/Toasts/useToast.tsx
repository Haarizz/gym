import { toast } from './toastStore';

/**
 * Optional — `toast` can be imported and called directly from anywhere,
 * including outside components. This hook exists purely for teams that
 * prefer a `useX()` call pattern inside components.
 */
export function useToast() {
  return toast;
}