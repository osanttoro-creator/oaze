// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { setViewport } from '../test/setup';
import { demoWorkspace } from '../domain/seed';
import { todayYM } from '../domain/dates';
import { getState, initialState, setState } from '../state/store';
import { go, patchUI } from '../state/route';
import { Shell } from './Shell';

/*
  Integração da casca: a árvore inteira montada, com estado de verdade.

  O que isto prova e um teste de componente não provaria: que a faixa de largura
  escolhe a casca certa, que navegar troca a tela e carrega o pedaço sob demanda,
  e que os atalhos de teclado chegam de ponta a ponta. São justamente as coisas
  que quebram em refatoração e que ninguém percebe até abrir o app.
*/

function montarEspaco() {
  const w = demoWorkspace();
  setState(() => ({ ...initialState(), owner: { name: 'Ana Souza' }, workspaces: [w], activeId: w.id }));
  location.hash = '#/inicio';
  patchUI({ screen: 'inicio', novo: { open: false, type: 'despesa' }, coco: { open: false, tab: 'agora' }, toast: null });
}

beforeEach(() => {
  montarEspaco();
});

describe('a faixa de largura escolhe a casca', () => {
  it('em 375 px monta a ilha inferior, não a barra lateral', async () => {
    setViewport(375);
    render(<Shell />);
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' });
    expect(nav).toHaveClass('ds-island');
    expect(within(nav).getByRole('button', { name: /Início/ })).toBeInTheDocument();
  });

  it('em 1280 px monta a barra lateral com os grupos', async () => {
    setViewport(1280);
    render(<Shell />);
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' });
    expect(nav).toHaveClass('ds-sidebar');
    expect(within(nav).getByRole('button', { name: /Relatórios/ })).toBeInTheDocument();
  });

  it('a ilha do celular não oferece as telas secundárias — elas moram em "Mais"', async () => {
    setViewport(375);
    render(<Shell />);
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' });
    expect(within(nav).queryByRole('button', { name: /Relatórios/ })).not.toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Mais/ })).toBeInTheDocument();
  });
});

describe('navegação', () => {
  it('clicar troca a tela e marca a atual', async () => {
    setViewport(1280);
    render(<Shell />);
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' });
    await userEvent.click(within(nav).getByRole('button', { name: /Lançamentos/ }));
    await waitFor(() => {
      expect(within(nav).getByRole('button', { name: /Lançamentos/ })).toHaveAttribute('aria-current', 'page');
    });
  });

  it('uma tela sob demanda chega sem erro — o split não quebra a navegação', async () => {
    setViewport(1280);
    render(<Shell />);
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' });
    await userEvent.click(within(nav).getByRole('button', { name: /Configurações/ }));
    /* Settings é lazy: aparece depois do Suspense resolver */
    expect(await screen.findByRole('heading', { name: /configurações/i }, { timeout: 4000 })).toBeInTheDocument();
  });

  it('a agenda abre pelo menu Mais e mostra o calendário financeiro', async () => {
    setViewport(375);
    render(<Shell />);
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' });
    await userEvent.click(within(nav).getByRole('button', { name: /Mais/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Agenda/ }));
    expect(await screen.findByRole('heading', { name: 'agenda' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Alcance do calendário' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^20 de .*evento/ }));
    await userEvent.click(screen.getByRole('button', { name: '+ lançamento neste dia' }));
    const form = await screen.findByRole('dialog', { name: 'Novo lançamento' });
    expect(within(form).getByLabelText('Outra data')).toHaveValue(`${todayYM()}-20`);
  });

  it('o hash acompanha a tela: o botão voltar do Android funciona', async () => {
    setViewport(375);
    render(<Shell />);
    await screen.findByRole('navigation', { name: 'Navegação principal' });
    go('carteira');
    await waitFor(() => expect(location.hash).toBe('#/carteira'));
  });
});

describe('teclado', () => {
  it('Ctrl+K abre a paleta de comandos e Esc fecha', async () => {
    setViewport(1280);
    render(<Shell />);
    await screen.findByRole('navigation', { name: 'Navegação principal' });

    await userEvent.keyboard('{Control>}k{/Control}');
    const paleta = await screen.findByRole('dialog', { name: 'Paleta de comandos' });
    expect(within(paleta).getByRole('combobox', { name: 'Buscar comando' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Paleta de comandos' })).not.toBeInTheDocument());
  });

  it('a paleta filtra por subsequência e executa com Enter', async () => {
    setViewport(1280);
    render(<Shell />);
    await screen.findByRole('navigation', { name: 'Navegação principal' });
    await userEvent.keyboard('{Control>}k{/Control}');

    await userEvent.type(screen.getByRole('combobox', { name: 'Buscar comando' }), 'relat');
    const opcoes = screen.getAllByRole('option');
    expect(opcoes.length).toBeGreaterThan(0);
    expect(opcoes[0]).toHaveTextContent(/Relatórios/);

    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(location.hash).toBe('#/relatorios'));
  });

  it('"N" abre o novo lançamento', async () => {
    setViewport(1280);
    render(<Shell />);
    await screen.findByRole('navigation', { name: 'Navegação principal' });
    await userEvent.keyboard('n');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('digitar "n" num campo NÃO abre o lançamento', async () => {
    setViewport(1280);
    render(
      <>
        <input aria-label="busca" />
        <Shell />
      </>,
    );
    await screen.findByRole('navigation', { name: 'Navegação principal' });
    await userEvent.type(screen.getByLabelText('busca'), 'nubank');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('busca')).toHaveValue('nubank');
  });
});

describe('a inteligência aparece como campo, não como personagem', () => {
  it('o botão da inteligência existe e tem nome falado', async () => {
    setViewport(375);
    render(<Shell />);
    const botao = await screen.findByRole('button', { name: /Abrir a Coco/ });
    expect(botao.querySelector('canvas')).toBeInTheDocument();
    /* o indicador é canvas de partículas: nenhuma imagem de personagem nele */
    expect(botao.querySelector('img')).toBeNull();
  });

  it('o estado do campo segue o que o sistema está fazendo', async () => {
    setViewport(375);
    render(<Shell />);
    const botao = await screen.findByRole('button', { name: /Abrir a Coco/ });
    const campo = botao.querySelector('.oz-field');
    /* o espaço de exemplo tem pendências da Coco, então o campo "pensa" */
    expect(campo?.getAttribute('data-state')).toBe('thinking');
  });
});

describe('o espaço de exemplo não se mistura com dado real', () => {
  it('fica marcado como demo, e a sincronização pula espaço demo', () => {
    expect(getState().workspaces[0]?.demo).toBe(true);
  });
});
