import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import UserDetailsForm from '@/components/account/UserDetailsForm';

export default async function AccountDetailsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-8">
        <h1 className="text-xl font-semibold text-navy">Sesión requerida</h1>
        <p className="text-sm text-slate-500 mt-2">Debes iniciar sesión para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 sm:p-8">
      <div className="mb-6 pb-6 border-b border-slate-100">
        <h1 className="text-2xl md:text-[1.75rem] font-bold text-navy tracking-tight">Mi perfil</h1>
        <p className="text-sm text-slate-500 mt-1.5">Actualiza tu información personal y de contacto.</p>
      </div>
      <UserDetailsForm user={session.user} />
    </div>
  );
}
