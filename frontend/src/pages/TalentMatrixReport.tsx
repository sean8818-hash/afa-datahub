import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  buildTalentMatrixReportModel,
  computeSportShapedIdealDomainScores,
  formatChange,
  formatScoreDisplay,
  type BackendSourceSegment,
  type BackendSportAction,
  type TalentReportSnapshot,
} from './buildTalentMatrixReportModel';
import {
  buildPartiallySupportedNarrative,
  buildPotentialLimitationNarrative,
  buildWellSupportedNarrative,
  type ActionNarrative,
} from './actionExplainabilityCopy';
import './TalentMatrixReport.css';
import { TalentMatrixProfilePanel } from './TalentMatrixProfileChart';
import { ReportPdfActionBar } from '../components/ReportPdfActionBar';

const SHOW_SOURCE_REFS = import.meta.env.VITE_REPORT_SHOW_SOURCE_REFS !== 'false';

interface TalentMatrixReportProps {
  report: TalentReportSnapshot;
  onBack?: () => void;
  backLabel?: string;
  printMode?: boolean;
  onSavePdf?: () => void;
  onPreviewPdf?: () => void;
  pdfSaving?: boolean;
  pdfProgress?: number;
  pdfError?: string | null;
}

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'matrix', label: 'Talent Matrix' },
  { id: 'identification', label: 'Identification' },
  { id: 'selected-sport', label: 'Sport Matching' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'action-plan', label: 'Training Plan' },
] as const;

type NavId = (typeof NAV)[number]['id'];
type SourceKey = BackendSourceSegment['source_key'];
type ScrollContainer = HTMLElement | Window;

