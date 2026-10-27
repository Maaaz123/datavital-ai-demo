import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { inspectSeries } from './measures';

export type Point = { label: string; value: number };

const INK = '#142033';
const MUTED = '#5c6b80';
const TEAL = '#0f6e6a';
const TEAL_SOFT = ['#7ebdb8', '#4f948f', '#1f7570', '#0f6e6a', '#163e3c'];
const GRID = '#e6ebf2';

function Frame({
  title,
  caption,
  state,
  labels,
  children,
}: {
  title: string;
  caption: string;
  state: 'ok' | 'empty' | 'invalid' | 'zero';
  labels: { empty: string; invalid: string; zero: string };
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => setWidth(Math.max(280, Math.round(node.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <figure className="sx-plot" ref={ref} data-chart-state={state} data-chart-width={width}>
      <figcaption>
        <strong>{title}</strong>
        <span>{caption}</span>
      </figcaption>
      {state === 'empty' ? <p className="sx-state">{labels.empty}</p> : null}
      {state === 'invalid' ? <p className="sx-state sx-state-bad" role="alert">{labels.invalid}</p> : null}
      {state === 'zero' ? <p className="sx-state">{labels.zero}</p> : null}
      {state === 'ok' ? children : null}
    </figure>
  );
}

export function BarChart({
  title,
  caption,
  points,
  unit,
  labels,
  onPick,
}: {
  title: string;
  caption: string;
  points: Point[];
  unit: string;
  labels: { empty: string; invalid: string; zero: string };
  onPick?: (index: number) => void;
}) {
  const state = inspectSeries(points);
  const grad = useId();
  const max = Math.max(...points.map((point) => point.value), 0);
  const height = 248;
  const pad = 16;
  const inner = 188;
  return (
    <Frame title={title} caption={caption} state={state} labels={labels}>
      <svg className="sx-svg" viewBox={`0 0 720 ${height}`} role="img" aria-label={title}>
        <defs>
          <linearGradient id={grad} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1a8a84" />
            <stop offset="1" stopColor="#0f6e6a" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((step) => (
          <g key={step}>
            <line x1="52" x2="708" y1={pad + inner * step} y2={pad + inner * step} stroke={GRID} />
            <text x="48" y={pad + inner * step + 4} textAnchor="end" fill={MUTED} fontSize="12">
              {formatTick(max * (1 - step), unit)}
            </text>
          </g>
        ))}
        {points.map((point, index) => {
          const barH = max === 0 ? 0 : (point.value / max) * (inner - 10);
          const x = 60 + index * 54;
          return (
            <g key={point.label}>
              <rect
                x={x}
                y={pad + inner - barH}
                width="36"
                height={Math.max(barH, point.value === 0 ? 2 : 0)}
                rx="5"
                fill={point.value === 0 ? '#c5ced8' : `url(#${grad})`}
              />
              <text x={x + 18} y={height - 6} textAnchor="middle" fill={INK} fontSize="11">{point.label}</text>
              {onPick ? (
                <rect x={x - 4} y={pad} width="44" height={inner} fill="transparent" tabIndex={0} role="button" aria-label={`${point.label} ${point.value}`} onClick={() => onPick(index)} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onPick(index);
                }} />
              ) : null}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

export function GroupedChart({
  title,
  caption,
  labels,
  categories,
  first,
  second,
  firstName,
  secondName,
}: {
  title: string;
  caption: string;
  labels: { empty: string; invalid: string; zero: string };
  categories: string[];
  first: number[];
  second: number[];
  firstName: string;
  secondName: string;
}) {
  const points = categories.map((label, index) => ({ label, value: first[index] + second[index] }));
  const state = inspectSeries(points);
  const max = Math.max(...first, ...second, 0);
  return (
    <Frame title={title} caption={caption} state={state} labels={labels}>
      <div className="sx-legend" dir="ltr">
        <span><i style={{ background: TEAL }} />{firstName}</span>
        <span><i style={{ background: '#9dcfcc' }} />{secondName}</span>
      </div>
      <svg className="sx-svg" viewBox="0 0 720 230" role="img" aria-label={title}>
        {categories.map((category, index) => {
          const x = 48 + index * 56;
          const h1 = max ? (first[index] / max) * 160 : 0;
          const h2 = max ? (second[index] / max) * 160 : 0;
          return (
            <g key={category}>
              <rect x={x} y={188 - h1} width="16" height={h1} rx="3" fill={TEAL} />
              <rect x={x + 18} y={188 - h2} width="16" height={h2} rx="3" fill="#9dcfcc" />
              <text x={x + 16} y="210" textAnchor="middle" fill={INK} fontSize="11">{category}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

export function StackChart({
  title,
  caption,
  labels,
  parts,
}: {
  title: string;
  caption: string;
  labels: { empty: string; invalid: string; zero: string };
  parts: { name: string; value: number }[];
}) {
  const state = inspectSeries(parts.map((part) => ({ label: part.name, value: part.value })));
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <Frame title={title} caption={caption} state={state} labels={labels}>
      <div className="sx-stack" dir="ltr" aria-hidden="true">
        {parts.map((part, index) => (
          <span key={part.name} style={{ width: `${(part.value / total) * 100}%`, background: TEAL_SOFT[index % TEAL_SOFT.length] }} />
        ))}
      </div>
      <ul className="sx-legend-list">
        {parts.map((part, index) => (
          <li key={part.name}>
            <i style={{ background: TEAL_SOFT[index % TEAL_SOFT.length] }} />
            <span>{part.name}</span>
            <strong>{total ? `${((part.value / total) * 100).toFixed(1)}%` : '0%'}</strong>
            <span className="sx-quiet">{part.value.toLocaleString('en-US')}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function CompareChart({
  title,
  caption,
  labels,
  rows,
}: {
  title: string;
  caption: string;
  labels: { empty: string; invalid: string; zero: string };
  rows: { label: string; value: number; display: string }[];
}) {
  const state = inspectSeries(rows);
  const max = Math.max(...rows.map((row) => row.value), 0);
  return (
    <Frame title={title} caption={caption} state={state} labels={labels}>
      <div className="sx-compare">
        {rows.map((row) => (
          <div key={row.label} className="sx-compare-row">
            <span>{row.label}</span>
            <div><span style={{ width: `${max ? (row.value / max) * 100 : 0}%` }} /></div>
            <strong className="sx-ltr">{row.display}</strong>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function Ledger({
  title,
  caption,
  rows,
}: {
  title: string;
  caption: string;
  rows: { label: string; display: string; hint: string }[];
}) {
  return (
    <figure className="sx-plot" data-chart-state="ok">
      <figcaption>
        <strong>{title}</strong>
        <span>{caption}</span>
      </figcaption>
      <table className="sx-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td className="sx-ltr">{row.display}</td>
              <td className="sx-quiet">{row.hint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function formatTick(value: number, unit: string): string {
  if (!Number.isFinite(value)) return '';
  if (unit === 'percent') return `${Math.round(value * 100)}%`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
  return `${Math.round(value)}`;
}
