-- Group menu curation — Social Host features a subset of the linked venue's menu.
-- Default (no rows) = the group syncs the venue's full published menu.
-- If a group has rows here, only those services show in the group's order/gift flow.
-- Goal: long-term mutual benefit between venue owner (fulfils) and social host (curates).

CREATE TABLE IF NOT EXISTS public.group_menu_services (
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.venue_services(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, service_id)
);

CREATE INDEX IF NOT EXISTS group_menu_services_group_idx ON public.group_menu_services(group_id);

ALTER TABLE public.group_menu_services ENABLE ROW LEVEL SECURITY;

-- Anyone can read a group's featured menu (members view it to order/gift).
DROP POLICY IF EXISTS "group_menu_services_read" ON public.group_menu_services;
CREATE POLICY "group_menu_services_read" ON public.group_menu_services
  FOR SELECT USING (true);

-- Only the group host curates the featured list.
DROP POLICY IF EXISTS "group_menu_services_write" ON public.group_menu_services;
CREATE POLICY "group_menu_services_write" ON public.group_menu_services
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.host_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.host_user_id = auth.uid()));
