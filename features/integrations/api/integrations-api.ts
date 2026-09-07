import type { AuthorizedRequest } from '@/types/api';
import type { ConnectionTestResponse, IntegrationConnection, IntegrationConnectionInput } from '../types/integration';

export function listIntegrationConnections(request: AuthorizedRequest, includeInactive = true) {
  return request<IntegrationConnection[]>('/api/system/integration-connections?includeInactive=' + includeInactive);
}

export function createIntegrationConnection(request: AuthorizedRequest, input: IntegrationConnectionInput) {
  return request<IntegrationConnection>('/api/system/integration-connections', { method: 'POST', body: input });
}

export function updateIntegrationConnection(request: AuthorizedRequest, id: string, input: IntegrationConnectionInput) {
  const { name, description, configuration, secretRefs, active } = input;
  return request<IntegrationConnection>('/api/system/integration-connections/' + id, {
    method: 'PUT',
    body: { name, description, configuration, secretRefs, active },
  });
}

export function testIntegrationConnection(request: AuthorizedRequest, id: string) {
  return request<ConnectionTestResponse>('/api/system/integration-connections/' + id + '/test', { method: 'POST' });
}
