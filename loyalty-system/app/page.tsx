'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    let token = '';
    try { token = localStorage.getItem('last_card_token') || ''; } catch {}
    if (token) {
      router.replace(`/client/${token}`);
    } else {
      router.replace('/serveur');
    }
  }, [router]);
  return null;
}