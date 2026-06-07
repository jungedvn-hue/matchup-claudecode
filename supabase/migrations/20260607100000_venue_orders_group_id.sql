-- Venue Commerce — group F&B ordering ("tăng nước" → "đặt món")
-- Group members order drinks/food from the venue linked to their group
-- (groups.venue_id). Orders reuse venue_orders; group_id attributes the order
-- back to the group for BI / "group orders" views. session_id stays NULL for
-- group orders. Payment via VietQR (venue bank); card (Visa/Master) is a later phase.

ALTER TABLE public.venue_orders
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS venue_orders_group_idx ON public.venue_orders(group_id);

-- RLS unchanged: insert still gated by player_id = auth.uid(); read by player or
-- venue owner. Group host visibility of group orders can be layered in later.
