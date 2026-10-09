import { describe, expect, it } from 'vitest';
import { atLeast, contextPanelFor, currentBreakpoint, shellFor } from './breakpoints';
import { BREAKPOINTS } from './tokens';

/*
  O briefing pede quatro faixas e exige que a experiência de celular não seja o
  desktop encolhido. Estes testes travam o contrato: qual faixa cada largura é, e
  qual casca de navegação cada faixa recebe.
*/

describe('faixas de largura', () => {
  it('classifica as larguras pedidas no briefing', () => {
    expect(currentBreakpoint(320)).toBe('phone');
    expect(currentBreakpoint(599)).toBe('phone');
    expect(currentBreakpoint(600)).toBe('tablet');
    expect(currentBreakpoint(1023)).toBe('tablet');
    expect(currentBreakpoint(1024)).toBe('desktop');
    expect(currentBreakpoint(1439)).toBe('desktop');
    expect(currentBreakpoint(1440)).toBe('wide');
    expect(currentBreakpoint(2560)).toBe('wide');
  });

  it('as bordas são exatamente os números declarados', () => {
    expect(currentBreakpoint(BREAKPOINTS.tablet)).toBe('tablet');
    expect(currentBreakpoint(BREAKPOINTS.desktop)).toBe('desktop');
    expect(currentBreakpoint(BREAKPOINTS.wide)).toBe('wide');
  });

  it('atLeast compara na ordem certa', () => {
    expect(atLeast('wide', 'desktop')).toBe(true);
    expect(atLeast('desktop', 'desktop')).toBe(true);
    expect(atLeast('tablet', 'desktop')).toBe(false);
  });
});

describe('casca por faixa', () => {
  it('celular e tablet usam a ilha inferior; desktop e tela larga, a barra lateral', () => {
    expect(shellFor('phone')).toBe('island');
    expect(shellFor('tablet')).toBe('island');
    expect(shellFor('desktop')).toBe('sidebar');
    expect(shellFor('wide')).toBe('sidebar');
  });

  it('o painel de contexto só existe onde sobra coluna', () => {
    expect(contextPanelFor('phone')).toBe('none');
    expect(contextPanelFor('tablet')).toBe('none');
    expect(contextPanelFor('desktop')).toBe('on-demand');
    expect(contextPanelFor('wide')).toBe('fixed');
  });
});
