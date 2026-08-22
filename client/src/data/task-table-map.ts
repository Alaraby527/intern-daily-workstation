import type { BitableTableKey } from '@shared/api.interface';

export interface TaskTableMapping {
  tableKey: BitableTableKey;
  tableName: string;
  externalLink?: string;
}

export const TASK_TABLE_MAP: Record<string, TaskTableMapping> = {
  // A线 - 触达记录表
  'A-morning-1': { tableKey: 'outreach', tableName: '触达记录表' },
  'A-morning-2': { tableKey: 'outreach', tableName: '触达记录表' },
  'A-afternoon-1': { tableKey: 'outreach', tableName: '触达记录表' },
  'A-afternoon-2': { tableKey: 'outreach', tableName: '触达记录表' },
  'A-beforeOff-1': { tableKey: 'outreach', tableName: '触达记录表' },

  // A线 - 访谈记录表
  'A-afternoon-3': { tableKey: 'interview', tableName: '访谈记录表' },

  // B线 - 内容分发清单
  'B-morning-2': { tableKey: 'topic_scheduling', tableName: '选题排产表' },
  'B-afternoon-3': { tableKey: 'content_distribution', tableName: '内容分发清单' },
  'B-beforeOff-1': { tableKey: 'content_distribution', tableName: '内容分发清单' },

  // C线 - 社群反馈表
  'C-morning-1': { tableKey: 'community_feedback', tableName: '社群反馈表' },

  // C线 - 爆款候选池
  'C-morning-2': { tableKey: 'viral_candidates', tableName: '爆款候选池' },
  'C-morning-3': { tableKey: 'viral_candidates', tableName: '爆款候选池' },
  'C-afternoon-1': { tableKey: 'viral_candidates', tableName: '爆款候选池' },

  // C线 - 内容分发清单
  'C-afternoon-3': { tableKey: 'content_distribution', tableName: '内容分发清单' },

  // C线 - 社群反馈表（互动记录）
  'C-beforeOff-1': { tableKey: 'community_feedback', tableName: '社群反馈表' },

  // D线 - 选题排产表
  'D-morning-1': { tableKey: 'topic_scheduling', tableName: '选题排产表' },
  'D-morning-2': { tableKey: 'topic_scheduling', tableName: '选题排产表' },
  'D-morning-3': { tableKey: 'topic_scheduling', tableName: '选题排产表' },
  'D-afternoon-1': { tableKey: 'topic_scheduling', tableName: '选题排产表' },
  'D-beforeOff-1': { tableKey: 'topic_scheduling', tableName: '选题排产表' },

  // E线 - 外部表
  'E-morning-1': {
    tableKey: 'community_feedback',
    tableName: 'bug台账（外部表）',
    externalLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_F',
  },
  'E-weekly-2': {
    tableKey: 'community_feedback',
    tableName: '功能提案表（外部表）',
    externalLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_F',
  },
  'E-weekly-4': {
    tableKey: 'community_feedback',
    tableName: '功能提案表（外部表）',
    externalLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_F',
  },
  'E-weekly-5': {
    tableKey: 'community_feedback',
    tableName: 'bug台账（外部表）',
    externalLink: 'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN_F',
  },
};

export function getTaskTableMapping(taskId: string): TaskTableMapping | undefined {
  return TASK_TABLE_MAP[taskId];
}
