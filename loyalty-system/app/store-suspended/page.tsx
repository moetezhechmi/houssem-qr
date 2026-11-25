export default function StoreSuspendedPage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAF6F0',
        padding: '1.5rem',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          background: '#fff',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid #EAD8C7',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#FFF3E0',
            color: '#E65100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.5rem',
          }}
        >
          🔒
        </div>

        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#3A2618',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          Abonnement désactivé
        </h1>

        <p
          style={{
            fontSize: '0.92rem',
            color: '#7E685A',
            lineHeight: 1.55,
            marginBottom: '1.75rem',
          }}
        >
          L'accès pour cet établissement est actuellement suspendu. Votre abonnement est désactivé ou arrivé à échéance.
          <br /><br />
          Veuillez contacter le support ou l'administrateur de la plateforme pour régulariser votre compte.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #EAD8C7',
                background: '#FAF6F0',
                color: '#3A2618',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
