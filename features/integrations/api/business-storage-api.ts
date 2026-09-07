import type { AuthorizedRequest } from '@/types/api';
import type {
  BusinessFunction,
  BusinessStorageBinding,
  BusinessStorageBindingInput,
} from '../types/business-storage';

export function listBusinessStorageFunctions(request: AuthorizedRequest) {
  return request<BusinessFunction[]>('/api/system/business-storage-bindings/functions');
}

export function listBusinessStorageBindings(request: AuthorizedRequest) {
  return request<BusinessStorageBinding[]>('/api/system/business-storage-bindings');
}

export function saveBusinessStorageBinding(
  request: AuthorizedRequest,
  navigationItemId: string,
  input: BusinessStorageBindingInput,
) {
  return request<BusinessStorageBinding>(
    '/api/system/business-storage-bindings/' + navigationItemId,
    { method: 'PUT', body: input },
  );
}
