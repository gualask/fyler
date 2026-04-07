import type { ImageFit } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { buildImageFitOptions } from './output-panel.options';
import { SelectControl, type SelectOption } from './SelectControl';
import { ImageFitTooltip } from './Tooltips';

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
        <SelectControl
            label={t('outputPanel.pageFit')}
            helpContent={<ImageFitTooltip />}
            helpAlign="end"
            className="output-panel-page-fit"
            options={imageFitOptions}
            value={imageFit}
            onChange={onImageFitChange}
        />
    );
}
