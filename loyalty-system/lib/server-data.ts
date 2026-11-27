/** Fetch des données serveur via SQL (service_role) pour les pages Serveur/Admin/SuperAdmin. */
import { getAdminClient } from './supabase';

export const getDashboardStats = async (storeId?: string | null): Promise<any> => {
  const admin = getAdminClient();
  const nowIso = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const scope = (q: any) => (storeId ? q.eq('store_id', storeId) : q);

  const [
    totalCustomersRes,
    activeCardsRes,
    explicitExpiredCardsRes,
    staleActiveCardsRes,
    availableRewardsRes,
    usedRewardsRes,
    todayTxRes,
    unlockedMonthRes,
  ] = await Promise.all([
    scope(admin.from('Customers').select('*', { count: 'exact', head: true })),
    scope(admin.from('LoyaltyCards').select('*', { count: 'exact', head: true }).eq('status', 'active').gt('expiration_date', nowIso)),
    scope(admin.from('LoyaltyCards').select('*', { count: 'exact', head: true }).eq('status', 'expired')),
    scope(admin.from('LoyaltyCards').select('*', { count: 'exact', head: true }).eq('status', 'active').lte('expiration_date', nowIso)),
    scope(admin.from('Rewards').select('*', { count: 'exact', head: true }).eq('status', 'available').gt('expires_at', nowIso)),
    scope(admin.from('Rewards').select('*', { count: 'exact', head: true }).eq('status', 'used')),
    scope(admin.from('ConsumptionTransactions').select('*', { count: 'exact', head: true }).eq('status', 'recorded').gte('created_at', todayStart.toISOString())),
    scope(admin.from('Rewards').select('*', { count: 'exact', head: true }).gte('unlocked_at', monthStart.toISOString())),
  ]);

  const totalClients = totalCustomersRes.count ?? 0;
  const activeCards = activeCardsRes.count ?? 0;
  const expiredCards = (explicitExpiredCardsRes.count ?? 0) + (staleActiveCardsRes.count ?? 0);
  const pendingRewards = availableRewardsRes.count ?? 0;
  const usedRewards = usedRewardsRes.count ?? 0;

  return {
    total_clients: totalClients,
    total_customers: totalClients,
    active_cards: activeCards,
    expired_cards: expiredCards,
    pending_rewards: pendingRewards,
    available_rewards: pendingRewards,
    used_rewards: usedRewards,
    today_transactions: todayTxRes.count ?? 0,
    unlocked_rewards_this_month: unlockedMonthRes.count ?? 0,
  };
};

export const getSuperAdminStats = async (): Promise<any> => {
  const { data, error } = await getAdminClient().rpc('fn_super_admin_stats');
  if (error) {
    // Calcul de secours côté app
    const [stores, emps, custs, txs] = await Promise.all([
      getAdminClient().from('Stores').select('*', { count: 'exact', head: true }),
      getAdminClient().from('Employees').select('*', { count: 'exact', head: true }),
      getAdminClient().from('Customers').select('*', { count: 'exact', head: true }),
      getAdminClient().from('ConsumptionTransactions').select('*', { count: 'exact', head: true }),
    ]);
    return {
      total_stores: stores.count ?? 0,
      active_stores: stores.count ?? 0,
      total_employees: emps.count ?? 0,
      total_customers: custs.count ?? 0,
      total_transactions: txs.count ?? 0,
      total_rewards_given: 0,
    };
  }
  return data;
};

export const getAllStores = async (): Promise<any[]> => {
  const { data, error } = await getAdminClient()
    .from('Stores')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
};

export const getSearchCustomers = async (query = '', storeId?: string | null): Promise<any[]> => {
  const admin = getAdminClient();
  const trimmed = query.trim();

  // Si la recherche ressemble à un numéro de carte (ou correspond à une carte), récupérer aussi ces customer_id
  let cardMatchedCustomerIds: string[] = [];
  if (trimmed) {
    let cardSearch = admin
      .from('LoyaltyCards')
      .select('customer_id')
      .ilike('card_number', `%${trimmed}%`)
      .limit(20);
    if (storeId) cardSearch = cardSearch.eq('store_id', storeId);
    const { data: matchedCards } = await cardSearch;
    cardMatchedCustomerIds = (matchedCards ?? []).map((c: any) => c.customer_id).filter(Boolean);
  }

  let req = admin.from('Customers').select('*');
  if (storeId) req = req.eq('store_id', storeId);
  if (trimmed) {
    const orParts = [
      `first_name.ilike.%${trimmed}%`,
      `last_name.ilike.%${trimmed}%`,
      `phone.ilike.%${trimmed}%`,
    ];
    if (cardMatchedCustomerIds.length > 0) {
      orParts.push(`id.in.(${cardMatchedCustomerIds.join(',')})`);
    }
    req = req.or(orParts.join(','));
  }

  const { data: customers } = await req.order('created_at', { ascending: false }).limit(50);
  if (!customers || customers.length === 0) return [];

  // Charger les cartes de ces clients pour déterminer has_active_card et card_number
  const customerIds = customers.map((c: any) => c.id);
  const { data: cards } = await admin
    .from('LoyaltyCards')
    .select('customer_id, card_number, status, expiration_date, created_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false });

  const nowMs = Date.now();
  const cardByCustomer = new Map<string, { has_active_card: boolean; card_number?: string }>();

  for (const card of cards ?? []) {
    const isCardActive = card.status === 'active' && new Date(card.expiration_date).getTime() > nowMs;
    const prev = cardByCustomer.get(card.customer_id);
    if (!prev) {
      cardByCustomer.set(card.customer_id, {
        has_active_card: isCardActive,
        card_number: card.card_number,
      });
    } else if (!prev.has_active_card && isCardActive) {
      cardByCustomer.set(card.customer_id, {
        has_active_card: true,
        card_number: card.card_number,
      });
    }
  }

  return customers.map((c: any) => {
    const info = cardByCustomer.get(c.id);
    return {
      ...c,
      has_active_card: info?.has_active_card ?? false,
      card_number: info?.card_number ?? undefined,
    };
  });
};

export const getFiche = async (customerId: string): Promise<any> => {
  const { data, error } = await getAdminClient().rpc('fn_get_serveur_fiche', { p_customer_id: customerId });
  if (error) throw new Error(`Fiche client : ${error.message}`);
  return data;
};

export const getShareLink = async (customerId: string): Promise<string | null> => {
  const { data } = await getAdminClient()
    .from('LoyaltyCards')
    .select('public_token')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.public_token) return null;
  return `${process.env.NEXT_PUBLIC_APP_URL || ''}/client/${data.public_token}`;
};

