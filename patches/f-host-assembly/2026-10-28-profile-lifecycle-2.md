# Profile生命周期当前修订2

当前入口是 `scripts/f-profile-lifecycle-2.mjs`。原 `f-profile-lifecycle.mjs`、原说明和首轮131成员保持为F-PL-A01的历史，不作新根的可靠路径准入入口。不要把原失败版改写或只换其expected hash。

修订2命令参数与[首轮生命周期说明](2026-10-28-profile-lifecycle.md)相同，**明确替换入口文件为`f-profile-lifecycle-2.mjs`并使用不存在的新管理根**。controllerInputs绑定该文件准确路径/字节；原生命周期入口不能消费新的修订2管理根。没有原管理根自动迁移、认证复制或上游DSH升级功能。当前实证新根 `.dsh-test/f-profile-lifecycle-20261028-r2`，runtime数据根贯穿自有checkpoint v3→v4→v3；每版回执只创建一次，不用最高版本/mtime选择。

修复将既存内部根的canonical/类型检查前移到通用check：运行根的既存user/home/userdata/cache/temp/evidence/workspace-a/b必须为无链接目录；home/storages、sessions、attachments树中已有链接（含悬空或子目录链接）拒绝。只看数据树目录项/lstat元数据，不读数据文件正文或认证；缺失数据根只读放行，不创建锁或目录。原维护时的检查继续保留。

因此本入口desktop/sdk/recovery/maintenance均在回调之前拒绝已存在的路径别名，实际guarded SDK不再沿该别名在管理根外创建存储。Profile/node_modules中原批准链接仍由固定装配准入核对，不能一概删除。它仍是合作入口的预检与排他合同，不是OS权限隔离、抵抗未受控writer检查后改路径、或完整全writer发行保证。

两层启动锁、维护JSON根排他、不可覆盖版本快照、失败关闭和明确current/target回退沿原规则。没有自动清除崩溃遗留锁，不把上版Profile恢复当业务数据回滚。旧stock JSON writer绕过的FAIL、完整F、签名安装器/跨平台/上游升级和旧管理根迁移继续开放。当前结果见[修复返回](../../docs/evidence/2026-10-28-f-profile-lifecycle-repair-return.md)。
