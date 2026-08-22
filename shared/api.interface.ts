export type LineCode = 'A' | 'B' | 'C' | 'D' | 'E';

export type TaskGroup = 'morning' | 'afternoon' | 'beforeOff' | 'weekly';

export type WeeklyDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface TaskItem {
  id: string;
  name: string;
  duration: string;
  completionMark: string;
  steps: string[];
  group: TaskGroup;
  weeklyDay?: WeeklyDay;
}

export interface BusinessLine {
  code: LineCode;
  name: string;
  shortName: string;
  description: string;
  northStar: string[];
  dailyDeliverables: string[];
  weeklyDeliverables: string[];
  sopLink: string;
  completionDefinition: string;
  color: string;
}

export interface Intern {
  name: string;
  lineCodes: LineCode[];
}

export type MentorStatus = 'pending' | 'passed' | 'needs-improvement';

export interface DeliverableAttachment {
  name: string;
  url: string;
  type: 'file' | 'image' | 'link';
}

export interface CompletedTaskSnapshot {
  taskId: string;
  taskName: string;
  completion: string;
  attachments: DeliverableAttachment[];
}

export interface CheckinRecord {
  id: string;
  internName: string;
  lineCode: LineCode;
  lineName: string;
  checkinDate: string;
  dailyGoal: string;
  actualCompletion: string;
  deliverables: string;
  outputLinks: string;
  blockers: string;
  completedTasks: CompletedTaskSnapshot[];
  deliverableAttachments: DeliverableAttachment[];
  mentorStatus: MentorStatus;
  mentorFeedback: string | null;
  feishuRecordId?: string | null;
  feishuSyncStatus?: 'pending' | 'success' | 'failed' | 'skipped';
  feishuSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinListResponse {
  items: CheckinRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateCheckinRequest {
  internName: string;
  lineCode: LineCode;
  lineName: string;
  checkinDate: string;
  dailyGoal: string;
  actualCompletion: string;
  deliverables: string;
  outputLinks: string;
  blockers: string;
  completedTasks: CompletedTaskSnapshot[];
  deliverableAttachments: DeliverableAttachment[];
}

export interface MentorReviewRequest {
  mentorStatus: MentorStatus;
  mentorFeedback?: string;
}

export type BitableTableKey =
  | 'outreach'
  | 'interview'
  | 'viral_candidates'
  | 'community_feedback'
  | 'content_distribution'
  | 'topic_scheduling'
  | 'daily_checkin';

export type SheetTableKey = 'bug_register' | 'feature_proposal';

export interface SheetTableDef {
  tableKey: SheetTableKey;
  sheetTitle: string;
  name: string;
  fields: FormFieldDef[];
  defaultStatus: string;
}

export type FieldType = 'text' | 'select' | 'date' | 'number' | 'textarea' | 'checkbox';

export interface FormFieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  autoFill?: 'internName' | 'today';
}

export interface BitableTableDef {
  tableKey: BitableTableKey;
  tableId: string;
  name: string;
  fields: FormFieldDef[];
}

export interface BusinessRecord {
  id: string;
  tableKey: BitableTableKey;
  taskId: string;
  internName: string;
  lineCode: LineCode;
  recordDate: string;
  fieldsData: Record<string, any>;
  feishuRecordId: string | null;
  feishuSyncStatus: 'pending' | 'success' | 'failed' | 'skipped';
  feishuSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessRecordRequest {
  tableKey: BitableTableKey;
  taskId: string;
  internName: string;
  lineCode: LineCode;
  recordDate: string;
  fieldsData: Record<string, any>;
}

export interface BusinessRecordListResponse {
  items: BusinessRecord[];
  total: number;
}

export interface SheetRecord {
  id: string;
  tableKey: SheetTableKey;
  taskId: string;
  internName: string;
  lineCode: LineCode;
  recordDate: string;
  fieldsData: Record<string, any>;
  feishuSyncStatus: 'pending' | 'success' | 'failed';
  feishuSyncError: string | null;
  seq: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSheetRecordRequest {
  tableKey: SheetTableKey;
  taskId: string;
  internName: string;
  lineCode: LineCode;
  recordDate: string;
  fieldsData: Record<string, any>;
}

export interface SheetRecordListResponse {
  items: SheetRecord[];
  total: number;
}

export interface FeishuBitableConfig {
  id: string;
  appId: string | null;
  baseToken: string;
  enabled: boolean;
}

export interface UpdateFeishuConfigRequest {
  appId: string;
  appSecret: string;
  baseToken?: string;
  enabled: boolean;
}

export interface FeishuSyncStatusResponse {
  enabled: boolean;
  configured: boolean;
}

export interface TaskToggleRequest {
  internName: string;
  lineCode: LineCode;
  lineName: string;
  checkinDate: string;
  taskId: string;
  taskName: string;
  dailyGoal: string;
  northStarMetric: string;
  completed: boolean;
  completion?: string;
}

export interface TaskToggleResponse {
  success: boolean;
  checkinId?: string;
  feishuSynced: boolean;
  feishuRecordId?: string;
  feishuSyncError?: string;
  completedTaskCount: number;
  syncStatus: 'syncing' | 'synced' | 'failed' | 'skipped';
}

export interface CurrentUserResponse {
  userId: string | null;
  userName: string | null;
}
