import { migrateV1, type MigrationResult } from '../domain/migrate-v1';
import { api } from './api/client';
import { authState } from './auth';

/** Lê apenas os dados da própria conta via RLS; nenhuma escrita no OAZE 1. */
export async function previewLegacyCloud(): Promise<MigrationResult | null> {
  const user = authState().user;
  const client = await api();
  if (!user || !client) return null;
  const { data, error } = await client
    .from('dados')
    .select('profiles')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error('Não consegui consultar os dados da sua conta OAZE.');
  return migrateLegacyCloudProfiles(data?.profiles, authState().name);
}

export function migrateLegacyCloudProfiles(profiles: unknown, ownerName: string): MigrationResult | null {
  if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) return null;
  return migrateV1({
    version: 1,
    ownerName,
    profiles: Object.values(profiles),
  });
}
