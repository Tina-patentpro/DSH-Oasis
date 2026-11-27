# P1原生上下文零生成：最小实现与离线出口

2026-11-06，Asia/Shanghai；Codex单代理。按用户“按计划推进执行”接续[项目R2的P1](../../plans/2026-11-06-project-summary-and-next-plan-r2.md)，已交[启动合同R1](../../business-baseline/m06-native-zero-generation-launch-r1.md)、最小实现、另版实际归档及准确未就绪准入候选。**P1本地实现/准备出口完成，实际运行未放行；没有启动Desktop或Host应用。**

## 实际改动

| 文件 | 本轮增量 |
|---|---|
| [macos-development-launch.mjs](../../../scripts/macos-development-launch.mjs) | 独立nativeZeroGeneration启动规格；与真实验收互斥，移除fixture但不添加模型/API HTTPS例外；新CLI绑定仓库内admission和.dsh-test专属root，预算/guard绑定及runtime_ready不满足即拒绝 |
| [index.js](../../../packages/oasis-professional-service/src/index.js) | 原M06受控Host捕获进程零生成标记；普通入口在初始化前拒绝误带标记，原生上下文及fixture拒绝合同保留 |
| [workbench-rpc.js](../../../packages/oasis-professional-service/src/workbench-rpc.js) | 仅四项只读/输入准备RPC允许；其余默认在解析payload、调用服务/凭据/模型、HTTP和业务写入前拒绝，含candidate确认/运行、账户、API、导入和保存 |

新模式不是用户/RPC开关；没有改UI、资源pin、包元数据、模型Provider、普通/真实模式的原行为或现行许可。准确改动是[相对本轮前原件的diff](implementation.diff)，不会把Git HEAD之后的其他既有修改归为本轮。两个新测试文件随实现保存。

特别核清：candidate/prepare会检查原生凭据，因此也拒绝；允许的workflow/v340/prepare只走现有显式项目材料/文本输入准备，不生成run或业务revision。本轮用有效文本输入、有效candidate确认/运行形状和所有注册路径验证，未通过空payload的校验失败冒充零生成拒绝。

## 红绿与回归证据

- [RED日志](tests-red.log)：新行为实施前6项中5项按预期失败、1项既有缺上下文拒绝通过，进程exit1；实际失败为fixture残留、混用未拒绝、准入函数缺失、Host未守卫及普通入口未拒绝，没有改断言掩盖产品失败。
- [最终源码定向验证](tests-final-v2.log)：30项通过，exit0，覆盖新模式与原启动器/受控/网站关联Host合同；其中锁排他、身份漂移停止拒绝等既有测试直接运行，没有新建锁工具。
- [共同RPC/Fetch回归](rpc-regression.log)：18项通过，exit0。因本轮实际修改共同RPC入口而运行，不扩大到无关全量回归。
- [新归档入口验证](archive-tests-v2.log)：3项通过，exit0；普通/受控入口及缺原生上下文的实际项目模块均取自新归档，外部Host服务为已有合成harness，SDK为既有安装依赖，非实际App/Host加载。

以上源码48项及归档3项是本轮定向证据，不表示项目全部测试通过。零生成子路径的[源码观察](source-host-observation-v2.json)及[归档观察](archive-host-observation-v2.json)记52个非白名单注册endpoint均拒绝、有效确认/运行也拒绝，业务记录保持，模型准备/adapter/凭据/受控Fetch均0；四项白名单有实际catalog/状态及有效输入准备证据。原普通模式回归包含合成模型adapter，不能把该组也写成“所有适配器调用0”。没有真实模型或HTTP服务请求。

## 另版本地归档

