# F跨Document租约/固定装配v4返回（待独立审计）

本轮BASE/当前HEAD=`36048e352d4aed8ceb3f1625505e6240761678a9`，尚未提交；按用户要求审计后分批本地提交，不推送。实现者选择同源Web Locks包装已审v3 binder，未改业务代码、原数据schema、v2/v3和旧失败。完整F仍开放。

## 1. 可核的新子集

`draft-checkpoint-lease.mjs`按workspace+session用公共Web Locks非等待独占；第二个协作者不进入底层读/恢复/写，无能力/拒绝亦暂停该动作，原生聊天仍可用。授予前编辑、归属变化或dispose拒绝晚到恢复；正常dispose先退订、队列排空后释放，排空异常持锁至Document销毁。不是对恶意或旧不守约写入者、独立Profile/分区/origin的全局锁。

`conversation-draft-checkpoint-4.mjs`只对固定官方client按v3精确转换后置入租约helper。实际ConversationController及人工retry/receipt/rebind守卫与v3逐字相等。`f-development-assembly.mjs`支持唯一显式checkpoint4，拒绝与checkpoint3双选、旧artifact顶替；完整pin也覆盖入口导入的转换器。缺能力不降级伪装成功；旧准入不改签。版本4仍是具名开发artifact，不是发行接受。

v3反例：实际旧helper两个binder均恢复、两个都写，最后PUBLIC_B覆盖；保留日志。新wrapper11项RED→GREEN，其中首次RED既含旧pass-through行为失败，也含未实现converter的API断言，未概括为全部行为反例。装配两项RED→GREEN，另补legacy删除导入源码pin的错误接受反例并修复。最终两解释器各95/95、0失败/跳过；只跑受影响宿主并集，未改业务包，前批已提交1480业务/54依赖/构建pack不改写为本轮重跑。

## 2. 真实浏览器层

原始receipt1的四组均通过：v3双写历史反例；v4同key只一底层binder/失败者零读写且不自动接管，明确新Document恢复原owner提交；不同workspace/session独立；真实IDB put请求成功但事务保持未提交时移除Document，浏览器回收租约、未提交事务未落盘。随后File仍为PUBLIC COMMITTED FILE、旧generation COMMITTED，fence为UNCOMMITTED；新owner零恢复/零写、提示不可用，没有附件复活。

这是Chrome实际同源srcdoc独立Document＋真实Web Locks/IndexedDB/本补丁helper＋合成shell/conversation接口，**不是两个实际DSH Renderer或操作系统进程SIGKILL**。事务保持窗口由夹具主动构造，不声称生产使用keep-alive循环。父页只向本机loopback写合成测试回执，没有外网上传/模型/专业API/发送。

首轮普通iframe导航停滞；第二次加超时得到FAIL/receipt0，只有v3反例已完成。调试接口返回浏览器响应暂停，未执行CDP状态修改；改为同源srcdoc后四组通过。旧夹具两版、停滞AX及FAIL回执保留，不当成产品修复前失败。最初Node反例路径拼错的日志亦保留，改正后单独记录实际双写反例。

## 3. Desktop/Host层与必须保留的R2不确定观察

两份新隔离Profile只复制原公开fixture的workspace/oasis_workbench和sessions，不复制认证或userdata，保留原workspace路径/ID；seed沿已审单Renderer临时观察fixture。R1首次冷A和正常重启均18字符/2附件待人工重试，A/B/A展开观察器直接核原A及原B Session身份，B0/0。R1实际第二受保护SDK Host拒绝、零业务写入。其前后IDB Blob普通96/长449990字节与原件SHA一致，R1没有生成Host attachments文件。

输入清单自检后进一步固定legacy导入源码pin；R1原准入及入口源码before快照保留，另建最终R2（198pin）。R2首次冷A仍是原session/18字符/2失败待重试文件；第二受保护SDK Host拒绝。两个Profile共四次正常退出0。

**R2重启观察未接受为“零本地上传”：** 早期界面曾显示两error卡片，但该时点未保存独立AX文件。随后在展开观察器操作期间工具提示“用户改变应用”；重读时两卡片变为待发送文件、Send可用。已保存该AX/png并退出，未点击Send。磁盘确有12:01:42.527Z、12:01:43.567Z写入的两件新隔离Host本地文件（named/file-object两处，共四个副本），字节等于公开原件。不能仅凭此推断触发者，不能宣称整批本地传输为0，也不把它归因于用户或v4缺陷。

实现者没有点击retry或Send，没有新增真实模型/专业API/外网资料上传/费用。已异步询问用户是否手动retry，冻结时尚未取得答复。当前只接受源代码Controller与v3逐字相等这一事实；R2本地传输的触发/因果及重启零重传结论保持UNCONFIRMED。保留`.local/f-renderer-lease-20261027/R2-transfer-observation.json`及所有实物，不用R1正常重启倒签R2。

临时seed不在v4多Document租约保障内，旧不守约写入方仍可绕过；本轮不把开发支持入口升级为全写入方强制发行。R2最终IDB/198pin与端口/锁另实核；原公开Profile17件和BASE3574件按准确差异保全。

## 4. 请求独立裁定与接续

请GPT6.1 Max独立审计源码/95项、真实浏览器回执及Desktop事实，明确源码缺陷与夹具/观察限制；R2触发未知不得静默移除。原FH-A01、R2旧冷恢复0/0、两轮旧P2、双存储故障、真实Host/模型收到附件、0.1.3模型/API UNKNOWN、跨平台/分区及发行升级等继续在剩余表。未经证据不关闭完整F。

本批不改旧材料/业务接受/费用余额，未启动任何真实模型或专业API，未推送发布。独立接受之后才写回当前入口和分批本地提交；冻结稿中的待审和未提交状态按后续具名记录接续，不重写历史。
