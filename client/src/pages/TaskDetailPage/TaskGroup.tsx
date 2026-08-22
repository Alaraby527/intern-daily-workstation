import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TaskItem, DeliverableAttachment, LineCode } from '@shared/api.interface';
import type { TaskProgressMap } from '@client/src/store/task-progress';
import TaskItemComponent from './TaskItem';

interface TaskGroupProps {
  title: string;
  tasks: TaskItem[];
  lineColor: string;
  internName: string;
  lineCode: LineCode;
  recordDate: string;
  progressMap: TaskProgressMap;
  onToggle: (taskId: string, taskName: string, completed: boolean) => void;
  onSetCompletion: (taskId: string, completion: string, taskName: string) => void;
  onSetAttachments: (taskId: string, attachments: DeliverableAttachment[]) => void;
  onRetrySync?: (taskId: string, taskName: string) => void;
}

const borderColorMap: Record<string, string> = {
  'line-a': 'border-line-a',
  'line-b': 'border-line-b',
  'line-c': 'border-line-c',
  'line-d': 'border-line-d',
  'line-e': 'border-line-e',
};

const TaskGroup = ({
  title,
  tasks,
  lineColor,
  internName,
  lineCode,
  recordDate,
  progressMap,
  onToggle,
  onSetCompletion,
  onSetAttachments,
  onRetrySync,
}: TaskGroupProps) => {
  const [expanded, setExpanded] = useState(true);
  const borderClass = borderColorMap[lineColor] ?? 'border-line-a';

  const completedCount = tasks.filter(
    (t: TaskItem) => progressMap[t.id]?.completed,
  ).length;

  return (
    <div
      className={`rounded-xl border-l-4 bg-card shadow-sm ${borderClass}`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-accent/30"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {completedCount}/{tasks.length}
          </span>
        </div>
        <ChevronDown
          className={`size-5 text-muted-foreground transition-transform duration-200 ${
            expanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? 'max-h-[2000px]' : 'max-h-0'
        }`}
      >
        <div className="space-y-1 px-2 pb-3">
          {tasks.map((task: TaskItem) => (
            <TaskItemComponent
              key={task.id}
              task={task}
              progress={progressMap[task.id]}
              internName={internName}
              lineCode={lineCode}
              recordDate={recordDate}
              onToggle={onToggle}
              onSetCompletion={onSetCompletion}
              onSetAttachments={onSetAttachments}
              onRetrySync={onRetrySync}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskGroup;
