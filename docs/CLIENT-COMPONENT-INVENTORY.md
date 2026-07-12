# Client Component Inventory — MundoTech

> Generated: 2026-07-12
> Total `'use client'` found: **113**

## Classification Legend

| Tag | Meaning |
|---|---|
| **KEEP** | Has hooks, browser APIs, events, context, `next/dynamic`, error boundary, or interactive library. Must stay client. |
| **CONVERT** | Pure rendering — no hooks, events, browser APIs, context, or interactive libs. Safe to remove `'use client'`. |
| **SPLIT** | Wrapper could be server with a small client island for the interactive part. |
| **STALE** | Dead code — not imported anywhere in the project. Could be deleted. |

---

## Full Inventory

| # | File | Classification | Reason | Risk |
|---|---|---|---|---|
| 1 | `app/AppContent.tsx` | KEEP | useState, useEffect, usePathname, useCart, requestAnimationFrame | Low |
| 2 | `app/admin/banners/page.tsx` | KEEP | useState, useEffect, CRUD handlers | Low |
| 3 | `app/admin/categories/page.tsx` | KEEP | useState, useEffect, useTransition, CRUD | Low |
| 4 | `app/admin/coupons/page.tsx` | KEEP | useState, useEffect, useTransition, fetch | Low |
| 5 | `app/admin/error.tsx` | KEEP | Error boundary, useEffect | Low |
| 6 | `app/admin/home-manager/page.tsx` | KEEP | useState, useEffect, useRef, file input | Low |
| 7 | `app/admin/menu/page.tsx` | KEEP | signOut, onClick | Low |
| 8 | `app/admin/orders/[id]/etiqueta/LabelControls.tsx` | KEEP | useRouter, window.print, onClick | Low |
| 9 | `app/admin/orders/[id]/page.tsx` | KEEP | useState(10+), useEffect, useParams, useRouter, clipboard | Low |
| 10 | `app/admin/orders/error.tsx` | KEEP | Error boundary re-export | Low |
| 11 | `app/admin/orders/page.tsx` | KEEP | useState, useEffect, useCallback, useRouter, useSearchParams, fetch, confirm | Low |
| 12 | `app/admin/page.tsx` | KEEP | useState, useEffect, fetch | Low |
| 13 | `app/admin/personalizar/page.tsx` | KEEP | useState, useTransition, useEffect, form | Low |
| 14 | `app/admin/products/page.tsx` | KEEP | Heavy hooks, search params, inline editing | Low |
| 15 | `app/admin/reviews/page.tsx` | KEEP | useState, useEffect, useCallback, fetch, confirm | Low |
| 16 | `app/admin/settings/announcement/page.tsx` | KEEP | useState, useEffect, useTransition | Low |
| 17 | `app/admin/settings/seo-local/SeoLocalEditor.tsx` | KEEP | useState, useTransition, navigator.geolocation | Low |
| 18 | `app/admin/settings/SettingsClient.tsx` | KEEP | useState, useEffect, useTransition, confirm | Low |
| 19 | `app/admin/settings/users/UsersClient.tsx` | KEEP | useState, useTransition, confirm, dialogs | Low |
| 20 | `app/admin/stats/page.tsx` | KEEP | useState, useEffect, useMemo, fetch | Low |
| 21 | `app/buscar/SearchFiltersBar.tsx` | KEEP | useState, useEffect, useRef, useRouter, framer-motion, scroll lock | Low |
| **22** | **`app/buscar/SearchPagination.tsx`** | **CONVERT → SERVER** | **Pure Link rendering, no hooks/events/browser APIs. Server parent page.** | **Low** |
| 23 | `app/cart/CartClient.tsx` | KEEP | useState, useCart, useRouter | Low |
| 24 | `app/cart/unsubscribe/confirm/UnsubscribeConfirmClient.tsx` | KEEP | useState, fetch, onClick | Low |
| 25 | `app/checkout/success/GuestAccountCard.tsx` | KEEP | useState, useSession, useRouter, signIn, onSubmit | Low |
| 26 | `app/checkout/success/GuestSuccessClientPage.tsx` | KEEP | framer-motion animations (explicitly excluded per spec) | Low |
| 27 | `app/checkout/success/SuccessClientPage.tsx` | KEEP | useEffect GA4 tracking, framer-motion | Low |
| 28 | `app/components/AddProductModal.tsx` | KEEP | Heavy hooks, @dnd-kit, framer-motion, events | Low |
| 29 | `app/components/AnnouncementBarClient.tsx` | KEEP | useLayoutEffect, useState, document.cookie | Low |
| 30 | `app/components/AppLayoutShell.tsx` | KEEP | usePathname for layout switching | Low |
| 31 | `app/components/AuthProvider.tsx` | KEEP | SessionProvider wrapper | Low |
| 32 | `app/components/CookieConsent.tsx` | KEEP | useState, useEffect, useCallback, localStorage, document.cookie | Low |
| 33 | `app/components/DeferredClientWidgets.tsx` | KEEP | next/dynamic with ssr:false | Low |
| 34 | `app/components/FlashDeals.tsx` | KEEP | useState, useEffect, setInterval countdown | Low |
| 35 | `app/components/HomeHeroCyber.tsx` | KEEP | useState, useEffect, setInterval carousel | Low |
| 36 | `app/components/PromoPopup.tsx` | KEEP | useState, useEffect, usePathname, localStorage, framer-motion | Low |
| 37 | `app/components/ProductGridAndFilters.tsx` | KEEP | Heavy hooks, framer-motion, document listeners, URL sync | Low |
| 38 | `app/components/TrackViewItemList.tsx` | KEEP | useEffect, useRef for GA4 tracking | Low |
| 39 | `app/components/WhatsAppFab.tsx` | KEEP | usePathname, framer-motion | Low |
| 40 | `app/components/admin/ShipOrderDialog.tsx` | KEEP | useState, useEffect, scroll lock | Low |
| 41 | `app/components/admin/StatusUpdateMenu.tsx` | KEEP | window.confirm, onClick events | Low |
| 42 | `app/components/checkout/CheckoutFlow.tsx` | KEEP | Heavy hooks, framer-motion, contexts | Low |
| 43 | `app/components/checkout/CheckoutStepper.tsx` | KEEP | framer-motion motion.div animations | Low |
| 44 | `app/components/checkout/OfficeSelect.tsx` | KEEP | useState, useRef, useEffect, keyboard nav | Low |
| 45 | `app/components/checkout/PaymentForm.tsx` | KEEP | forwardRef, useImperativeHandle, clipboard, framer-motion | Low |
| 46 | `app/components/checkout/ReviewStep.tsx` | KEEP | Multiple hooks, contexts, fetch, reentrancy | Low |
| 47 | `app/components/checkout/ShippingForm.tsx` | KEEP | react-hook-form, useSession, forwardRef, events | Low |
| 48 | `app/components/checkout/WhatsAppCheckout.tsx` | KEEP | Multiple hooks, contexts, dynamic import | Low |
| 49 | `app/error.tsx` | KEEP | Error boundary | Low |
| 50 | `app/forgot-password/ForgotPasswordClient.tsx` | KEEP | useState, useTransition, onSubmit | Low |
| 51 | `app/global-error.tsx` | KEEP | Error boundary (Next.js requirement), Sentry | Low |
| 52 | `app/login/LoginClient.tsx` | KEEP | useState, useSession, useRouter, useSearchParams | Low |
| 53 | `app/pedido/PedidoLookupClient.tsx` | KEEP | useState, useSearchParams, form events | Low |
| 54 | `app/product/[slug]/DynamicZoomWrapper.tsx` | KEEP | Class error boundary | Low |
| 55 | `app/product/[slug]/PaymentLogos.tsx` | KEEP | useState for image error fallback, onError | Low |
| 56 | `app/product/[slug]/ProductActions.tsx` | KEEP | CartContext, WishlistContext, useSession, events | Low |
| 57 | `app/product/[slug]/ProductGallery.tsx` | KEEP | Heavy hooks, IntersectionObserver, createPortal, dynamic | Low |
| 58 | `app/product/[slug]/ProductReviews.tsx` | KEEP | Heavy hooks, window APIs, lightbox, events | Low |
| 59 | `app/product/[slug]/ProductShare.tsx` | KEEP | useState, useEffect, useCallback, clipboard/share | Low |
| 60 | `app/product/[slug]/ProductTabs.tsx` | KEEP | useState, useRef, framer-motion | Low |
| 61 | `app/product/[slug]/ZoomLightbox.tsx` | KEEP | react-zoom-pan-pinch interactive library | Low |
| 62 | `app/registro/RegistroClient.tsx` | KEEP | useState, useEffect, useSession, useRouter | Low |
| 63 | `app/reset-password/ResetPasswordClient.tsx` | KEEP | useState, useEffect, useTransition, window.location | Low |
| 64 | `app/wishlist/WishlistClient.tsx` | KEEP | useState, useWishlist, useCart, events | Low |
| 65 | `components/CartDrawer.tsx` | KEEP | useEffect, useRef, contexts, framer-motion, scroll lock | Low |
| 66 | `components/CategoryNav.tsx` | KEEP | useProducts context, onClick | Low |
| 67 | `components/CategorySidebar.tsx` | KEEP | useState, useProducts context, onClick | Low |
| 68 | `components/ChunkErrorReloader.tsx` | KEEP | useEffect, window event listeners, sessionStorage | Low |
| 69 | `components/Navbar.tsx` | KEEP | Multiple hooks, contexts, scroll listeners, dynamic | Low |
| 70 | `components/ProductCard.tsx` | KEEP | useState, multiple contexts, events | Low |
| 71 | `components/ProductFilters.tsx` | KEEP | useProducts context, onChange | Low |
| 72 | `components/ProductGallery.tsx` | KEEP | useState, framer-motion, onClick | Low |
| 73 | `components/RecentlyViewed.tsx` | KEEP | useRecentlyViewed custom hook | Low |
| 74 | `components/RecentlyViewedTracker.tsx` | KEEP | useEffect, useRecentlyViewed, sessionStorage, fetch | Low |
| 75 | `components/SearchBar.tsx` | KEEP | Multiple hooks, document listeners, keyboard nav | Low |
| 76 | `components/SearchMobileOverlay.tsx` | KEEP | Heavy hooks, framer-motion, createPortal | Low |
| 77 | `components/SearchResultsList.tsx` | KEEP | useRef, useEffect, scroll into view, onClick | Low |
| 78 | `components/account/AccountSidebar.tsx` | KEEP | usePathname, useSession, signOut | Low |
| 79 | `components/account/AddressCard.tsx` | KEEP | Has inline onClick handlers and callback props from parent | Low |
| 80 | `components/account/AddressFormModal.tsx` | KEEP | react-hook-form, useEffect, useRef, scroll lock | Low |
| 81 | `components/account/AddressListClient.tsx` | KEEP | useState, useTransition, CRUD modal | Low |
| 82 | `components/account/ChangePasswordForm.tsx` | KEEP | react-hook-form, useToast, onSubmit | Low |
| 83 | `components/account/ForbiddenBanner.tsx` | KEEP | useSearchParams, useRouter, useEffect | Low |
| 84 | `components/account/OrderDetailClient.tsx` | KEEP | useRouter, useState, clipboard | Low |
| 85 | `components/account/OrderHistoryClient.tsx` | KEEP | useRouter, useState, events | Low |
| 86 | `components/account/UserDetailsForm.tsx` | KEEP | react-hook-form, useRouter, useToast | Low |
| 87 | `components/admin/AdminShell.tsx` | KEEP | useState, useEffect, usePathname, rAF | Low |
| 88 | `components/admin/ApproveBinanceButton.tsx` | KEEP | useState, window.confirm, fetch | Low |
| 89 | `components/admin/DataTable.tsx` | KEEP | onClick, onChange events | Low |
| 90 | `components/admin/MobileBottomNav.tsx` | KEEP | usePathname for active link | Low |
| 91 | `components/admin/MobileTopBar.tsx` | KEEP | usePathname, useRouter, onClick | Low |
| 92 | `components/admin/NewOrdersWatcher.tsx` | KEEP | Multiple hooks, Notification API, Audio, polling | Low |
| 93 | `components/admin/PaymentVerificationPanel.tsx` | KEEP | useState, useRef, useTransition, AbortController | Low |
| 94 | `components/admin/PhotoUploader.tsx` | KEEP | useState, useRef, Canvas/XMLHttpRequest | Low |
| 95 | `components/admin/SidebarDesktop.tsx` | KEEP | usePathname for active link | Low |
| 96 | `components/admin/SidebarDrawer.tsx` | KEEP | usePathname, useEffect, scroll lock, signOut | Low |
| 97 | `components/admin/TouchIconButton.tsx` | CONVERT (but uses forwardRef) | Pure forwardRef wrapper; but forwardRef cannot be used from server. Keep KEEP. | — |
| 98 | `components/admin/ValidatePaymentAdminButton.tsx` | KEEP | useTransition, window.confirm | Low |
| 99 | `components/auth/AuthSplitLayout.tsx` | KEEP | framer-motion (explicitly excluded per spec) | Low |
| 100 | `components/auth/MundoTechAuthForms.tsx` | KEEP | Heavy hooks, framer-motion, react-hook-form | Low |
| 101 | `components/layout/CategoryDrawer.tsx` | KEEP | Multiple hooks, framer-motion, browser APIs | Low |
| **102** | **`components/order/DualOrderMoney.tsx`** | **CONVERT → SERVER** | **Pure rendering, no hooks/events/browser APIs** | **Low** |
| 103 | `components/ui/Label.tsx` | STALE | Dead code — not imported anywhere | — |
| 104 | `components/ui/Separator.tsx` | STALE | Dead code — not imported anywhere | — |
| 105 | `components/ui/Toast.tsx` | KEEP | @radix-ui/react-toast interactive library | Low |
| 106 | `components/ui/Toaster.tsx` | KEEP | useToast hook | Low |
| 107 | `context/AuthProvider.tsx` | KEEP | SessionProvider wrapper | Low |
| 108 | `context/CartContext.tsx` | KEEP | createContext, useState, useEffect, localStorage | Low |
| 109 | `context/ExchangeRateContext.tsx` | KEEP | createContext, useState, useEffect, fetch, visibility | Low |
| 110 | `context/ProductContext.tsx` | KEEP | createContext, multiple hooks | Low |
| 111 | `context/WishlistContext.tsx` | KEEP | createContext, useState, useEffect, localStorage | Low |
| 112 | `hooks/useBodyScrollLock.ts` | KEEP | Custom hook with useEffect | Low |
| 113 | `lib/useRecentlyViewed.ts` | KEEP | Custom hook with useState, useEffect, localStorage | Low |

