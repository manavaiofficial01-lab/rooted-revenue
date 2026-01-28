import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cktllndklbmadlxtxejf.supabase.co'

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdGxsbmRrbGJtYWRseHR4ZWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTkxMDQsImV4cCI6MjA4NDc3NTEwNH0.XxubvaSwX62oIhIIduWJO1v-TbnDSU55Q0zfRVhMqqE"

export const supabase = createClient(supabaseUrl, supabaseKey);
