# R7-02 离线原位切换回执

2026-11-09，Asia/Shanghai。用户在收到旁置候选审阅件后回复“同意进行下一步”。本次据此切换已审候选到同一隔离开发安装，保留 App 启动与真实模型的独立授权门。 [EXEC-R2 预检](execution-preflight.json) · [候选审阅件](../2026-11-09-r7-02-output-budget-offline-r1/review.md)

- 在维护租约和 JSON 根所有权内保全活动 Profile、原回执 Profile 和安装登记，只按原回执恢复 `cordis.patch.yml`，原安装重新通过完整性检查。随后用既有控制器交接事务保全旧控制器并切到 `8338fec2`。 [Profile 恢复](profile-reconciliation.json) · [控制器交接](controller-handoff.json)
- 固定工具离线原位装入 `a25f1a190803aaccc3f614b607b2d1502458999d41221f5751969e93b3a62e2b`。独立 `--check` 退出 0，活动 Profile 与新安装回执一致，原 `947574a6` 仍登记，维护租约已释放。rc.5 归档 `e94f9136` 的 125 个安装成员逐字节一致。 [升级输出](upgrade.stdout) · [独立检查](installed-check.json)
- 从实际活动 Profile 取出官方 provider 与 Low 配置，使用已安装 rc.5 和 SDK 复验。在禁网进程中，最终 POST 仍为 `deepseek-flash / low / max_tokens=16384`、SDK 重试 0，模拟 503 后只拦截一次。原输入及资源指纹匹配。 [实际配置](installed-settings.json) · [安装后请求复验](installed-wire-check.log)
- 只读核对 B 会话归属、业务记录和既有保护项。B 仍为 revision 84，原三条运行与 A 的 UNKNOWN 保留，48 个保护路径保持上次核验状态。原生候选端点待后续具名启动后观察。 [记录核验](installed-record-read.json) · [完整收尾核验](verification.json)

收尾发现中心四个文件并行更新。按 EXEC-R2 重读并以原 SHA256 复核，差异限于 patent-distillery 从知识库下调整为平级项目，DSH 登记入口、固定输入和本次切换范围保持。 [追加复核](execution-recheck.json)

本轮 App 启动和真实调用均为 0，当前调用额度为 0。后续真实验证须另获准确单次授权，并先核 B 原生候选及实际参数；R7-03 仍待有效正文通过结果合同。
