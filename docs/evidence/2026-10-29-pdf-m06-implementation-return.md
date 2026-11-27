# PDF与M06实际接入：最小实现返回

2026-10-29，Asia/Shanghai；单代理作者自查。沿[执行前复核](2026-10-29-pdf-m06-implementation-preflight.json)及用户“继续解决解析/隔离/分发与后台绑定、最小改动、不扩大实验”的授权执行。状态：**组件实现与限定验证完成，正式Host/PDF及新版远程来源尚未启用**。

## 本轮实际代码

| 边界 | 实现及验证 | 保留条件 |
|---|---|---|
| PDF解析 | 新增 `scripts/pdf-text-worker.py`：原始1MiB有界入口、经典XRef/对象数/页树预检、共享解码预算（单阶段8MiB/整份16MiB）、不支持内容拒绝、正文/UTF-16定位与双hash。原公开PDF文字与定位不变；空白/加密/损坏及页树声明错误拒绝。 | 当前是保守文字子集实现候选：拒绝流式/混合XRef、增量更新、技术绘图/图像、未知过滤器及未支持字体/布局；并非全PDF支持或完整profile准入证明。所有边界/畸形结构的完备性尚未取得U1验收。 |
| 内核隔离 | 同一worker在解析前要求cgroup-v2 memory.max=268435456、memory.swap.max=0、pids.max=1，关闭额外FD，安装Linux/aarch64 seccomp默认拒绝过滤器；实际open/socket/exec/clone均EPERM。5秒默认终止的内核alarm已设置、解屏蔽，过滤器拒绝后续修改timer/handler/mask。 | 硬内存实际OOM已验；本轮未新增超时到期/恶意stdout或stderr/取消回收用例。alarm设置不冒充到期终止实测；Host总准备15秒、最终受控启动器与产品生命周期仍需接线。其他平台拒绝执行，Mac组件测试不冒充Mac原生隔离。 |
| 分发核对 | 新增 `scripts/verify-pdf-distribution.py`，对已有固定pypdf6.10.0原件核SHA、60成员全覆盖RECORD、路径/符号链接/展开量以及1605字节许可原文。实际[核对结果](2026-10-29-pdf-selected-parser-verification.json)包含原文及逐成员hash。 | 只关闭选定解析器原件/通知字节核验；完整Python/stdlib/native运行时、Lima/Docker及启动器分发闭包/全部通知、产品分发决定仍未关闭。未将临时镜像宣布为用户必装依赖，旧2061成员候选与原件不重签。 |
| M06 API适配 | 新增 `src/m06-api-contract-adapter.js`：八字段独立编码、原prepared/receipt复核、实际HTTP正文容量和独立hash、七字段响应校验、原key一致性，以及账户/Workspace/folder/服务/schema/价格/资源/工作流交付关联校验。复用原API客户端及共同输入/输出校验器。 | 是Host内部合同适配组件，尚未接普通Host/RPC、持久化运行/确认/费用或新版来源开关。delivery须由可信Host读取并核对真实提供方接受原件，schema/hash本身不是批准或服务端权限。没有伪造实际绑定。 |

