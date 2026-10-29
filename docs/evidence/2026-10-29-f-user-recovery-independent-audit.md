# F普通用户持久恢复入口与R3原生生命周期独立审计

**结论：FAIL。** 新增重要问题 **F-UR-A01／P2 一项**：持久入口与原生postinstall在净化环境前，通过继承PATH执行裸`dirname`。本批尚不能接受为满足所声明环境约束的普通用户恢复入口。已核实的R3新装、成功升级、回退、明确恢复及数据保全证据继续成立，不因该缺陷被改写为未执行；完整F仍OPEN。

审计者：独立审计代理`/root/audit_f_user_recovery`（用户指定的Max独立审计任务）。审计时间：2026-10-29，UTC／Asia/Shanghai；读取、命令和环境的准确时间见本报告引用的JSON。没有启动GUI、运行真实安装器、修改实际安装根、读取认证、发起模型/API/上传/Send/费用操作、提交或推送。所有审计夹具与日志仅位于`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent`。本报告为新增文件，不覆盖历史FAIL、冻结包、回执或实现证据。

## 1. 受审对象与执行前复核

- Git基线：`main`／`57e8edf2fe29341546caaf663558ae454c1756c2`；候选未提交。源码基线的3649个原跟踪文件在审计时仅两个既有脚本变化，新文件另列。
- 冻结执行包：[2026-10-29-f-user-recovery-execution.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-10-29-f-user-recovery-execution.json)，SHA256 **`4139d900c4524aa8496951294f375ec71d60c0cc5c1672d7e449db7edae85c3e`**，334个普通文件、14个符号链接。
- [实施计划](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/plans/2026-10-29-f-user-recovery-native-lifecycle.md)冻结SHA256：`790de00fc5fbd1b08e2fcf9dd02f980a7a08f04b12fd71987c33d92190cef894`；[实现回执](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/docs/evidence/2026-10-29-f-user-recovery-return.md)冻结SHA256：`eacc0f6152b6062e001ec2056db34e4360ab5f3814da36f0718ed0b627a58e45`。
- 持久工具ID：`d16ce17916e0b1ba5ecd3d786f30bf00cde52d7b57379a5f0f694473264c53cc`。

按EXEC-R2重新读取根AGENTS与项目AGENTS全文、协同README，解析登记表`progress_sources.role=current_entry`、整体计划、独立索引、本项目master_plan，以及整体与本项目NS1/R1、P28的准确path/anchor。协同1.2.1、整体规划1.3.1；索引和登记路径一致。共16项输入的完整原始字节与实现者preflight身份一致，审计自己的快照、hash、实际阅读范围、适用理由与授权边界保存在[execution-preflight.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent/execution-preflight.json)。无关章节仅身份核对，不声称全部业务合同或历史正文均已读。

本次适用的是DS-04/F的无真实调用恢复子集、协同身份/保全要求和产物追溯；未消费新Skill、专业服务或账户合同，不以接口草案存在推定技术签收。中心规划与本次复核均不产生安装、调用或发布许可。当前入口中上一批operator API的限定接受与本批普通用户入口待验状态分别保留。

本报告绑定以下**冻结源码**，其字节也已进入独立clean-source。实现者在获得本轮问题后另开A01修订；后续live源码变化不回签为本报告受审版本。

| 文件 | SHA256 |
|---|---|
| `scripts/f-user-recovery.mjs` | `d035347f5e7fd6d46b7efa6821a01dffdc52e4d44323997436a3297c2cdb6ee3` |
| `scripts/f-installer-transaction.mjs` | `4b2ed96e43ddbe10c752003cf814485dba325fd45837240d6524367162442264` |
| `scripts/f-native-installer.mjs` | `026caaade578e65b3f916bf345d97738639f93ce530a9f1b93ff69b3afb621ab` |
| `scripts/tests/f-user-recovery.test.mjs` | `0b6a45b5058b3d16b15bca3083be3f673f428fe98eb58552be70ddf302c44345` |
| `scripts/tests/f-native-lifecycle.test.mjs` | `0d2333025d361f5e2ea3b4bb005529807570ef444cd7b47dfe1351b8bda3c352` |

固定runtime/controller为`31eab06e52103868f8a60bf4d19e0238fcfcaa1b29ad7a164c8afc9dedfd4ed5`；installed-lease与ownership分别为`90529eaf2be95ad04da4a73289ce12c7893a85f08220edef844d33ee74eeafe7`、`a20aab2a54f321ca4947d8a9f6210e1c568f80b05c7921f481a97690fcbbedab`。未发现本批改写这些固定输入或依赖升级。

## 2. 必改问题：F-UR-A01／P2

**在任何环境相关外部命令之前固定搜索路径，并使用受控的绝对命令。** 冻结版[持久入口生成器第29行](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/frozen-source/scripts/f-user-recovery.mjs:29)以`HERE=$(... "$(dirname -- "$0")" ...)`确定安装根；此时PATH仍由启动环境继承。`dirname`先于root绑定、Node SHA校验、helper SHA校验和第32行`env -i`执行。冻结版[原生postinstall生成器第23行](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/frozen-source/scripts/f-native-installer.mjs:23)具有同一问题；其`unset`位于该命令之后，也未先固定PATH。

