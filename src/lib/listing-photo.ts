import { PHOTO_LIMIT } from '../../supabase/functions/_shared/listing-input';

export type PhotoError = 'count' | 'format' | 'size' | 'read';
export const INPUT_PHOTO_LIMIT = 20 * 1024 * 1024;
const types: Record<string,string> = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=reader.onabort=()=>reject(new Error('read'));
    reader.readAsDataURL(blob);
  });
}
export async function prepareListingPhoto(file: File): Promise<string> {
  const mime=file.type || types[file.name.split('.').pop()?.toLowerCase() || ''];
  if(!Object.values(types).includes(mime))throw new Error('format');
  if(!file.size || file.size>INPUT_PHOTO_LIMIT)throw new Error('size');
  const blob=file.type ? file : new Blob([file],{type:mime});
  if(file.size<=PHOTO_LIMIT)return dataUrl(blob);
  const url=URL.createObjectURL(blob);
  try {
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('read'));image.src=url;
    });
    const canvas=document.createElement('canvas');
    let scale=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight));
    for(let attempt=0;attempt<5;attempt++){
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
      canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');if(!context)throw new Error('read');
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const compressed=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85-attempt*0.1));
      if(compressed && compressed.size<=PHOTO_LIMIT)return dataUrl(compressed);
      scale*=0.75;
    }
    throw new Error('size');
  } finally {URL.revokeObjectURL(url);}
}
