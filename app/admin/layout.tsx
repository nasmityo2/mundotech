import Sidebar from '@/components/admin/Sidebar';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F1F5F9]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <p className="text-sm font-semibold text-navy tracking-wide uppercase">
            Panel de Administración — MundoTech
          </p>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
