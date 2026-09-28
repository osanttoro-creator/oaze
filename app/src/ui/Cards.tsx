import type { CSSProperties } from 'react';
import type { Account, Card } from '../domain/types';
import { bankOf, CARD_GRADIENTS, gradientFor } from '../domain/banks';
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
}

export function gradientOf(x: { id: string; tint?: number }): string {
  return x.tint != null ? (CARD_GRADIENTS[x.tint % CARD_GRADIENTS.length] as string) : gradientFor(x.id);
}

export function walletItems(accounts: Account[], cards: Card[], holder: string): WalletItem[] {
  const debit: WalletItem[] = accounts
    .filter((a) => !a.archived)
    .map((a) => ({ id: a.id, kind: 'debito', name: a.name, bank: a.bank, last4: a.debitCard?.last4 ?? '', network: a.debitCard?.network ?? '', validThru: a.debitCard?.validThru ?? '', holder, gradient: gradientOf(a) }));
  const credit: WalletItem[] = cards
    .filter((c) => !c.archived)
    .map((c) => ({ id: c.id, kind: 'credito', name: c.name, bank: c.bank, last4: c.last4, network: c.network, validThru: c.validThru, holder: c.holder, gradient: gradientOf(c) }));
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

export function BankCard({ item, style, onClick, full, label }: { item: WalletItem; style?: CSSProperties; onClick?: () => void; full?: boolean; label?: string }) {
  return (
    <div
      className="bank-card"
      style={{ background: item.gradient, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label ?? `${item.name} ${item.kind === 'credito' ? 'crédito' : 'débito'}${item.last4 ? ` final ${item.last4}` : ''}`}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
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
            <path d="M0 40 C60 12 110 18 170 34 S270 56 320 26" fill="none" stroke="#F0E5CF" strokeWidth="1.2" />
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
    <span className="tx-thumb" style={{ background: item.gradient }} aria-hidden="true">
      <span style={{ left: 5, top: 4, right: 'auto', bottom: 'auto' }}><BankTile bank={item.bank} small /></span>
      <span>{item.last4}</span>
    </span>
  );
}
