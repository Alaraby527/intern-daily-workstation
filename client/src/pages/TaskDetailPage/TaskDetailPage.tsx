import { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, QrCode } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getTasksByLine } from '@client/src/data/tasks';
import { getLineByCode } from '@client/src/data/lines';
import { getInternByName } from '@client/src/data/interns';
import { useIdentity } from '@client/src/store/identity-context';
import { useTaskProgress } from '@client/src/store/task-progress';
import type { TaskGroup as TaskGroupType, TaskItem, LineCode } from '@shared/api.interface';
import LineOverviewCard from './LineOverviewCard';
import TaskGroup from './TaskGroup';

const GROUP_TITLES: Record<TaskGroupType, string> = {
  morning: '上午任务',
  afternoon: '下午任务',
  beforeOff: '下班前任务',
  weekly: '周度任务',
};

const GROUP_ORDER: TaskGroupType[] = ['morning', 'afternoon', 'beforeOff', 'weekly'];

const TaskDetailPage = () => {
  const navigate = useNavigate();
  const { internName } = useIdentity();

  const todayStr = new Date().toISOString().slice(0, 10);

  const intern = useMemo(
    () => (internName ? getInternByName(internName) : undefined),
    [internName],
  );

  const lineCodes: LineCode[] = intern?.lineCodes ?? [];

  const [activeLineCode, setActiveLineCode] = useState<string>(lineCodes[0] ?? '');

  useEffect(() => {
    if (!activeLineCode && lineCodes.length > 0) {
      setActiveLineCode(lineCodes[0]);
    }
  }, [activeLineCode, lineCodes]);

  const line = getLineByCode(activeLineCode);
  const tasks = useMemo(
    () => getTasksByLine(activeLineCode),
    [activeLineCode],
  );

  const { progress, toggleTask, setCompletion, setAttachments, retrySync } = useTaskProgress(
    internName ?? '',
    activeLineCode,
    line?.name ?? '',
    todayStr,
    line?.dailyDeliverables?.join('；') ?? '',
    line?.northStar?.join('、') ?? '',
  );

  const groupedTasks = useMemo(() => {
    const result: Record<TaskGroupType, TaskItem[]> = {
      morning: [],
      afternoon: [],
      beforeOff: [],
      weekly: [],
    };
    for (const task of tasks) {
      if (result[task.group]) {
        result[task.group].push(task);
      }
    }
    return result;
  }, [tasks]);

  const handleBack = () => {
    logger.info('navigate back from task detail');
    navigate('/');
  };

  if (!internName || lineCodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">请先选择实习生身份</p>
        <Link to="/" className="text-primary hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  const getLineColorClass = (code: string, isActive: boolean): string => {
    const colorMap: Record<string, string> = {
      A: isActive ? 'bg-line-a text-white' : 'text-line-a hover:bg-line-a/10',
      B: isActive ? 'bg-line-b text-white' : 'text-line-b hover:bg-line-b/10',
      C: isActive ? 'bg-line-c text-white' : 'text-line-c hover:bg-line-c/10',
      D: isActive ? 'bg-line-d text-white' : 'text-line-d hover:bg-line-d/10',
      E: isActive ? 'bg-line-e text-white' : 'text-line-e hover:bg-line-e/10',
    };
    return colorMap[code] ?? (isActive ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10');
  };

  return (
    <div className="pb-28">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {internName}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <User className="size-3.5" />
          {lineCodes.length} 条线
        </div>
      </div>

      {/* Line tabs */}
      {lineCodes.length > 1 && (
        <div className="mb-6 flex gap-2 rounded-xl bg-card p-1.5 shadow-sm border border-border">
          {lineCodes.map((code: LineCode) => {
            const l = getLineByCode(code);
            const isActive = activeLineCode === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setActiveLineCode(code)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${getLineColorClass(code, isActive)}`}
              >
                {l?.shortName ?? code}
              </button>
            );
          })}
        </div>
      )}

      {/* Overview card */}
      {line && (
        <div className="mb-6">
          <LineOverviewCard line={line} />
        </div>
      )}

      {/* Task groups */}
      <div className="space-y-4">
        {GROUP_ORDER.map((groupKey: TaskGroupType) => {
          const groupTasks = groupedTasks[groupKey];
          if (groupTasks.length === 0) return null;
          return (
            <TaskGroup
              key={`${activeLineCode}-${groupKey}`}
              title={GROUP_TITLES[groupKey]}
              tasks={groupTasks}
              lineColor={line?.color ?? 'line-a'}
              internName={internName ?? ''}
              lineCode={activeLineCode as LineCode}
              recordDate={todayStr}
              progressMap={progress}
              onToggle={toggleTask}
              onSetCompletion={setCompletion}
              onSetAttachments={setAttachments}
              onRetrySync={retrySync}
            />
          );
        })}
      </div>

      {/* Floating check-in button */}
      <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
        <Link
          to={`/checkin?lineCode=${activeLineCode}`}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]"
        >
          <QrCode className="size-4" />
          去打卡
        </Link>
      </div>
    </div>
  );
};

export default TaskDetailPage;
