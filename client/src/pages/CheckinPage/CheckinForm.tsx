import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AttachmentUploader from '@client/src/components/AttachmentUploader';
import type { BusinessLine, CompletedTaskSnapshot, LineCode, DeliverableAttachment } from '@shared/api.interface';
import { BUSINESS_LINES } from '@client/src/data/lines';

interface CheckinFormProps {
  internName: string;
  lineCode: string;
  lineCodes: LineCode[];
  checkinDate: string;
  dailyGoal: string;
  actualCompletion: string;
  deliverables: string;
  outputLinks: string;
  blockers: string;
  completedTasks: CompletedTaskSnapshot[];
  deliverableAttachments: DeliverableAttachment[];
  submitting: boolean;
  onLineCodeChange: (code: string) => void;
  onDateChange: (date: string) => void;
  onDailyGoalChange: (value: string) => void;
  onActualCompletionChange: (value: string) => void;
  onDeliverablesChange: (value: string) => void;
  onOutputLinksChange: (value: string) => void;
  onBlockersChange: (value: string) => void;
  onDeliverableAttachmentsChange: (attachments: DeliverableAttachment[]) => void;
  onSubmit: () => void;
}

const getTodayStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const CheckinForm = ({
  internName,
  lineCode,
  lineCodes,
  checkinDate,
  dailyGoal,
  actualCompletion,
  deliverables,
  outputLinks,
  blockers,
  completedTasks,
  deliverableAttachments,
  submitting,
  onLineCodeChange,
  onDateChange,
  onDailyGoalChange,
  onActualCompletionChange,
  onDeliverablesChange,
  onOutputLinksChange,
  onBlockersChange,
  onDeliverableAttachmentsChange,
  onSubmit,
}: CheckinFormProps) => {
  const lines: BusinessLine[] = useMemo(
    () =>
      lineCodes
        .map((code: LineCode) => BUSINESS_LINES[code])
        .filter((line): line is BusinessLine => Boolean(line)),
    [lineCodes],
  );

  const maxDate = useMemo(() => getTodayStr(), []);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">打卡表单</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="internName">姓名</Label>
            <Input
              id="internName"
              value={internName}
              readOnly
              className="bg-muted/50 text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lineCode">方向 / 业务线</Label>
            {lines.length > 1 ? (
              <Select value={lineCode} onValueChange={onLineCodeChange}>
                <SelectTrigger id="lineCode" className="w-full">
                  <SelectValue placeholder="选择业务线" />
                </SelectTrigger>
                <SelectContent>
                  {lines.map((line: BusinessLine) => (
                    <SelectItem key={line.code} value={line.code}>
                      {line.shortName} · {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="lineCode"
                value={lines[0] ? `${lines[0].shortName} · ${lines[0].name}` : ''}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkinDate">日期</Label>
          <Input
            id="checkinDate"
            type="date"
            value={checkinDate}
            max={maxDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dailyGoal">当日目标</Label>
          <Textarea
            id="dailyGoal"
            value={dailyGoal}
            onChange={(e) => onDailyGoalChange(e.target.value)}
            placeholder="写下今天的主要目标..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="actualCompletion">
            实际完成量
            {completedTasks.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                已预填 {completedTasks.length} 项任务
              </span>
            )}
          </Label>
          <Textarea
            id="actualCompletion"
            value={actualCompletion}
            onChange={(e) => onActualCompletionChange(e.target.value)}
            placeholder="今天完成了什么？每条任务的实际完成量..."
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliverables">今日交付物</Label>
          <Textarea
            id="deliverables"
            value={deliverables}
            onChange={(e) => onDeliverablesChange(e.target.value)}
            placeholder="今日产出的交付物清单..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="outputLinks">产出物链接</Label>
          <Input
            id="outputLinks"
            value={outputLinks}
            onChange={(e) => onOutputLinksChange(e.target.value)}
            placeholder="飞书文档 / 作品链接等"
          />
        </div>

        <div className="space-y-2">
          <Label>
            产出物附件
            {deliverableAttachments.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                已上传 {deliverableAttachments.length} 个
              </span>
            )}
          </Label>
          <AttachmentUploader
            attachments={deliverableAttachments}
            onChange={onDeliverableAttachmentsChange}
          />
          <p className="text-xs text-muted-foreground">
            支持上传图片、文件，或添加链接形式的产出物
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blockers">卡点 / 备注</Label>
          <Textarea
            id="blockers"
            value={blockers}
            onChange={(e) => onBlockersChange(e.target.value)}
            placeholder="遇到的问题、需要的支持，或其他备注..."
            rows={3}
          />
        </div>

        <div className="pt-2">
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full rounded-full bg-primary text-primary-foreground hover-elevate active-elevate-2"
          >
            {submitting ? '提交中...' : '提交打卡'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckinForm;
