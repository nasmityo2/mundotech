import { redirect } from 'next/navigation';

/** El alta se gestiona en `/login` (pestaña Crear cuenta). */
export default function RegisterPage() {
  redirect('/login?tab=register');
}
