import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, FileText, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Label } from '@client/src/components/ui/label';
import { Textarea } from '@client/src/components/ui/textarea';
import { Badge } from '@client/src/components/ui/badge';
import * as checkinApi from '@client/src/api/checkin';
import type { CheckinRecord, MentorStatus, DeliverableAttachment } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface MentorReviewPanelProps {
  open: boolean;
  record: CheckinRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

const statusOptions: { value: MentorStatus; label: string; icon: typeof Clock; color: string }[] = [
  { value: 'pending', label: '待验收', icon: Clock, color: 'text-[hsl(220_9%_46%)]' },
  { value: 'passed', label: '通过', icon: CheckCircle2, color: 'text-[hsl(142_71%_45%)]' },
  { value: 'needs-improvement', label: '需改进', icon: AlertCircle, color: 'text-[hsl(38_92%_50%)]' },
];

const statusBadgeClass: Record<MentorStatus, string> = {
  pending: 'bg-[hsl(220_9%_46%)/15] text-[hsl(220_9%_46%)] border-transparent',
  passed: 'bg-[hsl(142_71%_45%)/15] text-[hsl(142_71%_45%)] border-transparent',
  'needs-improvement': 'bg-[hsl(38_92%_50%)/15] text-[hsl(38_92%_50%)] border-transparent',
};

const statusLabelMap: Record<MentorStatus, string> = {
  pending: '待验收',
  passed: '通过',
  'needs-improvement': '需改进',
};

const MentorReviewPanel = ({
  open,
  record,
  onClose,
  onSaved,
}: MentorReviewPanelProps) => {
  const [status, setStatus] = useState<MentorStatus>('pending');
  const [feedback, setFeedback] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (record) {
      setStatus(record.mentorStatus);
      setFeedback(record.mentorFeedback ?? '');
    }
  }, [record]);

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await checkinApi.mentorReview(record.id, {
        mentorStatus: status,
        mentorFeedback: feedback,
      });
      onSaved();
    } catch (error) {
      logger.error('保存验收失败', error);
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* 侧边面板 */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-card shadow-xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 顶部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {record.internName}
              </h2>
              <Badge className={statusBadgeClass[record.mentorStatus]}>
                {statusLabelMap[record.mentorStatus]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{record.checkinDate}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <InfoRow label="业务线" value={record.lineName} />
          <InfoRow label="当日目标" value={record.dailyGoal} multiline />
          <InfoRow label="实际完成量" value={record.actualCompletion} multiline />
          <InfoRow label="今日交付物" value={record.deliverables} multiline />
          {record.outputLinks && (
            <InfoRow label="产出物链接" value={record.outputLinks} multiline />
          )}
          {record.blockers && (
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                卡点 / 备注
              </Label>
              <div className="text-sm text-foreground bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                {record.blockers}
              </div>
            </div>
          )}

           {/* 已完成任务列表 */}
           {record.completedTasks && record.completedTasks.length > 0 && (
             <div>
               <Label className="text-sm text-muted-foreground mb-2 block">
                 已完成任务
               </Label>
               <ul className="space-y-2">
                 {record.completedTasks.map((task) => (
                   <li
                     key={task.taskId}
                     className="flex items-start gap-2 text-sm p-3 bg-accent/30 rounded-lg"
                   >
                     <CheckCircle2 className="h-4 w-4 text-[hsl(142_71%_45%)] shrink-0 mt-0.5" />
                     <div>
                       <div className="font-medium text-foreground">
                         {task.taskName}
                       </div>
                       {task.completion && (
                         <div className="text-muted-foreground text-xs mt-1">
                           {task.completion}
                         </div>
                       )}
                       {task.attachments && task.attachments.length > 0 && (
                         <div className="mt-2 flex flex-wrap gap-1.5">
                           {task.attachments.map((att: DeliverableAttachment, ai: number) => {
                             const Icon = att.type === 'image' ? ImageIcon : att.type === 'link' ? LinkIcon : FileText;
                             return (
                               <UniversalLink
                                 key={ai}
                                 to={att.url}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs text-foreground border border-border hover:border-primary/40 hover:text-primary"
                               >
                                 <Icon className="h-3 w-3" />
                                 <span className="max-w-[180px] truncate">{att.name}</span>
                               </UniversalLink>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   </li>
                 ))}
               </ul>
             </div>
           )}

           {/* 产出物附件 */}
           {record.deliverableAttachments && record.deliverableAttachments.length > 0 && (
             <div>
               <Label className="text-sm text-muted-foreground mb-2 block">
                 产出物附件 ({record.deliverableAttachments.length})
               </Label>
               <div className="space-y-1.5">
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
                       <span className="truncate flex-1">{att.name}</span>
                       <span className="text-xs text-muted-foreground capitalize">
                         {att.type === 'image' ? '图片' : att.type === 'link' ? '链接' : '文件'}
                       </span>
                     </UniversalLink>
                   );
                 })}
               </div>
             </div>
           )}

          {/* 验收区域分隔 */}
          <div className="border-t border-border pt-4">
            <h3 className="text-base font-semibold text-foreground mb-4">
              Mentor 验收
            </h3>

            {/* 验收状态单选 */}
            <div className="mb-4">
              <Label className="text-sm text-muted-foreground mb-2 block">
                验收状态
              </Label>
              <div className="flex gap-3">
                {statusOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-primary bg-accent text-primary'
                          : 'border-border hover:bg-accent/50 text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mentor 反馈 */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Mentor 反馈
              </Label>
              <Textarea
                value={feedback}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFeedback(e.target.value)
                }
                placeholder="请输入验收反馈意见..."
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full h-10 rounded-full bg-primary text-primary-foreground font-medium hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '保存中...' : '保存验收'}
          </button>
        </div>
      </div>
    </>
  );
};

const InfoRow = ({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) => (
  <div>
    <Label className="text-sm text-muted-foreground mb-1.5 block">{label}</Label>
    <div
      className={`text-sm text-foreground ${
        multiline ? 'whitespace-pre-wrap break-words' : ''
      }`}
    >
      {value || '—'}
    </div>
  </div>
);

export default MentorReviewPanel;
