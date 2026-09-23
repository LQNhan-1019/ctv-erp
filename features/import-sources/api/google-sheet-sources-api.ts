import type { AuthorizedRequest } from '@/types/api';
import type { GoogleSheetFeature, GoogleSheetSource, GoogleSheetSourceInput, GoogleSheetSourceTest, ResolvedGoogleSheet } from '../types/google-sheet-source';

export const listAvailableGoogleSheets = (request: AuthorizedRequest, feature: GoogleSheetFeature) =>
  request<GoogleSheetSource[]>(`/api/import-sources/google-sheets?feature=${feature}`);

export const resolveGoogleSheet = (request: AuthorizedRequest, id: string, feature: GoogleSheetFeature) =>
  request<ResolvedGoogleSheet>(`/api/import-sources/google-sheets/${id}/resolve`, { method: 'POST', body: { feature } });

export const listGoogleSheetSources = (request: AuthorizedRequest) =>
  request<GoogleSheetSource[]>('/api/system/google-sheet-sources?includeInactive=true');

export const createGoogleSheetSource = (request: AuthorizedRequest, body: GoogleSheetSourceInput) =>
  request<GoogleSheetSource>('/api/system/google-sheet-sources', { method: 'POST', body });

export const updateGoogleSheetSource = (request: AuthorizedRequest, id: string, body: GoogleSheetSourceInput) =>
  request<GoogleSheetSource>(`/api/system/google-sheet-sources/${id}`, { method: 'PUT', body });

export const deleteGoogleSheetSource = (request: AuthorizedRequest, id: string) =>
  request<void>(`/api/system/google-sheet-sources/${id}`, { method: 'DELETE' });

export const testGoogleSheetSource = (request: AuthorizedRequest, id: string) =>
  request<GoogleSheetSourceTest>(`/api/system/google-sheet-sources/${id}/test`, { method: 'POST' });
