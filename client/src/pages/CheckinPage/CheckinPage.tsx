import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { useIdentity } from '@client/src/store/identity-context';
import { useTaskProgress } from '@client/src/store/task-progress';
import { getInternByName } from '@client/src/data/interns';
import { BUSINESS_LINES } from '@client/src/data/lines';
import { getTasksByLine } from '@client/src/data/tasks';

import * as checkinApi from '@client/src/api/checkin';
import { extractErrorMessage } from '@client/src/api/http-utils';
import type {
  CheckinListResponse,
  CheckinRecord,
  CompletedTaskSnapshot,
  CreateCheckinRequest,
  LineCode,
  DeliverableAttachment,
} from '@shared/api.interface';

import CheckinHistoryList from './CheckinHistoryList';
import { getTodayStr } from '@client/src/utils/date';

const FEISHU_WIKI_URL =
  'https://your-org.feishu.cn/wiki/YOUR_WIKI_TOKEN';

const getLineShortName = (code: string): string =>
  BUSINESS_LINES[code]?.shortName ?? code;

const CheckinPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { internName } = useIdentity();

  const urlLineCode = searchParams.get('lineCode');

  const intern = useMemo(
    () => (internName ? getInternByName(internName) : undefined),
    [internName],
  );

  const lineCodes: LineCode[] = intern?.lineCodes ?? [];

  const [activeLineCode, setActiveLineCode] = useState<string>(() => {
    if (urlLineCode) return urlLineCode;
    return lineCodes[0] ?? '';
  });

  useEffect(() => {
    if (!activeLineCode && lineCodes.length > 0) {
      setActiveLineCode(lineCodes[0]);
    }
  }, [activeLineCode, lineCodes]);

  const todayStr = getTodayStr();
  const line = BUSINESS_LINES[activeLineCode];
  const tasks = useMemo(() => getTasksByLine(activeLineCode), [activeLineCode]);
  const taskNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tasks) {
      map[t.id] = t.name;
    }
    return map;
  }, [tasks]);

  const { progress } = useTaskProgress(
    internName ?? '',
    activeLineCode,
    line?.name ?? '',
    todayStr,
    line?.dailyDeliverables?.join('；') ?? '',
    line?.northStar?.join('、') ?? '',
  );

  const completedTasks: CompletedTaskSnapshot[] = useMemo(() => {
    return Object.entries(progress)
      .filter(([, entry]) => entry.completed)
      .map(([taskId, entry]) => ({
        taskId,
        taskName: taskNameMap[taskId] ?? taskId,
        completion: entry.completion,
        attachments: entry.attachments ?? [],
      }));
  }, [progress, taskNameMap]);

  const syncedCount = completedTasks.filter(
    (t) => progress[t.taskId]?.syncStatus === 'synced',
  ).length;
  const syncingCount = completedTasks.filter(
    (t) => progress[t.taskId]?.syncStatus === 'syncing',
  ).length;
  const failedCount = completedTasks.filter(
    (t) => progress[t.taskId]?.syncStatus === 'failed',
  ).length;

  const [blockers, setBlockers] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [historyItems, setHistoryItems] = useState<CheckinRecord[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyPageSize = 10;

  const loadHistory = useCallback(
    async (page: number, append: boolean) => {
      if (!internName) return;
      setHistoryLoading(true);
      try {
        const result: CheckinListResponse = await checkinApi.getCheckinList({
          internName,
          page,
          pageSize: historyPageSize,
        });
        setHistoryItems((prev) =>
          append ? [...prev, ...result.items] : result.items,
        );
        setHistoryTotal(result.total);
        setHistoryPage(result.page);
      } catch (error) {
        logger.error('加载历史打卡失败', error);
        toast.error('加载历史打卡失败');
      } finally {
        setHistoryLoading(false);
      }
    },
    [internName],
  );

  useEffect(() => {
    if (internName) {
      loadHistory(1, false);
    }
  }, [internName, loadHistory]);

  const hasMoreHistory = historyItems.length < historyTotal;

  const handleLoadMore = useCallback(() => {
    loadHistory(historyPage + 1, true);
  }, [historyPage, loadHistory]);

  const handleDelete = useCallback(
    (id: string) => {
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      setHistoryTotal((prev) => Math.max(0, prev - 1));
    },
    [],
  );

  const dailyGoal = useMemo(() => {
    if (completedTasks.length === 0) return '';
    return completedTasks
      .map((t: CompletedTaskSnapshot) => `• ${t.taskName}`)
      .join('\n');
  }, [completedTasks]);

  const actualCompletion = useMemo(() => {
    if (completedTasks.length === 0) return '';
    return completedTasks
      .map(
        (t: CompletedTaskSnapshot) =>
          `• ${t.taskName}${t.completion ? `：${t.completion}` : ''}`,
      )
      .join('\n');
  }, [completedTasks]);

  const deliverableAttachments: DeliverableAttachment[] = useMemo(() => {
    const all: DeliverableAttachment[] = [];
    for (const t of completedTasks) {
      if (t.attachments?.length) {
        all.push(...t.attachments);
      }
    }
    return all;
  }, [completedTasks]);

  const outputLinks = useMemo(() => {
    const links: string[] = [];
    for (const t of completedTasks) {
      if (t.attachments) {
        for (const att of t.attachments) {
          if (att.type === 'link' && att.url) {
            links.push(att.url);
          }
        }
      }
    }
    return links.join('\n');
  }, [completedTasks]);

  const deliverables = useMemo(() => {
    return completedTasks
      .map((t) => t.taskName)
      .join('；');
  }, [completedTasks]);

  const handleSubmit = useCallback(async () => {
    if (!internName || !activeLineCode) {
      toast.error('请先选择实习生和业务线');
      return;
    }
    if (completedTasks.length === 0) {
      toast.error('还没有勾选任何任务，先去任务页勾选吧～');
      return;
    }
    if (syncingCount > 0) {
      toast.error('任务正在同步中，请稍候再提交');
      return;
    }
    if (failedCount > 0) {
      toast.error('有任务同步失败，请先处理失败项再提交');
      return;
    }

    setSubmitting(true);
    try {
      const line = BUSINESS_LINES[activeLineCode];
      const dto: CreateCheckinRequest = {
        internName,
        lineCode: activeLineCode as LineCode,
        lineName: line?.name ?? activeLineCode,
        checkinDate: todayStr,
        dailyGoal,
        actualCompletion,
        deliverables,
        outputLinks,
        blockers,
        completedTasks,
        deliverableAttachments,
      };
      await checkinApi.createCheckin(dto);
      toast.success('打卡确认成功，等待 Mentor 验收');
      loadHistory(1, false);
    } catch (error) {
      logger.error('提交打卡失败', error);
      const msg = extractErrorMessage(error, '未知错误');
      toast.error(`提交打卡失败：${msg.slice(0, 100)}`);
    } finally {
      setSubmitting(false);
    }
  }, [
    internName,
    activeLineCode,
    completedTasks,
    syncingCount,
    failedCount,
    todayStr,
    dailyGoal,
    actualCompletion,
    deliverables,
    outputLinks,
    blockers,
    deliverableAttachments,
    loadHistory,
  ]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleOpenFeishu = useCallback(() => {
    window.open(FEISHU_WIKI_URL, '_blank', 'noopener,noreferrer');
  }, []);

  if (!internName) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              请先选择实习生身份后再打卡
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">今日打卡</h1>
            <p className="text-sm text-muted-foreground">{internName}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenFeishu}
          className="rounded-full"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">在飞书中查看</span>
          <span className="sm:hidden">飞书</span>
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              今日已完成任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  今日还没有完成的任务，先去任务页勾选完成吧～
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-success/30 bg-success/5 text-success">
                    已同步 {syncedCount} 项
                  </Badge>
                  {syncingCount > 0 && (
                    <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                      同步中 {syncingCount} 项
                    </Badge>
                  )}
                  {failedCount > 0 && (
                    <Badge variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      同步失败 {failedCount} 项
                    </Badge>
                  )}
                </div>
                <ul className="space-y-2">
                  {completedTasks.map((task: CompletedTaskSnapshot) => (
                    <li
                      key={task.taskId}
                      className="flex items-start gap-3 rounded-lg bg-accent/30 p-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {task.taskName}
                        </p>
                        {task.completion && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {task.completion}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-border text-xs"
                      >
                        {getLineShortName(activeLineCode)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">补充卡点 / 备注</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="blockers">遇到的问题、需要的支持，或其他备注</Label>
              <Textarea
                id="blockers"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="没有卡点可以留空～"
                rows={4}
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting || completedTasks.length === 0 || syncingCount > 0}
                className="w-full min-h-12 rounded-full text-base bg-primary text-primary-foreground hover-elevate active-elevate-2 touch-manipulation"
              >
                {submitting ? '提交中...' : completedTasks.length === 0 ? '请先完成至少一个任务' : syncingCount > 0 ? '任务同步中，请稍候...' : '确认今日打卡'}
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                勾选任务时已自动同步到飞书，点确认即完成当日打卡
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="pt-2">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            历史打卡
          </h2>
          <CheckinHistoryList
            items={historyItems}
            loading={historyLoading}
            hasMore={hasMoreHistory}
            onLoadMore={handleLoadMore}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckinPage;