独立复现没有修改实际安装根：把已安装launcher逐字节复制到审计自有目录，PATH首项放入一个`dirname`夹具。该夹具只向自己的marker写入文本，再执行`/usr/bin/dirname`。复制入口因root身份不匹配最终exit1，但marker已经产生，证明在任何入口完整性拒绝前执行了PATH选中的代码。原launcher SHA256为`753de3892032805030e5339ce1b00771f48f2401ae14fb390ee8849de7b9438c`。

又分别对安装、升级、回退包的postinstall原字节做同一复制夹具。三个脚本均在缺少runner而失败前执行了PATH中的`dirname`。没有运行真实Installer，也不声称系统Installer当次实际PATH遭到攻击。普通入口的缺陷已足以违反本轮“净化环境、验证前不得执行未受控代码”的声明；原生postinstall是同根因的关联入口，不重复计数。未观察到权限提升。

复现证据：

- [path-preflight-reproduction.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent/path-preflight-reproduction.json)：准确argv、环境、原字节复制、exit1和marker。
- [native-path-preflight-reproduction.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent/native-path-preflight-reproduction.json)：三类postinstall的准确源码hash、argv、环境、退出与marker。

关闭条件：两处前导在首个外部命令之前固定受控PATH，并使用绝对`/usr/bin/dirname`或等效无外部查找方案；保留原Node/helper校验及预载清理；增加恶意PATH的真实shell回归，证明marker不执行。由于入口文本、源码指纹和随包请求发生变化，应另立修订的工具ID、包、执行根及冻结证据，不能仅改旧expected hash、覆盖原安装入口或重签本包。本报告保留FAIL，修复后由新复审接续。

## 3. 独立测试与资格审查

通过`git archive --format=tar 57e8edf...`流向新clean-source，git与tar均exit0；只叠加上表五份当前实现/测试文件，没有复制ignored依赖或`.local`输入，也没有安装依赖。准确构成见[clean-source.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent/clean-source.json)。测试的HOME/TMPDIR均指向审计目录，App仅以`ELECTRON_RUN_AS_NODE=1`运行。

| 独立验证 | 工具Node24.21.0 | 准确签名App内Node24.18.1 |
|---|---|---|
| 六旧＋两新受影响脚本 | 47/47，exit0 | 47/47，exit0 |
| 新增独立用户路由探针 | 10/10，exit0 | 10/10，exit0 |

六旧脚本为f-installed-bundle、f-installed-runtime、installed-writer-lease、f-installer-transaction、f-native-installer、f-installer-recovery；两新脚本为本批user-recovery与native-lifecycle。准确绝对argv、cwd、完整受控env、版本和完整测试日志见审计目录的`affected-{tool,actual-app}.{json,log}`、`user-route-{tool,actual-app}.{json,log}`及[user-route-probes.test.mjs](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent/user-route-probes.test.mjs)。作者21脚本166/166×两解释器是实现证据，本审计没有把它改称自己的全量重跑；原干净全scripts的ignored输入缺件边界不通过安装绕过。

独立探针确认：用户确认后、取得维护租约时，state/Profile/candidate/marker的介入变动均拒绝，未写确认或恢复结果；旧失败回执不能撤销后来成功升级和回退后的登记，即使新故障又破坏Profile；自有活进程组、单边锁均拒绝且保留现场；被改transaction/ownership模块在导入副作用前被拒绝；继承NODE_OPTIONS预载被清除。既有测试另覆盖被改Node、helper、owner、回执/journal/预览、缺确认、编号选择和明确中文确认。上述通过不覆盖F-UR-A01的更早shell阶段。

静态审阅确认回执在原journal创建后、升级派发前发布；入口只消费发布的准确journal hash，并绑定root、事务目录、前版本、目标、记录时间与源码身份；无回执旧journal不补签。prepare/apply继续使用完整installation状态资格与持租约后的非锁复核，确认记录在持租约后的复核通过后无覆盖保存。新schema2绑定五个companion源码；schema1保留受限历史行为，未冒充新入口能力。未发现本次放宽旧A01状态资格约束。

## 4. 原生包、实际生命周期与恢复证据

实际公开验证根为`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/f-user-recovery-20261029/public R3 U1 ' root`，UID501。逐项核对系统Installer原argv/日志、exit回执、目标用户回执、请求hash和check/current后，三次记录一致：

| 动作 | whole PKG SHA256 | 系统Installer记录 |
|---|---|---|
| 新装v3 | `f1fc445ba7176f78b935ed2d92e4e563f054f53a67add0f295593cefecd08722` | exit0、UID501 |
| 成功升级v4 | `e723b3d46314d6a6c3cdf3c537fa5a97bc2a8e556672a417218ab41cc4b4e08b` | exit0、UID501 |
| 回退已登记v3 | `2e89602b2c7c163ce3618cc6ac2c33d1645b38372f960146b7c4f16f7caa17ec` | exit0、UID501 |

