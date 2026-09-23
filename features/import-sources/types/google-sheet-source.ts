export type GoogleSheetFeature = 'PERFORMANCE_DAILY' | 'ATTENDANCE' | 'ADMIN_EXPENSE' | 'ADMIN_DOCUMENT' | 'WORK_PLAN' | 'WORK_CATALOG';

export type GoogleSheetSource = {
  id: string;
  connectionId: string;
  connectionName: string;
  feature: GoogleSheetFeature;
  name: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string | null;
  active: boolean;
  lastSyncStatus: 'NOT_SYNCED' | 'SUCCESS' | 'FAILED';
  lastSyncMessage: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoogleSheetSourceInput = Pick<GoogleSheetSource, 'connectionId' | 'feature' | 'name' | 'spreadsheetUrl' | 'sheetName' | 'active'>;

export type ResolvedGoogleSheet = {
  sourceId: string;
  filename: string;
  workbookBase64: string;
  sheetName: string | null;
  sourceModifiedAt: string | null;
  fetchedAt: string;
  sheets: { name: string; rowCount: number; columnCount: number; rows: { number: number; cells: string[] }[] }[];
};

export type GoogleSheetSourceTest = {
  status: 'SUCCESS';
  filename: string;
  sourceModifiedAt: string | null;
  testedAt: string;
};
