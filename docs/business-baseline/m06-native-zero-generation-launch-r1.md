# M06原生上下文零生成启动合同 R1

2026-11-06，Asia/Shanghai；接续项目总结R2的P1/AV02/04/07。用户已要求按计划执行；本轮完成本地最小实现与离线验证，**不启动应用**。本文不授予真实调用或发布许可。

## 范围与准确实现

沿用原M06受控入口及插件ID，不改客户端UI、固定资源、模型Provider、默认入口或现行许可证。本次只改：

| 文件 | 准确行为 |
|---|---|
| `scripts/macos-development-launch.mjs` | makeLaunchSpec增加nativeZeroGeneration布尔选项，与realAcceptance互斥；删除fixture但保留loopback代理例外，仅向新进程传OASIS_NATIVE_ZERO_GENERATION=1；新模式使用单独admission与专属root |
| `packages/oasis-professional-service/src/index.js` | 在原受控组合中捕获进程标记，普通入口误带标记即在初始化前拒绝；原生上下文/fixture拒绝条件保留，将零生成限制传给真实RPC处理器 |
| `packages/oasis-professional-service/src/workbench-rpc.js` | nativeZeroGeneration只允许state/get、workflow/catalog、workflow/v340/catalog、workflow/v340/prepare；其他所有当前/未来endpoint均在payload解析、服务/凭据/模型/HTTP调用及业务写入前返回NATIVE_ZERO_GENERATION |

这是可信进程装配限制，不是用户/RPC可以切换的运行选项。零生成模式不调用candidate/prepare：该接口虽不发送生成请求，但会检查原生模型凭据。只允许不读凭据的材料/输入准备；不以旧catalog.dispatchEnabled=false证明受控candidate/run被阻止。

## 三种模式与副作用

| 模式 | fixture | 模型/API HTTPS代理例外 | 本地业务RPC限制 |
|---|---|---|---|
| 原默认检查 | 保留 | 无 | 原行为，M06受控入口拒绝fixture |
| 本次native-zero-generation | 移除 | 无；仅127.0.0.1/localhost/::1 | 上述四项允许，其余拒绝；禁止模型、上传/API、认证和业务修改 |
| 原realAcceptance | 移除 | 沿既有固定目的地 | 原受限真实路径；本轮不使用、不续用旧预算或receipt |

三类环境均由现有makeLaunchSpec构造干净环境，不继承凭据、NODE_OPTIONS、NODE_PATH等。零生成业务拒绝是实际代码边界；代理和签名Electron原生sandbox不构成已验证的OS级断网/文件隔离。DSH其他原生功能不因此被本插件全面接管；正式运行前仍核所选完整Profile的Provider/遥测/自动任务配置和无凭据范围。

## 准入候选与专属目录

候选保存在[本次证据目录](../evidence/2026-11-06-m06-native-zero-generation-r1/)，不是旧no-model/realAcceptance许可的改签。绑定：新旧归档身份、Host/客户端/资源、固定Node/App/boot/include及实际依赖视图、源/新Profile、launcher/guard文件hash、专属运行root、计划端口与未决项。预算model/api/upload/payment均0。

专属root计划为项目`.dsh-test/m06-native-zero-generation-20261106-r1`。允许写入限该root中的user/home/userdata/cache/temp/evidence/workspace-a/workspace-b及本次证据/打包scratch；原安装、Profile、日常HOME和旧归档保持。依赖视图仅提供已证明的配置解析，不假设它已构成可启动的DSH_HOME，也不假设直接执行旧App自动使用新安装锚点。

准入字段runtime_ready仅表示同版技术装配是否完成，不认证用户授权。运行须同时具备准确有效范围。当前候选必须runtime_ready=false，直到完整新Profile、实际App安装锚点与Host/客户端同归档配对、端口真实配置及检查证明齐备；不能把缺件改为true绕过。新模式--check也拒绝未就绪候选，不借检查调用启动、修配置或复制凭据。

CLI现支持`--check|--start|--stop --native-zero-generation <admission绝对路径>`；admission必须在本仓库，root必须为本项目.dsh-test下的非重定向专属目录。当前只执行未就绪候选的拒绝检查；不执行--start/--stop，不把示例命令当已执行。

## 锁、停止与失败

沿用acquireLaunchLock/stopLaunch：启动锁在进程存活期间保持；第二启动拒绝；仅持有者释放未被替换的锁；停止必须同时匹配PID、启动时刻和命令，身份变更不发信号。根锁仅覆盖使用同一root的合作启动器，**不能单独证明不同root/未受控writer的全局互斥**。新Profile/业务存储不得与其他Host共写；未满足即不启动。

启动后若失败，只保全本次日志、退出码、锁/进程身份和状态；不自动重新启动、改来源、读旧凭据或发真实调用。停止请求不等于子进程已退出，后续P2应记录实际退出与遗留进程。

## 离线验证出口

1. 启动规格：fixture移除、零生成标记、干净环境/loopback保持；与真实模式混用拒绝；旧模式回归。
2. 真实Host注册Fetch路径：所有非白名单endpoint（包括candidate确认/运行、账户、导入、专业API、保存/修改及未知路径）在服务调用前拒绝，原业务记录不变，凭据/模型/Fetch计数0。
3. 模式可信性：普通Host不能静默忽略零生成标记，旧fixture/native-offline不能混用；来源资源、插件ID和原生上下文合同不变。
4. 准入及生命周期准备：拒绝未就绪、非零预算、缺guard绑定/错误root，既有锁和停止身份负例可复用并定向运行。
5. 源码改变后另存新归档、从新归档重复零生成拒绝证明；旧134件tgz及旧视图不写回。新归档/离线拒绝仍不等安装或Host/UI真实接受。

本轮出口为“最小零生成实现＋准确准备候选＋离线证据”；P2实际启动仍依赖上述具体装配缺件，不因本合同或测试绿色放行。模型/API/上传/费用、源B/A、专业/用户、许可正式采用及发布各沿原条件。
