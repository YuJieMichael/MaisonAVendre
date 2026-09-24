import { createClient } from 'npm:@supabase/supabase-js@2.117.0';
import { enquiriesCsv, RECIPIENT } from '../_shared/enquiry.ts';

Deno.serve(async request => {
  const token=Deno.env.get('ENQUIRY_CRON_TOKEN');
  if(!token || request.headers.get('authorization') !== `Bearer ${token}`) return Response.json({error:'unauthorized'},{status:401});
  if(request.method!=='POST') return Response.json({error:'method'},{status:405});
  const key=Deno.env.get('RESEND_API_KEY'), from=Deno.env.get('ENQUIRY_EMAIL_FROM');
  if(!key || !from) return Response.json({error:'email_not_configured'},{status:503});
  try {
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const {data:batch,error}=await db.rpc('claim_enquiry_batch');
    if(error) throw error;
    if(!batch) return Response.json({ok:true,batches:0});
    if(batch.rows.length!==10) throw Error('batch_size');
    const content=btoa(Array.from(new TextEncoder().encode(enquiriesCsv(batch.rows)),b=>String.fromCharCode(b)).join(''));
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`enquiry-batch/${batch.id}`},
      body:JSON.stringify({from,to:[RECIPIENT],subject:`Propriété En Vente — 10 demandes / enquiries — ${batch.id}`,
        text:`10 new buyer/seller enquiries are attached as a CSV spreadsheet.\n10 nouvelles demandes d’achat/vente sont jointes au format CSV.\n附件是 10 条买卖需求，可用 Excel 打开。\nBatch: ${batch.id}`,
        attachments:[{filename:`Propriété En Vente-${batch.id}.csv`,content}]}),signal:AbortSignal.timeout(15000),
    });
    if(!response.ok) throw Error('provider_error');
    const result=await response.json();
    if(typeof result.id!=='string' || !result.id) throw Error('provider_response');
    const completed=await db.rpc('complete_enquiry_batch',{p_id:batch.id,p_provider_id:result.id});
    if(completed.error) throw completed.error;
    return Response.json({ok:true,batches:1});
  } catch { return Response.json({error:'batch_pending_retry'},{status:503}); }
});
