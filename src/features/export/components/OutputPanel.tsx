import type { ImageFit } from '@/shared/domain';
import type {
    BasicOptimizationPreset,
    ImageOptimizationPreset,
} from '@/shared/domain/optimization-config';
import { OptimizationSection } from './output-panel/OptimizationSection';
import { PageFitSection } from './output-panel/PageFitSection';

import './output-panel/output-panel.css';

interface Props {
    imageFit: ImageFit;
    jpegQuality?: number;
    targetDpi?: number;
    optimizationPreset: ImageOptimizationPreset;
    onImageFitChange: (v: ImageFit) => void;
    onJpegQualityChange: (v: number | undefined) => void;
    onTargetDpiChange: (v: number | undefined) => void;
    onOptimizationPresetChange: (v: BasicOptimizationPreset) => void;
}

export function OutputPanel({
    imageFit,
    jpegQuality,
    targetDpi,
    optimizationPreset,
    onImageFitChange,
    onJpegQualityChange,
    onTargetDpiChange,
    onOptimizationPresetChange,
}: Props) {
    return (
        <div className="relative z-20 flex items-start gap-6 overflow-visible px-6 py-3">
            <OptimizationSection
                optimizationPreset={optimizationPreset}
                jpegQuality={jpegQuality}
                targetDpi={targetDpi}
                onJpegQualityChange={onJpegQualityChange}
                onTargetDpiChange={onTargetDpiChange}
                onOptimizationPresetChange={onOptimizationPresetChange}
            />

            <div className="my-0.5 w-px shrink-0 self-stretch bg-ui-border" />

            <PageFitSection imageFit={imageFit} onImageFitChange={onImageFitChange} />
        </div>
    );
}
