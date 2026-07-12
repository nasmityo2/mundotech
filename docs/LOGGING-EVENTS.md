# Catálogo de eventos de logging — MundoTech

## Reglas

- Los nombres usan snake_case.
- Ningún evento contiene datos variables.
- El contexto acepta únicamente `SafeLogContext`.
- Nunca registrar email, teléfono, cédula, dirección, referencia, token, object key, URL firmada, credenciales o body.
- Sentry recibe únicamente un Error reconstruido y sanitizado.

## Eventos

| Evento | Nivel | Origen | Contexto permitido | Acción operativa |
|---|---|---|---|---|
| `order_confirmation_email_failed` | error | `app/api/orders/route.ts` | orderId, provider, operation | Reenviar desde admin |
| `order_confirmation_skipped_no_email` | warn | `app/api/orders/route.ts` | orderId, operation | Revisar datos del pedido |
| `checkout_validation_failed` | warn | `app/api/orders/route.ts` | status, operation | Revisar validación |
| `checkout_duplicate_prevented` | warn | `app/api/orders/route.ts` | orderId, operation | Revisar duplicados |
| `checkout_order_not_found_after_create` | error | `app/api/orders/route.ts` | orderId, operation | Revisar transacción |
| `checkout_failed` | error | `app/api/orders/route.ts` | operation | Revisar errores de checkout |
| `orders_get_failed` | error | `app/api/orders/route.ts` | route | Revisar BD |
| `order_cancelled_stock_reverted` | info | `app/api/orders/[id]/status/route.ts` | orderId, operation | Monitorear reversión |
| `order_cancel_email_failed` | error | `app/api/orders/[id]/status/route.ts` | orderId, provider, operation | Reenviar manualmente |
| `shipping_email_skipped_no_email` | warn | `app/api/orders/[id]/status/route.ts` | orderId, operation | Revisar datos del pedido |
| `shipping_email_failed` | error | `app/api/orders/[id]/status/route.ts` | orderId, provider, operation | Reenviar manualmente |
| `order_delivered_email_failed` | error | `app/api/orders/[id]/status/route.ts` | orderId, provider, operation | Reenviar manualmente |
| `delivered_email_skipped_no_email` | warn | `app/api/orders/[id]/status/route.ts` | orderId, operation | Revisar datos del pedido |
| `approve_binance_email_failed` | error | `app/api/orders/[id]/approve-binance/route.ts` | orderId, provider | Reenviar manualmente |
| `approve_binance_success` | info | `app/api/orders/[id]/approve-binance/route.ts` | orderId | Monitorear aprobaciones |
| `approve_binance_error` | error | `app/api/orders/[id]/approve-binance/route.ts` | orderId | Revisar excepción |
| `resend_confirmation_success` | info | `app/api/orders/[id]/resend-confirmation/route.ts` | orderId, operation | Monitorear reenvíos |
| `resend_confirmation_failed` | error | `app/api/orders/[id]/resend-confirmation/route.ts` | orderId, provider, operation | Revisar Resend |
| `orders_export_limit_exceeded` | warn | `app/api/orders/export.csv/route.ts` | count, operation | Ajustar filtros de exportación |
| `orders_export_executed` | info | `app/api/orders/export.csv/route.ts` | count, operation | Monitorear exportaciones |
| `register_user_action_failed` | error | `app/actions/authActions.ts` | operation | Revisar BD |
| `register_from_order_success` | info | `app/actions/authActions.ts` | orderId, operation | Monitorear registros post-compra |
| `register_from_order_action_failed` | error | `app/actions/authActions.ts` | operation | Revisar BD |
| `password_reset_request_failed` | error | `app/actions/authActions.ts` | operation | Revisar BD/Resend |
| `password_reset_token_verify_failed` | error | `app/actions/authActions.ts` | operation | Revisar BD |
| `password_reset_expired_token_cleanup_failed` | error | `app/actions/authActions.ts` | operation | Revisar cleanup |
| `reset_password_failed` | error | `app/actions/authActions.ts` | operation | Revisar transacción |
| `email_change_confirm_failed` | error | `app/account/actions.ts` | operation | Revisar email |
| `update_user_details_failed` | error | `app/account/actions.ts` | operation | Revisar BD |
| `update_password_failed` | error | `app/account/actions.ts` | operation | Revisar BCrypt/BD |
| `auth_jwt_revalidation_failed` | error | `app/api/auth/[...nextauth]/route.ts` | provider | Revisar disponibilidad BD |
| `resend_from_address_missing` | error | `lib/resend.tsx` | provider | Configurar RESEND_FROM_ADDRESS |
| `resend_from_address_absent` | warn | `lib/resend.tsx` | provider, operation | Configurar remitente |
| `resend_send_failed` | error | `lib/resend.tsx` | provider, operation | Revisar Resend |
| `resend_send_exception` | error | `lib/resend.tsx` | provider, operation | Revisar render/envío |
| `resend_api_key_missing` | warn | `lib/resend.tsx` | provider, operation | Configurar RESEND_API_KEY |
| `payment_validated_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `payment_rejected_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `order_confirmation_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `shipping_email_empty_params` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `order_delivered_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `welcome_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `restock_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `abandoned_cart_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar carrito |
| `order_cancelled_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `email_change_confirm_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `review_request_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `password_reset_email_empty` | warn | `lib/resend.tsx` | provider, operation | Revisar datos del pedido |
| `upstash_http_error` | error | `lib/rate-limit.ts` | provider, status | Revisar Upstash |
| `upstash_unexpected_response` | error | `lib/rate-limit.ts` | provider | Revisar API |
| `upstash_fallback_to_memory` | warn | `lib/rate-limit.ts` | provider | Revisar disponibilidad |
| `upload_proof_failed` | error | `app/api/checkout/upload-proof/route.ts` | operation | Revisar R2/BD |
| `upload_proof_cleanup_failed` | error | `app/api/checkout/upload-proof/route.ts` | operation, errorName | Revisar huérfanos |
| `upload_session_failed` | error | `app/api/checkout/upload-session/route.ts` | operation | Revisar BD |
| `upload_r2_error` | error | `app/api/upload/route.ts` | provider, operation | Revisar R2 |
| `upload_video_r2_delete_failed` | error | `app/api/upload-video/route.ts` | provider, operation | Revisar R2 |
| `upload_video_job_mark_failed` | error | `app/api/upload-video/route.ts` | operation | Revisar BD |
| `upload_video_job_failed` | error | `app/api/upload-video/route.ts` | operation | Revisar video processing |
| `upload_video_temp_cleanup_failed` | error | `app/api/upload-video/route.ts` | operation | Revisar archivos temporales |
| `upload_video_post_error` | error | `app/api/upload-video/route.ts` | operation | Revisar upload |
| `upload_video_delete_error` | error | `app/api/upload-video/route.ts` | operation | Revisar R2/BD |
| `reviews_upload_photo_failed` | error | `app/api/reviews/upload-photo/route.ts` | operation | Revisar R2 |
| `cron_purge_temporary_data` | info | `app/api/cron/purge-temporary-data/route.ts` | operation, count, durationMs | Monitorear ejecución |
| `cron_purge_temporary_data_error` | error | `app/api/cron/purge-temporary-data/route.ts` | operation, durationMs | Revisar cron |
| `cron_purge_payment_uploads` | info | `app/api/cron/purge-payment-uploads/route.ts` | count, operation | Monitorear purga |
| `cron_purge_uploads_r2_failed` | error | `app/api/cron/purge-payment-uploads/route.ts` | provider, operation | Revisar R2 |
| `cron_purge_uploads_mark_deleted_failed` | error | `app/api/cron/purge-payment-uploads/route.ts` | operation | Revisar BD |
| `cron_purge_payment_uploads_error` | error | `app/api/cron/purge-payment-uploads/route.ts` | operation | Revisar cron |
| `cron_purge_product_views` | info | `app/api/cron/purge-product-views/route.ts` | count, operation | Monitorear limpieza |
| `cron_purge_product_views_error` | error | `app/api/cron/purge-product-views/route.ts` | operation | Revisar cron |
| `cron_abandoned_cart` | info | `app/api/cron/abandoned-cart/route.ts` | count, operation | Monitorear correos |
| `cron_abandoned_cart_coupon_failed` | error | `app/api/cron/abandoned-cart/route.ts` | operation | Revisar cupón |
| `cron_abandoned_cart_24h_failed` | error | `app/api/cron/abandoned-cart/route.ts` | operation | Revisar envío 24h |
| `cron_abandoned_cart_72h_failed` | error | `app/api/cron/abandoned-cart/route.ts` | operation | Revisar envío 72h |
| `cron_abandoned_cart_error` | error | `app/api/cron/abandoned-cart/route.ts` | operation | Revisar cron |
| `cron_bcv_rate_updated` | info | `app/api/cron/update-bcv-rate/route.ts` | operation | Monitorear tasa BCV |
| `cron_bcv_record_success_failed` | error | `app/api/cron/update-bcv-rate/route.ts` | operation | Revisar BD |
| `cron_bcv_no_api_data` | error | `app/api/cron/update-bcv-rate/route.ts` | operation | Revisar API BCV |
| `cron_bcv_suspicious_jump` | error | `app/api/cron/update-bcv-rate/route.ts` | operation | Revisar salto de tasa |
| `cron_bcv_unexpected_error` | error | `app/api/cron/update-bcv-rate/route.ts` | operation | Revisar cron |
| `cron_review_request` | info | `app/api/cron/review-request/route.ts` | count, operation | Monitorear solicitudes |
| `cron_review_request_error` | error | `app/api/cron/review-request/route.ts` | operation | Revisar cron |
