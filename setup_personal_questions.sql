-- Add columns to client_logins to track Yes/No answers explicitly as arrays
ALTER TABLE client_logins 
ADD COLUMN IF NOT EXISTS yes_answers TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS no_answers TEXT[] DEFAULT '{}';

-- Create the personal_questions table to store question definitions and bank eligibility rules
CREATE TABLE IF NOT EXISTS personal_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g., 'q1', 'q2'
    question_text TEXT NOT NULL,
    label TEXT, -- Diagnostic label, e.g., 'Gold Loan Status'
    category TEXT DEFAULT 'Personal Loan',
    options JSONB DEFAULT '["Yes", "No"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    sort_order INT,
    -- New columns to handle the bank logic via DB
    yes_eligible_banks TEXT[] DEFAULT '{}', -- Banks matching if answer is "Yes"
    no_eligible_banks TEXT[] DEFAULT '{}',  -- Banks matching if answer is "No"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial personal loan questions with their specific bank logic
INSERT INTO personal_questions (key, question_text, label, sort_order, yes_eligible_banks, no_eligible_banks) VALUES
('q1', 'Do you have a Gold Loan currently active?', 'Gold Loan Status', 1, ARRAY['INTERNAL_PLACEHOLDER'], ARRAY['INTERNAL_PLACEHOLDER']),
('q2', 'Do you currently have an active Credit Card?', 'Credit Connectivity', 2, ARRAY['INTERNAL_PLACEHOLDER'], ARRAY['INTERNAL_PLACEHOLDER']),
('q3', 'Does the applicant have the last 3 months'' pay slips?', 'Pay-slip Verification', 3, 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED', 'FINNABLE', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK', 'ICICI', 'ICICI BANK', 'YES BANK', 'HDFC', 'HDFC BANK', 'AXIS BANK', 'INDUSIND', 'L&T FINANCE', 'SRIRAM', 'UTKASH', 'UTKARSH'], 
    ARRAY['INCRED/FINABLE']),
('q4', 'Does the applicant have a CIBIL score more than 700?', 'Bureau Standing (>700)', 4, 
    ARRAY['ICICI BANK', 'IDFC BANK', 'YES BANK', 'HDFC BANK', 'AXIS BANK', 'AXIS FINANCE', 'ADITYA BIRLA', 'PRIMAL', 'CHOLA', 'SRIRAM', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED/FINABLE', 'SMFG', 'UTKARSH'], 
    ARRAY['PRIMAL', 'CHOLA', 'SRIRAM', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED/FINABLE', 'SMFG', 'UTKARSH']),
('q5', 'Is the monthly salary more than ₹25,000?', 'Income Threshold (>25k)', 5, 
    ARRAY['ICICI BANK', 'HDFC BANK', 'BAJAJ', 'POONAWALA', 'SRIRAM', 'YES BANK', 'AXIS BANK', 'PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK'], 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK', 'YES BANK']),
('q6', 'Does the applicant have PF/PT deductions in their company?', 'Statutory Deductions', 6, 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'IDFC BANK', 'UTKARSH', 'ICICI BANK', 'YES BANK', 'HDFC BANK', 'AXIS BANK', 'INCRED/FINABLE', 'SMFG', 'SRIRAM', 'POONAWALA', 'AXIS FINANCE'], 
    ARRAY['INCRED/FINABLE', 'SMFG', 'SRIRAM', 'POONAWALA', 'AXIS FINANCE']),
('q7', 'Does the applicant have a Residence Address Proof?', 'Address Verification', 7, 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'IDFC BANK', 'UTKARSH', 'POONAWALA', 'SMFG', 'AXIS FINANCE', 'INCRED/FINABLE', 'ICICI BANK', 'YES BANK', 'HDFC BANK', 'AXIS BANK'], 
    ARRAY['INCRED/FINABLE', 'ICICI BANK', 'YES BANK', 'HDFC BANK', 'AXIS BANK']),
('q8', 'Does the applicant have any cheque bounces in the last 6 months?', 'Instrument Clearance (6m)', 8, 
    ARRAY[]::TEXT[], 
    ARRAY['PRIMAL', 'CHOLA', 'ADITYA BIRLA', 'TATA CAPITAL', 'BAJAJ', 'POONAWALA', 'INCRED', 'FINNABLE', 'INCRED/FINABLE', 'SMFG', 'AXIS FINANCE', 'IDFC BANK', 'ICICI', 'ICICI BANK', 'YES BANK', 'HDFC', 'HDFC BANK', 'AXIS BANK', 'INDUSIND', 'L&T FINANCE', 'SRIRAM', 'UTKASH', 'UTKARSH'])
ON CONFLICT (key) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    yes_eligible_banks = EXCLUDED.yes_eligible_banks,
    no_eligible_banks = EXCLUDED.no_eligible_banks;
