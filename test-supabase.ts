import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yinmmgcqduvhtwmqoujj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zqnbouoxgfZChIEIsRz8Kg_Cc-I-Xfq";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('tournaments')
    .insert([{
      id: "tour-test-123",
      name: "Test Tour",
      date: "2024-05-01",
      location: "Test Location",
      format: "round_robin",
      points_per_game: 11,
      win_by_two: true,
      status: "draft",
      ranking_priority: ["wins", "head_to_head"],
      host_id: '00000000-0000-0000-0000-000000000000'
    }])
    .select()
    .single();

  console.log("Error:", error);
  console.log("Data:", data);
}

test();
