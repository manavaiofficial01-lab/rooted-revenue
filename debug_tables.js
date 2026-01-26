import { supabase } from './supabase';

async function checkTables() {
    const { data: users, error: uError } = await supabase.from('users').select('*').limit(1);
    console.log('Users table exists:', !uError);

    const { data: auth, error: aError } = await supabase.from('auth').select('*').limit(1);
    console.log('Auth table exists:', !aError);
    if (aError) console.log('Auth error:', aError.message);
}

checkTables();
