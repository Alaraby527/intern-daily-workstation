import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { feishuBitableConfig, businessRecord } from '@server/database/schema';
import type {
  BitableTableKey,
  BitableTableDef,
  FormFieldDef,
} from '@shared/api.interface';
import { BITABLE_TABLES } from './bitable-tables';

@Injectable()
export class BitableService {
  private readonly logger = new Logger(BitableService.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly httpService: HttpService,
  ) {}

  getTableDef(tableKey: BitableTableKey): BitableTableDef | undefined {
    return BITABLE_TABLES.find((t: BitableTableDef) => t.tableKey === tableKey);
  }

  getAllTables(): BitableTableDef[] {
    return BITABLE_TABLES;
  }

  async getConfig(): Promise<{
    id: string;
    appId: string | null;
    baseToken: string;
    enabled: boolean;
  } | null> {
    const rows = await this.db
      .select({
        id: feishuBitableConfig.id,
        appId: feishuBitableConfig.appId,
        baseToken: feishuBitableConfig.baseToken,
        enabled: feishuBitableConfig.enabled,
      })
      .from(feishuBitableConfig)
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0];
  }

  async getFullConfig(): Promise<{
    id: string;
    appId: string | null;
    appSecret: string | null;
    baseToken: string;
    enabled: boolean;
  } | null> {
    const rows = await this.db
      .select()
      .from(feishuBitableConfig)
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0];
  }

  async saveConfig(dto: {
    appId: string;
    appSecret: string;
    baseToken?: string;
    enabled: boolean;
  }, userId?: string): Promise<{ id: string; success: boolean }> {
    const existing = await this.getFullConfig();

    const patch = {
      appId: dto.appId,
      appSecret: dto.appSecret,
      baseToken: dto.baseToken ?? 'YOUR_BASE_TOKEN',
      enabled: dto.enabled,
      updatedAt: new Date(),
      ...(userId ? { updatedBy: userId } : {}),
    };

    if (existing) {
      await this.db
        .update(feishuBitableConfig)
        .set(patch)
        .where(eq(feishuBitableConfig.id, existing.id));
      this.tokenCache = null;
      return { id: existing.id, success: true };
    }

    const result = await this.db
      .insert(feishuBitableConfig)
      .values({
        ...patch,
        ...(userId ? { createdBy: userId } : {}),
      })
      .returning({ id: feishuBitableConfig.id });

    this.tokenCache = null;
    return { id: result[0].id, success: true };
  }

  async isSyncEnabled(): Promise<boolean> {
    const config = await this.getFullConfig();
    return !!(config && config.enabled && config.appId && config.appSecret);
  }

  private async getTenantAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.token;
    }

    const config = await this.getFullConfig();
    if (!config || !config.appId || !config.appSecret) {
      throw new Error('飞书应用凭证未配置');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
          {
            app_id: config.appId,
            app_secret: config.appSecret,
          },
        ),
      );

      const data = response.data;
      if (data.code !== 0) {
        throw new Error(`获取 tenant_access_token 失败: ${data.msg}`);
      }

      this.tokenCache = {
        token: data.tenant_access_token,
        expiresAt: now + data.expire * 1000,
      };

      return data.tenant_access_token;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`获取飞书 tenant_access_token 失败: ${msg}`);
      throw error;
    }
  }

  async addRecord(
    tableKey: BitableTableKey,
    fieldsData: Record<string, any>,
  ): Promise<{ recordId: string }> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      throw new Error('飞书集成未启用');
    }

    const tableDef = this.getTableDef(tableKey);
    if (!tableDef) {
      throw new Error(`未知的业务表: ${tableKey}`);
    }

    const token = await this.getTenantAccessToken();
    const bitableFields = this.convertToBitableFields(fieldsData, tableDef.fields);

    this.logger.log(
      `飞书Bitable写入准备 tableKey=${tableKey} ` +
      `原始字段=${JSON.stringify(Object.keys(fieldsData))} ` +
      `转换后字段=${JSON.stringify(Object.keys(bitableFields))}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseToken}/tables/${tableDef.tableId}/records`,
          { fields: bitableFields },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;
      if (data.code !== 0) {
        throw new Error(`飞书Bitable写入失败 [${data.code}]: ${data.msg}`);
      }

      return { recordId: data.data.record.record_id };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const respBody = this.extractErrorResponseBody(error);
      const fullMsg = respBody ? `${msg} | response: ${respBody}` : msg;
      this.logger.error(`飞书Bitable写入失败 [${tableKey}]: ${fullMsg}`);
      throw new Error(fullMsg);
    }
  }

  async deleteRecord(
    tableKey: BitableTableKey,
    feishuRecordId: string,
  ): Promise<void> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      return;
    }

    const tableDef = this.getTableDef(tableKey);
    if (!tableDef) return;

    const token = await this.getTenantAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseToken}/tables/${tableDef.tableId}/records/${feishuRecordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      const data = response.data;
      if (data.code !== 0) {
        throw new Error(`飞书Bitable删除失败 [${data.code}]: ${data.msg}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const respBody = this.extractErrorResponseBody(error);
      const fullMsg = respBody ? `${msg} | response: ${respBody}` : msg;
      this.logger.error(`飞书Bitable删除失败 [${tableKey}]: ${fullMsg}`);
      throw new Error(fullMsg);
    }
  }

  async syncRecordToFeishu(recordId: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(businessRecord)
      .where(eq(businessRecord.id, recordId))
      .limit(1);

    if (rows.length === 0) return;
    const record = rows[0];

    try {
      const result = await this.addRecord(
        record.tableKey as BitableTableKey,
        record.fieldsData as Record<string, any>,
      );

      await this.db
        .update(businessRecord)
        .set({
          feishuRecordId: result.recordId,
          feishuSyncStatus: 'success',
          feishuSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(businessRecord.id, recordId));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.db
        .update(businessRecord)
        .set({
          feishuSyncStatus: 'failed',
          feishuSyncError: msg,
          updatedAt: new Date(),
        })
        .where(eq(businessRecord.id, recordId));
    }
  }

  private dateToFeishuTimestamp(dateStr: string): number {
    if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      return NaN;
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return NaN;
    return Date.UTC(year, month - 1, day);
  }

  private convertToBitableFields(
    data: Record<string, any>,
    fieldDefs: FormFieldDef[],
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const field of fieldDefs) {
      const value = data[field.key];
      if (value === undefined || value === null || value === '') continue;

      if (field.type === 'select') {
        result[field.label] = value;
      } else if (field.type === 'date') {
        const ts = this.dateToFeishuTimestamp(value);
        if (!Number.isNaN(ts)) result[field.label] = ts;
      } else if (field.type === 'number') {
        const num = Number(value);
        if (!Number.isNaN(num)) result[field.label] = num;
      } else {
        result[field.label] = String(value);
      }
    }

    return result;
  }

  private extractErrorResponseBody(error: unknown): string | null {
    try {
      const err = error as { response?: { data?: unknown } };
      if (err.response?.data) {
        return JSON.stringify(err.response.data).slice(0, 500);
      }
      return null;
    } catch {
      return null;
    }
  }

  private readonly SPREADSHEET_TOKEN = 'YOUR_SPREADSHEET_TOKEN';

  async getSheetNextSeq(sheetTitle: string): Promise<number> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      return 1;
    }

    const token = await this.getTenantAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${this.SPREADSHEET_TOKEN}/values/${encodeURIComponent(sheetTitle)}!A:A`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      const data = response.data;
      if (data.code !== 0) {
        this.logger.warn(`读取飞书表格序号失败 [${sheetTitle}]: ${data.msg}`);
        return 1;
      }

      const values: any[][] = data.data?.valueRange?.values ?? [];
      if (values.length <= 1) return 1;

      const lastRow = values[values.length - 1];
      const lastSeq = Number(lastRow[0]);
      return Number.isFinite(lastSeq) && lastSeq > 0 ? lastSeq + 1 : 1;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`读取飞书表格序号异常: ${msg}`);
      return 1;
    }
  }

  async appendToSheet(
    sheetTitle: string,
    values: (string | number)[][],
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      return { success: false, error: '飞书集成未启用' };
    }

    const token = await this.getTenantAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${this.SPREADSHEET_TOKEN}/values_append`,
          {
            valueRange: {
              range: `${sheetTitle}!A1`,
              values,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;
      if (data.code !== 0) {
        return { success: false, error: `飞书Sheets写入失败 [${data.code}]: ${data.msg}` };
      }

      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const respBody = this.extractErrorResponseBody(error);
      const fullMsg = respBody ? `${msg} | response: ${respBody}` : msg;
      this.logger.error(`飞书Sheets写入失败 [${sheetTitle}]: ${fullMsg}`);
      return { success: false, error: fullMsg };
    }
  }

  async syncCheckinToFeishu(checkinData: {
    date: string;
    internName: string;
    direction: string;
    recordTitle: string;
    taskAction: string;
    dailyGoal: string;
    actualCompletion: string;
    completed: boolean;
    outputLinks: string;
    backfillTable: string;
    northStarMetric: string;
    blockers: string;
    mentorStatus: string;
    mentorFeedback: string;
  }): Promise<{ recordId?: string; error?: string }> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      return { error: '飞书集成未启用' };
    }

    const tableDef = this.getTableDef('daily_checkin');
    if (!tableDef) {
      return { error: '每日打卡记录表未定义' };
    }

    const token = await this.getTenantAccessToken();
    const fields: Record<string, any> = {
      '日期': this.dateToFeishuTimestamp(checkinData.date),
      '实习生姓名': checkinData.internName,
      '方向': checkinData.direction,
      '记录标题': checkinData.recordTitle,
      '任务动作': checkinData.taskAction,
      '当日目标（做多少）': checkinData.dailyGoal,
      '实际完成量（数字说话）': checkinData.actualCompletion,
      '是否完成': checkinData.completed,
      '产出物链接': checkinData.outputLinks,
      '回填到哪张表': checkinData.backfillTable,
      '对应北极星指标': checkinData.northStarMetric,
      '卡点/备注': checkinData.blockers,
      'mentor验收': checkinData.mentorStatus,
      'mentor反馈': checkinData.mentorFeedback,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseToken}/tables/${tableDef.tableId}/records`,
          { fields },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;
      if (data.code !== 0) {
        return { error: `飞书Bitable写入失败 [${data.code}]: ${data.msg}` };
      }

      return { recordId: data.data.record.record_id };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`打卡同步飞书失败: ${msg}`);
      return { error: msg };
    }
  }

  getInternFieldLabel(tableKey: BitableTableKey): string | null {
    const map: Record<string, string> = {
      outreach: '跟进人',
      interview: '访谈人',
      viral_candidates: '挖掘人',
      community_feedback: '记录人',
      content_distribution: '分发人',
      topic_scheduling: '负责人',
      daily_checkin: '实习生姓名',
    };
    return map[tableKey] ?? null;
  }

  getDateFieldLabel(tableKey: BitableTableKey): string | null {
    const map: Record<string, string> = {
      outreach: '触达日期',
      interview: '访谈日期',
      viral_candidates: '挖掘日期',
      community_feedback: '反馈日期',
      content_distribution: '发布日期',
      topic_scheduling: '计划日期',
      daily_checkin: '日期',
    };
    return map[tableKey] ?? null;
  }

  async searchBitableRecordIdsByInternAndDate(
    tableKey: BitableTableKey,
    internName: string,
    date: string,
  ): Promise<{ recordIds: string[]; error?: string }> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      return { recordIds: [] };
    }

    const tableDef = this.getTableDef(tableKey);
    if (!tableDef) {
      return { recordIds: [], error: `未知的业务表: ${tableKey}` };
    }

    const internField = this.getInternFieldLabel(tableKey);
    const dateField = this.getDateFieldLabel(tableKey);
    if (!internField || !dateField) {
      return { recordIds: [], error: `表 ${tableKey} 未配置 intern/date 字段映射` };
    }

    const token = await this.getTenantAccessToken();
    const timestamp = this.dateToFeishuTimestamp(date);
    const allRecords: Array<{ record_id: string; fields: Record<string, any> }> = [];
    let pageToken: string | undefined;

    try {
      do {
        const body: Record<string, any> = {
          filter: {
            conjunction: 'and',
            conditions: [
              {
                field_name: internField,
                operator: 'is',
                value: [internName],
              },
            ],
          },
          page_size: 100,
        };
        if (pageToken) body.page_token = pageToken;

        const response = await firstValueFrom(
          this.httpService.post(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseToken}/tables/${tableDef.tableId}/records/search`,
            body,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );

        const data = response.data;
        if (data.code !== 0) {
          return { recordIds: [], error: `飞书Bitable搜索失败 [${data.code}]: ${data.msg}` };
        }

        const items: Array<{ record_id: string; fields: Record<string, any> }> = data.data?.items ?? [];
        for (const item of items) {
          allRecords.push(item);
        }

        pageToken = data.data?.page_token;
      } while (pageToken);

      const recordIds = allRecords
        .filter((r) => r.fields[dateField] === timestamp)
        .map((r) => r.record_id);

      return { recordIds };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const respBody = this.extractErrorResponseBody(error);
      const fullMsg = respBody ? `${msg} | response: ${respBody}` : msg;
      this.logger.error(`飞书记录搜索失败 [${tableKey}]: ${fullMsg}`);
      return { recordIds: [], error: fullMsg };
    }
  }

  async findCheckinRecordId(
    date: string,
    internName: string,
    direction: string,
  ): Promise<{ recordId?: string; error?: string }> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      return { error: '飞书集成未启用' };
    }

    const tableDef = this.getTableDef('daily_checkin');
    if (!tableDef) {
      return { error: '每日打卡记录表未定义' };
    }

    const token = await this.getTenantAccessToken();
    const timestamp = this.dateToFeishuTimestamp(date);
    const filter = {
      conjunction: 'and',
      conditions: [
        {
          field_name: '日期',
          operator: 'is',
          value: [timestamp],
        },
        {
          field_name: '实习生姓名',
          operator: 'is',
          value: [internName],
        },
        {
          field_name: '方向',
          operator: 'contains',
          value: [direction],
        },
      ],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseToken}/tables/${tableDef.tableId}/records/search`,
          { filter },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const data = response.data;
      if (data.code !== 0) {
        return { error: `飞书Bitable搜索失败 [${data.code}]: ${data.msg}` };
      }

      const items: Array<{ record_id: string }> = data.data?.items ?? [];
      if (items.length === 0) {
        return { recordId: undefined };
      }

      return { recordId: items[0].record_id };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const respBody = this.extractErrorResponseBody(error);
      const fullMsg = respBody ? `${msg} | response: ${respBody}` : msg;
      this.logger.error(`飞书打卡记录搜索失败: ${fullMsg}`);
      return { error: fullMsg };
    }
  }

  async updateCheckinToFeishu(
    checkinData: {
      date: string;
      internName: string;
      direction: string;
      recordTitle: string;
      taskAction: string;
      dailyGoal: string;
      actualCompletion: string;
      completed: boolean;
      outputLinks: string;
      backfillTable: string;
      northStarMetric: string;
      blockers: string;
      mentorStatus: string;
      mentorFeedback: string;
    },
    recordId?: string,
  ): Promise<{ recordId?: string; error?: string }> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      return { error: '飞书集成未启用' };
    }

    const tableDef = this.getTableDef('daily_checkin');
    if (!tableDef) {
      return { error: '每日打卡记录表未定义' };
    }

    const token = await this.getTenantAccessToken();
    const fields: Record<string, any> = {
      '日期': this.dateToFeishuTimestamp(checkinData.date),
      '实习生姓名': checkinData.internName,
      '方向': checkinData.direction,
      '记录标题': checkinData.recordTitle,
      '任务动作': checkinData.taskAction,
      '当日目标（做多少）': checkinData.dailyGoal,
      '实际完成量（数字说话）': checkinData.actualCompletion,
      '是否完成': checkinData.completed,
      '产出物链接': checkinData.outputLinks,
      '回填到哪张表': checkinData.backfillTable,
      '对应北极星指标': checkinData.northStarMetric,
      '卡点/备注': checkinData.blockers,
      'mentor验收': checkinData.mentorStatus,
      'mentor反馈': checkinData.mentorFeedback,
    };

    try {
      const url = recordId
        ? `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseToken}/tables/${tableDef.tableId}/records/${recordId}`
        : `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseToken}/tables/${tableDef.tableId}/records`;

      const response = await firstValueFrom(
        recordId
          ? this.httpService.put(url, { fields }, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
          : this.httpService.post(url, { fields }, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }),
      );

      const data = response.data;
      if (data.code !== 0) {
        return { error: `飞书Bitable写入失败 [${data.code}]: ${data.msg}` };
      }

      return { recordId: data.data.record.record_id };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const respBody = this.extractErrorResponseBody(error);
      const fullMsg = respBody ? `${msg} | response: ${respBody}` : msg;
      this.logger.error(`打卡更新飞书失败: ${fullMsg}`);
      return { error: fullMsg };
    }
  }

  async deleteCheckinFromFeishu(
    feishuRecordId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const config = await this.getFullConfig();
    if (!config || !config.enabled || !config.appId || !config.appSecret) {
      return { success: false, error: '飞书集成未启用' };
    }

    const tableDef = this.getTableDef('daily_checkin');
    if (!tableDef) {
      return { success: false, error: '每日打卡记录表未定义' };
    }

    const token = await this.getTenantAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.baseToken}/tables/${tableDef.tableId}/records/${feishuRecordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      const data = response.data;
      if (data.code !== 0) {
        return { success: false, error: `飞书Bitable删除失败 [${data.code}]: ${data.msg}` };
      }

      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const respBody = this.extractErrorResponseBody(error);
      const fullMsg = respBody ? `${msg} | response: ${respBody}` : msg;
      this.logger.error(`飞书打卡记录删除失败: ${fullMsg}`);
      return { success: false, error: fullMsg };
    }
  }
}
