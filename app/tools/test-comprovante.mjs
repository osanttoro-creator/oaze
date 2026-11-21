import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../live-site/assets/app/app.js', import.meta.url), 'utf8');
const begin = app.indexOf('  async function readCocoMedia(');
const end = app.indexOf('  async function toggleCocoRecording()', begin);
assert.ok(begin >= 0 && end > begin, 'leitor de mídia encontrado');

const state = { cocoTab: 'Extratos', sharedId: null, importPreview: null, recordPreview: null };
const calls = [];
const notices = [];
const global = {
  __ozCapturaRecibo: false,
  CocoImport: { parseFile: async () => ({ rows: [{ date: '2026-11-20' }] }) }
};
const read = new Function('state','global','demo','cocoAllowed','toast','ask','V3Backend','profile','openCoco','go','closeSheet','$','askCoco',
  app.slice(begin,end) + '; return readCocoMedia;')(
  state, global, false, () => true, (message) => notices.push(message), async () => true,
  { cocoReadMedia: async (file, profileId, mode) => {
    calls.push({ name: file.name, profileId, mode });
    return { tipo: 'registros', quantidade: 1, registros: [] };
  } }, () => ({ id: 'perfil-proprio' }), () => {}, () => {}, () => {}, () => null, async () => {}
);

const pdf = { name: 'comprovante.pdf', type: 'application/pdf', size: 1024 };
await read(pdf, false, 'comprovante');
assert.deepEqual(calls[0], { name: 'comprovante.pdf', profileId: 'perfil-proprio', mode: 'registros' },
  'PDF escolhido em Importar comprovante usa a revisão de registros mesmo na aba Extratos');
assert.equal(state.recordPreview.tipo, 'registros');

const image = { name: 'foto.png', type: 'image/png', size: 1024 };
await read(image, false, 'comprovante');
assert.equal(calls[1].mode, 'registros', 'foto também produz proposta de registro');
assert.equal(global.__ozCapturaRecibo, false);

const ofx = { name: 'conta.ofx', type: 'application/octet-stream', size: 1024 };
await read(ofx, false, 'comprovante');
assert.equal(calls[2].mode, 'registros', 'OFX escolhido no menu vai à leitura de registros');

const resource = readFileSync(new URL('../live-site/assets/app/recursos-app.js', import.meta.url), 'utf8');
const from = resource.indexOf('  function entregarArquivo(');
const to = resource.indexOf('  function abrirComprovante()', from);
assert.ok(from >= 0 && to > from, 'ponte do menu encontrada');
let delivered;
const deliver = new Function('document','CustomEvent',resource.slice(from,to) + '; return entregarArquivo;')(
  { dispatchEvent: (event) => { delivered = event; } },
  class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
);
deliver(image);
assert.equal(delivered.type, 'oaze:comprovante');
assert.equal(delivered.detail.file, image, 'o File original é entregue sem DataTransfer ou input temporário');

assert.ok(notices.some((message) => /Confira antes de registrar/.test(message)));
console.log('Comprovante: foto, PDF, OFX e entrega direta para revisão OK');
