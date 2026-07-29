interface AppBottomSheetProps {
    visible: boolean;

    title: string;

    subtitle?: string;

    onClose: () => void;

    children: React.ReactNode;
}