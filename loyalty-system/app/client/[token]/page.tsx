import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getEmployee } from '@/lib/auth-guard';
import { fetchClientCard } from '@/lib/client-card';
import ClientCard from '@/components/ClientCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const res = await fetchClientCard(token);
  const store = res.ok && res.data ? (res.data as any).store : null;

  const appName = store?.name || 'Bieny Coffeeshop';
  const logo = store?.logo_url || '/logo_houssem.jpeg';
  const manifestUrl = store?.slug ? `/api/manifest?store=${store.slug}` : '/manifest.webmanifest';

  return {
    title: `Fidélité — ${appName}`,
    description: `Votre carte de fidélité ${appName}`,
    manifest: manifestUrl,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: appName,
      startupImage: [logo],
    },
    icons: {
      icon: [
        { url: logo, sizes: '192x192' },
        { url: logo, sizes: '512x512' },
      ],
      apple: [
        { url: logo, sizes: '180x180' },
      ],
      shortcut: [logo],
    },
  };
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ scan?: string; view_as?: string }>;
}) {
  const { token } = await params;
  const { scan, view_as } = (await searchParams) ?? {};

  const res = await fetchClientCard(token);
  const card = res.ok && res.data ? res.data : null;

  if (!card) {
    return (
      <main className="app">
        <div className="shell" style={{ paddingTop: '4rem', textAlign: 'center' }}>
          <div className="ui-card" style={{ padding: '3rem 1.5rem', maxWidth: 420, margin: '0 auto' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>☕</div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--espresso)',
                margin: '0 0 0.5rem',
              }}
            >
              Carte introuvable
            </h1>
            <p style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Le lien personnel de fidélité semble invalide, désactivé ou a expiré.
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--coffee-mid)', margin: '0 0 1.5rem' }}>
              Demandez à votre barista Bieny de vous transmettre un nouveau lien.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Redirection UNIQUEMENT lors du scan du QR code (paramètre ?scan=1) ──
  // Si le QR code est scanné en caisse, rediriger vers la fiche de gestion du client.
  // Si le lien est ouvert directement dans le navigateur (ex: le client qui consulte sa carte ou l'admin qui teste),
  // AUCUNE redirection n'est effectuée : la carte s'affiche normalement.
  if ((scan === '1' || scan === 'true') && view_as !== 'client') {
    const employee = await getEmployee('server');
    if (employee && card.customer?.id) {
      redirect(`/serveur/customers/${card.customer.id}`);
    } else if (card.customer?.id) {
      // Si l'employé n'est pas encore connecté sur ce téléphone, renvoyer vers la connexion
      // avec redirection automatique vers la fiche une fois connecté
      redirect(`/serveur/login?redirect=${encodeURIComponent(`/serveur/customers/${card.customer.id}`)}`);
    }
  }

  return (
    <main className="app">
      <ClientCard token={token} initialData={card} />
    </main>
  );
}
