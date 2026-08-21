import type { ReactNode } from 'react';

export type ConfirmationModalVariant = 'danger' | 'warning' | 'primary';

export interface ConfirmationModalProps {
  /**
   * Controls the visibility of the confirmation modal.
   */
  visible: boolean;

  /**
   * Main title heading of the confirmation modal.
   */
  title: string;

  /**
   * Explanatory message for the user.
   */
  message: string;

  /**
   * Label for the confirmation action button. Defaults to 'Confirm'.
   */
  confirmText?: string;

  /**
   * Label for the cancel button. Defaults to 'Cancel'.
   */
  cancelText?: string;

  /**
   * Visual variant affecting icon badge and confirm button colors.
   * Defaults to 'danger'.
   */
  variant?: ConfirmationModalVariant;

  /**
   * Feather icon name to display in the header badge. Defaults to 'log-out' for danger, 'help-circle' for primary.
   */
  icon?: string;

  /**
   * Indicates whether the confirm action is in progress.
   */
  loading?: boolean;

  /**
   * Called when the user clicks the confirm button.
   */
  onConfirm: () => void;

  /**
   * Called when the user cancels or closes the dialog.
   */
  onClose: () => void;

  /**
   * Optional custom content to render inside the dialog.
   */
  children?: ReactNode;
}
