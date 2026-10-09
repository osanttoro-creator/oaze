/*
  A porta do design system. Tela importa daqui, nunca de um arquivo interno —
  é o que permite trocar a implementação de um componente sem caçar import.

  As duas folhas entram por este arquivo, nesta ordem: tokens primeiro, porque
  componentes.css consome `var(--…)`.
*/
import './tokens.css';
import './components/components.css';

export { BREAKPOINTS, BREAKPOINT_ORDER, DURATION, EASE, TOUCH_MIN, PARTICLE_COLORS, SERIES } from './tokens';
export type { Breakpoint } from './tokens';

export {
  atLeast,
  contextPanelFor,
  currentBreakpoint,
  prefersReducedMotion,
  shellFor,
  useBreakpoint,
  useCoarsePointer,
  useReducedMotion,
} from './breakpoints';
export type { ContextPanel, ShellKind } from './breakpoints';

export { installTheme, readChoice, resolve, setTheme, useTheme } from './theme';
export type { ThemeChoice, ThemeResolved } from './theme';

export { rove, useEscape, useFocusTrap, useScrollLock } from './a11y';

export { Button, IconButton } from './components/Button';
export type { ButtonProps, ButtonSize, ButtonTone, IconButtonProps } from './components/Button';

export { Input, Search, Segmented, Select, Textarea, Toggle } from './components/Fields';
export { Card, Divider, Kpi, Skeleton } from './components/Surfaces';
export type { Material } from './components/Surfaces';

export { BottomSheet, Dialog, Layer, Modal, SidePanel } from './components/Overlays';
export { ContextMenu, Dropdown, Tooltip } from './components/Menus';
export type { MenuItem } from './components/Menus';

export { NavigationBar, Sidebar, TabPanel, Tabs } from './components/Navigation';
export type { NavEntry } from './components/Navigation';

export { Avatar, Badge, EmptyState, ErrorState, Loading, Pill, Tag } from './components/Feedback';
export { Toast } from './components/Toast';

export { OazeIntelligence } from './intelligence/OazeIntelligence';
export type { FieldState } from './intelligence/field';
