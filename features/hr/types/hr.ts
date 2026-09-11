export type Department = {
  id: string;
  parentId: string | null;
  parentName: string | null;
  code: string;
  name: string;
  unitType: 'COMPANY' | 'DEPARTMENT';
  active: boolean;
  employeeCount: number;
  amisLinked: boolean;
  lastSyncedAt: string | null;
};

export type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  authUserId: string | null;
  authUsername: string | null;
  businessUnitId: string;
  departmentCode: string;
  departmentName: string;
  jobTitleId: string | null;
  jobTitleName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  hiredOn: string;
  terminatedOn: string | null;
  employmentStatus: 'PROBATION' | 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  amisLinked: boolean;
  lastSyncedAt: string | null;
};

export type JobTitle = { id: string; code: string; name: string; active: boolean };
export type EmployeeAccountOption = {
  id: string;
  username: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  employeeId: string | null;
};
export type AmisHrSource = { id: string; code: string; name: string };
export type AmisHrSyncResult = {
  receivedDepartments: number;
  syncedDepartments: number;
  receivedJobPositions: number;
  syncedJobPositions: number;
  receivedEmployees: number;
  createdEmployees: number;
  updatedEmployees: number;
  relinkedAttendanceEvents: number;
  message: string;
};
export type AmisHrStructureDeleteResult = {
  clearedEmployeeLinks: number;
  clearedOrganizationLinks: number;
  clearedJobPositionLinks: number;
  deactivatedDepartments: number;
  deactivatedJobTitles: number;
  message: string;
};

export type DepartmentInput = { parentId: string | null; code: string; name: string; active: boolean };
export type EmployeeInput = {
  employeeCode: string;
  fullName: string;
  businessUnitId: string;
  jobTitleId: string | null;
  gender: Employee['gender'];
  dateOfBirth: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  hiredOn: string;
  terminatedOn: string | null;
  employmentStatus: Employee['employmentStatus'];
};
