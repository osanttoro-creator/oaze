import type { CSSProperties } from 'react';
import type { Account, Card } from '../domain/types';
import { bankOf, brandGradient, brandInk, CARD_GRADIENTS } from '../domain/banks';
import { Icon } from './Icon';

/** Conta com cartão de débito e cartão de crédito viram a mesma coisa na carteira. */
export interface WalletItem {
  id: string;
  kind: 'debito' | 'credito';
  name: string;
  bank: string;
  last4: string;
  network: string;
  validThru: string;
  holder: string;
  gradient: string;
  /** Some junto com o gradiente: cartão claro pede tinta escura. */
  ink: string;
}

/* A cor vem do banco e da categoria. O tint continua acima de tudo:
   quem escolheu a cor do cartão a mão escolheu por um motivo, e um
   banco novo na lista não pode repintar o cartão de ninguém. */
/* Um tint escolhido a mão continua sendo um gradiente escuro da paleta
   antiga, e ali o creme é que lê. */
export function inkOf(x: { bank: string; tint?: number }, kind: 'debito' | 'credito'): string {
  return x.tint != null ? '#F0E5CF' : brandInk(x.bank, kind);
}

export function gradientOf(x: { bank: string; tint?: number }, kind: 'debito' | 'credito'): string {
  return x.tint != null ? (CARD_GRADIENTS[x.tint % CARD_GRADIENTS.length] as string) : brandGradient(x.bank, kind);
}

export function walletItems(accounts: Account[], cards: Card[], holder: string): WalletItem[] {
  const debit: WalletItem[] = accounts
    .filter((a) => !a.archived)
    .map((a) => ({ id: a.id, kind: 'debito', name: a.name, bank: a.bank, last4: a.debitCard?.last4 ?? '', network: a.debitCard?.network ?? '', validThru: a.debitCard?.validThru ?? '', holder, gradient: gradientOf(a, 'debito'), ink: inkOf(a, 'debito') }));
  const credit: WalletItem[] = cards
    .filter((c) => !c.archived)
    .map((c) => ({ id: c.id, kind: 'credito', name: c.name, bank: c.bank, last4: c.last4, network: c.network, validThru: c.validThru, holder: c.holder, gradient: gradientOf(c, 'credito'), ink: inkOf(c, 'credito') }));
  return [...debit, ...credit];
}

export function BankTile({ bank, small }: { bank: string; small?: boolean }) {
  const b = bankOf(bank);
  return (
    <span className={small ? 'bank-tile s' : 'bank-tile'} style={{ background: b.tile, color: b.ink }} aria-hidden="true">
      {b.initials}
    </span>
  );
}

export function BankCard({ item, style, onClick, full, label, hidden = false }: { item: WalletItem; style?: CSSProperties; onClick?: () => void; full?: boolean; label?: string; hidden?: boolean }) {
  return (
    <div
      className="bank-card"
      style={{ background: item.gradient, color: item.ink, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-hidden={hidden || undefined}
      aria-label={label ?? `${item.name} ${item.kind === 'credito' ? 'crédito' : 'débito'}${item.last4 ? ` final ${item.last4}` : ''}`}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="card-top">
        <BankTile bank={item.bank} />
        <span className="card-name">{item.name}</span>
        {item.last4 && <span className="card-last">•• {item.last4}</span>}
        <span className="tag">{item.kind === 'credito' ? 'crédito' : 'débito'}</span>
      </div>
      {full && (
        <>
          <span className="card-chip" />
          <span className="card-nfc"><Icon name="nfc" size={24} /></span>
          {item.last4 && <div className="card-number">•••• •••• •••• {item.last4}</div>}
          <svg className="card-wave" viewBox="0 0 320 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 40 C60 12 110 18 170 34 S270 56 320 26" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <div className="card-foot">
            <div><small>TITULAR</small><b>{item.holder}</b></div>
            {item.validThru && <div><small>VALIDADE</small><b>{item.validThru}</b></div>}
            <span className="card-net">{item.network}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function CardThumb({ item }: { item: WalletItem }) {
  return (
    <span className="tx-thumb" style={{ background: item.gradient, color: item.ink }} aria-hidden="true">
      <span style={{ left: 5, top: 4, right: 'auto', bottom: 'auto' }}><BankTile bank={item.bank} small /></span>
      <span>{item.last4}</span>
    </span>
  );
}