隔离机制依据[Linux seccomp文档](https://docs.kernel.org/userspace-api/seccomp_filter.html)，固定内存包络使用[cgroup-v2接口](https://docs.kernel.org/admin-guide/cgroup-v2.html)。内核机制与实际命令证据分别保留，代码存在不等于完整沙箱或发行接受。

## 容器回放及定向检查

只复用原公开两页PDF与原384MiB native分配两项；不下载、不换镜像、不增加实验样本。固定原Lima2.2.1/Alpine3.23.4/Docker29.7.0、本地镜像 `sha256:7e1ff0cb5e83403d186374ef035979dd27cf42ce90337cea6847e8eec86dc73e`。内核限制加入后，两项均通过；修正页树及补强cgroup/timer后按同两项必要重验，三版实际结果分别保留： [首版](2026-10-29-pdf-worker-isolation-verification.json)、[页树版](2026-10-29-pdf-worker-isolation-verification-r2.json)、[最终源码版R3](2026-10-29-pdf-worker-isolation-verification-r3.json)。R3绑定当前worker完整SHA256；公开PDF exit0、正文hash仍 `f8d850701bf5e3201bab7c688dea0807f7d341981b29b32dfbe03ffe9e671ecf`，OOM exit137且OOMKilled=true，open/socket/exec/clone实际EPERM。临时容器均移除，VM最终Stopped。

按测试先行保存缺实现RED及GREEN；作者复核发现并修正无原key可被接受、页树Count不符、交付凭证未显式关联服务三项，失败用例与修复均保留于本轮私有执行目录。首轮API正例曾将生产origin标为non-production，修正夹具环境标签，没有放宽原origin政策。

最终定向命令：

```zsh
tools/bin/node --test packages/oasis-professional-service/test/m06-api-contract-adapter.test.mjs packages/oasis-professional-service/test/oasis-api-contract.test.mjs packages/oasis-professional-service/test/oasis-workspace-binding.test.mjs packages/oasis-professional-service/test/v340-preparation.test.mjs
/Users/tinadong7036/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3.12 -B scripts/tests/test_pdf_text_worker.py
python3 -B scripts/tests/test_pdf_distribution.py
```

分别42/42、6/6、2/2，exit0，无跳过；不是全仓库、完整U1或业务质量验收。源码/命令/退出码与保全见[最终验证](2026-10-29-pdf-m06-implementation-verification.json)。按本项目规则只运行受影响测试，未安装依赖或重做完整宿主验收。

## workarea方法已落实核对，实际M06绑定未取得

按用户提供的workarea位置，读取真实 `src/api/services/ai.service.ts#createWithApi` 与接口文档8.5，确认前端只调后台 `/api/apicategories/create`，后台负责Dify；实际外层是 `inputs/id/folder_id/api_process/key`，只有服务metadata声明为file的字段才转Dify文件对象。新版候选的paragraph文件快照不能按`_file`后缀套旧上传URL转换。[来源及差异记录](2026-10-29-m06-workarea-method-binding.json)绑定四份读取文件，workarea未修改。

当前workarea接口文档SHA `85aeb856ada9a41475542c2fe91ef8289c0eda97186b57c56837eedead0e080d` 与旧项目规则历史pin `429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1` 不同；本轮只确认实际代码及8.5的同一转接边界，未冒充旧原件、改expected hash或改既有API基线。未来实际绑定仍须固定提供方当前合同身份。

所查src/docs/接口文档中未找到M06、Flow-2-6或m06_output_json登记；这不是远端不存在任何相关服务的证明。外部Dify登记仍缺实际实例入口/应用/工作流导出，已有后台R6只证明传输与ACK/恢复，不代M06业务映射。已向用户询问新版服务是否创建及管理入口；在取得实际ID/endpoint/schema、Dify版本/DSL及接受回执前不绑定旧39/46，不直连Dify，不提交创建或费用请求。

## 未完成的正式出口与保全

PDF还需完整运行时/启动器分发闭包和通知、声明profile/资源限制的资格接受，然后才可按原顺序U1→D1实现Host同份字节/完整extraction/新v4及累计MD兼容。源码worker结果尚不是Host签发的提取凭证；`workspace-materials`、`v340-preparation`及现行v1/v2/v3未修改，生产入口继续.md/.txt。API还需真实服务及权威绑定、持久运行/确认/UNKNOWN接线和另行实际消费；G0、专业/用户接受及发行保持OPEN。

因约900MiB可用空间而完整旁置检出需约736MiB，本轮记录最小偏离：原地新分支 `codex/pdf-m06-minimal-20261029` 保留所有未提交原件，未复制完整工作树。原36项文件除三状态入口仅前置接续外保持原字节；旧HEAD、固定组合、依赖锁、资源pin、日常DSH及既有Profile均不改。无后台/workarea业务改写、模型/API生成/上传/费用、跨项目投递、提交、推送或发布。作者单代理自查，不声称独立审计。
