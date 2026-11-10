# 2026-11-09 R7-02 Low 单次验证回执

## 本次运行

用户另行授权既有 rc.5 开发安装、同一 B 会话、同一公开三文件、四文本和八项 Skill 载荷的一次真实生成，接受本次实际费用。App 内核对材料后，从 Host 的实际候选响应确认 `deepseek-official / deepseek-flash / reasoningEffort=low`。工作区 B 的 revision 82、会话、任务、指令、业务资源及清单指纹与预检一致。固定归档 `e94f9136`、bundle `947574a6`、控制器 `34cfa35c`，输出上限 8192，SDK 重试 0。前一运行路由未显式传推理等级，本次显式传 `low`。

只确认一次。运行 `v340-5049e502-c5c9-41b3-9a2f-b38341798c3e`，requestKey `e5aa3ed2-69d3-43e1-8ae6-61a03edd702a`，于 17:15:39.518+08 终结为 `failed / INVALID_OUTPUT`。原执行摘要为 `stream / max-tokens`，inputTokens 47713、outputTokens 8192、totalTokens 55905、cacheReadTokens 0。无有效正文，实际费用金额未知。这组计数无法确定推理与正文占比或应提高到的上限。

`prepared.inputHash` 为 `a34ae147caa04a87705e2b809bc2e42aa339b5c29e72f47c7e7ee0d1ea05764b`。完整 `preparedSHA256` 为 `fb01f3abfc715ef6330aa6d11e47b6909d95509a286c68d987388ccdffd0af8e`。候选确认指纹与持久化运行一致；两个 prepared 指纹分别匹配前一批。完整证据见[预检](low-execution-preflight-r1.json)、[派发前确认](low-dispatch-intent-r1.json)、[原回执记录投影](low-original-run-r1.json)及[收尾核验](low-verification-r1.json)。

## 保全与停止位置

App 正常退出，PID 55298 消失、退出码 0、监听已关闭。A 工作区原记录及 B 两项旧运行保持；B 从 revision 82 到 84，逆向去掉本次新增运行和相应元数据后，与运行前指纹一致。业务存储和 B 会话压缩文件是保护清单中实际变化的两项，其余 44 份现存保护文件原字节一致。两项历史临时件启动前已缺失。

四项独立单次许可各已消费，剩余 0。原 A 的 UNKNOWN、B 的旧 INVALID_OUTPUT、前一次 8192 截断和本次 Low 的 8192 截断分别保留。只查看本次原回执，按停止条件停在 R7-02。R7-03 仍待有效正文通过原结果合同；编辑、再审、保存、草稿恢复、专业及用户接受和发行决定均留待各自条件。当前发行状态为暂不发布。
