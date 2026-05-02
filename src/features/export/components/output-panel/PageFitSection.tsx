import type { ImageFit } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { buildImageFitOptions } from './output-panel.options';
import type { SelectOption } from './SelectControl';
import { FitPreview } from './Tooltips';

interface Props {
    imageFit: ImageFit;
    onImageFitChange: (v: ImageFit) => void;
}

export function PageFitSection({ imageFit, onImageFitChange }: Props) {
    const { t } = useTranslation();
    const imageFitOptions: SelectOption<ImageFit>[] = buildImageFitOptions((fit) =>
        t(`outputPanel.imageFitOptions.${fit}`),
    );

    return (
        <fieldset className="output-panel-group output-panel-page-fit">
            <legend className="output-panel-label">{t('outputPanel.pageFit')}</legend>
            <div className="page-fit-toggle-grid">
                {imageFitOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className="page-fit-toggle"
                        data-active={imageFit === option.value}
                        aria-pressed={imageFit === option.value}
                        onClick={() => onImageFitChange(option.value)}
                    >
                        <FitPreview mode={option.value} />
                        <span className="page-fit-toggle-label">{option.label}</span>
                    </button>
                ))}
            </div>
        </fieldset>
    );
}
