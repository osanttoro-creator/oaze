# OAZE 2 — App Flow

Status: **implementado no web** · 28/09/2026

## Entrada

```
abrir o app
 ├─ sem nenhum dado neste aparelho → Boas-vindas
 │    ├─ há dados do OAZE 1 neste navegador → "Trazer meus dados do OAZE 1" → relatório → criar PIN
 │    ├─ "Começar"      → nome → primeira conta (ou pular) → criar PIN (2x)
 │    └─ "Ver exemplo"  → espaço de exemplo isolado → PIN opcional
 ├─ ?demo e aparelho vazio → exemplo direto (link do site)
 ├─ tem PIN e está travado → Bloqueio
 │    ├─ biometria ligada e disponível → Face ID / Touch ID / Windows Hello → PIN como alternativa
 │    └─ PIN (toque ou teclado físico); 5 erros → espera crescente (30 s … 15 min)
 └─ destravado → Início
```

Trava de novo: ao recarregar; depois de 0/1/5/15 min em segundo plano; no cadeado do desktop.

## Navegação

| Celular (< 900 px) | Desktop (≥ 900 px) |
|---|---|
| ilha: Início · Lançamentos · **+** · Carteira · Mais | barra lateral: Novo lançamento (N) · Início · Lançamentos · Carteira · grupo Mais |
| Coco flutuante com contador e balão (some em 7 s) | pílula "N coisas para ver" |
| Coco = folha de baixo | Coco = painel à direita |
| novo lançamento = folha com teclado próprio | janela com campo; Enter salva, Esc fecha |

Rota no hash (`#/carteira`): o voltar do Android e do navegador funcionam igual.

## Fluxos principais

**Lançar:** + → tipo → valor → descrição (Coco sugere categoria) → como pagou → cartão/conta em miniatura → parcelas (crédito) → já pago? → fixo? → Salvar → aviso com **Desfazer**.

**Confirmar previsto:** círculo na linha, ou "paguei/recebi" em Lembretes. Fixo confirma só a ocorrência do mês.

**Fatura:** Carteira → tocar no cartão (sai do bolso) → Pagar fatura (tudo) · Parcial · Limite → aviso com Desfazer. Setas navegam entre faturas.

**Coco · Agora:** até 4 itens, por urgência (fatura fechando > sem categoria > padrão repetido > meta fora do ritmo > orçamento). Aprovar executa e vira cartão "feito" com Desfazer; "Agora não" some e não volta.

**Coco · Conversa:** frase → rascunho (valor, categoria, cartão/conta de sempre naquele estabelecimento) → **Lançar** ou Descartar → mensagem "ação feita · desfazer".

**Coco · Memória:** regras e fatos com Esquecer; interruptor de aprendizado.

## Estados e exceções

| Situação | Comportamento |
|---|---|
| sem contas | carteira pede a primeira; novo lançamento aceita dinheiro |
| valor zero | "Digite um valor para salvar." |
| transferência para a mesma conta | recusada com aviso |
| PIN fraco (sequência, repetido) | recusado na criação |
| backup inválido | "Não consegui ler este arquivo. Seus dados anteriores continuam preservados." |
| backup do OAZE 1 com 5 espaços já ocupados | recusado com explicação; nada é substituído |
| app sai de foco | conteúdo desfocado (cortina) |
| armazenamento cheio / modo privado | segue em memória; perde ao fechar |
