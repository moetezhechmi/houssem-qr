import { getEmployee } from '@/lib/auth-guard';
import { ServerAppBar } from '@/components/ServerAppBar';
import { QrScannerFab } from '@/components/QrScannerFab';

export default async function ServeurLayout({ children }: { children: React.ReactNode }) {
  const employee = await getEmployee('server');

  if (!employee) {
    return <>{children}</>;
  }

  // Ne pas afficher le bouton flottant caméra pour les administrateurs
  const isServerOnly = employee.role === 'server';

  return (
    <div className="has-bottom-nav" style={{ minHeight: '100dvh' }}>
      <ServerAppBar employee={employee} />
      {children}
      {isServerOnly && <QrScannerFab />}
    </div>
  );
}
