# 固定JSON存储后端的单进程所有权保护

本设计针对原F要求“两个Host不得写同一业务存储”的已复现缺陷，是范围内维护方案，由执行者选择，不表述为用户另选了新产品路线。用户已允许阶段内定向修复不逐项重问；无新UI、业务记录编码或固定版本升级。签名App及上游原件不修改，仅另建旁置通用公开后端插件供新隔离候选验证。

## 证据与选择

固定JSON后端/DomainFacility只排斥同一实例的双开；两个独立进程各读revision2，依次提交都返回revision3，后者覆盖前者。原始证据在`.local/f-process-recovery-20261027/ownership.json`、`events.json`。原启动器入口锁不覆盖不同启动器或指向同一存储的不同Profile，不能作为修复。

可用路线：由上游新版本提供进程租约/CAS（当前未交付，不能擅自升级）；用PID/时间戳锁文件（必须处理PID复用、暂停和过期抢占竞态）；或用固定Node24.21.0内置SQLite的EXCLUSIVE事务保有根目录所有权（本次选择）。最后一种不新增npm/原生依赖，进程退出由SQLite/OS释放锁，不以心跳超时抢占活进程。JSON业务数据仍由原JsonStorageBackend公开实现读写，不改为SQLite业务存储。

**实际解释器补核：** 工具Node为24.21.0；固定Electron44.0.0的只读run-as-node查询确认其内置Node为24.18.1、SQLite3.53.1。不能拿工具解释器替代实际宿主。新增包候选engines据此为`>=24.18.1 <25`，分别用这两个具名解释器验证；此范围不是所有中间版本或跨平台安装包已验收声明。原精确24.21.0元数据候选保留，修正后另配对，不更换固定运行时。

## 最小实现

- 新通用包`dsh-storage-json-single-owner/0.0.1`，复用固定SDK公开JsonStorageBackend、BackendRegistry、storageBackendServiceKey。新Profile明确禁用原storage-json行后由本包注册同名json后端；不覆盖已有owner，注册冲突即失败。
- root仍是原`dshHomePath('storages')`唯一配置值。先mkdir/realpath，使用该canonical root内固定`.dsh-json-single-owner.sqlite`元数据文件；别名路径必须竞争同一锁。拒绝符号链接/非普通文件/多硬链接的锁文件，不删除旧文件或按PID猜测回收。
- 固定Node内置DatabaseSync以立即失败的EXCLUSIVE事务保有所有权；持有至原后端close排空后，再rollback/close。正常关闭、初始化失败释放；SIGKILL之后由OS/SQLite释放。竞争者在后端注册/业务域打开前失败，不能退回未保护后端。
- 该旁置组合的所有json消费者一起受保护，粒度为同一存储根；不同根可并行。元数据不是业务记录，不改JSON版本/审核hash/UNKNOWN，不配置新用户设置，不引入Provider框架、私有store或Host执行器。
- 本机自有本地磁盘实证；不宣称NFS/SMB/云盘可靠锁或跨平台安装包通过。若缺内置SQLite/锁失败，关闭该候选的持久化接线，不能静默降级。环境如输出SQLite实验性提示须保留，不能隐去。

## 验证

先保留原双写反例及单所有者断言RED；测试独立进程竞争、活进程不可抢占、正常关闭和SIGKILL恢复、canonical别名、独立根、非普通/损坏文件保全、后端未排空前不释放。随后在同一实际SDK/业务repository进程场景重跑：第二writer必须未打开/零业务写入，原revision/正文保留；冷恢复UNKNOWN及零重派保持。测试引用新包而非改上游副本。实际GUI仍单列，不以进程测试完成全部F。

独立GPT-6.1/max审计新源码/配对/失败及恢复证据后，只接受有证子集；旧26日审计与准入原字节保留。未发布、未用于日常Profile。新分发包/正式采用不由本次离线维护自动批准。
