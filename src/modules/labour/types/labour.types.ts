/**
 * Labour Module Types & Interfaces
 */

// ==================== EMPLOYEE ====================

export interface IEmployee {
  id: number;
  organizationId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  salary: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeDto {
  organizationId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  salary: number;
}

export interface UpdateEmployeeDto {
  salary?: number;
  department?: string;
  position?: string;
  isActive?: boolean;
}

export interface EmployeeStats {
  employee: IEmployee;
  attendanceThisMonth: number;
  totalLeaves: number;
}

// ==================== ATTENDANCE ====================

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LEAVE = 'LEAVE',
  HALF_DAY = 'HALF_DAY',
}

export interface IAttendance {
  id: number;
  organizationId: number;
  employeeId: number;
  attendanceDate: Date;
  status: AttendanceStatus;
  hoursWorked?: number;
  remarks?: string;
  createdAt: Date;
}

export interface AttendanceRecord extends IAttendance {
  employee?: IEmployee;
}

export interface CreateAttendanceDto {
  organizationId: number;
  employeeId: number;
  attendanceDate: Date;
  status: AttendanceStatus;
  hoursWorked?: number;
  remarks?: string;
}

export interface AttendanceStats {
  month: number;
  year: number;
  total: number;
  present: number;
  absent: number;
  leave: number;
  attendancePercentage: number;
}

export interface BulkAttendanceUpdate {
  employeeId: number;
  date: Date;
  status: AttendanceStatus;
}

export interface OrganizationAttendanceStats {
  total: number;
  present: number;
  absent: number;
  leave: number;
  attendancePercentage: number;
}

// ==================== LEAVE ====================

export enum LeaveType {
  CASUAL = 'CASUAL',
  SICK = 'SICK',
  ANNUAL = 'ANNUAL',
  UNPAID = 'UNPAID',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface ILeave {
  id: number;
  organizationId: number;
  employeeId: number;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  daysUsed: number;
  approvalStatus: LeaveStatus;
  approvedBy?: number;
  createdAt: Date;
}

export interface LeaveRequest extends ILeave {
  employee?: IEmployee;
}

export interface CreateLeaveDto {
  organizationId: number;
  employeeId: number;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
}

export interface ApproveLeaveDto {
  approvedBy: number;
  reason?: string;
}

export interface LeaveBalance {
  employeeId: number;
  totalLeavesApproved: number;
  totalDaysUsed: number;
  leaves: ILeave[];
}

export interface LeaveDeductionBreakdown {
  casual: number;
  sick: number;
  annual: number;
  unpaid: number;
}

// ==================== BONUS ====================

export interface IBonus {
  id: number;
  organizationId: number;
  employeeId: number;
  bonusMonth: Date;
  bonusAmount: number;
  createdAt: Date;
}

export interface BonusRecord extends IBonus {
  employee?: IEmployee;
}

export interface CalculateBonusDto {
  organizationId: number;
  employeeId: number;
  month: number;
  year: number;
  baseBonus?: number;
}

export interface BonusBreakdown {
  noLeaveBonus: number;
  onTimeBonus: number;
  earlyBonus: number;
  deductions: number;
  totalBonus: number;
}

export interface MonthleBonusStats {
  month: number;
  year: number;
  totalBonuses: number;
  totalAmount: number;
  averageBonus: number;
  details: BonusRecord[];
}

export interface BonusDetails extends IBonus {
  breakdown: BonusBreakdown;
  attendanceData: {
    presentDays: number;
    leaveDays: number;
    absentDays: number;
    onTimeDays: number;
    earlyDays: number;
  };
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  count?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalCount: number;
}

// ==================== FILTERS & QUERIES ====================

export interface AttendanceFilter {
  organizationId: number;
  employeeId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: AttendanceStatus;
}

export interface LeaveFilter {
  organizationId: number;
  employeeId?: number;
  leaveType?: LeaveType;
  status?: LeaveStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface BonusFilter {
  organizationId: number;
  employeeId?: number;
  month?: number;
  year?: number;
}

// ==================== BULK OPERATIONS ====================

export interface BulkLeaveApprovalDto {
  leaveIds: number[];
  approvedBy: number;
}

export interface BulkBonusCalculationDto {
  organizationId: number;
  month: number;
  year: number;
  baseBonus?: number;
  employeeIds?: number[];
}

// ==================== DASHBOARD ====================

export interface LabourDashboardStats {
  totalStaff: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaves: number;
  approvedLeaves: number;
  averageAttendance: number;
  totalBonusThisMonth: number;
}

export interface EmployeeDashboardData {
  employee: IEmployee;
  attendanceThisMonth: AttendanceStats;
  leaveBalance: LeaveBalance;
  currentMonthBonus: IBonus;
  upcomingLeaves: LeaveRequest[];
}
