// Real React DOM acceptance; bundled with existing dependencies into a loopback-only test page.
import { createElement, act, StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { UnifiedResultPanel } from '../src/client/UnifiedResultPanel.js'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { PanelPages } from '../src/client/PanelPages.js'

export async function runResultPanelBrowserTests(records) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const results = []
  const check = (value, message) => { if (!value) throw Error(message) }
  async function scenario(name, body, source = 'local-skill') {
    const data = structuredClone(records)
    for (const record of Object.values(data)) for (const task of Object.values(record.tasks)) {
      task.generation.source = source
      for (const run of Object.values(task.runs)) run.source = source
    }
    const calls = []
    const remote = {
      async get(id) { return data[id] },
      async replace(id, revision, draft) {
        data[id] = { ...data[id], ...draft, revision: revision + 1,
          tasks: Object.fromEntries(draft.taskOrder.map(key => [key, { ...data[id].tasks[key], ...draft.tasks[key] }])) }
        return { committed: true, current: data[id] }
      },
      async reviewRun(command) {
        calls.push(command)
        if (remote.failReview) throw Error('synthetic review failure')
        const current = structuredClone(data[command.workspaceId])
        current.tasks[command.taskId].runs[command.runId].review.status = command.status
        current.revision++
        data[command.workspaceId] = current
        return { committed: true, current }
      },
      async editUnifiedResult() { throw Error('synthetic save failure') },
    }
    const store = createWorkbenchStore({ remote, saveDelayMs: 0 })
    store.syncWorkspaces([{workspaceId:'workspace-a'}, {workspaceId:'workspace-b'}])
    await store.hydrateWorkspace('workspace-a'); await store.hydrateWorkspace('workspace-b')
    store.activateRun('workspace-a','task-a','run-1'); await store.whenSettled('workspace-a')
    let workspaceId = 'workspace-a'
    const container = document.createElement('section'); document.body.append(container)
    const root = createRoot(container)
    function Panel() {
      const state = useSyncExternalStore(store.subscribe, () => store.getWorkspaceState(workspaceId))
      const page = state.pages.find(p => p.pageId === 'task-a')
      return createElement(UnifiedResultPanel, { page, operation: state.pageOperations['task-a'] ?? {activeOperation:null},
        workspaceId, workspaceRevision:state.revision,
        disabled:state.syncStatus!=='ready' || state.pageOperations['task-a']?.activeOperation != null,
        onActivateRun:(_p,id)=>store.activateRun(workspaceId,'task-a',id),
        onUpdateResultEditDraft:(_p,id,text)=>store.updateResultEditDraft(workspaceId,'task-a',id,text),
        onDiscardResultEditDraft:(_p,id)=>store.discardResultEditDraft(workspaceId,'task-a',id),
        onEditResult:(_p,id,text)=>store.editUnifiedResult(workspaceId,'task-a',id,text),
        onReview:(_p,id,status,note,target)=>store.reviewRun(workspaceId,'task-a',id,status,note,target),
      })
    }
    const render = () => act(async()=>{root.render(createElement(StrictMode,null,createElement(Panel,{key:workspaceId})));await store.whenSettled(workspaceId)})
    const button = text => [...container.querySelectorAll('button')].find(b=>b.textContent===text)
    const click = async text => {check(button(text),'missing button '+text);await act(async()=>{button(text).click();await new Promise(r=>setTimeout(r,0))})}
    const input = async value => act(async()=>{
      const textarea=container.querySelector('textarea');check(textarea,'missing editor')
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(textarea,value)
      textarea.dispatchEvent(new Event('input',{bubbles:true}))
    })
    try {
      await render()
      await body({container,store,remote,calls,click,input,button,check,render,
        async switchWorkspace(id){workspaceId=id;await render()}})
      results.push({name,status:'passed'})
    } catch(error) { results.push({name,status:'failed',message:error.message}) }
    finally {await act(async()=>{root.unmount();await store.dispose()});container.remove()}
  }
  await scenario('real mount: version switch and Workspace remount preserve result draft',async h=>{
    await h.click('编辑结果');await h.input('DOM修订\n  保留空白\n')
    await h.click('版本 2');await h.click('版本 1')
    h.check(h.container.querySelector('textarea')?.value==='DOM修订\n  保留空白\n','draft lost after version switch')
    await h.switchWorkspace('workspace-b');await h.switchWorkspace('workspace-a')
    h.check(h.container.querySelector('textarea')?.value==='DOM修订\n  保留空白\n','draft lost after real component unmount')
    h.check(h.button('审核此版本').disabled,'editing must lock review')
    await h.click('保存为新版本')
    h.check(h.container.querySelector('textarea')?.value==='DOM修订\n  保留空白\n','save failure lost draft')
    await h.click('放弃编辑');h.check(!h.container.querySelector('textarea'),'explicit discard did not leave editor')
  })
  await scenario('review requires a distinct fixed-version confirmation and prevents duplicate dispatch',async h=>{
    await h.click('审核此版本')
    h.check(h.calls.length===0,'review entry approved immediately')
    h.check(h.container.querySelector('[role="group"][aria-label="审核确认"]'),'missing review details')
    const confirm=h.button('确认审核版本1');h.check(confirm,'missing explicit approval')
    await act(async()=>{confirm.click();confirm.click();await new Promise(r=>setTimeout(r,0))})
    h.check(h.calls.length===1,'duplicate review dispatch')
    h.check(h.calls[0].runId==='run-1','wrong fixed version approved')
    h.check(h.container.textContent.includes('风险未评估'),'approval hid unassessed risks')
  })
  await scenario('version change and Escape cancel old confirmation; failed approval stays unreviewed',async h=>{
    await h.click('审核此版本');h.check(h.calls.length===0,'entry should be read-only')
    await h.click('版本 2');await h.click('版本 1')
    h.check(!h.button('确认审核版本1'),'old confirmation survived version change')
    await h.click('审核此版本')
    await act(async()=>{h.container.querySelector('[aria-label="审核确认"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))})
    h.check(!h.button('确认审核版本1'),'Escape did not cancel')
    h.check(document.activeElement===h.button('审核此版本'),'Escape did not restore focus')
    await h.click('审核此版本');h.remote.failReview=true
    await h.click('确认审核版本1')
    h.check(h.calls.length===1,'failed review not dispatched once')
    h.check(!h.button('审核此版本').disabled,'failed approval was shown as approved')
    h.check(!h.button('确认审核版本1'),'failed confirmation should require fresh review')
  })
  await scenario('professional source uses the same review gate and editing cancels its confirmation',async h=>{
    await h.click('审核此版本')
    h.check(h.calls.length===0,'professional entry approved immediately')
    h.check(h.container.querySelector('[aria-label="审核确认"]').textContent.includes('专业 API'),'confirmation source missing')
    await h.click('编辑结果')
    h.check(!h.button('确认审核版本1'),'editing retained old approval confirmation')
    await h.input('专业来源的未保存修订');await h.click('版本 2');await h.click('版本 1')
    h.check(h.container.querySelector('textarea')?.value==='专业来源的未保存修订','professional draft lost')
    h.check(h.calls.length===0,'editing approved the original result')
  },'oasis-api')
  return results
}

export async function runResultRecoveryBrowserTests(records) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const results = []
  for (const status of ['conflict', 'error']) {
    const data = structuredClone(records)
    const record = data['workspace-a']
    record.tasks['task-b'] = { ...structuredClone(record.tasks['task-a']), taskId: 'task-b', title: '非活动任务' }
    record.taskOrder.push('task-b')
    record.activeTaskId = 'task-a'
    let failGet = false
    const remote = {
      async get(id) { if (failGet) throw Error('synthetic Host offline'); return data[id] },
      async editUnifiedResult() { return { committed: false, reason: 'revision-conflict', current: record } },
    }
    const store = createWorkbenchStore({ remote, saveDelayMs: 0 })
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }, { workspaceId: 'workspace-b' }])
    await store.hydrateWorkspace('workspace-a'); await store.hydrateWorkspace('workspace-b')
    const text = '甲\n  冲突恢复逐字正文\n<script>仅文本</script>'
    store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', text)
    store.updateResultEditDraft('workspace-a', 'task-b', 'run-2', '非活动任务修订')
    store.updateResultEditDraft('workspace-b', 'task-a', 'run-1', 'OTHER_WORKSPACE_CANARY')
    if (status === 'conflict') {
      try { await store.editUnifiedResult('workspace-a', 'task-a', 'run-1', text) } catch {}
    } else { failGet = true; await store.hydrateWorkspace('workspace-a', { force: true }) }
    const container = document.createElement('section'); document.body.append(container)
    const root = createRoot(container)
    const check = (value, message) => { if (!value) throw Error(message) }
    function Panel() {
      const state = useSyncExternalStore(store.subscribe, () => store.getWorkspaceState('workspace-a'))
      return createElement(PanelPages, { state, onReload: () => store.reloadWorkspace('workspace-a'),
        onDiscardResultEditDraft: (...args) => store.discardResultEditDraft('workspace-a', ...args) })
    }
    const click = async button => act(async () => { button.click(); await new Promise(r => setTimeout(r, 0)) })
    try {
      await act(async () => { root.render(createElement(StrictMode, null, createElement(Panel))) })
      const editors = [...container.querySelectorAll('textarea')]
      check(editors.length === 2, 'conflict/error page hid dirty drafts')
      check(editors[0].readOnly && editors[0].value === text, 'recovery text is not exact selectable read-only text')
      check(!container.querySelector('script'), 'recovery executed generated content')
      check(!container.textContent.includes('OTHER_WORKSPACE_CANARY'), 'recovery leaked another Workspace')
      const reload = () => [...container.querySelectorAll('button')].find(b => b.textContent.includes('重新载入'))
      const discards = () => [...container.querySelectorAll('button')].filter(b => b.textContent === '放弃此结果编辑')
      check(reload().disabled, 'reload must remain guarded while dirty drafts exist')
      const copied = editors[0].value // selectable DOM text; no system clipboard mutation needed
      await click(discards()[0])
      check(copied === text, 'readback lost exact text')
      check(container.querySelectorAll('textarea').length === 1 && reload().disabled, 'discard erased a different task or unlocked too early')
      failGet = false
      await click(discards()[0]); check(!reload().disabled, 'reload stayed stuck after explicit discards')
      if (status === 'error') {
        failGet = true
        await click(reload())
        check(store.getWorkspaceState('workspace-a').syncStatus === 'error', 'failed reload hid the error')
        failGet = false
      }
      await click(reload())
      check(store.getWorkspaceState('workspace-a').syncStatus === 'ready', 'explicit recovery did not reload authoritative state')
      check(store.getWorkspaceState('workspace-b').pageOperations['task-a'].resultEditDrafts['run-1'].body === 'OTHER_WORKSPACE_CANARY', 'recovery erased another Workspace')
      results.push({ name: `full PanelPages ${status}: retrieve, discard individually, reload`, status: 'passed' })
    } catch (error) { results.push({ name: `full PanelPages ${status} recovery`, status: 'failed', message: error.message }) }
    finally { await act(async () => { root.unmount(); await store.dispose() }); container.remove() }
  }
  return results
}
