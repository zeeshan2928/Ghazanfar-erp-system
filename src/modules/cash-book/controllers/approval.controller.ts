import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { ApprovalService } from '../services/approval.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('cash-book/entries')
@UseGuards(JwtGuard)
export class ApprovalController {
  constructor(private readonly service: ApprovalService) {}

  /**
   * GET /cash-book/entries/approval
   * Get entries pending approval
   */
  @Get('approval')
  async getEntriesPendingApproval(
    @OrgContext() orgContext: any,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    return this.service.getEntriesPendingApproval(orgContext.organizationId, status);
  }

  /**
   * POST /cash-book/entries/approve
   * Submit approval for an entry
   */
  @Post('approve')
  async submitApproval(
    @Body()
    body: {
      entryId: number;
      status: 'APPROVED' | 'REJECTED';
      comments?: string;
      rejectionReason?: string;
    },
    @OrgContext() orgContext: any,
  ) {
    return this.service.submitApproval(
      orgContext.organizationId,
      body.entryId,
      orgContext.userId,
      body.status,
      body.comments,
      body.rejectionReason,
    );
  }

  /**
   * POST /cash-book/entries/approve/bulk
   * Approve multiple entries
   */
  @Post('approve/bulk')
  async approveBulk(
    @Body()
    body: {
      entryIds: number[];
      comments?: string;
    },
    @OrgContext() orgContext: any,
  ) {
    return this.service.approveBulk(
      orgContext.organizationId,
      body.entryIds,
      orgContext.userId,
      body.comments,
    );
  }

  /**
   * GET /cash-book/entries/approval/stats
   * Get approval statistics
   */
  @Get('approval/stats')
  async getApprovalStats(@OrgContext() orgContext: any) {
    return this.service.getPendingApprovalStats(orgContext.organizationId);
  }
}
