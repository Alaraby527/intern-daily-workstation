import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend, safeApiCall } from './http-utils';
import type {
  CheckinListResponse,
  CheckinRecord,
  CreateCheckinRequest,
  MentorReviewRequest,
  TaskToggleRequest,
  TaskToggleResponse,
} from '@shared/api.interface';

export async function taskToggle(
  payload: TaskToggleRequest,
): Promise<TaskToggleResponse> {
  return safeApiCall(async () => {
    const response = await axiosForBackend.post<TaskToggleResponse>(
      '/api/checkin-records/task-toggle',
      payload,
    );
    return response.data;
  }, `taskToggle:${payload.taskId}`);
}

export async function createCheckin(
  payload: CreateCheckinRequest,
): Promise<{ id: string; success: boolean }> {
  return safeApiCall(async () => {
    const response = await axiosForBackend.post<{ id: string; success: boolean }>(
      '/api/checkin-records',
      payload,
    );
    return response.data;
  }, 'createCheckin');
}

export interface GetCheckinListParams {
  page?: number;
  pageSize?: number;
  internName?: string;
  startDate?: string;
  endDate?: string;
  lineCode?: string;
  mentorStatus?: string;
}

export async function getCheckinList(
  params: GetCheckinListParams,
): Promise<CheckinListResponse> {
  return safeApiCall(async () => {
    const searchParams = new URLSearchParams();
    if (params.page !== undefined)
      searchParams.set('page', String(params.page));
    if (params.pageSize !== undefined)
      searchParams.set('pageSize', String(params.pageSize));
    if (params.internName) searchParams.set('internName', params.internName);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.lineCode) searchParams.set('lineCode', params.lineCode);
    if (params.mentorStatus)
      searchParams.set('mentorStatus', params.mentorStatus);

    const response = await axiosForBackend.get<CheckinListResponse>(
      `/api/checkin-records?${searchParams.toString()}`,
    );
    return response.data;
  }, 'getCheckinList');
}

export async function getCheckinDetail(id: string): Promise<CheckinRecord> {
  return safeApiCall(async () => {
    const response = await axiosForBackend.get<CheckinRecord>(
      `/api/checkin-records/${id}`,
    );
    return response.data;
  }, `getCheckinDetail:${id}`);
}

export async function mentorReview(
  id: string,
  payload: MentorReviewRequest,
): Promise<{ id: string; success: boolean }> {
  return safeApiCall(async () => {
    const response = await axiosForBackend.patch<{ id: string; success: boolean }>(
      `/api/checkin-records/${id}/mentor-review`,
      payload,
    );
    return response.data;
  }, `mentorReview:${id}`);
}

export async function deleteCheckin(
  id: string,
): Promise<{ success: boolean }> {
  return safeApiCall(async () => {
    const response = await axiosForBackend.delete<{ success: boolean }>(
      `/api/checkin-records/${id}`,
    );
    return response.data;
  }, `deleteCheckin:${id}`);
}
