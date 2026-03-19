import {
    JPEG_QUALITY_OPTIONS,
    TARGET_DPI_OPTIONS,
} from '@/domain/optimizationConfig';
import { useTranslation } from '@/i18n';

import { DpiTooltip, JpegTooltip } from './helpContent';
import { SegmentedControl, type SegmentOption } from './SegmentedControl';

function encodeOptionalNumberOption(value: number | undefined) {
    return value === undefined ? 'off' : String(value);
}

function decodeOptionalNumberOption(option: string): number | undefined {
    if (option === 'off') return undefined;
    return Number(option);
}

function buildOptionalNumberOptions(
    options: ReadonlyArray<{ value: number | undefined }>,
    offLabel: string,
): SegmentOption<string>[] {
    return options.map(({ value }) => ({
        value: value === undefined ? 'off' : String(value),
        label: value === undefined ? offLabel : String(value),
    }));
}

export function OptimizationAdvancedPanel({
    jpegQuality,
    targetDpi,
    onJpegQualityChange,
    onTargetDpiChange,
}: {
    jpegQuality?: number;
    targetDpi?: number;
    onJpegQualityChange: (v: number | undefined) => void;
    onTargetDpiChange: (v: number | undefined) => void;
}) {
    const { t } = useTranslation();
    const jpegOptions = buildOptionalNumberOptions(JPEG_QUALITY_OPTIONS, t('outputPanel.auto'));
    const targetDpiOptions = buildOptionalNumberOptions(TARGET_DPI_OPTIONS, t('outputPanel.off'));

    return (
        <div className="output-panel-advanced-panel">
            <div className="output-panel-advanced-grid">
                <SegmentedControl
                    label={t('outputPanel.targetDpi')}
                    helpContent={<DpiTooltip />}
                    helpAlign="start"
                    className="output-panel-group-fill"
                    options={targetDpiOptions}
                    value={encodeOptionalNumberOption(targetDpi)}
                    onChange={(value) => onTargetDpiChange(decodeOptionalNumberOption(value))}
                />
                <SegmentedControl
                    label={t('outputPanel.jpegQuality')}
                    helpContent={<JpegTooltip />}
                    helpAlign="center"
                    className="output-panel-group-fill"
                    options={jpegOptions}
                    value={encodeOptionalNumberOption(jpegQuality)}
                    onChange={(value) => onJpegQualityChange(decodeOptionalNumberOption(value))}
                />
            </div>
        </div>
    );
}
