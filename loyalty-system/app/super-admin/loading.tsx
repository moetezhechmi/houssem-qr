export default function SuperAdminLoading() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--crema-bg)' }}>
      <div style={{ height: '64px', background: 'var(--espresso)' }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ui-card" style={{ height: '90px', background: 'var(--crema-surface)', opacity: 0.7 }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="ui-card" style={{ height: '84px', background: 'var(--crema-surface)', opacity: 0.7 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
