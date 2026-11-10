# R7-02 输出上限离线候选审阅

2026-11-09，Asia/Shanghai。用户授权离线保全、候选准备和验证。按 [EXEC-R2 复核](execution-preflight.json) 绑定当前整体 1.3.1／NS1-R1／P1108、R7、两个状态入口及前次实际回执。High 和 Low 的两次 8192 截断各自保留。

## 隔离 Profile 与候选

先在忽略目录中按原字节保全活动配置与安装快照。YAML 结构比较确认，活动版仅多出 `agent-default-model` 的 `deepseek-official / deepseek-flash / low` 行，去掉这行后其余各行内容及顺序一致。现有安装只读 `--check` 仍以退出码 1 报 Profile 与原回执不符。活动配置、旧安装回执、运行和受保护路径均保留。 [Profile 差异与备份指纹](profile-difference.json) · [现有安装检查](active-check.log)

旁置 bundle `a25f1a190803aaccc3f614b607b2d1502458999d41221f5751969e93b3a62e2b`，控制器 `8338fec253a916eb780a8fc739f6d973ba22475772db98698543758a408ad405`。相对 `947574a6` 仅改控制器和 Profile 模板两份 payload 文件，另外 27171 份文件和 14 个链接相同。v2 固定校验 `16384 / low / maxRetries=0`，保留现有 Low 默认模型行和 v1 的 8192 校验。候选业务归档仍为 rc.5／`e94f9136`，125 个成员逐字节核对。厂商 App 签名校验通过。 [候选清单](verification.json) · [两文件差异](host-candidate.diff) · [候选验证](controller-green.log)

Ruling：从原回执绑定的 bundle 制作旁置候选，仅使用活动 Profile 中已核实的 Low 行。这样可保全现有安装和未提交工作；审阅后仍须另行处理活动 Profile 与回执差异及控制器交接。

## 离线请求证据

用候选组件和固定 pnpm 在旁置夹具中离线物化 Profile。固定 Desktop 的 `prepareDesktopProfile` 与 `composeEntries` 在禁网环境中得出官方 provider 行和 Low 默认模型行，网络监听范围为 loopback，无依赖迁移。这里只执行配置准备。 [依赖物化](desktop-profile-materialization.log) · [有效配置](desktop-profile-composition.log)

将上述有效配置送入固定 rc.5 业务候选、DSH LlmRuntime 和 DeepSeek Messages SDK，以原 B 冻结的 prepared 和独立内存测试标识构造请求。在禁网进程中拦截最终 HTTP 请求，回送模拟 503。只捕获一个 POST，目标为 `https://api.deepseek.com/anthropic/v1/messages`，请求为 `deepseek-flash / thinking=enabled / effort=low / max_tokens=16384`。实际 SDK 准备句柄的 `maxRetries=0`，复用同一测试标识也没有第二次请求。请求材料和收据逐项相同，系统提示 SHA256、完整 `preparedSHA256`、`prepared.inputHash`、业务清单及八项 Skill 资源指纹均匹配原回执。 [请求测试](verify-request.mjs) · [最终请求核验](request-composed-green.log)

原控制器拒绝 v2，8192 负例在最终请求体断言处失败。33 项控制器定向回归通过，含模拟安装写出正确的 Profile 及拒绝上限、重试或 Low 漂移。请求夹具的首次命令参数和扩展回调补齐前的日志保留。控制器夹具首次在系统禁网沙盒中无法启动本机 `ps`，随后以清空环境、模拟 App／依赖物化的控制器夹具完成回归；请求测试仍在禁网进程运行。 [控制器 RED](controller-red.log) · [请求 RED](request-red.log) · [控制器回归](controller-regressions.log)

## 审阅边界

本轮到旁置候选，活动安装仍是旧组合。原生 App 与真实模型调用均为 0，当前调用额度为 0。后续若批准切换，先按新鲜 EXEC-R2 和维护租约复核已保全的 Profile 差异，以原回执为基线做可回退恢复，再交接控制器和旁置 bundle，重新核对活动 Profile、固定 SDK 与 B 会话候选。另获准确单次授权后才可派发。16384 仍可能截断或触及既有超时；失败或 UNKNOWN 只核原回执，有效正文通过原结果合同后才进 R7-03。
