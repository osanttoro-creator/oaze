import { lazy, Suspense, type ReactNode } from 'react';
import { Loading } from '../design-system';
import type { Screen } from '../state/route';
import { Home } from '../screens/Home';
import { Transactions } from '../screens/Transactions';
import { Carteira } from '../screens/Carteira';

/*
  Divisão do pacote — P15 da auditoria: as catorze telas entravam todas no
  primeiro carregamento.

  Fica junto o que a pessoa vê nos primeiros segundos: Início, Lançamentos e
  Carteira são as três da navegação principal, e carregá-las sob demanda só
  trocaria peso por espera. O resto — relatórios, configurações, plano, metas —
  é visitado de vez em quando e vem quando for pedido.
*/

const More = lazy(() => import('../screens/More').then((m) => ({ default: m.More })));
const Investments = lazy(() => import('../screens/Investments').then((m) => ({ default: m.Investments })));
const Categories = lazy(() => import('../screens/Categories').then((m) => ({ default: m.Categories })));
const Goals = lazy(() => import('../screens/Goals').then((m) => ({ default: m.Goals })));
const Reminders = lazy(() => import('../screens/Reminders').then((m) => ({ default: m.Reminders })));
const Reports = lazy(() => import('../screens/Reports').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('../screens/Settings').then((m) => ({ default: m.Settings })));
const Plan = lazy(() => import('../screens/Plan').then((m) => ({ default: m.Plan })));

const SCREENS: Record<Screen, () => ReactNode> = {
  inicio: () => <Home />,
  lancamentos: () => <Transactions />,
  carteira: () => <Carteira />,
  mais: () => <More />,
  investimentos: () => <Investments />,
  categorias: () => <Categories />,
  metas: () => <Goals />,
  lembretes: () => <Reminders />,
  relatorios: () => <Reports />,
  configuracoes: () => <Settings />,
  plano: () => <Plan />,
};

export function ScreenHost({ screen }: { screen: Screen }) {
  return <Suspense fallback={<Loading label="Abrindo" />}>{(SCREENS[screen] ?? SCREENS.inicio)()}</Suspense>;
}
