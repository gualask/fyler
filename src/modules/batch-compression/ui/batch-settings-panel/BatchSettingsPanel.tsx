import { useId } from 'react';

import { useTranslation } from '@/shared/i18n';
import { WorkspaceSettingsPanel } from '@/shared/ui';
import type { BatchCompressionSettings, BatchRunProgress, BatchSummary } from '../../model';
import { CompressionSettings } from './CompressionSettings';
import { DestinationPicker } from './DestinationPicker';
import { ResultsSummary } from './ResultsSummary';

export function BatchSettingsPanel({
    settings,
    hasImageSources,
    destinationPath,
    busy,
    summary,
    runProgress,
    onSettingsChange,
    onChooseDestination,
}: {
    settings: BatchCompressionSettings;
    hasImageSources: boolean;
    destinationPath: string;
    busy: boolean;
    summary: BatchSummary;
    runProgress: BatchRunProgress | null;
    onSettingsChange: (settings: BatchCompressionSettings) => void;
    onChooseDestination: () => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    return (
        <WorkspaceSettingsPanel title={t('batch.settings.title')} titleId={titleId}>
            <CompressionSettings
                settings={settings}
                busy={busy}
                hasImageSources={hasImageSources}
                onSettingsChange={onSettingsChange}
            />
            <DestinationPicker
                destinationPath={destinationPath}
                busy={busy}
                onChooseDestination={onChooseDestination}
            />
            <div className="mt-6">
                <ResultsSummary summary={summary} runProgress={runProgress} />
            </div>
        </WorkspaceSettingsPanel>
    );
}
