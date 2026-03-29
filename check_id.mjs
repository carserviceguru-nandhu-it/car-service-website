
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkById() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', 'c5d855ac-cc2c-46c7-930c-7df27744ff5f')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Result:', JSON.stringify(data, null, 2));
}

checkById();
