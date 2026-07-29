import type { ReactNode } from 'react';

export interface AppBottomSheetProps {
  /**
   * Controls the visibility of the bottom sheet.
   */
  visible: boolean;

  /**
   * Primary heading displayed in the sheet header.
   */
  title: string;

  /**
   * Optional secondary text displayed below the title.
   */
  subtitle?: string;

  /**
   * Called when the user dismisses the sheet.
   */
  onClose: () => void;

  /**
   * Content rendered inside the scrollable body.
   */
  children: ReactNode;
}