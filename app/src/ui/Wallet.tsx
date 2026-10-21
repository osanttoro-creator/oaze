import type { ReactNode } from 'react';
import { BankCard, type WalletItem } from './Cards';
import { Icon } from './Icon';

const STRIP = 34;
const POCKET_H = 224;
const CARD_H = 200;

export interface WalletProps {
  items: WalletItem[];
  picked: string | null;
  open?: boolean;
  onPick: (id: string) => void;
  onPocket: () => void;
  eyebrow: string;
  badge?: ReactNode;
  value: ReactNode;
  sub: ReactNode;
  hint: string;
}

/**
 * Os cartões moram dentro da carteira. Fechada, só a faixa de cima de cada um
 * aparece; tocar num cartão tira ele do bolso e empurra o bolso para baixo.
 */
export function Wallet({ items, picked, open = true, onPick, onPocket, eyebrow, badge, value, sub, hint }: WalletProps) {
  const n = items.length;
  const pocketTop = !open ? 0 : picked ? CARD_H + 36 : Math.max(24, (n - 1) * STRIP + 40);
  let tucked = 0;

  return (
    <div className="wallet" style={{ height: pocketTop + POCKET_H }}>
      {items.map((item, i) => {
        const isPicked = item.id === picked;
        const top = !open ? 0 : picked == null ? i * STRIP : isPicked ? 0 : pocketTop - 30 + tucked++ * 5;
        return (
          <BankCard
            key={item.id}
            item={item}
            full={isPicked}
            onClick={open ? () => onPick(item.id) : undefined}
            hidden={!open}
            style={{ transform: `translateY(${top}px)`, zIndex: isPicked ? 30 : i + 1, boxShadow: isPicked ? 'var(--shadow-float)' : undefined }}
          />
        );
      })}
      <div className="pocket" role="button" tabIndex={0} aria-expanded={open} aria-label={open ? 'Recolher cartões da carteira' : 'Mostrar cartões da carteira'} style={{ transform: `translateY(${pocketTop}px)` }} onClick={onPocket} onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPocket();
        }
      }}>
        <svg className="shape" viewBox="0 0 360 208" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pocketFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1C3343" />
              <stop offset="1" stopColor="#112230" />
            </linearGradient>
          </defs>
          <path d="M28 0H118C140 0 150 28 180 28S220 0 242 0H332A28 28 0 0 1 360 28V180A28 28 0 0 1 332 208H28A28 28 0 0 1 0 180V28A28 28 0 0 1 28 0Z" fill="url(#pocketFill)" stroke="rgba(240,229,207,.1)" vectorEffect="non-scaling-stroke" />
          <path d="M38 16H116C136 16 150 44 180 44S224 16 244 16H322A22 22 0 0 1 344 38V170A22 22 0 0 1 322 192H38A22 22 0 0 1 16 170V38A22 22 0 0 1 38 16Z" fill="none" stroke="rgba(240,229,207,.2)" strokeWidth="1.4" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="pocket-body">
          <div className="row between">
            <span className="eyebrow">{eyebrow}</span>
            {badge}
          </div>
          <div className="hero">{value}</div>
          <div className="muted">{sub}</div>
          <div className="pocket-hint">
            <Icon name="hand" size={20} />
            {hint}
          </div>
        </div>
      </div>
    </div>
  );
}
