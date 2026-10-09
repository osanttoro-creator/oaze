import type { Screen } from '../state/route';
import type { IconName } from './Icon';

/*
  O mapa de navegação, num arquivo só.

  Antes vivia dentro do `Shell`, e a tela "Mais" importava do `Shell` enquanto o
  `Shell` montava a tela "Mais" — ciclo que o carregamento sob demanda transforma
  em erro de execução, não só em feiura.

  `short` é o rótulo da barra inferior em tela de 320 px: "Lançamentos" não cabe
  lá, e cortar a palavra é pior do que abreviar de propósito.
*/

export interface NavDef {
  id: Screen;
  label: string;
  short: string;
  icon: IconName;
}

export const MAIN: readonly NavDef[] = [
  { id: 'inicio', label: 'Início', short: 'Início', icon: 'house' },
  { id: 'lancamentos', label: 'Lançamentos', short: 'Lanç.', icon: 'arrow-left-right' },
  { id: 'carteira', label: 'Carteira', short: 'Carteira', icon: 'wallet' },
  { id: 'mais', label: 'Mais', short: 'Mais', icon: 'layout-grid' },
];

export const MORE_ITEMS: readonly NavDef[] = [
  { id: 'investimentos', label: 'Investimentos', short: 'Investir', icon: 'trending-up' },
  { id: 'categorias', label: 'Categorias', short: 'Categorias', icon: 'shapes' },
  { id: 'metas', label: 'Metas e orçamentos', short: 'Metas', icon: 'target' },
  { id: 'lembretes', label: 'Lembretes', short: 'Lembretes', icon: 'bell' },
  { id: 'relatorios', label: 'Relatórios', short: 'Relatórios', icon: 'chart-column' },
  { id: 'configuracoes', label: 'Configurações', short: 'Ajustes', icon: 'settings' },
  { id: 'plano', label: 'Plano', short: 'Plano', icon: 'sprout' },
];
