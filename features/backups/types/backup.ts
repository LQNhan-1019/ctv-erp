export type BackupDestination = 'DOWNLOAD' | 'FILE_SERVER' | 'GOOGLE_DRIVE';
export type BackupStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export type BackupJob = {
  id: string;
  destination: BackupDestination;
  connectionId: string | null;
  status: BackupStatus;
  encryptedFileName: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  encryptionAlgorithm: string | null;
  remoteFileId: string | null;
  remoteWebUrl: string | null;
  errorMessage: string | null;
  requestedBy: string;
  startedAt: string;
  completedAt: string | null;
  downloadAvailable: boolean;
};
