import { BookOpen, Target, ClipboardList, ExternalLink } from 'lucide-react';
import type { BusinessLine } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface LineOverviewCardProps {
  line: BusinessLine;
}

const lineGradientMap: Record<string, string> = {
  'line-a': 'from-[hsl(217_91%_35%)] to-[hsl(222_47%_11%)]',
  'line-b': 'from-[hsl(142_71%_30%)] to-[hsl(222_47%_11%)]',
  'line-c': 'from-[hsl(25_95%_40%)] to-[hsl(222_47%_11%)]',
  'line-d': 'from-[hsl(263_70%_38%)] to-[hsl(222_47%_11%)]',
  'line-e': 'from-[hsl(0_84%_45%)] to-[hsl(222_47%_11%)]',
};

const LineOverviewCard = ({ line }: LineOverviewCardProps) => {
  const gradient = lineGradientMap[line.color] ?? lineGradientMap['line-a'];

  return (
    <section
      className={`rounded-xl p-6 text-white shadow-sm bg-gradient-to-br ${gradient} drop-shadow-sm`}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* 北极星指标 */}
        <div>
          <div className="mb-3 flex items-center gap-2 text-white/80">
            <Target className="size-4" />
            <h3 className="text-sm font-medium">北极星指标</h3>
          </div>
          <ul className="space-y-2">
            {line.northStar.map((item: string, idx: number) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-base font-medium text-white"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/60" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* 每日交付物 */}
        <div>
          <div className="mb-3 flex items-center gap-2 text-white/80">
            <ClipboardList className="size-4" />
            <h3 className="text-sm font-medium">每日交付物</h3>
          </div>
          <ol className="space-y-2">
            {line.dailyDeliverables.map((item: string, idx: number) => (
              <li
                key={idx}
                className="flex gap-3 text-sm leading-relaxed text-white/90"
              >
                <span className="shrink-0 font-medium text-white/70">
                  {idx + 1}.
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 底部 SOP + 完成定义 */}
      <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 size-4 shrink-0 text-white/70" />
          <p className="text-sm text-white/80">{line.completionDefinition}</p>
        </div>
        <UniversalLink
          to={line.sopLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          SOP 文档
          <ExternalLink className="size-3.5" />
        </UniversalLink>
      </div>
    </section>
  );
};

export default LineOverviewCard;
