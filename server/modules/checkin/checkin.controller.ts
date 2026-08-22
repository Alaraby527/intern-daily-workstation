import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CheckinService } from './checkin.service';
import type {
  CreateCheckinRequest,
  MentorReviewRequest,
  CheckinRecord,
  CheckinListResponse,
  TaskToggleRequest,
  TaskToggleResponse,
} from '@shared/api.interface';

@Controller('api/checkin-records')
export class CheckinController {
  private readonly logger = new Logger(CheckinController.name);

  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  async create(
    @Req() req: { userContext: { userId: string } },
    @Body() dto: CreateCheckinRequest,
  ): Promise<{ id: string; success: boolean }> {
    if (!dto.internName || !dto.lineCode || !dto.checkinDate) {
      throw new BadRequestException('缺少必填字段：internName/lineCode/checkinDate');
    }
    const userId = req.userContext?.userId;
    try {
      return this.checkinService.create(dto, userId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`创建打卡记录失败: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(msg);
    }
  }

  @Get()
  async findAll(
    @Query('internName') internName?: string,
    @Query('lineCode') lineCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('mentorStatus') mentorStatus?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<CheckinListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.checkinService.findAll({
      internName,
      lineCode,
      startDate,
      endDate,
      mentorStatus,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CheckinRecord> {
    const record = await this.checkinService.findOne(id);
    if (!record) {
      throw new NotFoundException('打卡记录不存在');
    }
    return record;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    const result = await this.checkinService.delete(id);
    return result;
  }

  @Post('task-toggle')
  async toggleTask(
    @Body() dto: TaskToggleRequest,
  ): Promise<TaskToggleResponse> {
    if (!dto.internName || !dto.lineCode || !dto.checkinDate || !dto.taskId) {
      throw new BadRequestException('缺少必填字段：internName/lineCode/checkinDate/taskId');
    }
    try {
      return this.checkinService.toggleTask(dto);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`任务勾选同步失败: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(msg);
    }
  }

  @Patch(':id/mentor-review')
  async mentorReview(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
    @Body() dto: MentorReviewRequest,
  ): Promise<{ id: string; success: boolean }> {
    if (!dto.mentorStatus) {
      throw new BadRequestException('缺少验收状态');
    }
    const userId = req.userContext?.userId;
    const result = await this.checkinService.mentorReview(id, dto, userId);
    if (!result) {
      throw new NotFoundException('打卡记录不存在');
    }
    return result;
  }
}
