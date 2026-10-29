export interface LeaveBalance {
  leaveTypeId: string; name: string; color: string; isPaid: boolean; unlimited: boolean; accrual: 'Yearly' | 'Monthly';
  yearlyAllowance: number | null; accrued: number; carried: number; adjusted: number; used: number; pending: number; available: number | null;
}
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type Half = 'First' | 'Second' | null;
export interface LeaveRequest {
  id: string; employeeId: string; employeeName: string; leaveTypeId: string; leaveTypeName: string; color: string;
  from: string; to: string; fromHalf: Half; toHalf: Half; days: number; reason: string | null; status: LeaveStatus;
  needsDocument: boolean; appliedByName: string | null; decidedByName: string | null; decidedAt: string | null;
  decisionNote: string | null; cancelledByName: string | null; createdAt: string; canCancel: boolean; canDecide: boolean;
}
export interface Holiday { id: string; date: string; name: string; isOptional: boolean; locationIds: string[]; }
export interface MyTimeOff {
  employeeId: string | null; name: string | null; year: number; yearLabel: string; yearStart: string; yearEnd: string;
  weekendDays: number[]; balances: LeaveBalance[]; requests: LeaveRequest[]; holidays: Holiday[];
  pendingApprovals: number; canApprove: boolean; canManage: boolean;
}
export interface LeaveTypeOption {
  id: string; name: string; color: string; allowHalfDay: boolean; isPaid: boolean; unlimited: boolean;
  documentAfterDays: number | null; description: string | null;
}
export interface PreviewDay { date: string; kind: string; days: number; name: string | null; }
export interface LeavePreview {
  days: number; breakdown: PreviewDay[]; unlimited: boolean; available: number | null; after: number | null;
  needsDocument: boolean; error: string | null; notes: string[];
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
export interface LeaveType {
  id: string; name: string; description: string | null; color: string; daysPerYear: number | null; accrual: 'Yearly' | 'Monthly';
  isPaid: boolean; allowHalfDay: boolean; carryForwardMax: number; documentAfterDays: number | null;
  employmentTypeIds: string[]; isActive: boolean; sortOrder: number; usedBy: number;
}
export type LeaveTypeInput = Omit<LeaveType, 'id' | 'sortOrder' | 'usedBy'>;
export interface LeaveSettings { weekendDays: number[]; yearStartMonth: number; yearLabel: string; yearStart: string; yearEnd: string; }
export interface HolidayInput { date: string; name: string; isOptional: boolean; locationIds: string[]; }
