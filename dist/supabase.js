"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
/**
 * Cliente Supabase usando el JWT del usuario.
 * Esto permite que RLS funcione correctamente.
 */
const createSupabaseClient = (accessToken) => {
    return (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
};
exports.createSupabaseClient = createSupabaseClient;
