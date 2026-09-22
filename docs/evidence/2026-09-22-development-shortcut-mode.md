# 开发图标启动模式修正

当前状态：**BLOCKED_WAITING_FOR_USER**，已证明快捷方式参数修正及实际启动模式；尚待账户登录控件的人工复验，不宣称实际登录或导入已通过。

## 原因与批准范围

用户两张截图确认旧启用选框/绑定区域已移除，导入弹窗在应用内打开，但账户输入禁用。只读核对 `launch-1790082228258.json` 的 PID37460 与当时运行进程一致，其 mode 为 synthetic。现有开发快捷方式调用无参数 `start-development.cmd`，该入口默认注入 OASIS_UNIFIED_FIXTURE=1，账户服务按设计禁用；上一轮带参数重开未同步快捷方式。

用户明确同意修正，并随后确认开发副本退出。目标只修改现有 C:\Users\TinaD\Desktop\DSH 开发测试.lnk 的 Arguments，使其调用原脚本并附带 --s6-ui-check；不改原脚本默认合成入口、插件代码、日常图标/安装或账户配置。不新增环境或第二个图标。

## 执行与证据

执行器为显式 PowerShell/既有 Python；使用项目 DSH Skill、executing-plans 和 verification-before-completion。单代理核对，未声称独立审核。

证据目录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\evidence\s6-shortcut-20260922

- `baseline.json`、`development-shortcut-before.lnk`、`admission-before.json`：退出态备份原图标与准入，18项保护文件哈希，包括当前业务存储/项目文件、原启动器/脚本/pins、原生设置和日常控制文件。
- `red.json`：修改前图标未满足带参数合同。`fix-*.json`/`verify-*.json`：修改后参数满足合同，TargetPath、WorkingDirectory、IconLocation、Description、WindowStyle、Hotkey均保持。相关命令退出0。
- 复用既有 readmit 刷新准入，不修改 settings；预检 `check-1790084155479068100.json` 退出0。保留旧准入记录，不绕过文件/包完整性校验。
- 实際调用修改后的快捷方式，而非另用启动命令掩盖入口问题。`launch-request.json`之后唯一新回执 `launch-1790084258480.json`：mode=s6-ui-check，主PID28860。Host PID32276监听127.0.0.1:43121，run `1791c31f-2ef5-48f3-bb5b-6b62fc97dd6d`，13:37:42.828Z renderer healthy。
- `receipt.json`：启动后18项新鲜保护基线全部保持、日常控制文件不变，模式及PID与新启动记录匹配，核对退出0。
- 旧安装快照比较提示 `home/storages/oasis_workbench.json` 已变化；本次退出态新基线与启动后哈希相同，差异早于本次快捷方式修改。保留用户当前数据，不恢复旧快照，不把旧基线差异报告成本次数据损坏。

本次未发送短信、登录、查询生产项目、下载、上传或生成；未提交推送。下一步由用户打开设置或导入弹窗，确认手机号/登录方式不再灰置，“当前模式未开放账户登录或凭据不可写”提示消失。若仍禁用，继续只读排查实际凭据服务，不要求用户提交密码/验证码。
