# Windows 隔离环境修复及缓存清理复审

生成时间：2026-09-02T12:53:08.571Z

**状态：STATIC_ONLY**。批准的本地环境修复与四文件清理已完成；阶段 B 的实际平台契约探测仍未完成，phase4Complete=false。

## 范围与根因

本轮只修改：
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\scripts\verify-oasis-api-phase4.mjs
- D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs

在历史 attempt-004 已验证缓存清单基础上，另执行批准的四文件精确删除。新增证据仅位于本目录；历史失败报告与原始证据保持不变。未改业务源码、生成文件、锁文件、权威 API 或真实 Profile；未提交、安装、联网联调或运行真实 DSH。

确认的代码缺口是 inspect 环境漏掉 Windows 基础变量，以及 taskkill 继承未指定的 cwd/env。上轮缓存的具体创建进程未独立复现，仍不作精确归因。

## 修复内容

1. 保持 prepare 的 isolatedEnvironment 和零 DSH 启动边界不变，新增 inspect 专用环境。缺失 SystemDrive 时从有效 SystemRoot 的驱动器推导；当前只读核验实际 Windows 根与 System32/cmd.exe、taskkill.exe 路径，检查存在且祖先无链接。SystemRoot 未知、未展开变量、相对路径、重复键冲突或 ComSpec/SystemDrive/WINDIR 冲突均拒绝；不猜未知系统目录。
2. 明确把 ProgramData、ALLUSERSPROFILE 以及原有可写用户/缓存路径重定向到新隔离根。不是继承真实 C:\ProgramData，也不修改机器/用户永久环境变量。实际 DSH/Edge 对此重定向的兼容性尚未验证。
3. Windows 清理辅助程序使用新建 ASCII 临时 cwd、只读冻结的显式环境、由本模块创建的上下文和固定 taskkill 入口；只针对仍持有的 ChildProcess PID，异步校验后再次检查退出状态。启动前复核链接路径；超时、启动错误与未关闭状态保留失败。结果记录 executable、argv、cwd、OS 环境字段和关闭状态。
4. 复审发现 realpath 先解析会掩盖临时根链接；通过 RED 复现后改为先检查原始 tmpdir 路径链，再解析与建目录。没有绕过链接门禁。

## 新鲜验证

| 项目 | 结果 | 证据 |
|---|---|---|
| 最终根脚本完整回归 | 99/99，退出 0，跳过 0 | root-final.txt、root-final.command.json |
| 最终业务包完整回归 | 271/271，退出 0，跳过 0 | package-final.txt、package-final.command.json |
| 真正的本地进程树清理 | taskkill 退出 0、closed=true；自有父子进程均退出 | native-final.json；根回归中的 PID 存活断言 |
| 清理后的缓存防复发 | 工作区字面量 %SystemDrive% 目录不存在；最终自有 native cwd 中无同名字面量路径 | preservation-final.json、native-final.json |
| 源文件新鲜度 | 最终两组测试记录的输入 SHA256 与当前源码完全匹配 | source-review-final.json |
| 空白检查 | 两个改动文件行尾空白 0；no-index --check 无空白错误输出，退出 1 表示文件存在差异，另有 LF/CRLF 警告 | source-review-final.json |

实际封套命令（cmd，项目根）：

    node docs/evidence/oasis-api-phase4-env-remediation-2026-09-02/attempt-001/run-final.mjs root
    node docs/evidence/oasis-api-phase4-env-remediation-2026-09-02/attempt-001/run-final.mjs package

封套调用固定 Node，以完整 OS 环境运行显式测试文件列表；实际 executable/argv/cwd、时间、退出码与输入哈希见对应 command.json。根回归为验证 Windows taskkill 自有进程树使用狭窄提权；不是普通权限下实际 DSH 运行成功的证明。模拟 DSH 包装器、合成 HTTP Host 与业务 fixture 不是官方 Host 或真实 API。

保留的 RED/GREEN：red-env（3 个预期失败）→ green-env；red-env-hardening（1 个失败、1 个既有链接拒绝通过）→ green-env-hardening；red-temp-link（1 个预期失败）→ green-temp-link。最终回归在所有源码修复和缓存清理之后重新运行，前面的 98/98 不代替最终 99/99。

## 保护与精确清理

冻结 2837 个文件：2831 个不变、仅批准的 2 个源码变化、仅批准的 4 个缓存文件删除。读取错误 0，非白名单新增 0；HEAD、暂存区与权威 API 哈希不变。Git 全局 ignore 不可读警告仍存在；保护集合使用 Git 与既有冻结文件合并，不宣称完整扫描所有被忽略目录。

清理前证明绝对字面量根位于项目内、各级无链接且 realpath 一致、条目精确为 4 文件和 5 目录、尺寸与 SHA256 全部等于批准清单。每次 unlink 前再校验路径和哈希；只用逐文件 unlink，再用非递归 rmdir 删除已空目录。不存在递归删除、百分号变量展开、跨 Shell 删除或删除未知文件。详见 cleanup-authorized-preflight.json、cleanup-result.json。

首次清理预检因 Node REPL 持久闭包复用旧数组发生计数门禁拒绝，未删除任何文件；独立局部枚举确认实际文件未变化后才清理。该过程保留在清理结果说明中。

权威 API SHA256：429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1。

## 停止点与后续门禁

- 本轮没有运行真实 DSH CLI、Host、浏览器、Slot live 查询或真实业务 API；没有获取真实 Profile 完整三次稳定快照，因此不声称真实 Profile 已取得全量保护证据。
- 临时测试根及诊断文件保留，不清理不相关历史临时目录；真实 Profile 与用户进程不操作。
- 继续 B 前需要用户重新确认真实 DSH 写入暂停，再取得新的三次稳定强快照；只有之后才可恢复全新 attempt-005 的双模式探测。不能以这些本地测试结果进入 C、完成第四批、上线或断言普通权限运行兼容。
