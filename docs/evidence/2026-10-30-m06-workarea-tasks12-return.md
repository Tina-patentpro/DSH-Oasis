# 新计划任务1、2执行接续

2026-10-30，Asia/Shanghai；单代理作者自查。依[执行前复核](2026-10-30-m06-workarea-tasks12-preflight.json)与用户当前明确指令推进。**已完成实际绑定缺陷修复、独立真实运行候选和公开草稿准备；真实生成、语义采用及线上项目关联仍等待必要的原生配置与本次确认，任务1/2未整体完成。**

## 实际修复与组件

1. `oasis-remote-service.js`的显式绑定入口原将目录ID和详情ID视为相同；线上211→39形态会被拒绝。现复用既有唯一目录身份校验，将catalogEntryId/apiId分别核对并保留schema/价格指纹、origin/账户、Workspace路径与CAS；生产项目详情另须owner_id匹配当前账户。同名、不同ID或重复目录不会被接受。
2. 保留的内部binding controller改为分别提交目录/详情ID；原生设置schema增加可选catalogEntryId，旧无此字段的非生产记录仍可读取。没有恢复已删除的绑定设置UI，生产旧记录缺目录身份仍按原合同拒绝。
3. 新增显式`m06-workarea-host-013`子路径：允许M06本地受控候选使用既有原生账户和“从网站导入”项目关联能力；原controlled/no-account入口不变，普通Host不自动采用，远程生成仍禁用。账户状态走原生credentials，未搬浏览器认证。既有“关联到当前项目”支持零文件关联，无需新UI或为绑定下载旧结果。
4. 新增纯函数`m06-workarea-material-packet.js`，准备逐字段/原文/原hash/receipt/资料或要求角色的可逆TXT材料包，手动user_input独立进入User_input，不塞正文。缺前序保留not_provided，超限/篡改/无效Unicode拒绝。这是**未采用的语义方案**，仅证明编码完整，不证明旧工作流实际理解或采用了所有角色；无上传、请求或来源开关接线。

## 独立真实候选与当前草稿

首次R1复用原F安装路径的App时，包解析误选原安装租约provider，Host拒绝“installed writer lease required”；原stderr和失败Profile完整保留，正常关闭exit0，未绕过原F租约或修改其no-model政策。只做一次最小修正：新R2单独APFS写时复制同字节、同签名Desktop2.0.17 App，并使用该私有Profile自己的正常JSON根单写provider。没有修改原App或其Profile，也没有新增运行栈。

R2位于`/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-live-20261030-r2`，原生页面实际显示Desktop2.0.17／DSH0.2.0-rc.2，端口57607；Sidebar0.24.1/Cordis4.0.4沿固定来源。依赖只用pnpm11.8.0离线、忽略生命周期、冻结锁物化；两个命令均exit0。前端构建exit0，更新现有lib/client.js和map，修改前编译物保存在本轮私有目录，不把重建差异算新业务能力。

通过Computer Use实际完成新Profile初始化、添加公开Workspace、进入新版权利要求初稿，并填入三个明确MD路径与四项文本。“核对模型与材料”返回实际模型deepseek-official/deepseek-flash及一次调用确认界面，未点击确认生成。随后打开原生模型设置，API密钥为空；没有读取、复制或记录密钥。原生设置中的Session Log上传开关已在该新Profile点击关闭，日常设置不变。

[当前准备凭证](2026-10-30-m06-native-current-preparation.json)绑定实际Workspace `46ebd9c0-adc0-4151-be0f-7963d162cb6b`、任务 `af16eb37-30de-400e-a2cf-d88bd9b0f430`、revision10。实际持久化草稿重建的prepared inputHash为`a34ae147caa04a87705e2b809bc2e42aa339b5c29e72f47c7e7ee0d1ea05764b`，与原公开R2完全一致；runOrder为空、activeRunId=null。新Profile没有复制凭据；它不是安装F的升级/恢复租约候选，不继承其全部保护或接受结论。原F只读check仍返回F_INSTALLED_CANDIDATE_CHECKED。

原生设置关闭Session Log后，Profile patch发生合法变化：原17行逐项不变，仅追加`session-log-deepseek/config.enabled=false`。初始准入hash与同字节before文件保留，差异另记`native-r2/config-ui-change-reviewed.json`，没有覆盖原expected hash。用户配置完成后，任何真实调用/重启前须再核配置、模型/材料确认及本次许可，不能拿初始启动凭证跳过变化。

## 待用户配置及准确确认

[可审请求包](2026-10-30-m06-tasks12-review-packet.json)已实际生成4322字节`m06-materials.txt`，SHA256为`08fc183cf6f2482151d31105cfd22dbe151908b2bba9f4aaf628ef099d540c16`。它使用同一公开输入、8项receipt及明确缺前序，不含评价答案或用户秘密。旧候选1继续未采用，不以其七字段JSON/Dify应用身份要求既有API。

已通过异步输入一次性请求三个确切缺项，尚未把时间经过当作同意：

- 用户在新独立DSH原生设置配置已有DeepSeek开发密钥，并以同一workarea账户登录绿洲工作台；不在聊天发送秘密。浏览器登录不能自动成为原生凭据。
- 明确允许向官方DeepSeek deepseek-flash用该公开R2材料进行**一次**本地校准，按该模型实际计费；不复用旧额度、不自动重试。
- 明确是否接受材料包R1作为Fast39的**受限语义校准**方案，以及本公开Workspace与网站公开校准项目302的拟关联、一次最多3元。原生账户/项目归属与当前报价仍须核对，尚未绑定，不按名字或同hash推定权限。

这些确认齐备后，先取得真实本地七字段输出并走累计MD、审阅、编辑再审、保存/原生引用草稿与恢复；网站项目通过已有零文件关联功能显式选择。API材料包只有在语义方案被明确采用且绑定、当前报价/容量条件齐备后，才冻结实际上传及创建接线；本轮未派发。编码可逆不能自授服务端语义支持，原始正文和未评估维度须如实保留。专业/用户正式接受、任务4/G0均不由上述确认或组件测试代填。

## 验证与保全

先RED再GREEN修复绑定ID、归属及新入口；另对材料包Unicode拒绝作失败回归。最终11个受影响测试文件122/122，exit0、无跳过，见[验证记录](2026-10-30-m06-workarea-tasks12-verification.json)。这些是源码/注册Host/固定SDK及合成API验证；真实App证据仅到上述草稿与确认准备，不称真实生成或业务通过。早期将Schemastery当Zod使用optional()的装配错误已按固定API改正，失败日志保留；没有改依赖。

实际改动集中在绑定身份/归属校验、设置字段、显式Host子路径、材料包纯准备、对应测试与编译产物。当前分支不变，原未提交63项除三状态入口仅前置接续外保持，旧HEAD/资源pin/锁/F证据、日常App/Profile保持。无Dify/后台管理登录、业务上传/创建/新费用、自动生成/重派、提交/推送/发布；PDF和实验范围未扩张。
