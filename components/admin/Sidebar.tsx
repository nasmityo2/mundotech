'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Tag, ShoppingCart, Settings, BarChart2, Image, LayoutDashboard } from 'lucide-react';

const navItems = [
  { href: '/admin',               label: 'Resumen',       icon: Home          },
  { href: '/admin/stats',         label: 'Estadísticas',  icon: BarChart2     },
  { href: '/admin/products',      label: 'Productos',     icon: Package       },
  { href: '/admin/categories',    label: 'Categorías',    icon: Tag           },
  { href: '/admin/orders',        label: 'Pedidos',       icon: ShoppingCart  },
  { href: '/admin/home-manager',  label: 'Gestor Home',   icon: LayoutDashboard },
  { href: '/admin/banners',       label: 'Banners',       icon: Image         },
  { href: '/admin/settings',      label: 'Configuración', icon: Settings      },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-black text-navy tracking-tight">MundoTech</h1>
        <p className="text-xs text-gray-400 mt-0.5">Panel de Administración</p>
      </div>
      <nav className="flex-grow p-3 space-y-0.5">
        {navItems.map(item => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-4 ${
                isActive
                  ? 'bg-gray-100 text-navy font-semibold border-brand-yellow'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-navy border-transparent'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver a la tienda
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
