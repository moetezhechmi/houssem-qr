export default function AdminLoading() {
  return (
    <div className="shell shell--wide" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
      <div style={{ height: '28px', width: '220px', borderRadius: '8px', background: 'var(--crema-subtle)', marginBottom: '0.5rem' }} />
      <div style={{ height: '16px', width: '320px', maxWidth: '85%', borderRadius: '6px', background: 'var(--crema-subtle)', marginBottom: '1.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="ui-card" style={{ height: '100px', background: 'var(--crema-surface)', opacity: 0.7 }} />
        ))}
      </div>
      <div className="ui-card" style={{ height: '260px', background: 'var(--crema-surface)', opacity: 0.7 }} />
    </div>
  );
}
