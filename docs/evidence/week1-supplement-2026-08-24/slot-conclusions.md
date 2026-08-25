# Slot合同结论

## 当前证据边界

- 已核对本机DSH `0.1.1-rc.2`已安装包的类型声明与浏览器产物。
- 隔离Host通过官方Client Inspect Provider取得`Slots.listSubTree`无root全树与三个精确root的原始返回；原始JSON见`browser/live-slot-subtrees.json`。
- 该证据只覆盖当前版本、本机隔离Profile和当前页面，不外推到未来DSH版本或生产环境。

## 决策

1. `conversation.input.right`为`list/session`，只放置“研发 / 专利”入口。
2. `shell.overlay`为`list/root`，以唯一ID增量挂载绿洲右栏。
3. `details`为`single/session`且由DSH原生`DetailsPanel`占用；绿洲不得注册或替换它。
4. normal不得调用`ctx.layout.openDetails()`借用右列；真实浏览器RED证明该调用会产生遮罩并拦截绿洲右栏点击。normal使用插件自有360px右轨，hidden仅卸载绿洲面板。
5. expanded只读测量已渲染侧栏右边界；不写DSH DOM、不复制AppFrame、不依赖构建哈希类名。

## 后续运行门

门禁已关闭：全树非空；`conversation.input.right`为`list/session`且`oasis-professional-entry` active；`shell.overlay`为`list/root`且`oasis-professional-panel` active；`details`为`single/session`、仍有active occupant且不含绿洲ID。隔离浏览器同时证明绿洲面板可用且不调用原生Details布局服务。
