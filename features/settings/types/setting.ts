export type SystemSetting = {
  key: string;
  groupCode: string;
  displayName: string;
  description: string | null;
  valueType: 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN';
  value: string;
  minNumeric: number | null;
  maxNumeric: number | null;
  maxLength: number | null;
  valueFormat: string | null;
  editable: boolean;
  active: boolean;
  updatedAt: string;
};
