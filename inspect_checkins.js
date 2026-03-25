require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspect() {
    console.log("Inspecting 'checkins' table...");
    
    // Get columns
    const { data: columns, error: colError } = await supabase.rpc('exec_sql', { 
        sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'checkins'" 
    });
    
    if (colError) {
        console.error("Error fetching columns:", colError);
    } else {
        console.log("COLUMNS:", JSON.stringify(columns, null, 2));
    }

    // Get constraints
    const { data: constraints, error: conError } = await supabase.rpc('exec_sql', { 
        sql: "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'checkins'::regclass" 
    });

    if (conError) {
        console.error("Error fetching constraints:", conError);
    } else {
        console.log("CONSTRAINTS:", JSON.stringify(constraints, null, 2));
    }
    
    process.exit();
}

inspect();
