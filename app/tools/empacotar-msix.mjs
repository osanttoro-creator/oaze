#!/usr/bin/env node
// Monta o pacote MSIX da Microsoft Store a partir do binário que o Tauri já
// compilou. Não assina nada: a Store assina o pacote enviado, e é por isso que
// este caminho não exige certificado pago (o caminho EXE/MSI exige).
//
//   node tools/empacotar-msix.mjs
//
// Variáveis obrigatórias, atribuídas pelo Partner Center ao produto:
//   MSSTORE_IDENTITY_NAME · MSSTORE_IDENTITY_PUBLISHER · MSSTORE_PUBLISHER_DISPLAY_NAME
// Opcional: MAKEAPPX aponta o executável; sem ela o script procura no Windows Kits.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// 16/11/2026: o projeto Windows mora em "app desktop", na raiz.
const tauri = join(raiz, '..', 'app desktop');
const saida = join(tauri, 'target', 'msix');

function parar(mensagem) {
  console.error(`erro · ${mensagem}`);
  process.exit(1);
}

// --- identidade -------------------------------------------------------------
// Inventar qualquer um destes três valores produz um pacote que o Partner
// Center recusa, então a ausência para o script em vez de gerar algo inútil.
const identidade = {
  __IDENTITY_NAME__: process.env.MSSTORE_IDENTITY_NAME,
  __IDENTITY_PUBLISHER__: process.env.MSSTORE_IDENTITY_PUBLISHER,
  __PUBLISHER_DISPLAY_NAME__: process.env.MSSTORE_PUBLISHER_DISPLAY_NAME,
};
const faltando = Object.entries(identidade).filter(([, v]) => !v).map(([k]) => k.replaceAll('_', ''));
if (faltando.length) {
  parar(
    `identidade do Partner Center ausente (${faltando.join(', ')}).\n` +
    '       Pegue os três valores em Partner Center → o produto → Product management →\n' +
    '       Product identity, e configure MSSTORE_IDENTITY_NAME, MSSTORE_IDENTITY_PUBLISHER\n' +
    '       e MSSTORE_PUBLISHER_DISPLAY_NAME. O Partner Center compara o manifesto\n' +
    '       caractere por caractere: maiúscula e pontuação contam.',
  );
}
if (!identidade.__IDENTITY_PUBLISHER__.startsWith('CN=')) {
  parar(`MSSTORE_IDENTITY_PUBLISHER precisa ser o nome distinto completo, começando em "CN=" (recebi "${identidade.__IDENTITY_PUBLISHER__}")`);
}

// --- versão -----------------------------------------------------------------
// A Store exige quatro partes e reserva a última para si: ela precisa ser 0.
const conf = JSON.parse(readFileSync(join(tauri, 'tauri.conf.json'), 'utf8'));
const partes = String(conf.version).split('.').map((n) => Number.parseInt(n, 10));
if (partes.length < 3 || partes.some((n) => !Number.isInteger(n) || n < 0)) {
  parar(`a versão "${conf.version}" em tauri.conf.json não é x.y.z numérico`);
}
const versao = `${partes[0]}.${partes[1]}.${partes[2]}.0`;

// --- binário ----------------------------------------------------------------
const release = join(tauri, 'target', 'release');
if (!existsSync(release)) parar(`${release} não existe — rode "npx tauri build --no-bundle" antes`);
// Com --no-bundle o Cargo nomeia o executável pelo pacote ("app"); o bundler é
// que renomearia para o productName. Aceita os dois e grava sempre OAZE.exe,
// que é o nome que o manifesto declara.
const exe = ['OAZE.exe', 'app.exe'].map((n) => join(release, n)).find(existsSync);
if (!exe) parar(`não achei OAZE.exe nem app.exe em ${release}`);

// --- layout -----------------------------------------------------------------
rmSync(saida, { recursive: true, force: true });
const pasta = join(saida, 'layout');
mkdirSync(join(pasta, 'Assets'), { recursive: true });

copyFileSync(exe, join(pasta, 'OAZE.exe'));
// Um app Tauri padrão liga o WebView2Loader estaticamente e não produz DLL
// própria. Se alguma aparecer no futuro, ela precisa entrar no pacote: fora
// dele o app abre e fecha sem mensagem.
for (const arquivo of readdirSync(release)) {
  if (arquivo.toLowerCase().endsWith('.dll')) copyFileSync(join(release, arquivo), join(pasta, arquivo));
}

const icones = ['StoreLogo.png', 'Square44x44Logo.png', 'Square71x71Logo.png', 'Square150x150Logo.png',
  /* 20/11/2026: a Microsoft so aceita o bloco grande com o largo junto. */
  'Square310x310Logo.png', 'Wide310x150Logo.png'];
for (const icone of icones) {
  const origem = join(tauri, 'icons', icone);
  if (!existsSync(origem)) parar(`ícone ${icone} não existe em app desktop/icons — rode "npm run tauri -- icon"`);
  copyFileSync(origem, join(pasta, 'Assets', icone));
}

let manifesto = readFileSync(join(tauri, 'msix', 'AppxManifest.template.xml'), 'utf8');
for (const [marca, valor] of Object.entries({ ...identidade, __VERSION__: versao })) {
  manifesto = manifesto.replaceAll(marca, valor);
}
if (manifesto.includes('__')) parar('sobrou marcador __...__ no manifesto — o template e o script saíram de sincronia');
writeFileSync(join(pasta, 'AppxManifest.xml'), manifesto, 'utf8');

// --- makeappx ---------------------------------------------------------------
function acharMakeappx() {
  if (process.env.MAKEAPPX) return process.env.MAKEAPPX;
  const bases = ['C:/Program Files (x86)/Windows Kits/10/bin', 'C:/Program Files/Windows Kits/10/bin'];
  const achados = [];
  for (const base of bases) {
    if (!existsSync(base)) continue;
    for (const versaoKit of readdirSync(base)) {
      const caminho = join(base, versaoKit, 'x64', 'makeappx.exe');
      if (existsSync(caminho)) achados.push(caminho);
    }
  }
  // Maior versão do SDK primeiro: ordenação de texto basta para 10.0.x.y.
  return achados.sort().pop();
}

const makeappx = acharMakeappx();
if (!makeappx) {
  parar(
    'makeappx.exe não encontrado. Instale o Windows 10/11 SDK ou aponte MAKEAPPX\n' +
    '       para o executável. Nos runners windows-latest ele já vem instalado.',
  );
}

const pacote = join(saida, `OAZE-${versao}-x64.msix`);
try {
  execFileSync(makeappx, ['pack', '/d', pasta, '/p', pacote, '/o'], { stdio: 'inherit' });
} catch (erro) {
  // A saída do makeappx já foi para o terminal; repetir a pilha do Node só
  // esconde a mensagem dele, que é a que explica o problema.
  parar(`makeappx falhou (${erro.status ?? erro.code}). A mensagem dele está acima.`);
}

console.log(`\npacote: ${pacote}`);
console.log(`versão: ${versao}   identidade: ${identidade.__IDENTITY_NAME__}`);
console.log('sem assinatura, de propósito: quem assina é a Microsoft Store ao aceitar o envio.');
console.log('Para instalar e testar nesta máquina antes de enviar, é preciso assinar com');
console.log('certificado de teste e confiar nele — um pacote sem assinatura não instala.');
