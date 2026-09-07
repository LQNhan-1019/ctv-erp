export type ConnectionType =
  | 'SMTP'
  | 'FILE_SERVER'
  | 'GOOGLE_DRIVE'
  | 'AMIS_TIMESHEET'
  | 'AMIS_ACCOUNTING';
export type ConnectionTestStatus = 'NOT_TESTED' | 'SUCCESS' | 'FAILED';

export type IntegrationConnection = {
  id: string;
  code: string;
  connectionType: ConnectionType;
  name: string;
  description: string | null;
  configuration: Record<string, string>;
  secretRefs: Record<string, string>;
  active: boolean;
  lastTestStatus: ConnectionTestStatus;
  lastTestMessage: string | null;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationConnectionInput = {
  code?: string;
  connectionType?: ConnectionType;
  name: string;
  description: string;
  configuration: Record<string, string>;
  secretRefs: Record<string, string>;
  active: boolean;
};

export type ConnectionTestResponse = {
  status: ConnectionTestStatus;
  message: string;
  testedAt: string;
};
