import { createHash } from 'crypto';
import { getAdminClient } from '@/lib/supabase';

/** Récupère la carte client via son hash de token (côté serveur Next.js avec getAdminClient pour garantir la lecture du Store). */
export async function fetchClientCard(token: string) {
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const adminClient = getAdminClient();
  const { data, error } = await adminClient.rpc('fn_get_client_card', { p_token_hash: tokenHash });
  if (error) {
    return { ok: false as const, error: { code: 'FETCH_FAILED', message: error.message } };
  }
  if (!data) {
    return { ok: false as const, error: { code: 'CARD_NOT_FOUND', message: 'Carte introuvable' } };
  }

  // Récupérer le store associé via adminClient pour traverser le RLS en toute sécurité
  let store = null;
  const { data: cardRow } = await adminClient
    .from('LoyaltyCards')
    .select('store_id, Stores(name, slug, logo_url)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (cardRow && (cardRow as any).Stores) {
    store = (cardRow as any).Stores;
  }

  return { ok: true as const, data: { ...data, store } };
}
