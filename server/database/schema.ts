/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, index, jsonb, pgTable, text, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const businessRecord = pgTable("business_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableKey: varchar("table_key", { length: 50 }).notNull(),
  taskId: varchar("task_id", { length: 100 }).notNull(),
  internName: varchar("intern_name", { length: 50 }).notNull(),
  lineCode: varchar("line_code", { length: 10 }).notNull(),
  recordDate: date("record_date").notNull(),
  /**
   * @type { Record<string, any> }
   */
  fieldsData: jsonb("fields_data").notNull().default('{}'),
  feishuRecordId: varchar("feishu_record_id", { length: 100 }),
  feishuSyncStatus: varchar("feishu_sync_status", { length: 20 }).notNull().default('pending'),
  feishuSyncError: text("feishu_sync_error"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_business_record_table_key").on(table.tableKey),
  index("idx_business_record_task_id").on(table.taskId),
  index("idx_business_record_intern_date").on(table.internName, table.recordDate),
  index("idx_business_record_sync_status").on(table.feishuSyncStatus),
]);

export const feishuBitableConfig = pgTable("feishu_bitable_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: varchar("app_id", { length: 100 }),
  appSecret: text("app_secret"),
  baseToken: varchar("base_token", { length: 100 }).notNull().default('YOUR_BASE_TOKEN'),
  enabled: boolean("enabled").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const checkinRecord = pgTable("checkin_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  internName: varchar("intern_name", { length: 50 }).notNull(),
  lineCode: varchar("line_code", { length: 10 }).notNull(),
  lineName: varchar("line_name", { length: 50 }).notNull(),
  checkinDate: date("checkin_date").notNull(),
  dailyGoal: text("daily_goal"),
  actualCompletion: text("actual_completion"),
  deliverables: text("deliverables"),
  outputLinks: text("output_links"),
  blockers: text("blockers"),
  /**
   * @type { taskId: string; taskName: string; completion: string }
   */
  completedTasks: jsonb("completed_tasks").default('[]'),
  mentorStatus: varchar("mentor_status", { length: 20 }).notNull().default('pending'),
  mentorFeedback: text("mentor_feedback"),
  /**
   * @type { name: string; url: string; type: string }
   */
  deliverableAttachments: jsonb("deliverable_attachments").notNull().default('[]'),
  feishuRecordId: varchar("feishu_record_id", { length: 100 }),
  feishuSyncStatus: varchar("feishu_sync_status", { length: 20 }).notNull().default('pending'),
  feishuSyncError: text("feishu_sync_error"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_checkin_record_date_name").on(table.checkinDate, table.internName),
  index("idx_checkin_record_line_code").on(table.lineCode),
  index("idx_checkin_record_mentor_status").on(table.mentorStatus),
  index("idx_checkin_feishu_status").on(table.feishuSyncStatus),
]);

// table aliases
export const businessRecordTable = businessRecord;
export const checkinRecordTable = checkinRecord;
export const feishuBitableConfigTable = feishuBitableConfig;
