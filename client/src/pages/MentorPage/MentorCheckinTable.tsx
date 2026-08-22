import { Badge } from '@client/src/components/ui/badge';
import type { CheckinRecord, MentorStatus } from '@shared/api.interface';

interface MentorCheckinTableProps {
  items: CheckinRecord[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onViewDetail: (record: CheckinRecord) => void;
}

const statusConfig: Record<MentorStatus, { label: string; variant: string; className: string }> = {
  pending: {
    label: '待验收',
    variant: 'secondary',
    className:
      'bg-[hsl(220_9%_46%)/15] text-[hsl(220_9%_46%)] border-transparent',
  },
  passed: {
    label: '通过',
    variant: 'default',
    className:
      'bg-[hsl(142_71%_45%)/15] text-[hsl(142_71%_45%)] border-transparent',
  },
  'needs-improvement': {
    label: '需改进',
    variant: 'default',
    className:
      'bg-[hsl(38_92%_50%)/15] text-[hsl(38_92%_50%)] border-transparent',
  },
};

const truncate = (text: string, max: number): string => {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
};

const MentorCheckinTable = ({
  items,
  page,
  pageSize,
  total,
  onPageChange,
  onViewDetail,
}: MentorCheckinTableProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border text-muted-foreground text-left">
              <th className="px-6 py-3 font-medium">实习生姓名</th>
              <th className="px-6 py-3 font-medium">日期</th>
              <th className="px-6 py-3 font-medium">业务线</th>
              <th className="px-6 py-3 font-medium">完成量摘要</th>
              <th className="px-6 py-3 font-medium">验收状态</th>
              <th className="px-6 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-muted-foreground"
                >
                  暂无打卡记录
                </td>
              </tr>
            ) : (
              items.map((record: CheckinRecord) => {
                const status = statusConfig[record.mentorStatus];
                return (
                  <tr
                    key={record.id}
                    className="border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {record.internName}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {record.checkinDate}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {record.lineName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground max-w-xs">
                      <span className="truncate block">
                        {truncate(record.actualCompletion, 25)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={status.className}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onViewDetail(record)}
                        className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                      >
                        查看/验收
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          共 {total} 条记录，第 {page} / {totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 px-3 rounded-md border border-border hover:bg-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i: number) => i + 1)
            .filter((p: number) => {
              if (totalPages <= 7) return true;
              if (p === 1 || p === totalPages) return true;
              if (Math.abs(p - page) <= 1) return true;
              return false;
            })
            .map((p: number, idx: number, arr: number[]) => {
              const showEllipsis =
                idx > 0 && arr[idx - 1] !== p - 1;
              return (
                <div key={p} className="flex items-center gap-2">
                  {showEllipsis && (
                    <span className="text-muted-foreground text-sm">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                </div>
              );
            })}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 px-3 rounded-md border border-border hover:bg-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorCheckinTable;
