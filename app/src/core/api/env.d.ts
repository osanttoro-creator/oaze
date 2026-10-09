/// <reference types="vite/client" />

/*
  As únicas variáveis de ambiente que chegam ao cliente. `VITE_` é prefixo
  público: o Vite embute o valor no bundle, então nada aqui pode ser secreto.
  Chave de serviço, OpenAI, Stripe e Asaas ficam em Edge Function.
*/
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Marca o ambiente nos relatórios de erro. */
  readonly VITE_OAZE_ENV?: 'development' | 'staging' | 'production';
  readonly VITE_OAZE_SYNC_ENABLED?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
