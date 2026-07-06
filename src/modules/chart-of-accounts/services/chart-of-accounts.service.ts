import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { STARTER_COA } from '../constants/starter-coa.constant';

@Injectable()
export class ChartOfAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: number, createDto: CreateAccountDto) {
    // Validate account code uniqueness within organization
    const existing = await this.prisma.chartOfAccount.findFirst({
      where: {
        organizationId,
        accountCode: createDto.accountCode,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Account code ${createDto.accountCode} already exists in this organization`,
      );
    }

    // Validate parent account exists and belongs to same org if provided
    if (createDto.parentAccountId) {
      const parent = await this.prisma.chartOfAccount.findFirst({
        where: {
          id: createDto.parentAccountId,
          organizationId,
        },
      });

      if (!parent) {
        throw new BadRequestException('Parent account not found');
      }
    }

    return this.prisma.chartOfAccount.create({
      data: {
        organizationId,
        ...createDto,
      },
    });
  }

  async findAll(organizationId: number) {
    return this.prisma.chartOfAccount.findMany({
      where: { organizationId, isActive: true },
      orderBy: { accountCode: 'asc' },
    });
  }

  async findOne(organizationId: number, id: number) {
    return this.prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
    });
  }

  async update(
    organizationId: number,
    id: number,
    updateDto: UpdateAccountDto,
  ) {
    const account = await this.findOne(organizationId, id);
    if (!account) {
      throw new BadRequestException('Account not found');
    }

    // Prevent changing account type if it has postings
    if (updateDto.accountType && updateDto.accountType !== account.accountType) {
      const hasPostings = await this.prisma.gLPosting.findFirst({
        where: { accountId: id },
      });

      if (hasPostings) {
        throw new BadRequestException(
          'Cannot change account type when account has postings',
        );
      }
    }

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(organizationId: number, id: number) {
    const account = await this.findOne(organizationId, id);
    if (!account) {
      throw new BadRequestException('Account not found');
    }

    // Check if account has child accounts
    const hasChildren = await this.prisma.chartOfAccount.findFirst({
      where: { parentAccountId: id },
    });

    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete account with child accounts',
      );
    }

    // Check if account has postings or journal lines
    const [hasPostings, hasLines] = await Promise.all([
      this.prisma.gLPosting.findFirst({ where: { accountId: id } }),
      this.prisma.journalEntryLine.findFirst({ where: { accountId: id } }),
    ]);

    if (hasPostings || hasLines) {
      throw new BadRequestException(
        'Cannot delete account with postings or journal entries. Deactivate instead.',
      );
    }

    // Soft delete
    return this.prisma.chartOfAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async seedStarterCoA(organizationId: number) {
    // Check if org already has accounts
    const existing = await this.prisma.chartOfAccount.findFirst({
      where: { organizationId },
    });

    if (existing) {
      throw new BadRequestException(
        'Organization already has chart of accounts',
      );
    }

    // Create all starter accounts in a transaction
    const accountMap = new Map<string, number>();
    let createdCount = 0;

    // First pass: create accounts with no parent
    for (const account of STARTER_COA) {
      if (!account.parentAccountId) {
        const created = await this.prisma.chartOfAccount.create({
          data: {
            organizationId,
            accountCode: account.accountCode,
            accountName: account.accountName,
            accountType: account.accountType as any,
            description: account.description,
          },
        });
        accountMap.set(account.accountCode, created.id);
        createdCount++;
      }
    }

    // Second pass: create accounts with parents (if any)
    for (const account of STARTER_COA) {
      if (account.parentAccountId) {
        const created = await this.prisma.chartOfAccount.create({
          data: {
            organizationId,
            accountCode: account.accountCode,
            accountName: account.accountName,
            accountType: account.accountType as any,
            description: account.description,
            parentAccountId: accountMap.get(account.parentAccountId as any),
          },
        });
        accountMap.set(account.accountCode, created.id);
        createdCount++;
      }
    }

    return { created: createdCount };
  }

  async getAccountsForOrganization(organizationId: number) {
    return this.prisma.chartOfAccount.findMany({
      where: { organizationId, isActive: true },
      include: {
        childAccounts: {
          where: { isActive: true },
        },
      },
      orderBy: { accountCode: 'asc' },
    });
  }
}
