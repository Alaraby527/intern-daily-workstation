import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import * as checkinApi from '@client/src/api/checkin';
import MentorFilterBar, {
  type MentorFilterValues,
} from './MentorFilterBar';
import MentorCheckinTable from './MentorCheckinTable';
import MentorReviewPanel from './MentorReviewPanel';
import FeishuSettingsPanel from './FeishuSettingsPanel';
import type { CheckinRecord, LineCode } from '@shared/api.interface';

const DEFAULT_FILTERS: MentorFilterValues = {
  internName: '',
  startDate: '',
  endDate: '',
  lineCode: '',
  mentorStatus: '',
};

const PAGE_SIZE = 10;

const MentorPage = () => {
  const navigate = useNavigate();

  // 筛选条件（未提交前的临时值）
  const [filters, setFilters] = useState<MentorFilterValues>(DEFAULT_FILTERS);
  // 已提交的筛选条件（用于实际请求）
  const [appliedFilters, setAppliedFilters] =
    useState<MentorFilterValues>(DEFAULT_FILTERS);

  const [items, setItems] = useState<CheckinRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // 详情面板
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [detailRecord, setDetailRecord] = useState<CheckinRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // 飞书设置面板
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const fetchList = useCallback(
    async (currentPage: number, currentFilters: MentorFilterValues) => {
      setLoading(true);
      try {
        const res = await checkinApi.getCheckinList({
          page: currentPage,
          pageSize: PAGE_SIZE,
          internName: currentFilters.internName || undefined,
          startDate: currentFilters.startDate || undefined,
          endDate: currentFilters.endDate || undefined,
          lineCode: currentFilters.lineCode || undefined,
          mentorStatus: currentFilters.mentorStatus || undefined,
        });
        setItems(res.items);
        setTotal(res.total);
      } catch (error) {
        logger.error('加载打卡记录失败', error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // 初始加载
  useEffect(() => {
    fetchList(1, DEFAULT_FILTERS);
  }, [fetchList]);

  const handleFilter = () => {
    setAppliedFilters(filters);
    setPage(1);
    fetchList(1, filters);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
    fetchList(1, DEFAULT_FILTERS);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchList(newPage, appliedFilters);
  };

  const handleViewDetail = async (record: CheckinRecord) => {
    setPanelOpen(true);
    setDetailLoading(true);
    try {
      const detail = await checkinApi.getCheckinDetail(record.id);
      setDetailRecord(detail);
    } catch (error) {
      logger.error('加载打卡详情失败', error);
      setDetailRecord(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    // 延迟清空，配合滑出动画
    setTimeout(() => {
      setDetailRecord(null);
    }, 300);
  };

  const handleReviewSaved = () => {
    handleClosePanel();
    // 刷新列表
    fetchList(page, appliedFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部标题栏 */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors"
            aria-label="返回首页"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">
            Mentor 管理
          </h1>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Settings className="size-4" />
              飞书集成
            </button>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* 飞书设置面板 */}
        <FeishuSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* 筛选栏 */}
        <MentorFilterBar
          values={filters}
          onChange={setFilters}
          onFilter={handleFilter}
          onReset={handleReset}
        />

        {/* 表格 */}
        {loading ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center text-muted-foreground">
            加载中...
          </div>
        ) : (
          <MentorCheckinTable
            items={items}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={handlePageChange}
            onViewDetail={handleViewDetail}
          />
        )}
      </main>

      {/* 侧边详情面板 */}
      {detailLoading ? null : (
        <MentorReviewPanel
          open={panelOpen}
          record={detailRecord}
          onClose={handleClosePanel}
          onSaved={handleReviewSaved}
        />
      )}
    </div>
  );
};

export default MentorPage;
