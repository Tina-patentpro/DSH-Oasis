# F随包入口与可迁移安装布局执行返回

客户端日期2026-10-29，Asia/Shanghai；原任务与隔离目录沿用20261028。各运行原UTC时间保留，不因日期切换重签。基底为本地main/f01aa95f5af161ad9efe666685b7f2b485964cd8；送审时本批源码尚未提交。

用户对范围问题明确答复：**“接受随包入口子集，完整F仍开放”**。本轮仅请求接受具名离线目录安装候选及其受支持入口；不将任意旧stock程序、OS隔离或签名发行计入通过。

## 实现与实际来源

新增安装controller、安装级双锁/租约与builder。builder只从明确source2根及不可覆盖release读取七个已审组件，排除旧node_modules、运行数据和认证；原开发组件中指向日常App的链接保持原样且不随包复制。固定Node24.21.0、pnpm11.8.0在最终安装位置离线、忽略生命周期脚本，先生成锁再冻结物化；程序及Profile的链接和包映射均核实际目标。

随包JSON provider版本0.0.1.oasis-installed.1在构造原受保护后端之前验证安装根、current、两份相同租约、owner PID/启动时间、nonce和gate字节。desktop/sdk/recovery/maintenance共享准入；维护另取得原JSON根SQLite所有权。失效或遗留锁拒绝，不自动接管；Profile恢复失败留RECOVERY_REQUIRED阻断。该机制要求协作代码遵守协议，不能约束同一用户下的任意程序。

固定Desktop2.0.17/内置Node24.18.1、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1保持。原官方App整包复制，实际两版codesign深度/严格校验及Team UM3Z9G5DNH要求通过；没有改签App，也没有自有外层安装器签名、许可/分发最终接受或发布。

当前R3两个包各27174文件、14链接，包在安装/升级前分别从build路径移动到delivery路径：

| checkpoint | 整包manifest SHA256 | 明确source2 release |
|---|---|---|
| v3 | f926b6857e23fbbcdb5dbd18ba2b26d0afe12b38452b6701c201021e493d9dd1 | 724ec489-d9db-4256-8eb1-fa1dde091f1f |
| v4 | dde6842ebb0f62039fd6cfc866c0296dda26773d91d314eae72ae4491ade9df9 | c5c61a34-3999-429f-8ab3-e448766c2245 |

包位于本仓库`.local/f-installed-layout-20261028/bundles/delivery-r3-v3`和`delivery-r3-v4`。实际新安装根为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-installed-20261028/accepted r3 root ' public`，包含空格和单引号；安装由移动后包内自己的Node/controller执行，之后使用安装根control入口。精确参数与原回执见[执行单](2026-10-29-f-installed-layout-execution.json)。这证明程序布局不再依赖源码/日常App路径，不代跨机器或任意位置迁移后的运行接受。

## 新鲜验证

- 六份新增源码/测试涉及15项新合同；既有scripts测试加本批合计134项，固定工具Node与实际Electron内置Node各134/134、退出0。业务包源码及依赖清单未变，不重复扩大其1480项既有验证。
- 新根实际Cordis/Storage注册随包后端并写入公开KV成功。无nonce、错误nonce、错误存储根和已结束租约四例均在backend构造前拒绝。实际Desktop运行时四角色、升级、回退六例均拒绝，角色回调执行0。
- 新安装根实际GUI：v3建立原生未发送文本与Flow-2-6公开输入；正常退出后升级v4，冷启动恢复；v4增加`EDIT-AFTER-V4`与“保留V4新增编辑。”；正常退出后明确回退原v3，实际界面仍同时保留新增编辑。三次R3 GUI均正常退出0。
- 升级切换前后、回退切换前后，三份业务JSON与六个公开renderer分区IDB文件各逐字节相等。GUI重开产生的日志/时间等另按阶段快照记录，不声称所有阶段userdata相同。公开合成UNKNOWN保持原requestId与dispatches=0；它不是原生模型/API真实UNKNOWN。
- 本轮四个安装根启动锁均已释放，57593端口关闭。R0/R1正常退出0；R2启动失败并退出1的原证据保持，不能汇总“所有启动通过”。

## 实际失败及有界修正

R0实际界面缺Better Sidebar，入口停在“切换侧栏宿主”。只读公开`window.__DSH_BOOT__`图确认缺模块；独立固定ModuleLoader/ClientModuleRegistry解析复现显示数据目录不能解析、release目录可以。启动cwd改为release，但R1实际GUI仍失败，说明该复现只解释部分问题，不能据单测称修复。

R2尝试显式绑定侧栏和会话；固定Desktop会在Profile补丁后强制启用标准会话，第二会话入口造成客户端模块重复，Host启动失败。R3只显式绑定侧栏，保留Desktop标准会话名称和固定版本overlay，实际业务页恢复。未替换原生结构Slot、未改签名App。三版原包、管理根、图/AX/截图、错误日志及R2退出1均保留；未改其expected hash或回执。源码RED/GREEN、证据helper字段不匹配/错误记事语句和被HTTP403拒绝的只读bootstrap尝试也如实保留，没有绕过桥接认证。

原stock类在另一公开测试根仍可绕过协作所有权写入，原FAIL保持。本轮接受范围按用户决定限定于随包入口，不能将此FAIL改签为全writer通过。

## 治理、保全与未完成出口

执行前复核15输入、整体1.3.1/NS1-R1/P28与本项目相同path/anchor；期间中心索引/兼容矩阵仅新增未定稿文档修复导航，另留原→现hash及ARTIFACT V0.3适用性记录。恢复执行时重新读取根规则、约定和准确路由，未新增差异；原许可仍为本轮直接F要求与上述范围答复。记录在执行单成员中，读取范围按实际注明。

状态写回前3617已跟踪文件逐字节不变；旧五执行单131/109/109/54/152成员及对应链接、五版各195pin、17份公开历史原件和首审FAIL均再次核实。原始素材、锁文件、依赖、归档、工具、认证与运行目录不纳入Git。旁边其他任务工作树保持独立，不合并其未完成内容。

**完整F继续OPEN。** 未受控旧writer/检查后换路径、真实磁盘满/断电/强杀自动恢复、多个实际Renderer/跨平台、旧根迁移、真实附件重传/模型消费及原生模型/API UNKNOWN仍未接受。此处是同固定底层组合的自有checkpoint版本升级/回退；正式外层安装器、来源/许可最终分发接受、上游版本升级及发布仍需各自证据。U1/D1、新版API映射、G/H/阶段6及专业/用户接受不由本轮关闭。

未新增真实模型、专业API、上传、材料核对/准备/生成、Send或费用；不读迁认证、不改日常Profile/App、不推送发布。此为作者送审返回，独立结论以随后具名Max报告为准。
