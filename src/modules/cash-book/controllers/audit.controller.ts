import { Controller, Post, Get, Delete, Body, UseGuards, Param } from '@nestjs/common';
import { AuditService } from '../services/audit.service';
import { JwtGuard } from '@common/guards/jwt.guard';
import { ActionPermissionGuard } from '@common/guards/action-permission.guard';
import { RequireAction } from '@common/decorators/require-action.decorator';
import { OrgContext } from '@common/decorators/org-context.decorator';

@Controller('cash-book/entries')
@UseGuards(JwtGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  /**
   * POST /cash-book/entries/:id/comments
   * Add a comment to an entry
   */
  @Post(':id/comments')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.edit')
  async addComment(
    @Param('id') entryId: string,
    @Body() body: { content: string },
    @OrgContext() orgContext: any,
  ) {
    return this.service.addComment(
      orgContext.organizationId,
      parseInt(entryId, 10),
      orgContext.userId,
      body.content,
    );
  }

  /**
   * GET /cash-book/entries/:id/comments
   * Get all comments for an entry
   */
  @Get(':id/comments')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.view')
  async getComments(@Param('id') entryId: string, @OrgContext() orgContext: any) {
    return this.service.getComments(orgContext.organizationId, parseInt(entryId, 10));
  }

  /**
   * DELETE /cash-book/entries/:id/comments/:commentId
   * Delete a comment
   */
  @Delete(':id/comments/:commentId')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.edit')
  async deleteComment(
    @Param('id') entryId: string,
    @Param('commentId') commentId: string,
    @OrgContext() orgContext: any,
  ) {
    return this.service.deleteComment(orgContext.organizationId, parseInt(commentId, 10));
  }

  /**
   * GET /cash-book/entries/:id/audit
   * Get full audit trail for an entry
   */
  @Get(':id/audit')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.view')
  async getAuditTrail(@Param('id') entryId: string, @OrgContext() orgContext: any) {
    return this.service.getEntryAuditTrail(orgContext.organizationId, parseInt(entryId, 10));
  }

  /**
   * GET /cash-book/entries/:id/audit/log
   * Get audit log events for an entry
   */
  @Get(':id/audit/log')
  @UseGuards(ActionPermissionGuard)
  @RequireAction('cash_book.view')
  async getAuditLog(@Param('id') entryId: string, @OrgContext() orgContext: any) {
    return this.service.getAuditLog(orgContext.organizationId, parseInt(entryId, 10));
  }
}
