// @vitest-environment jsdom
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, IconButton } from './Button';
import { Input, Segmented, Select, Toggle } from './Fields';
import { Kpi, Skeleton } from './Surfaces';
import { BottomSheet, Dialog, Modal } from './Overlays';
import { ContextMenu, Dropdown } from './Menus';
import { NavigationBar, Tabs } from './Navigation';
import { Badge, EmptyState, ErrorState, Loading } from './Feedback';
import { Toast } from './Toast';

/*
  Testes de componente.

  O que eles cobrem não é "renderiza sem quebrar" — é o contrato de
  acessibilidade e de comportamento que o briefing pede e que some sem aviso na
  primeira refatoração: papel correto, foco preso, Esc, setas, rótulo em ícone,
  e estado que não depende só de cor.
*/

describe('Button', () => {
  it('chama a ação quando clicado', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ocupado desabilita e anuncia — dois cliques não viram dois lançamentos', async () => {
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Salvar
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('o padrão é type=button: botão solto dentro de form não envia o form', () => {
    render(<Button>Ação</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('IconButton exige nome e o expõe ao leitor de tela', () => {
    render(<IconButton label="Fechar">✕</IconButton>);
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });
});

describe('campos', () => {
  it('o rótulo está ligado ao campo — clicar no rótulo foca', async () => {
    render(<Input label="E-mail" />);
    await userEvent.click(screen.getByText('E-mail'));
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
  });

  it('erro é TEXTO com papel de alerta, não só borda vermelha', () => {
    render(<Input label="Senha" error="A senha precisa de 8 caracteres." />);
    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('8 caracteres');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });

  it('a dica é anunciada junto com o campo', () => {
    render(<Input label="Nome" hint="Como quer ser chamado." />);
    const descrito = screen.getByLabelText('Nome').getAttribute('aria-describedby');
    expect(document.getElementById(descrito!)).toHaveTextContent('Como quer ser chamado.');
  });

  it('Toggle é um switch de verdade e troca de estado', async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Toggle label="Biometria" checked={on} onChange={setOn} />;
    }
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Biometria' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('Segmented é radiogroup e anda com as setas, inclusive dando a volta', async () => {
    function Harness() {
      const [v, setV] = useState<'todos' | 'debito' | 'credito'>('todos');
      return (
        <Segmented
          label="Filtro"
          value={v}
          onChange={setV}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'debito', label: 'Débito' },
            { value: 'credito', label: 'Crédito' },
          ]}
        />
      );
    }
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Filtro' });
    await userEvent.click(within(group).getByRole('radio', { name: 'Todos' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(within(group).getByRole('radio', { name: 'Débito' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(within(group).getByRole('radio', { name: 'Crédito' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Select entrega o valor escolhido', async () => {
    const onChange = vi.fn();
    render(
      <Select label="Conta" onChange={onChange} defaultValue="a">
        <option value="a">Itaú</option>
        <option value="b">Nubank</option>
      </Select>,
    );
    await userEvent.selectOptions(screen.getByLabelText('Conta'), 'b');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('camadas', () => {
  it('a folha é um diálogo modal com nome, e Esc fecha', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Novo lançamento">
        <p>corpo</p>
      </BottomSheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Novo lançamento' })).toHaveAttribute('aria-modal', 'true');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('a janela prende o foco: Tab não escapa para a página atrás', async () => {
    render(
      <>
        <button type="button">fora</button>
        <Modal open onClose={() => {}} title="Editar">
          <button type="button">dentro A</button>
          <button type="button">dentro B</button>
        </Modal>
      </>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Editar' });
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: 'fora' })).not.toHaveFocus();
  });

  it('o diálogo de decisão usa alertdialog e tem as duas saídas', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <Dialog
        open
        title="Apagar tudo?"
        message="Isso não volta."
        confirmLabel="Apagar"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('alertdialog', { name: 'Apagar tudo?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('fechado não renderiza nada', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Nada">
        <p>corpo</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('menus', () => {
  const items = [
    { id: 'editar', label: 'Editar', onSelect: vi.fn() },
    { id: 'apagar', label: 'Apagar', tone: 'danger' as const, onSelect: vi.fn() },
  ];

  it('o dropdown anuncia que abre menu e executa o item escolhido', async () => {
    render(<Dropdown label="Ações" items={items} />);
    const trigger = screen.getByRole('button', { name: 'Ações' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(items[0]!.onSelect).toHaveBeenCalledOnce();
  });

  it('o menu de contexto abre no botão direito', async () => {
    render(
      <ContextMenu label="Ações do lançamento" items={items}>
        <button type="button">linha</button>
      </ContextMenu>,
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByRole('button', { name: 'linha' }) });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});

describe('navegação', () => {
  const items = [
    { id: 'inicio' as const, label: 'Início', short: 'Início', icon: <span /> },
    { id: 'lancamentos' as const, label: 'Lançamentos', short: 'Lanç.', icon: <span />, badge: 3 },
  ];

  it('a barra marca a tela atual com aria-current e navega', async () => {
    const onSelect = vi.fn();
    render(<NavigationBar label="Principal" items={items} current="inicio" onSelect={onSelect} />);
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('button', { name: /Início/ })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(within(nav).getByRole('button', { name: /Lanç/ }));
    expect(onSelect).toHaveBeenCalledWith('lancamentos');
  });

  it('em tela estreita usa o rótulo curto; com espaço, o inteiro', () => {
    const { rerender } = render(<NavigationBar label="P" items={items} current="inicio" onSelect={() => {}} />);
    expect(screen.getByText('Lanç.')).toBeInTheDocument();
    rerender(<NavigationBar label="P" items={items} current="inicio" onSelect={() => {}} roomy />);
    expect(screen.getByText('Lançamentos')).toBeInTheDocument();
  });

  it('as abas andam com as setas e só a ativa é alcançável por Tab', async () => {
    function Harness() {
      const [t, setT] = useState<'a' | 'b'>('a');
      return (
        <Tabs
          label="Carteira"
          current={t}
          onSelect={setT}
          tabs={[
            { id: 'a', label: 'Contas' },
            { id: 'b', label: 'Cartões' },
          ]}
        />
      );
    }
    render(<Harness />);
    const contas = screen.getByRole('tab', { name: 'Contas' });
    expect(contas).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Cartões' })).toHaveAttribute('tabindex', '-1');
    contas.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Cartões' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('sinais e estados', () => {
  it('o aviso é status, não alerta — não corta a leitura em andamento', async () => {
    const undo = vi.fn();
    render(<Toast text="Despesa lançada." undo={undo} />);
    expect(screen.getByRole('status')).toHaveTextContent('Despesa lançada.');
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(undo).toHaveBeenCalledOnce();
  });

  it('o carregamento tem papel de status e nome falado', () => {
    render(<Loading label="Sincronizando" />);
    expect(screen.getByRole('status')).toHaveTextContent('Sincronizando');
  });

  it('o estado de erro é alerta e mostra o que fazer', () => {
    render(
      <ErrorState
        title="Essa tela não abriu"
        message="Seus dados continuam salvos."
        action={<Button>Recarregar</Button>}
      />,
    );
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('Seus dados continuam salvos.');
    expect(within(alerta).getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
  });

  it('o estado vazio explica e oferece a saída', () => {
    render(<EmptyState title="Nenhum lançamento" message="Comece pelo botão +." />);
    expect(screen.getByRole('heading', { name: 'Nenhum lançamento' })).toBeInTheDocument();
  });

  it('o contador acima de 99 encurta sem mentir', () => {
    render(<Badge count={150} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('o esqueleto é decorativo: leitor de tela não lê linha falsa', () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('a variação do KPI traz seta além da cor', () => {
    render(<Kpi label="Saldo" value="R$ 1.000,00" delta={{ value: '12%', direction: 'down' }} />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
  });
});
