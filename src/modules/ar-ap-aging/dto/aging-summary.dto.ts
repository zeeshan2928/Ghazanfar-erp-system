export class AgingBucketDto {
  bucket: string; // 0-30, 31-60, 61-90, 90+
  count: number;
  totalAmount: number; // in cents
}

export class ArAgingSummaryDto {
  customerId?: number;
  customerName?: string;
  buckets: AgingBucketDto[]; // Buckets: 0-10, 10-20, 20-30, 30+ days
  totalOutstanding: number; // in cents
  asOfDate: string; // ISO date
}

export class ApAgingSummaryDto {
  vendorId?: number;
  vendorName?: string;
  buckets: AgingBucketDto[];
  totalOutstanding: number; // in cents
  asOfDate: string; // ISO date
}

export class ArApAgingReportDto {
  organizationId: number;
  reportDate: string; // ISO date
  arSummaries: ArAgingSummaryDto[];
  apSummaries: ApAgingSummaryDto[];
  totalArOutstanding: number; // in cents
  totalApOutstanding: number; // in cents
}
