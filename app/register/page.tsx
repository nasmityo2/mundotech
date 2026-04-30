import { redirect } from 'next/navigation';

/** El registro se gestiona en el modal (`/?auth=register`). */
export default async function RegisterPage() {
  redirect('/?auth=register');
}
