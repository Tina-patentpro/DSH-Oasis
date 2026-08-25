# DSH插件开发Skill红灯基线

日期：2026-08-23

在尚无项目级DSH插件开发Skill时，本轮出现了三项可观察偏差：

1. 依据先前会话中的`0.1.0-rc.7`基线开始判断，随后才发现本机已升级为`0.1.1-rc.2`。
2. 将`dsh --profile web --dump-config`视为纯读取命令，但当前CLI会尝试重写用户Profile中的`cordis.yml`，并因权限边界失败。
3. 在固化Bundle/Profile、Host/Client和隔离验证规则前，先创建了插件红灯测试。

这些偏差说明后续开发需要一个可发现的项目级Skill，强制先做版本预检、官方接口核对和隔离Profile验证。
