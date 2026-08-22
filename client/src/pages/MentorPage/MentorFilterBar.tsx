import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Label } from '@client/src/components/ui/label';
import { INTERNS } from '@client/src/data/interns';
import { BUSINESS_LINES } from '@client/src/data/lines';
import type { MentorStatus } from '@shared/api.interface';

export interface MentorFilterValues {
  internName: string;
  startDate: string;
  endDate: string;
  lineCode: string;
  mentorStatus: string;
}

interface MentorFilterBarProps {
  values: MentorFilterValues;
  onChange: (values: MentorFilterValues) => void;
  onFilter: () => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待验收' },
  { value: 'passed', label: '通过' },
  { value: 'needs-improvement', label: '需改进' },
];

const MentorFilterBar = ({
  values,
  onChange,
  onFilter,
  onReset,
}: MentorFilterBarProps) => {
  return (
    <div className="bg-card rounded-xl shadow-sm p-6 border border-border">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 实习生姓名 */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted-foreground">实习生姓名</Label>
          <Select
            value={values.internName}
            onValueChange={(v: string) =>
              onChange({ ...values, internName: v })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {INTERNS.map((intern) => (
                <SelectItem key={intern.name} value={intern.name}>
                  {intern.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 日期范围 */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted-foreground">开始日期</Label>
          <input
            type="date"
            value={values.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...values, startDate: e.target.value })
            }
            className="h-9 w-40 rounded-md border border-border px-3 text-sm bg-transparent focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted-foreground">结束日期</Label>
          <input
            type="date"
            value={values.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...values, endDate: e.target.value })
            }
            className="h-9 w-40 rounded-md border border-border px-3 text-sm bg-transparent focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
          />
        </div>

        {/* 业务线 */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted-foreground">业务线</Label>
          <Select
            value={values.lineCode}
            onValueChange={(v: string) =>
              onChange({ ...values, lineCode: v })
            }
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {Object.values(BUSINESS_LINES).map((line) => (
                <SelectItem key={line.code} value={line.code}>
                  {line.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 验收状态 */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-muted-foreground">验收状态</Label>
          <Select
            value={values.mentorStatus}
            onValueChange={(v: string) =>
              onChange({ ...values, mentorStatus: v as MentorStatus })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 按钮组 */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onReset}
            className="px-5 py-2 rounded-full border border-border hover:bg-accent text-sm font-medium transition-colors"
          >
            重置
          </button>
          <button
            type="button"
            onClick={onFilter}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover-elevate active-elevate-2 transition-colors"
          >
            筛选
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorFilterBar;
