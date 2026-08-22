import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count } from 'drizzle-orm';
import { businessRecord } from '@server/database/schema';
import { BitableService } from './bitable.service';
import { SHEET_TABLES } from './sheet-tables';
import type {
  CreateSheetRecordRequest,
  SheetRecord as SheetRecordDto,
  SheetRecordListResponse,
  SheetTableKey,
  SheetTableDef,
} from '@shared/api.interface';

type DbRow = typeof businessRecord.$inferSelect;

@Injectable()
export class SheetRecordService {
  private readonly logger = new Logger(SheetRecordService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: BitableService,
  ) {}

  getTableDef(tableKey: SheetTableKey): SheetTableDef | undefined {
    return SHEET_TABLES.find((t: SheetTableDef) => t.tableKey === tableKey);
  }

  getAllTables(): SheetTableDef[] {
    return SHEET_TABLES;
  }

  async create(
    dto: CreateSheetRecordRequest,
    userId?: string,
  ): Promise<{ id: string; success: boolean; synced: boolean; syncError?: string }> {
    this.logger.log(`创建Sheets记录: ${dto.tableKey} - ${dto.taskId} - ${dto.internName}`);

    const syncEnabled = await this.bitableService.isSyncEnabled();
    let syncStatus: 'pending' | 'success' | 'failed' = syncEnabled ? 'pending' : 'failed';
    let syncError: string | null = null;
    let seq: number | null = null;

    const tableDef = this.getTableDef(dto.tableKey);
    const fieldsData = { ...dto.fieldsData };
    if (tableDef) {
      fieldsData.status = fieldsData.status ?? tableDef.defaultStatus;
      fieldsData.submitter = fieldsData.submitter ?? dto.internName;
    }

    const insertResult = await this.db
      .insert(businessRecord)
      .values({
        tableKey: dto.tableKey,
        taskId: dto.taskId,
        internName: dto.internName,
        lineCode: dto.lineCode,
        recordDate: dto.recordDate,
        fieldsData: JSON.stringify(fieldsData),
        feishuSyncStatus: syncStatus,
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      })
      .returning({ id: businessRecord.id });

    const recordId = insertResult[0].id;

    if (syncEnabled && tableDef) {
      try {
        seq = await this.bitableService.getSheetNextSeq(tableDef.sheetTitle);
        const rowValues = this.buildSheetRowValues(seq, fieldsData, tableDef);
        const result = await this.bitableService.appendToSheet(tableDef.sheetTitle, [rowValues]);
        if (result.success) {
          syncStatus = 'success';
        } else {
          syncStatus = 'failed';
          syncError = result.error ?? '写入失败';
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        syncStatus = 'failed';
        syncError = msg;
        this.logger.warn(`飞书Sheets同步失败，记录已保存到本地: ${msg}`);
      }

      await this.db
        .update(businessRecord)
        .set({
          feishuSyncStatus: syncStatus,
          feishuSyncError: syncError,
          feishuRecordId: seq ? String(seq) : null,
          updatedAt: new Date(),
          ...(userId ? { updatedBy: userId } : {}),
        })
        .where(eq(businessRecord.id, recordId));
    }

    return {
      id: recordId,
      success: true,
      synced: syncStatus === 'success',
      syncError: syncError ?? undefined,
    };
  }

  async findByTask(taskId: string): Promise<SheetRecordListResponse> {
    const whereClause = eq(businessRecord.taskId, taskId);

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(businessRecord)
        .where(whereClause),
      this.db
        .select()
        .from(businessRecord)
        .where(whereClause)
        .orderBy(desc(businessRecord.createdAt)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: SheetRecordDto[] = rows.map((row: DbRow) => this.mapRow(row));

    return { items, total };
  }

  async findByInternAndDate(
    internName: string,
    recordDate: string,
    tableKey?: string,
  ): Promise<SheetRecordListResponse> {
    const conditions = [
      eq(businessRecord.internName, internName),
      eq(businessRecord.recordDate, recordDate),
    ];
    if (tableKey) {
      conditions.push(eq(businessRecord.tableKey, tableKey));
    }
    const whereClause = and(...conditions);

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(businessRecord)
        .where(whereClause),
      this.db
        .select()
        .from(businessRecord)
        .where(whereClause)
        .orderBy(desc(businessRecord.createdAt)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: SheetRecordDto[] = rows.map((row: DbRow) => this.mapRow(row));

    return { items, total };
  }

  async findOne(id: string): Promise<SheetRecordDto | null> {
    const rows = await this.db
      .select()
      .from(businessRecord)
      .where(eq(businessRecord.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async delete(id: string, userId?: string): Promise<{ success: boolean }> {
    const result = await this.db
      .delete(businessRecord)
      .where(eq(businessRecord.id, id))
      .returning({ id: businessRecord.id });

    if (result.length === 0) {
      throw new NotFoundException('记录不存在');
    }

    return { success: true };
  }

  private buildSheetRowValues(
    seq: number,
    data: Record<string, any>,
    tableDef: SheetTableDef,
  ): (string | number)[] {
    const values: (string | number)[] = [seq];
    const addField = (key: string) => {
      values.push(data[key] ?? '');
    };
    if (tableDef.tableKey === 'bug_register') {
      addField('summary');
      addField('problem');
      addField('suggestion');
      addField('submitter');
      addField('status');
      addField('remarks');
    } else if (tableDef.tableKey === 'feature_proposal') {
      addField('summary');
      addField('idea');
      addField('suggestion');
      addField('submitter');
      addField('status');
      addField('remarks');
    }
    return values;
  }

  private mapRow(row: DbRow): SheetRecordDto {
    return {
      id: row.id,
      tableKey: row.tableKey as SheetRecordDto['tableKey'],
      taskId: row.taskId,
      internName: row.internName,
      lineCode: row.lineCode as SheetRecordDto['lineCode'],
      recordDate: row.recordDate,
      fieldsData: (row.fieldsData as Record<string, any>) ?? {},
      feishuSyncStatus: (row.feishuSyncStatus as SheetRecordDto['feishuSyncStatus']) ?? 'pending',
      feishuSyncError: row.feishuSyncError,
      seq: row.feishuRecordId ? Number(row.feishuRecordId) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
