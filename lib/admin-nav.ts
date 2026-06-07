import {
  Home, Package, Tag, ShoppingCart, BarChart2,
  Image as ImageIcon, LayoutDashboard, Users, MapPin, Store,
  Wallet, Palette, MoreHorizontal, Ticket, Star, Megaphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'new';
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Estructura completa para el sidebar de escritorio.
 */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Resumen',
    items: [
      { href: '/admin',        label: 'Inicio',       icon: Home,        description: 'Panel general' },
      { href: '/admin/stats',  label: 'Analítica',    icon: BarChart2,   description: 'Ventas y vistas' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catálogo',
    items: [
      { href: '/admin/products',   label: 'Productos',  icon: Package, description: 'Inventario' },
      { href: '/admin/categories', label: 'Categorías', icon: Tag,     description: 'Slugs SEO' },
      { href: '/admin/banners',    label: 'Banners',    icon: ImageIcon, description: 'Hero y CTA' },
      { href: '/admin/reviews',    label: 'Reseñas',    icon: Star, description: 'Moderación', badge: 'new' },
    ],
  },
  {
    id: 'sales',
    label: 'Ventas',
    items: [
      { href: '/admin/orders',     label: 'Pedidos',  icon: ShoppingCart, description: 'En curso y archivo' },
      { href: '/admin/coupons',    label: 'Cupones',  icon: Ticket, description: 'Descuentos', badge: 'new' },
    ],
  },
  {
    id: 'site',
    label: 'Sitio',
    items: [
      { href: '/admin/home-manager',           label: 'Gestor Home',      icon: LayoutDashboard, description: 'Bloques de la home' },
      { href: '/admin/settings/announcement',  label: 'Barra de anuncios', icon: Megaphone,      description: 'Mensaje superior', badge: 'new' },
      { href: '/admin/settings/seo-local',     label: 'SEO Local',        icon: MapPin,          description: 'Dirección · horarios', badge: 'new' },
    ],
  },
  {
    id: 'config',
    label: 'Configuración',
    items: [
      { href: '/admin/settings',         label: 'Tienda y pagos', icon: Store },
      { href: '/admin/settings/users',   label: 'Usuarios',       icon: Users, badge: 'new' },
    ],
  },
];

/**
 * Para el bottom-nav móvil: los 5 destinos más usados, en orden de pulgar.
 */
export const ADMIN_BOTTOM_NAV: NavItem[] = [
  { href: '/admin',          label: 'Inicio',     icon: Home },
  { href: '/admin/orders',   label: 'Pedidos',    icon: ShoppingCart },
  { href: '/admin/products', label: 'Catálogo',   icon: Package },
  { href: '/admin/stats',    label: 'Analítica',  icon: BarChart2 },
  { href: '/admin/menu',     label: 'Más',        icon: MoreHorizontal },
];

export const FLAT_ADMIN_NAV: NavItem[] = ADMIN_NAV_GROUPS.flatMap(g => g.items);

/**
 * Devuelve el título legible de la ruta admin actual (para el header móvil).
 */
export function getActiveLabel(pathname: string): string {
  if (pathname === '/admin') return 'Inicio';
  if (pathname === '/admin/menu') return 'Menú';
  const found = FLAT_ADMIN_NAV.find(i =>
    i.href !== '/admin' && pathname.startsWith(i.href),
  );
  return found?.label ?? 'Panel';
}

export function isItemActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

export { ImageIcon, LayoutDashboard, Wallet, Palette };
