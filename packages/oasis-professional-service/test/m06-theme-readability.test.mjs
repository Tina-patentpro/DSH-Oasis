import test from 'node:test'
import assert from 'node:assert/strict'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {OasisWorkbenchSurface} from '../src/client/OasisWorkbenchSurface.js'
import {V340GenerationPage} from '../src/client/V340GenerationPage.js'
import {getV340Node} from '../src/v340-catalog.js'

// Primary foreground/base pairs observed in R46; secondary/layer2 are explicit palette fixtures.
// These are static CSS-resolution checks, not browser/computed-style or runtime evidence.
const palettes={light:{'--dsw-alias-bg-base':'#ffffff','--dsw-alias-label-primary':'#202123',
  '--dsw-alias-label-secondary':'#66706b','--dsw-alias-bg-layer-2':'#f1f3f2'},
dark:{'--dsw-alias-bg-base':'#151517','--dsw-alias-label-primary':'#f9fafb',
  '--dsw-alias-label-secondary':'#bfc2c5','--dsw-alias-bg-layer-2':'#202022'}}
function resolve(value,variables){
  if(!value.startsWith('var('))return value
  const content=value.slice(4,-1);let depth=0,index=-1
  for(let i=0;i<content.length;i++){if(content[i]==='(')depth++;if(content[i]===')')depth--;if(content[i]===','&&depth===0){index=i;break}}
  const key=(index<0?content:content.slice(0,index)).trim(),fallback=index<0?'':content.slice(index+1).trim()
  return resolve(variables[key]??fallback,variables)
}
function luminance(color){
  const hex=color.slice(1);assert.match(hex,/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i)
  const full=hex.length===3?hex.split('').map(x=>x+x).join(''):hex
  return [0,2,4].map(i=>parseInt(full.slice(i,i+2),16)/255)
    .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)
}
function contrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(values[0]+.05)/(values[1]+.05)}
for(const hostMode of ['embedded','standalone'])for(const [theme,palette]of Object.entries(palettes)){
  test(`${hostMode} workbench resolves legible inherited text on fixedDSH ${theme} surfaces`,()=>{
    const page={pageId:'p',title:'Theme fixture',view:'chooser',workType:'cn-invention-patent',runOrder:[],remoteExecutionOrder:[],remoteExecutions:{}}
    const state={workspaceId:'w',revision:0,syncStatus:'ready',panelMode:'normal',activePageId:'p',pages:[page],pageOperations:{},workflows:[]}
    const store={subscribe:()=>()=>{},peekWorkspaceState:()=>state}
    const layout={effectiveMode:'normal',requestedMode:'normal',status:'ready'}
    const layoutAdapter={subscribe:()=>()=>{},getSnapshot:()=>layout}
    const html=renderToStaticMarkup(h(OasisWorkbenchSurface,{store,workspaceId:'w',workspaceItems:[],layoutAdapter,hostMode,focusTargets:new Map()}))
    const root=html.match(/<section\b[^>]*data-oasis-panel="true"[^>]*style="([^"]*)"/)
    assert.ok(root,'actual owned root rendered')
    const style=Object.fromEntries(root[1].split(';').filter(Boolean).map(x=>{const i=x.indexOf(':');return[x.slice(0,i),x.slice(i+1)]}))
    const variables={...palette,...Object.fromEntries(Object.entries(style).filter(([key])=>key.startsWith('--')))}
    const foreground=resolve(style.color,variables),background=resolve(style.background,variables)
    assert.ok(contrast(foreground,background)>=4.5,`${foreground} on ${background} is not legible`)
    const main=html.match(/<main\b[^>]*style="([^"]*)"/)
    assert.ok(main,'owned content surface rendered')
    const contentBackground=main[1].match(/(?:^|;)background:([^;]+)/)?.[1]
    assert.ok(contentBackground)
    assert.ok(contrast(foreground,resolve(contentBackground,variables))>=4.5,'content surface must match inherited text')
    const m06={...page,view:'workspace',v340:{nodeId:'Flow-2-6',draft:{source:'local-skill',filePaths:{},textInputs:{},configuration:{}},runs:{},runOrder:[],activeRunId:null}}
    const form=renderToStaticMarkup(h(V340GenerationPage,{page:m06,state:{...state,pages:[m06]},node:getV340Node('Flow-2-6')}))
    const helpers=[...form.matchAll(/<small[^>]*style="([^"]*)"/g)]
    assert.ok(helpers.length>=8,'actual M06 field helper captions rendered')
    for(const helper of helpers){
      const captionColor=helper[1].match(/(?:^|;)color:([^;]+)/)?.[1]
      assert.ok(captionColor)
      assert.ok(contrast(resolve(captionColor,variables),resolve(contentBackground,variables))>=4.5,'field helper caption must remain legible')
    }
  })
}
