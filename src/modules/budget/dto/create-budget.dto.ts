export class CreateBudgetDto {
  accountId: number;
  fiscalYear: number;
  period: string; // MONTHLY, QUARTERLY, ANNUAL
  budgetAmount: number; // in cents
  notes?: string;
}

export class UpdateBudgetDto {
  budgetAmount?: number;
  notes?: string;
}

export class BudgetVarianceDto {
  accountId: number;
  accountCode: string;
  accountName: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number; // actual - budget
  variancePercent: number; // (variance / budget) * 100
}
