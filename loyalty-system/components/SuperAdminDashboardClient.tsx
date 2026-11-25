'use client';

import { useState } from 'react';

interface Store {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  address?: string | null;
  status: string;
  created_at: string;
}

interface Props {
  stats: any;
  initialStores: Store[];
  employees: any[];
}

export function SuperAdminDashboardClient({ stats, initialStores, employees }: Props) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Formulaire nouveau store
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(
        val
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/super-admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          phone,
          address,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création du store');
      }

      setMsg({
        text: `Café "${data.store.name}" créé avec succès ! ${
          data.adminUser ? `Admin (${data.adminUser.email}) configuré.` : ''
        }`,
        ok: true,
      });

      setStores([data.store, ...stores]);
      setName('');
      setSlug('');
      setPhone('');
      setAddress('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setIsModalOpen(false);
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Alertes messages */}
      {msg && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            background: msg.ok ? '#E8F5E9' : '#FFEBEE',
            color: msg.ok ? '#2E7D32' : '#C62828',
            fontWeight: 600,
            border: `1px solid ${msg.ok ? '#A5D6A7' : '#FFCDD2'}`,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7' }}>
          <div style={{ fontSize: '0.8rem', color: '#7E685A', textTransform: 'uppercase', fontWeight: 700 }}>Total Cafés / Stores</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3A2618', marginTop: '0.25rem' }}>
            {stores.length || stats?.total_stores || 0}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7' }}>
          <div style={{ fontSize: '0.8rem', color: '#7E685A', textTransform: 'uppercase', fontWeight: 700 }}>Total Clients Plateforme</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3A2618', marginTop: '0.25rem' }}>
            {stats?.total_customers || 0}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7' }}>
          <div style={{ fontSize: '0.8rem', color: '#7E685A', textTransform: 'uppercase', fontWeight: 700 }}>Serveurs & Admins</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3A2618', marginTop: '0.25rem' }}>
            {employees.length || stats?.total_employees || 0}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7' }}>
          <div style={{ fontSize: '0.8rem', color: '#7E685A', textTransform: 'uppercase', fontWeight: 700 }}>Total Transactions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3A2618', marginTop: '0.25rem' }}>
            {stats?.total_transactions || 0}
          </div>
        </div>
      </div>

      {/* Header section Stores */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3A2618', margin: 0 }}>
            Établissements & Prestataires Partenaires
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#7E685A' }}>
            Chaque café a son environnement autonome, ses propres serveurs et ses propres clients.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            background: '#8C4820',
            color: '#fff',
            border: 'none',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 6px rgba(140,72,32,0.25)',
          }}
        >
          <span>＋</span> Ajouter un Café / Prestataire
        </button>
      </div>

      {/* Table des Stores */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #EAD8C7',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#FAF6F0', borderBottom: '1px solid #EAD8C7', color: '#7E685A' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Nom du Café</th>
              <th style={{ padding: '0.85rem 1rem' }}>Identifiant / Slug</th>
              <th style={{ padding: '0.85rem 1rem' }}>Statut</th>
              <th style={{ padding: '0.85rem 1rem' }}>Serveurs & Admins</th>
              <th style={{ padding: '0.85rem 1rem' }}>Date d’ajout</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#7E685A' }}>
                  Aucun café enregistré pour le moment.
                </td>
              </tr>
            ) : (
              stores.map((s) => {
                const storeEmps = employees.filter((e) => e.store_id === s.id);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F2E8DC' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#3A2618' }}>
                      {s.name}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <code style={{ background: '#F2E8DC', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {s.slug}
                      </code>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: s.status === 'active' ? '#E8F5E9' : '#FFF3E0',
                          color: s.status === 'active' ? '#2E7D32' : '#E65100',
                        }}
                      >
                        {s.status === 'active' ? '● Actif' : s.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#555' }}>
                      {storeEmps.length} utilisateur(s)
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#7E685A' }}>
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <a
                        href={`/admin?store_id=${s.id}`}
                        style={{
                          fontSize: '0.78rem',
                          color: '#8C4820',
                          fontWeight: 700,
                          textDecoration: 'none',
                          padding: '0.3rem 0.6rem',
                          border: '1px solid #8C4820',
                          borderRadius: '6px',
                        }}
                      >
                        Gérer le café →
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'ajout de Prestataire */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '560px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#3A2618' }}>
                Nouveau Café / Prestataire Partenaire
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.25rem' }}>
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Le Café de Flore"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.25rem' }}>
                  Slug URL unique *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: cafe-flore"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#7E685A' }}>
                  Sera utilisé pour le lien et le QR menu du store.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.25rem' }}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    placeholder="+33..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.25rem' }}>
                    Adresse
                  </label>
                  <input
                    type="text"
                    placeholder="Ville, rue..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CCC' }}
                  />
                </div>
              </div>

              {/* Création compte Admin Propriétaire */}
              <div style={{ background: '#FAF6F0', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #EAD8C7' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#8C4820', fontWeight: 800 }}>
                  👤 Compte Administrateur / Owner du café
                </h4>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#7E685A' }}>
                  Ces identifiants permettront au propriétaire d'ajouter ses propres serveurs et gérer son programme.
                </p>

                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Nom complet du gérant"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CCC', marginBottom: '0.5rem' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email de connexion du gérant *"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CCC', marginBottom: '0.5rem' }}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Mot de passe temporaire *"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CCC' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #CCC',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#8C4820',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Création en cours...' : 'Créer l’établissement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
