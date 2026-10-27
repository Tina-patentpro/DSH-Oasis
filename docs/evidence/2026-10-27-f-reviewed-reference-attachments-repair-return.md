# F 固定审核引用与附件恢复：首轮审计修复返回

日期：2026-10-27；根目录 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis`，zsh；分支 `mac/continuity-v2`、HEAD `035fe82b3f97b983bb561fbefff9ae1ea9d42862`。本返回冻结修复候选，等待同一 GPT6.1 Max 独立子代理复审；不预写审计接受。

首轮返回、执行清单、独立审计保持原字节。首轮结论仍是“固定审核引用具名无模型子集可接受，附件恢复两项 P2 不接受”；本轮不覆盖失败记录。逐成员关系、原版备份/重建说明、R7 pin、命令和退出证据见同名 `-repair-execution.json`。

## 修复与验证

**F-DR-A01**：恢复的通用文件现在保留独立的原生控制器标记；原生 `rebindDraftFiles` 对它们取消旧传输归属、再中止旧操作，并恢复为无 receipt 的人工重试状态，不自动上传。标记在明确重试成功后仍保留，下一次会话切换继续使旧 receipt 失效；晚到旧响应不能令新会话 ready。普通新选文件沿用原生逻辑。标记随附件释放/控制器销毁清除。

**F-DR-A02**：任何可能抛错的 UUID/克隆工作之前，先同步写入无效 fence；有效 checkpoint 的 generation 必须非空。UUID 故障后，旧附件不能在冷绑定时复活。若 fence 存储不可写而 IndexedDB 可写，则串行写入 schemaVersion=0 tombstone，使旧快照失效；两处存储均不可更新时明确提示可能回到旧快照，不宣称永久防恢复。

四个新增回归先 RED（19项中15通过/4失败），修复后19通过；另补普通新选文件保留行为的特征检查，最终工具 Node24.21.0 和官方 Electron 内置 Node24.18.1 **各20通过、0失败、0跳过，退出0**。实际固定编译产物中的原生控制器使用真实 Cordis/Store，上传传输仅进程内假对象；不以假 receipt 宣称实传验收。未改业务源码，首轮独立重跑通过的40项引用合同及12次实际 SDK 身份拒绝证据按相同输入复用。

## 同配对实际 Desktop 证据

R7 继续使用官方 Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1及原 UI 补丁；自有 conversation 候选为 `0.2.0-rc.2.oasis-draft.2`，不是基础组合升级。固定 pnpm11.8.0、离线冻结锁、忽略生命周期脚本物化。官方签名 App、日常 Profile、原装配和业务候选均未修改。R6→R7 183个 pin 的具名差异仅修复代码、自有包版本、临时只读观察器和新 launcher；无意外重选依赖。

修复版实际原生文件选择器选取公开合成 PNG、review-long.md、review-ordinary.md。重启前后公开 `useInput` 均报告：同 workspace/session、73字符/73字节、SHA256 `38155cc6ab8cbd7f88aa53741a1a3528cea15903bc9a147bb99c72c39609e0b0`、图片1，结构化文件引用2，source/ref/offset/length/label/clipboardText/invalid 相同。图片可见；没有发送消息。

另经实际业务“使用固定审核版本”重新插入长稿后，用同一 R7 冷启动验证 **126692字符/127894字节**，前后 SHA256 均为 `1ea283cfda8194abe88ab5c2667af0bf596f79696509538974ea24bf38cc85e2`，附件0。普通固定审核投影及当前文件变化不沿用审核的证据保留首轮 R5，业务/审核代码没有变化。

临时 public slot 观察器还在真实浏览器 IndexedDB 和实际导出的 ConversationController 中恢复 Blob 文件；字节26、name/type/lastModified/SHA保持，执行 rebind 后 uploads=0、无旧 receipt、需人工重试。该观察器使用单独 Cordis Context 和假 fileUpload，不是实际 Host 上传或真实模型附件交付。桌面真实 GUI 的非图片是原生文件路径引用，不能冒充通用上传文件。此层差异持续保留。

R7 共四次启动，均正常退出0；第一次升级兼容观察、第二/三次附件恢复、第三/四次长稿恢复。第一次长稿“after”观察未展开，未取得完整摘要，保存为不充分证据；随后另取 `repair-R7-long-before-final.ax.txt` / `repair-R7-long-after-final.ax.txt` 成功配对，不把早先缺证改成通过。所有受控运行已关闭，57563无监听、startup.lock不存在，最终 `--check`183pins通过。

## 保全与剩余边界

首轮174成员的9条工作路径因修复改变，不能再声明当前174条全部匹配旧值。8条有修复前备份，临时观察器模板由精确逆差异重建并与首轮冻结 SHA 逐字一致；其余165条仍原值。修复执行清单明确列出对应关系；第一返回/执行清单/审计文件原字节不变。首轮 R1—R3 装配失败、旧 orphan 附件 FH-A01、原 UNKNOWN 均保留。

本批仅旁置开发候选及上述具名无模型子集。完整 F、原孤儿附件恢复、超过150000字符的固定文件引用、真实模型正文/附件参与、专业 API新版八输入、U1/D1、G/H、阶段6、发行升级恢复和正式发布不关闭。旧 UUID/fence 的极端双存储不可写边界也不宣称消除。新增真实模型/API/上传/发送/费用均为0；未读取或迁移认证，未提交、推送、发布或安装日常 Profile。
