# UI-RC2-01修复及rc.3候选准备回执

2026-11-08，Asia/Shanghai；Codex单代理。**源码与实际归档的离线修复已验证，rc.3准确候选已备好；未安装或原生复验。** 当前安装仍为rc.2，保留此前原生验收、旧稿/版本和宿主会话元数据增量。

## 已完成的修复

最新“同意进行下一步”承接上一轮具名UI缺口及修复接点，批准记录见[authorization](authorization.json)。复用已批准V0.1；没有新界面、新业务接口、资源/规则、任务或生成方式。

- `src/client/PanelPages.js`：恢复模式没有活动任务页时直接复用已有FunctionCenter，展示保留任务及“重新打开”，沿用其中已经禁用的新建/导入入口；不再落到提示新建且导入可用的普通空态。
- `src/client/PanelChrome.js`：单独计算canCreate；恢复模式、旧零预览模式或没有创建回调时禁用新建按钮，并移除onClick、同步禁用外观。普通模式有回调时仍可创建；任务选择、关闭和功能中心导航不被一并禁用。
- 只在既有恢复客户端测试文件追加4个回归用例。先RED确认3个失败（普通无回调亦有同一缺口），再最小实现；原测试与新用例都保留。

## 新鲜验证

| 验证 | 结果／边界 |
| --- | --- |
| 源码定向检查 | 46/46，exit0；恢复空态/保留任务、禁止创建、普通与旧零模式、选择/关闭及原UI合同 |
| 实际rc.3归档定向检查 | 69/69，exit0；固定现有peer，业务实现全部从新归档解析，无源码回退 |
| 编译产物 | 51项自有源码、17项Zod source map内容与归档一致；注册既有3个slot，0 RPC；没有DOM/App/Host运行 |
| 构建与打包 | 固定Node/tsdown，独立输出目录与私有HOME；npm pack离线、禁生命周期脚本、独立空配置，未安装/升级依赖 |
| 完整bundle | 27,173 regular files／14 links、固定版本/6项guard/精确scope/零预算校验通过；原固定App签名只读核验通过，没有执行App |
| 旧安装及保全 | rc.2控制器`--check` exit0；42个具名文件保持（43条核对记录，一项重复引用），包括当前业务JSON ea5d5e2f、Workspace元数据、旧/新已保存文件及工作区原lib；旧安装仍25f54985 |

本次涉及两个客户端模块，因此按受影响合同运行以上定向检查，未运行会在工作区重写lib的整包`npm run verify`；不把定向结果称完整发行验收。旧Host/11项白名单/租约/真实生成及历史业务证据按未变字节复用，不重建夹具、不重跑旧run。测试中的临时合成夹具不写实际隔离根。全部RED/命令与日志保留于本目录。

## 准确候选

| 对象 | 身份 |
| --- | --- |
| 业务包 | `0.1.0-rc.3`／private／125成员 |
| tgz SHA256 | `b54454a5de8d18851288e73aae7d186c5e4562f029674f0f7ef615f430fa60b6` |
| bundle SHA256 | `f03100c7f31b5100e886374e61aac07132421a5107365cfc2baa38996bec58bc` |
| 派生控制器SHA256 | `0398b0c882b3a78186239ab43872a3b67944d65fa60b886a84a27cf3b23fa085` |
| 候选根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-recovery-ui-gap-20261108-r1` |

相对rc.2归档836f658e，119成员原字节相同；只变更两处UI源码、client.js/map、package.json和PUBLIC-RELEASE.json共6成员。资源、Community License正文/采用文件和第三方通知保持。rc.2内部PUBLIC-RELEASE的packageVersion仍为历史rc.1；旧包保持冻结，新rc.3已与package.json对齐，并将111个历史正式选择来源的计数明确标为原口径（本次归档125成员，src内115文件），不冒称重获权利方采用或扩张原140成员范围。source map仍为本地构建相对路径，未声称满足发布规范化。

bundle相对25f54985只变更上述6项业务成员、profile-template及另版控制器共8项；控制器仅由当前已审源码替换业务版本字面量，未修改旧controller。Profile六guard中仅lib/client.js变化，scope、11接口、零预算和固定宿主/pnpm/Node版本不变。完整身份见[candidate-identity](candidate-identity.json)、[bundle-identity](bundle-identity.json)及[bundle验证](bundle-verify-result.json)。本组合不是原生验收通过的rc.2组合。

## 审阅、保全与下一步

按项目要求单代理，完成对本轮before快照与实际差异的作者自审；没有未处理的重要代码发现，也没有独立代码复审。没有覆盖既有未提交变更、提交/推送、安装/升级旧根、启动App/Host、模型/API/上传/费用、发送、投递或发布。中心/总计划不改，两个current_entry只增加本轮前缀，旧全文完整保留。

UI-RC2-01状态记为**FIXED_OFFLINE_NATIVE_RETEST_PENDING**；旧rc.2回执仍保留当时OPEN，既有安装没有被修复。本轮不续用此前两次已消费的启动许可。

下一步为[rc.3隔离安装及离线核对范围](next-offline-install-scope.md)：在现有具名隔离根保留rc.2 release、原控制器/元数据及revision15历史，经现有有日志控制器交接和离线upgrade接续；不创建新业务run/搬迁认证，不启动App。完成实际同版安装后再绑定rc.3原生零生成回归范围，不能借用rc.2原生证据。真实业务、专业/用户接受、法律专业复核、PREP2/G0、WorkBuddy及发布各按原门。

执行前输入/授权及差异见[preflight](preflight.json)，最终保全、身份及未验边界见[verification](verification.json)。
