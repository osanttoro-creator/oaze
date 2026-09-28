# OAZE 2 — UI/UX

Status: **implementado** · fonte: kit V2.1 + mockups `Oaze App motion` · tokens em `app/src/styles/app.css`

## Tokens

| Token | Valor | Uso |
|---|---|---|
| `--night` | #0D1821 | fundo |
| `--surface` / `--surface-2` | #13232F / #1A2E3C | cartões, painéis |
| `--milk` | #F0E5CF | texto e botão primário (texto escuro) |
| `--teal` / `--in` | #5FA99B | receita, ativo, Coco |
| `--out` | #8FB0C0 | despesa |
| `--mineral` | #355565 | apoio |
| `--tangerine` | #E9875E | só na Coco (imagem), nunca em botão |

Contraste do kit: milk/night 14,4:1 · teal/night 6,5:1. Texto sobre teal é sempre night.

**Tipos:** Unbounded 400/500 (títulos em minúsculas, números grandes) · Instrument Sans (interface) · IBM Plex Mono (valores, datas, rótulos em caixa alta). Fontes locais, sem Google Fonts: funcionam offline e não vazam acesso.

**Raios:** 12 · 20 · 28 px; botões em pílula; carteira com o entalhe da onda.

## Regras de leitura

- Receita ▲ teal, despesa ▼ azul; débito e crédito escritos por extenso — nunca só cor.
- Previsto tem borda tracejada; só confirmado entra em total (e a tela diz isso).
- Olho esconde todos os valores do app de uma vez (`Money`).
- Números grandes encolhem com a tela (`clamp`) e nunca quebram linha.

## Componentes

`Wallet` (cartões no bolso, faixa de 34 px, cartão sai em 0,55 s) · `BankCard` (faixa e cartão inteiro: chip, NFC, número mascarado, titular, validade, bandeira) · `Wave` (resultado do mês dia a dia; real até hoje, previsto tracejado) · `Sheet` (folha no celular, janela no desktop) · `SidePanel` · `PinPad` · `Seg` · `Toggle` · `Money` · `CocoFace`/`CocoBody` (10 rostos e 10 corpos do kit em WebP).

## Coco

Rosto no botão e nas notas; corpo inteiro em telas de boas-vindas e vazias. Humor por contexto: feliz com pendências, calma sem pendências, pensando quando a meta sai do ritmo, curiosa ao sugerir categoria. Nunca culpa: "posso recalcular sem esconder o impacto".

## Movimento

| O quê | Como |
|---|---|
| entrada | cartões convergem no cartão COCO OAZE (4,4 s, loop) |
| cartão saindo da carteira | `top` 0,55 s `cubic-bezier(.2,.9,.2,1)` |
| folha e painel | 0,42 s / 0,38 s, mesma curva |
| Coco flutuante | sobe 5 px em 4 s |
| balão da Coco | pop com leve overshoot |

`prefers-reduced-motion`: tudo vira instantâneo e a animação de entrada some.

## Acessibilidade

Botões reais para toda ação (linha de Configurações incluída); `aria-label` nos ícones; `role=switch` nos interruptores; foco visível teal; `aria-live` no valor do teclado; diálogos com `aria-modal` e Esc.
