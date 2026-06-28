#!/usr/bin/env node

import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT_DIR = process.cwd();
const MESSAGES_DIR = path.join(ROOT_DIR, 'src/shared/i18n/messages');
const SOURCE_DIR = path.join(ROOT_DIR, 'src');
const BASE_LOCALE = 'it';
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const IGNORED_DIRS = new Set(['.git', 'dist', 'node_modules', 'target']);

function toRelative(filePath) {
    return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function getLocaleFiles() {
    const entries = await fs.readdir(MESSAGES_DIR, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => ({
            locale: path.basename(entry.name, '.json'),
            path: path.join(MESSAGES_DIR, entry.name),
        }))
        .sort((a, b) => a.locale.localeCompare(b.locale));
}

function compareKeySets(baseLocale, baseKeys, locale, keys) {
    const keySet = new Set(keys);
    const baseKeySet = new Set(baseKeys);

    return {
        missing: baseKeys.filter((key) => !keySet.has(key)),
        extra: keys.filter((key) => !baseKeySet.has(key)),
        label: `${locale} vs ${baseLocale}`,
    };
}

function extractPlaceholders(value) {
    return [...String(value).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function comparePlaceholders(baseLocale, baseMessages, locale, messages, commonKeys) {
    const mismatches = [];

    for (const key of commonKeys) {
        const baseTokens = extractPlaceholders(baseMessages[key]);
        const localeTokens = extractPlaceholders(messages[key]);

        if (baseTokens.join('\0') === localeTokens.join('\0')) continue;

        mismatches.push({
            key,
            base: baseTokens,
            locale: localeTokens,
            label: `${locale} vs ${baseLocale}`,
        });
    }

    return mismatches;
}

async function collectSourceFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue;

        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectSourceFiles(entryPath)));
            continue;
        }

        if (!entry.isFile()) continue;
        if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
        if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
        if (toRelative(entryPath).startsWith('src/shared/i18n/messages/')) continue;

        files.push(entryPath);
    }

    return files;
}

function getTemplateParts(node) {
    const parts = [node.head.text];
    for (const span of node.templateSpans) {
        parts.push(span.literal.text);
    }
    return parts;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTemplatePattern(parts) {
    if (!parts.some((part) => part.length >= 3)) return null;
    return new RegExp(`^${parts.map(escapeRegExp).join('.+')}$`);
}

function unwrapExpression(node) {
    let current = node;
    while (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
        current = current.expression;
    }
    return current;
}

function getIdentifierName(node) {
    if (ts.isIdentifier(node)) return node.text;
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    return null;
}

function getTranslationArgumentIndex(callExpression) {
    const callee = getIdentifierName(callExpression.expression);
    if (callee === 't' || callee === 'tp') return 0;
    if (callee === 'translate' || callee === 'translatePlural') return 1;
    return null;
}

function isTranslationKeyAssertion(node, sourceFile) {
    return (
        ts.isAsExpression(node.parent) &&
        node.parent.expression === node &&
        node.parent.type.getText(sourceFile).includes('TranslationKey')
    );
}

function markUsedKey(value, context) {
    if (context.keys.has(value)) {
        context.used.add(value);
        return;
    }

    const pluralKeys = context.pluralKeysByBase.get(value);
    if (pluralKeys) {
        for (const key of pluralKeys) context.used.add(key);
    }
}

function markPattern(pattern, context) {
    for (const key of context.keys) {
        if (pattern.test(key)) context.used.add(key);
    }

    for (const [baseKey, pluralKeys] of context.pluralKeysByBase.entries()) {
        if (!pattern.test(baseKey)) continue;
        for (const key of pluralKeys) context.used.add(key);
    }
}

function markNodeAsTranslationReference(node, context) {
    const expression = unwrapExpression(node);

    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
        markUsedKey(expression.text, context);
        return;
    }

    if (ts.isTemplateExpression(expression)) {
        const pattern = buildTemplatePattern(getTemplateParts(expression));
        if (pattern) markPattern(pattern, context);
    }
}

