# PayOS — Setup Guide cho MatchUp Coin

## 1. Đăng ký PayOS Business

1. Vào https://my.payos.vn/register
2. Đăng ký bằng email + số điện thoại
3. KYC: CCCD + tài khoản ngân hàng (cá nhân hoặc doanh nghiệp đều OK)
4. Sau khi duyệt (thường < 24h), vào **Cài đặt → API Keys**

Lấy 3 giá trị:
- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`

## 2. Cấu hình Supabase Secrets

Vào Supabase Dashboard → Project → **Edge Functions → Secrets**, thêm:

```
PAYOS_CLIENT_ID=<paste from PayOS>
PAYOS_API_KEY=<paste from PayOS>
PAYOS_CHECKSUM_KEY=<paste from PayOS>
APP_URL=https://app.matchup.asia
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` đã có sẵn — không cần thêm.

## 3. Apply migration

```bash
# Từ Supabase Dashboard → SQL Editor, paste nội dung file:
# supabase/migrations/20260514200000_matchup_coin.sql
```

Hoặc dùng CLI:
```bash
supabase db push
```

## 4. Deploy Edge Functions

```bash
supabase functions deploy payment-create
supabase functions deploy payment-webhook --no-verify-jwt
```

(Hoặc `supabase functions deploy` để deploy toàn bộ — config.toml sẽ tự áp dụng `verify_jwt = false` cho webhook.)

## 5. Cấu hình Webhook trên PayOS

PayOS Dashboard → **Cài đặt → Webhook**, paste URL:

```
https://yinmmgcqduvhtwmqoujj.supabase.co/functions/v1/payment-webhook
```

Lưu. PayOS sẽ gửi 1 confirmation ping — function trả về 200 OK.

## 6. Test end-to-end

1. Vào app → Profile → MatchUp Coin → Nạp xu
2. Chọn gói nhỏ nhất (50.000đ → 500 xu)
3. Quét QR bằng app ngân hàng (MB, ACB, VCB, Techcombank, …)
4. Sau khi chuyển khoản: trang sẽ tự cập nhật → success animation → 500 xu vào ví
5. Check `payment_orders` table: status = 'paid'
6. Check `coin_transactions` table: 1 row type='purchase'
7. Check `payment_webhooks_log` table: 1 row processed=true

## 7. Troubleshooting

- **"PayOS not configured"** → kiểm tra Supabase Edge Function secrets
- **Webhook không trigger** → kiểm tra PayOS Dashboard có lưu URL chưa, format đúng `https://...supabase.co/functions/v1/payment-webhook`
- **Signature invalid** → kiểm tra `PAYOS_CHECKSUM_KEY` đúng chính xác (copy paste, không có space)
- **Coins không cộng** → check `payment_webhooks_log.error_message` table

## 8. Phí PayOS

- Free tier: 0 phí, max 100 giao dịch/tháng
- Sau đó: ~1.5% per transaction (cập nhật theo PayOS pricing)

## 9. Mở rộng gateways khác (future)

Code architecture đã sẵn sàng cho multi-gateway:
- `payment_orders.gateway` enum: `payos | stripe | paypal | momo | ...`
- Mỗi gateway: 1 cặp Edge Functions `payment-create-<gw>` + `payment-webhook-<gw>`
- Frontend pick gateway trên TopupPage UI
