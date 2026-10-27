# F旧附件/固定装配：A02有效配置补正返回（R4）

本稿接续首轮及R3两份独立审计；两轮失败报告、执行单、R2首次冷恢复0/0均保留。当前仅送审具名无模型开发装配，不关闭完整F。

## 改动与边界

`scripts/f-development-assembly.mjs`不再用当前hash自证workspace/root配置：必须等于固定R7同角色workspace原字节及`[]\n`。物化模块全部布局字段、workspace全部有效settings及lock settings与固定R7同角色比较；安装时间与缓存位置不作为执行身份，当前project路径/name/version另由manifest完整推导。v3组件与Profile分别比对各自原角色。机器级patch、非desktop活动选择、市场非disabled、plugin-management覆盖均在启动前拒绝，不修改偏好。

10个新增反例在旧实现全部失败（原16通过）；修复后26/26通过。覆盖isolated、自动peers、显式path limit、modules长度、state有效settings、非空root及四层管理覆盖。当前两解释器七文件并集各73/73，0失败/0跳过；工具Node24.21.0，官方Electron Node24.18.1。未改业务源码/依赖，原路径1480/1480与已完成构建/127成员pack沿未变输入复用；平铺verify副本77失败仍保留失败，不声称整体verify通过。

## 新的实际验证

新Profile `.dsh-test/f-legacy-assembly-20261027-r4`，196pin，固定pnpm11.8.0离线lock-only→冻结安装、忽略脚本，未重签R1/R2/R3。仅复制原公开fixture两个具名业务存储及sessions；没有复制credentials或整个userdata。原workspace/session/公开路径保持，不启动旧Profile。

首次冷进入原A即显示`F20261026-A-UNSENT`（18字符）和2件待重试附件；B原会话0字符/0附件，返回A仍18/2；正常退出再启动仍18/2。两次退出均0，累计本批9次受控启动均已退出。R4新IDB重启前/最终关闭两份Blob实物均为96字节/SHA `53f292233c61aa19aaa98a7e2a2b6e5d0392ae43e779546d753ff7fbf85b0357`、449990字节/SHA `159d0f0fa12bf8c4434c6007e661fb191734e408681899d7288b9a73e2747393`，等于原workspace/孤立存储字节。没有恢复原receipt；lastModified未知仍置0。卡片显示失败待人工重试、Send禁用，没有点击retry或发送。

R4持锁时第二实际SDK Host被`DSH_STORAGE_ROOT_BUSY`拒绝，未注册backend/未开Domain/零业务写入。正常退出后再次`--check`通过196pin，实际配置/物化元数据未被启动迁移；57583已关闭、四份Profile启动锁均释放。

本轮R4重启前IDB取证脚本首次误用userdata根路径，报FileNotFoundError；未复制数据或写结果，改用实际renderer Partition下具名IndexedDB路径后成功。该操作错误不计产品失败。首次A/B操作中一次旧索引打开了业务面板，未执行生成；随后用新鲜完整AX索引完成B/A验证。

## 接续裁定请求

请同一GPT6.1 Max独立代理复核A02剩余反例是否关闭，核新冻结清单、R4实际证据及保全；A01/A03/v3的原接受边界维持。审计前不回填活跃状态，不把作者测试当独立接受。

原17份公开文件、初始3554个既有工作区文件及旧R7准入全部逐字复核。首轮172与R3修复159成员的工作路径变化均以各自修复前准确备份解释；其它成员不改。规划14输入重新核验；中心两导航追加仍按R3具名差异，未据草案扩展实现。

完整F仍缺全写入方发行强制接续、真实Host传输/模型消费、0.1.3真实模型及专业API UNKNOWN/Desktop运行中断、多Renderer/跨平台、双存储失效/未提交事务崩溃、升级回退等。任意孤儿自动归属不在本批；原FH-A01和R2失败不改写。真实模型/API/上传/原生retry/Send/费用均0；未提交/推送/发布。
