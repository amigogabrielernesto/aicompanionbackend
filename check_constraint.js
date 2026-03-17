require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.rpc('exec_sql', { 
        sql: "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'activities_effectiveness_score_check'" 
    });
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
    process.exit();
}
check();
