import { IconArrowsMinimize, IconChevronDown, IconPhoto } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { ImageFit, ImageOptimizationPreset } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
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
    onOptimizationPresetChange: (v: ImageOptimizationPreset) => void;
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
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const presetLabel =
        optimizationPreset === 'custom'
            ? t('outputPanel.customLong')
            : t(`outputPanel.presets.${optimizationPreset}.label`);
    const fitLabel = t(`outputPanel.imageFitOptions.${imageFit}`);
    const collapsedTitle = t('outputPanel.footerCollapsedTitle', {
        compression: presetLabel,
        fit: fitLabel,
    });

    return (
        <div className="output-panel-shell">
            <button
                type="button"
                className="output-panel-header"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                {open ? (
                    <span className="output-panel-header-title">
                        {t('outputPanel.footerTitle')}
                    </span>
                ) : (
                    <span className="output-panel-header-summary" title={collapsedTitle}>
                        <span className="output-panel-summary-item">
                            <IconArrowsMinimize className="output-panel-summary-icon" />
                            <span className="output-panel-summary-value">{presetLabel}</span>
                        </span>
                        <span className="shrink-0 text-ui-text-muted">·</span>
                        <span className="output-panel-summary-item">
                            <IconPhoto className="output-panel-summary-icon" />
                            <span className="output-panel-summary-value">{fitLabel}</span>
                        </span>
                    </span>
                )}
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="flex shrink-0"
                >
                    <IconChevronDown className="h-5 w-5 text-ui-text-muted" />
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="output-panel-content">
                            <OptimizationSection
                                optimizationPreset={optimizationPreset}
                                jpegQuality={jpegQuality}
                                targetDpi={targetDpi}
                                onJpegQualityChange={onJpegQualityChange}
                                onTargetDpiChange={onTargetDpiChange}
                                onOptimizationPresetChange={onOptimizationPresetChange}
                            />

                            <PageFitSection
                                imageFit={imageFit}
                                onImageFitChange={onImageFitChange}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
