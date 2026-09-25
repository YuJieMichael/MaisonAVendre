// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {prepareListingPhoto,INPUT_PHOTO_LIMIT} from '../src/lib/listing-photo';
import {PHOTO_LIMIT} from '../../supabase/functions/_shared/listing-input';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('accepts JPEG files with missing browser MIME metadata',async()=>{
  expect(await prepareListingPhoto(new File(['image'],'HOUSE.JPG'))).toMatch(/^data:image\/jpeg;base64,/);
});
it('reports unsupported HEIC and oversized files distinctly',async()=>{
  await expect(prepareListingPhoto(new File(['image'],'house.heic',{type:'image/heic'}))).rejects.toThrow('format');
  await expect(prepareListingPhoto(new File([new Uint8Array(INPUT_PHOTO_LIMIT+1)],'house.jpg',{type:'image/jpeg'}))).rejects.toThrow('size');
});
it('compresses large photos below the server limit and releases the temporary URL',async()=>{
  const revoke=vi.fn();vi.stubGlobal('URL',{createObjectURL:()=> 'blob:test',revokeObjectURL:revoke});
  vi.stubGlobal('Image',class {naturalWidth=4800;naturalHeight=3200;onload=()=>{};set src(_:string){queueMicrotask(()=>this.onload());}});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({fillRect:vi.fn(),drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);
  const sizes:number[]=[];
  vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(function(callback){sizes.push(this.width);callback(new Blob([new Uint8Array(sizes.length===1?PHOTO_LIMIT+1:500)],{type:'image/jpeg'}));});
  const result=await prepareListingPhoto(new File([new Uint8Array(PHOTO_LIMIT+1)],'large.png',{type:'image/png'}));
  expect(result).toMatch(/^data:image\/jpeg;base64,/);expect(atob(result.split(',')[1]).length).toBe(500);
  expect(sizes).toEqual([2400,1800]);expect(revoke).toHaveBeenCalledWith('blob:test');
});
