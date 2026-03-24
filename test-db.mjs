import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: b } = await supabase.from('bookings').select('*').limit(1);
  console.log('Bookings:', b ? b[0] : 'no row');
  
  const { data: p } = await supabase.from('profiles').select('*').eq('role', 'garage').limit(1);
  console.log('Garage Profile:', p ? p[0] : 'no row');
}
main();
