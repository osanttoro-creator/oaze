/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Wallet } from './Wallet';
import { BankCard } from './Cards';
import type { WalletItem } from './Cards';

const item: WalletItem = {
  id: 'conta-1',
  kind: 'debito',
  name: 'Conta principal',
  bank: 'nubank',
  last4: '1234',
  network: '',
  validThru: '',
  holder: 'JONATHAM',
  gradient: '#222',
  ink: '#fff',
};

describe('carteira da V4', () => {
  it('exibe apenas o final do cartão e a marca OAZE no plástico aberto', () => {
    render(<BankCard item={{ ...item, kind: 'credito', network: 'Visa' }} full />);
    expect(screen.getByText('FINAL DO CARTÃO')).toBeInTheDocument();
    expect(screen.getByText('FINAL DO CARTÃO').parentElement).toHaveTextContent('1234');
    expect(screen.queryByText('Visa')).not.toBeInTheDocument();
    expect(document.querySelector('.card-oaze')).toBeInTheDocument();
    expect(screen.queryByText(/•••• ••••/)).not.toBeInTheDocument();
  });

  it('mantém cartões recolhidos fora do foco e reabre o bolso por teclado', async () => {
    const onPocket = vi.fn();
    const onPick = vi.fn();
    const user = userEvent.setup();
    const props = {
      items: [item], picked: null, onPick, onPocket,
      eyebrow: 'saldo total', value: 'R$ 100', sub: 'em contas', hint: 'toque para mostrar',
    };

    const { rerender } = render(<Wallet {...props} open={false} />);
    expect(screen.queryByRole('button', { name: /Conta principal/ })).not.toBeInTheDocument();
    const pocket = screen.getByRole('button', { name: 'Mostrar cartões da carteira' });
    expect(pocket).toHaveAttribute('aria-expanded', 'false');
    pocket.focus();
    await user.keyboard('{Enter}');
    expect(onPocket).toHaveBeenCalledOnce();

    rerender(<Wallet {...props} open />);
    const card = screen.getByRole('button', { name: /Conta principal/ });
    card.focus();
    await user.keyboard(' ');
    expect(onPick).toHaveBeenCalledWith('conta-1');
  });
});
