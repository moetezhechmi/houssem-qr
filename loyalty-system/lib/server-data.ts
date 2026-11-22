/** Fetch des données serveur via SQL (service_role) pour les pages Serveur/Admin. */
import { getAdminClient } from './supabase';

export const getDashboardStats = async (): Promise<any> => {
  const { data, error } = await getAdminClient().rpc('fn_dashboard_stats');
  if (error) throw new Error(`Dashboard : ${error.message}`);
  return data;
};

export const getSearchCustomers = async (query = ''): Promise<any[]> => {
  const { data, error } = await getAdminClient().rpc('fn_search_customers', { p_query: query });
  if (error) throw new Error(`Recherche : ${error.message}`);
  return data ?? [];
};

export const getFiche = async (customerId: string): Promise<any> => {
  const { data, error } = await getAdminClient().rpc('fn_get_serveur_fiche', { p_customer_id: customerId });
  if (error) throw new Error(`Fiche client : ${error.message}`);
  return data;
};

export const getSettings = async (): Promise<any> => {
  const { data, error } = await getAdminClient()
    .from('ProgramSettings').select('required_consumptions, discount_percentage, card_validity_days, reward_validity_days')
    .eq('id', 1).single();
  if (error) throw new Error(`Paramètres : ${error.message}`);
  return data;
};

export const getEmployees = async (): Promise<any[]> => {
  const { data, error } = await getAdminClient().rpc('fn_get_employees');
  if (error) {
    // Fallback direct table
    const { data: raw } = await getAdminClient().from('Employees').select('*').order('created_at', { ascending: false });
    return raw ?? [];
  }
  return data ?? [];
};

export const getRecentOperations = async (limit = 25): Promise<any[]> => {
  const { data, error } = await getAdminClient().from('AuditLogs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Audit : ${error.message}`);
  return data ?? [];
};

export const getCorrections = async (limit = 25): Promise<any[]> => {
  const { data, error } = await getAdminClient().from('Corrections').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(`Corrections : ${error.message}`);
  return data ?? [];
};

export const getAllCustomers = async (limit = 100): Promise<any[]> => {
  const { data } = await getAdminClient().from('Customers').select('*').order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
};

export const getAllCards = async (limit = 100): Promise<any[]> => {
  const { data } = await getAdminClient()
    .from('LoyaltyCards')
    .select('id, card_number, customer_id, status, start_date, expiration_date, created_at, Customers(first_name, last_name, phone)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
};

export const getAllRewards = async (limit = 100): Promise<any[]> => {
  const { data } = await getAdminClient()
    .from('Rewards')
    .select('id, customer_id, discount_percentage, status, unlocked_at, expires_at, used_at, Customers(first_name, last_name, phone)')
    .order('unlocked_at', { ascending: false })
    .limit(limit);
  return data ?? [];
};

export const getShareLink = async (customerId: string): Promise<string | null> => {
  const { data } = await getAdminClient().from('LoyaltyCards').select('public_token')
    .eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1).single();
  return data?.public_token ? `/client/${data.public_token}` : null;
};
