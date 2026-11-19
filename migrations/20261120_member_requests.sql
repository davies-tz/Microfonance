ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS created_by text REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS archived_at timestamp;

CREATE TABLE IF NOT EXISTS public.member_requests (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('CREATE', 'REMOVE')),
  state text NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by text NOT NULL REFERENCES public.users(id),
  customer_id text REFERENCES public.customers(id),
  payload jsonb,
  reason text,
  reviewed_by text REFERENCES public.users(id),
  reviewed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_requests_requested_by_idx ON public.member_requests (requested_by);
CREATE INDEX IF NOT EXISTS customers_created_by_idx ON public.customers (created_by);
CREATE UNIQUE INDEX IF NOT EXISTS member_requests_pending_remove_idx
  ON public.member_requests (customer_id)
  WHERE kind = 'REMOVE' AND state = 'PENDING';
