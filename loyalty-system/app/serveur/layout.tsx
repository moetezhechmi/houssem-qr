import Link from 'next/link';
import { getEmployee } from '@/lib/auth-guard';
import { ServerAppBar } from '@/components/ServerAppBar';

export default async function ServeurLayout({ children }: { children: React.ReactNode }) {
  const employee = await getEmployee('server');

  if (!employee) {
    return <>{children}</>;
  }

  return (
    <div className="has-bottom-nav" style={{ minHeight: '100dvh' }}>
      <ServerAppBar employee={employee} />
      {children}

      {/* FAB Scan QR — visible pour baristas et admins */}
      <Link
        href="/serveur/scan"
        title="Scanner une carte fidélité"
        style={{
          position: 'fixed',
          bottom: '5.5rem',
          right: '1rem',
          zIndex: 95,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--espresso, #2C1A0E)',
          border: '2px solid var(--gold, #D4A054)',
          color: '#FAF8F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
          textDecoration: 'none',
        }}
      >
        📷
      </Link>
    </div>
  );
}