function getScrollContainer(element: HTMLElement | null): ScrollContainer {
  let node = element?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

function isWindowContainer(container: ScrollContainer): container is Window {
  return container === window;
}

function getScrollMetrics(container: ScrollContainer) {
  if (isWindowContainer(container)) {
    const doc = document.documentElement;
    return {
      scrollTop: window.scrollY || doc.scrollTop,
      scrollHeight: doc.scrollHeight,
      clientHeight: window.innerHeight,
    };
  }
  return {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
  };
}

function setScrollTop(container: ScrollContainer, top: number) {
  if (isWindowContainer(container)) {
    window.scrollTo({ top, behavior: 'auto' });
    return;
  }
  container.scrollTop = top;
}

function ReportScrollRail({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const scrollContainerRef = useRef<ScrollContainer | null>(null);
  const [visible, setVisible] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  const syncButtons = useCallback((container: ScrollContainer) => {
    const metrics = getScrollMetrics(container);
    const maxScroll = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
    setVisible(maxScroll > 8);
    setAtTop(metrics.scrollTop <= 1);
    setAtBottom(metrics.scrollTop >= maxScroll - 1);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const container = getScrollContainer(root);
    scrollContainerRef.current = container;
    const sync = () => syncButtons(container);
    sync();
    const deferredSync = window.requestAnimationFrame(sync);
    const onScroll = () => sync();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', sync);

    return () => {
      window.cancelAnimationFrame(deferredSync);
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', sync);
    };
  }, [rootRef, syncButtons]);

  const scrollByViewport = (direction: -1 | 1) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const metrics = getScrollMetrics(container);
    const maxScroll = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
    const nextTop = Math.min(maxScroll, Math.max(0, metrics.scrollTop + direction * metrics.clientHeight * 0.8));
    setScrollTop(container, nextTop);
    syncButtons(container);
  };

  return (
    <aside
      className={`tm-scroll-rail ${visible ? 'tm-scroll-rail--visible' : ''}`}
      aria-label="Report scroll controls"
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="tm-scroll-rail-arrow"
        aria-label="Scroll report up"
        title="Scroll up"
        disabled={atTop}
        onClick={() => scrollByViewport(-1)}
      >
        ▲
      </button>
      <button
        type="button"
        className="tm-scroll-rail-arrow"
        aria-label="Scroll report down"
        title="Scroll down"
        disabled={atBottom}
        onClick={() => scrollByViewport(1)}
      >
        ▼
      </button>
    </aside>
  );
}

const SOURCE_LEGEND: Array<{ key: SourceKey; id: string; label: string; table: string }> = [
  { key: 'table_e', id: 'E', label: 'Table E · assessment interpretation', table: 'tp_system_prism_assessment_explainability' },
  { key: 'sport_scenario', id: 'F', label: 'Table F · sport-specific match scenario', table: 'tp_system_sport_demand_score' },
  { key: 'demand_factor', id: '0', label: 'Table 0 · PRISM demand definition', table: 'tp_system_prism_demand_factor' },
  { key: 'archetype', id: 'A', label: 'Table A · seven-domain profile archetype', table: 'tp_system_talent_profile_archetype' },
  { key: 'sentence_library', id: 'L', label: 'Table L · published sentence library', table: 'tp_system_talent_report_content_template' },
  { key: 'standards', id: 'S', label: 'Table S · assessment name and scoring standard', table: 'tp_mirror_standards_allnew' },
  { key: 'sport_profile', id: 'P', label: 'Table P · sport profile and domain weights', table: 'tp_system_sport_profile' },
  { key: 'action_requirement_map', id: 'R1', label: 'Table R1 · action-to-requirement map', table: 'tp_system_prism_action_requirement_map' },
  { key: 'assessment_requirement_map', id: 'R2', label: 'Table R2 · assessment-to-requirement map', table: 'tp_system_prism_assessment_requirement_map' },
  { key: 'derived', id: 'C', label: 'Table C · backend calculation', table: 'Calculated from scores and configured weights' },
];

function SourceText({ source, table, children, className = '' }: {
  source: SourceKey;
  table?: string;
  children: ReactNode;
  className?: string;
}) {
  const legend = SOURCE_LEGEND.find((item) => item.key === source);
  const resolvedTable = table || legend?.table || source;
  const sourceId = legend?.id || source;
  return (
    <span
      className={`report-source source-${source} ${className}`.trim()}
      data-source-id={sourceId}
      data-source-table={resolvedTable}
      title={`Data source (${sourceId}): ${resolvedTable}`}
    >
      {children}
      {SHOW_SOURCE_REFS ? <span className="source-ref">({sourceId})</span> : null}
    </span>
  );
}

function SportRadarComparison({
  rows,
  sportName,
}: {
  rows: NonNullable<ReturnType<typeof buildTalentMatrixReportModel>['selectedSportAnalysis']>['radar'];
  sportName: string;
}) {
  const cx = 480;
  const cy = 328;
  const maxR = 232;
  const count = Math.max(rows.length, 1);
  const schemeBIdeals = useMemo(() => computeSportShapedIdealDomainScores(rows), [rows]);
  const point = (value: number, index: number, radius = maxR) => {
    const angle = (index * 2 * Math.PI) / count - Math.PI / 2;
    const r = radius * Math.max(0, Math.min(100, value)) / 100;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };
  const idealScoreFor = (row: (typeof rows)[number]) =>
    Number(schemeBIdeals[row.tmg_field] ?? 0);
  const targetScoreFor = (row: (typeof rows)[number]) =>
    Number(row.capability_target ?? 0);
  const targetGapFor = (row: (typeof rows)[number]) =>
    Number(row.improvement_target ?? Math.max(0, targetScoreFor(row) - Number(row.athlete_score ?? 0)));
  const polygonFrom = (resolver: (row: (typeof rows)[number]) => number) =>
    rows.map((row, index) => {
      const p = point(resolver(row), index);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');

  return (
    <article className="card sport-radar-card">
      <div className="sport-radar-heading">
        <div className="eyebrow">Capability vs demand</div>
        <h3>{sportName} Radar Comparison</h3>
      </div>
      <div className="sport-radar-chart-column">
        <div className="sport-radar-legend sport-radar-legend--chart">
          <span><i className="athlete" /><SourceText source="derived">Athlete capability (measured)</SourceText></span>
          <span><i className="demand" /><SourceText source="standards">{sportName} domain ideal (tier midpoint)</SourceText></span>
        </div>
        <div className="sport-radar-chart-wrap">
          <svg className="sport-comparison-radar" viewBox="0 0 960 700" role="img" aria-label={`${sportName} ideal benchmark compared with athlete capability`}>
          {[25, 50, 75, 100].map((level) => (
            <polygon key={level} className="grid-line" points={rows.map((_, index) => {
              const p = point(level, index);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(' ')} />
          ))}
          <g className="sport-radar-scale" aria-hidden="true">
            {[0, 25, 50, 75, 100].map((level) => {
              const tick = point(level, 0);
              return (
                <text
                  key={level}
                  x={tick.x - 12}
                  y={tick.y + 4}
                  className="sport-radar-scale-tick"
                  textAnchor="end"
                >
                  {level}
                </text>
              );
            })}
          </g>
          {rows.map((row, index) => {
            const end = point(100, index);
            const label = point(100, index, maxR + 58);
            const idealScore = idealScoreFor(row);
            const idealPoint = point(idealScore, index);
            const anchorFor = (x: number): 'start' | 'middle' | 'end' => {
              if (x < cx - 12) return 'end';
              if (x > cx + 12) return 'start';
              return 'middle';
            };
            const anchor = anchorFor(label.x);
            return (
              <g key={row.tmg_field}>
                <line className="axis" x1={cx} y1={cy} x2={end.x} y2={end.y} />
                <text
                  x={label.x}
                  y={label.y}
                  className="sport-radar-axis-label"
                  textAnchor={anchor}
                >
                  <tspan x={label.x} dy="0">{row.domain}</tspan>
                  <tspan x={label.x} dy="20" className="sport-radar-axis-ideal">
                    Ideal {formatScoreDisplay(idealScore)}
                  </tspan>
                </text>
                <circle className="sport-radar-ideal-dot" cx={idealPoint.x} cy={idealPoint.y} r="5" />
              </g>
            );
          })}
          <polygon className="sport-demand-polygon" points={polygonFrom(idealScoreFor)} />
          <polygon className="athlete-capability-polygon" points={polygonFrom((row) => Number(row.athlete_score))} />
        </svg>
        </div>
      </div>
      <div className="sport-radar-stack">
        <p className="sport-radar-lead">
          Both polygons use the same 100-point capability scale. The solid line is the athlete&apos;s measured
          domain score (Standard matrix). The dashed line is the per-domain ideal for{' '}
          <strong>{sportName}</strong>: each domain picks a standards band from PRISM sport weights
          (Elite/s5–s6 midpoint <strong>90</strong>, Excellent <strong>70</strong>, Good <strong>50</strong>, floor <strong>20</strong>)
          — independent of this athlete. The table Target column is derived from{' '}
          <SourceText source="sport_profile">match_score</SourceText> and sport domain weights.
        </p>
        <div className="sport-radar-targets" aria-label="Per-domain capability comparison">
          <div className="sport-radar-targets-head">
            <span>Domain</span>
            <span>Current</span>
            <span>Target</span>
            <span>Gap</span>
          </div>
          {rows.map((row) => (
            <div className="sport-radar-target-row" key={row.tmg_field}>
              <span className="sport-radar-target-domain">{row.domain}</span>
              <span className="sport-radar-target-value">{formatScoreDisplay(row.athlete_score)}</span>
              <span className="sport-radar-target-value"><SourceText source="sport_profile">{formatScoreDisplay(targetScoreFor(row))}</SourceText></span>
              <span className={targetGapFor(row) > 0 ? 'sport-radar-target-gap' : 'sport-radar-target-met'}>
                {targetGapFor(row) > 0 ? `+${formatScoreDisplay(targetGapFor(row))}` : 'Met'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ActionNarrativeBody({
  actionKey,
  narrative,
  hideWatch = false,
}: {
  actionKey: string;
  narrative: ActionNarrative;
  hideWatch?: boolean;
}) {
  return (
    <div className="action-narrative">
      <div className="action-narrative-segment">
        <strong>Overall:</strong> {narrative.overall}
      </div>
      <div className="action-narrative-segment">
        <strong>Strengths:</strong>{' '}
        {narrative.strengths.length ? narrative.strengths.map((label, index) => (
          <span key={`${actionKey}-strength-${label}`}>
            {index > 0 ? ' · ' : null}
            <SourceText source="action_requirement_map">{label}</SourceText>
          </span>
        )) : 'No clear strength identified yet.'}
      </div>
      {hideWatch ? null : (
        <div className="action-narrative-segment">
          <strong>Watch:</strong>{' '}
          {narrative.watch.length ? (
            <>
              {narrative.watch.map((label, index) => (
                <span key={`${actionKey}-watch-${label}`}>
                  {index > 0 ? ' · ' : null}
                  <SourceText source="action_requirement_map">{label}</SourceText>
                </span>
              ))}
              {narrative.watchImpact ? (
                <span className="action-narrative-impact"> — {narrative.watchImpact}</span>
              ) : null}
            </>
          ) : 'No single limiting factor stands out yet.'}
        </div>
      )}
      <div className="action-narrative-segment">
        <strong>Based on:</strong>{' '}
        {narrative.basedOn.length ? narrative.basedOn.map((name, index) => (
          <span key={`${actionKey}-based-${name}`}>
            {index > 0 ? ' · ' : null}
            <SourceText source="assessment_requirement_map">{name}</SourceText>
          </span>
        )) : (
          <SourceText source="assessment_requirement_map">linked assessments</SourceText>
        )}
      </div>
    </div>
  );
}

type ActionPanelVariant = 'supported' | 'mixed' | 'limited';

function formatActionPanelTitle(baseTitle: string, sportName: string): string {
  const sport = sportName.trim();
  if (!sport) return baseTitle;
  return `${baseTitle} in ${sport}`;
}

function ActionAnalysisPanel({
  variant,
  title,
  sportName,
  badgeLabel,
  actions,
  emptyLabel,
  buildNarrative,
  hideWatch = false,
}: {
  variant: ActionPanelVariant;
  title: string;
  sportName: string;
  badgeLabel: string;
  actions: BackendSportAction[];
  emptyLabel: string;
  buildNarrative: (action: BackendSportAction) => ActionNarrative;
  hideWatch?: boolean;
}) {
  return (
    <article className={`card scenario-panel ${variant}`}>
      <div className="scenario-panel-title">{formatActionPanelTitle(title, sportName)}</div>
      {actions.length > 0 ? (
        <div className="action-card-row">
          {actions.map((action) => (
            <div className="scenario-item action-card" key={`${variant}-${action.action_name}`}>
              <div className="scenario-item-head">
                <span><SourceText source="sport_profile">{badgeLabel}</SourceText></span>
                <strong>{formatScoreDisplay(action.action_score)}/100</strong>
              </div>
              <h3><SourceText source="sport_scenario">{action.action_name}</SourceText></h3>
              <ActionNarrativeBody
                actionKey={`${variant}-${action.action_name}`}
                narrative={buildNarrative(action)}
                hideWatch={hideWatch}
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className={`scenario-empty scenario-empty--footer${actions.length ? ' scenario-empty--hidden' : ''}`}>
        {emptyLabel}
      </div>
    </article>
  );
}

export default function TalentMatrixReport({
  report,
  onBack,
  backLabel = 'Back to Matrix',
  printMode = false,
  onSavePdf,
  onPreviewPdf,
  pdfSaving = false,
  pdfProgress = 0,
  pdfError = null,
}: TalentMatrixReportProps) {
  const model = useMemo(() => buildTalentMatrixReportModel(report), [report]);
  const [activeSection, setActiveSection] = useState<NavId>('overview');
  const [pdfReady, setPdfReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reportDate = useMemo(
    () =>
      new Date(model.generatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [model.generatedAt]
  );
  const coverTeamName = report.team?.name || report.team_name || report.coach?.team_name || 'Coach Team';
  const coverTeamLogo = report.team?.logo_url || report.team_logo_url || null;
  const coverSport = model.selectedSportAnalysis?.sport_name || 'Multi-sport';

  useEffect(() => {
    if (printMode) return undefined;
    const sections = NAV.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveSection(visible.target.id as NavId);
        }
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0.05, 0.25, 0.5] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [printMode]);

  useEffect(() => {
    if (!printMode) return undefined;
    const timer = window.setTimeout(() => setPdfReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [printMode, report]);

  const scrollTo = (id: NavId) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`tm-report-root${printMode ? ' tm-report-root--print' : ''}`}
      ref={rootRef}
      data-pdf-ready={printMode ? (pdfReady ? 'true' : 'false') : undefined}
    >
      {!printMode ? (
        <ReportScrollRail
          rootRef={rootRef}
        />
      ) : null}
      <div className="app-shell">
        {!printMode ? (
        <aside className="sidebar" aria-label="Report navigation">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-name">AfaSense</div>
              <div className="brand-sub">Human Performance</div>
            </div>
          </div>

          <div className="sidebar-label">Talent Report</div>
          <nav className="nav">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => scrollTo(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="side-note">
              <strong>Assessment ID {model.assessmentId}</strong>
              <span>
                Generated {reportDate}
                <br />
                Next review in 12 weeks
              </span>
            </div>

            {onSavePdf || onPreviewPdf ? (
              <ReportPdfActionBar
                reportReady={!!report.report_uuid}
                saving={pdfSaving}
                progress={pdfProgress}
                error={pdfError}
                onSave={onSavePdf}
                onPreview={onPreviewPdf}
              />
            ) : null}

            {onBack ? (
              <button type="button" className="sidebar-back" onClick={onBack}>
                ← {backLabel}
              </button>
            ) : null}
          </div>
        </aside>
        ) : null}

        {!printMode ? (
        <div className="mobile-nav" aria-label="Mobile report navigation">
          <div className="mobile-nav-top">
            <div className="mobile-brand">
              {onBack ? (
                <button type="button" className="mobile-back-btn" onClick={onBack}>
                  ← {backLabel}
                </button>
              ) : null}
              <div className="brand-mark" aria-hidden="true" />
              AfaSense Report
            </div>
            <div className="mobile-athlete">{model.athleteName}</div>
          </div>
          <nav className="mobile-links">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => scrollTo(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        ) : null}

        <main>
          {printMode ? (
          <section className="report-page report-page--cover" aria-label="Talent Matrix Report cover">
            <div className="cover-brand-row">
              <div className="cover-brand">AfaSense</div>
              <div className="cover-edition">Performance Intelligence</div>
            </div>

            <div className="cover-team-block">
              <div className="cover-team-logo" aria-label={`${coverTeamName} team logo`}>
                {coverTeamLogo ? <img src={coverTeamLogo} alt={`${coverTeamName} logo`} /> : <span>TEAM<br />LOGO</span>}
              </div>
              <div>
                <div className="cover-label">Prepared for</div>
                <div className="cover-team-name">{coverTeamName}</div>
              </div>
            </div>

            <div className="cover-title-block">
              <div className="cover-kicker">Athlete performance report</div>
              <h1>Talent Matrix<br />Report</h1>
              <p>Multidimensional athletic profile, sport capability analysis and assessment progress.</p>
            </div>

            <div className="cover-athlete-row">
              <div>
                <div className="cover-label">Athlete</div>
                <strong>{model.athleteName}</strong>
              </div>
              <div className="cover-score-block">
                <div className="cover-label">Talent Score</div>
                <strong>{formatScoreDisplay(model.talentScore)}<small>/{model.talentScoreMax}</small></strong>
                <span>{model.stage}</span>
              </div>
            </div>

            <dl className="cover-report-meta">
              <div><dt>Report type</dt><dd>{report.matrix.group_name}</dd></div>
              <div><dt>Selected sport</dt><dd>{coverSport}</dd></div>
              <div><dt>Assessment date</dt><dd>{reportDate}</dd></div>
            </dl>

            <div className="cover-footer">
              <span>Confidential coaching report</span>
              <span>Generated by AfaSense</span>
            </div>
          </section>
          ) : null}

          <div className="report-page report-page--intro">
          <header className="hero" id="overview">
            <div className="hero-top">
              <div className="report-kicker">Talent Matrix Report</div>
              <div className="sample-badge">{report.matrix.group_name}</div>
            </div>
            <div className="hero-content">
              <div className="athlete">
                <div className="avatar" aria-label="Athlete initials">
                  {model.initials}
                </div>
                <div>
                  <h1>{model.athleteName}</h1>
                  <div className="athlete-meta">
                    {model.metaParts.map((part) => (
                      <span key={part}>{part}</span>
                    ))}
                    <span>{reportDate}</span>
                  </div>
                </div>
              </div>
              <div className="talent-score">
                <div>
                  <div className="score-label">Talent Score</div>
                  <div className="score-number">
                    {formatScoreDisplay(model.talentScore)}
                    <small>/{model.talentScoreMax}</small>
                  </div>
                </div>
                <div className="score-stage">{model.stage}</div>
              </div>
            </div>
          </header>

          {!printMode ? (
          <section className="card source-legend" aria-labelledby="source-legend-heading">
            <div className="source-legend-heading">
              <div>
                <div className="eyebrow">Data provenance</div>
                <h2 id="source-legend-heading">Text Color Guide</h2>
              </div>
              <p>Text colors identify the database table or calculation that supplies each report statement.</p>
            </div>
            <div className="source-legend-grid">
              {SOURCE_LEGEND.map((item) => (
                <div className={`source-legend-item source-${item.key}`} key={item.key}>
                  <i aria-hidden="true" />
                  <div><strong>{item.label}</strong><code>{item.table}</code></div>
                </div>
              ))}
            </div>
          </section>
          ) : null}

          <section className="section section--overview" aria-labelledby="overview-heading">
            <div className="section-head">
              <div>
                <div className="eyebrow">At a glance</div>
                <h2 id="overview-heading">Performance Overview</h2>
              </div>
              <div className="section-caption">{model.overviewCaption}</div>
            </div>
            <div className="grid metrics">
              {model.overviewMetrics.map((metric, index) => (
                <article className="card metric-card" key={metric.key}>
                  <div className="metric-top">
                    <span className="metric-label">{metric.label}</span>
                    <i className={`status-dot ${index === 2 ? 'blue' : index === 3 ? 'amber' : ''}`} />
                  </div>
                  <div className="metric-value">
                    {typeof metric.value === 'number' ? formatScoreDisplay(metric.value) : metric.value ?? '--'}
                    {metric.suffix ? <small>{metric.suffix}</small> : null}
                  </div>
                  <div className="metric-foot">{metric.note}</div>
                </article>
              ))}
            </div>
            {model.overviewSections.length ? (
              <article className="card overview-narrative">
                <div className="overview-narrative-label">Performance summary</div>
                {model.overviewSections.map((section, sectionIndex) => (
                  <div className="overview-narrative-section" key={section.key}>
                    <span className="overview-section-index" aria-hidden="true">{sectionIndex + 1}</span>
                    <p className="source-segment-paragraph">
                      {section.segments.map((segment, index) => (
                        <SourceText source={segment.source_key} table={segment.source_table} key={`${section.key}-${segment.source_key}-${index}`}>
                          {segment.text}{index < section.segments.length - 1 ? ' ' : ''}
                        </SourceText>
                      ))}
                    </p>
                  </div>
                ))}
              </article>
            ) : model.overviewSourceSegments.length ? (
              <article className="card overview-narrative">
                <div className="overview-narrative-label">Performance summary</div>
                <p className="source-segment-paragraph">
                  {model.overviewSourceSegments.map((segment, index) => (
                    <SourceText source={segment.source_key} table={segment.source_table} key={`${segment.source_key}-${index}`}>
                      {segment.text}{index < model.overviewSourceSegments.length - 1 ? ' ' : ''}
                    </SourceText>
                  ))}
                </p>
              </article>
            ) : model.overviewSummary ? (
              <article className="card overview-narrative">
                <div className="overview-narrative-label">Performance summary</div>
                <p>{model.overviewSummary}</p>
              </article>
            ) : null}
            {model.profileDistribution.length ? (
              <div className="profile-band-grid" aria-label="Performance band distribution">
                {model.profileDistribution.map((band) => (
                  <article className={`card profile-band band-${band.level.toLowerCase()}`} key={band.level}>
                    <span>{band.level}</span>
                    <strong>{band.count}</strong>
                    <small>{band.dimensions.length ? band.dimensions.join(', ') : 'No dimensions'}</small>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
          </div>

          <section className="section section--matrix report-page report-page--matrix" id="matrix" aria-labelledby="matrix-heading">
            <div className="section-head">
              <div>
                <div className="eyebrow">Multidimensional profile</div>
                <h2 id="matrix-heading">Talent Matrix</h2>
              </div>
              <div className="section-caption">{model.dimensions.length} core performance dimensions</div>
            </div>
            <div className="card panel matrix-profile-card">
              <div className="matrix-profile-grid">
                <div className="matrix-profile-top matrix-profile-top--shared">
                  <div className="matrix-segment matrix-segment-profile">
                    <h3 className="panel-title">Athletic Performance Profile</h3>
                    <p className="panel-subtitle">The outer boundary represents the high-performer benchmark.</p>
                    <TalentMatrixProfilePanel
                      domains={model.dimensions.map((dim) => ({
                        domain: dim.label,
                        score: dim.score,
                      }))}
                    />
                  </div>
                </div>

                <aside
                  className="matrix-segment matrix-segment-id identification-panel"
                  id="identification"
                  aria-labelledby="identification-heading"
                >
                  <div className="matrix-id-eyebrow">
                    <div className="eyebrow">Talent identification</div>
                  </div>

                  <div className="matrix-id-column matrix-id-strengths">
                    <h3 className="panel-title" id="identification-heading">Natural Strengths</h3>
                    <div className="compact-strength-list">
                      {model.strengths.slice(0, 2).map((strength) => (
                        <div className="compact-strength" key={strength.rank}>
                          <div className="compact-strength-rank">{strength.rank}</div>
                          <div className="compact-strength-copy">
                            <strong>{strength.dimension}</strong>
                            {strength.source_segments?.length ? (
                              <p className="source-segment-paragraph strength-segment-paragraph">
                                {strength.source_segments.map((segment, segIndex) => (
                                  <SourceText source={segment.source_key} table={segment.source_table} key={`${strength.rank}-${segment.source_key}-${segIndex}`}>
                                    {segment.text}{segIndex < strength.source_segments!.length - 1 ? ' ' : ''}
                                  </SourceText>
                                ))}
                              </p>
                            ) : (
                              <p><SourceText source="sentence_library">{strength.summary}</SourceText></p>
                            )}
                            {strength.evidence_test?.name ? (
                              <span className="compact-strength-evidence-label">
                                Best evidence: <SourceText source="standards">{strength.evidence_test.name}</SourceText>
                              </span>
                            ) : null}
                            {strength.evidence_mapping?.why_it_matters ? (
                              <p className="compact-strength-r2-detail">
                                <SourceText
                                  source={strength.evidence_mapping.source_key ?? 'assessment_requirement_map'}
                                  table={strength.evidence_mapping.source_table}
                                >
                                  {strength.evidence_mapping.why_it_matters}
                                </SourceText>
                              </p>
                            ) : null}
                          </div>
                          <div className="compact-strength-score">{formatScoreDisplay(strength.score)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="matrix-id-column matrix-id-priority">
                    <h3 className="panel-title">Development Priority</h3>
                    <div className="compact-strength compact-priority-card">
                      <div className="compact-strength-rank compact-priority-rank-spacer" aria-hidden="true" />
                      <div className="compact-strength-copy">
                        <strong>{model.opportunities.title}</strong>
                        {model.opportunities.source_segments?.length ? (
                          <p className="source-segment-paragraph strength-segment-paragraph">
                            {model.opportunities.source_segments.map((segment, index) => (
                              <SourceText source={segment.source_key} table={segment.source_table} key={`priority-${segment.source_key}-${index}`}>
                                {segment.text}{index < (model.opportunities.source_segments?.length || 0) - 1 ? ' ' : ''}
                              </SourceText>
                            ))}
                          </p>
                        ) : (
                          <p><SourceText source="sentence_library">{model.opportunities.summary}</SourceText></p>
                        )}
                        {model.opportunities.evidence_test?.name ? (
                          <span className="compact-strength-evidence-label">
                            Best evidence: <SourceText source="standards">{model.opportunities.evidence_test.name}</SourceText>
                          </span>
                        ) : null}
                        {model.opportunities.evidence_mapping?.why_it_matters ? (
                          <p className="compact-strength-r2-detail">
                            <SourceText
                              source={model.opportunities.evidence_mapping.source_key ?? 'assessment_requirement_map'}
                              table={model.opportunities.evidence_mapping.source_table}
                            >
                              {model.opportunities.evidence_mapping.why_it_matters}
                            </SourceText>
                          </p>
                        ) : null}
                      </div>
                      <div className="compact-strength-score">{formatScoreDisplay(model.opportunities.score)}</div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          {model.selectedSportAnalysis ? (
            <>
            {model.selectedSportAnalysis.actions && model.selectedSportAnalysis.actions.length > 0 ? (
              <div className="sport-actions-page report-page report-page--actions">
                <p className="sport-analysis-disclaimer sport-analysis-disclaimer--actions">{model.selectedSportAnalysis.disclaimer}</p>
                <div className="action-analysis-stack section--sport-actions">
                  <ActionAnalysisPanel variant="supported" title="Well-supported actions" sportName={model.selectedSportAnalysis.sport_name} badgeLabel="Action support" actions={model.selectedSportAnalysis.well_supported_actions || []} emptyLabel="No well-supported actions in this report." buildNarrative={buildWellSupportedNarrative} hideWatch />
                  <ActionAnalysisPanel variant="mixed" title="Partially supported actions" sportName={model.selectedSportAnalysis.sport_name} badgeLabel="Mixed profile" actions={model.selectedSportAnalysis.partially_supported_actions || []} emptyLabel="No partially supported actions in this report." buildNarrative={buildPartiallySupportedNarrative} />
                  <ActionAnalysisPanel variant="limited" title="Potential limitations" sportName={model.selectedSportAnalysis.sport_name} badgeLabel="Action limitation" actions={model.selectedSportAnalysis.potential_limitations || []} emptyLabel="No potential limitations in this report." buildNarrative={buildPotentialLimitationNarrative} />
                </div>
              </div>
            ) : null}

            <section className="section section--sport report-page report-page--sport" id="selected-sport" aria-labelledby="selected-sport-heading">
              <div className="section-head">
                <div>
                  <div className="eyebrow">Selected sport deep dive</div>
                  <h2 id="selected-sport-heading"><SourceText source="sport_profile">{model.selectedSportAnalysis.sport_name}</SourceText> Scenario Analysis</h2>
                </div>
                <div className="section-caption">
                  Match {formatScoreDisplay(model.selectedSportAnalysis.match_score)}/100
                </div>
              </div>

              <article className="card sport-domain-summary">
                <div>
                  <h3>Primary Sport Domains</h3>
                  <p>
                    These three abilities contribute most to the selected sport match. Sport importance shows
                    how strongly each ability affects the match score; athlete capability shows the current result.
                  </p>
                </div>
                <div className="sport-domain-list">
                  {model.selectedSportAnalysis.primary_domains.map((domain) => (
                    <div className="sport-domain-chip" key={domain.domain_source}>
                      <span><SourceText source="sport_profile">{domain.domain}</SourceText></span>
                      <div><small>Sport importance</small><strong><SourceText source="sport_profile">{formatScoreDisplay(domain.weight)}%</SourceText></strong></div>
                      <div><small>Athlete capability</small><strong>{formatScoreDisplay(domain.athlete_score)}/100</strong></div>
                    </div>
                  ))}
                </div>
              </article>

              <SportRadarComparison
                rows={model.selectedSportAnalysis.radar || []}
                sportName={model.selectedSportAnalysis.sport_name}
              />

              {!(model.selectedSportAnalysis.actions && model.selectedSportAnalysis.actions.length > 0) ? (
                <div className="grid scenario-analysis-grid">
                  <article className="card scenario-panel supported">
                    <div className="scenario-panel-title">
                      {formatActionPanelTitle('Expected strengths', model.selectedSportAnalysis.sport_name)}
                    </div>
                    {model.selectedSportAnalysis.supported_scenarios.map((scenario) => (
                      <div className="scenario-item" key={`supported-${scenario.assessment}-${scenario.sport_demand}`}>
                        <div className="scenario-item-head">
                          <span><SourceText source="demand_factor">{scenario.primary_domain}</SourceText></span>
                          <strong>{formatScoreDisplay(scenario.assessment_score)}/100</strong>
                        </div>
                        <h3><SourceText source="sport_scenario">{scenario.match_scenario}</SourceText></h3>
                        <dl>
                          <div><dt>Primary Sport Demand</dt><dd><SourceText source="demand_factor">{scenario.sport_demand}</SourceText></dd></div>
                          <div><dt>Assessment</dt><dd><SourceText source="standards">{scenario.assessment}</SourceText></dd></div>
                          <div><dt>Why it matters</dt><dd><SourceText source="table_e">{scenario.why_it_matters}</SourceText></dd></div>
                        </dl>
                        <p>
                          <SourceText source="standards">{scenario.assessment} at {formatScoreDisplay(scenario.assessment_score)}/100</SourceText>
                          {' is likely to support consistent execution during '}
                          <SourceText source="sport_scenario">{scenario.match_scenario}</SourceText>.
                        </p>
                      </div>
                    ))}
                  </article>

                  <article className="card scenario-panel limited">
                    <div className="scenario-panel-title">
                      {formatActionPanelTitle('Potential limitations', model.selectedSportAnalysis.sport_name)}
                    </div>
                    {model.selectedSportAnalysis.limited_scenarios.map((scenario) => (
                      <div className="scenario-item" key={`limited-${scenario.assessment}-${scenario.sport_demand}`}>
                        <div className="scenario-item-head">
                          <span><SourceText source="demand_factor">{scenario.primary_domain}</SourceText></span>
                          <strong>{formatScoreDisplay(scenario.assessment_score)}/100</strong>
                        </div>
                        <h3><SourceText source="sport_scenario">{scenario.match_scenario}</SourceText></h3>
                        <dl>
                          <div><dt>Primary Sport Demand</dt><dd><SourceText source="demand_factor">{scenario.sport_demand}</SourceText></dd></div>
                          <div><dt>Assessment</dt><dd><SourceText source="standards">{scenario.assessment}</SourceText></dd></div>
                          <div><dt>Why it matters</dt><dd><SourceText source="table_e">{scenario.why_it_matters}</SourceText></dd></div>
                        </dl>
                        <p>
                          <SourceText source="standards">{scenario.assessment} at {formatScoreDisplay(scenario.assessment_score)}/100</SourceText>
                          {' may reduce consistency or efficiency during '}
                          <SourceText source="sport_scenario">{scenario.match_scenario}</SourceText>.
                        </p>
                        {scenario.risk_context ? <div className="risk-context"><SourceText source="table_e">{scenario.risk_context}</SourceText></div> : null}
                      </div>
                    ))}
                  </article>
                </div>
              ) : null}
            </section>

            </>
          ) : null}

          {false ? (
          <section className="section" id="sport-matching" aria-labelledby="sport-heading">
            <div className="section-head">
              <div>
                <div className="eyebrow">Data-driven matching</div>
                <h2 id="sport-heading">Sport Compatibility</h2>
              </div>
              <div className="section-caption">Based on current physical and cognitive profile</div>
            </div>
            {model.sportCompatibilitySummary ? (
              <>
                <article className="card sport-level-summary">
                  <div>
                    <span>Overall athletic level</span>
                    <strong>{model.sportCompatibilitySummary.athlete_level}</strong>
                    <small>{model.sportCompatibilitySummary.athlete_level_description}</small>
                  </div>
                  <div>
                    <span>Best current fit</span>
                    <strong><SourceText source="sport_profile">{model.sportCompatibilitySummary.best_fit_sport}</SourceText></strong>
                    <small>
                      {formatScoreDisplay(model.sportCompatibilitySummary.best_fit_score)}/100 · {model.sportCompatibilitySummary.best_fit_level_description}
                    </small>
                  </div>
                  <div>
                    <span>Sports evaluated</span>
                    <strong>{model.sportCompatibilitySummary.evaluated_sports}</strong>
                    <small>Top five shown below</small>
                  </div>
                </article>
                {model.sportCompatibilitySummary.level_basis ? (
                  <p className="sport-level-basis">{model.sportCompatibilitySummary.level_basis}</p>
                ) : null}
              </>
            ) : null}
            <div className="card sport-table">
              <div className="sport-row header">
                <div>Sport / Role</div>
                <div>Match</div>
                <div>Rationale</div>
              </div>
              {model.sports.map((sport) => (
                <div key={sport.rank} className="sport-row">
                  <div className="sport-name">
                    <span className="sport-rank">{String(sport.rank).padStart(2, '0')}</span>
                    <SourceText source="sport_profile">{sport.sport_name}</SourceText>
                  </div>
                  <div className="sport-score">
                    {formatScoreDisplay(sport.match_score)}
                    <small>%</small>
                    {sport.sport_level ? <em>{sport.sport_level}</em> : null}
                  </div>
                  <div className="sport-reason"><SourceText source="sport_scenario">{sport.rationale}</SourceText></div>
                </div>
              ))}
            </div>
          </section>
          ) : null}

          <div className="report-closing-page report-page report-page--closing">
          <section className="section section--tracking" id="tracking" aria-labelledby="tracking-heading">
            <div className="section-head">
              <div>
                <div className="eyebrow">Athlete tracking</div>
                <h2 id="tracking-heading">Assessment Progress</h2>
              </div>
              <div className="section-caption">Recorded report snapshots only</div>
            </div>
            <div className="grid tracking-grid">
              <article className="card panel">
                <h3 className="panel-title">Growth Velocity</h3>
                <p className="panel-subtitle"><SourceText source="sentence_library">{model.tracking.summary}</SourceText></p>
                <div className="tracking-stats">
                  <div className="tracking-stat">
                    <span>Recorded change</span>
                    <strong>{formatChange(model.tracking.net_change)}</strong>
                  </div>
                  <div className="tracking-stat">
                    <span>Avg gain</span>
                    <strong>{formatChange(model.tracking.average_change)}</strong>
                  </div>
                  <div className="tracking-stat">
                    <span>Best session</span>
                    <strong>
                      {model.tracking.stats.bestLabel} · {model.tracking.stats.bestValue}
                    </strong>
                  </div>
                  <div className="tracking-stat">
                    <span>Latest tests</span>
                    <strong>{model.tracking.stats.latestTests}</strong>
                  </div>
                </div>
                <svg className="line-chart" viewBox="0 0 520 210" role="img" aria-label="Line chart showing score improvement">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16b8a6" stopOpacity=".25" />
                      <stop offset="100%" stopColor="#16b8a6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line className="chart-grid" x1="42" y1="30" x2="500" y2="30" />
                  {model.tracking.yAxisLabels.map((tick) => (
                    <line
                      key={`grid-${tick.value}`}
                      className="chart-grid"
                      x1="42"
                      y1={tick.y}
                      x2="500"
                      y2={tick.y}
                    />
                  ))}
                  {model.tracking.yAxisLabels.map((tick) => (
                    <text key={tick.value} x="10" y={tick.y + 3}>
                      {tick.value}
                    </text>
                  ))}
                  <path className="chart-area" d={model.tracking.areaPath} />
                  <path className="chart-line" d={model.tracking.linePath} />
                  {model.tracking.points.map((point) => (
                    <g key={point.label}>
                      <circle className="chart-dot" cx={point.x} cy={point.y} r="3" />
                      <text x={point.x} y="190" textAnchor="middle">
                        {point.label}
                      </text>
                      <text x={point.x} y={point.y - 10} textAnchor="middle">
                        {point.value}
                      </text>
                    </g>
                  ))}
                </svg>
              </article>
              <article className="card panel">
                <h3 className="panel-title">Data Provenance</h3>
                <p className="panel-subtitle">Peer benchmark is hidden until a valid cohort dataset is available.</p>
                <div className="insight good tracking-summary">
                  <div className="insight-label">Content generation</div>
                  <strong>{model.contentGeneration.mode}</strong>
                  <p>All values and narrative statements are generated deterministically from backend facts and published sentence rules.</p>
                </div>
              </article>
            </div>
          </section>

          <section className="section card action-plan" id="action-plan" aria-labelledby="action-heading">
            <div className="eyebrow">Recommended program</div>
            <h2 id="action-heading">12-Week Training Plan</h2>
            <p className="action-plan-caption">Coach decision support for the next block</p>
            <div className="action-steps">
              {model.actionPlan.map((step) => (
                <article key={step.weeks} className="action-step">
                  <div className="action-step-head">
                    <div className="action-week">{step.weeks}</div>
                    {step.frequency ? <em className="action-frequency">{step.frequency}</em> : null}
                  </div>
                  <h3><SourceText source="sentence_library">{step.title}</SourceText></h3>
                  <p><SourceText source="sentence_library">{step.body}</SourceText></p>
                </article>
              ))}
            </div>
          </section>

          <footer className="report-footer">
            <div>AfaSense Talent Matrix Report · Assessment ID {model.assessmentId}</div>
            <span>This report supports coaching decisions and does not replace medical evaluation.</span>
          </footer>
          </div>

          {printMode ? (
          <section className="report-page report-page--coach-review" aria-labelledby="coach-review-heading">
            <header className="coach-review-header">
              <div>
                <div className="eyebrow">Coach review</div>
                <h2 id="coach-review-heading">Coach Evaluation</h2>
                <p>Use this page to record professional observations, priorities and next-step recommendations.</p>
              </div>
              <div className="coach-review-athlete">
                <span>Athlete</span>
                <strong>{model.athleteName}</strong>
              </div>
            </header>

            <div className="coach-review-meta">
              <div><span>Coach name</span><i aria-hidden="true" /></div>
              <div><span>Evaluation date</span><i aria-hidden="true" /></div>
            </div>

            <div className="coach-review-fields">
              <section className="coach-review-field coach-review-field--large">
                <h3>Overall Evaluation</h3>
                <p>Performance summary, progress and contextual observations</p>
                <div className="coach-writing-lines" aria-label="Overall evaluation writing area" />
              </section>
              <section className="coach-review-field">
                <h3>Key Observations</h3>
                <p>Strengths, development priorities and relevant coaching notes</p>
                <div className="coach-writing-lines" aria-label="Key observations writing area" />
              </section>
              <section className="coach-review-field">
                <h3>Next-Phase Recommendations</h3>
                <p>Training focus, targets and follow-up actions</p>
                <div className="coach-writing-lines" aria-label="Recommendations writing area" />
              </section>
            </div>

            <footer className="coach-review-signoff">
              <div><span>Coach signature</span><i aria-hidden="true" /></div>
              <div><span>Date</span><i aria-hidden="true" /></div>
              <small>AfaSense · Confidential coaching report</small>
            </footer>
          </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
