import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Clock, CheckCircle2, Paperclip, Table2, ExternalLink, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@client/src/components/ui/checkbox';
import { Button } from '@client/src/components/ui/button';
import AttachmentUploader from '@client/src/components/AttachmentUploader';
import BitableFormDrawer from '@client/src/components/BitableFormDrawer';
import { bitable } from '@client/src/api';
import { getTaskTableMapping } from '@client/src/data/task-table-map';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { TaskItem, WeeklyDay, DeliverableAttachment, BusinessRecord, LineCode } from '@shared/api.interface';
import type { TaskProgressEntry } from '@client/src/store/task-progress';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

export interface TaskProgressEntryView {
  completed: boolean;
  completion: string;
  attachments?: DeliverableAttachment[];
}

interface TaskItemProps {
  task: TaskItem;
  progress?: TaskProgressEntry;
  internName: string;
  lineCode: LineCode;
  recordDate: string;
  onToggle: (taskId: string, taskName: string, completed: boolean) => void;
  onSetCompletion: (taskId: string, completion: string, taskName: string) => void;
  onSetAttachments: (taskId: string, attachments: DeliverableAttachment[]) => void;
  onRetrySync?: (taskId: string, taskName: string) => void;
}

const WEEKLY_DAY_LABELS: Record<WeeklyDay, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
};

const getTodayWeeklyDay = (): WeeklyDay => {
  const day = new Date().getDay();
  const map: Record<number, WeeklyDay> = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
  };
  return map[day] ?? 'monday';
};

const TaskItemComponent = ({
  task,
  progress,
  internName,
  lineCode,
  recordDate,
  onToggle,
  onSetCompletion,
  onSetAttachments,
  onRetrySync,
}: TaskItemProps) => {
  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [tableDef, setTableDef] = useState<any>(null);
  const completed = progress?.completed ?? false;
  const completion = progress?.completion ?? '';
  const attachments = progress?.attachments ?? [];

  const tableMapping = getTaskTableMapping(task.id);
  const isExternalTable = !!tableMapping?.externalLink;

  useEffect(() => {
    if (tableMapping && !isExternalTable) {
      bitable.getRecordsByTask(task.id)
        .then((res) => setRecords(res.items))
        .catch((err) => {
          logger.warn('获取任务记录失败', err);
          toast.error('加载记录失败，请下拉刷新');
        });
      bitable.getTable(tableMapping.tableKey)
        .then((def) => setTableDef(def))
        .catch((err) => {
          logger.warn('获取表定义失败', err);
          toast.error('加载表定义失败');
        });
    }
  }, [task.id, tableMapping, isExternalTable]);

  const refreshRecords = useCallback(async () => {
    if (!tableMapping || isExternalTable) return;
    try {
      const res = await bitable.getRecordsByTask(task.id);
      logger.info(`刷新任务记录 taskId=${task.id} count=${res.items.length}`);
      setRecords(res.items);
    } catch (err) {
      logger.warn('刷新记录失败', err);
    }
  }, [task.id, tableMapping, isExternalTable]);

  const handleRecordCreated = useCallback(() => {
    refreshRecords();
  }, [refreshRecords]);

  const isWeekly = task.group === 'weekly';

  const handleToggle = () => {
    onToggle(task.id, task.name, !completed);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking checkbox area
    const target = e.target as HTMLElement;
    if (target.closest('[data-slot="checkbox"]')) return;
    if (target.closest('input')) return;
    setExpanded(!expanded);
  };

  return (
    <div className="group rounded-lg transition-all duration-200 hover:bg-accent/30">
      {/* Main row */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={handleExpandClick}
      >
        {/* Checkbox */}
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={completed}
            onCheckedChange={handleToggle}
            id={`task-${task.id}`}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span
              className={`text-sm font-medium leading-snug ${
                completed
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
            >
              {task.name}
            </span>
            {isWeekly && task.weeklyDay && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {WEEKLY_DAY_LABELS[task.weeklyDay]}
              </span>
            )}
            {completed && (
              <span className="shrink-0 inline-flex items-center gap-1">
                {progress?.syncStatus === 'syncing' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary" title="同步中">
                    <Loader2 className="size-3 animate-spin" />
                    同步中
                  </span>
                )}
                {progress?.syncStatus === 'synced' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-success" title="已同步到飞书">
                    <CheckCircle2 className="size-3" />
                    已同步
                  </span>
                )}
                {progress?.syncStatus === 'failed' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetrySync?.(task.id, task.name);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/20 touch-manipulation"
                    title={`同步失败：${progress.syncError ?? ''}，点击重试`}
                  >
                    <AlertCircle className="size-3.5" />
                    同步失败
                    <RefreshCw className="size-3.5" />
                  </button>
                )}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {task.duration}
            </span>
            <span className="truncate">{task.completionMark}</span>
          </div>

          {/* Completion text when completed */}
          {completed && completion && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" />
              完成量：{completion}
            </div>
          )}

          {/* Record count badge */}
          {tableMapping && records.length > 0 && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Table2 className="size-3.5" />
              已填写 {records.length} 条 {tableMapping.tableName}
            </div>
          )}

          {/* Completion input when just checked */}
          {completed && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={completion}
                onChange={(e) => onSetCompletion(task.id, e.target.value, task.name)}
                placeholder="填写完成量（数字或文字）…"
                className="w-full min-h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* Task attachments summary when completed */}
          {completed && attachments.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
              <Paperclip className="h-3 w-3" />
              <span>{attachments.length} 个产出物</span>
            </div>
          )}
        </div>

        {/* Expand arrow */}
        <div className="pt-0.5">
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-200 ${
              expanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </div>
      </div>

      {/* Expanded details */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? 'max-h-[1000px]' : 'max-h-0'
        }`}
      >
            <div className="px-3 pb-4 pl-10">
            <div className="rounded-lg bg-muted/50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-foreground">
                步骤
              </h4>
              <ol className="space-y-1.5">
                {task.steps.map((step: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-xs text-foreground/80">
                    <span className="shrink-0 font-medium text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-3 border-t border-border pt-2">
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                  <div>
                    <span className="text-xs font-semibold text-foreground">
                      完成标志
                    </span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {task.completionMark}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
                <div className="mb-2 flex items-center gap-1.5">
                  <Paperclip className="size-3.5 shrink-0 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    产出物
                  </span>
                </div>
                <AttachmentUploader
                  attachments={attachments}
                  onChange={(atts: DeliverableAttachment[]) =>
                    onSetAttachments(task.id, atts)
                  }
                />
              </div>

              {tableMapping && (
                <div className="mt-3 border-t border-border pt-2" onClick={(e) => e.stopPropagation()}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Table2 className="size-3.5 shrink-0 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        {tableMapping.tableName}
                      </span>
                    </div>
                    {records.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        已填 {records.length} 条
                      </span>
                    )}
                  </div>
                  {isExternalTable ? (
                    <UniversalLink
                      to={tableMapping.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="size-3" />
                      打开外部表填写
                    </UniversalLink>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setDrawerOpen(true)}
                    >
                      <Table2 className="size-3.5" />
                      填写记录
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>

      <BitableFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tableDef={tableDef}
        tableName={tableMapping?.tableName ?? ''}
        taskId={task.id}
        internName={internName}
        lineCode={lineCode}
        recordDate={recordDate}
        records={records}
        onRecordCreated={handleRecordCreated}
      />
    </div>
  );
};

export default TaskItemComponent;