function scanSourceFile(sourceFile, context) {
    function visit(node) {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            markUsedKey(node.text, context);
        }

        if (ts.isTemplateExpression(node) && isTranslationKeyAssertion(node, sourceFile)) {
            markNodeAsTranslationReference(node, context);
        }

        if (ts.isCallExpression(node)) {
            const keyArgumentIndex = getTranslationArgumentIndex(node);
            if (keyArgumentIndex !== null && node.arguments[keyArgumentIndex]) {
                markNodeAsTranslationReference(node.arguments[keyArgumentIndex], context);
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
}

async function findUnusedKeys(baseMessages) {
    const keys = new Set(Object.keys(baseMessages));
    const pluralKeysByBase = new Map();

    for (const key of keys) {
        const match = key.match(/^(.*)\.(one|other)$/);
        if (!match) continue;

        const [, baseKey] = match;
        const current = pluralKeysByBase.get(baseKey) ?? [];
        current.push(key);
        pluralKeysByBase.set(baseKey, current);
    }

    const context = { keys, pluralKeysByBase, used: new Set() };
    const sourceFiles = await collectSourceFiles(SOURCE_DIR);

    for (const filePath of sourceFiles) {
        const sourceText = await fs.readFile(filePath, 'utf8');
        const sourceFile = ts.createSourceFile(
            filePath,
            sourceText,
            ts.ScriptTarget.Latest,
            true,
            filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );

        scanSourceFile(sourceFile, context);
    }

    return [...keys].filter((key) => !context.used.has(key)).sort();
}

function printList(title, values) {
    if (values.length === 0) return;

    console.error(`\n${title}`);
    for (const value of values) {
        console.error(`  - ${value}`);
    }
}

function printPlaceholderMismatches(mismatches) {
    if (mismatches.length === 0) return;

    console.error('\nPlaceholder non sincronizzati');
    for (const mismatch of mismatches) {
        const base = mismatch.base.length > 0 ? mismatch.base.join(', ') : '(nessuno)';
        const locale = mismatch.locale.length > 0 ? mismatch.locale.join(', ') : '(nessuno)';
        console.error(`  - ${mismatch.label}: ${mismatch.key}`);
        console.error(`    base: ${base}`);
        console.error(`    locale: ${locale}`);
    }
}

async function main() {
    const localeFiles = await getLocaleFiles();
    const baseFile = localeFiles.find((file) => file.locale === BASE_LOCALE);

    if (!baseFile) {
        throw new Error(`Locale base non trovato: ${BASE_LOCALE}`);
    }

    const dictionaries = new Map();
    for (const localeFile of localeFiles) {
        dictionaries.set(localeFile.locale, await readJson(localeFile.path));
    }

    const baseMessages = dictionaries.get(BASE_LOCALE);
    const baseKeys = Object.keys(baseMessages).sort();
    const keySetProblems = [];
    const placeholderProblems = [];

    for (const [locale, messages] of dictionaries.entries()) {
        if (locale === BASE_LOCALE) continue;

        const keys = Object.keys(messages).sort();
        const comparison = compareKeySets(BASE_LOCALE, baseKeys, locale, keys);
        keySetProblems.push(comparison);

        const localeKeySet = new Set(keys);
        const commonKeys = baseKeys.filter((key) => localeKeySet.has(key));
        placeholderProblems.push(
            ...comparePlaceholders(BASE_LOCALE, baseMessages, locale, messages, commonKeys),
        );
    }

    const unusedKeys = await findUnusedKeys(baseMessages);
    const missingOrExtraCount = keySetProblems.reduce(
        (count, problem) => count + problem.missing.length + problem.extra.length,
        0,
    );
    const problemCount = missingOrExtraCount + placeholderProblems.length + unusedKeys.length;

    if (problemCount > 0) {
        for (const problem of keySetProblems) {
            printList(`Chiavi mancanti (${problem.label})`, problem.missing);
            printList(`Chiavi extra (${problem.label})`, problem.extra);
        }

        printPlaceholderMismatches(placeholderProblems);
        printList(`Chiavi non usate nel codice (${BASE_LOCALE})`, unusedKeys);
        process.exitCode = 1;
        return;
    }

    console.log(
        `i18n ok: ${localeFiles.length} locale, ${baseKeys.length} chiavi, nessuna chiave morta.`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
