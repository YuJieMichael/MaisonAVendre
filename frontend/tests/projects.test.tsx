// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const api=vi.hoisted(()=>({list:vi.fn(),create:vi.fn()}));
vi.mock('../src/auth',()=>({useAuth:()=>({user:{id:'alice'}})}));
vi.mock('../src/lib/project-api',()=>({listProjects:api.list,createProject:api.create}));
import {Projects} from '../src/projects';
let host:HTMLDivElement,root:Root;
const tick=()=>new Promise(r=>setTimeout(r,0));
const row=(id:string,status='draft')=>({id,details:{address:`House ${id}`,city:'Montréal'},status,plan:'without',updated_at:'2026-09-25T00:00:00Z'});
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();vi.stubGlobal('FormData',window.FormData);history.replaceState(null,'','#projects');host=document.createElement('div');document.body.append(host);root=createRoot(host);api.list.mockResolvedValue([row('one'),row('two','approved')]);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function render(){await act(async()=>{root.render(<Projects lang="en"/>);await tick();});}
it('lists separate project links and filters by status without creating a project',async()=>{await render();expect(host.querySelector('a[href="#projects/one/overview"]')).not.toBeNull();const select=host.querySelector('select[aria-label="Status"]') as HTMLSelectElement;await act(async()=>{select.value='approved';select.dispatchEvent(new Event('change',{bubbles:true}));});expect(host.querySelector('a[href="#projects/one/overview"]')).toBeNull();expect(host.querySelector('a[href="#projects/two/overview"]')).not.toBeNull();expect(api.create).not.toHaveBeenCalled();});
it('retains a creation id across a failed request and navigates only after success',async()=>{await render();await act(async()=>{Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='New project')!.click();});(host.querySelector('[name="address"]') as HTMLInputElement).value='100 Sample Street';(host.querySelector('[name="city"]') as HTMLInputElement).value='Montréal';api.create.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({id:'new-id'});const form=host.querySelector('form')!;await act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();});expect(host.querySelector('[role="alert"]')).not.toBeNull();expect(location.hash).toBe('#projects');await act(async()=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();});expect(api.create.mock.calls[0][0]).toBe(api.create.mock.calls[1][0]);expect(api.create.mock.calls[0].slice(1)).toEqual(['100 Sample Street','Montréal','without']);expect(location.hash).toBe('#projects/new-id/edit');});
it('shows a retrieval failure without inventing an empty project list',async()=>{api.list.mockRejectedValueOnce(Error('offline'));await render();expect(host.querySelector('[role="alert"]')?.textContent).toContain('Unable to load');expect(host.textContent).not.toContain('No projects yet');});
