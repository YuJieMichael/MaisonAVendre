import pg from 'pg';
import {createApp} from './app.mjs';
import {ApiError} from './repository.mjs';
for(const name of ['DATABASE_URL','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','FRONTEND_ORIGIN'])if(!process.env[name])throw Error(`${name} is required`);
const base=new URL(process.env.SUPABASE_URL);if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use HTTPS for authentication');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:10,statement_timeout:10000,connectionTimeoutMillis:10000});
async function authRequest(path,token,method='GET'){
 const response=await fetch(new URL(path,base),{method,headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:'{}'}:{}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new ApiError(response.status>=500?503:401,'401');return response.json();
}
const app=createApp({pool,origin:process.env.FRONTEND_ORIGIN,authenticate:token=>authRequest('/auth/v1/user',token),staffAccess:async token=>(await authRequest('/rest/v1/rpc/get_my_staff_access',token,'POST'))===true});
const server=app.listen(Number(process.env.PORT||3101),'0.0.0.0',()=>console.log('Project API listening.'));
server.requestTimeout=30000;server.headersTimeout=15000;
async function stop(){server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
