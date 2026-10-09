import { describe, expect, it } from 'vitest';
import { newKeyMaterial, open, seal } from './crypto';

/*
  A cifragem do app instalado. O que estes testes travam é o que faz AES-GCM
  valer a pena: autenticação. Um arquivo adulterado precisa FALHAR, não
  descriptografar em lixo — dado financeiro corrompido em silêncio é pior do que
  dado perdido com erro.
*/

describe('cofre cifrado', () => {
  it('fecha e abre, devolvendo o mesmo conteúdo', async () => {
    const key = newKeyMaterial();
    const text = JSON.stringify({ saldo: 123456, conta: 'Nubank' });
    expect(await open(key, await seal(key, text))).toBe(text);
  });

  it('o texto claro não aparece no resultado', async () => {
    const key = newKeyMaterial();
    const sealed = await seal(key, 'Aluguel 2200');
    expect(sealed).not.toContain('Aluguel');
  });

  it('dois selos do mesmo texto são diferentes — o vetor é novo a cada vez', async () => {
    const key = newKeyMaterial();
    expect(await seal(key, 'igual')).not.toBe(await seal(key, 'igual'));
  });

  it('chave errada não abre', async () => {
    const sealed = await seal(newKeyMaterial(), 'segredo');
    await expect(open(newKeyMaterial(), sealed)).rejects.toThrow();
  });

  it('um byte alterado faz a abertura falhar, em vez de devolver lixo', async () => {
    const key = newKeyMaterial();
    const sealed = await seal(key, 'saldo em conta');
    const [v, iv, body] = sealed.split('.');
    const mexido = `${v}.${iv}.${body!.slice(0, -2)}${body!.slice(-2) === 'AA' ? 'AB' : 'AA'}`;
    await expect(open(key, mexido)).rejects.toThrow();
  });

  it('formato desconhecido é recusado com mensagem clara', async () => {
    await expect(open(newKeyMaterial(), 'v9.abc.def')).rejects.toThrow(/formato desconhecido/i);
    await expect(open(newKeyMaterial(), 'sem pontos')).rejects.toThrow(/formato desconhecido/i);
  });

  it('chave fora do tamanho é recusada', async () => {
    await expect(seal('Y3VydGE=', 'x')).rejects.toThrow(/inválida/i);
  });

  it('aguenta conteúdo grande, do tamanho de um espaço de verdade', async () => {
    const key = newKeyMaterial();
    const big = JSON.stringify(Array.from({ length: 5000 }, (_, i) => ({ id: i, amount: i * 137 })));
    expect(await open(key, await seal(key, big))).toBe(big);
  });

  it('acentos sobrevivem à ida e à volta', async () => {
    const key = newKeyMaterial();
    const text = 'Alimentação · Saúde · R$ 1.234,56 — ação';
    expect(await open(key, await seal(key, text))).toBe(text);
  });
});
