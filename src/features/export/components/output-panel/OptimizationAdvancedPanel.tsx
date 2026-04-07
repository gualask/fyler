import { JPEG_QUALITY_OPTIONS, TARGET_DPI_OPTIONS } from '@/shared/domain/optimization-config';
import { useTranslation } from '@/shared/i18n';
import { SelectControl, type SelectOption } from './SelectControl';
import { DpiTooltip, JpegTooltip } from './Tooltips';

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
): SelectOption<string>[] {
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
                <SelectControl
                    label={t('outputPanel.targetDpi')}
                    helpContent={<DpiTooltip />}
                    helpAlign="start"
                    className="output-panel-group-fill"
                    options={targetDpiOptions}
                    value={encodeOptionalNumberOption(targetDpi)}
                    onChange={(value) => onTargetDpiChange(decodeOptionalNumberOption(value))}
                />
                <SelectControl
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
