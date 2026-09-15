# S5 克隆演练前置核对

## 范围和新鲜证据

延续已批准的 DSH 隔离升级 V2；本批只读核对原目录，并新增局部检查助手/证据及进度记录。未修改运行 Profile、应用包、业务源码、日常 DSH 或旧副本；单代理自审，不是独立审计。

候选根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913。

1. cmd.exe 执行 `python .dsh-test\isolated-dev-20260913\verify-s3b-artifact.py s3b-after-ui-restart-verification.json`，退出 0。2026-09-14T11:54:46.973104Z 完成 34476 项保护/候选/归档检查，failures=[]；完整日常/旧副本程序树、选定保护控制文件、候选程序与锁定依赖、主业务源码与候选归档均符合记录。程序树之外的全部易变用户数据不在此证明范围。
2. 候选归档 SHA-256 仍为 4957e97d2663d69f742639414d0322631a8ebc243d4f3a947bd339444d09ce2b；没有因 UI 验收重新构建或安装。
3. inspect-rollback-inputs.py 只输出存储结构/哈希/计数，不打印材料或凭据。旧 sidebar-native-20260913/home-a 有 schema 4 的 2 个工作区、2 个任务、1 次 synthetic 运行、0 次回写；新候选有 1 个工作区、1 个任务、1 次 synthetic 运行、1 次回写。
4. 安装前备份 backups/s3b-before-install-20260914/home 没有 oasis_workbench.json，也没有 Oasis 顶层依赖，因此它不是包含本次已审核产物的完整业务回滚点。若回滚时只恢复该旧备份，将不能保留这次新产物；禁止将其冒充当前业务状态的回滚包。
5. cmd.exe 经 run-source-check.py/私有 Node 执行 check-business-data-compat.mjs，退出 0，2026-09-14T11:55:21.919Z。对旧/当前共 3 条工作区记录调用候选实际 parseStoredWorkbenchRecord：完整输入/产物完整性验证通过，解析前后 canonical 内容相同，输入对象未变；错误工作区键均拒绝。源 JSON 前后字节哈希不变，无 Host 启动或存储迁移写入。

原始证据位于候选 evidence：
- s3b-after-ui-restart-verification.json
- s3b-business-data-compat-preflight.json
- s3-check-1789386920910848800.json / .log

## 剩余风险与门禁

- 正常重启的结果/审核/路径已由用户确认保留，详见 S3B UI 记录；不等于跨版本迁移或回滚。
- 数据解析兼容不证明不同安装组合能启动，也未验证克隆中的 Workspace 路径重绑定和完整升级/回滚。
- 当前候选还在使用：对 Home/userData/Workspace 的完整一致快照及后续安装操作，必须等用户正常退出开发副本并只读确认其 Host 消失。不结束日常实例，不复制日常凭据或数据，不把活跃存储直接交给第二个 Host。
- 安全预览差距保持：新 Better 0.19.1 使用基于资源地址的原生 Sidebar 投影，当前源码没有 safePreview 能力，旧 0.18.0 补丁的 editor meta/dedupe 改法不能直接视作可移植。必要能力未恢复前保持受影响动作禁用，不伪造 capability；这不阻塞只读准备，但阻塞相应安全能力验收。

本次数据兼容预检状态：STATIC_ONLY。完整 S5 尚未完成；下一执行批先在开发副本正常退出后建立新的全文件一致备份及哈希清单，再针对新建独立克隆确定并校验旧/新安装、Home、Workspace 路径组合，原目录只读保留。任何启动前必须验证克隆没有回指原 Home/Workspace 的链接或配置，无法证明则不启动。实际模型/API、发布和日常迁移继续保持未授权。
