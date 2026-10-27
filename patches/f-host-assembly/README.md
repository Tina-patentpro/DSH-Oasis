# F受控开发装配接续

入口：`scripts/f-development-assembly.mjs`。它以已审R7为固定来源，叠加本批有界checkpoint `.oasis-draft.3`，与路径桥、单所有权JSON后端及原固定UI/Sidebar/业务候选组合为新隔离Profile。通过冻结R7准入SHA及精确官方client转换核输入，不按mtime或市场latest选包；缺任意保留的artifact或字节漂移即拒绝。依赖仍是具名本地交付，不是独立发行包或可移走源目录的证明。旧R7与首轮R1/R2原件保持。

```zsh
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-development-assembly.mjs --create /absolute/explicit-spec.json
# 在新Profile的home/profiles/desktop中，用固定pnpm11.8.0、私有HOME/cache：
# install --offline --lockfile-only --ignore-scripts --config.manage-package-manager-versions=false
# install --offline --frozen-lockfile --ignore-scripts --config.manage-package-manager-versions=false
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-development-assembly.mjs --seal /absolute/new-isolated-profile
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-development-assembly.mjs --check /absolute/new-isolated-profile
tools/node-v24.21.0-darwin-arm64/bin/node scripts/f-development-assembly.mjs --start /absolute/new-isolated-profile
```

spec指定`baseAdmission`、不存在的`root`及已物化`checkpoint3`准确路径。来源必须是已审R7；v3仅由`conversation-draft-checkpoint-3.mjs`对固定原件转换而来，Node half/manifest须对应R7与自有版本3，缺v3不静默退回v2。原文件不重签，新输入清单保留，物化后仅seal一次。`--start`要求已物化/冻结、固定Node、无模型配置和三项强制组件，通过既有启动所有权与隔离路径机制运行。没有real-acceptance开关，正式默认来源/生产API不会因装配通过而启用。模型/账户/自动执行服务禁用；原生Electron sandbox保持、阻断代理不是操作系统网络隔离保证。

强制组件路径和完整Profile配置会从固定R7重新推导，当前输入必须完全相等；修改依赖后重算本地pin，也不能改为另一guard或追加stock-json启用。加固前原件和准入保留，本次加固候选另建新Profile，不能用当前脚本改签首版准入。

首轮Max发现A01/A02后，本批还将实际App/Node与固定base严格绑定，完整校验来源/配置/物化pin集合；每次verify重新核全部7个实际依赖link、package-map、单importer锁映射、固定pnpm模块与workspace元数据，`materialized=true`或任意四文件不构成准入。v3组件自身同样校解析闭包。不是对磁盘任意代码篡改提供签名安全承诺，发行仍另验。

第二轮A02补正将有效workspace原字节及空root配置固定，并将全部模块布局、workspace有效settings和lock settings与R7同角色原件比较；仅排除安装时间、缓存位置，项目路径/name/version单独按当前manifest推导。自行重算pin不能改变path limit或触发Desktop自动迁移。该入口也拒绝机器级patch、非desktop活动Profile、非disabled市场选择和plugin-management覆盖；只校验，不修改偏好。不声称未被固定运行时消费的package-map附属字段构成执行防线。

具名FH-A01恢复采用另一个只读入口 `prepareLegacyDraftRecovery(spec)`（`scripts/legacy-draft-recovery.mjs`）：必须显式指定原workspace/session、唯一成员关系、冻结历史AX/原稿及所选文件、原工作区文件和孤立存储两处相等的字节。函数只返回恢复包，不写Profile、不扫描猜配。未知原lastModified设0并标未知；恢复MIME为本批选定显示类型，不宣称完整还原浏览器原File元数据。原receipt仅存于原生Session WeakMap，不能恢复。

新副本的workspace/session身份和原公开fixture路径保留；只复制具名业务存储和会话文件，不复制credentials或整个userdata。临时`f-legacy-recovery-proof` slot包只用于本批新Profile的明确恢复/观察，可通过spec.fixture固定三文件SHA引入；默认装配没有该包。它校验当前公开workspace列表，向本补丁拥有的IDB写新checkpoint；已有记录或fence即拒绝覆盖，不执行原生上传、模型或发送。生产用户材料恢复仍需相应实际对象/归属证据与具体范围；这不是任意孤儿自动恢复功能。

首轮A03后，恢复seed使用`legacy-draft-seed.mjs`：校验完全部File后再核活跃目标/生命周期/归属，事务内`add`仅不存在时写入；失败只移除自身generation的fence，保留新写入者。恢复目标正活跃时不seed。v3仅将checkpoint加载中的无关原生Store通知与实际draft/revision/phase/引用/附件变化区分，真实编辑及编辑后清空仍拒绝覆盖；首次冷接续事实和后续重启另外取证，不由Node测试推定全平台可靠。

正式装配接续在此只覆盖支持的开发启动入口和具名候选。旧不守约Host仍可绕过协作锁；发行强制接续、全平台/多Renderer/强杀与升级回退、真实模型/API中断及完整F另按剩余表，不能以本入口关闭。原FH-A01失败和原准入/审计保持原字节，本批新恢复不改写历史。

2026-10-27后续增量：spec可显式指定唯一`checkpoint4`，选择`.oasis-draft.4`；与`checkpoint3`同时存在即拒绝，版本4请求不得拿版本3 artifact顶替。v4只对同浏览器分区/同源的workspace+session checkpoint binder增加公共Web Locks互斥；失败/能力缺失不进入底层恢复或写入，不阻原生编辑，不自动等待接管。持锁至dispose后的队列排空；排空异常保持锁到文档销毁。真实编辑、归属、fence及人工重传守卫沿v3保持，数据schema不变。维护入口的完整输入清单也固定其导入的v4转换源码，即使选择legacy模式也不能删掉导入源pin。

跨Document验证用具名公开浏览器fixture和真实IndexedDB；不把它称为两个实际DSH Renderer或全平台证明。临时旧seed观察fixture仍沿已审单Renderer范围，不声称它、旧版本或其它不守约写入者受v4 lease约束。v4开发实际恢复、来源化装配与正式发行/强制升级仍分层；冻结的v2/v3、R4准入和旧失败由Git及原证据保留，不重新签名。
