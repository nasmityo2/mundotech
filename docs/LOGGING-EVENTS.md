# Catálogo de eventos de logging — MundoTech

## Reglas

- Los nombres usan snake_case.
- Ningún evento contiene datos variables.
- El contexto acepta únicamente `SafeLogContext`.
- Nunca registrar email, teléfono, cédula, dirección, referencia, token, object key, URL firmada, credenciales o body.
- Sentry recibe únicamente un Error reconstruido y sanitizado.
- `console.*` directo en runtime server está prohibido salvo `lib/safe-logger.ts`.
- Client error boundaries (`app/**/error.tsx`) y helpers E2E (`lib/e2e-axe.ts`, `lib/e2e-db-guard.ts`) se documentan aparte.

## Eventos (198)

| Evento | Nivel | Origen |
|---|---|---|
| `abandoned_cart_email_empty` | warn | `lib/resend.tsx` |
| `abandoned_cart_find_by_token_failed` | error | `lib/abandoned-cart.ts` |
| `abandoned_cart_opted_out_failed` | error | `lib/abandoned-cart.ts` |
| `abandoned_cart_recovered_action_failed` | error | `app/actions/abandonedCartActions.ts` |
| `abandoned_cart_recovered_mark_failed` | error | `lib/abandoned-cart.ts` |
| `abandoned_cart_snapshot_failed` | error | `app/actions/abandonedCartActions.ts` |
| `abandoned_cart_snapshot_invalid_payload` | warn | `app/actions/abandonedCartActions.ts` |
| `abandoned_cart_snapshot_rate_limited` | warn | `app/actions/abandonedCartActions.ts` |
| `abandoned_cart_upsert_failed` | error | `lib/abandoned-cart.ts` |
| `address_create_failed` | error | `app/actions/addressActions.ts` |
| `address_delete_failed` | error | `app/actions/addressActions.ts` |
| `address_get_failed` | error | `app/actions/addressActions.ts` |
| `address_set_default_failed` | error | `app/actions/addressActions.ts` |
| `address_update_failed` | error | `app/actions/addressActions.ts` |
| `admin_operations_health_error` | error | `app/api/admin/operations-health/route.ts` |
| `admin_stats_error` | error | `app/api/admin/stats/route.ts` |
| `approve_binance_email_failed` | error | `app/api/orders/[id]/approve-binance/route.ts` |
| `approve_binance_error` | error | `app/api/orders/[id]/approve-binance/route.ts` |
| `approve_binance_success` | info | `app/api/orders/[id]/approve-binance/route.ts` |
| `auth_jwt_revalidation_failed` | error | `app/api/auth/[...nextauth]/route.ts` |
| `banners_delete_failed` | error | `app/api/banners/[id]/route.ts` |
| `banners_get_failed` | error | `app/api/banners/route.ts` |
| `banners_post_failed` | error | `app/api/banners/route.ts` |
| `banners_put_failed` | error | `app/api/banners/[id]/route.ts` |
| `bcv_dolarapi_bad_status` | error | `lib/bcv-rate.ts` |
| `bcv_dolarapi_failed` | error | `lib/bcv-rate.ts` |
| `bcv_dolarapi_invalid_response` | error | `lib/bcv-rate.ts` |
| `bcv_pydolarve_bad_status` | error | `lib/bcv-rate.ts` |
| `bcv_pydolarve_failed` | error | `lib/bcv-rate.ts` |
| `bcv_pydolarve_invalid_response` | error | `lib/bcv-rate.ts` |
| `bcv_unexpected_error` | error | `lib/bcv-rate.ts` |
| `bulk_cancel_email_failed` | error | `app/api/orders/bulk-status-update/route.ts` |
| `cart_delete_failed` | error | `app/api/cart/route.ts` |
| `cart_get_failed` | error | `app/api/cart/route.ts` |
| `cart_item_delete_failed` | error | `app/api/cart/items/[productId]/route.ts` |
| `cart_items_patch_failed` | error | `app/api/cart/items/route.ts` |
| `cart_merge_failed` | error | `app/api/cart/merge/route.ts` |
| `cart_recover_failed` | error | `app/api/cart/recover/route.ts` |
| `categories_delete_failed` | error | `app/api/categories/[id]/route.ts` |
| `categories_get_failed` | error | `app/api/categories/route.ts` |
| `categories_post_failed` | error | `app/api/categories/route.ts` |
| `categories_put_failed` | error | `app/api/categories/[id]/route.ts` |
| `categories_sync_failed` | error | `app/api/categories/sync/route.ts` |
| `checkout_duplicate_prevented` | warn | `app/api/orders/route.ts` |
| `checkout_failed` | error | `app/api/orders/route.ts` |
| `checkout_order_not_found_after_create` | error | `app/api/orders/route.ts` |
| `checkout_restore_stock_product_missing` | warn | `lib/checkout-order.ts` |
| `checkout_validation_failed` | warn | `app/api/orders/route.ts` |
| `confirm_email_failed` | error | `app/api/account/confirm-email/route.ts` |
| `coupon_rejected` | warn | `lib/coupons.ts` |
| `coupon_validate_failed` | error | `app/api/coupons/validate/route.ts` |
| `coupons_delete_failed` | error | `app/api/coupons/[id]/route.ts` |
| `coupons_get_failed` | error | `app/api/coupons/route.ts` |
| `coupons_patch_failed` | error | `app/api/coupons/[id]/route.ts` |
| `coupons_post_failed` | error | `app/api/coupons/route.ts` |
| `coupons_put_failed` | error | `app/api/coupons/[id]/route.ts` |
| `cron_abandoned_cart` | info | `app/api/cron/abandoned-cart/route.ts` |
| `cron_abandoned_cart_24h_failed` | error | `app/api/cron/abandoned-cart/route.ts` |
| `cron_abandoned_cart_72h_failed` | error | `app/api/cron/abandoned-cart/route.ts` |
| `cron_abandoned_cart_coupon_failed` | error | `app/api/cron/abandoned-cart/route.ts` |
| `cron_abandoned_cart_error` | error | `app/api/cron/abandoned-cart/route.ts` |
| `cron_bcv_no_api_data` | error | `app/api/cron/update-bcv-rate/route.ts` |
| `cron_bcv_rate_updated` | info | `app/api/cron/update-bcv-rate/route.ts` |
| `cron_bcv_record_success_failed` | error | `app/api/cron/update-bcv-rate/route.ts` |
| `cron_bcv_suspicious_jump` | error | `app/api/cron/update-bcv-rate/route.ts` |
| `cron_bcv_unexpected_error` | error | `app/api/cron/update-bcv-rate/route.ts` |
| `cron_purge_payment_uploads` | info | `app/api/cron/purge-payment-uploads/route.ts` |
| `cron_purge_payment_uploads_error` | error | `app/api/cron/purge-payment-uploads/route.ts` |
| `cron_purge_product_views` | info | `app/api/cron/purge-product-views/route.ts` |
| `cron_purge_product_views_error` | error | `app/api/cron/purge-product-views/route.ts` |
| `cron_purge_temporary_data` | info | `app/api/cron/purge-temporary-data/route.ts` |
| `cron_purge_temporary_data_error` | error | `app/api/cron/purge-temporary-data/route.ts` |
| `cron_purge_uploads_mark_deleted_failed` | error | `app/api/cron/purge-payment-uploads/route.ts` |
| `cron_purge_uploads_r2_failed` | error | `app/api/cron/purge-payment-uploads/route.ts` |
| `cron_review_request` | info | `app/api/cron/review-request/route.ts` |
| `cron_review_request_error` | error | `app/api/cron/review-request/route.ts` |
| `data_store_read_failed` | error | `lib/data-store.ts` |
| `data_store_settings_corrupt` | error | `lib/data-store.ts` |
| `data_store_settings_missing` | warn | `lib/data-store.ts` |
| `delivered_email_skipped_no_email` | warn | `app/api/orders/[id]/status/route.ts` |
| `email_change_confirm_empty` | warn | `lib/resend.tsx` |
| `email_change_confirm_failed` | error | `app/account/actions.ts` |
| `env_deployment_env_invalid` | warn | `lib/env-validation.ts` |
| `env_production_vars_missing` | warn | `lib/env-validation.ts` |
| `env_recommended_vars_missing` | warn | `lib/env-validation.ts` |
| `env_retention_days_invalid` | warn | `lib/env-validation.ts` |
| `events_view_failed` | error | `app/api/events/view/route.ts` |
| `exchange_rate_config_get_failed` | error | `app/api/config/exchange-rate/route.ts` |
| `exchange_rate_invalid_config` | error | `lib/exchange-rate.ts` |
| `exchange_rate_non_positive` | error | `lib/exchange-rate.ts` |
| `exchange_rate_read_failed` | error | `app/actions/configActions.ts` |
| `homepage_config_get_failed` | error | `app/api/config/homepage/route.ts` |
| `image_processing_sharp_load_failed` | error | `lib/image-processing.ts` |
| `indexnow_ping_failed` | error | `lib/indexnow.ts` |
| `indexnow_response_not_ok` | warn | `lib/indexnow.ts` |
| `lookup_public_order_failed` | error | `app/actions/orderLookupActions.ts` |
| `margin_presets_read_failed` | error | `app/actions/configActions.ts` |
| `merchant_feed_get_failed` | error | `app/api/merchant-feed/route.ts` |
| `migrate_slugs_failed` | error | `app/api/admin/migrate-slugs/route.ts` |
| `order_cancel_email_failed` | error | `app/api/orders/[id]/status/route.ts` |
| `order_cancelled_email_empty` | warn | `lib/resend.tsx` |
| `order_cancelled_stock_reverted` | info | `app/api/orders/[id]/status/route.ts` |
| `order_confirmation_email_empty` | warn | `lib/resend.tsx` |
| `order_confirmation_email_failed` | error | `app/api/orders/route.ts` |
| `order_confirmation_skipped_no_email` | warn | `app/api/orders/route.ts` |
| `order_delivered_email_empty` | warn | `lib/resend.tsx` |
| `order_delivered_email_failed` | error | `app/api/orders/[id]/status/route.ts` |
| `orders_export_executed` | info | `app/api/orders/export.csv/route.ts` |
| `orders_export_limit_exceeded` | warn | `app/api/orders/export.csv/route.ts` |
| `orders_get_failed` | error | `app/api/orders/route.ts` |
| `orders_new_count_failed` | error | `app/api/orders/new-count/route.ts` |
| `password_reset_email_empty` | warn | `lib/resend.tsx` |
| `password_reset_expired_token_cleanup_failed` | error | `app/actions/authActions.ts` |
| `password_reset_request_failed` | error | `app/actions/authActions.ts` |
| `password_reset_token_verify_failed` | error | `app/actions/authActions.ts` |
| `payment_proof_signed_url_failed` | error | `app/api/orders/[id]/payment-proof/route.ts` |
| `payment_proof_untrusted_legacy_host` | warn | `app/api/orders/[id]/payment-proof/route.ts` |
| `payment_rejected_email_empty` | warn | `lib/resend.tsx` |
| `payment_validated_email_empty` | warn | `lib/resend.tsx` |
| `pricing_params_read_failed` | error | `app/actions/configActions.ts` |
| `product_costs_get_failed` | error | `app/api/admin/product-costs/route.ts` |
| `product_create_failed` | error | `app/actions/productActions.ts` |
| `product_csv_import_failed` | error | `app/actions/productActions.ts` |
| `product_delete_failed` | error | `app/actions/productActions.ts` |
| `product_price_update_failed` | error | `app/actions/productActions.ts` |
| `product_r2_delete_failed` | error | `app/actions/productActions.ts` |
| `product_recalculate_prices_failed` | error | `app/actions/productActions.ts` |
| `product_reviews_get_failed` | error | `app/api/products/[id]/reviews/route.ts` |
| `product_reviews_post_failed` | error | `app/api/products/[id]/reviews/route.ts` |
| `product_reviews_revalidate_failed` | error | `app/api/products/[id]/reviews/route.ts` |
| `product_snapshot_refresh_failed` | error | `app/actions/productSnapshotActions.ts` |
| `product_stock_update_failed` | error | `app/actions/productActions.ts` |
| `product_update_failed` | error | `app/actions/productActions.ts` |
| `product_video_job_mark_failed` | error | `app/actions/productActions.ts` |
| `product_visibility_failed` | error | `app/actions/productActions.ts` |
| `promotions_delete_failed` | error | `app/api/promotions/[id]/route.ts` |
| `promotions_get_failed` | error | `app/api/promotions/route.ts` |
| `promotions_post_failed` | error | `app/api/promotions/route.ts` |
| `promotions_put_failed` | error | `app/api/promotions/[id]/route.ts` |
| `register_from_order_action_failed` | error | `app/actions/authActions.ts` |
| `register_from_order_success` | info | `app/actions/authActions.ts` |
| `register_user_action_failed` | error | `app/actions/authActions.ts` |
| `resend_api_key_missing` | warn | `lib/resend.tsx` |
| `resend_confirmation_failed` | error | `app/api/orders/[id]/resend-confirmation/route.ts` |
| `resend_confirmation_success` | info | `app/api/orders/[id]/resend-confirmation/route.ts` |
| `resend_from_address_absent` | warn | `lib/resend.tsx` |
| `resend_from_address_missing` | error | `lib/resend.tsx` |
| `resend_send_exception` | error | `lib/resend.tsx` |
| `resend_send_failed` | error | `lib/resend.tsx` |
| `reset_password_failed` | error | `app/actions/authActions.ts` |
| `restock_email_empty` | warn | `lib/resend.tsx` |
| `restock_email_send_failed` | error | `app/actions/restockActions.ts` |
| `restock_notifications_dispatch_failed` | error | `app/actions/restockActions.ts` |
| `restock_notifications_sent` | info | `app/actions/restockActions.ts` |
| `restock_subscribe_failed` | error | `app/actions/restockActions.ts` |
| `restock_trigger_unauthorized` | warn | `app/actions/restockActions.ts` |
| `review_request_email_empty` | warn | `lib/resend.tsx` |
| `reviews_author_patch_failed` | error | `app/api/reviews/[id]/route.ts` |
| `reviews_auto_approve_failed` | error | `app/api/reviews/auto-approve/route.ts` |
| `reviews_delete_failed` | error | `app/api/reviews/[id]/route.ts` |
| `reviews_get_failed` | error | `app/api/reviews/route.ts` |
| `reviews_patch_failed` | error | `app/api/reviews/[id]/route.ts` |
| `reviews_revalidate_failed` | error | `app/api/reviews/[id]/route.ts` |
| `reviews_upload_photo_failed` | error | `app/api/reviews/upload-photo/route.ts` |
| `settings_put_failed` | error | `app/api/settings/route.ts` |
| `shipping_email_empty_params` | warn | `lib/resend.tsx` |
| `shipping_email_failed` | error | `app/api/orders/[id]/status/route.ts` |
| `shipping_email_skipped_no_email` | warn | `app/api/orders/[id]/status/route.ts` |
| `shipping_estimates_corrupt` | error | `lib/shipping-estimates-db.ts` |
| `shipping_estimates_read_failed` | error | `lib/shipping-estimates-db.ts` |
| `site_content_update_failed` | error | `app/actions/siteContentActions.ts` |
| `site_shell_build` | info | `lib/site-shell-cache.ts` |
| `site_shell_fallback` | warn | `lib/site-shell-cache.ts` |
| `slug_redirect_resolve_failed` | error | `lib/slug-redirects.ts` |
| `slug_redirect_save_failed` | error | `lib/slug-redirects.ts` |
| `update_password_failed` | error | `app/account/actions.ts` |
| `update_user_details_failed` | error | `app/account/actions.ts` |
| `upload_proof_cleanup_failed` | error | `app/api/checkout/upload-proof/route.ts` |
| `upload_proof_failed` | error | `app/api/checkout/upload-proof/route.ts` |
| `upload_proof_sharp_failed` | error | `lib/image-processing.ts` |
| `upload_proof_sharp_unavailable` | warn | `lib/image-processing.ts` |
| `upload_r2_error` | error | `app/api/upload/route.ts` |
| `upload_session_failed` | error | `app/api/checkout/upload-session/route.ts` |
| `upload_video_delete_error` | error | `app/api/upload-video/route.ts` |
| `upload_video_job_failed` | error | `app/api/upload-video/route.ts` |
| `upload_video_job_mark_failed` | error | `app/api/upload-video/route.ts` |
| `upload_video_post_error` | error | `app/api/upload-video/route.ts` |
| `upload_video_r2_delete_failed` | error | `app/api/upload-video/route.ts` |
| `upload_video_temp_cleanup_failed` | error | `app/api/upload-video/route.ts` |
| `upstash_fallback_to_memory` | warn | `lib/rate-limit.ts` |
| `upstash_http_error` | error | `lib/rate-limit.ts` |
| `upstash_unexpected_response` | error | `lib/rate-limit.ts` |
| `welcome_email_empty` | warn | `lib/resend.tsx` |
| `wishlist_add_failed` | error | `app/actions/wishlistActions.ts` |
| `wishlist_clear_failed` | error | `app/actions/wishlistActions.ts` |
| `wishlist_get_failed` | error | `app/actions/wishlistActions.ts` |
| `wishlist_merge_failed` | error | `app/actions/wishlistActions.ts` |
| `wishlist_remove_failed` | error | `app/actions/wishlistActions.ts` |

## Excepciones documentadas (console permitido)

| Archivo | Motivo |
|---|---|
| `lib/safe-logger.ts` | Único sink autorizado en runtime server |
| `app/error.tsx` | Client error boundary |
| `app/account/orders/[id]/error.tsx` | Client error boundary |
| `app/admin/error.tsx` | Client error boundary |
| `app/admin/orders/error.tsx` | Client error boundary |
| `lib/e2e-axe.ts` | Helper E2E Axe |
| `lib/e2e-db-guard.ts` | Guard E2E de BD |
