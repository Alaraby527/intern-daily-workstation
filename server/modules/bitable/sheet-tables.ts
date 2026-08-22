import type { SheetTableDef } from '@shared/api.interface';

export const SHEET_TABLES: SheetTableDef[] = [
  {
    tableKey: 'bug_register',
    sheetTitle: 'bug登记',
    name: 'bug登记',
    defaultStatus: '待处理',
    fields: [
      { key: 'summary', label: '一句话需求', type: 'text', required: true },
      { key: 'problem', label: '问题（可附图或文档）', type: 'textarea', required: true },
      { key: 'suggestion', label: '意见', type: 'textarea' },
      { key: 'submitter', label: '提出人', type: 'text', autoFill: 'internName', required: true },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'remarks', label: '备注', type: 'textarea' },
    ],
  },
  {
    tableKey: 'feature_proposal',
    sheetTitle: '优化登记',
    name: '功能提案',
    defaultStatus: '待评估',
    fields: [
      { key: 'summary', label: '一句话需求/使用不爽的点', type: 'text', required: true },
      { key: 'idea', label: '想法', type: 'textarea', required: true },
      { key: 'suggestion', label: '建议', type: 'textarea', required: true },
      { key: 'submitter', label: '提出人', type: 'text', autoFill: 'internName', required: true },
      { key: 'status', label: '状态', type: 'text' },
      { key: 'remarks', label: '备注', type: 'textarea' },
    ],
  },
];
