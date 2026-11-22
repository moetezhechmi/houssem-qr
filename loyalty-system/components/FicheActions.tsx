'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CoffeeIcon,
  GiftIcon,
  RefreshCwIcon,
  ShareIcon,
  CopyIcon,
  HistoryIcon,
  CheckIcon,
} from './Icons';

interface Fiche {
  customer: { id: string; first_name: string; last_name: string; phone: string };
  card: { id: string; card_number: string; status: string; expiration_date: string } | null;
  active_cycle: { current_consumptions: number; required_consumptions: number } | null;
  rewards: Array<{ id: string; status: string; discount_percentage: number; unlocked_at: string; expires_at: string }>;
  history: Array<{ id: string; created_at: string; transaction_reference: string; status: string }>;
  can_add_consumption: boolean;
}

async function callApi(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: `${json?.code ?? res.status} — ${json?.message ?? res.statusText}` };
  }
  return { ok: true, data: json };
}

export function FicheActions({
  fiche,
  shareLink,
}: {
  fiche: Fiche;
  shareLink: string | null;
  accessToken?: string | null;
}) {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmModal, setConfirmModal] = useState<'consumption' | 'reward' | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (shareLink && typeof window !== 'undefined') {
      setQrUrl(`${window.location.origin}${shareLink}`);
    }
  }, [shareLink]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const executeAction = async (actionId: string, path: string, body: Record<string, unknown>, okMsg: string) => {
    if (busyAction) return;
    setBusyAction(actionId);
    setConfirmModal(null);
    try {
      const r = await callApi(path, body);
      if (r.ok) {
        showToast(okMsg, 'success');
        router.refresh();
      } else {
        showToast(r.error ?? 'Erreur lors de l’opération', 'error');
      }
    } catch (e: any) {
      showToast(`Erreur réseau : ${e.message}`, 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const cardId = fiche.card?.id;
  const isCardActive = fiche.card?.status === 'active';
  const availableReward = fiche.rewards.find(
    (r) => r.status === 'available' && new Date(r.expires_at).getTime() > Date.now()
  );

  const getFullShareLink = () => {
    if (!shareLink) return '';
    return typeof window !== 'undefined' ? `${window.location.origin}${shareLink}` : shareLink;
  };

  const handleShare = async () => {
    const full = getFullShareLink();
    if (!full) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Bieny Coffeeshop — Carte de ${fiche.customer.first_name}`,
          text: `Consultez votre carte de fidélité Bieny et vos récompenses :`,
          url: full,
        });
        showToast('Partage réussi !');
        return;
      } catch (err: any) {
        // Fallback to copy if user canceled share
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback clipboard
    await navigator.clipboard.writeText(full);
    setCopied(true);
    showToast('🔗 Lien personnel copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopy = async () => {
    const full = getFullShareLink();
    if (!full) return;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    showToast('🔗 Lien client copié !');
    setTimeout(() => setCopied(false), 2500);
  };

  const scrollToHistory = () => {
    const el = document.getElementById('history-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 150,
            maxWidth: 'calc(100vw - 2rem)',
            background: toast.type === 'error' ? 'var(--coral)' : 'var(--espresso)',
            color: '#FAF9F6',
            padding: '0.85rem 1.4rem',
            borderRadius: '16px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            animation: 'toastPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '1.75rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>
              {confirmModal === 'consumption' ? '☕' : '🎉'}
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--espresso)',
                margin: '0 0 0.5rem',
              }}
            >
              {confirmModal === 'consumption'
                ? 'Valider 1 Consommation ?'
                : 'Utiliser la Récompense de 30% ?'}
            </h3>

            <p style={{ fontSize: '0.86rem', color: 'var(--coffee-mid)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              {confirmModal === 'consumption' ? (
                <>
                  Ajouter 1 tampon sur la carte de <strong>{fiche.customer.first_name} {fiche.customer.last_name}</strong> (Carte {fiche.card?.card_number}) ?
                </>
              ) : (
                <>
                  Appliquer la remise immédiate de <strong>30%</strong> pour <strong>{fiche.customer.first_name}</strong> ?
                  <br />
                  <span style={{ fontSize: '0.78rem', color: 'var(--coral)', display: 'block', marginTop: '0.5rem', fontWeight: 600 }}>
                    ⚠️ Cette opération est définitive et démarre un nouveau cycle à 0 point.
                  </span>
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="touch-btn touch-btn--outline"
                style={{ flex: 1 }}
                onClick={() => setConfirmModal(null)}
                disabled={busyAction !== null}
              >
                Annuler
              </button>

              <button
                type="button"
                className={`touch-btn ${confirmModal === 'consumption' ? 'touch-btn--primary' : 'touch-btn--sage'}`}
                style={{ flex: 1 }}
                disabled={busyAction !== null}
                onClick={() => {
                  if (confirmModal === 'consumption' && cardId) {
                    executeAction(
                      'add-consumption',
                      '/api/server/consumptions',
                      { card_id: cardId },
                      '☕ Consommation enregistrée ! Tampon validé.'
                    );
                  } else if (confirmModal === 'reward' && availableReward) {
                    executeAction(
                      'apply-reward',
                      `/api/server/rewards/${availableReward.id}/apply`,
                      {},
                      '🎉 Remise de 30% appliquée ! Nouveau cycle commencé.'
                    );
                  }
                }}
              >
                {busyAction ? 'Validation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Buttons Flow ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        {/* Two Highly Visible Primary Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* 1. + Ajouter une consommation */}
          {isCardActive && (
            <button
              type="button"
              disabled={busyAction !== null || !fiche.can_add_consumption || !cardId}
              onClick={() => setConfirmModal('consumption')}
              style={{
                flex: '1 1 200px',
                minHeight: '52px',
                padding: '0.85rem 1.4rem',
                borderRadius: '16px',
                background:
                  fiche.can_add_consumption && cardId
                    ? 'linear-gradient(135deg, #FAF9F6 0%, #E6D5C3 100%)'
                    : 'rgba(255,255,255,0.15)',
                color: fiche.can_add_consumption && cardId ? '#1A0F07' : '#C4B5A5',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: busyAction || !fiche.can_add_consumption ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow:
                  fiche.can_add_consumption && cardId
                    ? '0 8px 22px rgba(0,0,0,0.35)'
                    : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <CoffeeIcon size={22} color={fiche.can_add_consumption && cardId ? '#1A0F07' : '#C4B5A5'} />
              <span>+ Ajouter une consommation</span>
            </button>
          )}

          {/* 2. Utiliser ma récompense (Quand débloquée) */}
          {availableReward && isCardActive && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => setConfirmModal('reward')}
              style={{
                flex: '1 1 200px',
                minHeight: '52px',
                padding: '0.85rem 1.4rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4E7A63 0%, #2E5C43 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: busyAction ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 25px rgba(78, 122, 99, 0.45)',
                animation: 'pulseGlow 2s infinite',
              }}
            >
              <GiftIcon size={22} color="#FFFFFF" />
              <span>Utiliser ma récompense (30%)</span>
            </button>
          )}

          {/* Renouveler Carte si expirée */}
          {(!isCardActive || !fiche.can_add_consumption) && fiche.card && fiche.card.status !== 'active' && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() =>
                executeAction(
                  'renew-card',
                  '/api/server/cards/renew',
                  { customer_id: fiche.customer.id },
                  'Carte renouvelée pour un nouveau cycle de 30 jours !'
                )
              }
              style={{
                flex: '1 1 200px',
                minHeight: '52px',
                padding: '0.85rem 1.4rem',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #FAF9F6 0%, #E6D5C3 100%)',
                color: '#1A0F07',
                border: 'none',
                fontSize: '0.96rem',
                fontWeight: 800,
                cursor: busyAction ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 22px rgba(0,0,0,0.35)',
              }}
            >
              <RefreshCwIcon size={20} color="#1A0F07" />
              <span>Renouveler la carte (Nouveau cycle 30j)</span>
            </button>
          )}
        </div>

        {/* Secondary Actions: Share, Copy Link, View History */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {shareLink && (
            <>
              <button
                type="button"
                onClick={handleShare}
                style={{
                  flex: '1 1 auto',
                  minHeight: '40px',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#FAF9F6',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ShareIcon size={16} />
                <span>Partager le lien</span>
              </button>

              {qrUrl && (
                <button
                  type="button"
                  onClick={() => setShowQr((v) => !v)}
                  style={{
                    flex: '1 1 auto',
                    minHeight: '40px',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '12px',
                    background: showQr ? 'rgba(78, 122, 99, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                    color: '#FAF9F6',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  📷 {showQr ? 'Masquer le QR' : 'Voir le QR code'}
                </button>
              )}

              {qrUrl && showQr && (
                <div
                  style={{
                    flex: '1 1 100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                  }}
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}`}
                    alt="QR code de la carte client"
                    width={160}
                    height={160}
                    style={{ borderRadius: '10px', background: '#FFFFFF', padding: '6px' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#C4B5A5', textAlign: 'center' }}>
                    Le client scanne pour voir sa carte
                  </span>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={scrollToHistory}
            style={{
              flex: '1 1 auto',
              minHeight: '40px',
              padding: '0.5rem 0.9rem',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#FAF9F6',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <HistoryIcon size={16} />
            <span>Consulter l'historique</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes toastPop {
          from {
            opacity: 0;
            transform: translate(-50%, 15px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 8px 25px rgba(78, 122, 99, 0.45);
          }
          50% {
            box-shadow: 0 8px 35px rgba(78, 122, 99, 0.7);
          }
        }
      `}</style>
    </>
  );
}
