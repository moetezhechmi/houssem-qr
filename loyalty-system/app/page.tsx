import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Page() {
  const token = (await cookies()).get('last_card_token')?.value;
  if (token) redirect(`/client/${token}`);
  redirect('/serveur');
}