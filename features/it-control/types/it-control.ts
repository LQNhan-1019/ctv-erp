export type ItDevice = {
  id: string; deviceUid: string; hostname: string; displayName?: string;
  osEdition?: string; osVersion?: string; osBuild?: string; agentVersion?: string;
  ipAddress?: string; macAddress?: string; assignedEmployeeId?: string;
  assignedEmployeeName?: string; businessUnitId?: string; businessUnitName?: string;
  status: 'ENROLLED' | 'ONLINE' | 'OFFLINE' | 'DISABLED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; lastSeenAt?: string;
  lastPolicySyncAt?: string; active: boolean; metadata: Record<string, unknown>;
};

export type DeviceEmployeeOption = {
  id: string; employeeCode: string; fullName: string;
  businessUnitId: string; businessUnitName: string; employmentStatus: string;
};

export type DeviceUpdateInput = {
  displayName: string | null;
  assignedEmployeeId: string | null;
  businessUnitId: string | null;
  active: boolean;
};

export type ItEvent = {
  id: string; deviceId: string; deviceName: string; eventType: string; occurredAt: string;
  username?: string; processName?: string; sourcePath?: string; destination?: string;
  fileName?: string; fileExtension?: string; fileSizeBytes?: number; transport?: string;
  policyAction: string; severity: string; blocked: boolean; metadata: Record<string, unknown>;
};

export type ItAlert = {
  id: string; deviceId: string; deviceName: string; title: string; message: string;
  severity: string; status: string; acknowledgedAt?: string; createdAt: string;
};

export type ItPolicy = {
  id: string; code: string; name: string; description?: string; eventType?: string;
  action: 'AUDIT' | 'WARN' | 'BLOCK'; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scopeType: 'ALL' | 'BUSINESS_UNIT' | 'DEVICE'; businessUnitId?: string;
  businessUnitName?: string; deviceId?: string; deviceName?: string;
  conditions: Record<string, unknown>; priority: number; active: boolean;
  createdAt: string; updatedAt: string;
};

export type ItDashboard = {
  totalDevices: number; onlineDevices: number; offlineDevices: number;
  openAlerts: number; blockedToday: number; eventsToday: number;
  recentEvents: ItEvent[]; recentAlerts: ItAlert[];
};

export type EnrollmentToken = {
  id: string; label: string; tokenPrefix: string; expiresAt: string;
  maxUses: number; usedCount: number; revoked: boolean; createdAt: string; token?: string;
};

export type AgentCommand = {
  id: string; deviceId: string; deviceName: string;
  commandType: 'DELIVER_FILE' | 'UPDATE_AGENT'; fileName: string; contentType: string;
  fileSizeBytes: number; fileSha256: string; note?: string; targetVersion?: string;
  status: 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  expiresAt: string; startedAt?: string; completedAt?: string;
  resultMessage?: string; createdAt: string;
};

export type PolicyInput = Omit<ItPolicy, 'id' | 'businessUnitName' | 'deviceName' | 'createdAt' | 'updatedAt'>;
