# 本地合并说明

本目录在 2026-11-27 从 `codex/v340-node-professional-api` 的 `f1668d79ef9cf19cc0b707e592bbd42e3c340a22` 完整迁入；原始 139 个文件与源提交逐字一致。该分支此前以独立根历史保存插件根包，因此采用子树方式保留，与 `packages/oasis-professional-service` 主开发包分开。

源包当前自述版本 `0.1.0-rc.5.next.10`，固定 NEXT 兼容组合仍沿原包。13 项专业服务合成合同测试通过；客户端在现有固定依赖下离线构建到私有临时目录，保留原提交的 lib 字节。没有安装或启动 Host、真实模型/API 调用、推送或发布。

原 SOURCE-PREVIEW / PUBLIC-RELEASE / LICENSE-ADOPTION 文件是其原公开版本的历史凭据，不能用来接受本次未发布改动。依赖及日常 Profile 不随本地 Git 合并升级。本目录不替代主包，也不把隔离 M02 候选自动装入任何 Profile。

本次合并及验证见 [执行记录](../../docs/evidence/2026-11-27-git-consolidation/execution-return.md)。
