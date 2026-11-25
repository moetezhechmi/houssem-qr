export default function ServeurLoading() {
  return (
    <div className="shell" style={{ paddingTop: '1.5rem', paddingBottom: '5rem' }}>
      <div className="ui-card" style={{ height: '150px', background: 'var(--espresso)', opacity: 0.85, marginBottom: '1.25rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="ui-card" style={{ height: '105px', background: 'var(--crema-surface)', opacity: 0.7 }} />
        ))}
      </div>
      <div className="ui-card" style={{ height: '160px', background: 'var(--crema-surface)', opacity: 0.7 }} />
    </div>
  );
}
