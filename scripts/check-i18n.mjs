#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseSync } from 'vite';

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

function unwrapExpression(node) {
    let current = node;
    while (
        current?.type === 'TSAsExpression' ||
        current?.type === 'TSTypeAssertion' ||
        current?.type === 'ParenthesizedExpression' ||
        current?.type === 'ChainExpression'
    ) {
        current = current.expression;
    }
    return current;
}

function getTranslationArgumentIndex(callExpression) {
    const callee = callExpression.callee;
    if (callee?.type !== 'Identifier') return null;

    const { name } = callee;
    if (name === 't' || name === 'tp') return 0;
    if (name === 'translate' || name === 'translatePlural') return 1;
    return null;
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

function getStaticString(node) {
    const expression = unwrapExpression(node);
    if (expression?.type === 'Literal' && typeof expression.value === 'string') {
        return expression.value;
    }
    if (expression?.type !== 'TemplateLiteral' || expression.expressions.length > 0) return null;
    return expression.quasis[0]?.value.cooked ?? expression.quasis[0]?.value.raw ?? '';
}

function isTypeOnlyLiteral(ancestors) {
    return ancestors.at(-1)?.type === 'TSLiteralType';
}

function getContainingTranslationCall(node, ancestors) {
    for (let index = ancestors.length - 1; index >= 0; index -= 1) {
        const ancestor = ancestors[index];
        if (ancestor.type !== 'CallExpression') continue;

        const argumentIndex = getTranslationArgumentIndex(ancestor);
        if (argumentIndex === null) continue;

        const argument = ancestor.arguments[argumentIndex];
        if (!argument || argument.start > node.start || argument.end < node.end) continue;

        return ancestor;
    }
    return null;
}

function hasTranslationKeyAssertion(node, ancestors, sourceText) {
    for (let index = ancestors.length - 1; index >= 0; index -= 1) {
        const ancestor = ancestors[index];
        if (ancestor.type !== 'TSAsExpression' && ancestor.type !== 'TSTypeAssertion') continue;
        if (ancestor.start > node.start || ancestor.end < node.end) continue;

        const typeText = sourceText.slice(
            ancestor.typeAnnotation.start,
            ancestor.typeAnnotation.end,
        );
        if (/\bTranslationKey\b/.test(typeText)) return true;
    }
    return false;
}

function isAllowedPluralComposition(filePath, callExpression, hasAssertion) {
    return (
        toRelative(filePath) === 'src/shared/i18n/i18n.translate.ts' &&
        callExpression?.callee?.type === 'Identifier' &&
        callExpression.callee.name === 'translate' &&
        hasAssertion
    );
}

function sourceLanguage(filePath) {
    const extension = path.extname(filePath);
    if (extension === '.tsx') return 'tsx';
    if (extension === '.jsx') return 'jsx';
    if (extension === '.ts' || extension === '.mts' || extension === '.cts') return 'ts';
    return 'js';
}

function parseSourceFile(filePath, sourceText) {
    const result = parseSync(filePath, sourceText, {
        astType: 'ts',
        lang: sourceLanguage(filePath),
        sourceType: 'unambiguous',
    });

    if (result.errors.length > 0) {
        const details = result.errors.map((error) => error.message).join('\n');
        throw new Error(`Impossibile analizzare ${toRelative(filePath)}:\n${details}`);
    }

    return result.program;
}

function walkAst(node, ancestors, visit) {
    if (!node || typeof node !== 'object' || typeof node.type !== 'string') return;

    visit(node, ancestors);
    ancestors.push(node);

    for (const [key, child] of Object.entries(node)) {
        if (key === 'loc' || key === 'range' || key === 'comments' || key === 'tokens') continue;

        if (Array.isArray(child)) {
            for (const item of child) walkAst(item, ancestors, visit);
            continue;
        }

        walkAst(child, ancestors, visit);
    }

    ancestors.pop();
}

function lineNumberAt(sourceText, offset) {
    let line = 1;
    for (let index = 0; index < offset; index += 1) {
        if (sourceText.charCodeAt(index) === 10) line += 1;
    }
    return line;
}

function scanSourceFile(filePath, sourceText, program, context) {
    walkAst(program, [], (node, ancestors) => {
        if (node.type === 'Literal' && typeof node.value === 'string' && !isTypeOnlyLiteral(ancestors)) {
            markUsedKey(node.value, context);
        }

        if (node.type !== 'TemplateLiteral') return;

        const staticValue = getStaticString(node);
        if (staticValue !== null) {
            markUsedKey(staticValue, context);
            return;
        }

        const callExpression = getContainingTranslationCall(node, ancestors);
        const hasAssertion = hasTranslationKeyAssertion(node, ancestors, sourceText);
        if (!callExpression && !hasAssertion) return;
        if (isAllowedPluralComposition(filePath, callExpression, hasAssertion)) return;

        const line = lineNumberAt(sourceText, node.start);
        const expression = sourceText.slice(node.start, node.end).replaceAll('\n', ' ');
        context.dynamicReferences.push(`${toRelative(filePath)}:${line} ${expression}`);
    });
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

    const context = { dynamicReferences: [], keys, pluralKeysByBase, used: new Set() };
    const sourceFiles = await collectSourceFiles(SOURCE_DIR);

    for (const filePath of sourceFiles) {
        const sourceText = await fs.readFile(filePath, 'utf8');
        const program = parseSourceFile(filePath, sourceText);
        scanSourceFile(filePath, sourceText, program, context);
    }

    return {
        dynamicReferences: context.dynamicReferences.sort(),
        unusedKeys: [...keys].filter((key) => !context.used.has(key)).sort(),
    };
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

    const { dynamicReferences, unusedKeys } = await findUnusedKeys(baseMessages);
    const missingOrExtraCount = keySetProblems.reduce(
        (count, problem) => count + problem.missing.length + problem.extra.length,
        0,
    );
    const problemCount =
        missingOrExtraCount +
        placeholderProblems.length +
        unusedKeys.length +
        dynamicReferences.length;

    if (problemCount > 0) {
        for (const problem of keySetProblems) {
            printList(`Chiavi mancanti (${problem.label})`, problem.missing);
            printList(`Chiavi extra (${problem.label})`, problem.extra);
        }

        printPlaceholderMismatches(placeholderProblems);
        printList(`Chiavi non usate nel codice (${BASE_LOCALE})`, unusedKeys);
        printList('Riferimenti i18n dinamici non supportati', dynamicReferences);
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
