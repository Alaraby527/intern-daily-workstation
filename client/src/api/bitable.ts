import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend, safeApiCall, extractErrorMessage } from './http-utils';
import type {
  BitableTableDef,
  BusinessRecord,
  BusinessRecordListResponse,
  CreateBusinessRecordRequest,
  FeishuBitableConfig,
  FeishuSyncStatusResponse,
  UpdateFeishuConfigRequest,
  SheetTableDef,
  SheetRecord,
  SheetRecordListResponse,
  CreateSheetRecordRequest,
} from '@shared/api.interface';

export async function getTables(): Promise<BitableTableDef[]> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.get('/api/bitable/tables');
    return res.data;
  }, 'getTables');
}

export async function getTable(tableKey: string): Promise<BitableTableDef> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.get(`/api/bitable/tables/${tableKey}`);
    return res.data;
  }, `getTable:${tableKey}`);
}

export async function getSyncStatus(): Promise<FeishuSyncStatusResponse> {
  try {
    const res = await axiosForBackend.get('/api/bitable/sync-status');
    return res.data;
  } catch (error) {
    const msg = extractErrorMessage(error);
    logger.error('获取同步状态失败', msg);
    return { enabled: false, configured: false };
  }
}

export async function getFeishuConfig(): Promise<FeishuBitableConfig | null> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.get('/api/bitable/config');
    return res.data;
  }, 'getFeishuConfig');
}

export async function saveFeishuConfig(
  dto: UpdateFeishuConfigRequest,
): Promise<{ id: string; success: boolean }> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.post('/api/bitable/config', dto);
    return res.data;
  }, 'saveFeishuConfig');
}

export async function createRecord(
  dto: CreateBusinessRecordRequest,
): Promise<{ id: string; success: boolean; synced: boolean; syncError?: string }> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.post('/api/bitable/records', dto);
    return res.data;
  }, 'createRecord');
}

export async function getRecordsByTask(taskId: string): Promise<BusinessRecordListResponse> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.get('/api/bitable/records', {
      params: { taskId },
    });
    return res.data;
  }, `getRecordsByTask:${taskId}`);
}

export async function getRecordsByInternAndDate(
  internName: string,
  recordDate: string,
  tableKey?: string,
): Promise<BusinessRecordListResponse> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.get('/api/bitable/records', {
      params: { internName, recordDate, tableKey },
    });
    return res.data;
  }, `getRecordsByInternAndDate:${internName}_${recordDate}`);
}

export async function deleteRecord(id: string): Promise<{ success: boolean }> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.delete(`/api/bitable/records/${id}`);
    return res.data;
  }, `deleteRecord:${id}`);
}

export async function getSheetTable(tableKey: string): Promise<SheetTableDef> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.get(`/api/bitable/sheets/tables/${tableKey}`);
    return res.data;
  }, `getSheetTable:${tableKey}`);
}

export async function createSheetRecord(
  dto: CreateSheetRecordRequest,
): Promise<{ id: string; success: boolean; synced: boolean; syncError?: string }> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.post('/api/bitable/sheets/records', dto);
    return res.data;
  }, 'createSheetRecord');
}

export async function getSheetRecordsByTask(taskId: string): Promise<SheetRecordListResponse> {
  return safeApiCall(async () => {
    const res = await axiosForBackend.get('/api/bitable/sheets/records', {
      params: { taskId },
    });
    return res.data;
  }, `getSheetRecordsByTask:${taskId}`);
}
