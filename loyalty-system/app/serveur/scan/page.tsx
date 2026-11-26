import { redirect } from 'next/navigation';
import { getEmployee } from '@/lib/auth-guard';
import { ModernQrScanner } from '@/components/ModernQrScanner';

export default async function ScanPage() {
  const employee = await getEmployee('server');
  if (!employee) redirect('/serveur/login');

  const backHref = employee.role === 'admin' || employee.role === 'super_admin' ? '/admin' : '/serveur';

  return <ModernQrScanner backHref={backHref} storeName={employee.store_name} />;
}
