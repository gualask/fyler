import { IconX } from '@tabler/icons-react';

interface Props {
    onClose: () => void;
    title: string;
}

export function CloseButton({ onClose, title }: Props) {
    return (
        <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title={title}
        >
            <IconX className="h-5 w-5" />
        </button>
    );
}
