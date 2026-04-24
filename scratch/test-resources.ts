import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yinmmgcqduvhtwmqoujj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zqnbouoxgfZChIEIsRz8Kg_Cc-I-Xfq";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testResources() {
  console.log("Testing insert with referees and courts...");
  const { data, error } = await supabase
    .from('tournaments')
    .insert([{
      id: "tour-resource-test-" + Date.now(),
      name: "Resource Test Tour",
      date: "2024-05-01",
      location: "Test Location",
      format: "round_robin",
      points_per_game: 11,
      win_by_two: true,
      status: "draft",
      ranking_priority: ["wins"],
      host_id: '3f9e459e-f60c-49f7-98ee-bf62b89b0bd2',
      referees: [{ id: 'ref-1', name: 'John Doe' }],
      courts: [{ id: 'court-1', name: 'Court 1' }]
    }])
    .select()
    .single();

  if (error) {
    console.error("Error inserting with resources:", error);
  } else {
    console.log("Success! Data:", data);
  }
}

testResources();
