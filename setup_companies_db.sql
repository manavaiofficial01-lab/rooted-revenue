-- Create a table for company list master files
CREATE TABLE IF NOT EXISTS company_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL, -- Firebase Storage URL
    file_path TEXT NOT NULL, -- Firebase Storage path for deletion
    color_code TEXT DEFAULT '#818cf8',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

