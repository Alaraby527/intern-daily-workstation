import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Image as ImageIcon, Link as LinkIcon, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteCheckin } from '@client/src/api/checkin';
import { extractErrorMessage } from '@client/src/api/http-utils';
import type {
  CheckinRecord,
  MentorStatus,
  DeliverableAttachment,
} from '@shared/api.interface';
import { BUSINESS_LINES } from '@client/src/data/lines';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface CheckinHistoryListProps {
  items: CheckinRecord[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onDelete?: (id: string) => void;
}

const statusConfig: Record<
  MentorStatus,
  { label: string; className: string }
> = {
  passed: {
    label: '验收通过',
    className:
      'bg-success/10 text-success border-success/20 border rounded-full',
  },
  'needs-improvement': {
    label: '需改进',
    className:
      'bg-warning/10 text-warning border-warning/20 border rounded-full',
  },
  pending: {
    label: '待验收',
    className:
      'bg-muted text-muted-foreground border-border border rounded-full',
  },
};

const CheckinHistoryList = ({
  items,
  loading,
  hasMore,
  onLoadMore,
  onDelete,
}: CheckinHistoryListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCheckin(id);
      toast.success('打卡记录已删除');
      if (onDelete) onDelete(id);
    } catch (error) {
      const msg = extractErrorMessage(error, '未知错误');
      toast.error(`删除失败：${msg.slice(0, 120)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getLineShortName = (lineCode: string): string =>
    BUSINESS_LINES[lineCode]?.shortName ?? lineCode;

  const getLineColor = (lineCode: string): string => {
    const colorMap: Record<string, string> = {
      A: 'bg-line-a',
      B: 'bg-line-b',
      C: 'bg-line-c',
      D: 'bg-line-d',
      E: 'bg-line-e',
    };
    return colorMap[lineCode] ?? 'bg-primary';
  };

  if (items.length === 0 && !loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">暂无历史打卡记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((record: CheckinRecord) => {
        const isExpanded = expandedId === record.id;
        const status = statusConfig[record.mentorStatus];

        return (
          <Card
            key={record.id}
            className="cursor-pointer shadow-sm transition-all hover:shadow-md"
            onClick={() => toggleExpand(record.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getLineColor(
                      record.lineCode,
                    )}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {record.checkinDate}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-border text-xs"
                      >
                        {getLineShortName(record.lineCode)}
                      </Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">
                      {record.actualCompletion.slice(0, 30) || '暂无完成量描述'}
                      {record.actualCompletion.length > 30 ? '...' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge className={status.className} variant="outline">
                    {status.label}
                  </Badge>
                  {onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="删除记录"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除打卡记录？</AlertDialogTitle>
                          <AlertDialogDescription>
                            删除后将同时移除本地记录和飞书多维表格中的对应数据，此操作不可撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(record.id);
                            }}
                            disabled={deletingId === record.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingId === record.id ? '删除中...' : '确认删除'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailField label="当日目标" value={record.dailyGoal} />
                    <DetailField
                      label="实际完成量"
                      value={record.actualCompletion}
                    />
                    <DetailField label="今日交付物" value={record.deliverables} />
                    <DetailField
                      label="产出物链接"
                      value={record.outputLinks}
                      mono
                    />
                  </div>

                  {record.blockers && (
                    <DetailField label="卡点 / 备注" value={record.blockers} />
                  )}

                  {record.completedTasks.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        已完成任务
                      </p>
                      <ul className="space-y-1">
                        {record.completedTasks.map(
                          (task: {
                            taskId: string;
                            taskName: string;
                            completion: string;
                            attachments?: DeliverableAttachment[];
                          }) => (
                            <li
                              key={task.taskId}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                              <span>
                                <span className="font-medium">
                                  {task.taskName}
                                </span>
                                {task.completion && (
                                  <span className="text-muted-foreground">
                                    {' '}
                                    — {task.completion}
                                  </span>
                                )}
                                {task.attachments && task.attachments.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {task.attachments.map((att: DeliverableAttachment, ai: number) => {
                                      const Icon = att.type === 'image' ? ImageIcon : att.type === 'link' ? LinkIcon : FileText;
                                      return (
                                        <UniversalLink
                                          key={ai}
                                          to={att.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 rounded-md bg-accent/50 px-2 py-0.5 text-xs text-foreground hover:bg-accent"
                                        >
                                          <Icon className="h-3 w-3" />
                                          <span className="max-w-[120px] truncate">{att.name}</span>
                                        </UniversalLink>
                                      );
                                    })}
                                  </div>
                                )}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {record.deliverableAttachments && record.deliverableAttachments.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        产出物附件 ({record.deliverableAttachments.length})
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {record.deliverableAttachments.map((att: DeliverableAttachment, idx: number) => {
                          const Icon = att.type === 'image' ? ImageIcon : att.type === 'link' ? LinkIcon : FileText;
                          return (
                            <UniversalLink
                              key={idx}
                              to={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{att.name}</span>
                            </UniversalLink>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {record.mentorFeedback && (
                    <div className="rounded-lg bg-accent/50 p-3">
                      <p className="mb-1 text-xs font-medium text-accent-foreground">
                        Mentor 反馈
                      </p>
                      <p className="text-sm text-foreground">
                        {record.mentorFeedback}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {hasMore && (
        <div className="pt-2 text-center">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onLoadMore();
            }}
            disabled={loading}
            className="rounded-full"
          >
            {loading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
    </div>
  );
};

const DetailField = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div>
    <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
    <p
      className={`whitespace-pre-wrap break-words text-sm text-foreground ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value || '—'}
    </p>
  </div>
);

export default CheckinHistoryList;
