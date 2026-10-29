export interface LeaveBalance {
  leaveTypeId: string; name: string; color: string; isPaid: boolean; unlimited: boolean; accrual: 'Yearly' | 'Monthly';
  yearlyAllowance: number | null; accrued: number; carried: number; adjusted: number; used: number; pending: number; available: number | null;
  note: string | null; kind: LeaveKind;
}
export type LeaveKind = 'Regular' | 'CompOff' | 'OptionalHoliday';
export interface CompOffClaim {
  id: string; employeeId: string; employeeName: string; workedDate: string; workedLabel: string; days: number; reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'; expiresOn: string | null; appliedByName: string | null;
  decidedByName: string | null; decidedAt: string | null; decisionNote: string | null; canCancel: boolean; canDecide: boolean;
}
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type Half = 'First' | 'Second' | null;
export interface LeaveRequest {
  id: string; employeeId: string; employeeName: string; leaveTypeId: string; leaveTypeName: string; color: string;
  from: string; to: string; fromHalf: Half; toHalf: Half; days: number; reason: string | null; status: LeaveStatus;
  needsDocument: boolean; appliedByName: string | null; decidedByName: string | null; decidedAt: string | null;
  decisionNote: string | null; cancelledByName: string | null; createdAt: string; canCancel: boolean; canDecide: boolean;
  stage: number; firstApproverName: string | null; waitingFor: 'manager' | 'HR' | null; sandwichDays: number;
  attachmentName: string | null; canAttach: boolean; editNote?: string | null;
}
export interface MyStats { year: number; yearLabel: string; totalDays: number; months: { month: string; days: number }[]; byType: { name: string; color: string; days: number }[]; byWeekday: { month: string; days: number }[]; }
export interface LedgerEntry { date: string; kind: 'Carried' | 'Credited' | 'Adjusted' | 'Taken' | 'Booked' | 'Pending' | 'Earned'; label: string; days: number; running: number; detail: string | null; }
export interface TypeLedger { leaveTypeId: string; name: string; color: string; yearLabel: string; unlimited: boolean; entries: LedgerEntry[]; available: number | null; yearEnd: number | null; note: string | null; }
export interface Holiday { id: string; date: string; name: string; isOptional: boolean; locationIds: string[]; }
export interface MyTimeOff {
  employeeId: string | null; name: string | null; year: number; yearLabel: string; yearStart: string; yearEnd: string;
  weekendDays: number[]; balances: LeaveBalance[]; requests: LeaveRequest[]; holidays: Holiday[];
  pendingApprovals: number; canApprove: boolean; canManage: boolean; compOffEnabled: boolean; compOffs: CompOffClaim[];
}
export interface LeaveTypeOption {
  id: string; name: string; color: string; allowHalfDay: boolean; isPaid: boolean; unlimited: boolean;
  documentAfterDays: number | null; description: string | null;
  reasonRequired: boolean; noticeDays: number | null; approvalFlow: 'Manager' | 'ManagerThenHr' | 'Auto'; sandwich: boolean; kind: LeaveKind;
}
export interface PreviewDay { date: string; kind: string; days: number; name: string | null; }
export interface LeavePreview {
  days: number; breakdown: PreviewDay[]; unlimited: boolean; available: number | null; after: number | null;
  needsDocument: boolean; error: string | null; notes: string[]; yearEnd?: number | null;
}
export interface LeaveInput {
  employeeId?: string | null; leaveTypeId: string; from: string; to: string; fromHalf: Half; toHalf: Half; reason?: string | null;
}
export interface Adjustment { id: string; leaveTypeId: string; leaveTypeName: string; year: number; days: number; note: string; byName: string; at: string; }
export interface EmployeeTimeOff {
  employeeId: string; name: string; year: number; yearLabel: string; balances: LeaveBalance[];
  requests: LeaveRequest[]; adjustments: Adjustment[]; canAdjust: boolean;
}
export interface CalendarPerson { employeeId: string; name: string; designation: string | null; locationId: string | null; isMe: boolean; }
export interface CalendarEntry { employeeId: string; from: string; to: string; fromHalf: Half; toHalf: Half; days: number; status: LeaveStatus; label: string; color: string; }
export interface LeaveCalendar { from: string; to: string; weekendDays: number[]; people: CalendarPerson[]; entries: CalendarEntry[]; holidays: Holiday[]; canSeeAll: boolean; }
export type ApprovalFlow = 'Manager' | 'ManagerThenHr' | 'Auto';
export interface TenureStep { afterYears: number; extraDays: number; }
export interface LeaveRules {
  sandwichWeekends: boolean; sandwichHolidays: boolean; sandwichMinDays: number | null; sandwichAcrossRequests: boolean;
  minDaysPerRequest: number | null; maxDaysPerRequest: number | null; noticeDays: number | null; backdateDays: number | null;
  maxDaysPerMonth: number | null; eligibleAfterDays: number | null; negativeAllowed: number; reasonRequired: boolean;
  noClubWith: string[]; tenure: TenureStep[]; approvalFlow: ApprovalFlow;
}
export const NO_RULES: LeaveRules = {
  sandwichWeekends: false, sandwichHolidays: false, sandwichMinDays: null, sandwichAcrossRequests: false,
  minDaysPerRequest: null, maxDaysPerRequest: null, noticeDays: null, backdateDays: null, maxDaysPerMonth: null,
  eligibleAfterDays: null, negativeAllowed: 0, reasonRequired: false, noClubWith: [], tenure: [], approvalFlow: 'Manager',
};
export interface LeaveType {
  id: string; name: string; description: string | null; color: string; daysPerYear: number | null; accrual: 'Yearly' | 'Monthly';
  isPaid: boolean; allowHalfDay: boolean; carryForwardMax: number; documentAfterDays: number | null;
  employmentTypeIds: string[]; isActive: boolean; sortOrder: number; usedBy: number; rules: LeaveRules;
  kind: LeaveKind; expiryDays: number | null; claimWindowDays: number | null;
}
export type LeaveTypeInput = Omit<LeaveType, 'id' | 'sortOrder' | 'usedBy'>;
export interface LeaveSettings { weekendDays: number[]; yearStartMonth: number; yearLabel: string; yearStart: string; yearEnd: string; }
export interface HolidayInput { date: string; name: string; isOptional: boolean; locationIds: string[]; }
