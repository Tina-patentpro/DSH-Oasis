# PDF/DOCX与Flow-2-6解阻接续 R2

2026-10-29，Asia/Shanghai；单代理作者自查。承接用户“继续解决第3、4项的阻塞”，执行前身份、原许可与19项预存工作区文件保全见[EXEC-R2](2026-10-29-pdf-docx-g0-unblock-r2-preflight.json)。本轮没有重复上一轮8项准备检查或65项provider测试，也没有将同一诊断重计为功能完成。

**当前结论：补齐了现网站服务证据，并核清了已安装Profile的真实选择；PDF/DOCX的新运行依赖路线等待用户决定，新版远程M06合同仍缺。未启动新的真实模型或生成请求，U1/D1/G0均不关闭。**

## 1. 第3项的可执行解阻路线与待决定项

现固定公共provider不满足材料合同的硬内存/访问/执行要求，沿上一轮证据，不再次寻找或重装同一provider。当前PATH未发现docker、podman、colima、limactl、wasmtime或bwrap；这只是当前PATH观察，不等于全盘断言没有相关软件。主机为macOS 27.0.1，空间探针显示可用约2.4GiB。

本轮查到一条可评估的替代机制：Docker官方支持容器硬内存限制；同值memory/memory-swap用于禁用swap，仍须核实际Linux内核能力，不能用配置字面量当作已执行限制。[资源文档](https://docs.docker.com/engine/containers/resource_constraints/)

严格读白名单、无网络、无exec仍需单独证明。Docker默认seccomp并不等于本材料合同的全部限制；只采用已有默认容器配置不足以声明通过。[seccomp文档](https://docs.docker.com/engine/security/seccomp/) Colima官方列明macOS Intel/Apple Silicon与Linux支持，可作为本机评估路线；没有据此声称Windows或最终跨平台交付已完成。[官方项目](https://github.com/abiosoft/colima)

已向用户提出两个具体选项：

| 选项 | 实际作用与边界 |
|---|---|
| 允许隔离的本地Colima/Docker离线可行性试验（建议） | 先冻结真实版本/来源及空间预算，PDF优先核硬256MiB、文件/网络/exec、逐流预算、5000/15000ms与回收。材料只在本机；试验不是U1或D1通过，不改日常DSH/现固定组合。DOCX另验。 |
| 保持现有依赖，等待合格公共能力 | 材料格式继续禁用；本地文字和不依赖它的API合同准备继续。 |

**截至本回执，容器选项尚未回复。** 未安装或下载新运行依赖，未创建VM或容器、未清理任何用户文件/原件。选项确认后仍需依赖身份、空间及实际机制核验；不将推荐或用户选路当作READY。原v3兼容差异及格式剖面/来源通知缺件继续保留，未静默改旧合同/版本。

本次确认必要性来自项目AGENTS第4节“重大版本/范围变化……须明确决定”；旧的必要provider依赖安装许可不自行扩张为新增容器运行架构。brainstorming允许的试验例外为“A spike they said yes to may be built.”；新路线尚未获该决定，不实施依赖安装。原范围内的只读核对与合同准备已继续完成。

## 2. 第4项：用户登录后的当前网站证据

用户完成网站登录并回复“已登陆”。通过现有页面选择Basic/Fast，仅观察服务元数据；未填写材料、上传、建立项目或点击生成。准确脱敏字段见[实际响应记录](2026-10-29-flow26-live-service-metadata-r2.json)。

| 当前服务 | 实际观察 | 对新版接入的影响 |
|---|---|---|
| Fast detail39 | Workflow，同步，价格3；technical_solutions等旧8字段；结果仅paragraph/output | 不是共同八输入与七输出的已验映射；重复一次收费生成不能补齐合同 |
| Basic detail46 | Workflow，异步，价格5；结果为claims_text、claims_docx、report_docx | 文件仅为返回schema，未生成/取得实际文件；现同步客户端必须拒绝，不能为取文件而直接切源 |
| 公开校准项目 | 当前DOM中名称DSH-Oasis-Flow2-6公开合成校准-20261026，option value=302，未选择 | 证明当前账户页面可见该选项，不能代替DSH Workspace/账户/origin/folder权威绑定 |

required/empty/coexistence标记未见于已观察字段；没有推定必需性或用空值编造支持。api_key为null、credentials为空占位，只分类和排除字段，未打印、存储或迁移凭据值。CDP保留窗口未见create，但buffer为truncated=true，不能当全时段网络认证；明确操作序列没有生成/上传动作。已停止网络捕获，保留登录页标签供接续。

[本地交接包](2026-10-29-flow26-remote-contract-request-r2.json)列出8个共同输入的候选对应/无对应、七输出准确资源身份、来源/文件/归属/未知/价格等具体退回要求。实际接收方为后台IC-API及Dify IC-WORKFLOW责任方；此包**仅本地草稿，未发送、未获接受、未更改服务**，不把本机编写的要求当作后台已有合同。

新增离线回放经真实API客户端的请求清洗/normalizer：Fast旧schema可解析，Basic按`ASYNC_NOT_SUPPORTED`拒绝，资源中七输出required核对相同。fetch为注入的公开元数据回放，真实网络请求0；不将其算作远程调用通过。初版回放直接调用严格normalizer携空凭据字段，被正确拒绝；改用实际请求入口后验证原有占位清洗，没有为此修改产品安全检查。另一初版误按裸schema读取包装资源，定位output_schema后更正；这些是回放脚本错误，不是产品故障。

## 3. 已安装Profile：更正一次错误判断，避免重做已有装配

[安装对象核对](2026-10-29-flow26-installed-admission-r2.json)读取具名F-UR-A01 R2根和installation.json的current，未按目录名/mtime挑版本。7个产品源文件与主目录相同；package.json差异仅为已有的files/oasisInstallationProjection。开始只看bundle普通main，错误推断“尚未选择受控入口”；随后读取**最终Profile覆盖层**并用实际已安装DSH app-boot/include组合后，确认：

- 普通oasis-professional-service禁用；已有唯一M06受控Host启用。
- llm-pi-ai、llm-deepseek、llm-deepseek-account与deepseek-account都因零调用候选禁用。当前问题是另立准确的真实模型/数据/费用候选，不能改旧F预算或原安装Profile。
- 固定include不允许name改行名；禁用普通行再插入受控行的机制已经在现候选采用。新scratch配置只复核机制，不算新增装配成果。

原错误解释保存于本轮scratch；更正记录与[公共配置组合检查](2026-10-29-flow26-controlled-profile-r2.json)明确区分bare bundle、最终Profile和实际Host。组合检查的desktop-shell/desktop-updates两条警告来自未加载Desktop launcher层；未隐瞒，也未把该组合称作完整App启动。**本轮没有启动Host、读取认证或改写原Profile。**

## 4. 本轮状态与交接

已消除的是“当前网站服务字段是否过时”和“现F Profile是否已装配M06”的不确定性；没有新增文本生成、PDF/DOCX支持或真实双来源通过。容器运行路线待用户决定；远程来源待具名M06兼容合同；原生真实调用仍需绑定实际模型/目的地、公开R2和资源、新次数/费用及审阅范围，旧一次3元额度不续用。网站登录完成不自动提供原生DSH登录或调用许可。

无产品源码/锁/pin或预存计划改动，无提交推送发布、外部消息或新的生成费用；三处原状态入口只前置接续，原字节后缀保留。最终哈希/保全与命令结果见[作者验证](2026-10-29-pdf-docx-g0-unblock-r2-verification.json)。本轮不是独立审计。
