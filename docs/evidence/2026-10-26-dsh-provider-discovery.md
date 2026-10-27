# DSH执行provider本地查找、固定依赖安装及资格边界

2026-10-26，Asia/Shanghai；本次接续`DSH-FOLLOWUP-20261026-01`。用户明确要求“请你在本地搜寻需要的DSH执行provider，如果没有则安装你所需要的依赖”。依据本项目公共能力/跨平台产品方向执行，不把旧Mac/Python候选作为所有平台的前置。

**已找到具名实现并完成独立目录中的必要依赖安装；尚未取得PDF/DOCX要求的完整资源/访问保证，U1未执行、D1未接线。** 这比首批只读主包node_modules的抽象seam观察扩大了来源范围，不推翻该时点“主包未挂载具体provider”的事实。来源、成员及安装/测试记录见[机器证据](2026-10-26-dsh-provider-discovery.json)。

## 实际来源和安装

从已保全DSH官方源码归档定向核对，而非按目录名猜版本：GitHub `deepseek-ai/deepseek-harness`，commit `639ed015397290b3745d163aafe02ffee4aa3f84`，归档SHA `bbc09e888e1df3aa37be049abdb7720951e76442d21e5432365d87a465d628f1`，原pnpm锁SHA `80fe05eae33582ae26839afd05f1965f9b0e4be11034ddf9797af6085d5ba9b1`。原归档、原测试树和主包保留；另解包到`.local/oasis-follow-up-20261026/provider-source/`，固定Python数据过滤提取，不执行归档脚本。

| 实际包/版本 | 公共责任 | 当前可消费层次 |
|---|---|---|
| @deepseek-ai/dsh-ptc-runtime-node 0.2.0-rc.2 | 新Node进程、PTC绑定、deadline、结果/控制帧预算和托管清理；注入fs/subprocess/sandbox/sandboxPolicy | 源码与实际进程/服务行为可验证，未作为绿洲材料解析器装配 |
| @deepseek-ai/dsh-sandbox-local 0.2.0-rc.2 | Linux bwrap/Landlock、macOS Seatbelt、Windows ACL后端；执行公共文件效果policy | 实际文件写约束可验证，full只针对其文件效果合同，不等绿洲全部安全要求 |
| @deepseek-ai/dsh-experimental-ptc-runtime-python 0.2.0-rc.2 | 明确实验性CPython子进程及有界协议 | 本次只读身份/限制，不加载、不作为产品唯一解释器 |
| dsh-subprocess-local等同源依赖 | 执行世界及托管进程范围 | 随原锁依赖闭包消费，不暗换为日常DSH或新版服务 |

固定Node24.21.0/pnpm11.8.0、私有HOME/cache，选择Node-provider和sandbox-local的依赖闭包。首次离线执行因pnpm11.8对项目packageManager11.7的自动处理被阻；根据本地pnpm源码改用其实际`--pm-on-fail=ignore`，禁止自动换包管理器。随后离线缺chokidar4.0.3包体，沿用户新授权从官方registry补取原锁精确依赖，冻结锁/ignore-scripts/ignore-pnpmfile，安装退出0，锁摘要保持。

没有修改主包manifest/锁或日常Profile，没有运行postinstall、加载真实模型、替换签名Desktop或发布。日志分别保留provider-install-offline.ndjson、provider-install-fixed-pnpm.ndjson和provider-install-registry.ndjson；未将前两次失败重写为成功。

## 新鲜机制测试及未满足项

在该独立源树以固定Node运行原provider的`ptc-runtime-node/tests/runtime.spec.ts`和`sandbox-local/tests/local.spec.ts`，vitest4.1.8退出0：2文件通过、65项通过、1项跳过。跳过项是Windows公共grant锁/private native temp专属分支，本机Darwin不适用；不是跳过本机文件约束。源runtime用真实进程及公共服务装配，亦有文件约束测试；完整PDF/DOCX profile及产品最大恶意输入未由此验证。

| 绿洲要求 | 具体实现的已知限制 | 当前裁定 |
|---|---|---|
| 268435456字节硬内存，覆盖启动/native/后代 | Node README及Config明确maxOldGenerationSizeMb只是V8 old-generation，native/后代在外；Python addressSpaceMb不应用Darwin | 当前这些默认实现不足；不能把堆帽写成进程树硬内存 |
| 仅准许输入字节/固定依赖、禁止其它文件读取、网络及exec | sandbox-local Seatbelt源码`seatbeltProfileArgs`使用allow default再deny file-write，主要控制可写根；bwrap根为只读bind/，Landlock readOnly含/ | full不包含严格读白名单、网络/exec限制；公共文件效果policy不能自行补成这些保证 |
| 两独立输出流前置上限及全过程/回收 | Node maxOutputBytes为组合序列化logs/结果，grace在结果选定后清理；binding结果在主机产生时的内存不在控制帧帽内 | 还需对应原合同的明确实现、配置和实证，不能以默认deadline/组合预算代替 |
| 实际解析器和最终分发闭包 | provider具名不代表PDF/DOCX依赖、许可/通知、guard/adapter/组件命令已冻结 | 原共享及逐格式缺件继续适用，DOCX私有项不加给PDF |

当前可准确说明“哪一个provider、哪一版、为什么不足”，不再停留在让用户猜包名。安装或65项测试通过不产生READY_FOR_OFFLINE_PROOF。后续若拟扩大现有DSH公共能力或采用其它执行世界，须形成具体公共接点、组件/资源证明及范围方案；本次不自行造通用provider框架、绕过缺项接Host、引入VM或降低合同常量。

本批尚待独立子代理审计；R1此前审计通过只适用于其机械工程范围，不覆盖本安装与provider资格判定。
