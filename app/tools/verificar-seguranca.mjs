#!/usr/bin/env node
/*
  Verificação de segurança do pacote que vai às lojas.

  Roda no CI antes de qualquer build nativo. Três perguntas, nesta ordem:

  1. Sobrou segredo no código ou no bundle?
  2. A CSP cobre tudo que o app realmente carrega e chama?
  3. O que vai no `dist/` é só o que deveria ir?

  A segunda existe porque um domínio faltando na CSP **não dá erro em lugar
  nenhum**: o navegador recusa calado, em produção, depois de passar por todo o
  desenvolvimento sem CSP. Foi o mesmo motivo de existir a verificação
  equivalente no OAZE 1.
*/

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const problemas = [];
const avisos = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/* ------------------------------------------------------------------ 1. segredos */

const PADROES = [
  [/\bsk_live_[A-Za-z0-9]{10,}/, 'chave viva da Stripe'],
  [/\bsk_test_[A-Za-z0-9]{10,}/, 'chave de teste da Stripe'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'chave da OpenAI'],
  [/\bservice_role\b/, 'menção a service_role'],
  [/\bAIza[0-9A-Za-z_-]{30,}/, 'chave do Google'],
  [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/, 'chave privada'],
  [/\baccess_token"\s*:\s*"[A-Za-z0-9._-]{20,}/, 'token de acesso literal'],
];

/* JWT do Supabase: a publicável é pública por definição, a de serviço não.
   O que distingue as duas é o papel dentro do próprio token. */
function jwtDeServico(texto) {
  for (const m of texto.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\./g)) {
    try {
      const corpo = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
      if (corpo.role && corpo.role !== 'anon') return corpo.role;
    } catch {
      /* não era JWT */
    }
  }
  return null;
}

function varrer(dir, rotulo) {
  if (!existsSync(dir)) return;
  for (const file of walk(dir)) {
    if (!/\.(ts|tsx|js|mjs|cjs|json|html|css|env|yml|yaml)$/.test(extname(file) ? file : '')) continue;
    const texto = readFileSync(file, 'utf8');
    const onde = relative(ROOT, file);
    /* o próprio verificador contém os padrões; ignorá-lo não é exceção, é não
       procurar o espelho dentro do espelho */
    if (onde.includes('verificar-seguranca')) continue;
    for (const [re, nome] of PADROES) {
      if (re.test(texto)) problemas.push(`${rotulo}: ${nome} em ${onde}`);
    }
    const papel = jwtDeServico(texto);
    if (papel) problemas.push(`${rotulo}: JWT com papel "${papel}" em ${onde} — só "anon" pode ir ao cliente`);
  }
}

varrer(join(ROOT, 'src'), 'código');
varrer(join(ROOT, 'dist'), 'pacote');

/* ------------------------------------------------- 2. a CSP cobre o que é usado */

const html = existsSync(join(ROOT, 'index.html')) ? readFileSync(join(ROOT, 'index.html'), 'utf8') : '';
const csp = html.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';

if (!csp) {
  problemas.push('CSP: o index.html não declara Content-Security-Policy');
} else {
  const exigido = {
    "default-src 'self'": /default-src[^;]*'self'/,
    "object-src 'none'": /object-src[^;]*'none'/,
    "base-uri 'self'": /base-uri[^;]*'self'/,
    'connect-src com supabase': /connect-src[^;]*\*\.supabase\.co/,
  };
  for (const [nome, re] of Object.entries(exigido)) {
    if (!re.test(csp)) problemas.push(`CSP: falta ${nome}`);
  }
  if (/unsafe-eval/.test(csp)) problemas.push("CSP: 'unsafe-eval' não pode ir para produção");
  if (/script-src[^;]*unsafe-inline/.test(csp)) problemas.push("CSP: script-src com 'unsafe-inline'");
  if (/frame-ancestors/.test(csp)) {
    avisos.push('CSP: frame-ancestors em <meta> é ignorado pelo navegador; mande por cabeçalho HTTP');
  }

  /* Domínios que o código chama e a CSP precisa permitir.

     Comentário não é chamada: `https://oaze.site/app/...` aparece explicando o
     deep link, que é o sistema operacional abrindo o app — nada sai pela rede.
     Sem tirar os comentários antes, a varredura vira ruído e ninguém lê o aviso
     que importa. */
  const chamados = new Set();
  for (const file of walk(join(ROOT, 'src'))) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const codigo = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const m of codigo.matchAll(/https:\/\/([a-z0-9.*-]+\.[a-z]{2,})/g)) {
      chamados.add(m[1]);
    }
  }
  for (const host of chamados) {
    const base = host.replace(/^\*\./, '');
    if (!csp.includes(base)) {
      avisos.push(`CSP: o código menciona https://${host} e a política não cobre esse domínio`);
    }
  }
}

/* --------------------------------------------------- 3. o que vai no pacote */

const dist = join(ROOT, 'dist');
if (existsSync(dist)) {
  for (const file of walk(dist)) {
    const onde = relative(ROOT, file);
    if (/\.map$/.test(file)) problemas.push(`pacote: source map publicado em ${onde}`);
    if (/\.env/.test(onde)) problemas.push(`pacote: arquivo de ambiente em ${onde}`);
  }
} else {
  avisos.push('pacote: dist/ não existe — rode `npm run build` antes para a verificação valer');
}

/* ------------------------------------------------------------------ resultado */

for (const a of avisos) console.log(`aviso  · ${a}`);
for (const p of problemas) console.error(`FALHA  · ${p}`);

if (problemas.length) {
  console.error(`\n${problemas.length} ${problemas.length === 1 ? 'problema' : 'problemas'} de segurança. Nada vai para loja assim.`);
  process.exit(1);
}
console.log(`\nSegurança: sem problemas${avisos.length ? `, ${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}` : ''}.`);
