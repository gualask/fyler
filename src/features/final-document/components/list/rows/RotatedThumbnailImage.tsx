import { useEffect, useState } from 'react';

interface Props {
    src: string;
    alt: string;
    className?: string;
    imageRotation: number;
}

function buildRotatedThumbnailStyle(imageRotation: number, canAnimateRotation: boolean) {
    return {
        transform: `rotate(${imageRotation}deg)`,
        transition: canAnimateRotation ? 'transform 0.3s ease-in-out' : 'none',
    };
}

export function RotatedThumbnailImage({ src, alt, className, imageRotation }: Props) {
    const [canAnimateRotation, setCanAnimateRotation] = useState(false);

    useEffect(() => {
        setCanAnimateRotation(true);
    }, []);

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            style={buildRotatedThumbnailStyle(imageRotation, canAnimateRotation)}
        />
    );
}
