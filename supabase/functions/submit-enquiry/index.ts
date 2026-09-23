import { createClient } from 'npm:@supabase/supabase-js@2.117.0';
import { parseEnquiry } from '../_shared/enquiry.ts';
import { readSmallJson } from '../_shared/invitation.ts';

Deno.serve(async request => {
  let origin: string;
  try { origin=new URL(Deno.env.get('APP_ORIGIN') ?? '').origin; }
  catch { return Response.json({error:'unavailable'},{status:503}); }
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(status:number,body:unknown)=>Response.json(body,{status,headers});
  if (request.headers.get('origin') !== origin) return reply(403,{error:'forbidden'});
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(request.method!=='POST') return reply(405,{error:'method'});
  let data;
  try { data=parseEnquiry(await readSmallJson(request,16000)); }
  catch { return reply(400,{error:'invalid_input'}); }
  try {
    const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const salt=Deno.env.get('ENQUIRY_RATE_SALT');
    if(!secret || !salt) return reply(503,{error:'unavailable'});
    const db=createClient(Deno.env.get('SUPABASE_URL')!,secret,{auth:{persistSession:false}});
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+ip)))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const {error}=await db.rpc('collect_enquiry',{p_id:data.requestId,p_payload:data,p_client_hash:hash});
    if(error) return reply(error.message.includes('rate_limit')?429:503,{error:'not_saved'});
    return reply(200,{ok:true});
  } catch { return reply(503,{error:'unavailable'}); }
});
