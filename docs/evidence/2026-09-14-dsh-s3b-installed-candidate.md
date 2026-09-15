# S3B 候选安装与首次启动

## 执行范围

用户确认“开发副本已退出”后，进程核查确认开发 Desktop 无残留，日常主进程 8880 保持运行。沿用已批准 V2，本批不改源码、不修改日常/旧副本，不调用真实模型/API。执行器为 cmd.exe，Python 子进程显式调用私有 Node 与固定 pnpm 入口。

候选根：
D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913

## 备份与安装

- 新建 backups/s3b-before-install-20260914，复制候选 Home、userData 和已有 Workspace 文件，共 13,505 个文件；复制前、目标副本、复制后源文件 SHA-256 一致。空 workspace-b 没有业务文件；原目录仍保留。
- 保存旧 candidate-pin.json 和 profile-installation-pin.json；没有备份/复制日常凭据或材料。此备份包含候选自身状态，不应上传或作为产品资源分发。
- 安装已验证归档 oasis-professional-service-0.0.1.tgz；SHA-256 为 4957e97d2663d69f742639414d0322631a8ebc243d4f3a947bd339444d09ce2b。
- 第一次 pnpm add 因误带仅 install 使用的 frozen-lockfile 选项被参数解析拒绝，Profile 安装元数据未变。移除该选项后，纯离线方式因缺供应链元数据而拒绝。保留失败日志，不跳过校验。
- 仅安装子进程允许访问官方 registry.npmjs.org 补齐元数据；167 条供应链检查通过，安装退出 0；没有运行安装脚本，没有改变应用的网络隔离配置。
- 安装输出的“+1 -2”未用作依赖变化结论：逐文件和锁对象复查确认原有 13,316 个依赖文件、167 条锁定包记录和旧 hoistedLocations 均未改变，备份中没有文件被删失。新插件 93 个文件全部等于归档。
- pnpm 的 peer 警告不冒充自动兼容：Oasis 固定 Host peers 由独立 Desktop 内置模块提供；实际业务界面仍须验收。
- 只向公开 Profile bundles 追加 oasis-professional-service；保留已有 Better Sidebar Profile patch，不再添加第二个 Better Sidebar bundle。更新安装元数据和启动 pin，原 pin 留在备份。

## 新鲜运行证据

- 启动/迁移定向测试 4 项通过，退出 0。使用实际 Desktop 2.0.9 迁移谓词确认当前 Profile 无需自动迁移。
- 启动器 --check 退出 0；正常启动退出 0，开发主进程 4388、Host 39376，监听 127.0.0.1:43121。日常主进程仍为 8880。
- 新启动 runId：20ba7b97-ab69-42d3-9f0c-9f4855ed00c4。
- 2026-09-14T07:49:43.235Z 完成 health-commit；rendererStatus=healthy。历史 error.log 中旧迁移失败仍保留，不把历史日志当成本次新故障。
- 普通 HTTP、同源 Origin、恶意 Origin 三类未认证测试均返回 403。最初预期 Connection 401 的断言不成立；核对实际 DesktopWebServer 后确认外层 renderer-capability 门禁先行拒绝。未读取/伪造 renderer token，未开放普通浏览器访问，不能据此声称内部 Connection 认证或已认证业务路由验收完成。
- 合成文件 workspace-a/isolation-20260914-a.md 仍为此前用户保存的 SHA-256：1612312a05aa67635881ba268b685cc5913cb63f114f3d54dc68c2b29aa3eeaa。

原始证据位于候选 evidence：

- s3b-profile-install-result.json / s3b-profile-install-retry1.json：保留失败。
- s3b-profile-install-registry.json：成功安装与未绕过策略。
- s3b-profile-activation.json：旧依赖/锁、归档匹配、Bundle 与 pin。
- launch-1789372177364.json：本次启动。
- s3b-runtime-check.json：进程/端口/启动事件/外层 HTTP 拒绝/文件保留。
- s3b-after-install-verification.json：安装启动后保护与归档复核。

## 当前人工门禁

安装与启动健康不等于业务界面通过。需用户在开发副本的合成测试项目/会话中点击输入框旁“研发 / 专利”，确认原生右侧栏出现绿洲专业工作台/功能中心并返回截图；不点击生成、不上传真实材料。

富文本安全能力仍保持上批明确的降级：纯文本预览，绿洲安全文件打开禁用。S3 整体、S4 Desktop 同页业务验收及 S5 升级/回滚验收均未关闭；不新增真实调用或日常迁移许可。
