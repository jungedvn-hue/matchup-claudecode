import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yinmmgcqduvhtwmqoujj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zqnbouoxgfZChIEIsRz8Kg_Cc-I-Xfq";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log("Checking tour_categories schema...");
  const { data, error } = await supabase
    .from('tour_categories')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching categories:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns in tour_categories:", Object.keys(data[0]));
  } else {
    console.log("No data in tour_categories, trying to fetch from tour_matches to see if table is empty.");
    const { data: matchData } = await supabase.from('tour_matches').select('*').limit(1);
    console.log("Matches data found:", matchData?.length || 0);
  }
}

checkSchema();
