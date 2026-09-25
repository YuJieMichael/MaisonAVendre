// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const project=vi.hoisted(()=>({
  state:{plan:'without',form:{address:'',city:'',postal:'',price:'',name:'',email:'',phone:'',language:'fr',date:'',time:'0',notes:'',consent:false},photos:[],services:['listing'],completed:false,sample:true,buyers:[],visits:[],docs:[],isDemo:true,busy:false,project:null},
  saveNow:vi.fn(async()=>true),
}));
vi.mock('../src/project',()=>({useProject:()=>({...project.state,saveNow:project.saveNow}),isVisitSlotTaken:()=>false}));
import {Dashboard} from '../src/dashboard';

let host:HTMLDivElement,root:Root;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});project.saveNow.mockClear();history.replaceState(null,'','#demo/services');host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});

it('saves the selected service and continues to property details',async()=>{
  await act(async()=>root.render(<Dashboard lang="zh"/>));
  const button=host.querySelector('button.service-next-step') as HTMLButtonElement;
  expect(button?.textContent).toContain('下一步：完善房屋资料');
  await act(async()=>button.click());
  expect(project.saveNow).toHaveBeenCalledOnce();
  expect(location.hash).toBe('#demo/property');
});
