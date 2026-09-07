export type View =
  | 'dashboard'
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'fleet'
  | 'finance'
  | 'hr'
  | 'tasks'
  | 'architecture';

export type Order = {
  id: string;
  customer: string;
  channel: string;
  warehouse: string;
  date: string;
  value: number;
  status: string;
  tone: string;
  items: number;
};

export type ModuleData = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: { label: string; value: string; note: string }[];
  activity: string[];
};