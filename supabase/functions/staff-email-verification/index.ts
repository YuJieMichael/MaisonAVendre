import { createClient } from 'npm:@supabase/supabase-js@2.117.0';
import { createStaffEmailHandler } from '../_shared/staff-email-handler.ts';
Deno.serve(createStaffEmailHandler({
  env: name=>Deno.env.get(name),
  createClient: (url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),
  fetch,
}));
