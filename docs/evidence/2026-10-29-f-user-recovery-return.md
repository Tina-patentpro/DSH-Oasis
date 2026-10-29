# F普通用户持久恢复入口与R3原生生命周期回执

本轮接续用户指定的F子集：普通用户持久恢复入口，以及R3新装、成功升级和回退。完整F仍开放；本回执不代表发布、真人可用性接受或专业业务接受。基线为`main/57e8edf2fe29341546caaf663558ae454c1756c2`，执行计划为[本轮计划](../plans/2026-10-29-f-user-recovery-native-lifecycle.md)。本轮EXEC-R2原字节快照、16项入口及读取范围见`.local/f-user-recovery-20261029/execution-preflight.json`；没有续用旧单次费用许可。

## 实现及限制

- 安装目录新增`恢复DSH-Oasis.command`，工具本身、固定Node和控制器均保存在该安装根。启动前验证Node字节，再验证所有模块，使用净化环境，随后才导入代码；不依赖开发目录、全局Node或手写JSON。
- 升级派发前发布不可覆盖的事务哈希回执。入口只列出有原始回执的未完成升级，用户按编号选择、阅读恢复预览、输入“恢复”；内部确认绑定完整计划SHA，并在实际持锁恢复中保存确认记录。没有回执的旧事务不补算expected hash。
- 原已审恢复资格及持租约后的状态复核继续生效；不自动清锁、自动选最新事务、自动重发升级或自动启动App。恢复只处理相应程序/Profile/安装状态，保留用户业务JSON和IndexedDB。
- 新原生请求schema2绑定五个准确companion源码hash。安装、升级包携带原固定payload，回退薄包消费已登记release；旧schema1仅保留原有受限接口兼容。
- 首次安装中断、回退中断、恢复过程再次中断、任意盘损、工具自身版本迁移仍未覆盖。不同持久工具身份会拒绝覆盖原入口；不将这种拒绝宣传为通用升级支持。

## 当前直接证据

工作目录：`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029`。唯一新公开验证根：`.dsh-test/f-user-recovery-20261029/public R3 U1 ' root`，UID501。没有修改日常App/Profile或认证。

| 动作 | 包SHA256 | 系统Installer |
|---|---|---|
| 新装v3 | `f1fc445ba7176f78b935ed2d92e4e563f054f53a67add0f295593cefecd08722` | exit0 |
| 成功升级v4 | `e723b3d46314d6a6c3cdf3c537fa5a97bc2a8e556672a417218ab41cc4b4e08b` | exit0 |
| 回退已登记v3 | `2e89602b2c7c163ce3618cc6ac2c33d1645b38372f960146b7c4f16f7caa17ec` | exit0 |

三次均使用`/usr/sbin/installer -target CurrentUserHomeDirectory -verboseR`，随包入口身份保持`d16ce17916e0b1ba5ecd3d786f30bf00cde52d7b57379a5f0f694473264c53cc`。准确argv、包与请求hash、安装用户回执、check退出码分别在`native-{install,upgrade,rollback}-verified.json`。原v3/v4 manifest仍为`f926b685…`/`dde6842e…`，没有改写原expected hash或固定控制器/provider。

新装用界面建立公开技术交底、用户指令和`F-USER-R3-U1-UNSENT-KEEP`原生草稿。升级前后九个公开文件（三JSON与全部六IndexedDB文件）逐字节相等，重开实际看到草稿。升级后新增`V4_EDIT_KEEP`及业务编辑；回退前后九文件再次逐字节相等，重开看到新增编辑仍在。每个App实例正常退出0，界面AX和PNG分别保存，未点击生成/核对模型与材料/发送。

随后用独立公开故障描述符`a623a8c75317b3543d7ddb88e3638e3fcccb3c7f0a720dc43143dc98b31c0b9b`验证升级中断。它仅在新manifest增加`publicRecoveryProbe`，payload仍是原v4的27,174文件/14链接；不是上游新版本，也不替换原v4证据。使用安装根自身的固定companion派发一次升级，仅向准确记录且已核对命令的自有进程组发送SIGKILL。结果`FAILED_OR_UNKNOWN_NO_RETRY`、原check退出1；组探测ESRCH后才进入恢复入口。

真实PTY运行安装根`.command`：第一次选1、预览后回车取消，27,850文件/链接身份完全不变；第二次选1、输入“恢复”，子进程退出标记0。确认记录绑定计划`cbbbaf44317143d82cd219728ea747a2ad7f5db166b5b43471fca1a47a1d84be`；原失败Profile/候选树、两原锁归档身份已核对；九公开文件原字节保留，公开合成UNKNOWN的dispatches仍0。终端逐字记录在`user-entry-{cancel,restore}.terminal.log`，确认在原事务`user-recovery-confirmation.json`。这属于执行者自动化验证，不冒充真人接受。

最终代码的21个现有脚本测试文件在固定工具Node24.21.0、实际签名App内Node24.18.1分别166/166通过、退出0。新增16例有RED→GREEN记录，覆盖提前拒绝被改Node/helper、控制器配对、归属、回执与预览篡改、普通编号/中文确认、取消和三类native接线。测试夹具使用替身签名/pnpm/二进制边界；其结果与上述真实包/GUI证据分别记录，不等同。

## 保全、审计与接续

磁盘空间不足以保留所有展开副本。本轮只在证明后退休重复构建payload，旧whole PKG/请求/manifest/失败/回执保留；历史build-v4工作payload已全量归档、流式比对30,761成员。新故障候选在恢复并核对原始树后全量归档，另给原路径、tar内相对路径、字节/模式/链接映射；不声称扩展属性等价，不修改旧九包的expected hash。原失败Profile和事务记录仍在原事务目录。没有删除历史失败审计或用新成功覆盖旧FAIL。

旧九证据包、五份195pin生命周期准入、17个旧公开原件、另一工作树86文件、旧Mac分支和远端引用在本轮重新核验。准确成员、链接、例外映射及本轮冻结身份以新execution包为准。独立GPT6.1 Max审计和最终Git收录状态单独记载，不由本实现回执自授接受。

完整F仍OPEN：旧未受控writer/同用户OS强制隔离、上述未覆盖中断类型、签名/公证/正式分发、真实UNKNOWN/附件与业务产物安装后恢复、专业与用户接受仍各有门。继续只推进无需真实调用的子项；本轮模型/API/上传/Send/新增费用/推送均0。