独立XAR TOC／gzip／odc CPIO流式检查三个whole PKG，没有展开包或复制完整payload。安装、升级包各27174文件／14链接的全部字节、链接目标和文件mode与原固定bundle一致；各自的五份源码、request、bundle.json、postinstall匹配冻结身份。回退薄包中的runner与v3固定Node字节一致，target-bundle及request/source准确，未夹带新payload。AppleDouble成员按头部、表项边界和对应原成员分类，不作为正文文件，也不声称扩展属性等价。详见[stream-verification.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent/stream-verification.json)及独立验证器源码。

实际安装/GUI证据由本审计读取核对，没有重复执行：升级和回退前后各九个公开文件（三JSON＋六IndexedDB）独立重算hash并直接逐字节比较一致。四次App退出记录均0；已查看四份PNG及对应AX，v4新增`V4_EDIT_KEEP`和业务编辑在回退、恢复后仍出现。截图与数据快照合并支持草稿保留；不以截图或单一exit0推定真人接受、模型消费或完整F。

恢复故障使用独立公开manifest `a623a8c75317b3543d7ddb88e3638e3fcccb3c7f0a720dc43143dc98b31c0b9b`，仅增加`publicRecoveryProbe`，并非替换已成功v4身份。原进程组、准确命令、SIGKILL与ESRCH证据一致。故障check1、坏Profile期间，真实PTY直接调用持久入口，第一次选1后取消，第二次选1并输入“恢复”；两份终端原记录均含`PUBLIC_RECOVERY_EXIT=0`。独立比对取消前后27850项身份完全一致；恢复确认的完整plan摘要为`cbbbaf44317143d82cd219728ea747a2ad7f5db166b5b43471fca1a47a1d84be`，与原journal、用户选择和同事务确认文件一致。

原失败Profile树摘要`1471a6bf59af1f64e6e739ab944a9d4aff37ddb6aac8dbff63f69ea134a67733`和两个原锁hash均直接复核。失败候选归档31417成员（27179文件、630链接、3608目录）全部逐成员流式比对原路径/字节/mode/link映射，并按原JS排序和字段顺序重建树摘要`6c715f295f6fddeae047f6c5b976ba99b579677a815ade617923c1fe89650480`，与恢复plan原candidateSHA256一致。历史build-v4归档30761成员也全部流式一致。没有以重建替代原失败字节或改旧expected hash。

实际根的只读`--check`、持久入口`--list`及当前vendor App的`codesign --verify --deep --strict`由本审计新运行，均exit0；没有启动App。当前九公共文件匹配最终关闭快照，端口57593关闭，两启动锁和RECOVERY_REQUIRED均无。安装根63545项元数据（含mode、uid/gid、inode、size、mtime/ctime、链接目标）审计前后完全一致，未读取认证正文。详见[data-and-runtime-independent.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent/data-and-runtime-independent.json)及`installed-check.json`、`installed-list.json`、`current-app-signature.json`。

## 5. 历史保全与未关闭出口

独立复核旧九包131／109／109／54／152／326／39／270／185个成员，以及当前334成员。旧326包仅原A01测试成员使用已登记的准确历史副本映射，其余325保持原路径；全部expected hash未修改。九旧包70条具名链接、当前14条链接目标一致。仅在两份准确生命周期包范围内解析五份准入，各195pin一致；17个旧公开原件、另一工作树86个文件及其变更集合、旧Mac分支和远端引用均保全。当前源码与构建前身份一致的结果在另开修订前取得，本报告冻结源如上。详见[retention-independent.json](/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/f-user-recovery-20261029/audit-independent/retention-independent.json)。

三个被退休的旧重复安装staging，其whole原PKG和准确source manifest仍在，hash一致；退休路径没有落入九旧包或当前冻结的具名文件成员。历史build-v4工作payload同样没有具名冻结成员被移除，并有完整流式归档。原物理展开副本既已退休，本审计不声称重新观察到它们删除前的现场；可核的是原证明、当前whole包/来源/请求/失败回执与全部归档字节。扩展属性等价未宣称。

除F-UR-A01外，本次范围未发现新增Critical／P1／P2／Minor必改项；这不是任意攻击面或全部F的安全保证。公开UNKNOWN仅为合成状态、dispatches=0，不是原生模型/API UNKNOWN验收。以下继续OPEN：初装中断、rollback中断、恢复本身再次中断、工具跨版本迁移；任意旧同用户未受控writer与OS强制隔离；磁盘满/断电等其他故障；真实UNKNOWN、附件和业务产物安装后恢复；双存储/多个实际Renderer/跨平台；签名、公证、完整许可、正式分发以及专业/真人接受。

下一接续仅为F-UR-A01的有界修订与独立复审；首轮FAIL、334/14冻结、实际成功/失败现场与本报告保持，不由后续绿色测试覆盖。发布、推送、新真实调用及完整F接受不由本报告产生。
