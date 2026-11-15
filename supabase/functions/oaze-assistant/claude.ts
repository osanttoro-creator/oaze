/* =============================================================
   claude.ts — a conversa escrita da OAZE pelo Claude (Anthropic)
   -------------------------------------------------------------
   Decisão de 13/11/2026: o texto da OAZE (conversa, extratos,
   investimentos e personalização) passa a ser do Claude. A voz
   continua na OpenAI até outra decisão.

   Esta peça entra em uso quando o segredo ANTHROPIC_API_KEY existe
   no projeto. Sem ele, index.ts segue na OpenAI como antes, e nada
   quebra.

   Ela devolve um Response no MESMO formato que index.ts já lê da
   Responses API (output com function_call e output_text, usage com
   input_tokens e output_tokens). Assim a validação campo a campo das
   propostas, o registro de uso e o estorno de cota continuam sendo
   um código só para os dois provedores.

   MODELO
   Padrão: claude-opus-5-5. Troca-se pelo segredo OAZE_CLAUDE_MODEL
   (por exemplo claude-haiku-5-5, bem mais barato). O custo por
   conversa é decisão do produto, não deste arquivo.

   O QUE MUDA EM RELAÇÃO À OPENAI
   · não existe "forçar ferramenta" neste modelo: quando o pedido é
     claramente um registro, a instrução diz qual ferramenta usar;
   · o raciocínio é sempre ligado; a profundidade vai em effort "low",
     porque a resposta é curta e a pessoa está esperando;
   · se o classificador de segurança recusar, o próprio servidor da
     Anthropic tenta o modelo reserva (fallbacks: "default").
   ============================================================= */
import Anthropic from 'npm:@anthropic-ai/sdk';

export const MODELO_CLAUDE_PADRAO = 'claude-opus-5-5';

type FerramentaOpenAI = { type: string; name: string; description: string; strict?: boolean; parameters: Record<string, unknown> };

/* O esquema estrito do Claude não aceita limites numéricos nem de
   tamanho de texto, e pede "anyOf" para campo que pode ser nulo. Os
   limites continuam valendo: index.ts confere cada campo depois. */
function esquemaParaClaude(no: unknown): unknown {
  if (Array.isArray(no)) return no.map(esquemaParaClaude);
  if (!no || typeof no !== 'object') return no;
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(no as Record<string, unknown>)) {
    if (['maxLength', 'minLength', 'exclusiveMinimum', 'exclusiveMaximum', 'minimum', 'maximum'].includes(chave)) continue;
    saida[chave] = esquemaParaClaude(valor);
  }
  if (Array.isArray(saida.type)) {
    const { type, description, ...resto } = saida;
    return { ...(description ? { description } : {}), anyOf: (type as string[]).map((t) => t === 'null' ? { type: 'null' } : { type: t, ...resto }) };
  }
  return saida;
}

/* Fallback do servidor só existe nestes modelos; nos outros o campo é recusado. */
const comFallback = (modelo: string) => /^claude-(fable-5-[12]|opus-5(-5)?|sonnet-5-5)$/.test(modelo);

function resposta(status: number, corpo: unknown = {}) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });
}

export async function perguntarAoClaude(o: {
  chave: string; modelo: string; instrucoes: string; entrada: string;
  ferramentas: FerramentaOpenAI[]; ferramentaPedida: string | null;
  maxTokens: number; timeoutMs: number;
}): Promise<Response> {
  const client = new Anthropic({ apiKey: o.chave, maxRetries: 0, timeout: o.timeoutMs });
  const tools = o.ferramentas.map((f) => ({
    name: f.name, description: f.description, strict: true,
    input_schema: esquemaParaClaude(f.parameters) as Anthropic.Tool.InputSchema
  }));
  const pedido = {
    model: o.modelo,
    /* Raciocínio e resposta dividem este teto; o limite por plano
       continua sendo o tamanho pedido nas instruções. */
    max_tokens: 4096 + o.maxTokens,
    output_config: { effort: 'low' as const },
    /* As instruções são iguais entre pedidos do mesmo plano e idioma:
       ficam em cache. O que muda (dados e pergunta) vai na mensagem. */
    system: [{ type: 'text' as const, text: o.instrucoes, cache_control: { type: 'ephemeral' as const } }],
    tools,
    tool_choice: { type: 'auto' as const, disable_parallel_tool_use: true },
    messages: [{
      role: 'user' as const,
      content: o.entrada + (o.ferramentaPedida
        ? '\n\n[Instrução do OAZE: este pedido é um registro. Use a ferramenta ' + o.ferramentaPedida + '.]' : '')
    }]
  };

  try {
    const r = comFallback(o.modelo)
      ? await client.beta.messages.create({ ...pedido, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await client.messages.create(pedido);

    const output: unknown[] = [];
    const partes: string[] = [];
    for (const bloco of r.content) {
      if (bloco.type === 'text') partes.push(bloco.text);
      else if (bloco.type === 'tool_use') output.push({ type: 'function_call', name: bloco.name, arguments: JSON.stringify(bloco.input ?? {}) });
    }
    let texto = partes.join('\n').trim();
    if (r.stop_reason === 'refusal' && !texto && !output.length)
      texto = '@agente:oaze\nCom esse pedido eu não consigo ajudar. Posso olhar suas contas, faturas, metas ou investimentos com você.';
    if (texto) output.push({ type: 'message', content: [{ type: 'output_text', text: texto }] });
    return resposta(200, {
      output,
      usage: {
        input_tokens: (r.usage.input_tokens ?? 0) + (r.usage.cache_read_input_tokens ?? 0) + (r.usage.cache_creation_input_tokens ?? 0),
        output_tokens: r.usage.output_tokens ?? 0
      }
    });
  } catch (e) {
    /* Tempo esgotado e rede caem no mesmo tratamento que index.ts já
       dá à OpenAI (estorna a cota e responde 504). */
    if (e instanceof Anthropic.APIConnectionTimeoutError) { const t = new Error('timeout'); t.name = 'AbortError'; throw t; }
    if (e instanceof Anthropic.APIConnectionError) throw new Error('rede');
    if (e instanceof Anthropic.RateLimitError) return resposta(429);
    if (e instanceof Anthropic.APIError) return resposta(typeof e.status === 'number' ? e.status : 502);
    throw e;
  }
}
