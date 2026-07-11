/**
 * Imports the real BOM cost spreadsheets into AssemblyPart / AssemblyFormula.
 *
 * The master file ("Format Juicer Assambling.xlsx") is imported FIRST, then
 * the individual per-model files - so for any shared part seen at more than
 * one price, the (newer) dedicated-file value wins as the current price and
 * the part is flagged for review.
 *
 * Usage:
 *   npx ts-node scripts/import-assembly-formulas.ts [folderPath] [organizationId]
 *   (defaults: the Desktop BOM folder, organizationId 1)
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { AssemblyFormulaParserService, ParsedFormula } from '../src/modules/assembly-formulas/services/assembly-formula-parser.service';
import { AssemblyFormulaImportService } from '../src/modules/assembly-formulas/services/assembly-formula-import.service';

const DEFAULT_FOLDER = 'C:/Users/Bizzzking/Desktop/Ghazanfar Juicer 3 in 1 Cost';
const MASTER_FILE = 'Format Juicer Assambling.xlsx';

async function main() {
  const folder = process.argv[2] || DEFAULT_FOLDER;
  const organizationId = parseInt(process.argv[3] || '1', 10);

  if (!fs.existsSync(folder)) {
    console.error(`Folder not found: ${folder}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const parser = new AssemblyFormulaParserService();
  // The import service only uses standard Prisma methods; PrismaService
  // extends PrismaClient, so a plain client stands in fine here.
  const importService = new AssemblyFormulaImportService(prisma as any, parser);

  // Master first, then everything else (dedicated files win on conflict).
  const files = fs
    .readdirSync(folder)
    .filter(f => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'))
    .sort((a, b) => (a === MASTER_FILE ? -1 : b === MASTER_FILE ? 1 : a.localeCompare(b)));

  const allFormulas: ParsedFormula[] = [];
  for (const file of files) {
    const buffer = fs.readFileSync(path.join(folder, file));
    const parsed = parser.parse(buffer, file);
    // Tag each formula's source file for provenance, then feed them all to
    // one importFormulas() call in order so the shared-part "last wins"
    // conflict logic works across the whole set at once.
    for (const f of parsed.formulas) {
      allFormulas.push(f);
    }
    console.log(`Parsed ${file}: ${parsed.formulas.length} formula(s)`);
  }

  console.log(`\nImporting ${allFormulas.length} formulas for organization ${organizationId}...`);
  const result = await importService.importFormulas(organizationId, allFormulas, 'BOM Excel import');

  console.log('\n=== Import complete ===');
  console.log(`Formulas processed: ${result.formulasProcessed}`);
  console.log(`  created: ${result.formulasCreated}, updated: ${result.formulasUpdated}`);
  console.log(`Parts created: ${result.partsCreated}`);
  console.log(`Parts with price conflict (need review): ${result.partsWithPriceConflict}`);
  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    result.warnings.slice(0, 20).forEach(w => console.log(`  - ${w}`));
  }

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  process.exit(1);
});
