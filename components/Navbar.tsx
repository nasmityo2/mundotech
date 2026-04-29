'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag, Heart, Phone, Mail,
  UserCircle, LogOut, Package, Settings,
  LayoutDashboard, ChevronDown, Menu,
  ShieldCheck, Truck, Search,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useCart }     from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar          from './SearchBar';
import SearchMobileOverlay from './SearchMobileOverlay';
import CategoryDrawer     from './layout/CategoryDrawer';

const Navbar = ({ onCartClick }: { onCartClick: () => void }) => {
  const { data: session }                  = useSession();
  const { cart, isCartLoading, itemAdded } = useCart();
  const { wishlist }                       = useWishlist();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const totalItems = !isCartLoading && cart
    ? cart.reduce((acc, item) => acc + item.quantity, 0)
    : 0;
  const cartAnim = { scale: itemAdded ? [1, 1.18, 1] : 1, transition: { duration: 0.32 } };
  const isAdmin  = session?.user?.role === 'ADMIN' || session?.user?.role === 'admin';

  // Sombra/blur progresivo
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener('pointerdown', handler, { passive: true });
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  return (
    <>
      <CategoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SearchMobileOverlay open={mobileSearchOpen} onClose={() => setMobileSearchOpen(false)} />

      <header className="sticky top-0 z-40 w-full max-w-full overflow-visible">
        {/* Top bar trust — solo desktop */}
        <div className="hidden sm:block bg-navy text-white/70">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px]
                          flex justify-between items-center py-2 text-[11px]">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5"><Phone size={11} /> 0412-1471338</span>
              <span className="flex items-center gap-1.5"><Mail size={11} /> ventas@mundotech.com.ve</span>
            </div>
            <div className="flex items-center gap-4 text-white/80">
              <span className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-brand-yellow" /> Garantía oficial</span>
              <span className="hidden md:flex items-center gap-1.5"><Truck size={11} className="text-brand-yellow" /> Envío seguro</span>
            </div>
          </div>
        </div>

        {/* Header principal */}
        <div
          className={`transition-all duration-200 ${
            scrolled
              ? 'bg-white/90 backdrop-blur-md shadow-soft'
              : 'bg-white border-b border-slate-200/70'
          }`}
        >
          <div className="container mx-auto px-3 sm:px-6 lg:px-8 max-w-[1400px]">
            <div className="flex items-center h-[60px] sm:h-[72px] gap-2 sm:gap-5">

              {/* Hamburguesa + Logo */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="lg:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-navy hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  aria-label="Abrir menú de categorías"
                >
                  <Menu size={22} />
                </button>

                <Link
                  href="/"
                  className="text-[1.15rem] sm:text-2xl font-bold tracking-tight text-navy flex items-center gap-0.5 px-1"
                >
                  <span>Mundo</span>
                  <span className="text-brand-yellow">Tech</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="hidden lg:inline-flex ml-3 items-center gap-1.5 text-sm font-semibold text-navy/80
                             hover:text-navy hover:bg-slate-100 transition-colors px-3 py-2 rounded-xl"
                >
                  <Menu size={15} />
                  Categorías
                </button>
              </div>

              {/* SearchBar dominante en desktop */}
              <div className="hidden md:block flex-grow max-w-2xl mx-auto min-w-0">
                <SearchBar placeholder="Buscar productos, marcas y más..." />
              </div>

              {/* Acciones derecha */}
              <div className="flex items-center gap-0.5 sm:gap-1 ml-auto md:ml-0 flex-shrink-0">

                {/* Búsqueda móvil */}
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-navy hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  aria-label="Abrir búsqueda"
                >
                  <Search size={20} />
                </button>

                {/* Wishlist */}
                <Link
                  href="/wishlist"
                  className="relative flex items-center justify-center min-w-[44px] min-h-[44px] text-navy/80 hover:text-navy hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
                  aria-label="Lista de deseos"
                >
                  <Heart size={20} />
                  {wishlist.length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {wishlist.length}
                    </span>
                  )}
                </Link>

                {/* Cuenta */}
                {session ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen(v => !v)}
                      className="flex items-center gap-2 min-w-[44px] min-h-[44px] px-2 sm:pl-2 sm:pr-3 text-navy
                                 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
                      aria-label="Mi cuenta"
                    >
                      <div className="w-7 h-7 rounded-full bg-navy text-brand-yellow flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                        {(session.user?.name?.[0] ?? 'U').toUpperCase()}
                      </div>
                      <span className="hidden lg:block text-sm font-semibold max-w-[100px] truncate">
                        {session.user?.name?.split(' ')[0] ?? 'Cuenta'}
                      </span>
                      <ChevronDown size={13} className={`hidden lg:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.18 }}
                          className="absolute right-0 mt-2 w-[min(calc(100vw-1rem),16rem)] bg-white rounded-2xl shadow-lift
                                     border border-slate-200/70 py-2 z-[70] overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-slate-100">
                            <p className="text-sm font-semibold text-navy truncate">{session.user?.name}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{session.user?.email}</p>
                          </div>
                          <div className="py-1">
                            {[
                              { href: '/account/orders',  icon: Package,  label: 'Mis pedidos' },
                              { href: '/account/details', icon: Settings, label: 'Mi perfil'   },
                              { href: '/wishlist',        icon: Heart,    label: 'Favoritos'   },
                            ].map(item => (
                              <Link
                                key={item.href} href={item.href}
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-4 min-h-[44px] text-sm text-navy/80 hover:bg-slate-50 hover:text-navy transition-colors"
                              >
                                <item.icon size={16} className="text-slate-400 flex-shrink-0" /> {item.label}
                              </Link>
                            ))}
                          </div>
                          {isAdmin && (
                            <div className="border-t border-slate-100 py-1">
                              <Link
                                href="/admin" onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-4 min-h-[44px] text-sm text-amber-700 font-semibold hover:bg-amber-50 transition-colors"
                              >
                                <LayoutDashboard size={16} className="flex-shrink-0" /> Panel admin
                              </Link>
                            </div>
                          )}
                          <div className="border-t border-slate-100 py-1">
                            <button
                              type="button"
                              onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                              className="flex items-center gap-3 w-full px-4 min-h-[44px] text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <LogOut size={16} className="flex-shrink-0" /> Cerrar sesión
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] sm:px-3 text-navy
                               hover:bg-slate-100 active:bg-slate-200 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <UserCircle size={20} />
                    <span className="hidden sm:inline">Entrar</span>
                  </Link>
                )}

                {/* Carrito — siempre accesible con pulgar */}
                <motion.button
                  type="button"
                  onClick={onCartClick}
                  className="relative flex items-center gap-1.5 sm:gap-2 min-h-[44px] px-2.5 sm:pl-3 sm:pr-4 ml-0.5 sm:ml-1
                             bg-navy text-white text-sm font-semibold rounded-full
                             hover:bg-navy-700 active:bg-navy-800 shadow-soft hover:shadow-card transition-all"
                  animate={cartAnim}
                  aria-label="Carrito de compras"
                >
                  <ShoppingBag size={18} />
                  <span className="hidden sm:inline">Carrito</span>
                  {totalItems > 0 && (
                    <span className="bg-brand-yellow text-navy text-[11px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center nums">
                      {totalItems}
                    </span>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
