# F磁盘文件路径桥接：定向修复及实际恢复返回

本批修复固定Desktop与DSH的公开文件路径能力名不匹配，实际验证普通/长Markdown回到原生当前文件引用分支；完整F及整个后续计划仍未完成。新候选仅在独立Profile加载，未修改签名App、旧前端补丁、主包锁、日常安装或旧准入。

## 实现与准确边界

Desktop2.0.17预加载公开`__DSH_DESKTOP_FILE_PATH__.getPathForFile(File)`；DSH0.2.0-rc.2会话输入层读取`__DSH_HOST_PATHS__.pathFor(File)`。原组合没有适配，磁盘Markdown因此误走临时上传。新增旁置通用扩展`dsh-desktop-host-file-path-bridge/0.0.1`，沿已导出的`webserver/index-inject`事件在head注入短脚本，把同一个File交给既有原生方法。没有业务逻辑、文件读取、新HTTP接口、私有store、根Slot替换或CSP/认证变化。

已有owner不覆盖；Web缺少能力时不安装；原生空路径/异常不猜测、不吞错。四个顶层版本仍为Desktop2.0.17、DSH0.2.0-rc.2、Cordis4.0.4、Sidebar0.24.1，原前端补丁`.1`保持。文件与命令/hash见[本批执行清单](2026-10-26-f-host-file-path-bridge-execution.json)；方案与局部计划分别见[设计说明](../superpowers/specs/2026-10-26-desktop-host-file-path-bridge-design.md)、[修复计划](../plans/2026-10-26-f-host-file-path-bridge-repair.md)。

## 验证结果

- 固定Node24.21.0执行`node --test scripts/tests/desktop-host-file-path-bridge.test.mjs`：8通过、0失败/跳过，退出0。包含真实Cordis4.0.4事件发出head脚本并实际执行、File/receiver传递、Unicode/Windows路径、缺能力、owner保全、空路径/异常及幂等只读。Windows项是函数传递测试，不声称Windows实际安装包验证。
- 新Profile `.dsh-test/host-path-bridge-public-20261026`由固定pnpm11.8.0离线生成本地link锁，再冻结/忽略脚本物化。所有模型、账户、标题生成、搜索、更新和自动驱动关闭。新准入156项；实际GUI前、GUI后及最终退出后`--check`均退出0。旧147项准入及旧mac-dev准入不改签。
- 实际App仍来自官方固定只读挂载。2026-10-26T14:10:41.852Z首次启动，原生选择普通96字节及150000 UTF16单位/449990字节Markdown。原文本`PUBLIC-BRIDGE-A-UNSENT`保持，两文件呈原生文件引用，未出现待上传附件栏；新Profile附件文件数0。
- 首次CmdQ于14:13:55.525Z正常退出code0；14:14:05.432Z重启后原文本及`@F-public-ordinary.md @F-public-long-150000.md`恢复。B工作区新草稿为空、发送禁用，无A标记或引用；正常切回A仍保留原文本和两个路径。第二次CmdQ于14:21:45.821Z退出code0，端口57523关闭、入口锁释放。
- 3471项初始保全清单无缺失，9项已有变化仍为此前2个状态入口、2个M06生产文件、5个测试/辅助文件。本批通用扩展/测试/计划为新增文件；旧失败、旧pin和用户其它未提交内容保持。

原生草稿冷恢复仅seed纯文本，引用的结构化occurrence和芯片外观没有恢复。固定`ui-reference`对文件引用的clipboard与serialize均返回同一个`@path`，`input/facade`无occurrence时直接使用文本，因此这里只取得相同文件路径文本投影的静态依据。**没有点击发送，不声称实际模型读取、正文交付、权限检查或芯片结构恢复已验。** 原生引用仍指向当前文件，不是固定审核版本或内容寻址快照。

## 保留的失败路线

第一版只在Profile链接变换HTML的前端包，实际GUI仍上传。固定`web-app`相对自身安装解析前端，未消费该Profile link。该失败Profile、截图、日志与原设计/实现/测试字节保存在`.local/oasis-follow-up-20261026/host-path-bridge/html-attempt/manifest.json`及同层证据中；原10项HTML测试绿色不能代表实际挂接。随后改用公开注入事件，当前8项测试和新Profile实际GUI才是本批有效证据。

首次失败排查的未认证loopback静态请求返回403，未绕过认证或据此判定服务缺失。DevTools尝试输入的检查表达式因原生输入失真未执行，已清空并关闭，不作为能力证据。

## 未完成范围及审计状态

图片、无磁盘路径Blob和旧待发送上传附件仍缺冷恢复；本修复只接回磁盘非图片文件原有分支，不能关闭FH-A01/P2全部范围。固定审核版本普通/长稿引用、业务跨Host排他、UNKNOWN原运行恢复、全部F、E、新资源、U1/D1、G/H和阶段6继续开放。此次没有真实生成、对话发送、外部上传或费用；网站唯一一次3元预算已耗尽。

本批待用户指定的GPT-6.1/max独立审计；此前F审计仍只覆盖旧147项/GUI子集，不自动扩大。
