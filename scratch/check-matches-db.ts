import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yinmmgcqduvhtwmqoujj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zqnbouoxgfZChIEIsRz8Kg_Cc-I-Xfq";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMatchesSchema() {
  console.log("Checking tour_matches schema...");
  const { data, error } = await supabase
    .from('tour_matches')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching matches:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns in tour_matches:", Object.keys(data[0]));
  } else {
    console.log("No data in tour_matches, table might be empty.");
  }
}

checkMatchesSchema();
