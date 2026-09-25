import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {pathToFileURL} from 'node:url';
export async function migrate(db){
  await db.query('begin');
  try{
    await db.query("select pg_advisory_xact_lock(250925007)");
    await db.query(await readFile(new URL('../migrations/schema.sql',import.meta.url),'utf8'));
    const {rows}=await db.query("select version from workspace.schema_versions where version='001'");
    if(!rows.length){await db.query(await readFile(new URL('../migrations/validators.sql',import.meta.url),'utf8'));await db.query("insert into workspace.schema_versions(version) values('001')");}
    await db.query('commit');
  }catch(error){await db.query('rollback');throw error;}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();try{await migrate(db);console.log('Database migrations applied.');}finally{await db.end();}
}
