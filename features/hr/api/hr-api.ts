import type { ApiRequestOptions } from '@/lib/api/client';
import type {
  AmisHrSource, AmisHrStructureDeleteResult, AmisHrSyncResult, Department, DepartmentInput,
  Employee, EmployeeAccountOption, EmployeeInput, JobTitle,
} from '../types/hr';

type Request = <T>(path: string, options?: ApiRequestOptions) => Promise<T>;

export const listDepartments = (request: Request) =>
  request<Department[]>('/api/hr/departments?includeInactive=false');
export const createDepartment = (request: Request, body: DepartmentInput) =>
  request<Department>('/api/hr/departments', { method: 'POST', body });
export const updateDepartment = (request: Request, id: string, body: DepartmentInput) =>
  request<Department>(`/api/hr/departments/${id}`, { method: 'PUT', body });
export const listHrEmployees = (request: Request, search = '', departmentId = '', status = '') => {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (departmentId) query.set('departmentId', departmentId);
  if (status) query.set('status', status);
  return request<Employee[]>('/api/hr/employees?' + query);
};
export const createEmployee = (request: Request, body: EmployeeInput) =>
  request<Employee>('/api/hr/employees', { method: 'POST', body });
export const updateEmployee = (request: Request, id: string, body: EmployeeInput) =>
  request<Employee>(`/api/hr/employees/${id}`, { method: 'PUT', body });
export const deleteEmployee = (request: Request, id: string) =>
  request<void>(`/api/hr/employees/${id}`, { method: 'DELETE' });
export const deleteEmployees = (request: Request, ids: string[]) =>
  request<{ requested: number; deleted: number }>('/api/hr/employees/bulk-delete', {
    method: 'POST', body: { ids },
  });
export const getMyEmployee = (request: Request) =>
  request<Employee | undefined>('/api/hr/employees/me');
export const listEmployeeAccountOptions = (request: Request) =>
  request<EmployeeAccountOption[]>('/api/hr/employee-accounts');
export const linkEmployeeAccount = (request: Request, employeeId: string, userId: string) =>
  request<Employee>(`/api/hr/employees/${employeeId}/account`, { method: 'PUT', body: { userId } });
export const unlinkEmployeeAccount = (request: Request, employeeId: string) =>
  request<void>(`/api/hr/employees/${employeeId}/account`, { method: 'DELETE' });
export const listJobTitles = (request: Request) => request<JobTitle[]>('/api/hr/job-titles');
export const listAmisHrSources = (request: Request) =>
  request<AmisHrSource[]>('/api/hr/amis-hr/sources');
export const syncAmisHr = (request: Request, connectionId: string) =>
  request<AmisHrSyncResult>(`/api/hr/amis-hr/${connectionId}/sync`, { method: 'POST' });
export const refreshAmisHr = (request: Request, connectionId: string) =>
  request<AmisHrSyncResult>(`/api/hr/amis-hr/${connectionId}/refresh`, { method: 'POST' });
export const deleteAmisHrStructure = (request: Request, connectionId: string) =>
  request<AmisHrStructureDeleteResult>(`/api/hr/amis-hr/${connectionId}/structure`, { method: 'DELETE' });
