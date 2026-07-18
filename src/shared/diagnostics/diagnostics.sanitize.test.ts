import assert from 'node:assert/strict';
import { test } from 'vitest';
import { sanitizeMetadata, sanitizeText } from './diagnostics.sanitize.js';

test('redacts quoted paths including spaces on Unix and Windows', () => {
    assert.equal(
        sanitizeText("Failed to open '/Users/alice/Private Documents/tax return.pdf'"),
        "Failed to open '<path>'",
    );
    assert.equal(
        sanitizeText('Failed to open "C:\\Users\\Alice Smith\\secret.pdf"'),
        'Failed to open "<path>"',
    );
    assert.equal(sanitizeText('Source file:///Users/alice/secret%20file.pdf'), 'Source <path>');
});

test('redacts file URLs with spaces and Windows network paths', () => {
    assert.equal(
        sanitizeText('Source file:///Users/alice/Private Documents/tax return.pdf'),
        'Source <path>',
    );
    assert.equal(
        sanitizeText('Source "file:///Users/alice/Private Documents/tax return.pdf"'),
        'Source "<path>"',
    );
    assert.equal(
        sanitizeText('Failed to open "\\\\server\\Private Share\\tax return.pdf"'),
        'Failed to open "<path>"',
    );
    assert.equal(
        sanitizeText('Failed to open \\\\server\\Private Share\\tax return.pdf'),
        'Failed to open <path>',
    );
    assert.equal(
        sanitizeText('Failed to open "\\\\?\\C:\\Users\\Alice Smith\\secret.pdf"'),
        'Failed to open "<path>"',
    );
});

test('redacts sensitive metadata by key even when the value is only a filename', () => {
    assert.deepEqual(
        sanitizeMetadata({
            name: 'private.pdf',
            originalPath: '/Users/alice/private.pdf',
            output_file_name: 'diagnostics.txt',
            count: 3,
            source: 'workspace',
        }),
        {
            name: '<redacted>',
            originalPath: '<redacted>',
            output_file_name: '<redacted>',
            count: 3,
            source: 'workspace',
        },
    );
});

test('does not redact ordinary HTTPS links', () => {
    assert.equal(
        sanitizeText('Open https://github.com/gualask/fyler/issues/new'),
        'Open https://github.com/gualask/fyler/issues/new',
    );
});
