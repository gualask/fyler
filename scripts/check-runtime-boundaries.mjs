#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const FRONTEND_DIR = path.join(ROOT_DIR, 'src');
const RUST_DIR = path.join(ROOT_DIR, 'src-tauri', 'src');
const IGNORED_DIRS = new Set(['.git', 'dist', 'node_modules', 'target']);
const FRONTEND_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx', '.mts']);
const NATIVE_EVENT_PREFIXES = ['tauri://'];

function relativePath(filePath) {
    return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}

function isTestFile(filePath) {
    const relative = relativePath(filePath);
    return (
        /(?:^|\/)tests?(?:\/|$)/.test(relative) ||
        /\.(?:test|spec)\.[^.]+$/.test(relative) ||
        /(?:^|\/)dev(?:\/|$)/.test(relative)
    );
}

async function collectFiles(directory, extensions) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;

        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectFiles(entryPath, extensions)));
        } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
            files.push(entryPath);
        }
    }

    return files;
}

function sourceLine(source, index) {
    return source.slice(0, index).split('\n').length;
}

function addOccurrence(collection, name, file, line) {
    const occurrences = collection.get(name) ?? [];
    occurrences.push(`${relativePath(file)}:${line}`);
    collection.set(name, occurrences);
}

function collectConstants(files) {
    const constants = new Map();
    const patterns = [
        /\b(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*(['"])([^'"]+)\2/g,
        /\b(?:pub(?:\([^)]*\))?\s+)?const\s+([A-Z][A-Z0-9_]*)\s*:[^=]+?=\s*"([^"]+)"/g,
    ];

    for (const { source } of files) {
        for (const pattern of patterns) {
            for (const match of source.matchAll(pattern)) {
                const name = match[1];
                const value = match[3] ?? match[2];
                const previous = constants.get(name);
                if (previous !== undefined && previous !== value) {
                    constants.set(name, null);
                } else if (previous === undefined) {
                    constants.set(name, value);
                }
            }
        }
    }

    return constants;
}

function resolveStaticName(expression, constants) {
    const value = expression.trim();
    const literal = value.match(/^(['"])([^'"]+)\1$/);
    if (literal) return literal[2];

    const constant = value.match(/^(?:[A-Za-z_][\w]*::)*([A-Z][A-Z0-9_]*)$/);
    if (!constant) return null;
    return constants.get(constant[1]) ?? null;
}

function collectCallNames({ files, patterns, constants, label, unresolved }) {
    const names = new Map();

    for (const { file, source } of files) {
        for (const pattern of patterns) {
            for (const match of source.matchAll(pattern)) {
                const expression = match[1];
                const name = resolveStaticName(expression, constants);
                const location = `${relativePath(file)}:${sourceLine(source, match.index)}`;
                if (!name) {
                    unresolved.push(`${location}: ${label} uses non-static name ${expression.trim()}`);
                    continue;
                }
                addOccurrence(names, name, file, sourceLine(source, match.index));
            }
        }
    }

    return names;
}

function collectRegisteredCommands(rustFiles, unresolved) {
    const commands = new Map();
    const handlerPattern = /generate_handler!\s*\[([\s\S]*?)\]\s*\)/g;

    for (const { file, source } of rustFiles) {
        for (const handler of source.matchAll(handlerPattern)) {
            const entries = handler[1].replaceAll(/\/\/.*$/gm, '').split(',');
            for (const entry of entries) {
                const value = entry.trim();
                if (!value) continue;
                const name = value.match(/([A-Za-z_][\w]*)$/)?.[1];
                const entryIndex = handler.index + handler[0].indexOf(entry);
                if (!name) {
                    unresolved.push(
                        `${relativePath(file)}:${sourceLine(source, entryIndex)}: registered command has non-static name ${value}`,
                    );
                    continue;
                }
                addOccurrence(commands, name, file, sourceLine(source, entryIndex));
            }
        }
    }

    return commands;
}

function isNativeEvent(name) {
    return NATIVE_EVENT_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function compareBoundary({ consumers, producers, consumerLabel, producerLabel, violations }) {
    for (const [name, locations] of consumers) {
        if (!producers.has(name) && !isNativeEvent(name)) {
            violations.push(
                `${consumerLabel} "${name}" has no ${producerLabel} (${locations.join(', ')})`,
            );
        }
    }

    for (const [name, locations] of producers) {
        if (!consumers.has(name)) {
            violations.push(
                `${producerLabel} "${name}" has no ${consumerLabel} (${locations.join(', ')})`,
            );
        }
    }
}

async function readSources(files) {
    return Promise.all(
        files.filter((file) => !isTestFile(file)).map(async (file) => ({
            file,
            source: await fs.readFile(file, 'utf8'),
        })),
    );
}

async function main() {
    const [frontendPaths, rustPaths] = await Promise.all([
        collectFiles(FRONTEND_DIR, FRONTEND_EXTENSIONS),
        collectFiles(RUST_DIR, new Set(['.rs'])),
    ]);
    const [frontendFiles, rustFiles] = await Promise.all([
        readSources(frontendPaths),
        readSources(rustPaths),
    ]);
    const allConstants = collectConstants([...frontendFiles, ...rustFiles]);
    const unresolved = [];

    const eventListeners = collectCallNames({
        files: frontendFiles,
        patterns: [
            /(?<!function )\b(?:onTauriEvent|listenToTauriEvent)(?:<[^>]*>)?\s*\(\s*([^,\n)]+)/g,
        ],
        constants: allConstants,
        label: 'event listener',
        unresolved,
    });
    const tauriEmitterFiles = rustFiles.filter(({ source }) => /\btauri(?:::|\s*::).*Emitter/.test(source));
    const eventEmitters = collectCallNames({
        files: tauriEmitterFiles,
        patterns: [
            /\.emit\s*\(\s*([^,\n)]+)/g,
            /\.emit_to\s*\(\s*[^,]+,\s*([^,\n)]+)/g,
        ],
        constants: allConstants,
        label: 'event emitter',
        unresolved,
    });
    const commandInvocations = collectCallNames({
        files: frontendFiles,
        patterns: [/\binvoke(?:<[^>]*>)?\s*\(\s*([^,\n)]+)/g],
        constants: allConstants,
        label: 'command invocation',
        unresolved,
    });
    const registeredCommands = collectRegisteredCommands(rustFiles, unresolved);
    const violations = [...unresolved];

    compareBoundary({
        consumers: eventListeners,
        producers: eventEmitters,
        consumerLabel: 'event listener',
        producerLabel: 'event emitter',
        violations,
    });
    compareBoundary({
        consumers: commandInvocations,
        producers: registeredCommands,
        consumerLabel: 'command invocation',
        producerLabel: 'registered command',
        violations,
    });

    if (violations.length > 0) {
        console.error('Runtime boundary reachability violations:');
        for (const violation of violations.sort()) console.error(`- ${violation}`);
        process.exitCode = 1;
        return;
    }

    const applicationEventListeners = [...eventListeners].filter(([name]) => !isNativeEvent(name));
    console.log(
        `Runtime boundaries ok: ${applicationEventListeners.length} application events and ${commandInvocations.size} commands are paired.`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
