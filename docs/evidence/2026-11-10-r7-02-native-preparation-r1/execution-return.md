# R7-02 原生候选核对回执

2026-11-10，Asia/Shanghai。用户允许后续开发和不超过 10 次测试。本轮使用 1 次本地测试，范围为现有开发 App 一启、原 B 会话候选准备一次、取消确认、正常退出。真实模型调用为 0。 [EXEC-R2 记录](execution-preflight.json)

bundle `a25f1a19` 的 Host 实际返回原 B 会话、revision 84、`deepseek-official / deepseek-flash / low`。用原完整 prepared 和资源指纹重算，候选确认 SHA256 一致。上限 16384 和 SDK 重试 0 来自固定活动 Profile 及已装 SDK 的离线请求核验；原生预览仅返回模型路由与材料标识。 [原生核验](verification.json) · [同安装离线请求](../2026-11-09-r7-02-output-budget-install-r1/installed-wire-check.log)

取消预览后 App 菜单退出 0，独立安装检查退出 0。Profile、业务 JSON、原 A 与 B 运行及 revision 保持。保护清单中仅 B 原生会话压缩文件原字节变化。无确认生成或新增业务运行。剩余本地测试额度 9 次，真实调用额度 0。下一次真实验证只按准确批准另建一次运行，失败或 UNKNOWN 时只查该次回执。 [单次验证待批范围](single-live-test-proposal.json)
