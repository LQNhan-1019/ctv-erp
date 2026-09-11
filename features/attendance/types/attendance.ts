export type AttendanceShift = {
  id: string; code: string; name: string; businessUnitId: string | null;
  businessUnitName: string | null; startTime: string; endTime: string;
  breakStartTime: string | null; breakEndTime: string | null; crossesMidnight: boolean;
  lateGraceMinutes: number; earlyLeaveGraceMinutes: number;
  fullDayMinutes: number; halfDayMinutes: number; active: boolean;
};
export type EmployeeOption = {
  id: string; employeeCode: string; fullName: string; businessUnitId: string;
  businessUnitName: string; jobTitle: string;
};
export type AttendanceSource = {
  id: string; code: string; type: 'AMIS_TIMESHEET' | 'ATTENDANCE_DEVICE';
  name: string; lastTestStatus: string; lastTestedAt: string | null;
};
export type DailyAttendance = {
  recordId: string; workDate: string; shiftId: string | null; shiftName: string | null;
  scheduledStart: string | null; scheduledEnd: string | null;
  checkIn: string | null; checkOut: string | null; workedMinutes: number;
  lateMinutes: number; earlyLeaveMinutes: number; payableDays: number;
  workCode: string | null; status: string; sourceType: string; manuallyAdjusted: boolean;
};
export type EmployeeTimesheet = {
  employeeId: string; employeeCode: string; fullName: string;
  departmentCode: string; departmentName: string; jobTitle: string;
  days: DailyAttendance[]; actualWorkDays: number; paidLeaveDays: number;
  holidayDays: number; holidayWorkDays: number; unpaidLeaveDays: number;
  maternityDays: number; weeklyOffWorkDays: number; payrollDays: number;
};
export type Timesheet = { month: string; daysInMonth: number; employees: EmployeeTimesheet[] };
export type AttendanceIssue = {
  recordId: string; workDate: string; employeeId: string; employeeCode: string;
  employeeName: string; departmentName: string; status: string; description: string;
};
export type AttendanceDashboard = {
  month: string; totalEmployees: number; lateEmployees: number; lateOccurrences: number;
  missingCheckIns: number; missingCheckOuts: number; absences: number;
  totalPayableDays: number; issues: AttendanceIssue[];
  departments: Array<{ departmentCode: string; departmentName: string; employees: number; lateOccurrences: number; missingPunches: number; absences: number }>;
};
export type ScheduleRule = {
  id: string; name: string; shiftId: string; shiftName: string;
  recurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  fromDate: string; toDate: string; weekDays: number[]; dayOfMonth: number | null;
  weekPosition: 'FIRST' | 'LAST' | null; monthOfYear: number | null;
  employeeCount: number; assignedDays: number; active: boolean;
};
export type WorkbookMapping = {
  sheetName: string; companyNameCell: string; taxCodeCell: string; departmentNameCell: string; monthCell: string; yearCell: string;
  employeeNumberCell: string; employeeCodeCell: string; employeeNameCell: string; jobTitleCell: string;
  dayOneCell: string; actualWorkDaysCell: string; paidLeaveDaysCell: string; holidayDaysCell: string;
  holidayWorkDaysCell: string; unpaidLeaveDaysCell: string; maternityDaysCell: string;
  weeklyOffWorkDaysCell: string; payrollDaysCell: string;
};
export type ExportTemplate = {
  id: string; name: string; filename: string; workbookSize: number;
  mapping: WorkbookMapping; updatedAt: string;
};
export type WorkbookPreview = {
  templateId: string; sheetName: string; rowCount: number; columnCount: number;
  cells: string[][]; mappings: Record<string, string>;
};
export type AttendanceImportRow = {
  rowNumber: number; externalAttendanceId: string | null; employeeCode: string; workDate: string | null; checkIn: string | null; checkOut: string | null;
  shiftCode: string | null; dayType: string; notes: string | null; valid: boolean; errors: string[];
};
export type AttendanceImportPreview = {
  filename: string; sheetName: string; detectedMode: 'AUTO' | 'STANDARD' | 'AMIS_RAW'; totalRows: number;
  validRows: number; invalidRows: number; rows: AttendanceImportRow[]; warnings: string[];
};
export type AttendanceImportResult = {
  runId: string; filename: string; sheetName: string; totalRows: number; importedRows: number;
  skippedRows: number; recalculatedDays: number; message: string;
};
export type AttendanceIdentifier = {
  id: string; connectionId: string; externalAttendanceId: string; employeeId: string;
  employeeCode: string; employeeName: string; sourceEmployeeCode: string | null; sourceEmployeeName: string | null;
};
export type AttendanceDeleteResult = {
  deletedEvents: number; recalculatedDays: number; fromDate: string; toDate: string; message: string;
};
export type DeviceEmployeePushFailure = {
  employeeId: string | null; employeeCode: string | null; attendanceId: string | null; message: string;
};
export type DeviceEmployeePushResult = {
  connectionId: string; requested: number; pushed: number; failed: number;
  failures: DeviceEmployeePushFailure[]; message: string;
};
