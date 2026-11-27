import test from 'node:test'
import assert from 'node:assert/strict'
import {apply} from '../src/client.js'

function startClient() {
  const registrations=[]
  const fibers=new Map()
  const ctx={
    connection:{rpc:{call:async()=>({ok:true,value:{}})}},
    slots:{
      inject(_name,callback){return callback()},
      register(options,component){registrations.push({options,component});return()=>{}},
    },
    inject(dependencies,callback){
      const fiber={callback,cleanup:null,async dispose(){await fiber.cleanup?.()}}
      fibers.set(dependencies.join(','),fiber)
      return fiber
    },
  }
  const dispose=apply(ctx)
  const entry=registrations.find(x=>x.options.name==='conversation.input.right').component({})
  return {entry,fibers,dispose}
}

test('an unavailable optional Sidebar service leaves the existing standalone workbench usable',async t=>{
  const h=startClient();t.after(()=>h.dispose())
  assert.ok(h.fibers.has('betterSidebar'),'the optional service must still be subscribed')
  assert.equal(h.entry.props.coordinator.getSnapshot().mode,'standalone')
})

test('a Sidebar arriving later takes ownership only after standalone release',async t=>{
  const h=startClient();t.after(()=>h.dispose())
  const {coordinator,layoutAdapter}=h.entry.props
  assert.equal(coordinator.getSnapshot().mode,'standalone')
  const transitions=[]
  const unsubscribe=coordinator.subscribe(()=>transitions.push(coordinator.getSnapshot().mode))
  t.after(unsubscribe)
  let registrations=0,unregistered=0
  const betterSidebar={version:'public-delayed-service',features:['targetedOpen'],
    registerTab(descriptor){
      assert.equal(coordinator.getSnapshot().mode,'integrating')
      assert.equal(layoutAdapter.getSnapshot().effectiveMode,'hidden')
      assert.equal(descriptor.single,true)
      registrations++
      return()=>{unregistered++}
    },openTab(){},
  }
  const fiber=h.fibers.get('betterSidebar')
  fiber.cleanup=fiber.callback({get:name=>name==='betterSidebar'?betterSidebar:undefined})
  assert.equal(registrations,1)
  assert.equal(coordinator.getSnapshot().mode,'better-sidebar')
  assert.deepEqual(transitions,['integrating','better-sidebar'])
  await fiber.dispose()
  assert.equal(unregistered,1)
  assert.equal(coordinator.getSnapshot().mode,'integrating','release must retain the existing no-overlap wait')
})
