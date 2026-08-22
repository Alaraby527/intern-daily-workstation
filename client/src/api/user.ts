import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { CurrentUserResponse } from '@shared/api.interface';

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/user/me',
      method: 'GET',
    });
    return response.data as CurrentUserResponse;
  } catch (error) {
    logger.warn('获取当前用户信息失败', error);
    return { userId: null, userName: null };
  }
}
