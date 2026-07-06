export class CreateCommissionRuleDto {
  name: string;
  description?: string;
  ruleType: string; // PERCENTAGE, FIXED, TIERED
  percentage?: number;
  fixedAmount?: number;
  minSales?: number;
  maxSales?: number;
}

export class CalculateCommissionDto {
  ruleId: number;
  period: string; // MONTHLY, QUARTERLY, ANNUAL
  startDate: Date;
  endDate: Date;
  baseSales: number;
}

export class ApproveCommissionDto {
  notes?: string;
}

export class SetProductCommissionDto {
  productId: number;
  commissionRate: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}
