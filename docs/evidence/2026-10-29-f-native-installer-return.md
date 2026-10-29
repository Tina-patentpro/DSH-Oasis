# F原生安装器与升级失败恢复执行返回

本轮执行基线main/0b05f1c，2026-10-29北京时间。沿用用户“接受随包入口子集，完整F仍开放”；没有真实模型、专业API、上传、核对材料、生成、Send或费用，不推送、不改日常Profile/App。总体1.3.1/NS1-R1/P28的EXEC-R2准确16输入、3633已跟踪基线及适用范围见[执行清单](2026-10-29-f-native-installer-execution.json)。本文件为作者执行结果，独立审计另列。

## 实际交付及验证

- 新增原生macOS arm64 PKG builder和事务伴随入口，原R3 controller/provider/builder不改。使用系统pkgbuild/productbuild及CurrentUserHomeDirectory安装域，无sudo；实际执行、程序及数据UID均501。目标为本轮新私有根`native public root ' C`，并非日常安装。
- R2安装PKG SHA256 `7b3322e745819cc3346e442a6108e137342b710db81d4c48acff31ee6f749697`，请求`7093aaca80e29ce9c463b58f75ccecb53006e29dbe55e2a928cdf37a2d6f7cdb`。系统Installer exit0，目标实际创建，原控制器check exit0；解包后原bundle f926…9dd1的27174文件/14链接与固定清单一致，独立伴随入口/请求hash一致，原App签名核对通过。
- 升级PKG SHA256 `69ff4dafbbf29304afb3c0df58db165cd8f2c220e9a789bbb107ce6875cd0833`，请求`fe9f90c30ef91cb30151c94e49491a6c2e83a92caf7b528c6a01622708461a9f`，原v4 bundle dde6…9df9不改。在系统安装入口触发真实pnpm YAML解析失败，Installer exit1、子升级exit1，原控制器恢复旧current。回执UID501/exit1；失败候选经显式精确计划归档，没有自动重试。
- 同一原生安装根另验证两种事务故障：真实pnpm解析报错（exit1，旧版本有效）；只向记录并核对过的本轮升级进程组发送SIGKILL（signal=SIGKILL、检查exit1、不完整Profile被拒绝）。后一场景只在进程组全员结束、锁owner死亡及hash不变后显式恢复，原两锁归档、失败Profile/程序完整保留；恢复check通过。不是强杀自动恢复、真实断电或物理盘满证据。
- 三次故障各自的前后，三业务JSON＋六公开IDB文件共九件逐字节一致；只恢复Profile/installation前像，从未回填业务数据。公开合成UNKNOWN保持原requestId、dispatches0；Flow-2-6三类runOrder均空。
- 故障前后两次实际GUI均正常退出0。恢复后实际界面显示原生未发送`F-NATIVE-PKG-20261029-UNSENT-KEEP`、技术交底和“保留原生PKG安装后的编辑；不生成、不发送。”；未点击核对、生成或发送。最终端口57593关闭，两安装锁及RECOVERY_REQUIRED不存在。
- 新增13项定向测试；全部scripts/tests以工具Node24.21.0及实际App内置Node24.18.1分别147/147、exit0。早先名为embedded的日志实际使用control/node 24.21，原日志保留并由actual-app-node命令、版本及完整147/147结果纠正。进程/签名边界替身属于单元层，以上PKG、真实固定pnpm故障及GUI证据独立列出。依赖清单/锁及业务包未改。

## 历史失败保全

R0原生Installer曾返回0但目标未创建：PackageKit用/tmp别名传入脚本，CLI守卫未执行，不能计为安装成功。R1修守卫后退出1，实际报canonical installation root required：请求资源尚未规范化。两问题均有独立RED→GREEN回归，R0/R1原包、原请求、日志和展开内容保留；R2才取得真实安装成功。初次GUI启动与SDK种子并行导致busy/exit1，也原样保留，后续只在种子退出0后启动，不重写失败退出值。GUI退出操作的AX“App quit/timeout”以实际主进程及controller exit0复核。

原326成员按已审单一原字节归档映射复核、其余325保持，修复39成员保持；旧五执行包131/109/109/54/152及17公开原件保持。3633已跟踪原文件、其他工作树86文件和远端引用在审计前均无变化；后续仅三个状态入口允许追加本轮结果前缀，历史原字节保留。

## 尚未关闭

**完整F仍OPEN。** 本轮是可执行、已实际安装/失败验证的原生PKG受控候选，不是正式发行接受。只读签名身份查询为0个Developer ID Installer，外层PKG签名检查exit1明确为未签名；未公证、未取得最终许可分发/发布接受。旧未受控writer/OS强制保护、真实模型/API UNKNOWN、真实附件消费、旧根迁移、多Renderer/双存储、跨平台/上游升级、任意崩溃/断电/物理盘满等出口仍独立开放。用户原接受范围不能扩大。

操作/恢复边界见[交接](2026-10-29-f-native-installer-handoff.md)；指定GPT6.1 Max独立审计、必要修复及最终本地提交另记，不将作者结果或测试数量当作正式产品接受。
