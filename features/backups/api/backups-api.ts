import type { AuthorizedRequest, PageResponse } from '@/types/api';
import type { BackupDestination, BackupJob } from '../types/backup';

export function listBackups(request: AuthorizedRequest, page = 0, size = 20) {
  return request<PageResponse<BackupJob>>('/api/system/backups?page=' + page + '&size=' + size);
}

export function createBackup(request: AuthorizedRequest, destination: BackupDestination, connectionId: string | null) {
  return request<BackupJob>('/api/system/backups', {
    method: 'POST',
    body: { destination, connectionId },
  });
}
