# 已配置DeepSeek凭据的隔离候选复用方案

2026-10-30，Asia/Shanghai，R1。此文件是本轮已定位问题的最小修复方案，不产生复制凭据或模型调用的授权。

## 已查明

日常Desktop 2.0.18（端口43120、内置DSH0.2.1-rc.2）原生模型页明确显示DeepSeek“API密钥已配置”；日常home `/Users/tinadong7036/.dsh` 的凭据文档确有 `DEEPSEEK_API_KEY` 引用。仅核对引用名称，未输出或提取密钥值。

校准使用独立Desktop 2.0.17（端口57607、固定DSH0.2.0-rc.2），home为 `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-live-20261030-r2/home`。本轮原生SDK的`credentials.describe`确认该Profile内 `DEEPSEEK_API_KEY` 与模型页惯例引用 `DEEPSEEK_OFFICIAL_API_KEY` 均不可用；凭据文档仅含本机浏览器连接和workarea账户两条记录，没有模型引用。不是设置页空白导致的判断，也没有发现应改成另一个已保存引用的同Profile映射。

旧SDK的模型发现不校验凭据，因此独立候选仍能显示Flash；日常较新SDK的发现过程会检查凭据。模型显示相同/相近名称不表示两个home共享凭据。此前未把“日常模型已配置”与“独立候选未获该凭据”解释清楚；旧原生快照及失败不改写。

## 待明确授权的唯一操作

仅将日常home已保存的 `DEEPSEEK_API_KEY` 复用至上述R2 home，仍使用同一DeepSeek提供方与现有模型引用。不导入整个Profile、浏览器连接、workarea账户、其他密钥或会话。

执行时以DSH公开凭据服务为边界：源端仅`describe/resolve`该一项，目标端先`describe`确认未配置，再`set`该一项；值只在本机进程内传给目标凭据服务，不进入命令参数、聊天、普通配置、临时文稿、日志或截图。源端不调用set/unset，源文档字节必须保持；目标保留既有两条记录。若目标已出现新配置、源身份变化或中途结果不明确，停止并检查原结果，不自动覆盖或重试。

复制会让隔离候选也能访问这一已有模型凭据，这是需要单独确认的跨Profile权限变化。它不要求用户重复输入密钥，也不修改日常DSH、SDK或固定组合；不把日常home直接挂给另一Host共同写入。

## 授权后仍只做无费用验证

检查目标`describe.configured=true`，核对固定提供方/模型、原始失败运行、三份公开材料与项目302关联；正常重启后再次只查元数据。模型stream、上传、Fast39 create均保持0。原requestKey不重发，本方案不重置旧单次额度，不取得真实文字闭环或费用验收。

当前状态：**尚未复制、尚未调用源端resolve或目标set、待用户明确允许上述单项复用**。独立候选的临时观测入口已卸下，现有业务源码及固定依赖保持。
