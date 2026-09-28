import type { CSSProperties } from 'react';
import { CARD_GRADIENTS } from '../domain/banks';

const MINIS: { name: string; tile: string; g: number; last: string; x: string; y: string; r: string }[] = [
  { name: 'Nubank', tile: '#820AD1', g: 3, last: '4821', x: '-96px', y: '-104px', r: '-16deg' },
  { name: 'Itaú', tile: '#EC7000', g: 0, last: '0917', x: '104px', y: '-76px', r: '13deg' },
  { name: 'Inter', tile: '#FF7A00', g: 2, last: '1130', x: '-100px', y: '104px', r: '10deg' },
  { name: 'Nubank', tile: '#820AD1', g: 1, last: '2204', x: '98px', y: '112px', r: '-12deg' },
];

/** Vários cartões de banco se juntam num cartão OAZE: a promessa em quatro segundos. */
export function MergeAnim({ scale = 1 }: { scale?: number }) {
  return (
    <div className="merge" style={{ transform: `scale(${scale})` }} aria-hidden="true">
      <div className="merge-glow" />
      {MINIS.map((m) => (
        <div key={m.last} className="mini" style={{ background: CARD_GRADIENTS[m.g], '--x': m.x, '--y': m.y, '--r': m.r } as CSSProperties}>
          <b><i style={{ width: 15, height: 15, borderRadius: 5, background: m.tile }} />{m.name}</b>
          <em />
          <span>•••• {m.last}</span>
        </div>
      ))}
      <div className="oaze-card">
        <img src="./brand/oaze-isologo-mono-milk.svg" alt="" style={{ position: 'absolute', right: -34, top: -26, width: 180, opacity: 0.1 }} />
        <span style={{ position: 'absolute', left: 18, top: 50, width: 36, height: 27, borderRadius: 6, background: 'linear-gradient(135deg,#F0E5CF 0%,#C9BEA4 55%,#A89D86 100%)' }} />
        <svg viewBox="0 0 256 60" style={{ position: 'absolute', left: 0, bottom: 34, width: '100%', height: 60, opacity: 0.55 }}>
          <path d="M0 40 C50 20 90 22 140 36 S220 52 256 30" fill="none" stroke="#5FA99B" strokeWidth="1.6" />
        </svg>
        <img src="./brand/oaze-logo-mono-milk.svg" alt="" style={{ position: 'absolute', left: 18, bottom: 16, height: 18, width: 'auto' }} />
        <span style={{ position: 'absolute', right: 18, bottom: 18, font: "500 10px/1 'IBM Plex Mono'", letterSpacing: '.1em' }}>COCO OAZE</span>
      </div>
    </div>
  );
}
