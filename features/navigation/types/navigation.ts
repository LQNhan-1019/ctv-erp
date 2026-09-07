export type NavigationItem = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  route: string | null;
  icon: string | null;
  itemType: 'GROUP' | 'LINK' | 'ACTION';
  module: string;
  sortOrder: number;
  children: NavigationItem[];
};
