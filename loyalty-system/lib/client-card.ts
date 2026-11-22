import { createHash } from 'crypto';
import { getClient } from '@/lib/supabase';

/** Récupère la carte client via son hash de token (lecture seule publique via Supabase RPC). */
export async function fetchClientCard(token: string) {
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const { data, error } = await getClient().rpc('fn_get_client_card', { p_token_hash: tokenHash });
  if (error) {
    return { ok: false as const, error: { code: 'FETCH_FAILED', message: error.message } };
  }
  if (!data) {
    return { ok: false as const, error: { code: 'CARD_NOT_FOUND', message: 'Carte introuvable' } };
  }
  return { ok: true as const, data };
}
