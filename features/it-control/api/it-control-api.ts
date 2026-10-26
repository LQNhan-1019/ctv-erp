import type { AuthorizedRequest } from '@/types/api';
import type { AgentCommand, DeviceEmployeeOption, DeviceUpdateInput, EnrollmentToken, ItAlert, ItDashboard, ItDevice, ItEvent, ItPolicy, PolicyInput } from '../types/it-control';

export const getItDashboard = (request: AuthorizedRequest) =>
  request<ItDashboard>('/api/it/control/dashboard');

export const listItDevices = (request: AuthorizedRequest, query = '', status = '') => {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (status) params.set('status', status);
  return request<ItDevice[]>('/api/it/control/devices?' + params);
};
export const listDeviceEmployees = (request: AuthorizedRequest) =>
  request<DeviceEmployeeOption[]>('/api/it/control/device-employees');
export const updateItDevice = (request: AuthorizedRequest, id: string, body: DeviceUpdateInput) =>
  request<ItDevice>(`/api/it/control/devices/${id}`, { method: 'PATCH', body });
export const listDeviceCommands = (request: AuthorizedRequest, id: string) =>
  request<AgentCommand[]>(`/api/it/control/devices/${id}/commands`);
export const sendFileToDevice = (request: AuthorizedRequest, id: string, file: File, note = '') => {
  const body = new FormData(); body.set('file', file); if (note.trim()) body.set('note', note.trim());
  return request<AgentCommand>(`/api/it/control/devices/${id}/files`, { method: 'POST', body });
};
export const queueAgentUpdate = (request: AuthorizedRequest, id: string) =>
  request<AgentCommand>(`/api/it/control/devices/${id}/agent-update`, { method: 'POST' });

export const listItEvents = (request: AuthorizedRequest, deviceId = '', eventType = '', severity = '') => {
  const params = new URLSearchParams({ limit: '200' });
  if (deviceId) params.set('deviceId', deviceId);
  if (eventType) params.set('eventType', eventType);
  if (severity) params.set('severity', severity);
  return request<ItEvent[]>('/api/it/control/events?' + params);
};

export const listItPolicies = (request: AuthorizedRequest) =>
  request<ItPolicy[]>('/api/it/control/policies?includeInactive=true');
export const createItPolicy = (request: AuthorizedRequest, body: PolicyInput) =>
  request<ItPolicy>('/api/it/control/policies', { method: 'POST', body });
export const updateItPolicy = (request: AuthorizedRequest, id: string, body: PolicyInput) =>
  request<ItPolicy>(`/api/it/control/policies/${id}`, { method: 'PUT', body });

export const listItAlerts = (request: AuthorizedRequest) =>
  request<ItAlert[]>('/api/it/control/alerts?limit=200');
export const updateItAlertStatus = (request: AuthorizedRequest, id: string, status: 'ACKNOWLEDGED' | 'RESOLVED') =>
  request<ItAlert>(`/api/it/control/alerts/${id}/status`, { method: 'POST', body: { status } });

export const listEnrollmentTokens = (request: AuthorizedRequest) =>
  request<EnrollmentToken[]>('/api/it/control/enrollment-tokens');
export const createEnrollmentToken = (request: AuthorizedRequest, body: { label: string; expiresAt: string; maxUses: number }) =>
  request<EnrollmentToken>('/api/it/control/enrollment-tokens', { method: 'POST', body });
export const revokeEnrollmentToken = (request: AuthorizedRequest, id: string) =>
  request<void>(`/api/it/control/enrollment-tokens/${id}`, { method: 'DELETE' });
