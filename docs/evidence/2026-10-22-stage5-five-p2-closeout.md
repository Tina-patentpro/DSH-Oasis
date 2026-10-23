# 阶段5五项P2修复与复审

日期：2026-10-22，Asia/Shanghai。开发根目录`/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支`mac/continuity-v2`，HEAD保持`84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**结论：本轮审计的E/C/B/A/D五项P2已在代码、正式回归和合成组件范围修复，单代理作者复审未遗留已知P1/P2。阶段5整体仍未完成，不代替Desktop、真实来源或发行验收。** 原审计报告、失败探针与原件保持，不将作者复审称为第三方独立审计。

## 五项修复

| 审计项 | 最终行为 | 核验 |
|---|---|---|
| P2-E API保存后交接 | 下游读取仅接受精确canonical名或在同一canonical名上增加一次大写`_OIW`；内部filename仍必须是canonical。保存正文、原产物、审核hash和已保存文件不改；任意改名、重复/小写别名、hash变化仍拒绝或警示 | 两来源817KB级实际临时文件保存→Flow-1-2准备→累计组装通过，未重复包入整份上游；非法别名正式回归 |
| P2-C 旧草稿兼容 | 旧`resultDraft`和`resultDrafts`不补写、不猜格式、不自动抽取。页面只读展示完整旧稿供复制；另起核心编辑从原版本核心正文开始。新写入显式`format=core-markdown`并存独立可选`coreResultDrafts`；编辑完成仅删除对应新核心草稿，旧字段保持 | 整稿恢复、原件/旧草稿保全、新版待审核、重开、旧版本map与新核心并存/放弃正式回归；浏览器验证切回旧稿逐字保持 |
| P2-B 容量合同 | 人工核心snapshot采用1MiB UTF-8合同；完整累计稿与Workspace聚合仍限1MiB/8MiB，超限拒绝且不截断。模型输出和普通材料的300000字符限制保持；新核心草稿拒绝NUL | 310000字符人工正文可形成完整新版本；完整稿超限、UTF-8超限/NUL及模型超限回归 |
| P2-A 空项目入口 | 使用Workspace级创建，不依赖已有pageId；成功后客户端明确激活。失败在功能中心显示可见错误，可重试；创建期间锁定重复创建 | 空项目写失败→可见提示→重试创建/激活正式回归；浏览器双击仅创建一份任务 |
| P2-D 目录恢复 | 新版目录独立status/error/promise，失败不再伪装ready/null；旧目录仍可用。新版页及功能中心提供明确重试，成功恢复字段，保留输入与其他客户端状态 | 瞬时失败→可见错误→重试成功，旧目录/草稿保全正式回归及浏览器场景 |

新核心草稿是可选扩展，根schema仍为4、V340运行schema仍为1；旧记录读取不迁移、不重算hash。旧调用不声明format时仍沿用旧草稿写入/清除语义；这类未确认格式草稿不能直接进入新版核心修订。当前客户端显式声明格式，新旧客户端不能靠字段猜测代替含义确认。

旧稿恢复保留了有意的限制：不自动将整稿结构编辑转换为核心编辑，也不把旧稿中的事实或表变化登记成已确认事实。用户可以复制旧原文，再明确输入新核心正文；旧证据仍在原字段。原版本仍有旧未处理草稿时审核/保存受阻，新建修订版本需独立审核。

主要文件在业务包`packages/oasis-professional-service/src/`：`v340-document.js`、`v340-runtime-contract.js`、`v340-runtime-service.js`、`v340-result-service.js`，以及client下的store/model、共同页面、功能中心和两处页面接线；未增加执行器或run/create RPC，路由仍52条，真实来源继续禁用。

## 正式回归与复审

新增`test/v340-p2-closeout.test.mjs`共10项。首轮9项为2通过/7失败；本地来源交接是正常对照，失败覆盖五项审计缺口。E三项先红后绿，C两项先红后绿；C完成后单独复现B确为300000字符snapshot限制，再修复。保留all-red、e-green、c-green、b-red、ecb-green等原始日志。

