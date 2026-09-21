export interface ReceiptBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  receiptId: number | null;
  accentColor?: string;
}
