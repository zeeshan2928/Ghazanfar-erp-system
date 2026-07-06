import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class ApprovalService {
  constructor(private prisma: PrismaService) {}

  async getEntriesPendingApproval(
    organizationId: number,
    status?: 'pending' | 'approved' | 'rejected',
  ) {
    const whereClause: any = { organizationId };

    if (status) {
      whereClause.approval = {
        status: status === 'pending' ? 'PENDING' : status === 'approved' ? 'APPROVED' : 'REJECTED',
      };
    }

    const entries = await this.prisma.cashBookEntry.findMany({
      where: whereClause,
      include: {
        approval: true,
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return entries.map(entry => ({
      id: entry.id,
      referenceNumber: entry.referenceNumber,
      date: entry.date,
      amount: entry.amount,
      category: entry.category,
      description: entry.description,
      status: entry.approval?.status || 'PENDING',
      approval: entry.approval,
    }));
  }

  async submitApproval(
    organizationId: number,
    entryId: number,
    approverId: number,
    status: 'APPROVED' | 'REJECTED',
    comments?: string,
    rejectionReason?: string,
  ) {
    const approval = await this.prisma.cashBookApproval.upsert({
      where: {
        entryId,
      },
      update: {
        status,
        comments,
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason,
      },
      create: {
        organizationId,
        entryId,
        status,
        comments,
        approvedBy: approverId,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
      },
      include: {
        approver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log the action
    await this.prisma.cashBookAudit.create({
      data: {
        organizationId,
        entryId,
        action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
        performedBy: approverId,
        details: JSON.stringify({ comments, rejectionReason }),
      },
    });

    return approval;
  }

  async approveBulk(
    organizationId: number,
    entryIds: number[],
    approverId: number,
    comments?: string,
  ) {
    const approvals = await Promise.all(
      entryIds.map(entryId =>
        this.submitApproval(organizationId, entryId, approverId, 'APPROVED', comments),
      ),
    );

    return {
      message: `${approvals.length} entries approved`,
      count: approvals.length,
    };
  }

  async getPendingApprovalStats(organizationId: number) {
    const stats = await this.prisma.cashBookApproval.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 },
    );
  }
}
