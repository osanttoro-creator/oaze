/* PDF local do Estado do OAZE. Dados financeiros não saem do aparelho. */
(function (global) {
  'use strict';
  let loader;
  function library() {
    if (global.jspdf?.jsPDF) return Promise.resolve(global.jspdf.jsPDF);
    if (!loader) loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/jspdf/jspdf.umd.min.js';
      script.onload = () => global.jspdf?.jsPDF ? resolve(global.jspdf.jsPDF) : reject(new Error('Gerador PDF indisponível.'));
      script.onerror = () => reject(new Error('Não foi possível carregar o gerador PDF.'));
      document.head.appendChild(script);
    }).catch((error) => { loader = null; throw error; });
    return loader;
  }
  function base64(bytes) {
    let value = '';
    const chunk = 16384;
    for (let i = 0; i < bytes.length; i += chunk) value += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(value);
  }
  async function font(doc, file, family) {
    const response = await fetch('/assets/fonts/' + file);
    if (!response.ok) throw new Error('Fonte indisponível.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    doc.addFileToVFS(file, base64(bytes));
    doc.addFont(file, family, 'normal');
  }
  async function png(path) {
    return new Promise((resolve, reject) => {
      const picture = new Image();
      picture.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = picture.naturalWidth;
        canvas.height = picture.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) { reject(new Error('Imagem indisponível.')); return; }
        context.drawImage(picture, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      picture.onerror = () => reject(new Error('Imagem indisponível.'));
      picture.src = path;
    });
  }
  const money = (number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
  async function generate(report) {
    const PDF = await library();
    const doc = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    let bodyFont = 'helvetica', displayFont = 'helvetica';
    try {
      await font(doc, 'InstrumentSans-Regular.ttf', 'Instrument'); bodyFont = 'Instrument';
      await font(doc, 'Unbounded-Regular.ttf', 'Unbounded'); displayFont = 'Unbounded';
    } catch { /* PDF continua utilizável sem fontes locais. */ }
    const dark = [13, 24, 33], milk = [240, 229, 207], teal = [95, 169, 155], blue = [53, 85, 101];
    const background = (page) => {
      doc.setFillColor(...dark); doc.rect(0, 0, 210, 297, 'F');
      doc.setDrawColor(...blue); doc.setLineWidth(.3); doc.line(18, 272, 192, 272);
      doc.setFont(bodyFont, 'normal'); doc.setFontSize(9); doc.setTextColor(...milk);
      doc.text('OAZE  /  ESTADO DO SEU DINHEIRO', 18, 281);
      doc.text(String(page).padStart(2, '0'), 191, 281, { align: 'right' });
    };
    background(1);
    try {
      const logo = await png('/assets/brand/oaze-logo-mono-milk.svg');
      doc.addImage(logo, 'PNG', 18, 18, 49, 18);
    } catch { doc.setFont(displayFont, 'normal'); doc.setFontSize(22); doc.setTextColor(...milk); doc.text('OAZE', 18, 32); }
    try {
      const coco = await png('/assets/coco/corpo-neutra_acolhedora.webp');
      doc.addImage(coco, 'PNG', 119, 28, 72, 27);
    } catch { /* A falha de uma imagem não impede o acesso aos dados. */ }
    doc.setFont(displayFont, 'normal'); doc.setFontSize(25); doc.setTextColor(...milk);
    doc.text('Estado do OAZE', 18, 73);
    doc.setFont(bodyFont, 'normal'); doc.setFontSize(11); doc.setTextColor(...teal);
    doc.text(report.periodTitle, 18, 84);
    doc.setTextColor(...milk); doc.setFontSize(10);
    doc.text('Titular: ' + report.owner, 18, 103);
    doc.text('Espaço: ' + report.profile, 18, 110);
    doc.text('Período: ' + report.from + ' a ' + report.to, 18, 117);
    doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 18, 124);
    const metric = (label, value, y, tint) => {
      doc.setFillColor(20, 40, 51); doc.roundedRect(18, y, 174, 30, 5, 5, 'F');
      doc.setTextColor(...tint); doc.setFont(bodyFont, 'normal'); doc.setFontSize(10); doc.text(label, 25, y + 10);
      doc.setTextColor(...milk); doc.setFont(displayFont, 'normal'); doc.setFontSize(17); doc.text(money(value), 25, y + 23);
    };
    metric('RECEITAS CONFIRMADAS', report.income, 140, teal);
    metric('DESPESAS CONFIRMADAS', report.expense, 176, milk);
    metric('SALDO DO PERÍODO', report.income - report.expense, 212, teal);
    doc.setTextColor(...milk); doc.setFont(bodyFont, 'normal'); doc.setFontSize(9);
    doc.text('Valores baseados nos lançamentos confirmados deste espaço.', 18, 257);
    doc.addPage(); background(2);
    doc.setFont(displayFont, 'normal'); doc.setFontSize(19); doc.setTextColor(...milk);
    doc.text('Como foi o período', 18, 30);
    let y = 47;
    const space = (height) => {
      if (y + height <= 257) return;
      doc.addPage(); background(doc.getNumberOfPages()); y = 30;
    };
    const categorySection = (title, categories, empty) => {
      space(25);
      doc.setFont(bodyFont, 'normal'); doc.setFontSize(11); doc.setTextColor(...teal);
      doc.text(title, 18, y); y += 11;
      if (!categories.length) {
        doc.setTextColor(...milk); doc.setFontSize(10); doc.text(empty, 18, y); y += 12;
        return;
      }
      for (const category of categories) {
        space(14);
        doc.setTextColor(...milk); doc.setFont(bodyFont, 'normal'); doc.setFontSize(10);
        const name = doc.splitTextToSize(String(category.name), 118)[0] || 'Sem categoria';
        doc.text(name, 18, y);
        doc.text(money(category.value), 191, y, { align: 'right' });
        doc.setDrawColor(...blue); doc.line(18, y + 3, 192, y + 3); y += 13;
      }
      y += 5;
    };
    categorySection('DESPESAS POR CATEGORIA', report.categories || [], 'Sem despesas confirmadas neste período.');
    categorySection('RECEITAS POR CATEGORIA', report.incomeCategories || [], 'Sem receitas confirmadas neste período.');
    if (report.monthly?.length) {
      space(22); doc.setTextColor(...teal); doc.setFont(bodyFont, 'normal'); doc.setFontSize(11); doc.text('MÊS A MÊS', 18, y); y += 12;
      for (const month of report.monthly) {
        space(12);
        doc.setTextColor(...milk); doc.setFontSize(9);
        doc.text(month.label, 18, y);
        doc.text(money(month.income), 109, y, { align: 'right' });
        doc.text(money(month.expense), 191, y, { align: 'right' });
        y += 12;
      }
    }
    doc.setProperties({ title: 'Estado do OAZE — ' + report.periodTitle, author: 'OAZE', subject: 'Resumo financeiro pessoal' });
    const fileName = 'estado-oaze-' + report.from + '-' + report.to + '.pdf';
    if (global.OAZE_NATIVE_SAVE_PDF) {
      const bytes = new Uint8Array(doc.output('arraybuffer'));
      await global.OAZE_NATIVE_SAVE_PDF(fileName, base64(bytes));
    } else {
      doc.save(fileName);
    }
  }
  /* PROJEÇÕES EM PDF (01/11/2026): mesma identidade do Estado do OAZE. */
  async function projecao(dados) {
    const PDF = await library();
    const doc = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    let corpo = 'helvetica', titulo = 'helvetica';
    try { await font(doc, 'InstrumentSans-Regular.ttf', 'Instrument'); corpo = 'Instrument'; await font(doc, 'Unbounded-Regular.ttf', 'Unbounded'); titulo = 'Unbounded'; } catch { /* segue com a fonte padrão */ }
    const escuro = [13, 24, 33], leite = [240, 229, 207], verde = [95, 169, 155], azul = [53, 85, 101], vermelho = [238, 143, 114];
    const fundo = (pagina) => {
      doc.setFillColor(...escuro); doc.rect(0, 0, 210, 297, 'F');
      doc.setDrawColor(...azul); doc.setLineWidth(.3); doc.line(18, 272, 192, 272);
      doc.setFont(corpo, 'normal'); doc.setFontSize(9); doc.setTextColor(...leite);
      doc.text('OAZE  /  PROJEÇÕES', 18, 281); doc.text(String(pagina).padStart(2, '0'), 191, 281, { align: 'right' });
    };
    fundo(1);
    try { doc.addImage(await png('/assets/brand/oaze-logo-mono-milk.svg'), 'PNG', 18, 18, 49, 18); }
    catch { doc.setFont(titulo, 'normal'); doc.setFontSize(22); doc.setTextColor(...leite); doc.text('OAZE', 18, 32); }
    doc.setFont(titulo, 'normal'); doc.setFontSize(23); doc.setTextColor(...leite); doc.text('Projeções', 18, 62);
    doc.setFont(corpo, 'normal'); doc.setFontSize(11); doc.setTextColor(...verde); doc.text('Próximos ' + dados.meses + ' meses · ' + dados.perfil, 18, 72);
    doc.setTextColor(...leite); doc.setFontSize(9); doc.text('Gerado em ' + new Date().toLocaleString('pt-BR'), 18, 79);
    const caixa = (x, rotulo, valor) => { doc.setFillColor(20, 40, 51); doc.roundedRect(x, 88, 56, 24, 4, 4, 'F'); doc.setFontSize(8); doc.setTextColor(...verde); doc.text(rotulo, x + 5, 96); doc.setFont(titulo, 'normal'); doc.setFontSize(12); doc.setTextColor(...leite); doc.text(money(valor), x + 5, 106); doc.setFont(corpo, 'normal'); };
    caixa(18, 'SALDO HOJE', dados.inicial); caixa(77, 'GASTO VARIÁVEL/MÊS', dados.variavel); caixa(136, 'RENDA AVULSA/MÊS', dados.rendaVar || 0);
    doc.setFontSize(10); doc.setTextColor(...(dados.pior ? vermelho : verde));
    doc.text(dados.pior ? 'Pelo ritmo atual, o saldo fica negativo em ' + dados.pior + '.' : 'No ritmo atual, o saldo segue positivo no período.', 18, 124);
    let y = 138;
    doc.setFontSize(8); doc.setTextColor(...verde);
    doc.text('MÊS', 18, y); doc.text('ENTRA', 92, y, { align: 'right' }); doc.text('SAI', 128, y, { align: 'right' }); doc.text('SALDO PREVISTO', 191, y, { align: 'right' });
    y += 4; doc.setDrawColor(...azul); doc.line(18, y, 192, y); y += 8;
    const max = Math.max(1, ...dados.linhas.map((l) => Math.abs(l.saldo)));
    for (const l of dados.linhas) {
      if (y > 258) { doc.addPage(); fundo(doc.getNumberOfPages()); y = 30; }
      doc.setFontSize(10); doc.setTextColor(...leite);
      doc.text(l.mes, 18, y); doc.text(money(l.entra), 92, y, { align: 'right' }); doc.text(money(l.sai), 128, y, { align: 'right' });
      doc.setTextColor(...(l.saldo < 0 ? vermelho : leite)); doc.text(money(l.saldo), 191, y, { align: 'right' });
      doc.setFillColor(...(l.saldo < 0 ? vermelho : verde)); doc.rect(18, y + 2.5, Math.max(1, 174 * Math.abs(l.saldo) / max), 1.4, 'F');
      y += 13;
    }
    doc.setFontSize(8.5); doc.setTextColor(...leite);
    doc.text(doc.splitTextToSize('Estimativa, não promessa: saldo de hoje, mais o que já está lançado para frente (fixos, parcelas, receitas), mais a renda e menos o gasto variável médios dos últimos 3 meses. Compras novas no cartão e receitas não lançadas mudam o resultado.', 174), 18, Math.min(y + 4, 262));
    doc.setProperties({ title: 'Projeções — OAZE', author: 'OAZE', subject: 'Projeção de saldo' });
    const nome = 'oaze-projecoes-' + new Date().toISOString().slice(0, 10) + '.pdf';
    if (global.OAZE_NATIVE_SAVE_PDF) await global.OAZE_NATIVE_SAVE_PDF(nome, base64(new Uint8Array(doc.output('arraybuffer'))));
    else doc.save(nome);
  }
  global.OazeEstadoPDF = { generate, projecao };
})(window);
