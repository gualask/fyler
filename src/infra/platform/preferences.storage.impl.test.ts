/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createMirroredPreferencesStorage } from './preferences.storage.impl.js';

const snapshot = {
    isDark: true,
    locale: 'it' as const,
    accent: 'teal' as const,
    tutorialSeen: true,
    finalDocumentLayout: 'columns-1' as const,
};

test('keeps browser-only storage writes local', async () => {
    let nativeSaveCalls = 0;
    const writes: unknown[] = [];
    const storage = createMirroredPreferencesStorage({
        readSnapshot: () => snapshot,
        writeSnapshot: (settings: unknown) => {
            writes.push(settings);
        },
        hasNativeRuntime: () => false,
        loadNative: async () => {
            throw new Error('native load should not run');
        },
        saveNative: async () => {
            nativeSaveCalls += 1;
        },
    });

    assert.deepEqual(await storage.load(), snapshot);

    await storage.save(snapshot);
    assert.equal(nativeSaveCalls, 0);
    assert.deepEqual(writes, [snapshot]);
});

test('mirrors native settings when the runtime is available', async () => {
    const writes: unknown[] = [];
    let nativeSaveCalls = 0;
    const nativeSettings = {
        isDark: false,
        locale: 'en' as const,
        accent: 'blue' as const,
        tutorialSeen: false,
        finalDocumentLayout: 'columns-2' as const,
    };

    const storage = createMirroredPreferencesStorage({
        readSnapshot: () => null,
        writeSnapshot: (settings: unknown) => {
            writes.push(settings);
        },
        hasNativeRuntime: () => true,
        loadNative: async () => nativeSettings,
        saveNative: async () => {
            nativeSaveCalls += 1;
        },
    });

    assert.deepEqual(await storage.load(), nativeSettings);
    assert.deepEqual(writes, [nativeSettings]);

    await storage.save(nativeSettings);
    assert.equal(nativeSaveCalls, 1);
    assert.deepEqual(writes, [nativeSettings, nativeSettings]);
});
