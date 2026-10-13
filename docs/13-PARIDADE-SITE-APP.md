# Paridade entre o site OAZE e o aplicativo — 13/10/2026

Fonte: `G:\Meu Drive\sites\OAZE\o site` e `app/src` deste repositório. O verificador do site passou nas 34 checagens locais em 13/10/2026. Esta comparação é de código e testes; não demonstra fluxos reais com contas e aparelhos.

| Capacidade | Site atual | App multiplataforma | Próxima validação |
| --- | --- | --- | --- |
| Finanças centrais, carteira, metas e investimentos | V3 ativa em `/app` | Telas e motor financeiro próprios | Fluxo com dados reais e aparelho novo |
| Agenda financeira | Ano, mês, semana e recorrências | Portada nesta etapa; vencimentos de fatura separados de despesas para evitar soma dupla | Teste visual em Android e Windows |
| Conta | Supabase Auth com dados em `public.dados` | Supabase Auth; importação explícita dos próprios dados legados | Login e importação autenticados |
| Sincronização | V3 usa `public.dados` | `oaze2_*` com fila offline e RLS; flag de sync desligada | Dois aparelhos, conflito e retorno do offline |
| Perfis compartilhados | Testes locais indicam convite e revogação | Sem fluxo equivalente encontrado em `app/src` | Desenhar autorização e portar sem ampliar acesso por engano |
| Idiomas | Português, inglês, espanhol e francês verificados | Interface em português | Portar catálogo e testar texto longo antes das lojas |
| Coco Realtime/voz | Fluxo e teste locais no site | Conversa de texto e análise; voz em tempo real não encontrada | Integrar backend e permissões de microfone com consentimento |
| Cobrança | Fluxo Stripe preparado no servidor | Tela Plano; checkout nativo ainda não validado | Definir regras de cada loja e validar pagamento real |
| OAZE Score | Existe na V3 | Cálculo e tela de relatórios existem, mas não foi verificada paridade de fórmula com a V3 | Comparar ambos com os mesmos dados |
| Builds | Navegador publicado | APK e desktop de teste anteriores à agenda; iOS compila sem assinatura | Regerar e instalar em aparelhos reais |

Ordem recomendada: validar conta/importação e sincronização antes de liberar dados financeiros entre aparelhos; em seguida fechar recursos que o site já oferece, testar nativos e só depois preparar submissão de loja. O mesmo projeto Supabase pode continuar, mantendo as tabelas `oaze2_*` separadas durante a migração.
