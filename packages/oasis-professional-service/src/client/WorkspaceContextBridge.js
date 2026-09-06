import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'

import { OasisPanelPortal } from './OasisPanelPortal.js'
import { ensureEmbeddedWorkspaceHidden } from './OasisWorkbenchSurface.js'
import { resolveWorkspaceId } from './project-resolution.js'

function blockedWorkspaceContext(generation) {
  return Object.freeze({
    status: 'blocked',
    reasonCode: 'workspace-context-invalid',
    generation,
    currentSessionId: null,
    workspaceItems: Object.freeze([]),
  })
}

export function createWorkspaceContextSnapshot({
  currentSessionId,
  workspaceItems,
  generation,
}) {
  if (!Number.isSafeInteger(generation) || generation < 0) return blockedWorkspaceContext(0)
  if (currentSessionId !== null && (typeof currentSessionId !== 'string' || currentSessionId.length === 0)) {
    return blockedWorkspaceContext(generation)
  }
  if (!Array.isArray(workspaceItems)) return blockedWorkspaceContext(generation)

  const projected = []
  for (const workspace of workspaceItems) {
    if (
      typeof workspace?.workspaceId !== 'string'
      || workspace.workspaceId.length === 0
      || !Array.isArray(workspace.sessionIds)
      || workspace.sessionIds.some((sessionId) => typeof sessionId !== 'string' || sessionId.length === 0)
    ) return blockedWorkspaceContext(generation)
    projected.push(Object.freeze({
      workspaceId: workspace.workspaceId,
      sessionIds: Object.freeze([...workspace.sessionIds]),
    }))
  }

  return Object.freeze({
    status: 'ready',
    reasonCode: null,
    generation,
    currentSessionId,
    workspaceItems: Object.freeze(projected),
  })
}

export function resolveWorkspaceBinding({ context, sessionId, visible }) {
  const generation = Number.isSafeInteger(context?.generation) ? context.generation : 0
  if (context?.status === 'blocked') {
    return Object.freeze({
      status: 'blocked',
      reasonCode: context.reasonCode ?? 'workspace-context-invalid',
      workspaceId: null,
      generation,
    })
  }
  if (context?.status !== 'ready') {
    return Object.freeze({
      status: 'pending',
      reasonCode: 'workspace-bridge-pending',
      workspaceId: null,
      generation,
    })
  }
  if (visible === true && context.currentSessionId !== sessionId) {
    return Object.freeze({
      status: 'pending',
      reasonCode: 'workspace-generation-not-current',
      workspaceId: null,
      generation,
    })
  }

  const workspaceId = resolveWorkspaceId(sessionId, context.workspaceItems)
  return Object.freeze({
    status: workspaceId === null ? 'unbound' : 'ready',
    reasonCode: workspaceId === null ? 'workspace-not-resolved' : null,
    workspaceId,
    generation,
  })
}

function BridgeStatus({ mode, reasonCode }) {
  const blocked = mode === 'blocked'
  return createElement('div', {
    role: blocked ? 'alert' : 'status',
    'data-oasis-host-state': mode,
    'data-oasis-host-reason': reasonCode ?? undefined,
    style: {
      position: 'fixed',
      right: 12,
      bottom: 12,
      zIndex: 41,
      maxWidth: 320,
      padding: '8px 10px',
      border: '1px solid var(--dsw-alias-border-l2, #d9d9dc)',
      borderRadius: 8,
      background: 'var(--dsw-alias-bg-base, #fff)',
      color: 'var(--dsw-alias-text-primary, #202123)',
      fontSize: 12,
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    },
  }, blocked ? '绿洲工作台暂不可用：检测到侧栏宿主冲突。' : '正在切换绿洲工作台侧栏宿主…')
}

export function WorkspaceContextBridge(props) {
  const {
    coordinator,
    useSessions,
    useWorkspaces,
  } = props
  const currentSessionId = useSessions((snapshot) => snapshot.current)
  const workspaceItems = useWorkspaces((snapshot) => snapshot.items)
  const generationRef = useRef(0)
  const hostSnapshot = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot,
  )

  useLayoutEffect(() => {
    generationRef.current += 1
    coordinator.updateWorkspaceContext(createWorkspaceContextSnapshot({
      currentSessionId: currentSessionId ?? null,
      workspaceItems,
      generation: generationRef.current,
    }))
    coordinator.reconcileExternalState()
    return () => coordinator.clearWorkspaceContext()
  }, [coordinator, currentSessionId, workspaceItems])

  useEffect(() => {
    if (hostSnapshot.mode !== 'better-sidebar') return
    const binding = resolveWorkspaceBinding({
      context: hostSnapshot.workspaceContext,
      sessionId: currentSessionId,
      visible: true,
    })
    if (binding.status !== 'ready') return
    void ensureEmbeddedWorkspaceHidden({
      store: props.store,
      workspaceId: binding.workspaceId,
      workspaceItems: hostSnapshot.workspaceContext.workspaceItems,
    }).catch(() => {
      try { props.store.setLocalPanelMode(binding.workspaceId, 'hidden') } catch {}
    })
  }, [currentSessionId, hostSnapshot.mode, hostSnapshot.workspaceContext, props.store])

  if (hostSnapshot.mode === 'standalone') {
    return createElement(OasisPanelPortal, props)
  }
  if (['integrating', 'releasing', 'blocked'].includes(hostSnapshot.mode)) {
    return createElement(BridgeStatus, {
      mode: hostSnapshot.mode,
      reasonCode: hostSnapshot.reasonCode,
    })
  }
  return null
}
