import {describe,it,expect} from 'vitest';
import {parseVideo,VIDEO_LIMIT} from '../../supabase/functions/_shared/listing-video';
const encode=(mime:string,bytes:Uint8Array)=>`data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
describe('listing videos',()=>{
  it('keeps videos optional',()=>{expect(parseVideo(undefined)).toBeNull();expect(parseVideo('')).toBeNull();});
  it('validates MP4 and WebM containers',()=>{
    const mp4=new Uint8Array(16);mp4.set([102,116,121,112],4);
    expect(parseVideo(encode('video/mp4',mp4))?.ext).toBe('mp4');
    const webm=new Uint8Array(16);webm.set([26,69,223,163]);
    expect(parseVideo(encode('video/webm',webm))?.ext).toBe('webm');
    expect(()=>parseVideo(encode('video/mp4',webm))).toThrow();
    expect(()=>parseVideo(encode('text/html',mp4))).toThrow();
  });
  it('rejects malformed and oversized payloads',()=>{
    expect(()=>parseVideo('https://example.test/video.mp4')).toThrow();
    expect(()=>parseVideo(42)).toThrow();
    expect(()=>parseVideo(encode('video/mp4',new Uint8Array(VIDEO_LIMIT+1)))).toThrow();
  });
});
