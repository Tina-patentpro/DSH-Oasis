import test from 'node:test'
import assert from 'node:assert/strict'
import {OasisPanelHost} from '../src/client/OasisPanelHost.js'

const items=[
  {workspaceId:'workspace-a',sessionIds:['session-a']},
  {workspaceId:'workspace-b',sessionIds:['session-b']},
]
function workspaceFor(snapshot){
  const element=OasisPanelHost({store:{},focusTargets:new Map(),layoutAdapter:{},
    useSessions:select=>select(snapshot),useWorkspaces:select=>select({items})})
  return element.props.workspaceId
}
const row=(id,mainView)=>({id,retainedBy:{mainView}})

test('standalone panel follows the public main-view session catalog without legacy current',()=>{
  assert.equal(workspaceFor({byId:{'session-a':row('session-a',1),'session-b':row('session-b',0)}}),'workspace-a')
})

test('ambiguous main-view ownership does not use a stale legacy current fallback',()=>{
  assert.equal(workspaceFor({current:'session-a',byId:{'session-a':row('session-a',1),'session-b':row('session-b',1)}}),null)
})

test('no main-view ownership does not revive the legacy selected project',()=>{
  assert.equal(workspaceFor({current:'session-a',byId:{'session-a':row('session-a',0)}}),null)
})
