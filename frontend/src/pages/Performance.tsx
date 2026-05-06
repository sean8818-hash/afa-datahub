import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useAuth } from '../hooks/useAuth';
import type { Athlete, PerformanceParam } from '../types';
import './Performance.css';

interface TestsResponse {
  athlete_id: number;
  tests: Array<{
    param_id: string;
    name: string;
    category: string;
    type: string;
    raw_display: string;
    score: number;
    benchmark_level: string | null;
    tested_at: string;
  }>;
}

type TestItem = TestsResponse['tests'][number];

interface DisplayTestRow extends TestItem {
  athlete_id: number;
  athlete_name: string;
}

interface PersistedPerformanceState {
  selectedPlayerIds: number[];
  selectedParamCodes: string[];
  confirmedCodes: string[];
  searchText: string;
  selectedCategory: string;
  selectedTestName: string;
  result: DisplayTestRow[] | null;
}

interface MatrixPlayer {
  id: number;
  name: string;
}

export default function PerformancePage() {
  const { token } = useAuth();
  const { activeTeam } = useApp();
  const [players, setPlayers] = useState<Athlete[]>([]);
  const [params, setParams] = useState<PerformanceParam[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [confirmedCodes, setConfirmedCodes] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTestName, setSelectedTestName] = useState('');
  const [selectedParamCodes, setSelectedParamCodes] = useState<string[]>([]);
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [isParamDropdownOpen, setIsParamDropdownOpen] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [result, setResult] = useState<DisplayTestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerDropdownRef = useRef<HTMLDivElement | null>(null);
  const paramDropdownRef = useRef<HTMLDivElement | null>(null);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const hydratedRef = useRef(false);
  const skipPersistOnceRef = useRef(false);
  const persistKey = activeTeam ? `afasense.performance.state.v1.${activeTeam.id}` : null;
  const [scrollMax, setScrollMax] = useState(0);
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const updateScrollMetrics = useCallback(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    const max = Math.max(0, Math.ceil(el.scrollWidth - el.clientWidth));
    setScrollMax(max);
  }, []);

  useEffect(() => {
    if (!token || !activeTeam) {
      setPlayers([]);
      setSelectedPlayerIds([]);
      return;
    }
    setLoadingPlayers(true);
    setError(null);
    fetch(`/api/teams/${activeTeam.id}/players`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load players');
        return (await res.json()) as Athlete[];
      })
      .then((rows) => {
        setPlayers(rows);
        setSelectedPlayerIds((prev) => {
          const valid = prev.filter((id) => rows.some((p) => p.id === id));
          if (valid.length > 0) return valid;
          return rows[0] ? [rows[0].id] : [];
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load players'))
      .finally(() => setLoadingPlayers(false));
  }, [token, activeTeam]);

  useEffect(() => {
    if (!token) {
      setParams([]);
      return;
    }
    fetch('/api/performance/params?limit=500', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load params');
        return (await res.json()) as PerformanceParam[];
      })
      .then((rows) => setParams(rows))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load params'));
  }, [token]);

  useEffect(() => {
    hydratedRef.current = false;
    skipPersistOnceRef.current = false;
    if (!persistKey) return;
    try {
      const raw = localStorage.getItem(persistKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedPerformanceState>;
      setSelectedPlayerIds(Array.isArray(parsed.selectedPlayerIds) ? parsed.selectedPlayerIds : []);
      setSelectedParamCodes(Array.isArray(parsed.selectedParamCodes) ? parsed.selectedParamCodes : []);
      setConfirmedCodes(Array.isArray(parsed.confirmedCodes) ? parsed.confirmedCodes : []);
      setSearchText(typeof parsed.searchText === 'string' ? parsed.searchText : '');
      setSelectedCategory(typeof parsed.selectedCategory === 'string' ? parsed.selectedCategory : '');
      setSelectedTestName(typeof parsed.selectedTestName === 'string' ? parsed.selectedTestName : '');
      setResult(Array.isArray(parsed.result) ? parsed.result : null);
      skipPersistOnceRef.current = true;
    } catch {
      // Ignore invalid local cache
    } finally {
      hydratedRef.current = true;
    }
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey || !hydratedRef.current) return;
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    const stateToPersist: PersistedPerformanceState = {
      selectedPlayerIds,
      selectedParamCodes,
      confirmedCodes,
      searchText,
      selectedCategory,
      selectedTestName,
      result,
    };
    localStorage.setItem(persistKey, JSON.stringify(stateToPersist));
  }, [
    persistKey,
    selectedPlayerIds,
    selectedParamCodes,
    confirmedCodes,
    searchText,
    selectedCategory,
    selectedTestName,
    result,
  ]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(params.map((p) => p.category).filter(Boolean) as string[])).sort();
  }, [params]);

  const testOptions = useMemo(() => {
    const candidates = params.filter((p) => !selectedCategory || p.category === selectedCategory);
    return Array.from(new Set(candidates.map((p) => p.test_name).filter(Boolean) as string[])).sort();
  }, [params, selectedCategory]);

  const filteredParams = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return params.filter((p) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedTestName && p.test_name !== selectedTestName) return false;
      if (!q) return true;
      const haystack = [
        p.category ?? '',
        p.test_name ?? '',
        p.shortname ?? '',
        p.code ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [params, selectedCategory, selectedTestName, searchText]);

  const parameterDropdownOptions = useMemo(() => {
    return filteredParams.map((p) => ({
      code: p.code,
      label: `${p.code} ${p.shortname ?? p.test_name ?? ''}`.trim(),
    }));
  }, [filteredParams]);

  useEffect(() => {
    if (params.length === 0) return;
    const validCodes = new Set(params.map((p) => p.code));
    setSelectedParamCodes((prev) => prev.filter((code) => validCodes.has(code)));
  }, [params]);

  useEffect(() => {
    if (confirmedCodes.length > 0) return;
    if (!result || result.length === 0) return;
    const fallbackCodes = Array.from(
      new Set(result.map((row) => row.param_id).filter((v): v is string => Boolean(v)))
    );
    if (fallbackCodes.length > 0) {
      setConfirmedCodes(fallbackCodes);
    }
  }, [confirmedCodes.length, result]);

  const paramTriggerLabel = useMemo(() => {
    if (selectedParamCodes.length === 0) return 'All Parameters';
    if (selectedParamCodes.length === 1) {
      const one = parameterDropdownOptions.find((opt) => opt.code === selectedParamCodes[0]);
      return one?.label ?? selectedParamCodes[0];
    }
    return `${selectedParamCodes.length} Parameters Selected`;
  }, [selectedParamCodes, parameterDropdownOptions]);

  const selectedPlayers = useMemo(
    () => players.filter((p) => selectedPlayerIds.includes(p.id)),
    [players, selectedPlayerIds]
  );
  const matrixPlayers = useMemo<MatrixPlayer[]>(() => {
    if (selectedPlayers.length > 0) {
      return selectedPlayers.map((p) => ({
        id: p.id,
        name: p.name ?? p.email ?? `Player ${p.id}`,
      }));
    }
    const map = new Map<number, string>();
    (result ?? []).forEach((row) => {
      if (!map.has(row.athlete_id)) {
        map.set(row.athlete_id, row.athlete_name ?? `Player ${row.athlete_id}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [selectedPlayers, result]);
  const playerTriggerLabel = useMemo(() => {
    if (selectedPlayers.length === 0) return 'Select Players';
    if (selectedPlayers.length === 1) {
      const p = selectedPlayers[0];
      return p.name ?? p.email ?? `Player ${p.id}`;
    }
    return `${selectedPlayers.length} Players Selected`;
  }, [selectedPlayers]);

  const displayedTests = useMemo(() => {
    if (!result) return [];
    if (confirmedCodes.length === 0) return result;
    return result.filter((t) => confirmedCodes.includes(t.param_id));
  }, [result, confirmedCodes]);

  const selectedColumns = useMemo(() => {
    const resultMeta = new Map<string, { category: string; testName: string; shortName: string; unit: string }>();
    (result ?? []).forEach((row) => {
      if (!row.param_id || resultMeta.has(row.param_id)) return;
      resultMeta.set(row.param_id, {
        category: row.category ?? 'Others',
        testName: row.name ?? '-',
        shortName: row.name ?? row.param_id,
        unit: row.type ?? '',
      });
    });
    return confirmedCodes
      .map((code) => {
        const meta = params.find((p) => p.code === code);
        const fallback = resultMeta.get(code);
        return {
          code,
          category: meta?.category ?? fallback?.category ?? 'Others',
          testName: meta?.test_name ?? fallback?.testName ?? '-',
          shortName: meta?.shortname ?? fallback?.shortName ?? code,
          unit: meta?.unit ?? fallback?.unit ?? '',
        };
      });
  }, [confirmedCodes, params, result]);

  const categoryGroups = useMemo(() => {
    const groups: Array<{ category: string; span: number }> = [];
    selectedColumns.forEach((col) => {
      const last = groups[groups.length - 1];
      if (last && last.category === col.category) {
        last.span += 1;
      } else {
        groups.push({ category: col.category, span: 1 });
      }
    });
    return groups;
  }, [selectedColumns]);

  const matrixValueMap = useMemo(() => {
    const m = new Map<string, string>();
    (result ?? []).forEach((row) => {
      const key = `${row.athlete_id}:${row.param_id}`;
      const value = row.raw_display || String(row.score ?? '');
      m.set(key, value);
    });
    return m;
  }, [result]);

  const canRenderMatrix = matrixPlayers.length > 0;
  const isRestoringView =
    loadingPlayers ||
    (loadingData && selectedPlayerIds.length > 0) ||
    (!result && (selectedPlayerIds.length > 0 || confirmedCodes.length > 0));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (playerDropdownRef.current && !playerDropdownRef.current.contains(event.target as Node)) {
        setIsPlayerDropdownOpen(false);
      }
      if (!paramDropdownRef.current) return;
      if (paramDropdownRef.current.contains(event.target as Node)) return;
      setIsParamDropdownOpen(false);
    }
    if (isParamDropdownOpen || isPlayerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isParamDropdownOpen, isPlayerDropdownOpen]);

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    const onScroll = () => updateScrollMetrics();
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      event.preventDefault();
      el.scrollBy({ left: event.deltaY, behavior: 'auto' });
    };

    const raf1 = requestAnimationFrame(() => updateScrollMetrics());
    const raf2 = requestAnimationFrame(() => updateScrollMetrics());

    const observer = new ResizeObserver(() => updateScrollMetrics());
    observer.observe(el);
    if (el.firstElementChild instanceof HTMLElement) {
      observer.observe(el.firstElementChild);
    }

    el.addEventListener('scroll', onScroll);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', updateScrollMetrics);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer.disconnect();
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', updateScrollMetrics);
    };
  }, [canRenderMatrix, selectedColumns.length, matrixPlayers.length, updateScrollMetrics]);

  function togglePlayer(playerId: number) {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  }

  function applySelectedParams() {
    setConfirmedCodes((prev) => Array.from(new Set([...prev, ...selectedParamCodes])));
    setIsParamDropdownOpen(false);
  }

  function toggleParamCode(code: string) {
    setSelectedParamCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function removeConfirmedParam(code: string) {
    setConfirmedCodes((prev) => prev.filter((c) => c !== code));
    setSelectedParamCodes((prev) => prev.filter((c) => c !== code));
  }

  function trimToWords(text: string, wordLimit = 3) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= wordLimit) return text;
    return `${words.slice(0, wordLimit).join(' ')}...`;
  }

  function onTableMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (scrollMax <= 0 || event.button !== 0) return;
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = tableWrapRef.current?.scrollLeft ?? 0;
    setIsDraggingTable(true);
  }

  function onTableMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!isDraggingTable || !tableWrapRef.current) return;
    const deltaX = event.clientX - dragStartXRef.current;
    tableWrapRef.current.scrollLeft = dragStartScrollLeftRef.current - deltaX;
    updateScrollMetrics();
  }

  function stopTableDragging() {
    if (!isDraggingTable) return;
    setIsDraggingTable(false);
  }

  async function loadPerformance() {
    if (selectedPlayerIds.length === 0) return;
    setLoadingData(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const responses = await Promise.all(
        selectedPlayerIds.map(async (playerId) => {
          const res = await fetch(`/api/tests/${playerId}?limit=30`, { headers });
          if (!res.ok) throw new Error('Failed to load performance data');
          return (await res.json()) as TestsResponse;
        })
      );
      const merged: DisplayTestRow[] = responses.flatMap((resp) => {
        const athlete = players.find((p) => p.id === resp.athlete_id);
        const athleteName = athlete?.name ?? athlete?.email ?? `Player ${resp.athlete_id}`;
        return resp.tests.map((row) => ({
          ...row,
          athlete_id: resp.athlete_id,
          athlete_name: athleteName,
        }));
      });
      setResult(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
      setResult(null);
    } finally {
      setLoadingData(false);
    }
  }

  return (
    <div className="performance-page">
      <div className="perf-header">
        <div>
          <h1>Performance</h1>
          <p>Select team, player, and parameters to load test results.</p>
        </div>
        <input
          className="perf-input perf-header-search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search category / test / parameter / code..."
        />
      </div>

      <div className="perf-filters">
        <div className="perf-card">
          <span className="perf-label">Player</span>
          <div className="perf-player-dropdown" ref={playerDropdownRef}>
            <button
              type="button"
              className="perf-select perf-player-trigger"
              onClick={() => setIsPlayerDropdownOpen((prev) => !prev)}
              aria-label="Select players"
            >
              <span>{playerTriggerLabel}</span>
              <span className="perf-params-caret">▼</span>
            </button>
            {isPlayerDropdownOpen && (
              <div className="perf-player-menu">
                {players.length === 0 ? (
                  <div className="perf-empty">{loadingPlayers ? 'Loading...' : '该 Team 暂无绑定会员'}</div>
                ) : (
                  <>
                    <div className="perf-player-actions">
                      <button
                        type="button"
                        className="perf-text-btn"
                        onClick={() => setSelectedPlayerIds(players.map((p) => p.id))}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="perf-text-btn"
                        onClick={() => setSelectedPlayerIds([])}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className="perf-text-btn"
                        onClick={() => setIsPlayerDropdownOpen(false)}
                      >
                        Done
                      </button>
                    </div>
                    <div className="perf-player-list">
                      {players.map((p) => (
                        <label className="perf-player-item" key={p.id}>
                          <input
                            type="checkbox"
                            checked={selectedPlayerIds.includes(p.id)}
                            onChange={() => togglePlayer(p.id)}
                          />
                          <span>{p.name ?? p.email ?? `Player ${p.id}`}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <span className="perf-select-hint">Click to select multiple players.</span>
        </div>
        <div className="perf-card perf-card--grow">
          <span className="perf-label">Parameter Filters</span>
          <div className="perf-filter-grid">
            <select
              className="perf-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedTestName('');
              }}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="perf-select"
              value={selectedTestName}
              onChange={(e) => {
                setSelectedTestName(e.target.value);
              }}
              aria-label="Filter by test name"
            >
              <option value="">All Tests</option>
              {testOptions.map((testName) => (
                <option key={testName} value={testName}>
                  {testName}
                </option>
              ))}
            </select>
            <div className="perf-params-dropdown" ref={paramDropdownRef}>
              <div className="perf-params-inline">
                <button
                  type="button"
                  className="perf-select perf-params-trigger"
                  onClick={() => setIsParamDropdownOpen((prev) => !prev)}
                  aria-label="All Parameters"
                >
                  <span>{paramTriggerLabel}</span>
                  <span className="perf-params-caret">▼</span>
                </button>
                <button
                  className="perf-ok-btn perf-ok-btn--inline"
                  type="button"
                  onClick={applySelectedParams}
                >
                  OK
                </button>
              </div>
              {isParamDropdownOpen && (
                <div className="perf-params-menu">
                  <div className="perf-player-actions">
                    <button
                      type="button"
                      className="perf-text-btn"
                      onClick={() => setSelectedParamCodes(parameterDropdownOptions.map((p) => p.code))}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="perf-text-btn"
                      onClick={() => setSelectedParamCodes([])}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="perf-params-menu-list">
                    {parameterDropdownOptions.length === 0 && (
                      <div className="perf-empty">No parameters found.</div>
                    )}
                    {parameterDropdownOptions.map((opt) => (
                      <label key={opt.code} className="perf-param-item">
                        <input
                          type="checkbox"
                          checked={selectedParamCodes.includes(opt.code)}
                          onChange={() => toggleParamCode(opt.code)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <button className="perf-load-btn" onClick={loadPerformance} disabled={selectedPlayerIds.length === 0 || loadingData}>
          {loadingData ? 'Loading...' : 'Load Performance'}
        </button>
      </div>

      {error && <div className="perf-error">{error}</div>}

      <div className="perf-body">
        <section className="perf-panel">
          <h2>Result</h2>
          <p className="perf-hint">
            {matrixPlayers.length > 0
              ? `Players: ${matrixPlayers.map((p) => p.name).join(', ')}`
              : 'No player selected'}
          </p>
          {isRestoringView && (
            <div className="perf-loading-inline">
              <span className="perf-spinner" aria-hidden="true" />
              <span>Loading performance data...</span>
            </div>
          )}
          {players.length === 0 && !loadingPlayers && (
            <div className="perf-empty">该 Team 暂无绑定会员，请先在 Team/Member 模块完成绑定。</div>
          )}
          {confirmedCodes.length === 0 && (
            <div className="perf-empty">请先在 All Parameters 下拉中选择参数并点击 OK，确认要展示的参数列。</div>
          )}
          {confirmedCodes.length > 0 && !result && (
            <div className="perf-empty">Click "Load Performance" to fetch data.</div>
          )}
          {result && displayedTests.length === 0 && confirmedCodes.length > 0 && (
            <div className="perf-empty">当前筛选暂无数据，表格已保留空位可继续测试。</div>
          )}
          {canRenderMatrix && (
            <div
              className={`perf-table-wrap ${isDraggingTable ? 'perf-table-wrap--dragging' : ''}`}
              ref={tableWrapRef}
              onMouseDown={onTableMouseDown}
              onMouseMove={onTableMouseMove}
              onMouseUp={stopTableDragging}
              onMouseLeave={stopTableDragging}
            >
              <table className="perf-table perf-matrix-table">
                <colgroup>
                  <col className="perf-col-player" />
                  {selectedColumns.map((col) => (
                    <col key={`${col.code}-col`} className="perf-col-param" />
                  ))}
                </colgroup>
                <thead>
                  {selectedColumns.length > 0 ? (
                    <>
                      <tr>
                        <th rowSpan={3}>Player</th>
                        {categoryGroups.map((g, idx) => (
                          <th key={`${g.category}-${idx}`} colSpan={g.span} title={g.category}>
                            <span className="perf-cell-truncate">{trimToWords(g.category)}</span>
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {selectedColumns.map((col) => (
                          <th key={`${col.code}-test`} title={col.testName}>
                            <span className="perf-cell-truncate">{trimToWords(col.testName)}</span>
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {selectedColumns.map((col) => (
                          <th key={`${col.code}-param`} title={`${col.shortName} (${col.unit || 'unit'})`}>
                            <div className="perf-param-head">
                              <span className="perf-cell-truncate">
                                {trimToWords(`${col.shortName} (${col.unit || 'unit'})`)}
                              </span>
                              <button
                                type="button"
                                className="perf-param-delete"
                                onClick={() => removeConfirmedParam(col.code)}
                                aria-label={`Remove ${col.shortName}`}
                                title={`Remove ${col.shortName}`}
                              >
                                ×
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <th>Player</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {matrixPlayers.map((player) => (
                    <tr key={player.id}>
                      <td>{player.name}</td>
                      {selectedColumns.map((col) => {
                        const key = `${player.id}:${col.code}`;
                        return <td key={`${player.id}-${col.code}`}>{matrixValueMap.get(key) ?? ''}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
