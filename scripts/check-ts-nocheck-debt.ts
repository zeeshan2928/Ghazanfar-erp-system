/**
 * Reports what TypeScript errors are hiding behind `// @ts-nocheck` comments,
 * without modifying any files on disk.
 *
 * Why this exists: on 2026-07-06 a full audit found ~20 real bugs (wrong Prisma
 * field names, invalid enum values, missing required fields) that were silently
 * hidden by `@ts-nocheck` in ~45 backend service files. Removing the comment and
 * fixing the fallout in the affected files proved TypeScript catches these
 * mistakes immediately once it's allowed to. This script lets us see, file by
 * file, how much of that same risk remains in files nobody has cleaned up yet -
 * without the "big bang" of stripping every comment at once.
 *
 * Usage:
 *   npm run check:hidden-errors            # summary: file -> error count
 *   npm run check:hidden-errors -- --full  # full diagnostic text per file
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TSCONFIG_PATH = path.join(PROJECT_ROOT, 'tsconfig.json');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const NOCHECK_PATTERN = /^\s*\/\/\s*@ts-nocheck.*\r?\n/;

function findNoCheckFiles(dir: string, results: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findNoCheckFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (NOCHECK_PATTERN.test(content)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function main() {
  const showFull = process.argv.includes('--full');

  const noCheckFiles = findNoCheckFiles(SRC_DIR);
  if (noCheckFiles.length === 0) {
    console.log('No @ts-nocheck files found under src/. Nothing to report.');
    return;
  }

  const configFile = ts.readConfigFile(TSCONFIG_PATH, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    PROJECT_ROOT,
  );

  // In-memory override: strip the @ts-nocheck line from these specific files
  // only, so the type checker sees them as if the comment were never there.
  // Nothing is written to disk.
  const strippedContent = new Map<string, string>();
  for (const file of noCheckFiles) {
    const original = fs.readFileSync(file, 'utf8');
    strippedContent.set(path.normalize(file), original.replace(NOCHECK_PATTERN, ''));
  }

  const host = ts.createCompilerHost(parsedConfig.options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const normalized = path.normalize(fileName);
    const override = strippedContent.get(normalized);
    if (override !== undefined) {
      return ts.createSourceFile(fileName, override, languageVersion, true);
    }
    return originalGetSourceFile(fileName, languageVersion, ...rest);
  };

  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options, host);

  const resultsByFile = new Map<string, ts.Diagnostic[]>();
  for (const file of noCheckFiles) {
    const normalized = path.normalize(file);
    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) continue;

    const diagnostics = [
      ...program.getSemanticDiagnostics(sourceFile),
      ...program.getSyntacticDiagnostics(sourceFile),
    ];
    if (diagnostics.length > 0) {
      resultsByFile.set(normalized, diagnostics);
    }
  }

  const relPath = (p: string) => path.relative(PROJECT_ROOT, p).replace(/\\/g, '/');

  console.log(`\nScanned ${noCheckFiles.length} @ts-nocheck files.\n`);

  if (resultsByFile.size === 0) {
    console.log('None of them have hidden type errors right now. Safe to remove @ts-nocheck from all.');
    return;
  }

  const sorted = [...resultsByFile.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log('File'.padEnd(70) + 'Hidden errors');
  console.log('-'.repeat(90));
  for (const [file, diags] of sorted) {
    console.log(relPath(file).padEnd(70) + diags.length);
  }

  const cleanFiles = noCheckFiles.filter(f => !resultsByFile.has(path.normalize(f)));
  if (cleanFiles.length > 0) {
    console.log(`\n${cleanFiles.length} file(s) have @ts-nocheck but ZERO hidden errors - safe to strip immediately:`);
    for (const f of cleanFiles) {
      console.log('  ' + relPath(f));
    }
  }

  if (showFull) {
    console.log('\n' + '='.repeat(90));
    console.log('FULL DIAGNOSTICS');
    console.log('='.repeat(90));
    for (const [file, diags] of sorted) {
      console.log(`\n--- ${relPath(file)} ---`);
      for (const diag of diags) {
        const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
        if (diag.file && diag.start !== undefined) {
          const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
          console.log(`  ${line + 1}:${character + 1} - ${message}`);
        } else {
          console.log(`  ${message}`);
        }
      }
    }
  } else {
    console.log('\nRun with --full to see the actual error messages per file.');
  }

  console.log(
    `\nTotal: ${resultsByFile.size}/${noCheckFiles.length} @ts-nocheck files have real hidden errors right now.`,
  );
}

main();
