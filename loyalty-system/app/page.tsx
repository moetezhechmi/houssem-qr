'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    let token = '';
    try { token = localStorage.getItem('last_card_token') || ''; } catch {}
    if (!token) {
      try {
        const m = document.cookie.match(/(?:^|; )last_card_token=([^;]+)/);
        if (m) token = decodeURIComponent(m[1]);
      } catch {}
    }

    // Preserve any search parameters (e.g. ?notif_open=1&notif_data=...)
    const currentParams = window.location.search || '';
    if (token) {
      router.replace(`/client/${token}${currentParams}`);
    } else {
      router.replace(`/serveur${currentParams}`);
    }
  }, [router]);
  return null;
}