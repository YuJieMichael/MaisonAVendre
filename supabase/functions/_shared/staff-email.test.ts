import test from 'node:test';
import assert from 'node:assert/strict';
import { createStaffEmailHandler } from './staff-email-handler.ts';

function setup(options: {verified?: boolean;active?: boolean;identityError?: boolean;claimError?: boolean;configured?: boolean;rate?: boolean;delivery?: boolean;grant?: boolean}={}) {
  const calls: {name:string;args:any}[]=[];
  const db={auth:{
    getUser:async()=>({data:{user:{id:'user-id',email:'owner@example.test',email_confirmed_at:options.verified===false?null:'2026-09-23'}},error:options.identityError}),
    getClaims:async()=>({data:{claims:{sub:'user-id',session_id:'00000000-0000-4000-8000-000000000001'}},error:options.claimError}),
  },from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{active:options.active!==false},error:null})})})}),
  rpc:async(name:string,args:any)=>{calls.push({name,args});return {data:name==='begin_staff_email_check'?(options.rate?'rate_limited':'ok'):options.grant===true,error:null};}};
  const handler=createStaffEmailHandler({
    env:name=>({APP_ORIGIN:'https://example.test',SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-hmac-key',RESEND_API_KEY:options.configured===false?undefined:'test-only-email-key',STAFF_EMAIL_FROM:'noreply@example.test'})[name],
    createClient:()=>db as any,
    fetch:async(_url,init)=>{calls.push({name:'send',args:JSON.parse(init!.body as string)});return Response.json(options.delivery===false?{}:{id:'test-message'},{status:options.delivery===false?503:200});},
  });
  const request=(body:object,authorization='Bearer test-session')=>handler(new Request('https://api.example.test',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json',Authorization:authorization},body:JSON.stringify(body)}));
  return {request,calls};
}
test('email send is bound to verified staff identity, never a supplied recipient; no code in HTTP response',async()=>{
  const s=setup();const response=await s.request({action:'send',email:'attacker@example.test',language:'en'});const body=await response.json();
  assert.equal(response.status,200);assert.deepEqual(Object.keys(body).sort(),['challengeId','ok']);
  const mail=s.calls.find(c=>c.name==='send')!.args;
  assert.deepEqual(mail.to,['owner@example.test']);assert.match(mail.text,/\b\d{6}\b/);
  const stored=s.calls.find(c=>c.name==='begin_staff_email_check')!.args;
  assert.match(stored.p_hash,/^[a-f0-9]{64}$/);assert.equal(stored.p_session_id,'00000000-0000-4000-8000-000000000001');
  assert.equal(stored.p_challenge_id,body.challengeId);
});
for(const options of [{active:false},{verified:false},{identityError:true},{claimError:true}])test(`rejects unauthorized request ${JSON.stringify(options)}`,async()=>{
  const s=setup(options);const r=await s.request({action:'send'});assert.ok([401,403].includes(r.status));assert.equal(s.calls.length,0);
});
test('missing email configuration fails honestly before issuing a challenge',async()=>{
  const s=setup({configured:false});const r=await s.request({action:'send'});assert.equal(r.status,503);assert.equal((await r.json()).error,'email_not_configured');assert.equal(s.calls.length,0);
});
test('throttling prevents email dispatch and provider failure never reports success',async()=>{
  const limited=setup({rate:true});assert.equal((await limited.request({action:'send'})).status,429);assert.ok(!limited.calls.some(c=>c.name==='send'));
  const failed=setup({delivery:false});assert.equal((await failed.request({action:'send'})).status,503);
});
test('verification is granted only by the database; invalid formats do not invoke it',async()=>{
  const input={action:'verify',code:'123456',challengeId:'00000000-0000-4000-8000-000000000002'};
  const denied=setup();assert.equal((await denied.request(input)).status,400);
  const allowed=setup({grant:true});assert.equal((await allowed.request(input)).status,200);
  const invalid=setup({grant:true});assert.equal((await invalid.request({...input,code:'not-code'})).status,400);assert.equal(invalid.calls.length,0);
});
