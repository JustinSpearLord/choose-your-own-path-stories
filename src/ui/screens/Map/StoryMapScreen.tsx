import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useParams } from 'react-router';
import { MAP_ROW, type MapEdge, type MapNode, mapSceneDetail, storyMap, type StoryMap } from '../../../engine/graph';
import { Header } from '../../app-theme/Header';
import ui from '../../app-theme/ui.module.css';
import { plural } from '../../format';
import { useTitle } from '../../hooks';
import { RewindSheet } from '../../story-theme/sheets';
import { StoryThemed } from '../../story-theme/StoryTheme';
import st from '../../story-theme/story.module.css';
import { useStory } from '../../story-theme/useStory';
import { NotFound } from '../NotFound';
import css from './Map.module.css';

interface View {
  s: number;
  x: number;
  y: number;
}

const HALF = 13;

function edgePath(a: MapNode, b: MapNode): string {
  if (b.y > a.y) {
    const mid = a.y + MAP_ROW / 2;
    return `M${a.x} ${a.y + HALF} V${mid} H${b.x} V${b.y - HALF}`;
  }
  // An edge that leads back up or sideways: a loop around the side.
  const side = Math.max(a.x, b.x) + 30;
  return `M${a.x + HALF} ${a.y} H${side} V${b.y} H${b.x + HALF}`;
}

