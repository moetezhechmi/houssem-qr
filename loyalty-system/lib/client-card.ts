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

  // Récupérer le store associé si disponible
  let store = null;
  const { data: cardRow } = await getClient()
    .from('LoyaltyCards')
    .select('store_id, Stores(name, slug, logo_url)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (cardRow && (cardRow as any).Stores) {
    store = (cardRow as any).Stores;
  }

  return { ok: true as const, data: { ...data, store } };
}