export const getSettings = async (storeId?: string | null): Promise<any> => {
  let query = getAdminClient()
    .from('ProgramSettings')
    .select('required_consumptions, discount_percentage, card_validity_days, reward_validity_days, store_id');

  if (storeId) {
    query = query.eq('store_id', storeId);
  } else {
    query = query.limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (!data) {
    return {
      required_consumptions: 9,
      discount_percentage: 30,
      card_validity_days: 30,
      reward_validity_days: 7,
    };
  }
  return data;
};

export const getEmployees = async (storeId?: string | null): Promise<any[]> => {
  const { data, error } = await getAdminClient().rpc('fn_get_employees_by_store', { p_store_id: storeId ?? null });
  if (error) {
    // Fallback direct table
    let q = getAdminClient().from('Employees').select('*');
    if (storeId) q = q.eq('store_id', storeId);
    const { data: raw } = await q.order('created_at', { ascending: false });
    return raw ?? [];
  }
  return data ?? [];
};

export const getRecentOperations = async (limit = 25, storeId?: string | null): Promise<any[]> => {
  let q = getAdminClient().from('AuditLogs').select('*');
  if (storeId) q = q.eq('store_id', storeId);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return data ?? [];
};

export const getCorrections = async (limit = 25, storeId?: string | null): Promise<any[]> => {
  let q = getAdminClient().from('Corrections').select('*');
  if (storeId) q = q.eq('store_id', storeId);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return data ?? [];
};

export const getAllCustomers = async (limit = 100, storeId?: string | null): Promise<any[]> => {
  const admin = getAdminClient();
  let q = admin.from('Customers').select('*');
  if (storeId) q = q.eq('store_id', storeId);
  const { data: customers } = await q.order('created_at', { ascending: false }).limit(limit);
  if (!customers || customers.length === 0) return [];

  const customerIds = customers.map((c: any) => c.id);
  const { data: cards } = await admin
    .from('LoyaltyCards')
    .select('customer_id, card_number, status, expiration_date, created_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false });

  const nowMs = Date.now();
  const cardByCustomer = new Map<string, { has_active_card: boolean; card_number?: string }>();
  for (const card of cards ?? []) {
    const isCardActive = card.status === 'active' && new Date(card.expiration_date).getTime() > nowMs;
    const prev = cardByCustomer.get(card.customer_id);
    if (!prev || (!prev.has_active_card && isCardActive)) {
      cardByCustomer.set(card.customer_id, {
        has_active_card: isCardActive,
        card_number: card.card_number,
      });
    }
  }

  return customers.map((c: any) => {
    const info = cardByCustomer.get(c.id);
    return {
      ...c,
      has_active_card: info?.has_active_card ?? false,
      card_number: info?.card_number ?? undefined,
    };
  });
};

export const getAllCards = async (limit = 100, storeId?: string | null): Promise<any[]> => {
  let q = getAdminClient()
    .from('LoyaltyCards')
    .select('id, card_number, customer_id, store_id, status, start_date, expiration_date, created_at, Customers(first_name, last_name, phone)');
  if (storeId) q = q.eq('store_id', storeId);
  const { data } = await q.order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
};

export const getAllRewards = async (limit = 100, storeId?: string | null): Promise<any[]> => {
  let q = getAdminClient()
    .from('Rewards')
    .select('id, customer_id, store_id, discount_percentage, status, unlocked_at, expires_at, used_at, Customers(first_name, last_name, phone)');
  if (storeId) q = q.eq('store_id', storeId);
  const { data } = await q.order('unlocked_at', { ascending: false }).limit(limit);
  return data ?? [];
};
