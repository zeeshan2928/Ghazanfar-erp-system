import { SetMetadata } from '@nestjs/common';

export const RequirePermission = (permission: string) => SetMetadata('requiredPermission', permission);

// Usage examples:
// @Post()
// @RequirePermission('Bill:CREATE')
// async createBill() { }
//
// @Put(':id')
// @RequirePermission('Bill:UPDATE')
// async updateBill() { }
//
// @Delete(':id')
// @RequirePermission('Bill:DELETE')
// async deleteBill() { }
