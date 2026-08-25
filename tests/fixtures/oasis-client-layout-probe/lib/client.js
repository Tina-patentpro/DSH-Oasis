window.__ModuleLoader__.load({
  id: 'oasis-client-layout-probe',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    const { createElement } = require('react')
    const inject = ['slots', 'layout']

    function apply(ctx) {
      const slots = ctx.get?.('slots') ?? ctx.slots
      const layout = ctx.get?.('layout') ?? ctx.layout
      if (!slots || !layout) return () => {}
      return slots.inject('conversation.input.right', () => slots.register({
        name: 'conversation.input.right',
        id: 'oasis-native-details-verification-probe',
        order: 95,
        label: 'Native details verification probe',
      }, () => createElement('span', { style: { display: 'inline-flex', gap: 4 } },
        createElement('button', {
          type: 'button',
          'data-testid': 'oasis-native-details-open',
          'aria-label': '打开原生详情验证',
          title: '打开原生详情验证',
          onClick: () => layout.openDetails(),
        }, 'D+'),
        createElement('button', {
          type: 'button',
          'data-testid': 'oasis-native-details-close',
          'aria-label': '关闭原生详情验证',
          title: '关闭原生详情验证',
          onClick: () => layout.closeDetails(),
        }, 'D−'),
      )))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
