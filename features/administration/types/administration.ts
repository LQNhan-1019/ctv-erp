export type BusinessUnit = { id: string; code: string; name: string; unitType: string };
export type ExpenseBranch = { id: string; businessUnitId: string; code: string; name: string; active: boolean; sortOrder: number };
export type ExpenseDepartment = { id: string; branchId: string; code: string; name: string; active: boolean; sortOrder: number };
export type ExpenseItem = { id: string; departmentId: string; code: string; name: string; active: boolean; sortOrder: number };
export type ExpenseBranchInput = Omit<ExpenseBranch, 'id'>;
export type ExpenseDepartmentInput = Omit<ExpenseDepartment, 'id'>;
export type ExpenseItemInput = Omit<ExpenseItem, 'id'>;
export type ExpenseCategory = { id: string; parentId: string | null; parentName: string | null; code: string; name: string; active: boolean; sortOrder: number };
export type Expense = {
  id: string; expenseNo: string; businessUnitId: string; businessUnitCode: string; businessUnitName: string;
  expenseBranchId: string | null; expenseBranchName: string | null; expenseDepartmentId: string | null;
  expenseDepartmentName: string | null; expenseItemId: string | null; expenseItemName: string | null;
  expenseDate: string; categoryId: string | null; categoryCode: string | null; categoryName: string | null;
  groupName: string | null; expenseType: 'ADMINISTRATIVE' | 'HUMAN_RESOURCES'; costCenterType: string | null;
  costObjectName: string | null; workContent: string; quantity: number; unitName: string | null;
  plannedAmount: number; actualAmount: number; hasInvoice: boolean; invoiceCount: number; supplierContactNotes: string | null;
  status: ExpenseStatus; createdAt: string; updatedAt: string;
};
export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
export type ExpenseInput = Omit<Expense, 'id' | 'expenseNo' | 'businessUnitCode' | 'businessUnitName' | 'expenseBranchName' | 'expenseDepartmentName' | 'expenseItemName' | 'categoryCode' | 'categoryName' | 'groupName' | 'invoiceCount' | 'createdAt' | 'updatedAt'>;
export type ExpenseInvoice = { id: string; expenseId: string; fileName: string; contentType: string; fileSize: number; driveWebUrl: string | null; createdAt: string };
export type ExpenseDashboard = {
  fromMonth: string; toMonth: string; plannedTotal: number; actualTotal: number; variance: number; expenseCount: number;
  largestExpense: Expense | null; monthly: { month: string; plannedAmount: number; actualAmount: number }[];
  topCategories: { categoryId: string | null; categoryName: string; amount: number; percentage: number }[];
  byBusinessUnit: { businessUnitId: string; businessUnitName: string; amount: number }[];
};
export type DocumentType = { id: string; code: string; name: string; category: DocumentCategory; defaultReminderDays: number; active: boolean; sortOrder: number };
export type DocumentCategory = 'INSURANCE' | 'FIRE_SAFETY' | 'LICENSE' | 'INSPECTION' | 'CONTRACT' | 'CERTIFICATE' | 'OTHER';
export type ComplianceDocument = {
  id: string; businessUnitId: string; businessUnitCode: string; businessUnitName: string;
  documentTypeId: string; documentTypeCode: string; documentTypeName: string; documentCategory: DocumentCategory;
  documentNo: string; documentName: string; issuedBy: string | null; issuedOn: string | null; effectiveOn: string | null;
  expiresOn: string | null; reminderDaysBefore: number; responsibleEmployeeId: string | null;
  responsibleEmployeeName: string | null; status: DocumentStatus; expiryState: string; daysRemaining: number | null;
  fileUri: string | null; notes: string | null; createdAt: string; updatedAt: string;
};
export type DocumentStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'RENEWING' | 'REVOKED';
export type DocumentInput = {
  businessUnitId: string; documentTypeId: string; documentNo: string; documentName: string; issuedBy: string | null;
  issuedOn: string | null; effectiveOn: string | null; expiresOn: string | null; reminderDaysBefore: number;
  responsibleEmployeeId: string | null; status: DocumentStatus; fileUri: string | null; notes: string | null;
};
export type DocumentDashboard = {
  asOf: string; total: number; active: number; expiring: number; expired: number; withoutExpiry: number;
  alerts: ComplianceDocument[];
  byType: { typeId: string; typeName: string; total: number; expiring: number; expired: number }[];
};
export type AdministrativeImportPreview = {
  importType: 'EXPENSE' | 'DOCUMENT'; sheetName: string; totalRows: number; validRows: number; invalidRows: number;
  rows: Array<{ rowNumber: number; key: string | null; summary: string | null; valid: boolean; errors: string[] }>;
  warnings: string[];
};
export type AdministrativeImportResult = {
  runId: string; importType: 'EXPENSE' | 'DOCUMENT'; totalRows: number; importedRows: number; skippedRows: number; message: string;
};
export type BulkDeleteResult = { requested: number; deleted: number };
