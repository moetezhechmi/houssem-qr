/** Fetch des données serveur via SQL (service_role) pour les pages Serveur/Admin/SuperAdmin. */
import { getAdminClient } from './supabase';

export const getDashboardStats = async (storeId?: string | null): Promise<any> => {
  const { data, error } = await getAdminClient().rpc('fn_dashboard_stats_by_store', { p_store_id: storeId ?? null });
  if (error) {
    // Fallback à l'ancienne RPC si migration pas encore exécutée
    const { data: legacy, error: errLegacy } = await getAdminClient().rpc('fn_dashboard_stats');
    if (errLegacy) throw new Error(`Dashboard : ${error.message}`);
    return legacy;
  }
  return data;
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
  let req = getAdminClient().from('Customers').select('*');
  if (storeId) req = req.eq('store_id', storeId);
  if (query) {
    req = req.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`);
  }
  const { data } = await req.order('created_at', { ascending: false }).limit(30);
  return data ?? [];
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
  let q = getAdminClient().from('Customers').select('*');
  if (storeId) q = q.eq('store_id', storeId);
  const { data } = await q.order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
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
