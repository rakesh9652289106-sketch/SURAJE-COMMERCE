const { createClient } = require('@supabase/supabase-js');

// Replace these with your Supabase URL and keys sent by the user
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use the service_role key to bypass RLS since we are acting as the backend server.
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
