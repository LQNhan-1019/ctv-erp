export type BusinessFunction = {
  navigationItemId: string;
  code: string;
  label: string;
  module: string;
  route: string;
};

export type BusinessStorageBinding = {
  id: string;
  navigationItemId: string;
  functionCode: string;
  functionLabel: string;
  module: string;
  connectionId: string;
  connectionCode: string;
  connectionName: string;
  connectionActive: boolean;
  folderCode: string;
  folderName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BusinessStorageBindingInput = {
  connectionId: string;
  folderCode: string;
  folderName: string;
  active: boolean;
};