因Host源码改变，离线/ignore-scripts另pack一次，不覆盖旧tgz。新归档[身份及逐件比对](archive-inspection.json)：134成员，775282字节，SHA256 `c07f2120a42e1a9d8110901eb35ed314eb5dd7225b1b35234c5b8d770fb03494`；相对旧134件仅`src/index.js`和`src/workbench-rpc.js`两件变化，其余132件原字节相同。客户端未重建或改变，通知仍随附，资源容器/pin不变；包仍0.0.1/private，无正式license字段。

实际tgz在项目`.local/m06-native-zero-generation-20261106-r1/`，安全解包在业务包`.dsh-test/native-zero-review-20261106-r1/package`。所有成员均常规安全路径、逐件匹配当前源码，未执行脚本。旧c476归档、旧解包及604链接/配置配对证据完整保留；旧视图仍指旧包，**不能直接当作新guard版安装已配对**。

## 当前准入仍拒绝启动

[admission-candidate.json](admission-candidate.json)绑定22项原始文件hash、新归档、原受控插件ID、固定Node/App/boot/include及旧视图证据。新专属root已建立8个空目录，没有复制Profile、凭据、账户、会话或数据库。仅用现有makeLaunchSpec取得[启动规格](launch-spec.json)，没有spawn应用。

候选`runtime_ready=false`。实际执行新CLI的`--check`按预期exit1，明确“composition is not ready”，标准输出空、没有startup.lock/运行数据，见[命令](candidate-check-command.json)。这是拒绝证据，不记成运行检查PASS或安装失败，更没有把JSON标志当用户同意。

| 缺件 | 下一件准确工作及出口 |
|---|---|
| NZ01 新HOME仍空 | 沿固定工具物化新完整Profile/bootstrap布局；只复制必要无凭据配置，保留原根和状态 |
| NZ02 实际App依赖锚点未配对 | 查固定App公共启动装配如何消费安装锚点；新Host/客户端/bundle须共同绑定本次guard版。旧604链接事实仍仅绑定旧c476包 |
| NZ03 有效端口未绑定 | 57619只为拟用端口，尚无保留/监听证明；旧desktop-shell端口patch有entry-not-found警告，不能拿该行当有效监听配置。以真实采用的配置接点证明loopback与端口后再检查占用 |
| NZ04 新完整组合与writer | 离线核有效Profile的Provider/自动任务/无凭据及独立业务存储，不让两个Host共写；这项装配证明不要求未来Host/UI先通过，避免循环前置 |

下一步沿P2的**离线完整装配**补这四件，再依据准确范围决定实际启动；不重跑本轮guard/归档检查，也不拿旧realAcceptance/一次调用许可填缺件。实际Host/UI是P2运行出口，专业/用户、结构修订、最终发行/许可、源B/A及发布仍各按原条件。

## 复核、判断与限制

[preflight.json](preflight.json)记录24项输入、时间/时区、准确版本/hash/实际阅读范围、原授权接续及Git。整体/项目followup仍BM1-R1/S2-R1，S1/G1保持；旧中央文件和历史段落只按实际阅读范围描述，没有把hash核对当正文复审。本轮长组合输出被截断的部分另有定向读取/字段解析，未读的重复604行不称逐行语义审阅。

Ruling：沿当前非main分支及既有checkout推进，保持未提交修改，不另建worktree或安装依赖；按项目单代理要求做一次分离自审，不调子代理、不称独立接受。Ruling：只运行受影响测试，项目规则优先于技能默认全量测试/提交/清理建议。Ruling：只给技术准入候选，不将runtime_ready或guardedFiles字段作为授权认证/不可伪造安全边界；代理不是OS级断网，根锁不覆盖未受控跨root writer，实际装配门继续有效。

[自审](self-review.md)按本轮before→after及R2 Review Focus核对。P1本地实现/准备已交；完整新安装组合、应用启动/原生认证、真实模型/API/上传/费用、源登记/CI、WorkBuddy、提交/推送/发布均未执行。原FAIL/UNKNOWN及专业/用户接受不改。新鲜保全/身份/链接核验见[verification.json](verification.json)。
