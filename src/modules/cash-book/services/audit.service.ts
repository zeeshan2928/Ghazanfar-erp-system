import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async addComment(organizationId: number, entryId: number, authorId: number, content: string) {
    const comment = await this.prisma.cashBookComment.create({
      data: {
        organizationId,
        entryId,
        author: authorId,
        content,
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log the action
    await this.prisma.cashBookAudit.create({
      data: {
        organizationId,
        entryId,
        action: 'COMMENT_ADDED',
        performedBy: authorId,
        details: JSON.stringify({ content }),
      },
    });

    return {
      id: comment.id,
      entryId: comment.entryId,
      author: `${comment.createdByUser.firstName} ${comment.createdByUser.lastName}`,
      content: comment.content,
      timestamp: comment.createdAt,
    };
  }

  async getComments(organizationId: number, entryId: number) {
    const comments = await this.prisma.cashBookComment.findMany({
      where: { organizationId, entryId },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map(c => ({
      id: c.id,
      entryId: c.entryId,
      author: `${c.createdByUser.firstName} ${c.createdByUser.lastName}`,
      content: c.content,
      timestamp: c.createdAt,
    }));
  }

  async deleteComment(organizationId: number, commentId: number) {
    const comment = await this.prisma.cashBookComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.organizationId !== organizationId) {
      throw new Error('Comment not found');
    }

    await this.prisma.cashBookComment.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted' };
  }

  async getAuditLog(organizationId: number, entryId: number) {
    const logs = await this.prisma.cashBookAudit.findMany({
      where: { organizationId, entryId },
      include: {
        performedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(log => ({
      id: log.id,
      entryId: log.entryId,
      action: log.action,
      by: `${log.performedByUser.firstName} ${log.performedByUser.lastName}`,
      timestamp: log.createdAt,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  async logAction(
    organizationId: number,
    entryId: number,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'COMMENT_ADDED',
    performedBy: number,
    details?: any,
  ) {
    return this.prisma.cashBookAudit.create({
      data: {
        organizationId,
        entryId,
        action,
        performedBy,
        details: details ? JSON.stringify(details) : null,
      },
    });
  }

  async getEntryAuditTrail(organizationId: number, entryId: number) {
    const entry = await this.prisma.cashBookEntry.findUnique({
      where: { id: entryId },
      include: {
        comments: {
          include: {
            createdByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          include: {
            performedByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        approval: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!entry || entry.organizationId !== organizationId) {
      throw new Error('Entry not found');
    }

    return {
      entry: {
        id: entry.id,
        referenceNumber: entry.referenceNumber,
        date: entry.date,
        amount: entry.amount,
        category: entry.category,
        description: entry.description,
        status: entry.status,
      },
      comments: entry.comments.map(c => ({
        id: c.id,
        author: `${c.createdByUser.firstName} ${c.createdByUser.lastName}`,
        content: c.content,
        timestamp: c.createdAt,
      })),
      auditLog: entry.auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        by: `${log.performedByUser.firstName} ${log.performedByUser.lastName}`,
        timestamp: log.createdAt,
      })),
      approval: entry.approval
        ? {
            status: entry.approval.status,
            comments: entry.approval.comments,
            approvedBy: entry.approval.approver
              ? `${entry.approval.approver.firstName} ${entry.approval.approver.lastName}`
              : null,
            approvedAt: entry.approval.approvedAt,
            rejectionReason: entry.approval.rejectionReason,
          }
        : null,
    };
  }
}
