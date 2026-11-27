import { Component } from 'react'

export class OasisPanelBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    this.props.layoutAdapter.fault(`panel-render-error:${error instanceof Error ? error.message : String(error)}`)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

