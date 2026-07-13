# Client Component Inventory — MundoTech

> Generated: 2026-07-12 (Prompt 06 — regenerado desde código)
> Total `'use client'` encontrados: **117**

## Classification Legend

| Tag | Meaning |
|---|---|
| **KEEP** | Hooks, browser APIs, events, context, `next/dynamic`, error boundary, or interactive library. |
| **CONVERT** | Pure rendering — safe to remove `'use client'`. |
| **SPLIT** | Wrapper could be server with a small client island. |
| **STALE** | Dead code — not imported anywhere. |

## Conversiones completadas (Batch 1)

| File | Estado |
|---|---|
| `app/buscar/SearchPagination.tsx` | **CONVERT → SERVER** (ya no en conteo) |
| `components/order/DualOrderMoney.tsx` | **CONVERT → SERVER** (ya no en conteo) |

## Full Inventory

| # | File | Classification | Reason | Risk |
|---|---|---|---|---|
| 1 | `app/AppContent.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 2 | `app/account/orders/[id]/error.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 3 | `app/admin/banners/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 4 | `app/admin/categories/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 5 | `app/admin/coupons/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 6 | `app/admin/error.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 7 | `app/admin/home-manager/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 8 | `app/admin/menu/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 9 | `app/admin/orders/[id]/etiqueta/LabelControls.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 10 | `app/admin/orders/[id]/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 11 | `app/admin/orders/error.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 12 | `app/admin/orders/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 13 | `app/admin/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 14 | `app/admin/personalizar/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 15 | `app/admin/products/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 16 | `app/admin/reviews/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 17 | `app/admin/settings/SettingsClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 18 | `app/admin/settings/announcement/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 19 | `app/admin/settings/seo-local/SeoLocalEditor.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 20 | `app/admin/settings/users/UsersClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 21 | `app/admin/stats/page.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 22 | `app/buscar/SearchFiltersBar.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 23 | `app/cart/CartClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 24 | `app/cart/unsubscribe/confirm/UnsubscribeConfirmClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 25 | `app/checkout/success/GuestAccountCard.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 26 | `app/checkout/success/GuestSuccessClientPage.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 27 | `app/checkout/success/SuccessClientPage.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 28 | `app/components/AddProductModal.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 29 | `app/components/AnnouncementBarClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 30 | `app/components/AppLayoutShell.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 31 | `app/components/AuthProvider.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 32 | `app/components/CookieConsent.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 33 | `app/components/DeferredClientWidgets.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 34 | `app/components/FlashDeals.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 35 | `app/components/HomeHeroCyber.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 36 | `app/components/ProductGridAndFilters.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 37 | `app/components/PromoPopup.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 38 | `app/components/TrackViewItemList.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 39 | `app/components/WhatsAppFab.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 40 | `app/components/admin/ShipOrderDialog.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 41 | `app/components/admin/StatusUpdateMenu.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 42 | `app/components/checkout/CheckoutFlow.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 43 | `app/components/checkout/CheckoutStepper.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 44 | `app/components/checkout/OfficeSelect.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 45 | `app/components/checkout/PaymentForm.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 46 | `app/components/checkout/ReviewStep.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 47 | `app/components/checkout/ShippingForm.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 48 | `app/components/checkout/WhatsAppCheckout.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 49 | `app/error.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 50 | `app/forgot-password/ForgotPasswordClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 51 | `app/global-error.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 52 | `app/login/LoginClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 53 | `app/pedido/PedidoLookupClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 54 | `app/product/[slug]/DynamicZoomWrapper.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 55 | `app/product/[slug]/PaymentLogos.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 56 | `app/product/[slug]/ProductActions.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 57 | `app/product/[slug]/ProductGallery.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 58 | `app/product/[slug]/ProductReviews.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 59 | `app/product/[slug]/ProductShare.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 60 | `app/product/[slug]/ProductTabs.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 61 | `app/product/[slug]/ZoomLightbox.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 62 | `app/registro/RegistroClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 63 | `app/reset-password/ResetPasswordClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 64 | `app/wishlist/WishlistClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 65 | `components/CartDrawer.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 66 | `components/CategoryNav.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 67 | `components/CategorySidebar.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 68 | `components/ChunkErrorReloader.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 69 | `components/MotionProvider.tsx` | KEEP | framer-motion LazyMotion + MotionConfig wrapper | Low |
| 70 | `components/Navbar.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 71 | `components/ProductCard.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 72 | `components/ProductFilters.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 73 | `components/ProductGallery.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 74 | `components/RecentlyViewed.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 75 | `components/RecentlyViewedTracker.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 76 | `components/SearchBar.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 77 | `components/SearchMobileOverlay.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 78 | `components/SearchResultsList.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 79 | `components/account/AccountSidebar.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 80 | `components/account/AddressCard.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 81 | `components/account/AddressFormModal.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 82 | `components/account/AddressListClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 83 | `components/account/ChangePasswordForm.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 84 | `components/account/ForbiddenBanner.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 85 | `components/account/OrderDetailClient.tsx` | KEEP | useRouter, useState, clipboard | Low |
| 86 | `components/account/OrderHistoryClient.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 87 | `components/account/UserDetailsForm.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 88 | `components/admin/AdminShell.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 89 | `components/admin/ApproveBinanceButton.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 90 | `components/admin/ConfirmDialog.tsx` | KEEP | useState, dialog focus, onClick handlers | Low |
| 91 | `components/admin/DataTable.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 92 | `components/admin/MobileBottomNav.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 93 | `components/admin/MobileTopBar.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 94 | `components/admin/NewOrdersWatcher.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 95 | `components/admin/PaymentVerificationPanel.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 96 | `components/admin/PhotoUploader.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 97 | `components/admin/SidebarDesktop.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 98 | `components/admin/SidebarDrawer.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 99 | `components/admin/TouchIconButton.tsx` | KEEP | forwardRef wrapper — RSC-incompatible | — |
| 100 | `components/admin/ValidatePaymentAdminButton.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 101 | `components/auth/AuthSplitLayout.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 102 | `components/auth/MundoTechAuthForms.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 103 | `components/layout/CategoryDrawer.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 104 | `components/ui/Label.tsx` | STALE | Dead code — not imported anywhere | — |
| 105 | `components/ui/Separator.tsx` | STALE | Dead code — not imported anywhere | — |
| 106 | `components/ui/Toast.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 107 | `components/ui/Toaster.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 108 | `context/AuthProvider.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 109 | `context/CartContext.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 110 | `context/ExchangeRateContext.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 111 | `context/ProductContext.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 112 | `context/WishlistContext.tsx` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 113 | `hooks/useBodyScrollLock.ts` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |
| 114 | `hooks/useDebouncedValue.ts` | KEEP | Custom hook with useState/useEffect | Low |
| 115 | `hooks/useFocusTrap.ts` | KEEP | Custom hook with useEffect, keyboard trap | Low |
| 116 | `hooks/useSearchSuggest.ts` | KEEP | Custom hook with fetch/debounce | Low |
| 117 | `lib/useRecentlyViewed.ts` | KEEP | Client hooks, browser APIs, events, context, or interactive library | Low |

---

## Summary

| Classification | Count | Notes |
|---|---|---|
| **KEEP** | 115 | Legitimate client components |
| **STALE** | 2 | Separator, Label — dead code |
| **CONVERT (done, fuera del conteo)** | 2 | SearchPagination, DualOrderMoney |
| **Total `'use client'` activos** | **117** | Recuento real (regex al inicio de archivo) |

> El inventario previo (113) omitía hooks y algunos componentes client recientes. El conteo **117** refleja cobertura completa, no una reducción de bundle.
