import type { WavePoint } from '../domain/calc';

const W = 640;
const H = 170;
const PAD_T = 34;
const PAD_B = 34;

function smooth(pts: [number, number][]): string {
  if (!pts.length) return '';
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * A onda da marca é o resultado do mês dia a dia. Até hoje, linha cheia com o
 * que foi confirmado; depois de hoje, tracejada com o que está previsto.
 */
export function Wave({ points, today, label }: { points: WavePoint[]; today: number | null; label: string }) {
  if (!points.length) return null;
  const n = points.length;
  const vals = points.flatMap((p) => [p.actual, p.planned]);
  const min = Math.min(0, ...vals);
  const max = Math.max(1, ...vals);
  const x = (day: number) => ((day - 1) / Math.max(1, n - 1)) * W;
  const y = (v: number) => PAD_T + (1 - (v - min) / (max - min || 1)) * (H - PAD_T - PAD_B);
  const cut = today ?? n;
  const actual = points.filter((p) => p.day <= cut).map((p) => [x(p.day), y(p.actual)] as [number, number]);
  const lastActual = points[cut - 1] ?? points[n - 1]!;
  // o previsto continua do ponto real de hoje, somando só o que ainda falta
  const future = points.filter((p) => p.day >= cut).map((p) => [x(p.day), y(lastActual.actual + (p.planned - lastActual.planned))] as [number, number]);
  const line = smooth(actual);
  const area = actual.length ? `${line} L${actual[actual.length - 1]![0].toFixed(1)} ${H} L0 ${H} Z` : '';
  const tx = today ? x(today) : null;
  const ty = today ? y(lastActual.actual) : null;

  return (
    <div className="wave" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5FA99B" stopOpacity=".28" />
            <stop offset="1" stopColor="#5FA99B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill="url(#waveFill)" />}
        {future.length > 1 && <path d={smooth(future)} fill="none" stroke="#5FA99B" strokeOpacity=".55" strokeWidth="2.5" strokeDasharray="6 7" vectorEffect="non-scaling-stroke" />}
        {line && <path d={line} fill="none" stroke="#5FA99B" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />}
        {tx != null && ty != null && <line x1={tx} x2={tx} y1={ty} y2={H} stroke="#9DAFB5" strokeOpacity=".5" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />}
      </svg>
      {tx != null && ty != null && (
        <>
          <span style={{ position: 'absolute', left: `${(tx / W) * 100}%`, top: `${(ty / H) * 100}%`, width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: '50%', background: 'var(--bg)', border: '2.5px solid var(--teal)' }} />
          <span className="wave-today" style={{ left: `${(tx / W) * 100}%`, top: `${(ty / H) * 100}%` }}>hoje · {today}</span>
        </>
      )}
      <div className="wave-axis" aria-hidden="true">
        {[1, 8, 15, 22, n].map((d) => <span key={d}>{String(d).padStart(2, '0')}</span>)}
      </div>
    </div>
  );
}
