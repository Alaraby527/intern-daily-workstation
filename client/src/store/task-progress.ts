import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { extractErrorMessage } from '@client/src/api/http-utils';
import type {
  DeliverableAttachment,
  LineCode,
  TaskToggleRequest,
  TaskToggleResponse,
} from '@shared/api.interface';
import * as checkinApi from '@client/src/api/checkin';

export type TaskSyncStatus = 'idle' | 'syncing' | 'synced' | 'failed';

export interface TaskProgressEntry {
  completed: boolean;
  completion: string;
  attachments: DeliverableAttachment[];
  syncStatus: TaskSyncStatus;
  syncError?: string;
}

export type TaskProgressMap = Record<string, TaskProgressEntry>;

const getStorageKey = (
  internName: string,
  lineCode: string,
  date: string,
): string => `df_progress_${internName}_${lineCode}_${date}`;

export const useTaskProgress = (
  internName: string,
  lineCode: string,
  lineName: string,
  recordDate: string,
  dailyGoal: string,
  northStarMetric: string,
): {
  progress: TaskProgressMap;
  toggleTask: (taskId: string, taskName: string) => void;
  setCompletion: (taskId: string, completion: string, taskName: string) => void;
  setAttachments: (taskId: string, attachments: DeliverableAttachment[]) => void;
  retrySync: (taskId: string, taskName: string) => void;
} => {
  const storageKey = getStorageKey(internName, lineCode, recordDate);
  const syncingRef = useRef<Set<string>>(new Set());
  const pollTimersRef = useRef<Map<string, number>>(new Map());
  const lastCheckinIdRef = useRef<string | null>(null);

  const [progress, setProgress] = useState<TaskProgressMap>(() => {
    if (typeof window === 'undefined' || !internName || !lineCode) return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as TaskProgressMap) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!internName || !lineCode) {
      setProgress({});
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      setProgress(raw ? (JSON.parse(raw) as TaskProgressMap) : {});
    } catch {
      setProgress({});
    }
  }, [storageKey, internName, lineCode]);

  useEffect(() => {
    if (!internName || !lineCode) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // ignore storage errors
    }
  }, [progress, storageKey, internName, lineCode]);

  const pollSyncStatus = useCallback(
    (checkinId: string, taskId: string, taskName: string) => {
      if (pollTimersRef.current.has(taskId)) {
        window.clearTimeout(pollTimersRef.current.get(taskId));
      }

      const poll = async () => {
        try {
          const detail = await checkinApi.getCheckinDetail(checkinId);
          const feishuSyncStatus = detail.feishuSyncStatus;

          if (feishuSyncStatus === 'success') {
            setProgress((prev) => ({
              ...prev,
              [taskId]: { ...prev[taskId], syncStatus: 'synced', syncError: undefined },
            }));
            pollTimersRef.current.delete(taskId);
            return;
          }

          if (feishuSyncStatus === 'failed') {
            setProgress((prev) => ({
              ...prev,
              [taskId]: {
                ...prev[taskId],
                syncStatus: 'failed',
                syncError: detail.feishuSyncError ?? '飞书同步失败',
              },
            }));
            pollTimersRef.current.delete(taskId);
            toast.warning(`任务「${taskName}」同步失败，请稍后重试`);
            return;
          }

          const timer = window.setTimeout(poll, 2000);
          pollTimersRef.current.set(taskId, timer);
        } catch (err: unknown) {
          const msg = extractErrorMessage(err, '查询同步状态失败');
          logger.warn(`轮询同步状态失败 ${taskId}`, msg);
          const timer = window.setTimeout(poll, 3000);
          pollTimersRef.current.set(taskId, timer);
        }
      };

      const timer = window.setTimeout(poll, 1500);
      pollTimersRef.current.set(taskId, timer);
    },
    [],
  );

  const syncTaskToFeishu = useCallback(
    (taskId: string, taskName: string, completed: boolean, completion: string) => {
      if (!internName || !lineCode || !recordDate) return;
      if (syncingRef.current.has(taskId)) return;
      syncingRef.current.add(taskId);

      setProgress((prev) => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          syncStatus: 'syncing',
        },
      }));

      checkinApi
        .taskToggle({
          internName,
          lineCode: lineCode as LineCode,
          lineName,
          checkinDate: recordDate,
          taskId,
          taskName,
          dailyGoal,
          northStarMetric,
          completed,
          completion,
        } as TaskToggleRequest)
        .then((res: TaskToggleResponse) => {
          if (res.checkinId) {
            lastCheckinIdRef.current = res.checkinId;
          }

          if (res.syncStatus === 'synced') {
            setProgress((prev) => ({
              ...prev,
              [taskId]: { ...prev[taskId], syncStatus: 'synced', syncError: undefined },
            }));
          } else if (res.syncStatus === 'failed') {
            setProgress((prev) => ({
              ...prev,
              [taskId]: {
                ...prev[taskId],
                syncStatus: 'failed',
                syncError: res.feishuSyncError ?? '飞书同步失败',
              },
            }));
            toast.warning(`任务「${taskName}」同步中，请稍候再查看状态`);
          } else if (res.syncStatus === 'skipped') {
            setProgress((prev) => ({
              ...prev,
              [taskId]: { ...prev[taskId], syncStatus: 'idle', syncError: undefined },
            }));
          } else if (res.syncStatus === 'syncing' && res.checkinId) {
            pollSyncStatus(res.checkinId, taskId, taskName);
          } else {
            setProgress((prev) => ({
              ...prev,
              [taskId]: { ...prev[taskId], syncStatus: 'syncing', syncError: undefined },
            }));
          }
        })
        .catch((err: unknown) => {
          const msg = extractErrorMessage(err, '飞书同步失败');
          logger.warn(`任务同步飞书失败 ${taskId}`, msg);
          setProgress((prev) => ({
            ...prev,
            [taskId]: {
              ...prev[taskId],
              syncStatus: 'failed',
              syncError: msg,
            },
          }));
          toast.error(`任务「${taskName}」同步失败：${msg.slice(0, 50)}`);
        })
        .finally(() => {
          syncingRef.current.delete(taskId);
        });
    },
    [internName, lineCode, lineName, recordDate, dailyGoal, northStarMetric, pollSyncStatus],
  );

  const toggleTask = useCallback(
    (taskId: string, taskName: string) => {
      let nextCompleted = false;
      let nextCompletion = '';
      setProgress((prev) => {
        const existing = prev[taskId];
        nextCompleted = !existing?.completed;
        nextCompletion = nextCompleted ? existing?.completion ?? '' : '';
        return {
          ...prev,
          [taskId]: {
            completed: nextCompleted,
            completion: nextCompletion,
            attachments: nextCompleted ? existing?.attachments ?? [] : [],
            syncStatus: 'syncing',
            syncError: undefined,
          },
        };
      });

      syncTaskToFeishu(taskId, taskName, nextCompleted, nextCompletion);
    },
    [syncTaskToFeishu],
  );

  const setCompletion = useCallback(
    (taskId: string, completion: string, taskName: string) => {
      let shouldSync = false;
      let nextCompleted = false;
      setProgress((prev) => {
        const existing = prev[taskId];
        nextCompleted = (existing?.completed ?? false) || completion.length > 0;
        const wasCompleted = existing?.completed ?? false;
        shouldSync = completion.length > 0 && (wasCompleted || nextCompleted);
        return {
          ...prev,
          [taskId]: {
            completed: nextCompleted,
            completion,
            attachments: existing?.attachments ?? [],
            syncStatus: shouldSync ? 'syncing' : existing?.syncStatus ?? 'idle',
            syncError: shouldSync ? undefined : existing?.syncError,
          },
        };
      });

      if (shouldSync) {
        syncTaskToFeishu(taskId, taskName, nextCompleted, completion);
      }
    },
    [syncTaskToFeishu],
  );

  const setAttachments = useCallback(
    (taskId: string, attachments: DeliverableAttachment[]) => {
      setProgress((prev) => {
        const existing = prev[taskId];
        return {
          ...prev,
          [taskId]: {
            completed: (existing?.completed ?? false) || attachments.length > 0,
            completion: existing?.completion ?? '',
            attachments,
            syncStatus: existing?.syncStatus ?? 'idle',
            syncError: existing?.syncError,
          },
        };
      });
    },
    [],
  );

  const retrySync = useCallback(
    (taskId: string, taskName: string) => {
      const entry = progress[taskId];
      if (!entry) return;
      syncTaskToFeishu(taskId, taskName, entry.completed, entry.completion);
    },
    [progress, syncTaskToFeishu],
  );

  useEffect(() => {
    return () => {
      pollTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      pollTimersRef.current.clear();
    };
  }, []);

  return { progress, toggleTask, setCompletion, setAttachments, retrySync };
};