作者另行复审发现：若先合并旧/新同版本草稿map再校验，新核心草稿可能掩盖旧map的坏baseSha256。新增第10项正式测试先失败（Missing expected rejection），改为分别校验两份map后通过；该临时发现已修复，记录在overlap-red和affected-green中。复审同时核对命名只容忍精确别名、旧数据无迁移写盘、旧未决保护、容量/无覆盖、创建冲突及目录并发请求边界。

上一批15项共同页面测试中，4项使用未声明格式的核心测试输入，首次复跑失败。为同组核心草稿用例统一补显式format，并将每版本新核心草稿的3处存储投影断言移至coreResultDrafts；未删除或降低原稿不变、审核、版本、无覆盖及重开的断言。仍在测试旧整稿/旧格式语义的29项运行测试和B1十项测试整份保持原字节。prior-core-red日志保留，不隐去接口语义调整。

| 新鲜验证 | 结果 | 原始证据（本轮.local目录） |
|---|---|---|
| 新增五项修复正式回归 | 10/10，完整全量中实际执行 | full.log |
| 受影响新版/客户端/B1正式组 | 64/64，退出0 | affected-green.log |
| 主包完整正式回归 | 970/970，0失败/0跳过，退出0 | full.log |
| Mac Markdown/Sidebar/安全预览/启动合同 | 26/26，退出0 | mac.log |
| client/包/装配合同 | 9/9，退出0 | contracts.log |
| Chrome React DOM/StrictMode→真实RPC/store→临时磁盘 | 5/5：双来源常规编辑审核保存重开、空项目双击、目录重试、旧整稿恢复 | browser-results.json、截图 |
| 固定工具旁置构建 | 退出0，源码与候选配对；活跃lib不替换 | build.log、build/ |
| 完整候选包dry-run | 119成员，无正式测试、依赖、本地运行或归档数据 | pack.json、package/ |
| 旧文件与Git保全 | HEAD不变，除范围内源码/2份核心测试/状态外保持；旧报告及失败原件保留 | preservation.json、final-summary.json |

主包命令：`OASIS_UNIFIED_FIXTURE=1 tools/bin/node --test --test-concurrency=1 packages/oasis-professional-service/test/*.test.mjs`。shell为zsh，工具为仓库固定Node24.21.0/tsdown0.22.14；打包offline、ignore-scripts，使用本轮私有cache和两个独立空npm配置。未安装依赖。

浏览器测试新增`test/v340-p2.browser.mjs`，复用原双来源组件测试。所有模型/服务标签都由合成执行器提供，不代表实际本地模型或API请求。临时测试页与本轮loopback服务已关闭，服务正常退出并清理自身临时项目。

## 保全、范围与尚未执行

账本与起点SHA256清单位于`.local/stage5-five-p2-repair-20261022/`。旧设计、历史审计/FAIL、B1三态夹具、unknown记录、业务基准/资源、manifest/lock、活跃lib及准入保持。当前状态仅增加本次摘要，旧全文作为精确字节后缀保留。构建候选只在旁置目录，不重新pin或装配实际应用。

未启动Desktop/实际DSH，未新增真实模型/API、登录/认证、上传/费用或对话发送；未安装、修改Profile/应用/准入、提交/推送/发布。没有重新执行Desktop check，不把历史漂移信息写成本轮新鲜检查。复审是作者单代理复审，结论限已测范围。

阶段5剩余的原生模型/API逐节点接线和实际项目/服务映射、非文本解析、原生打开/导出/引用、实际Desktop宽窄页/键盘/正常重启、真实存储/跨进程排他及安装升级/发行，均不由本轮回归绿色替代。旧格式恢复采用保全和明确新建核心版本，不提供自动整稿转换；这是本轮修复的明确行为边界。
