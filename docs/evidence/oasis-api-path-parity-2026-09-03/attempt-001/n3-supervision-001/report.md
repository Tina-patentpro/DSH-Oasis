# N3 一次所有者原生采集报告

项目状态：**STATIC_ONLY**。N3 独立原生采集已完成；本状态不抹去已取得的原生证据，也不代表浏览器、真实 DSH 或阶段 B 已通过。

## 核心结果
在匹配已批准所有者的同一个新隔离 PowerShell 进程中，按固定顺序完成三项调用：

| 调用 | flags / CSIDL | HRESULT | 结果 |
|---|---|---|---|
| SHGetKnownFolderPath — DONT_VERIFY | flags=0x4000 | 0x00000000 | 取得预期隔离 LocalAppData 路径 |
| SHGetFolderPathW — current | CSIDL=0x001c，flags=0 | 0x80070003 | 未取得成功路径，path=null |
| SHGetKnownFolderPath — verify | flags=0 | 0x80070003 | 未取得成功路径，path=null |

GUID 固定为 F1B32785-6FBA-4FCF-9D55-7B8E7F157091；hToken 均为 NULL。三项 status 均为 executed、guardCode 均为空，没有重试。

实际采集时间（UTC）：2026-09-03T04:42:08.084Z 至 2026-09-03T04:42:09.334Z。
目标路径：C:\Users\TinaD\AppData\Local\Temp\oasis-dsh-p4-native-uOSNWM\tmp\oasis-dsh-p4-native-gjf5Co\os-home\AppData\Local
采集前和采集后都为 missing / ENOENT；本轮没有补建该 Local 目录。

**允许结论：H1 得到本次独立进程证据支持——不验证目录的调用成功，而两种验证式调用失败。不能据此宣布 Edge 根因已确认，也不能宣布 DevTools/浏览器启动已修复。**

## 身份、次数和收尾
- 身份：新鲜 whoami 结果与冻结的批准所有者用户名/SID 完全匹配；用户名 laptop-thomask\tinad。未切换用户或令牌，未因权限扩大任务范围。
- 监管器真实启动一次；其内 whoami 一次、parity Node CLI 一次、固定三项 API 各一次。owner-native-attempt.json 保留，未执行任何重试或旧 PID 清理。
- 外层 parity Node PID=21688，exitCode=0、closed=true、timedOut=false；stdout=56 字节、stderr=0。
- 内层 PowerShell PID=21192，exitCode=0、closed=true、timedOut=false；stdout=1119 字节、stderr=0。
- 内层报告 PID 与持有子进程匹配，创建/调用时间在本次窗口内；报告 resourceCleanupComplete=true，父子层 collectionComplete=true。没有触发树终止或根级强制回收。
- 这些证据限定为持有子进程的 close 及探针缓冲释放报告；不是 OS 级所有后代生命周期/资源泄漏监控。

## 实现与本地验证
只新增本目录中的 owner-once.mjs、owner-once.test.mjs、test-runner.mjs 及证据；所有既有源码保持不变。监管器直接持有固定 ChildProcess，未用旧 runRecordedCommand 执行原生入口。

- identity：5 秒主期限，持有根级回收及 2 秒 close 等待，10 秒终结看门狗。
- parity：45 秒主期限，7 秒树终止结果等待、5 秒 close 等待、根级回收后 2 秒等待，独立 60 秒终结看门狗。
- stdout≤64 KiB、stderr≤8 KiB；按字节流限制，保存白名单数据和 hash，不保存任意异常/畸形输出正文。
- 标记、目录复用、输入 hash、readiness、身份、外层/内层协议、关闭或证据写入失败均不提升为完成。

| 验证 | 结果 | 退出码 |
|---|---|---:|
| 初始 red | 14 项均因 owner 模块不存在而失败 | 1 |
| 首次 green | 13/14；内存文件系统错误地将已生成 JSON 的目录继续标为缺失 | 1 |
| review-green | 修正 mock 目录模型并补充独立看门狗/异步错误检查后，16/16 | 0 |
| Node --check | 三份新增实现/测试文件均无语法错误 | 均 0 |
| 唯一真实监管器调用 | collectionComplete=true，failure=null | 0 |

初次 shell 带空格可执行文件引用失败发生在 --check 阶段，未进入真实 attempt；后续 direct execFile 语法检查与已核实解析到同一 Node 二进制的短路径检查通过。该情况、首次 mock 失败均归档，没有把失败输出覆盖掉。

测试使用假子进程、假时钟和内存文件系统，不采集原生 API。旧 root/package 全套回归本轮没有重跑；上一轮 156/156、271/271 仅作为输入指纹仍匹配的前置证据，两个既定排除项仍是覆盖缺口。

## 保全
- 3189 个冻结的 Git 可见既有文件全部未变；3461 个既有证据树条目内容/链接文本未变，遍历未跟随链接。
- 新文件只在本次 n3-supervision-001 和 native-once 内；隔离临时根按批准创建。历史越界文件/目录和原报告均保留。
- 当前冻结输入、API 文档、Node/Edge/Playwright 文件指纹、HEAD 和空暂存区均未变；新增监管器在测试、实际执行与收尾间 hash 一致。
- git diff --check 仍退出 2，只有既有 client.js 第 2082、2090、2125、2133 行行尾空白；本轮未修改该文件。全局 ignore 文件读取限制仍存在，不将 Git 可见清单等同于完整文件系统审计。
- 没有读取真实 DSH Profile、启动浏览器/真实 DSH 或发出业务 API 请求；没有修改全局策略、权限、依赖、工作树或暂存/提交。未增加 WMI/CIM/ETW 采样，未声称系统绝无间接访问。

## 主要证据
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\native-once\parity-result.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\n3-supervision-001\owner-result.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\n3-supervision-001\runtime-acceptance.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\n3-supervision-001\commands.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\n3-supervision-001\post-native-preservation.json
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\n3-supervision-001\source-hashes.json

## 下一步（未执行）
先制定并审批“仅改变新隔离 LocalAppData 目录存在性”的单变量对照计划，再判断是否有必要进入浏览器独立预检。不复用本次目录/标记，不直接补目录，不直接解锁阶段 B；浏览器和真实 DSH 验证仍需各自的批准及适用前置条件。
