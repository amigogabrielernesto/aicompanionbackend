require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`)
  .then(res => res.json())
  .then(data => {
    console.log("ACTIVITIES SCHEMA:\n", JSON.stringify(data.definitions.activities, null, 2));
    console.log("ACTIVITY TYPES SCHEMA:\n", JSON.stringify(data.definitions.activity_types || data.definitions.activities_type || data.definitions.activity_type, null, 2));
  })
  .catch(err => console.error(err));
