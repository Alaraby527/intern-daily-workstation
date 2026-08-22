import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, ChevronDown, Loader2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { INTERNS, getInternByName } from '@client/src/data/interns';
import { useIdentity } from '@client/src/store/identity-context';
import * as api from '@client/src/api';
import type { Intern } from '@shared/api.interface';

const HomePage = () => {
  const navigate = useNavigate();
  const { internName, setIntern } = useIdentity();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [autoDetecting, setAutoDetecting] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function autoDetect() {
      if (internName) {
        setAutoDetecting(false);
        return;
      }
      try {
        const current = await api.user.getCurrentUser();
        if (cancelled) return;
        if (current.userName) {
          const matched = INTERNS.find((intern: Intern) =>
            current.userName === intern.name,
          );
          if (matched) {
            logger.info(`自动识别实习生身份: ${matched.name}`);
            setIntern(matched.name);
            navigate('/task', { replace: true });
            return;
          }
          logger.info(`当前用户「${current.userName}」不在实习生名单中，显示手动选择`);
        } else {
          logger.info('未获取到当前飞书用户身份，显示手动选择');
        }
      } catch (error) {
        logger.warn('自动识别用户身份失败', error);
      } finally {
        if (!cancelled) setAutoDetecting(false);
      }
    }
    autoDetect();
    return () => {
      cancelled = true;
    };
  }, [internName, navigate, setIntern]);

  const filteredInterns = INTERNS.filter((intern: Intern) =>
    intern.name.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelectIntern = (intern: Intern) => {
    setIntern(intern.name);
    setOpen(false);
    setQuery('');
    logger.info(`Selected intern: ${intern.name}`);
    navigate('/task');
  };

  const handleMentorClick = () => {
    navigate('/mentor');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentIntern = internName ? getInternByName(internName) : undefined;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-10 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-7 w-7 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          工作台
        </h1>
        <p className="text-sm text-muted-foreground">
          {autoDetecting ? '正在识别身份...' : '选择你的名字，开始今日工作'}
        </p>
      </div>

      {/* Intern search selector */}
      <section className="w-full max-w-md">
        {autoDetecting ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-8 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在识别飞书身份...</p>
          </div>
        ) : (
          <div className="relative" ref={containerRef}>
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  {currentIntern ? (
                    <>
                      <p className="text-sm font-medium text-foreground">
                        {currentIntern.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currentIntern.lineCodes.length} 条业务线
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      搜索或选择你的名字
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>

            {open && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const matches = filteredInterns;
                      if (matches.length === 1) {
                        handleSelectIntern(matches[0]);
                      }
                    }
                  }}
                  placeholder="输入名字搜索..."
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {filteredInterns.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    没有找到匹配的实习生
                  </div>
                ) : (
                  filteredInterns.map((intern: Intern) => {
                    const isSelected = internName === intern.name;
                    return (
                      <button
                        key={intern.name}
                        type="button"
                        onClick={() => handleSelectIntern(intern)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-accent text-primary'
                            : 'hover:bg-accent/50 text-foreground'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <User className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {intern.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {intern.lineCodes.length} 条业务线
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            )}
          </div>
        )}

        {!autoDetecting && currentIntern && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            已选择 {currentIntern.name}，点击上方重新选择
          </p>
        )}
      </section>

      {/* Mentor Entry */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={handleMentorClick}
          className="text-sm text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors duration-200"
        >
          切换到 Mentor 视角
        </button>
      </div>
    </div>
  );
};

export default HomePage;
