import { invoke } from '@tauri-apps/api/core';

import type { SupportPort } from '@/modules/support/support.port';

/** Native metadata, diagnostics-file, and external URL adapter. */
export const tauriSupport: SupportPort = {
    getAppMetadata: () => invoke('get_app_metadata'),
    saveTextFile: (defaultFilename, filterLabel, content) =>
        invoke('save_text_file', { defaultFilename, filterLabel, content }),
    openExternalUrl: (url) => invoke('open_external_url', { url }),
};
