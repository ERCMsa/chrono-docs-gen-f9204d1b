-- Add balance column to workers
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS current_balance numeric NOT NULL DEFAULT 0;

-- Acompte transactions table
CREATE TABLE public.acompte_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('add','subtract')),
  amount numeric NOT NULL CHECK (amount > 0),
  previous_balance numeric NOT NULL,
  new_balance numeric NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acompte_worker ON public.acompte_transactions(worker_id);
CREATE INDEX idx_acompte_date ON public.acompte_transactions(transaction_date DESC);

ALTER TABLE public.acompte_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read acompte_transactions" ON public.acompte_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert acompte_transactions" ON public.acompte_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update acompte_transactions" ON public.acompte_transactions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete acompte_transactions" ON public.acompte_transactions FOR DELETE USING (true);