---

## Summary

| Classification | Count | Notes |
|---|---|---|
| **KEEP** | 108 | Legitimate client components |
| **STALE** | 2 | Separator, Label — dead code, not imported |
| **CONVERT (this batch)** | **2** | **SearchPagination, DualOrderMoney** |
| **CONVERT (future)** | 1 | TouchIconButton — blocked by forwardRef |
| **SPLIT (future)** | 3 | AuthSplitLayout, GuestSuccessClientPage, StatusUpdateMenu — need architectural work |

---

## Batch 1 — CONVERT to Server Component

### 1. `app/buscar/SearchPagination.tsx`
- **Justification:** No hooks, no browser APIs, no events, no context. Pure Link rendering with a pure helper function (`buildPageWindow`).
- **Parent:** `app/buscar/page.tsx` — already a Server Component. The pagination element will be SSR'd, reducing client JS bundle.
- **Props:** All plain string/number primitives. No Date, Decimal, or callbacks.
- **Risk:** None. The component will render identically on server and client.

### 2. `components/order/DualOrderMoney.tsx`
- **Justification:** No hooks, no browser APIs, no events, no context. Pure string/class computation from props.
- **Importers:** All 7 importers are already `'use client'` — so this won't enable SSR of parent pages, but reduces client boundary surface.
- **Props:** Takes `number`, `OrderWithPricingMeta` (from lib/order-pricing — compatible with RSC serialization), and plain string booleans.
- **Risk:** None. Works identically.

---

## Future Batches

### SPLIT Candidates (need wrapper + island pattern)
- **AuthSplitLayout.tsx** — framer-motion entry animation could be CSS; rest is pure
- **GuestSuccessClientPage.tsx** — framer-motion stagger animations could be CSS
- **StatusUpdateMenu.tsx** — only `window.confirm` + onClick needs client

### Requires Investigation
- **TouchIconButton.tsx** — uses forwardRef which is RSC-incompatible. Must keep client.
- **Delete stale components** — Separator.tsx, Label.tsx (not imported)