function MapCanvas(props: { map: StoryMap; selected: string | null; onSelect: (sceneId: string) => void }) {
  const { map, selected, onSelect } = props;
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 346, h: 372 });
  const [view, setView] = useState<View | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; dist: number; view: View; cx: number; cy: number } | null>(null);

  const fit = (w: number): View => {
    const s = Math.min(1, w / map.width);
    return { s, x: (w - map.width * s) / 2, y: 0 };
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = Math.max(240, Math.min(460, Math.round(map.height * Math.min(1, w / map.width))));
      setSize({ w, h });
      setView((v) => v ?? fit(w));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.width, map.height]);

  const v = view ?? fit(size.w);
  const clampScale = (s: number) => Math.max(0.4, Math.min(3, s));
  const zoomAt = (factor: number, cx: number, cy: number) =>
    setView((old) => {
      const cur = old ?? v;
      const s = clampScale(cur.s * factor);
      const k = s / cur.s;
      return { s, x: cx - (cx - cur.x) * k, y: cy - (cy - cur.y) * k };
    });

  const local = (e: ReactPointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = () => {
    const pts = [...pointers.current.values()];
    const cx = pts.reduce((n, p) => n + p.x, 0) / pts.length;
    const cy = pts.reduce((n, p) => n + p.y, 0) / pts.length;
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { moved: gesture.current?.moved ?? 0, dist, view: v, cx, cy };
  };
  const onDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 1) gesture.current = null;
    start();
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    const cx = pts.reduce((n, p) => n + p.x, 0) / pts.length;
    const cy = pts.reduce((n, p) => n + p.y, 0) / pts.length;
    const dx = cx - g.cx;
    const dy = cy - g.cy;
    g.moved = Math.max(g.moved, Math.hypot(dx, dy));
    if (g.moved < 6 && pts.length === 1) return;
    if (pts.length > 1 && g.dist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const s = clampScale((g.view.s * dist) / g.dist);
      const k = s / g.view.s;
      setView({ s, x: cx - (g.cx - g.view.x) * k, y: cy - (g.cy - g.view.y) * k });
      g.moved = Math.max(g.moved, 10);
    } else {
      setView({ s: g.view.s, x: g.view.x + dx, y: g.view.y + dy });
    }
  };
  const onUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) start();
  };
  const tapped = () => (gesture.current?.moved ?? 0) < 6;

  const byId = useMemo(() => new Map(map.nodes.map((n) => [n.id, n])), [map]);
  const edges = (kind: MapEdge['kind']) =>
    map.edges
      .filter((e) => e.kind === kind)
      .map((e, i) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        return a && b ? <path key={`${kind}-${i}`} d={edgePath(a, b)} /> : null;
      });

  const label = `Branch map. ${plural(map.seen, 'scene')} seen, ${plural(map.unexplored, 'branch', 'branches')} not explored.`;

  return (
    <div className={css.mapWrap}>
      <div
        ref={box}
        className={css.viewport}
        style={{ height: size.h }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
        onWheel={(e) => {
          const r = box.current!.getBoundingClientRect();
          zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
        }}
        data-testid="story-map"
      >
        <svg width={size.w} height={size.h} role="group" aria-label={label} style={{ display: 'block' }}>
          <g transform={`translate(${v.x} ${v.y}) scale(${v.s})`}>
            <g fill="none" strokeWidth={2} stroke="var(--map-faint)" strokeDasharray="4 4">
              {edges('unknown')}
            </g>
            <g fill="none" strokeWidth={3} stroke="var(--map-other)" data-edges="other">
              {edges('other')}
            </g>
            <g fill="none" strokeWidth={3} stroke="var(--accent)" data-edges="latest">
              {edges('latest')}
            </g>
            {map.nodes.map((n) => {
              if (n.kind === 'unknown') {
                return (
                  <g key={n.id} data-node="unknown" aria-hidden="true">
                    <rect
                      x={n.x - 11}
                      y={n.y - 11}
                      width={22}
                      height={22}
                      fill="var(--bg)"
                      stroke="var(--map-faint)"
                      strokeWidth={2}
                      strokeDasharray="3 2"
                    />
                    <text x={n.x} y={n.y + 4} className={css.nodeText} fill="var(--muted)">
                      ?
                    </text>
                  </g>
                );
              }
              const on = selected === n.sceneId;
              const half = on ? 16 : 12;
              const text = n.kind === 'ending' ? '★' : String(n.number ?? '');
              const name = n.kind === 'ending' ? `Ending: ${n.title}` : `Scene ${n.number}: ${n.title}`;
              return (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={name}
                  aria-pressed={on}
                  data-node={n.kind}
                  data-scene={n.sceneId}
                  className={css.node}
                  onClick={() => tapped() && onSelect(n.sceneId!)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(n.sceneId!);
                    }
                  }}
                >
                  <rect x={n.x - 22} y={n.y - 22} width={44} height={44} fill="transparent" />
                  <rect
                    x={n.x - half}
                    y={n.y - half}
                    width={half * 2}
                    height={half * 2}
                    fill={n.inLatest ? 'var(--accent)' : 'var(--panel)'}
                    stroke={on ? 'var(--text)' : n.inLatest ? 'none' : 'var(--map-other)'}
                    strokeWidth={on ? 3 : 2}
                  />
                  <text x={n.x} y={n.y + 4} className={css.nodeText} fill={n.inLatest ? 'var(--on-accent)' : 'var(--panel-text)'}>
                    {text}
                  </text>
                  {n.kind === 'ending' ? (
                    <text x={n.x} y={n.y + 30} className={css.endLabel} fill={n.inLatest ? 'var(--accent-text)' : 'var(--text-2)'}>
                      {(n.title ?? '').length > 16 ? `${(n.title ?? '').slice(0, 15)}…` : n.title}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className={css.zoom}>
        <button type="button" className={css.zoomBtn} aria-label="Zoom out" onClick={() => zoomAt(1 / 1.3, size.w / 2, size.h / 2)}>
          −
        </button>
        <button type="button" className={css.zoomBtn} aria-label="Fit the whole map" onClick={() => setView(fit(size.w))}>
          Fit
        </button>
        <button type="button" className={css.zoomBtn} aria-label="Zoom in" onClick={() => zoomAt(1.3, size.w / 2, size.h / 2)}>
          +
        </button>
      </div>
    </div>
  );
}

export function StoryMapScreen() {
  const { id = '' } = useParams();
  const { bundle, missing } = useStory(id);
  const [selected, setSelected] = useState<string | null>(null);
  const [rewinding, setRewinding] = useState(false);
  useTitle('Story map');
  const map = useMemo(() => (bundle ? storyMap(bundle.story, bundle.runs) : null), [bundle]);

  if (missing) return <NotFound message="That story is not in your library." />;
  if (!bundle || !map) return null;
  const { record, story, runs, theme } = bundle;
  const detail = selected ? mapSceneDetail(story, runs, selected, map) : null;
  const latest = map.runs.find((r) => r.latest);
  const rewindRun = detail?.rewind ? runs.find((r) => r.runId === detail.rewind!.runId) : undefined;
  const endingRun = detail?.isEnding
    ? runs.find((r) => r.status === 'finished' && r.endingSceneId === detail.sceneId)
    : undefined;

  return (
    <StoryThemed theme={theme}>
      <main className={`${ui.page} ${css.page}`} style={{ gap: 14 }}>
        <Header
          plain
          title="Story map"
          sub={
            map.locked ? record.title : `${record.title} · ${map.seen} of ${map.total} scenes seen`
          }
          backTo={`/story/${id}/endings`}
          backLabel="Back to endings"
        />

        {map.locked ? (
          <div className={ui.empty}>
            <strong>Locked for now.</strong>
            <span>Finish the story once and the map of your paths opens here.</span>
            <Link to={`/story/${id}`} className={ui.linkBtn}>
              Back to the story menu
            </Link>
          </div>
        ) : (
          <>
            <div className={css.legend}>
              <span>
                <span className={css.swLatest} aria-hidden="true" />
                {latest?.endingTitle ?? latest?.name ?? 'Latest path'} (latest)
              </span>
              {map.runs.length > 1 ? (
                <span>
                  <span className={css.swOther} aria-hidden="true" />
                  {plural(map.runs.length - 1, 'other path')}
                </span>
              ) : null}
              <span>
                <span className={css.swUnknown} aria-hidden="true" />
                Not explored
              </span>
            </div>

            <MapCanvas map={map} selected={selected} onSelect={(sid) => setSelected(sid === selected ? null : sid)} />
            <p className={ui.muted}>
              Only the scenes you have seen are named. A ? marks a choice you haven’t taken; what lies past it
              stays hidden. Drag to move, pinch to zoom, tap a scene for details.
            </p>

            {detail ? (
              <section aria-label="Selected scene" className={css.detail} data-testid="map-detail">
                <div>
                  <span className={ui.muted}>
                    {detail.isEnding ? 'Ending' : `Scene ${detail.number}`} · seen in {detail.seenIn.slice(0, 2).join(', ')}
                    {detail.seenIn.length > 2 ? ` and ${detail.seenIn.length - 2} more` : ''}
                  </span>
                  <h2 className={css.detailTitle}>{detail.title}</h2>
                </div>
                {detail.choices.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {detail.choices.map((c) => (
                      <div key={c.index} className={st.option} data-taken={c.taken} data-unknown={!c.taken}>
                        <span style={{ flex: 1 }}>{c.text}</span>
                        {c.taken ? (
                          <span className={st.optionTag}>CHOSEN</span>
                        ) : (
                          <span style={{ fontSize: 11 }}>not explored</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
                {detail.notes.length > 0 ? (
                  <div className={css.notes}>
                    <span>{plural(detail.notes.length, 'note')} here:</span>
                    {detail.notes.slice(0, 4).map((n, i) => (
                      <span key={i} className={css.noteText}>
                        “{n.text}”
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={ui.muted}>No notes here.</span>
                )}
                {detail.rewind && rewindRun ? (
                  <button type="button" className={ui.primary} style={{ fontSize: 15 }} onClick={() => setRewinding(true)}>
                    Rewind to this decision
                  </button>
                ) : null}
                {endingRun ? (
                  <Link to={`/run/${endingRun.runId}`} className={ui.secondary}>
                    Review the path that ended here
                  </Link>
                ) : null}
              </section>
            ) : (
              <p className={ui.body}>Tap a numbered scene to see its choices, your notes, and to rewind to it.</p>
            )}
          </>
        )}

        {rewinding && detail?.rewind && rewindRun ? (
          <RewindSheet run={rewindRun} stepIndex={detail.rewind.stepIndex} story={story} onClose={() => setRewinding(false)} />
        ) : null}
      </main>
    </StoryThemed>
  );
}
