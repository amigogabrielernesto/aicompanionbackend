require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function listRPCs() {
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_ANON_KEY}`);
        const data = await response.json();
        const rpcs = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
        console.log("Available RPCs:", JSON.stringify(rpcs, null, 2));
    } catch (e) {
        console.error("Error fetching RPC list:", e);
    }
    process.exit();
}

listRPCs();
