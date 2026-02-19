require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase connection...');

    // Try to select 1 record from 'outlets'
    const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Koneksi Gagal:', error.message);
        console.error('Detail:', error);
    } else {
        console.log('Koneksi Sukses!');
        console.log('Data sample:', data);
    }
}

testConnection();
