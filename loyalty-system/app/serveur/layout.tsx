import { getEmployee } from '@/lib/auth-guard';
import { ServerAppBar } from '@/components/ServerAppBar';
import { QrScannerFab } from '@/components/QrScannerFab';

export default async function ServeurLayout({ children }: { children: React.ReactNode }) {
  const employee = await getEmployee('server');

  if (!employee) {
    return <>{children}</>;
  }

  return (
    <div className="has-bottom-nav" style={{ minHeight: '100dvh' }}>
      <ServerAppBar employee={employee} />
      {children}
      <QrScannerFab />
    </div>
  );
}
