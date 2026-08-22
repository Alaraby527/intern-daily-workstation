import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BitableService } from './bitable.service';
import { BusinessRecordService } from './business-record.service';
import { SheetRecordService } from './sheet-record.service';
import type {
  BitableTableDef,
  CreateBusinessRecordRequest,
  BusinessRecord,
  BusinessRecordListResponse,
  FeishuBitableConfig,
  UpdateFeishuConfigRequest,
  FeishuSyncStatusResponse,
  SheetTableDef,
  SheetRecord,
  SheetRecordListResponse,
  CreateSheetRecordRequest,
} from '@shared/api.interface';

@Controller('api/bitable')
export class BitableController {
  private readonly logger = new Logger(BitableController.name);

  constructor(
    private readonly bitableService: BitableService,
    private readonly businessRecordService: BusinessRecordService,
    private readonly sheetRecordService: SheetRecordService,
  ) {}

  @Get('tables')
  getTables(): BitableTableDef[] {
    return this.bitableService.getAllTables();
  }

  @Get('tables/:tableKey')
  getTable(@Param('tableKey') tableKey: string): BitableTableDef {
    const table = this.bitableService.getTableDef(tableKey as any);
    if (!table) {
      throw new NotFoundException('业务表不存在');
    }
    return table;
  }

  @Get('sync-status')
  async getSyncStatus(): Promise<FeishuSyncStatusResponse> {
    const config = await this.bitableService.getFullConfig();
    return {
      enabled: !!(config && config.enabled),
      configured: !!(config && config.appId && config.appSecret),
    };
  }

  @Get('config')
  async getConfig(): Promise<FeishuBitableConfig | null> {
    return this.bitableService.getConfig();
  }

  @Post('config')
  async saveConfig(
    @Req() req: { userContext: { userId: string } },
    @Body() dto: UpdateFeishuConfigRequest,
  ): Promise<{ id: string; success: boolean }> {
    if (!dto.appId || dto.appSecret === undefined) {
      throw new BadRequestException('缺少必填字段');
    }
    const userId = req.userContext?.userId;
    return this.bitableService.saveConfig(dto, userId);
  }

  @Post('records')
  async createRecord(
    @Req() req: { userContext: { userId: string } },
    @Body() dto: CreateBusinessRecordRequest,
  ): Promise<{ id: string; success: boolean; synced: boolean; syncError?: string }> {
    if (!dto.tableKey || !dto.taskId || !dto.internName || !dto.lineCode || !dto.recordDate) {
      throw new BadRequestException('缺少必填字段：tableKey/taskId/internName/lineCode/recordDate');
    }
    if (!dto.fieldsData || typeof dto.fieldsData !== 'object') {
      throw new BadRequestException('fieldsData 必须为对象');
    }
    const userId = req.userContext?.userId;
    try {
      return this.businessRecordService.create(dto, userId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`创建业务记录失败: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(msg);
    }
  }

  @Get('records')
  async getRecords(
    @Query('taskId') taskId?: string,
    @Query('internName') internName?: string,
    @Query('recordDate') recordDate?: string,
    @Query('tableKey') tableKey?: string,
  ): Promise<BusinessRecordListResponse> {
    if (taskId) {
      return this.businessRecordService.findByTask(taskId);
    }
    if (internName && recordDate) {
      return this.businessRecordService.findByInternAndDate(internName, recordDate, tableKey);
    }
    return { items: [], total: 0 };
  }

  @Get('records/:id')
  async getRecord(@Param('id') id: string): Promise<BusinessRecord> {
    const record = await this.businessRecordService.findOne(id);
    if (!record) {
      throw new NotFoundException('记录不存在');
    }
    return record;
  }

  @Delete('records/:id')
  async deleteRecord(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const userId = req.userContext?.userId;
    return this.businessRecordService.delete(id, userId);
  }

  @Get('sheets/tables')
  getSheetTables(): SheetTableDef[] {
    return this.sheetRecordService.getAllTables();
  }

  @Get('sheets/tables/:tableKey')
  getSheetTable(@Param('tableKey') tableKey: string): SheetTableDef {
    const table = this.sheetRecordService.getTableDef(tableKey as any);
    if (!table) {
      throw new NotFoundException('Sheets业务表不存在');
    }
    return table;
  }

  @Post('sheets/records')
  async createSheetRecord(
    @Req() req: { userContext: { userId: string } },
    @Body() dto: CreateSheetRecordRequest,
  ): Promise<{ id: string; success: boolean; synced: boolean; syncError?: string }> {
    if (!dto.tableKey || !dto.taskId || !dto.internName || !dto.lineCode || !dto.recordDate) {
      throw new BadRequestException('缺少必填字段：tableKey/taskId/internName/lineCode/recordDate');
    }
    if (!dto.fieldsData || typeof dto.fieldsData !== 'object') {
      throw new BadRequestException('fieldsData 必须为对象');
    }
    const userId = req.userContext?.userId;
    try {
      return this.sheetRecordService.create(dto, userId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`创建Sheets记录失败: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(msg);
    }
  }

  @Get('sheets/records')
  async getSheetRecords(
    @Query('taskId') taskId?: string,
    @Query('internName') internName?: string,
    @Query('recordDate') recordDate?: string,
    @Query('tableKey') tableKey?: string,
  ): Promise<SheetRecordListResponse> {
    if (taskId) {
      return this.sheetRecordService.findByTask(taskId);
    }
    if (internName && recordDate) {
      return this.sheetRecordService.findByInternAndDate(internName, recordDate, tableKey);
    }
    return { items: [], total: 0 };
  }

  @Get('sheets/records/:id')
  async getSheetRecord(@Param('id') id: string): Promise<SheetRecord> {
    const record = await this.sheetRecordService.findOne(id);
    if (!record) {
      throw new NotFoundException('记录不存在');
    }
    return record;
  }

  @Delete('sheets/records/:id')
  async deleteSheetRecord(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const userId = req.userContext?.userId;
    return this.sheetRecordService.delete(id, userId);
  }
}
