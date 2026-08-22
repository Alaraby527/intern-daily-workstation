import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, inArray } from 'drizzle-orm';
import { businessRecord } from '@server/database/schema';
import { BitableService } from './bitable.service';
import type {
  CreateBusinessRecordRequest,
  BusinessRecord as BusinessRecordDto,
  BusinessRecordListResponse,
  BitableTableKey,
} from '@shared/api.interface';

type DbRow = typeof businessRecord.$inferSelect;

@Injectable()
export class BusinessRecordService {
  private readonly logger = new Logger(BusinessRecordService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: BitableService,
  ) {}

  async create(
    dto: CreateBusinessRecordRequest,
    userId?: string,
  ): Promise<{ id: string; success: boolean; synced: boolean; syncError?: string }> {
    this.logger.log(
      `创建业务记录 tableKey=${dto.tableKey} taskId=${dto.taskId} ` +
      `internName=${dto.internName} lineCode=${dto.lineCode} ` +
      `recordDate=${dto.recordDate} userId=${userId ?? 'anonymous'} ` +
      `fieldsDataKeys=${JSON.stringify(Object.keys(dto.fieldsData))}`,
    );

    const syncEnabled = await this.bitableService.isSyncEnabled();
    this.logger.log(`飞书同步状态: enabled=${syncEnabled}`);
    let syncStatus: 'pending' | 'success' | 'failed' | 'skipped' = syncEnabled ? 'pending' : 'skipped';
    let feishuRecordId: string | null = null;
    let syncError: string | null = null;

    const result = await this.db
      .insert(businessRecord)
      .values({
        tableKey: dto.tableKey,
        taskId: dto.taskId,
        internName: dto.internName,
        lineCode: dto.lineCode,
        recordDate: dto.recordDate,
        fieldsData: dto.fieldsData as unknown as Record<string, unknown>,
        feishuSyncStatus: syncStatus,
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      })
      .returning({ id: businessRecord.id });

    const recordId = result[0].id;
    this.logger.log(`本地数据库写入成功，recordId=${recordId}`);

    if (syncEnabled) {
      this.logger.log(`开始同步到飞书多维表格，tableKey=${dto.tableKey}`);
      try {
        const feishuResult = await this.bitableService.addRecord(
          dto.tableKey as BitableTableKey,
          dto.fieldsData,
        );
        feishuRecordId = feishuResult.recordId;
        syncStatus = 'success';
        this.logger.log(`飞书同步成功，feishuRecordId=${feishuRecordId}`);

        await this.db
          .update(businessRecord)
          .set({
            feishuRecordId,
            feishuSyncStatus: syncStatus,
            feishuSyncError: null,
            updatedAt: new Date(),
          })
          .where(eq(businessRecord.id, recordId));
      } catch (error: unknown) {
        syncStatus = 'failed';
        syncError = error instanceof Error ? error.message : String(error);
        this.logger.warn(`飞书同步失败，记录已保存到本地: ${syncError}`);

        await this.db
          .update(businessRecord)
          .set({
            feishuSyncStatus: syncStatus,
            feishuSyncError: syncError,
            updatedAt: new Date(),
          })
          .where(eq(businessRecord.id, recordId));
      }
    }

    return {
      id: recordId,
      success: true,
      synced: syncStatus === 'success',
      syncError: syncError ?? undefined,
    };
  }

  async findByTask(taskId: string): Promise<BusinessRecordListResponse> {
    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(businessRecord)
        .where(eq(businessRecord.taskId, taskId)),
      this.db
        .select()
        .from(businessRecord)
        .where(eq(businessRecord.taskId, taskId))
        .orderBy(desc(businessRecord.createdAt)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: BusinessRecordDto[] = rows.map((row: DbRow) => this.mapRow(row));

    return { items, total };
  }

  async syncDeletedWithFeishu(
    internName: string,
    recordDate: string,
    tableKey?: string,
  ): Promise<void> {
    const syncEnabled = await this.bitableService.isSyncEnabled();
    if (!syncEnabled) return;

    const conditions = [
      eq(businessRecord.internName, internName),
      eq(businessRecord.recordDate, recordDate),
      eq(businessRecord.feishuSyncStatus, 'success'),
    ];
    if (tableKey) {
      conditions.push(eq(businessRecord.tableKey, tableKey));
    }

    const localRows = await this.db
      .select({
        id: businessRecord.id,
        tableKey: businessRecord.tableKey,
        feishuRecordId: businessRecord.feishuRecordId,
      })
      .from(businessRecord)
      .where(and(...conditions));

    if (localRows.length === 0) return;

    const byTable = new Map<string, string[]>();
    for (const row of localRows) {
      if (!row.feishuRecordId) continue;
      const existing = byTable.get(row.tableKey) ?? [];
      byTable.set(row.tableKey, [...existing, row.feishuRecordId]);
    }

    const feishuIdsByTable = new Map<string, Set<string>>();
    for (const [tk] of byTable) {
      const result = await this.bitableService.searchBitableRecordIdsByInternAndDate(
        tk as BitableTableKey,
        internName,
        recordDate,
      );
      if (!result.error) {
        feishuIdsByTable.set(tk, new Set(result.recordIds));
      }
    }

    const idsToDelete: string[] = [];
    for (const row of localRows) {
      if (!row.feishuRecordId) continue;
      const feishuIds = feishuIdsByTable.get(row.tableKey);
      if (feishuIds && !feishuIds.has(row.feishuRecordId)) {
        idsToDelete.push(row.id);
      }
    }

    if (idsToDelete.length > 0) {
      this.logger.log(`飞书端已删除 ${idsToDelete.length} 条记录，同步清理本地记录`);
      await this.db
        .delete(businessRecord)
        .where(inArray(businessRecord.id, idsToDelete));
    }
  }

  async findByInternAndDate(
    internName: string,
    recordDate: string,
    tableKey?: string,
  ): Promise<BusinessRecordListResponse> {
    await this.syncDeletedWithFeishu(internName, recordDate, tableKey);

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
    const items: BusinessRecordDto[] = rows.map((row: DbRow) => this.mapRow(row));

    return { items, total };
  }

  async findOne(id: string): Promise<BusinessRecordDto | null> {
    const rows = await this.db
      .select()
      .from(businessRecord)
      .where(eq(businessRecord.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async delete(id: string, userId?: string): Promise<{ success: boolean }> {
    const existing = await this.db
      .select()
      .from(businessRecord)
      .where(eq(businessRecord.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('记录不存在');
    }
    const record = existing[0];

    if (
      record.feishuRecordId &&
      record.feishuSyncStatus === 'success'
    ) {
      try {
        await this.bitableService.deleteRecord(
          record.tableKey as BitableTableKey,
          record.feishuRecordId,
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`删除飞书记录失败，仅删除本地记录: ${msg}`);
      }
    }

    await this.db
      .delete(businessRecord)
      .where(eq(businessRecord.id, id));

    return { success: true };
  }

  private mapRow(row: DbRow): BusinessRecordDto {
    return {
      id: row.id,
      tableKey: row.tableKey as BusinessRecordDto['tableKey'],
      taskId: row.taskId,
      internName: row.internName,
      lineCode: row.lineCode as BusinessRecordDto['lineCode'],
      recordDate: row.recordDate,
      fieldsData: (row.fieldsData as Record<string, any>) ?? {},
      feishuRecordId: row.feishuRecordId,
      feishuSyncStatus: row.feishuSyncStatus as BusinessRecordDto['feishuSyncStatus'],
      feishuSyncError: row.feishuSyncError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
