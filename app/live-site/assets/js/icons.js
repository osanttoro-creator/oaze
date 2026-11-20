/* =============================================================
   icons.js — camada de ícones do app
   ------------------------------------------------------------
   Fontes, ambas vendorizadas (sem CDN em runtime — funciona
   offline e em file://):
   · assets/vendor/bancos.js  — @edusites/bancos-brasil (MIT):
       41 bancos e carteiras brasileiras, silhueta monocromática
       + a cor de marca de cada um.
   · assets/vendor/icons.js   — Lucide (ISC): subconjunto curado
       de ícones de categoria.

   Se um arquivo vendorizado faltar, tudo cai para um ícone
   genérico: nada quebra.
   ============================================================= */
(function (global) {
  'use strict';

  const Icons = {};
  const DATA = global.IconData || { banks: {}, lucide: {} };
  const BR = global.BancosBR || { ICONES: {}, PRESETS: {} };
  const NS = 'http://www.w3.org/2000/svg';

  /* ============================================================
     1 · BANCOS
     ============================================================ */

  /** nome digitado/escolhido -> chave do pacote. Ordem importa. */
  const BANK_MATCH = [
    [/\bitau|ita[uú]\b|unibanco/, 'itau'],
    [/nubank|\bnu\b|nu pagamentos/, 'nubank'],
    [/bradesco/, 'bradesco'],
    [/santander/, 'santander'],
    [/caixa/, 'caixa'],
    [/banco do brasil|\bbb\b/, 'bancodobrasil'],
    [/\binter\b/, 'inter'],
    [/\bc6\b/, 'c6'],
    [/btg/, 'btg'],
    [/sicredi/, 'sicredi'],
    [/sicoob/, 'sicoob'],
    [/picpay/, 'picpay'],
    [/mercado ?pago/, 'mercadopago'],
    [/\bxp\b/, 'xp'],
    [/safra/, 'safra'],
    [/\bneon\b/, 'neon'],
    [/pagbank|pagseguro/, 'pagbank'],
    [/\bstone\b/, 'stone'],
    [/votorantim|\bbv\b/, 'bv'],
    [/mercantil/, 'mercantil'],
    [/\bcora\b/, 'cora'],
    [/infinite ?pay/, 'infinitepay'],
    [/\bdigio\b/, 'digio'],
    [/banco pan|\bpan\b/, 'pan'],
    [/\bwise\b/, 'wise'],
    [/paypal/, 'paypal'],
    [/stripe/, 'stripe'],
    [/\bnext\b/, 'next'],
    [/original/, 'original'],
    [/\brico\b/, 'rico'],
    [/revolut/, 'revolut'],
    [/\bbs2\b/, 'bs2'],
    [/efi ?bank|gerencianet/, 'efibank'],
    [/\bton\b/, 'ton'],
    [/\biugu\b/, 'iugu'],
    [/\basaas\b/, 'asaas'],
    [/ng ?cash/, 'ngcash'],
    [/avenue/, 'avenue'],
    [/nomad/, 'nomad'],
    [/\bbmg\b/, 'bmg'],
    [/agibank/, 'agibank']
  ];


  /* Bandeiras, vales-benefício e cartões de loja (31/10/2026). O pacote de bancos não
     traz essas marcas, e logotipo de terceiro não entra no app sem
     licença: aqui vira um selo com a sigla nas cores da marca. Vêm
     depois dos bancos no casamento de nomes, então "Nubank Mastercard"
     continua sendo Nubank. */
  /* A lista mora na Central de marcas (js/central-marcas.js, 13/11/2026):
     bancos fora do pacote MIT, bandeiras, vales e lojas, com o site de cada
     marca para a logo da Brandfetch. */
  const CENTRAL = global.MarcasCentral || null;
  const MARCAS_EXTRAS = (CENTRAL && CENTRAL.EXTRAS) || {};
  Icons.MARCAS_EXTRAS = MARCAS_EXTRAS;

  /** Resolve um nome livre ("Banco Itaú", "itau", "ITAÚ S.A.") para uma chave. */
  Icons.bankKey = function (name) {
    const n = U.norm(name);
    if (!n) return null;
    for (const [re, key] of BANK_MATCH) if (re.test(n)) return key;
    if (BR.ICONES[n]) return n;
    for (const key in MARCAS_EXTRAS) if (MARCAS_EXTRAS[key].re.test(n)) return key;
    return null;
  };

  Icons.hasBank = (name) => { const k = Icons.bankKey(name); return !!(BR.ICONES[k] || MARCAS_EXTRAS[k]); };

  /** Cores oficiais da marca: { fundo, cor }. Null quando o banco é desconhecido. */
  Icons.bankBrand = function (name) {
    const key = Icons.bankKey(name);
    const p = key && (BR.PRESETS[key] || MARCAS_EXTRAS[key]);
    return p ? { bg: p.fundo, fg: p.cor } : null;
  };

  /** Só os nomes que o app conhece — alimenta o autocompletar do cadastro. */
  Icons.bankKeys = () => Object.keys(BR.ICONES);

  /* O pacote entrega o miolo do <svg> sem fill próprio: a cor vem de fora.
     Guardamos viewBox e conteúdo já limpos, uma vez por banco. */
  const cache = {};
  function bankParts(key) {
    if (cache[key] !== undefined) return cache[key];
    const raw = BR.ICONES[key];
    if (!raw) return (cache[key] = null);
    const vb = (/viewBox=["']([^"']+)["']/.exec(raw) || [, '0 0 108 108'])[1];
    const body = (/<svg[^>]*>([\s\S]*)<\/svg>/.exec(raw) || [, ''])[1]
      .replace(/\s*fill="[^"]*"/g, '').trim();
    return (cache[key] = { vb, body });
  }

  /**
   * <svg> com a silhueta do banco, na cor pedida (padrão: currentColor).
   * Sem correspondência, devolve o ícone genérico de instituição.
   */
  Icons.bank = function (name, size, color) {
    const px = size || 22;
    const parts = bankParts(Icons.bankKey(name));
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', px);
    svg.setAttribute('height', px);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('bank-icon');

    const extra = !parts && MARCAS_EXTRAS[Icons.bankKey(name)];
    if (extra) {
      const t = extra.sigla, fs = t.length <= 1 ? 64 : t.length === 2 ? 50 : t.length === 3 ? 42 : t.length === 4 ? 32 : 26;
      svg.setAttribute('viewBox', '0 0 100 100');
      const txt = document.createElementNS(NS, 'text');
      txt.setAttribute('x', '50'); txt.setAttribute('y', '52');
      txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
      txt.setAttribute('font-weight', '800'); txt.setAttribute('font-size', String(fs));
      txt.setAttribute('fill', color || 'currentColor');
      txt.textContent = t;
      svg.appendChild(txt);
      svg.classList.add('is-sigla');
      /* Logo real por cima da sigla, quando a central tiver uma. Se a
         imagem não carregar, ela se remove e a sigla aparece. */
      const url = CENTRAL && CENTRAL.logoUrl(Object.assign({ chave: Icons.bankKey(name) }, extra), px);
      if (url) {
        const img = document.createElementNS(NS, 'image');
        img.setAttribute('href', url);
        img.setAttribute('x', '0'); img.setAttribute('y', '0');
        img.setAttribute('width', '100'); img.setAttribute('height', '100');
        img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        img.addEventListener('load', () => { txt.remove(); svg.classList.add('is-logo'); });
        img.addEventListener('error', () => img.remove());
        svg.appendChild(img);
      }
    } else if (parts) {
      svg.setAttribute('viewBox', parts.vb);
      svg.setAttribute('fill', color || 'currentColor');
      svg.innerHTML = parts.body;
    } else {
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', color || 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.innerHTML = DATA.lucide.landmark || '';
      svg.classList.add('is-generic');
    }
    return svg;
  };

  /**
   * Ladrilho arredondado no estilo carteira: silhueta na cor de contraste
   * sobre a cor da marca. É o que aparece nos cartões e nas contas.
   */
  Icons.bankTile = function (name, size, fallbackColor) {
    const px = size || 34;
    const brand = Icons.bankBrand(name);
    const bg = brand ? brand.bg : (fallbackColor || 'var(--plane-2)');
    const fg = brand ? brand.fg : U.inkFor(fallbackColor || '#A68B6B');
    const tile = U.el('span', {
      class: 'bank-tile' + (brand ? '' : ' is-generic'),
      style: { width: px + 'px', height: px + 'px', background: bg, color: fg },
      title: name || 'Instituição'
    });
    tile.appendChild(Icons.bank(name, Math.round(px * 0.62), fg));
    return tile;
  };

  /* ============================================================
     2 · CATEGORIAS (Lucide)
     ============================================================ */

  /** Ícones oferecidos no seletor, agrupados para o usuário achar rápido. */
  Icons.PICKER = [
    { grupo: 'Casa e contas', nomes: ['house', 'building', 'key', 'sofa', 'zap', 'droplet', 'flame', 'wifi', 'receipt', 'wrench', 'hammer'] },
    { grupo: 'Dia a dia', nomes: ['utensils', 'shopping-cart', 'shopping-bag', 'coffee', 'cake', 'shirt', 'scissors', 'package', 'tag'] },
    { grupo: 'Transporte', nomes: ['car', 'fuel', 'bus', 'plane', 'truck', 'map-pin'] },
    { grupo: 'Saúde e bem-estar', nomes: ['heart-pulse', 'pill', 'stethoscope', 'dumbbell', 'glasses', 'cigarette'] },
    { grupo: 'Lazer e pessoal', nomes: ['gamepad-2', 'film', 'music', 'ticket', 'book-open', 'graduation-cap', 'gift', 'dog', 'baby', 'sparkles', 'star', 'church', 'tv'] },
    { grupo: 'Dinheiro', nomes: ['banknote', 'wallet', 'coins', 'piggy-bank', 'hand-coins', 'credit-card', 'circle-dollar-sign', 'badge-dollar-sign', 'trending-up', 'chart-line', 'percent', 'landmark', 'arrow-left-right', 'banknote-arrow-down'] },
    { grupo: 'Trabalho e outros', nomes: ['briefcase', 'laptop', 'smartphone', 'building-2', 'users', 'heart-handshake', 'shield', 'umbrella', 'repeat', 'calendar', 'clock', 'folder', 'list', 'circle-help', 'circle-ellipsis'] }
  ];

  const ALL_PICKER = Icons.PICKER.reduce((a, g) => a.concat(g.nomes), []);
  Icons.pickerNames = () => ALL_PICKER.slice();

  /** Palpite por nome de categoria, para quem nunca escolheu um ícone. */
  const CAT_MATCH = [
    [/alimenta|mercado|supermercado|comida|restaurante|padaria|lanche/, 'utensils'],
    [/transporte|uber|combustivel|gasolina|carro|onibus|metro/, 'car'],
    [/moradia|aluguel|casa|condominio|imovel/, 'house'],
    [/saude|medic|farmacia|plano de saude|dentista|hospital/, 'heart-pulse'],
    [/lazer|entretenimento|cinema|jogo|game|viagem|passeio/, 'gamepad-2'],
    [/educa|escola|faculdade|curso|livro|estudo/, 'graduation-cap'],
    [/compras|vestuario|roupa|shopping|presente/, 'shopping-bag'],
    [/assinatura|streaming|netflix|spotify|mensalidade|recorrente/, 'repeat'],
    [/conta|imposto|taxa|tarifa|luz|agua|energia|internet|telefone/, 'receipt'],
    [/salario|remunera|pagamento|folha|proventos/, 'banknote'],
    [/invest|rendimento|dividendo|aporte|juros/, 'trending-up'],
    [/freelance|pj|autonomo|servico|trabalho/, 'briefcase'],
    [/reembolso|estorno|devolucao|cashback/, 'arrow-left-right'],
    [/venda|comercio/, 'tag'],
    [/pet|animal|cachorro|gato/, 'dog'],
    [/academia|esporte|treino/, 'dumbbell'],
    [/poupanca|reserva|emergencia/, 'piggy-bank'],
    [/doacao|caridade/, 'heart-handshake'],
    [/seguro/, 'shield']
  ];

  /* =============================================================
     DE LINHA PARA MASSINHA (20/11/2026, interface C2b)
     -------------------------------------------------------------
     Cada ícone de linha (Lucide) que tem um irmão em 3D aponta para
     o arquivo dele em /assets/turma/icones. Quem não está aqui
     continua de linha: é melhor um traço coerente do que um 3D
     parecido demais com outro.
     ============================================================= */
  const TRIDI = {
    house:'casa',building:'aluguel','building-2':'condominio',key:'chave',sofa:'moveis',zap:'energia',
    droplet:'agua',flame:'gas',wifi:'internet',receipt:'recibo',wrench:'manutencao',hammer:'manutencao',
    utensils:'alimentacao','shopping-cart':'mercado','shopping-bag':'compras',coffee:'cafe',cake:'festa',
    shirt:'roupas',scissors:'beleza',package:'encomenda',tag:'etiqueta',
    car:'carro',fuel:'combustivel',bus:'transporte',plane:'aviao',truck:'frete','map-pin':'bussola',
    'heart-pulse':'saude',pill:'remedio',stethoscope:'consulta',dumbbell:'exercicio',glasses:'otica',
    'gamepad-2':'jogos',film:'cinema',music:'fones',ticket:'ingresso','book-open':'livros',
    'graduation-cap':'formatura',gift:'presente',dog:'cachorro',baby:'bebe',sparkles:'estrela',star:'estrela',
    church:'doacao',tv:'streaming',
    banknote:'dinheiro',wallet:'carteira',coins:'moedas','piggy-bank':'cofrinho','hand-coins':'saco-dinheiro',
    'credit-card':'cartao','circle-dollar-sign':'dinheiro','badge-dollar-sign':'salario',
    'trending-up':'crescimento','chart-line':'progresso',percent:'juros',landmark:'banco',
    'arrow-left-right':'transferencias',
    briefcase:'trabalho',laptop:'computador',smartphone:'celular',users:'parceria',
    'heart-handshake':'coracao',shield:'protecao',umbrella:'seguro',repeat:'recorrencia',
    calendar:'calendario',clock:'tempo',folder:'pasta',list:'lista','circle-help':'duvida',
    'circle-ellipsis':'outros'
  };
  /** Nome do arquivo 3D de um ícone de linha, ou '' se não houver. */
  Icons.tridi = function (nome) { return TRIDI[nome] || ''; };
  /** <img> do ícone 3D pronto para a lista. */
  Icons.tridiHtml = function (nome, classe) {
    const arquivo = TRIDI[nome];
    if (!arquivo) return '';
    return '<img class="' + (classe || 'v3-cat-3d') + '" src="/assets/turma/icones/' + arquivo +
      '.webp" alt="" loading="lazy" decoding="async" width="40" height="40">';
  };

  /** Ícone efetivo de uma categoria: o escolhido, ou o palpite, ou o padrão. */
  Icons.forCategory = function (cat) {
    if (!cat) return 'circle-ellipsis';
    if (cat.icon && DATA.lucide[cat.icon]) return cat.icon;
    return Icons.guessCategory(cat.name, cat.kind);
  };

  Icons.guessCategory = function (name, kind) {
    const n = U.norm(name);
    for (const [re, ic] of CAT_MATCH) if (re.test(n)) return ic;
    return kind === 'income' ? 'banknote' : 'circle-ellipsis';
  };

  /** <svg> Lucide que herda a cor do texto (ou a cor informada). */
  Icons.lucide = function (name, size, color) {
    const px = size || 16;
    const body = DATA.lucide[name] || DATA.lucide['circle-ellipsis'] || '';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', px);
    svg.setAttribute('height', px);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', color || 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('lucide-icon');
    svg.innerHTML = body;
    return svg;
  };
  Icons.has = (name) => !!DATA.lucide[name];

  /**
   * Selo redondo da categoria: ícone na cor da categoria sobre um
   * fundo tênue da mesma cor. Substitui o antigo ponto colorido —
   * a forma passa a distinguir, não só a cor.
   */
  Icons.categoryBadge = function (categoryId, size) {
    const cat = Calc.categoryById(categoryId);
    const color = cat ? cat.color : '#9AA0AC';
    const px = size || 26;
    const wrap = U.el('span', {
      class: 'cat-badge',
      style: {
        width: px + 'px', height: px + 'px',
        background: 'color-mix(in srgb, ' + color + ' 18%, transparent)',
        color: color
      },
      title: cat ? cat.name : 'Sem categoria'
    });
    wrap.appendChild(Icons.lucide(Icons.forCategory(cat), Math.round(px * 0.58)));
    return wrap;
  };

  /* ============================================================
     3 · MEIO DE PAGAMENTO (débito × crédito)
     ============================================================ */

  Icons.METHOD = {
    account: { icon: 'landmark', label: 'Débito', full: 'Débito — sai da conta' },
    card: { icon: 'credit-card', label: 'Crédito', full: 'Crédito — entra na fatura' }
  };

  /** Selo "Débito"/"Crédito" com ícone — nunca só cor. */
  Icons.methodBadge = function (method, extraText) {
    const m = Icons.METHOD[method === 'card' ? 'card' : 'account'];
    const badge = U.el('span', {
      class: 'badge badge-method badge-' + (method === 'card' ? 'credito' : 'debito'),
      title: m.full
    });
    badge.appendChild(Icons.lucide(m.icon, 12));
    badge.appendChild(document.createTextNode(extraText || m.label));
    return badge;
  };

  /* Marca oficial do kit V2.1; não há desenho alternativo em JavaScript. */
  Icons.oaze = function (px, variante) {
    const lado = px || 24;
    const img = document.createElement('img');
    img.src = variante === 'mono'
      ? '/assets/brand/oaze-isologo-mono-milk.svg'
      : '/assets/brand/oaze-isologo.svg';
    img.width = lado;
    img.height = lado;
    img.alt = '';
    /* Decorativa por padrão: a marca quase sempre acompanha a
       palavra "OAZE" ou vive num botão que já tem aria-label.
       Anunciá-la de novo faria o leitor de tela dizer "OAZE OAZE". */
    img.setAttribute('aria-hidden', 'true');
    img.setAttribute('decoding', 'async');
    img.style.display = 'block';
    return img;
  };

  /** Pinta todo elemento com data-oaze-mark. Chamado no boot. */
  Icons.pintarMarcas = function (raiz) {
    const alvos = (raiz || document).querySelectorAll('[data-oaze-mark]');
    Array.prototype.forEach.call(alvos, (n) => {
      if (n.firstElementChild) return;          // já pintado
      n.appendChild(Icons.oaze(+n.dataset.oazeMark || 24, n.dataset.oazeVariante));
    });
  };

  Icons.available = () => Object.keys(DATA.lucide).length > 0;

  global.Icons = Icons;
})(window);
