import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, gte, lte, and, desc, count, inArray } from 'drizzle-orm';
import { checkinRecord } from '@server/database/schema';
import { BitableService } from '../bitable/bitable.service';
import { BusinessRecordService } from '../bitable/business-record.service';
import type {
  CreateCheckinRequest,
  MentorReviewRequest,
  CheckinRecord,
  CheckinListResponse,
  CompletedTaskSnapshot,
  DeliverableAttachment,
  LineCode,
  TaskToggleRequest,
  TaskToggleResponse,
} from '@shared/api.interface';

interface ListQuery {
  internName?: string;
  lineCode?: string;
  startDate?: string;
  endDate?: string;
  mentorStatus?: string;
  page: number;
  pageSize: number;
}

type DbRow = typeof checkinRecord.$inferSelect;

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableService: BitableService,
    private readonly businessRecordService: BusinessRecordService,
  ) {}

  async create(
    dto: CreateCheckinRequest,
    userId?: string,
  ): Promise<{ id: string; success: boolean }> {
    this.logger.log(`创建打卡记录: ${dto.internName} - ${dto.lineCode} - ${dto.checkinDate}`);

    const result = await this.db
      .insert(checkinRecord)
      .values({
        internName: dto.internName,
        lineCode: dto.lineCode,
        lineName: dto.lineName,
        checkinDate: dto.checkinDate,
        dailyGoal: dto.dailyGoal,
        actualCompletion: dto.actualCompletion,
        deliverables: dto.deliverables,
        outputLinks: dto.outputLinks,
        blockers: dto.blockers,
         completedTasks: dto.completedTasks as unknown as Record<string, unknown>[],
         deliverableAttachments: dto.deliverableAttachments as unknown as Record<string, unknown>[],
        ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
      })
      .returning({ id: checkinRecord.id });

    const recordId = result[0].id;

    this.syncCheckinToFeishu(recordId, dto, 'pending', '').catch((err: unknown) => {
      this.logger.warn(`打卡同步飞书失败: ${err instanceof Error ? err.message : String(err)}`);
    });

    return { id: recordId, success: true };
  }

  async findAll(query: ListQuery): Promise<CheckinListResponse> {
    this.logger.log(`查询打卡记录: ${JSON.stringify(query)}`);

    const conditions = this.buildWhereConditions(query);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    await this.syncDeletedCheckinsWithFeishu(query);

    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const offset = (page - 1) * pageSize;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(checkinRecord)
        .where(whereClause),
      this.db
        .select()
        .from(checkinRecord)
        .where(whereClause)
        .orderBy(desc(checkinRecord.checkinDate), desc(checkinRecord.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: CheckinRecord[] = rows.map((row: DbRow) => this.mapRow(row));

    return { items, total, page, pageSize };
  }

  private async syncDeletedCheckinsWithFeishu(query: ListQuery): Promise<void> {
    const syncEnabled = await this.bitableService.isSyncEnabled();
    if (!syncEnabled) return;

    const localRows = await this.db
      .select({
        id: checkinRecord.id,
        internName: checkinRecord.internName,
        lineCode: checkinRecord.lineCode,
        checkinDate: checkinRecord.checkinDate,
        feishuRecordId: checkinRecord.feishuRecordId,
      })
      .from(checkinRecord)
      .where(
        and(
          ...this.buildWhereConditions(query),
          eq(checkinRecord.feishuSyncStatus, 'success'),
        ),
      )
      .limit(200);

    if (localRows.length === 0) return;

    const byInternDate = new Map<string, Set<string>>();
    for (const row of localRows) {
      const key = `${row.internName}|${row.checkinDate}`;
      const set = byInternDate.get(key) ?? new Set<string>();
      byInternDate.set(key, set);
    }

    const feishuIdsByKey = new Map<string, Set<string>>();
    for (const [key] of byInternDate) {
      const [internName, date] = key.split('|');
      const result = await this.bitableService.searchBitableRecordIdsByInternAndDate(
        'daily_checkin',
        internName,
        date,
      );
      if (!result.error) {
        feishuIdsByKey.set(key, new Set(result.recordIds));
      }
    }

    const idsToDelete: string[] = [];
    for (const row of localRows) {
      if (!row.feishuRecordId) continue;
      const key = `${row.internName}|${row.checkinDate}`;
      const feishuIds = feishuIdsByKey.get(key);
      if (feishuIds && !feishuIds.has(row.feishuRecordId)) {
        idsToDelete.push(row.id);
      }
    }

    if (idsToDelete.length > 0) {
      this.logger.log(`飞书端已删除 ${idsToDelete.length} 条打卡记录，同步清理本地记录`);
      await this.db
        .delete(checkinRecord)
        .where(inArray(checkinRecord.id, idsToDelete));
    }
  }

  async findOne(id: string): Promise<CheckinRecord | null> {
    this.logger.log(`查询打卡详情: ${id}`);

    const rows = await this.db
      .select()
      .from(checkinRecord)
      .where(eq(checkinRecord.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    this.logger.log(`删除打卡记录: ${id}`);

    const rows = await this.db
      .select()
      .from(checkinRecord)
      .where(eq(checkinRecord.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('打卡记录不存在');
    }

    const record = rows[0];

    if (
      record.feishuRecordId &&
      record.feishuSyncStatus === 'success'
    ) {
      try {
        const result = await this.bitableService.deleteCheckinFromFeishu(
          record.feishuRecordId,
        );
        if (!result.success) {
          this.logger.warn(`飞书打卡记录删除失败，仅删除本地记录: ${result.error}`);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`飞书打卡记录删除异常，仅删除本地记录: ${msg}`);
      }
    }

    await this.db.delete(checkinRecord).where(eq(checkinRecord.id, id));

    return { success: true };
  }

  async mentorReview(
    id: string,
    dto: MentorReviewRequest,
    userId?: string,
  ): Promise<{ id: string; success: boolean } | null> {
    this.logger.log(`Mentor 验收: ${id} - ${dto.mentorStatus}`);

    const patch: Partial<typeof checkinRecord.$inferInsert> = {
      mentorStatus: dto.mentorStatus,
      mentorFeedback: dto.mentorFeedback,
      updatedAt: new Date(),
    };

    if (userId) {
      patch.updatedBy = userId;
    }

    const result = await this.db
      .update(checkinRecord)
      .set(patch)
      .where(eq(checkinRecord.id, id))
      .returning({ id: checkinRecord.id });

    if (result.length === 0) return null;
    return { id: result[0].id, success: true };
  }

  private buildWhereConditions(query: ListQuery) {
    const conditions = [];
    if (query.internName) {
      conditions.push(eq(checkinRecord.internName, query.internName));
    }
    if (query.lineCode) {
      conditions.push(eq(checkinRecord.lineCode, query.lineCode));
    }
    if (query.startDate) {
      conditions.push(gte(checkinRecord.checkinDate, query.startDate));
    }
    if (query.endDate) {
      conditions.push(lte(checkinRecord.checkinDate, query.endDate));
    }
    if (query.mentorStatus) {
      conditions.push(eq(checkinRecord.mentorStatus, query.mentorStatus));
    }
    return conditions;
  }

  private mapRow(row: DbRow): CheckinRecord {
    return {
      id: row.id,
      internName: row.internName,
      lineCode: row.lineCode as CheckinRecord['lineCode'],
      lineName: row.lineName,
      checkinDate: row.checkinDate,
      dailyGoal: row.dailyGoal ?? '',
      actualCompletion: row.actualCompletion ?? '',
      deliverables: row.deliverables ?? '',
      outputLinks: row.outputLinks ?? '',
      blockers: row.blockers ?? '',
       completedTasks: (row.completedTasks as CompletedTaskSnapshot[]) ?? [],
       deliverableAttachments: (row.deliverableAttachments as DeliverableAttachment[]) ?? [],
      mentorStatus: row.mentorStatus as CheckinRecord['mentorStatus'],
      mentorFeedback: row.mentorFeedback,
      feishuRecordId: row.feishuRecordId,
      feishuSyncStatus: (row.feishuSyncStatus ?? 'pending') as CheckinRecord['feishuSyncStatus'],
      feishuSyncError: row.feishuSyncError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapLineCodeToDirection(lineCode: LineCode): string {
    const map: Record<LineCode, string> = {
      A: 'A触达与邀约',
      B: 'B官方账号',
      C: 'C社群与爆款',
      D: 'D供给线',
      E: 'E情报与产品',
    };
    return map[lineCode] || '公共任务';
  }

  private async syncCheckinToFeishu(
    recordId: string,
    dto: CreateCheckinRequest,
    mentorStatus: string,
    mentorFeedback: string,
  ): Promise<void> {
    const syncEnabled = await this.bitableService.isSyncEnabled();
    if (!syncEnabled) return;

    const { items: dayRecords } = await this.businessRecordService.findByInternAndDate(
      dto.internName,
      dto.checkinDate,
    );

    const tableKeys = [...new Set(dayRecords.map((r) => r.tableKey))];
    const backfillTables = tableKeys.length > 0
      ? tableKeys.map((key) => {
          const map: Record<string, string> = {
            outreach: '触达记录表',
            interview: '访谈记录表',
            viral_candidates: '爆款候选池',
            community_feedback: '社群反馈表',
            content_distribution: '内容分发清单',
            topic_scheduling: '选题排产表',
          };
          return map[key] || '不用回填';
        }).join('、')
      : '不用回填';

    const recordTitle = `${dto.internName} ${dto.lineName} ${dto.checkinDate} 打卡`;
    const taskAction = dto.completedTasks.map((t) => t.taskName).join('；');

    const result = await this.bitableService.syncCheckinToFeishu({
      date: dto.checkinDate,
      internName: dto.internName,
      direction: this.mapLineCodeToDirection(dto.lineCode),
      recordTitle,
      taskAction,
      dailyGoal: dto.dailyGoal,
      actualCompletion: dto.actualCompletion,
      completed: dto.completedTasks.length > 0,
      outputLinks: dto.outputLinks,
      backfillTable: backfillTables,
      northStarMetric: '',
      blockers: dto.blockers,
      mentorStatus: mentorStatus === 'pending' ? '待验收' : mentorStatus === 'passed' ? '通过' : '需改进',
      mentorFeedback,
    });

    if (result.error) {
      this.logger.warn(`打卡同步飞书失败: ${result.error}`);
      await this.db
        .update(checkinRecord)
        .set({
          feishuSyncStatus: 'failed',
          feishuSyncError: result.error,
          updatedAt: new Date(),
        })
        .where(eq(checkinRecord.id, recordId));
    } else {
      this.logger.log(`打卡已同步到飞书: ${result.recordId}`);
      await this.db
        .update(checkinRecord)
        .set({
          feishuRecordId: result.recordId,
          feishuSyncStatus: 'success',
          feishuSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(checkinRecord.id, recordId));
    }
  }

  async toggleTask(dto: TaskToggleRequest): Promise<TaskToggleResponse> {
    this.logger.log(`任务勾选: ${dto.internName} - ${dto.lineCode} - ${dto.taskId} - ${dto.completed}`);

    const existing = await this.db
      .select()
      .from(checkinRecord)
      .where(
        and(
          eq(checkinRecord.internName, dto.internName),
          eq(checkinRecord.lineCode, dto.lineCode),
          eq(checkinRecord.checkinDate, dto.checkinDate),
        ),
      )
      .limit(1);

    let checkinId: string;
    let completedTasks: CompletedTaskSnapshot[];
    let currentFeishuRecordId: string | null | undefined;

    if (existing.length === 0) {
      const newTask: CompletedTaskSnapshot = {
        taskId: dto.taskId,
        taskName: dto.taskName,
        completion: dto.completion ?? '',
        attachments: [],
      };
      completedTasks = dto.completed ? [newTask] : [];

      const result = await this.db
        .insert(checkinRecord)
        .values({
          internName: dto.internName,
          lineCode: dto.lineCode,
          lineName: dto.lineName,
          checkinDate: dto.checkinDate,
          dailyGoal: dto.completed ? dto.taskName : '',
          actualCompletion: dto.completed && dto.completion ? `${dto.taskName}：${dto.completion}` : '',
          deliverables: '',
          outputLinks: '',
          blockers: '',
          completedTasks: completedTasks as unknown as Record<string, unknown>[],
          deliverableAttachments: [] as unknown as Record<string, unknown>[],
          mentorStatus: 'pending',
          feishuSyncStatus: 'pending',
        })
        .returning({ id: checkinRecord.id, feishuRecordId: checkinRecord.feishuRecordId });

      checkinId = result[0].id;
      currentFeishuRecordId = result[0].feishuRecordId;
    } else {
      const record = existing[0];
      checkinId = record.id;
      currentFeishuRecordId = record.feishuRecordId;
      const currentTasks: CompletedTaskSnapshot[] =
        (record.completedTasks as CompletedTaskSnapshot[]) ?? [];

      if (dto.completed) {
        const idx = currentTasks.findIndex((t) => t.taskId === dto.taskId);
        const updatedTask: CompletedTaskSnapshot = {
          taskId: dto.taskId,
          taskName: dto.taskName,
          completion: dto.completion ?? '',
          attachments: currentTasks[idx]?.attachments ?? [],
        };
        if (idx >= 0) {
          completedTasks = [...currentTasks];
          completedTasks[idx] = updatedTask;
        } else {
          completedTasks = [...currentTasks, updatedTask];
        }
      } else {
        completedTasks = currentTasks.filter((t) => t.taskId !== dto.taskId);
      }

      const dailyGoal = completedTasks.map((t) => t.taskName).join('；');
      const actualCompletion = completedTasks
        .map((t) => (t.completion ? `${t.taskName}：${t.completion}` : t.taskName))
        .join('；');

      await this.db
        .update(checkinRecord)
        .set({
          completedTasks: completedTasks as unknown as Record<string, unknown>[],
          dailyGoal,
          actualCompletion,
          lineName: dto.lineName,
          updatedAt: new Date(),
        })
        .where(eq(checkinRecord.id, checkinId));
    }

    const completedTaskCount = completedTasks.length;
    const syncEnabled = await this.bitableService.isSyncEnabled();

    if (dto.completed || completedTasks.length > 0 || !syncEnabled) {
      this.syncToggleToFeishu(checkinId, dto, completedTasks, currentFeishuRecordId).catch(
        (err: unknown) => {
          this.logger.warn(`任务勾选同步飞书失败: ${err instanceof Error ? err.message : String(err)}`);
        },
      );
    } else {
      this.deleteCheckinFromFeishu(checkinId, dto, currentFeishuRecordId).catch(
        (err: unknown) => {
          this.logger.warn(`取消勾选删除飞书记录失败: ${err instanceof Error ? err.message : String(err)}`);
        },
      );
    }

    return {
      success: true,
      checkinId,
      feishuSynced: false,
      completedTaskCount,
      syncStatus: syncEnabled ? 'syncing' : 'skipped',
    };
  }

  private async syncToggleToFeishu(
    recordId: string,
    dto: TaskToggleRequest,
    completedTasks: CompletedTaskSnapshot[],
    existingFeishuRecordId: string | null | undefined,
  ): Promise<void> {
    const syncEnabled = await this.bitableService.isSyncEnabled();
    if (!syncEnabled) return;

    const taskAction = completedTasks.map((t) => t.taskName).join('；');
    const dailyGoal = completedTasks.map((t) => t.taskName).join('；');
    const actualCompletion = completedTasks
      .map((t) => (t.completion ? `${t.taskName}：${t.completion}` : t.taskName))
      .join('；');
    const recordTitle = `${dto.internName} ${dto.lineName} ${dto.checkinDate} 打卡`;
    const direction = this.mapLineCodeToDirection(dto.lineCode);

    let feishuRecordId: string | undefined = existingFeishuRecordId ?? undefined;
    let syncError: string | undefined;

    try {
      if (!feishuRecordId) {
        const findResult = await this.bitableService.findCheckinRecordId(
          dto.checkinDate,
          dto.internName,
          direction,
        );
        if (findResult.error) {
          this.logger.warn(`查找飞书打卡记录失败: ${findResult.error}`);
        }
        feishuRecordId = findResult.recordId;
      }

      const result = await this.bitableService.updateCheckinToFeishu(
        {
          date: dto.checkinDate,
          internName: dto.internName,
          direction,
          recordTitle,
          taskAction,
          dailyGoal,
          actualCompletion,
          completed: completedTasks.length > 0,
          outputLinks: '',
          backfillTable: '不用回填',
          northStarMetric: dto.northStarMetric,
          blockers: '',
          mentorStatus: '待验收',
          mentorFeedback: '',
        },
        feishuRecordId,
      );

      if (result.error) {
        syncError = result.error;
        this.logger.warn(`任务勾选同步飞书失败: ${result.error}`);
      } else {
        feishuRecordId = result.recordId;
        this.logger.log(`任务勾选已同步到飞书: ${result.recordId}`);
      }
    } catch (error: unknown) {
      syncError = error instanceof Error ? error.message : String(error);
      this.logger.warn(`任务勾选同步飞书异常: ${syncError}`);
    }

    await this.db
      .update(checkinRecord)
      .set({
        feishuRecordId: syncError ? existingFeishuRecordId ?? null : feishuRecordId ?? null,
        feishuSyncStatus: syncError ? 'failed' : 'success',
        feishuSyncError: syncError ?? null,
        updatedAt: new Date(),
      })
      .where(eq(checkinRecord.id, recordId));
  }

  private async deleteCheckinFromFeishu(
    recordId: string,
    dto: TaskToggleRequest,
    existingFeishuRecordId: string | null | undefined,
  ): Promise<void> {
    const syncEnabled = await this.bitableService.isSyncEnabled();
    if (!syncEnabled) return;

    let feishuRecordId: string | undefined = existingFeishuRecordId ?? undefined;
    let syncError: string | undefined;

    try {
      if (!feishuRecordId) {
        const direction = this.mapLineCodeToDirection(dto.lineCode);
        const findResult = await this.bitableService.findCheckinRecordId(
          dto.checkinDate,
          dto.internName,
          direction,
        );
        if (findResult.error) {
          this.logger.warn(`查找飞书打卡记录失败: ${findResult.error}`);
        }
        feishuRecordId = findResult.recordId;
      }

      if (feishuRecordId) {
        const result = await this.bitableService.deleteCheckinFromFeishu(feishuRecordId);
        if (!result.success) {
          syncError = result.error;
          this.logger.warn(`删除飞书打卡记录失败: ${result.error}`);
        } else {
          this.logger.log(`已删除飞书打卡记录: ${feishuRecordId}`);
        }
      }
    } catch (error: unknown) {
      syncError = error instanceof Error ? error.message : String(error);
      this.logger.warn(`删除飞书打卡记录异常: ${syncError}`);
    }

    await this.db
      .update(checkinRecord)
      .set({
        feishuRecordId: syncError ? existingFeishuRecordId ?? null : null,
        feishuSyncStatus: syncError ? 'failed' : 'success',
        feishuSyncError: syncError ?? null,
        updatedAt: new Date(),
      })
      .where(eq(checkinRecord.id, recordId));
  }
}
