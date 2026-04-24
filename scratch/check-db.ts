import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yinmmgcqduvhtwmqoujj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zqnbouoxgfZChIEIsRz8Kg_Cc-I-Xfq";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log("Fetching one tournament...");
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching tournament:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Full tournament object:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No tournaments found.");
  }
}

checkSchema();
