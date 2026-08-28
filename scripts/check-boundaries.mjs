#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const SOURCE_DIR = path.join(ROOT_DIR, 'src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const IGNORED_DIRS = new Set(['.git', 'dist', 'node_modules', 'target']);
const IMPORT_PATTERN = /\b(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

function relativePath(filePath) {
    return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}

async function collectSourceFiles(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;

        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectSourceFiles(entryPath)));
            continue;
        }

        if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
            files.push(entryPath);
        }
    }

    return files;
}

function sourceLayer(file) {
    const relative = relativePath(file);
    const match = relative.match(/^src\/(app|modules|capabilities|infrastructure|shared|dev)(?:\/|$)/);
    return match?.[1] ?? null;
}

function importedLayer(specifier) {
    if (!specifier.startsWith('@/')) return null;
    const match = specifier.slice(2).match(/^(app|modules|capabilities|infrastructure|shared|dev)(?:\/|$)/);
    return match?.[1] ?? null;
}

function moduleOwner(specifier) {
    if (!specifier.startsWith('@/modules/')) return null;
    return specifier.slice('@/modules/'.length).split('/')[0] ?? null;
}

function isAllowedImport(fromLayer, fromFile, specifier) {
    const targetLayer = importedLayer(specifier);
    if (!targetLayer) return true;

    if (fromLayer === 'shared') {
        return targetLayer === 'shared';
    }

    if (fromLayer === 'capabilities') {
        return targetLayer === 'capabilities' || targetLayer === 'shared';
    }

    if (fromLayer === 'modules') {
        if (targetLayer === 'app') return false;
        if (targetLayer !== 'modules') return true;

        const sourceOwner = moduleOwner(`@/${relativePath(fromFile).slice('src/'.length)}`);
        const targetOwner = moduleOwner(specifier);
        return sourceOwner === targetOwner;
    }

    if (fromLayer === 'infrastructure') {
        return targetLayer !== 'app';
    }

    return true;
}

async function pathExists(relative) {
    try {
        await fs.access(path.join(ROOT_DIR, relative));
        return true;
    } catch {
        return false;
    }
}

async function main() {
    const violations = [];

    for (const legacyPath of ['src/features', 'src/infra']) {
        if (await pathExists(legacyPath)) {
            violations.push(`${legacyPath}: legacy migration path must be removed`);
        }
    }

    const files = await collectSourceFiles(SOURCE_DIR);
    for (const file of files) {
        const relative = relativePath(file);
        const fromLayer = sourceLayer(file);
        const source = await fs.readFile(file, 'utf8');

        for (const match of source.matchAll(IMPORT_PATTERN)) {
            const specifier = match[1];
            const line = source.slice(0, match.index).split('\n').length;

            if (specifier.includes('@/features/') || specifier.includes('@/infra/')) {
                violations.push(`${relative}:${line}: legacy import ${specifier}`);
            }

            if (specifier.startsWith('@tauri-apps/') && fromLayer !== 'infrastructure') {
                violations.push(`${relative}:${line}: direct Tauri import outside infrastructure`);
            }

            if (!isAllowedImport(fromLayer, file, specifier)) {
                violations.push(`${relative}:${line}: ${fromLayer} cannot import ${specifier}`);
            }
        }
    }

    if (violations.length > 0) {
        console.error('Dependency boundary violations:');
        for (const violation of violations.sort()) console.error(`- ${violation}`);
        process.exitCode = 1;
        return;
    }

    console.log(`Dependency boundaries ok: ${files.length} source files checked.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
