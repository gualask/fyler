import { IconArrowsMinimize } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { useTranslation } from '@/shared/i18n';
import { WorkflowHeader } from '@/shared/ui';

export function BatchCompressionHeader({
    busy,
    renderSettingsMenu,
    renderAlwaysOnTopControl,
    onBack,
    pendingCount,
    sourceCount,
    onRun,
}: {
    busy: boolean;
    renderSettingsMenu: () => ReactNode;
    renderAlwaysOnTopControl: () => ReactNode;
    onBack: () => void;
    pendingCount: number;
    sourceCount: number;
    onRun: () => void;
}) {
    const { t } = useTranslation();

    return (
        <WorkflowHeader
            title={t('batch.title')}
            backDisabled={busy}
            onBack={onBack}
            settingsControl={renderSettingsMenu()}
            primaryActions={
                <>
                    {renderAlwaysOnTopControl()}
                    <button
                        type="button"
                        className="btn-primary btn-toolbar"
                        onClick={onRun}
                        disabled={busy || pendingCount === 0 || sourceCount === 0}
                    >
                        <IconArrowsMinimize className="h-5 w-5" aria-hidden="true" />
                        <span>{t('batch.action.compress')}</span>
                    </button>
                </>
            }
        />
    );
}
