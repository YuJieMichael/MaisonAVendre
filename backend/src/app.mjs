import express from 'express';
import {ApiError,repository,uuid} from './repository.mjs';
export function createApp({pool,authenticate,staffAccess,origin}){
 const app=express();app.disable('x-powered-by');const repo=repository(pool);
 app.use((req,res,next)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});if(req.headers.origin){if(req.headers.origin!==origin)return res.status(403).json({error:'ORIGIN_DENIED'});res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS'});}if(req.method==='OPTIONS')return res.sendStatus(204);next();});
 app.get('/api/health',async(req,res)=>{try{await pool.query('select 1');res.json({ok:true});}catch{res.status(503).json({ok:false});}});
 app.use('/api',async(req,res,next)=>{const match=/^Bearer (\S+)$/.exec(req.headers.authorization||'');if(!match)throw new ApiError(401,'401');const user=await authenticate(match[1]);if(!uuid(user?.id)||!user.email_confirmed_at)throw new ApiError(401,'401');req.user=user;req.token=match[1];next();});
 app.use(express.json({limit:'15mb',strict:true}));
 app.get('/api/projects',async(req,res)=>res.json(await repo.list(req.user.id)));
 app.post('/api/projects',async(req,res)=>res.status(201).json(await repo.create(req.user.id,req.body)));
 app.get('/api/projects/:id',async(req,res)=>res.json(await repo.get(req.user.id,req.params.id)));
 app.put('/api/projects/:id',async(req,res)=>res.json(await repo.save(req.user.id,req.params.id,req.body)));
 app.post('/api/projects/:id/submit',async(req,res)=>res.json(await repo.submit(req.user.id,req.params.id,req.body)));
 app.get('/api/projects/:id/files',async(req,res)=>res.json(await repo.files(req.user.id,req.params.id)));
 app.post('/api/projects/:id/files',async(req,res)=>res.status(201).json(await repo.upload(req.user.id,req.params.id,req.body)));
 const content=(res,file)=>res.type(file.mime_type).set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`).send(Buffer.from(file.content));
 app.get('/api/projects/:id/files/:fileId/content',async(req,res)=>content(res,await repo.content(req.user.id,req.params.id,req.params.fileId)));
 app.delete('/api/projects/:id/files/:fileId',async(req,res)=>res.json(await repo.remove(req.user.id,req.params.id,req.params.fileId)));
 app.use('/api/admin',async(req,res,next)=>{if(!await staffAccess(req.token))throw new ApiError(403,'ACCESS_DENIED');next();});
 app.get('/api/admin/projects',async(req,res)=>res.json(await repo.reviewQueue()));
 app.get('/api/admin/audit',async(req,res)=>res.json(await repo.auditLog()));
 app.get('/api/admin/projects/:id/files',async(req,res)=>res.json(await repo.adminFiles(req.params.id)));
 app.get('/api/admin/projects/:id/files/:fileId/content',async(req,res)=>content(res,await repo.adminContent(req.params.id,req.params.fileId)));
 app.post('/api/admin/projects/:id/review',async(req,res)=>res.json(await repo.review(req.user.id,req.params.id,req.body)));
 app.use((req,res)=>res.status(404).json({error:'NOT_FOUND'}));
 app.use((error,req,res,next)=>{const status=error.status || (error.code==='40001'?409:['22023','23514','22P02'].includes(error.code)?400:500);res.status(status).json({error:status===500?'INTERNAL_ERROR':error instanceof ApiError?error.message:status===413?'FILE_LIMIT':status===409?'REVISION_CONFLICT':/photo/i.test(error.message)?'PHOTO_REQUIRED':'VALIDATION'});});
 return app;
}
