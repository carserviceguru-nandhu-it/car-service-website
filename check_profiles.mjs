
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .ilike('name', '%Devibharathi%');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Profiles:', JSON.stringify(data, null, 2));
}

checkProfiles();
