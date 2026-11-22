import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { apiError, requireEmployeeUser } from '@/lib/api-guard';
import { getEmployees } from '@/lib/server-data';

export async function GET() {
  if (!(await requireEmployeeUser('admin'))) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  try {
    return NextResponse.json(await getEmployees());
  } catch (e: any) {
    return apiError(500, 'EMPLOYEES_ERROR', e.message);
  }
}

export async function POST(req: Request) {
  const admin = await requireEmployeeUser('admin');
  if (!admin) return apiError(401, 'UNAUTHORIZED', 'Non connecté');
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '');
  const role = body?.role === 'admin' ? 'admin' : 'server';
  const status = body?.status === 'disabled' ? 'disabled' : 'active';

  if (!name || !email || !password) {
    return apiError(400, 'INVALID_INPUT', 'Nom, email et mot de passe requis');
  }

  const adminClient = getAdminClient();

  // Création de l'utilisateur Supabase Auth (service_role)
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, status },
  });

  if (createErr || !created?.user?.id) {
    const msg = createErr?.message ?? 'Création utilisateur échouée';
    const isDup = /already|exists|duplicate/i.test(msg);
    return apiError(isDup ? 409 : 400, isDup ? 'EMAIL_EXISTS' : 'CREATE_USER_FAILED', msg);
  }

  const userId = created.user.id;

  // Insertion dans la table Employees
  const { error: empErr } = await adminClient
    .from('Employees')
    .insert({ id: userId, role, status, name, email });

  if (empErr) {
    // Rollback best-effort de l'utilisateur auth créé
    await adminClient.auth.admin.deleteUser(userId).catch(() => null);
    return apiError(400, 'CREATE_EMPLOYEE_FAILED', empErr.message);
  }

  // Audit log (best-effort)
  try {
    await adminClient.from('AuditLogs').insert({
      employee_id: admin.id,
      action: 'create_employee',
      entity_type: 'Employees',
      entity_id: userId,
      details: { email, role, status, creation_method: 'supabase_admin_api' },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ id: userId, name, email, role, status }, { status: 201 });
}