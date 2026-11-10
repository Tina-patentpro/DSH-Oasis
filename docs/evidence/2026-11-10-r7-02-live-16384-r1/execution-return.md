# R7-02 Low／16384 单次真实验证回执

2026-11-10，Asia/Shanghai。用户明确同意一次付费真实验证。按 EXEC-R2 核对固定 rc.5／bundle `a25f1a19`、控制器 `8338fec2`、原 B 会话和 revision 84。原生候选确认指纹、原三份公开 Markdown、四段文本及八项 Skill 资源与批准对象一致。沿固定安装配置使用 DeepSeek 官方 `deepseek-flash / low / max_tokens=16384`、SDK 重试 0，只确认生成一次。 [预检与授权](execution-preflight.json) · [派发前记录](dispatch-intent.json)

运行 `v340-89dd69c1-be05-4fca-bea0-a63dd2c5908d` 在 11:46:05.957+08 正常结束，状态 `completed`，`finishKind=stop`。原用量字段为 input 732、cacheRead 46976、output 12871、total 60579。实际扣费金额未在回执中返回。 [派发回执](dispatch-receipt.json) · [收尾核验](verification.json)

结果正文保存在原 B 任务的运行记录中，SHA256 为 `76edc895aa38614942860c5cf8fda861a542e3cb377f462b06dcbde206a00442`。以已装 rc.5 的原 V3.4.0 结果合同复核通过，原生界面显示待审核。R7-03 可据该正文接续编辑、再审、无覆盖保存及草稿恢复，专业和用户接受另行记录。 [结果合同核验](result-contract-verification.json)

App 菜单退出 0，安装检查退出 0。B revision 84→86，只新增本次运行和相应元数据；移除这部分可精确重现原业务字节。活动 Profile 保持，保护清单中变化为业务 JSON 与原 B 会话压缩文件。额度已消费 1 次，真实调用剩余 0。本次保守计入 10 次测试总额度，连同前次本地核对共用 2 次，剩 8 次。
