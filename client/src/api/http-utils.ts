import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { AxiosError } from 'axios';

export function extractErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (!error) return fallback;
  if (error instanceof Error) {
    const axiosErr = error as AxiosError;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const data = axiosErr.response.data as any;
      let detail = '';
      if (typeof data === 'string') {
        detail = data.length > 120 ? data.slice(0, 120) : data;
      } else if (data && typeof data === 'object') {
        const msg =
          data.message ||
          data.error?.message ||
          data.error ||
          data.msg ||
          data.detail;
        if (typeof msg === 'string') {
          detail = msg;
        } else if (msg && typeof msg === 'object') {
          const nestedMsg =
            (msg as any).message ||
            (msg as any).details ||
            (msg as any).error;
          if (typeof nestedMsg === 'string') {
            detail = nestedMsg;
          } else {
            try { detail = JSON.stringify(msg).slice(0, 200); } catch { detail = ''; }
          }
        }
        if (!detail && data.statusCode) {
          detail = String(data.statusCode);
        }
        if (!detail) {
          try { detail = JSON.stringify(data).slice(0, 200); } catch { detail = ''; }
        }
      }
      const suffix = detail ? `：${detail}` : '';
      const statusText = axiosErr.response.statusText || '错误';
      return `${status} ${statusText}${suffix}`;
    }
    if (axiosErr.request) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return '网络断开，请检查网络连接';
      if (error.message.includes('timeout')) return '请求超时，请检查网络后重试';
      if (error.message.includes('Network Error')) return '网络连接失败，请检查网络';
      if (error.message.includes('Failed to fetch')) return '网络连接失败，请检查网络';
      return `网络错误：${error.message || fallback}`;
    }
    return error.message || fallback;
  }
  if (typeof error === 'string') return error;
  if (typeof error === 'number' || typeof error === 'boolean') return String(error);
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

export async function safeApiCall<T>(
  fn: () => Promise<T>,
  context: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const msg = extractErrorMessage(error);
    logger.error(`[${context}] ${msg}`, error);
    throw error;
  }
}

export { axiosForBackend };
