export const VIDEO_LIMIT=10*1024*1024;
export function parseVideo(raw:unknown) {
  if(raw===undefined || raw===null || raw==='')return null;
  if(typeof raw!=='string'||raw.length>Math.ceil(VIDEO_LIMIT/3)*4+100)throw Error('invalid_video');
  const match=/^data:video\/(mp4|webm);base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw);
  if(!match)throw Error('invalid_video');
  const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
  if(bytes.length<16||bytes.length>VIDEO_LIMIT)throw Error('invalid_video');
  const valid=match[1]==='mp4'?String.fromCharCode(...bytes.slice(4,8))==='ftyp':[26,69,223,163].every((b,i)=>bytes[i]===b);
  if(!valid)throw Error('invalid_video');
  return {bytes,mime:`video/${match[1]}`,ext:match[1]};
}
