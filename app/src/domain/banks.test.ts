import { describe, expect, it } from 'vitest';
import { BANKS, brandInk, brandStops, contraste, hslToRgb, hueSat, MILK, NIGHT } from './banks';

/* Um banco novo na lista não pode nascer com um cartão ilegível. O
   teste mede as DUAS pontas do gradiente, não o meio: um pastel que
   passa no centro e falha na borda clara é exatamente o cartão que
   some no sol. */

const rgbDa = (ink: string): [number, number, number] => (ink === '#0D1821' ? NIGHT : MILK);

describe('cor do cartão', () => {
  for (const banco of BANKS) {
    for (const kind of ['debito', 'credito'] as const) {
      it(`${banco.name} ${kind}: a tinta lê nas duas pontas`, () => {
        const tinta = rgbDa(brandInk(banco.key, kind));
        for (const ponta of brandStops(banco.key, kind)) {
          expect(contraste(tinta, hslToRgb(...ponta))).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  it('crédito é sempre mais fundo que débito no mesmo banco', () => {
    for (const banco of BANKS) {
      expect(brandStops(banco.key, 'credito')[0][2]).toBeLessThan(brandStops(banco.key, 'debito')[0][2]);
    }
  });

  it('o matiz da marca sobrevive: nenhum banco colorido vira cinza', () => {
    for (const banco of BANKS.filter((b) => hueSat(b.tile)[1] >= 0.12)) {
      expect(brandStops(banco.key, 'credito')[0][1]).toBeGreaterThan(0.2);
    }
  });

  it('bancos de marcas diferentes não caem no mesmo matiz', () => {
    const coloridos = BANKS.filter((b) => hueSat(b.tile)[1] >= 0.12);
    const matizes = coloridos.map((b) => Math.round(brandStops(b.key, 'credito')[0][0]));
    /* Itaú e Inter são os dois laranjas do mercado; fora esse par,
       nenhum matiz se repete. */
    expect(matizes.filter((h, i) => matizes.indexOf(h) !== i).length).toBeLessThanOrEqual(1);
  });
});
