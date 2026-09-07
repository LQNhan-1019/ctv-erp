export type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type AuditLog = {
  id: number;
  occurredAt: string;
  userId: string | null;
  username: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  oldData: JsonValue;
  newData: JsonValue;
  metadata: JsonValue;
};

export type AuditFilters = {
  page: number;
  size: number;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
};
