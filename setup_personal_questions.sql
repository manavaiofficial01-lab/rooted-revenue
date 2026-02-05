-- Create the personal_questions table to store question definitions and bank eligibility rules
-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.personal_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  key text NOT NULL,
  question_text text NOT NULL,
  label text NULL,
  category text NULL DEFAULT 'Personal Loan'::text,
  options jsonb NULL DEFAULT '["Yes", "No"]'::jsonb,
  is_active boolean NULL DEFAULT true,
  sort_order integer NULL,
  yes_eligible_banks text[] NULL DEFAULT '{}'::text[],
  no_eligible_banks text[] NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT personal_questions_pkey PRIMARY KEY (id),
  CONSTRAINT personal_questions_key_key UNIQUE (key)
) TABLESPACE pg_default;

-- Seed/Update personal loan questions with their specific bank logic
INSERT INTO public.personal_questions (key, question_text, label, category, sort_order, yes_eligible_banks, no_eligible_banks) VALUES
('q1', 'Do you have a Gold Loan currently active?', 'Gold Loan Status', 'Personal Loan', 1, ARRAY['INTERNAL_PLACEHOLDER'], ARRAY['INTERNAL_PLACEHOLDER']),
('q2', 'Do you currently have an active Credit Card?', 'Credit Connectivity', 'Personal Loan', 2, ARRAY['INTERNAL_PLACEHOLDER'], ARRAY['INTERNAL_PLACEHOLDER']),
('q3', 'Does the applicant have the last 3 months'' pay slips?', 'Pay-slip Verification', 'Personal Loan', 3, 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED', 'FINNABLE', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK', 'ICICI', 'ICICI BANK', 'YES BANK', 'HDFC', 'HDFC BANK', 'AXIS BANK', 'INDUSIND', 'L&T FINANCE', 'SRIRAM', 'UTKASH', 'UTKARSH'], 
    ARRAY['INCRED/FINABLE', 'AXIS FINANCE']),
('q4', 'Does the applicant have a CIBIL score more than 700?', 'Bureau Standing (>700)', 'Personal Loan', 4, 
    ARRAY['ICICI BANK', 'IDFC BANK', 'YES BANK', 'HDFC BANK', 'AXIS BANK', 'AXIS FINANCE', 'ADITYA BIRLA', 'PRIMAL', 'CHOLA', 'SRIRAM', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED/FINABLE', 'SMFG', 'UTKARSH', 'INCRED', 'FINNABLE', 'HDFC', 'ICICI', 'L&T FINANCE', 'INDUSIND', 'UTKASH'], 
    ARRAY['PRIMAL', 'CHOLA', 'SRIRAM', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED/FINABLE', 'SMFG', 'UTKARSH']),
('q5', 'Is the monthly salary more than ₹25,000?', 'Income Threshold (>25k)', 'Personal Loan', 5, 
    ARRAY['ICICI BANK', 'HDFC BANK', 'BAJAJ', 'POONAWALA', 'SRIRAM', 'YES BANK', 'AXIS BANK', 'PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK'], 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK', 'YES BANK']),
('q6', 'Does the applicant have PF/PT deductions in their company?', 'Statutory Deductions', 'Personal Loan', 6, 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'IDFC BANK', 'UTKARSH', 'ICICI BANK', 'YES BANK', 'HDFC BANK', 'AXIS BANK', 'INCRED/FINABLE', 'SMFG', 'SRIRAM', 'POONAWALA', 'AXIS FINANCE'], 
    ARRAY['INCRED/FINABLE', 'SMFG', 'SRIRAM', 'POONAWALA', 'AXIS FINANCE']),
('q7', 'Does the applicant have a Residence Address Proof?', 'Address Verification', 'Personal Loan', 7, 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'IDFC BANK', 'UTKARSH', 'POONAWALA', 'SMFG', 'AXIS FINANCE', 'INCRED/FINABLE', 'ICICI BANK', 'YES BANK', 'HDFC BANK', 'AXIS BANK'], 
    ARRAY['INCRED/FINABLE', 'ICICI BANK', 'YES BANK', 'HDFC BANK', 'AXIS BANK']),
('q8', 'Does the applicant have any cheque bounces in the last 6 months?', 'Instrument Clearance (6m)', 'Personal Loan', 8, 
    ARRAY[]::TEXT[], 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED', 'FINNABLE', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK', 'ICICI', 'ICICI BANK', 'YES BANK', 'HDFC', 'HDFC BANK', 'AXIS BANK', 'INDUSIND', 'L&T FINANCE', 'SRIRAM', 'UTKASH', 'UTKARSH']),
('Q9', 'is company is Listed', 'COMPANY LIST ', 'Personal Loan', 9, 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED', 'FINNABLE', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK', 'ICICI', 'ICICI BANK', 'YES BANK', 'HDFC', 'HDFC BANK', 'AXIS BANK', 'INDUSIND', 'L&T FINANCE', 'SRIRAM', 'UTKASH', 'UTKARSH'], 
    ARRAY['POONAWALA', 'IDFC BANK', 'ICICI', 'ICICI BANK', 'YES BANK', 'HDFC', 'HDFC BANK', 'AXIS BANK', 'INDUSIND', 'L&T FINANCE'])
ON CONFLICT (key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    label = EXCLUDED.label,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    yes_eligible_banks = EXCLUDED.yes_eligible_banks,
    no_eligible_banks = EXCLUDED.no_eligible_banks;
