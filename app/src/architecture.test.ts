import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
  A regra de dependência de docs/11-ARQUITETURA.md, verificada em vez de
  prometida.

      design-system ← domain ← platform ← core ← state ← coco ← ui ← screens ← shell

  Uma camada só importa VALOR de camadas abaixo dela.

  Duas precisões que esta verificação trouxe e o documento incorporou:

  - `platform/` fica abaixo de `core/`, não acima: é `platform()` que diz em qual
    loja o app está, e é `core/storage` quem pergunta para escolher o cofre.
  - **`import type` não conta.** O TypeScript apaga esses imports na compilação:
    não geram dependência em tempo de execução nem ciclo, e proibi-los só
    produziria duplicação de tipo. O que a regra protege é o grafo real.

  A casca fica no topo porque é ela que monta as telas; telas não conhecem a casca.
*/

const SRC = join(process.cwd(), 'src');

/** Ordem de baixo para cima. Índice menor = mais fundo. */
const LAYERS = ['design-system', 'domain', 'platform', 'core', 'state', 'coco', 'ui', 'screens', 'shell'] as const;
type Layer = (typeof LAYERS)[number];

/* Exceções declaradas, cada uma com motivo. Lista curta de propósito: se ela
   crescer, o desenho está errado, não a regra. */
const ALLOWED: { from: Layer; to: Layer; file: string; why: string }[] = [
  {
    from: 'core',
    to: 'state',
    file: 'core/sync/bridge.ts',
    why: 'a ponte existe justamente para costurar estado e sincronização sem que nenhum dos dois conheça o outro',
  },
  {
    from: 'core',
    to: 'state',
    file: 'core/boot.ts',
    why: 'o arranque orquestra todas as camadas; é o único lugar onde isso é correto',
  },
  {
    from: 'platform',
    to: 'core',
    file: 'platform/native.ts',
    why: 'o adaptador nativo fecha o laço do OAuth e reporta erro; a alternativa seria um registro de callbacks que só esconderia a dependência',
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

function layerOf(rel: string): Layer | null {
  const head = rel.split(/[\\/]/)[0] as Layer;
  return LAYERS.includes(head) ? head : null;
}

interface Edge {
  file: string;
  from: Layer;
  to: Layer;
  spec: string;
}

function edges(): Edge[] {
  const found: Edge[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file).replace(/\\/g, '/');
    const from = layerOf(rel);
    if (!from) continue;
    const src = readFileSync(file, 'utf8');
    /* `import type` é apagado na compilação: não é aresta de execução */
    const statements = /import\s+(type\s)?[\s\S]*?from\s+'([^']+)'|import\('([^']+)'\)/g;
    for (const m of src.matchAll(statements)) {
      if (m[1]) continue;
      const spec = m[2] ?? m[3] ?? '';
      if (!spec.startsWith('.')) continue;
      /* resolve o caminho relativo até a pasta de primeiro nível */
      const dir = rel.split('/').slice(0, -1);
      const parts = spec.split('/');
      const stack = [...dir];
      for (const p of parts) {
        if (p === '.') continue;
        else if (p === '..') stack.pop();
        else stack.push(p);
      }
      const target = stack.join('/');
      const to = layerOf(target);
      if (!to || to === from) continue;
      found.push({ file: rel, from, to, spec });
    }
  }
  return found;
}

describe('regra de dependência entre camadas', () => {
  const all = edges();

  it('encontra importações entre camadas — o teste não está varrendo o vazio', () => {
    expect(all.length).toBeGreaterThan(20);
  });

  it('nenhuma camada importa de uma camada acima, fora das exceções declaradas', () => {
    const violations = all
      .filter((e) => LAYERS.indexOf(e.to) > LAYERS.indexOf(e.from))
      .filter((e) => !ALLOWED.some((a) => a.file === e.file && a.from === e.from && a.to === e.to))
      .map((e) => `${e.file} importa ${e.spec} (${e.from} → ${e.to})`);
    expect(violations).toEqual([]);
  });

  it('domain não importa de nenhuma outra camada: é regra pura', () => {
    const leaks = all.filter((e) => e.from === 'domain').map((e) => `${e.file} → ${e.spec}`);
    expect(leaks).toEqual([]);
  });

  it('só platform/ conhece platform/native', () => {
    const outsiders = all
      .filter((e) => e.spec.includes('platform/native'))
      .filter((e) => !e.file.startsWith('platform/') && !e.file.startsWith('core/'))
      .map((e) => e.file);
    expect(outsiders).toEqual([]);
  });

  it('cada exceção declarada ainda existe — lista de exceção velha é mentira', () => {
    const stale = ALLOWED.filter((a) => !all.some((e) => e.file === a.file && e.from === a.from && e.to === a.to)).map(
      (a) => `${a.file}: ${a.from} → ${a.to}`,
    );
    expect(stale).toEqual([]);
  });
});

describe('higiene de arquivo', () => {
  it('nenhum arquivo de código passa de 700 linhas', () => {
    const fat = walk(SRC)
      .map((f) => ({ f: relative(SRC, f).replace(/\\/g, '/'), n: readFileSync(f, 'utf8').split('\n').length }))
      .filter((x) => x.n > 700)
      .map((x) => `${x.f} (${x.n} linhas)`);
    expect(fat).toEqual([]);
  });

  it('nenhum segredo parecido com chave no código do cliente', () => {
    /* Os padrões são montados em pedaços de propósito: escritos inteiros, este
       arquivo dispararia a própria varredura de `tools/verificar-seguranca.mjs`,
       e a saída de um verificador cheia de falso positivo é uma saída que
       ninguém lê. A varredura completa, com JWT e bundle, mora lá. */
    const patterns = [
      new RegExp(['sk', 'live', ''].join('_') + '[A-Za-z0-9]{10,}'),
      new RegExp('\\bsk-[A-Za-z0-9]{20,}'),
      new RegExp(['service', 'role'].join('_')),
    ];
    const suspects = walk(SRC)
      .filter((f) => !f.endsWith('architecture.test.ts'))
      .filter((f) => {
        const s = readFileSync(f, 'utf8');
        return patterns.some((re) => re.test(s));
      })
      .map((f) => relative(SRC, f));
    expect(suspects).toEqual([]);
  });

  it('não sobrou TODO nem FIXME crítico', () => {
    const left = walk(SRC)
      .filter((f) => /\b(TODO|FIXME|XXX)\b/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(SRC, f));
    expect(left).toEqual([]);
  });
});
