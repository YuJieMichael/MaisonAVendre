import {createClient} from 'npm:@supabase/supabase-js@2.117.0';
import {readSmallJson} from '../_shared/invitation.ts';
import {parseListingInput} from '../_shared/listing-input.ts';
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async request=>{
  let origin:string;
  try{origin=new URL(Deno.env.get('APP_ORIGIN')||'').origin;}catch{return Response.json({error:'unavailable'},{status:503});}
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(status:number,body:unknown)=>Response.json(body,{status,headers});
  if(request.headers.get('origin')!==origin)return reply(403,{error:'forbidden'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply(405,{error:'method'});
  let input:ReturnType<typeof parseListingInput>, fingerprint:string;
  try{const body=await readSmallJson(request,9*1024*1024);input=parseListingInput(body);fingerprint=await digest(JSON.stringify(body));}
  catch{return reply(400,{error:'invalid'});}
  try{
    const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const salt=Deno.env.get('ENQUIRY_RATE_SALT') || secret;
    if(!secret||!salt)return reply(503,{error:'unavailable'});
    const db=createClient(Deno.env.get('SUPABASE_URL')!,secret,{auth:{persistSession:false}});
    const paths=input.photos.map((photo,i)=>`${input.id}/${i}.${photo.ext}`);
    const clientHash=await digest(salt+(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'));
    const reserved=await db.rpc('reserve_listing',{p_id:input.id,p_fingerprint:fingerprint,p_property:input.property,p_contact:input.contact,p_paths:paths,p_client_hash:clientHash});
    if(reserved.error)return reply(reserved.error.message.includes('rate_limit')?429:503,{error:'not_saved'});
    if(reserved.data!=='uploading')return reply(200,{ok:true});
    for(let i=0;i<input.photos.length;i++){
      const photo=input.photos[i];
      // Retried uploads are immutable: existing objects are never overwritten.
      const uploaded=await db.storage.from('listing-photos').upload(paths[i],photo.bytes,{contentType:photo.mime,upsert:false});
      if(uploaded.error){const {data:existing,error}=await db.storage.from('listing-photos').download(paths[i]);if(error||!existing)throw Error('upload');const bytes=new Uint8Array(await existing.arrayBuffer());if(bytes.length!==photo.bytes.length||bytes.some((b,j)=>b!==photo.bytes[j]))throw Error('conflict');}
    }
    const saved=await db.from('listing_submissions').update({status:'pending'}).eq('id',input.id).eq('status','uploading');
    if(saved.error)throw saved.error;
    return reply(200,{ok:true});
  }catch{return reply(503,{error:'not_saved'});}
});
