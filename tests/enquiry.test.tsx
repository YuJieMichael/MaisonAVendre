// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { EnquiryForm } from '../src/enquiry';
import { parseEnquiry, enquiriesCsv } from '../supabase/functions/_shared/enquiry';
vi.mock('../src/lib/supabase',()=>({backendConfigured:true}));
let root: ReturnType<typeof createRoot>;
afterEach(async()=>{if(root)await act(async()=>root.unmount());document.body.innerHTML='';vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function render(kind:'buyer'|'seller'){
  document.body.innerHTML='<div id="test"></div>';root=createRoot(document.getElementById('test')!);
  await act(async()=>root.render(<EnquiryForm kind={kind} lang="en" />));
  return document.querySelector('form')!;
}
it.each(['buyer','seller'] as const)('%s only requires name and email',async kind=>{
  const form=await render(kind);
  expect([...form.querySelectorAll<HTMLInputElement>('[required]')].map(x=>x.name)).toEqual(['name','email']);
  (form.elements.namedItem('name') as HTMLInputElement).value='Test Customer';
  (form.elements.namedItem('email') as HTMLInputElement).value='test@example.com';
  expect(form.checkValidity()).toBe(true);
});
it('does not pretend to save while setup is pending',async()=>{
  vi.stubEnv('VITE_ENQUIRY_ENABLED','false');const send=vi.fn();vi.stubGlobal('fetch',send);
  const form=await render('buyer');(form.elements.namedItem('name') as HTMLInputElement).value='Test';
  (form.elements.namedItem('email') as HTMLInputElement).value='test@example.com';
  await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(send).not.toHaveBeenCalled();expect(document.querySelector('[role=alert]')?.textContent).toContain('not been recorded');
});
it('preserves entries and idempotency on retry, accepts only confirmed save',async()=>{
  vi.stubEnv('VITE_ENQUIRY_ENABLED','true');const send=vi.fn().mockResolvedValueOnce({ok:false,status:503,json:async()=>({error:'unavailable'})}).mockResolvedValueOnce({ok:true,status:200,json:async()=>({ok:true})});vi.stubGlobal('fetch',send);
  const form=await render('seller');(form.elements.namedItem('name') as HTMLInputElement).value='Test';(form.elements.namedItem('email') as HTMLInputElement).value='test@example.com';
  await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(document.querySelector('[role=alert]')).not.toBeNull();expect((form.elements.namedItem('name') as HTMLInputElement).value).toBe('Test');
  await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(send.mock.calls[0][1].body).toBe(send.mock.calls[1][1].body);expect(document.querySelector('[role=status]')?.textContent).toContain('recorded');
});
it('validates public payloads, permits blank optional fields, rejects malformed data',()=>{
  const minimal={requestId:crypto.randomUUID(),kind:'buyer',language:'fr',name:' Test ',email:'test@example.com'};
  expect(parseEnquiry(minimal).name).toBe('Test');
  for(const extra of [{name:' '},{email:'bad'},{budgetMin:'300',budgetMax:'200'},{website:'spam'},{kind:'admin'},{requirements:'x'.repeat(3001)}]) expect(()=>parseEnquiry({...minimal,...extra})).toThrow();
});
it('exports Unicode CSV without executable spreadsheet formulas',()=>{
  const csv=enquiriesCsv([{name:'李, "Test"',requirements:'=HYPERLINK("bad")',phone:'+15145550000'}]);
  expect(csv.startsWith('\uFEFF')).toBe(true);expect(csv).toContain('李, ""Test""');expect(csv).toContain("'=HYPERLINK");expect(csv).toContain("'+15145550000");
});
