# M06只读预览 V0.1 旁置安装候选与配对结果

2026-11-07，Asia/Shanghai；Codex单代理。本轮执行用户“同意进行下一步”，对应[上轮下一步](../2026-11-07-m06-zero-preview-r1/execution-return.md)：先准备准确安装候选及配对，后对该组合单独办理零生成原生验收。未启动App/Host、真实调用或发布。

## 结果与准确对象

新私有归档5160c4e9已装配到全新隔离根，原冻结installer离线安装exit0；新根自身冻结controller的`--check`及只构造launch-spec的所有权回调均exit0。实际安装c3的140个成员逐字节对应归档，生成Profile中7个组件解析到同一新release；双启动锁与JSON provider所有权已取得、释放并复取，未创建业务JSON。安装准备不等App/Host/UI已运行或已接受。

| 身份 | 原组合（保持） | 新候选（本轮准备） |
|---|---|---|
| bundle SHA256 | `1c5baba6844b1b9e28e3cfd0c0a8913cf68bb1857f317d68096851c0eefe4bef` | `7aca55e9d5ccf7be21d20a3a33a7a02cbac256b7e725e69bca913ae03d624af5` |
| 业务归档 SHA256 | `6f2f16e771cb56bf5514b35de87bbf0903d6bd4faabad36cfef4f4ac327504bb` | `5160c4e910018e71cdd3f46452a2cc80b1cab6aab810bd4ae23dc5b5a7a89785` |
| 已安装业务成员 | 134 | 140 |
| 隔离根 | `.dsh-test/m06-p4-unknown-update-20261106-r1` | `.dsh-test/m06-zero-preview-installed-20261107-r1` |
| 实际App/UI证据 | 原生启停已验，M06输入页失败保持 | 未启动/未验 |

以上相对路径均以`/Users/tinadong7036/Documents/开发项目/DSH-Oasis`为根。新bundle：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/m06-zero-preview-installed-20261107-r1/bundle`；安装根完整路径：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-zero-preview-installed-20261107-r1`。

固定组合仍Desktop2.0.17／DSH0.2.0-rc.2／Sidebar0.24.1／Cordis4.0.4／Node24.21.0／pnpm11.8.0、checkpoint3。没有升级版本、重签App或改controller/writer。两组各自数据根，未复制旧Profile、认证、UNKNOWN、已接受稿件或未发送会话；新候选不声称继承这些记录的恢复结果。

## 相对旧安装的完整增量

[installation-spec.json](installation-spec.json)列出19项修改、6项新增、0项删除，全部限于c3及`profile-template.json`；其余27,163个文件及14条链接与原bundle一致。

新包不是6f2f的直接子归档，包含此前d2b9归档已验证的Fast39合同/JSON/投影与保存修正，以及本次V0.1只读预览。完整旧→新diff保留在spec中，不将差异缩称14个预览源码。既有源码/归档各139项及相关Fast39193项记录仅按其准确范围复用；本轮没有更改产品源码、重建客户端、重复打包或重跑旧业务测试，没有新增Fast39真实接线或验收。

新`nativeZeroGeneration`绑定5160c4e9；`src/index.js`守卫仍`0fa6c560dc3b2201be45187f6d02c82e8cf1d6e1faeda6e4e8fa25bbe88a8322`，`src/workbench-rpc.js`新守卫为`06b01bbde0d3e33f5de3c514bbc857734bdbccd79bfad6d7a5535773dd66b795`，旧hash保留在spec的old_zero_policy。只在新bundle中绑定已审新字节，未替换旧expected或重签旧证据。预算model/API/upload/payment均0，四项RPC只读白名单保持，普通业务/模型/认证/遥测等既有禁用配置不变。

## 命令与范围证据

- [base-verify-command.json](base-verify-command.json)：用原冻结controller核原1c5b manifest及payload/策略，exit0。
- [prepare-bundle-command.json](prepare-bundle-command.json)、[copy-command.json](copy-command.json)：复用原payload旁置CoW克隆，仅替换c3和新策略绑定，全部文件/链接hash与差异核对，exit0。证据脚本沿既有格式，不是新启动器或产品工具链。
- [install-command.json](install-command.json)：原冻结controller `--install 新bundle 新hash 全新root`，exit0；固定pnpm以offline/ignore-scripts、禁止自动管理版本及私有HOME/cache/store物化。原installer的`prepareDesktopProfile`子进程仅准备配置并禁fetch，不执行Desktop/Host/plugin apply；没有复制旧凭据或绕过认证。
- [controller-check-command.json](controller-check-command.json)：新根`control/node control/scripts/f-installed-runtime.mjs --check 新root`，exit0；核program/receipt/Profile、模块图与7个必要组件。
- [launch-spec-command.json](launch-spec-command.json)、[launch-spec-inspection.json](launch-spec-inspection.json)：既有`withInstalledLaunchSpec`回调只读取/断言规格，不调用exe或start；实际App锚点/cwd在新release、所有可写根在新data，零生成标记/预算和干净环境正确。双writer锁实见后释放，JSON provider事务释放后可重新取得。该证据只证明合作入口所有权及规格，不证明任意旧writer或OS级全面断网。
- [installed-member-inspection.json](installed-member-inspection.json)：140个归档成员对实际安装字节、7个Profile实际解析及新根无业务记录/无残留启动锁。57619端口本次只读观察为空闲，见[port-observation.json](port-observation.json)，这不是服务健康或未来仍空闲的保证。
- [protected-after.json](protected-after.json)：原安装c3的134个成员、原installation.json/controller、原归档/业务资源、合成UNKNOWN、18250e4c固定稿及R3批准字节保持。

## 执行前复核、保留与下一步

[preflight.json](preflight.json)绑定本轮实际读取的根/本项目AGENTS、中心/登记及两层followup、适用BM1/合同/矩阵和本项目R3-03接续，明确正文读取与仅身份核对范围；19项输入在收口前无漂移。当前协同1.2.2、整体1.3.1/NS1-R1＋适用BM1-R1/S1/S2-R1/G1及S2-R1 followup保持。原过时状态由当前受控追加接续，不回写旧原件；本轮按项目规则单代理/作者自审，没有独立复审。

本轮出口为**准确旁置安装候选已备、离线装配/规格核对通过**；App/Host/UI尚未启动，完整R3-03保持未关闭。Tina D对原固定稿四项及保留15警示的受限接受保持，未扩展为新组合或新产物接受；Community License正式采用/公开投影、G0及其他R3缺件不变。没有真实模型/API/上传/费用、WorkBuddy导入/投递、源CI/B/A、提交/推送或发布。

[下一步准确零生成范围](zero-generation-acceptance-scope.json)已绑定新root、7aca55e9/5160c4e9、端口57619及零预算：原生启动→只读八输入/准备/禁用入口→正常退出与一次计划内重启→仅本次所有权释放。首次失败只保全、不自动重启/改来源。该文件只是可审范围，不是启动许可；需按本聊天原V0.1“新包启动另办”及[项目AGENTS第4、9节](../../../AGENTS.md)取得该准确组合的授权后，才调用原冻结controller的`--start`。不复用旧1c5b已消费的启动许可。
