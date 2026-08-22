import { Controller, Get, Req } from '@nestjs/common';
import type { CurrentUserResponse } from '@shared/api.interface';

@Controller('api/user')
export class UserController {
  @Get('me')
  async getCurrentUser(@Req() req: { userContext?: { userId: string; userName: string } }): Promise<CurrentUserResponse> {
    const userId = req.userContext?.userId ?? null;
    const userName = req.userContext?.userName ?? null;
    return { userId, userName };
  }
}
