'use client';

import { useState } from 'react';

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
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
  const [isStorePickerOpen, setIsStorePickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingStoreId, setUpdatingStoreId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Formulaire nouveau store
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
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

  const toggleStoreStatus = async (store: Store) => {
    const newStatus = store.status === 'active' ? 'suspended' : 'active';
    const actionLabel = newStatus === 'active' ? 'activer' : 'suspendre';
    if (!confirm(`Voulez-vous vraiment ${actionLabel} le café "${store.name}" ?`)) return;

    setUpdatingStoreId(store.id);
    try {
      const res = await fetch(`/api/super-admin/stores/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour');

      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, status: newStatus } : s))
      );
      setMsg({
        text: `Statut du café "${store.name}" mis à jour : ${newStatus === 'active' ? 'Actif' : 'Abonnement suspendu'}`,
        ok: true,
      });
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setUpdatingStoreId(null);
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
          logo_url: logoUrl,
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
      setLogoUrl('');
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
    <div style={{ width: '100%' }}>
      {/* Alertes messages */}
      {msg && (
        <div
          style={{
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: '8px',
            background: msg.ok ? '#E8F5E9' : '#FFEBEE',
            color: msg.ok ? '#2E7D32' : '#C62828',
            fontWeight: 600,
            fontSize: '0.88rem',
            border: `1px solid ${msg.ok ? '#A5D6A7' : '#FFCDD2'}`,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* KPI Stats Grid Responsive */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7' }}>
          <div style={{ fontSize: '0.72rem', color: '#7E685A', textTransform: 'uppercase', fontWeight: 800 }}>Cafés & Stores</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3A2618', marginTop: '0.2rem' }}>
            {stores.length || stats?.total_stores || 0}
          </div>
        </div>

        <div style={{ padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7' }}>
          <div style={{ fontSize: '0.72rem', color: '#7E685A', textTransform: 'uppercase', fontWeight: 800 }}>Clients Globaux</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3A2618', marginTop: '0.2rem' }}>
            {stats?.total_customers || 0}
          </div>
        </div>

        <div style={{ padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7' }}>
          <div style={{ fontSize: '0.72rem', color: '#7E685A', textTransform: 'uppercase', fontWeight: 800 }}>Staff & Admins</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3A2618', marginTop: '0.2rem' }}>
            {employees.length || stats?.total_employees || 0}
          </div>
        </div>

        <div style={{ padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7' }}>
          <div style={{ fontSize: '0.72rem', color: '#7E685A', textTransform: 'uppercase', fontWeight: 800 }}>Transactions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3A2618', marginTop: '0.2rem' }}>
            {stats?.total_transactions || 0}
          </div>
        </div>
      </div>

      {/* Barre d'action & header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3A2618', margin: 0 }}>
            Établissements Partenaires
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#7E685A' }}>
            Gestion centralisée, activation d'abonnements et contrôle des accès.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsStorePickerOpen(true)}
            style={{
              background: '#fff',
              color: '#3A2618',
              border: '1.5px solid #8C4820',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🏪</span> Choisir la Vue Magasin
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: '#8C4820',
              color: '#fff',
              border: 'none',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(140,72,32,0.25)',
            }}
          >
            <span>＋</span> Ajouter un Café
          </button>
        </div>
      </div>

      {/* Stores List Cards (Mobile-friendly) & Table (Desktop) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {stores.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #EAD8C7', color: '#7E685A' }}>
            Aucun établissement configuré.
          </div>
        ) : (
          stores.map((s) => {
            const storeEmps = employees.filter((e) => e.store_id === s.id);
            const isSuspended = s.status === 'suspended';
            const isBusy = updatingStoreId === s.id;

            return (
              <div
                key={s.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: isSuspended ? '1px solid #FFCDD2' : '1px solid #EAD8C7',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  opacity: isSuspended ? 0.88 : 1,
                }}
              >
                <div style={{ minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: '1px solid #EAD8C7',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.25rem' }}>☕</span>
                    )}
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#3A2618' }}>
                      {s.name}
                    </span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: isSuspended ? '#FFEBEE' : '#E8F5E9',
                        color: isSuspended ? '#C62828' : '#2E7D32',
                      }}
                    >
                      {isSuspended ? '● Abonnement Désactivé' : '● Actif'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#7E685A', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>Slug: <code>{s.slug}</code></span>
                    <span>• {storeEmps.length} employé(s)</span>
                    {s.phone && <span>• 📞 {s.phone}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Bouton Toggle Activer / Désactiver Abonnement */}
                  <button
                    disabled={isBusy}
                    onClick={() => toggleStoreStatus(s)}
                    style={{
                      background: isSuspended ? '#E8F5E9' : '#FFF3E0',
                      color: isSuspended ? '#2E7D32' : '#C62828',
                      border: `1px solid ${isSuspended ? '#A5D6A7' : '#FFCDD2'}`,
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isBusy ? '...' : isSuspended ? '✓ Réactiver Abonnement' : '🚫 Désactiver Abonnement'}
                  </button>

                  {/* Accès à la console du café */}
                  <a
                    href={`/admin?store_id=${s.id}`}
                    style={{
                      background: '#FAF6F0',
                      color: '#8C4820',
                      border: '1px solid #8C4820',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Ouvrir Magasin →
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Choix du Magasin (Vue Magasin) */}
      {isStorePickerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#3A2618' }}>
                🏪 Choisir un établissement
              </h3>
              <button
                onClick={() => setIsStorePickerOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#7E685A', margin: '0 0 1rem' }}>
              Sélectionnez le magasin dont vous souhaitez ouvrir la vue d'administration et de gestion des clients :
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {stores.map((st) => (
                <a
                  key={st.id}
                  href={`/admin?store_id=${st.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #EAD8C7',
                    textDecoration: 'none',
                    color: '#3A2618',
                    fontWeight: 700,
                    background: '#FAF6F0',
                  }}
                >
                  <div>
                    <div>{st.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#7E685A', fontWeight: 400 }}>
                      Slug: {st.slug}
                    </div>
                  </div>
                  <span style={{ color: '#8C4820', fontSize: '0.85rem' }}>Ouvrir →</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout de Prestataire */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#3A2618' }}>
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
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.2rem' }}>
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Le Café de Flore"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.2rem' }}>
                  Slug URL unique *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: cafe-flore"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.2rem' }}>
                  Logo de l'établissement (URL de l'image)
                </label>
                <input
                  type="url"
                  placeholder="https://... ou /images/mon_logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.88rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#7E685A' }}>
                  Utilisé comme icône de raccourci Web App lors de l'installation et pour les notifications push.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.2rem' }}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    placeholder="+33..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#3A2618', marginBottom: '0.2rem' }}>
                    Adresse
                  </label>
                  <input
                    type="text"
                    placeholder="Ville, rue..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Création compte Admin Propriétaire */}
              <div style={{ background: '#FAF6F0', padding: '0.9rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #EAD8C7' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#8C4820', fontWeight: 800 }}>
                  👤 Compte Administrateur / Owner du café
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <input
                    type="text"
                    placeholder="Nom du gérant"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.85rem' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email de connexion *"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.85rem' }}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Mot de passe *"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CCC', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.55rem 0.9rem',
                    borderRadius: '6px',
                    border: '1px solid #CCC',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.55rem 1.15rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#8C4820',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Création...' : 'Créer l’établissement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
