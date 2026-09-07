import { createElement, useLayoutEffect, useRef } from 'react'

function LiveRegistration({ bridge, workspaceId, sessionId, useInput, inputActions }) {
  const input = useInput(value => value)
  const live = useRef(input)
  useLayoutEffect(() => { live.current = input; bridge.notify() }, [bridge, input])
  useLayoutEffect(() => bridge.register({ workspaceId, sessionId, inputActions, read: () => live.current }),
    [bridge, workspaceId, sessionId, inputActions])
  return null
}

export function ConversationInputRegistration(props) {
  if (!props.bridge || !props.workspaceId || typeof props.useInput !== 'function' || typeof props.inputActions?.setDraft !== 'function') return null
  return createElement(LiveRegistration, props)
}
