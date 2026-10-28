# 同数据根受控Profile生命周期

新增入口 `scripts/f-profile-lifecycle.mjs` 复用原F装配器及所有权锁。只操作新建私有管理根内的runtime Profile，不安装/更新日常App，不增加业务Provider或通用安装框架。

```zsh
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-profile-lifecycle.mjs --install /absolute/new-management-root /absolute/spec-v3.json
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-profile-lifecycle.mjs --check /absolute/new-management-root
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-profile-lifecycle.mjs --start /absolute/new-management-root
# 明确给出current与目标release，不按版本大小或mtime选择。
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-profile-lifecycle.mjs --upgrade /absolute/new-management-root /absolute/spec-v4.json CURRENT_UUID
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-profile-lifecycle.mjs --rollback /absolute/new-management-root TARGET_UUID CURRENT_UUID
```

spec只允许baseAdmission和唯一checkpoint3/4；使用原已审R7及精确已物化artifact，禁止test fixture/模型配置覆盖。固定pnpm11.8.0以私有HOME/cache/store离线lockfile-only→frozen-lockfile、ignore-scripts、禁自动下载执行。`releases/<uuid>/`的Profile、admission及receipt只创建一次；活动准入是当前版本复制件，旧原件在其版本目录保持，不重签旧R7/历史实验准入。

所有本脚本支持的writer（desktop/sdk/recovery/maintenance）先占管理根和runtime的startup.lock，检查当前Profile/版本回执与完整固定输入，再进入动作。旧F CLI也因runtime启动锁被拒绝。Profile维护另取得实际JSON存储根所有权，旧受保护SDK正持有时不得修改Profile。SDK消费方仍须装载原JSON guard；本函数不是允许绕过后端归属/权限的任意写入服务。原生Renderer/会话/文件写入属于已持锁的Desktop/Host生命周期，当前同源v4 checkpoint租约规则仍分别适用。

正常升级/回退只替换profiles/desktop及活动准入，home/storages、sessions、attachments与userdata不回滚；业务UNKNOWN不重派。安装进程边界故障恢复原Profile与准入；若恢复失败或crash遗留锁，拒绝启动/自动偷锁，保留人工诊断对象。没有自动删除旧版本、活动任务或用户数据的命令。

保护是合作入口的分发/执行合同。直接启动未受控旧Host、原始stock JSON后端或任意文件writer仍可能绕过，见本批具名FAIL。当前不是OS访问控制、签名安装器、全writer强制发行或跨平台升级保证。source/link源必须保留，未验证可移动独立安装包。当前实证是固定基础组合内自有checkpoint v3→v4→v3，非上游DSH/Desktop升级。

准确执行/范围见 [本批返回](../../docs/evidence/2026-10-28-f-profile-lifecycle-return.md)。本次仍零新增真实模型/专业API/费用，不触发发送/上传或发布。
