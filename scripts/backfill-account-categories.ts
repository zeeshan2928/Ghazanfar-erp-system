/**
 * Backfills accountCategory on ChartOfAccount rows created before that
 * field existed. Only touches accounts whose accountCode matches an
 * entry in STARTER_COA - genuinely custom accounts are left alone since
 * there's no safe way to guess their category.
 *
 * Usage:
 *   npx ts-node scripts/backfill-account-categories.ts
 */
import { PrismaClient } from '@prisma/client';
import { STARTER_COA } from '../src/modules/chart-of-accounts/constants/starter-coa.constant';

const prisma = new PrismaClient();

async function main() {
  const categoryByCode = new Map(
    STARTER_COA.map((a) => [a.accountCode, a.accountCategory as string]),
  );

  const uncategorized = await prisma.chartOfAccount.findMany({
    where: { accountCategory: null },
  });

  let updated = 0;
  for (const account of uncategorized) {
    const category = categoryByCode.get(account.accountCode);
    if (!category) continue;

    await prisma.chartOfAccount.update({
      where: { id: account.id },
      data: { accountCategory: category as any },
    });
    updated++;
    console.log(
      `  org ${account.organizationId}: ${account.accountCode} ${account.accountName} -> ${category}`,
    );
  }

  console.log(`Backfilled ${updated} of ${uncategorized.length} uncategorized accounts.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
