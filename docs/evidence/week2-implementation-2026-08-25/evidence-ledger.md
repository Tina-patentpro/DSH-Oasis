# 第二周实施证据台账

日期：2026-08-25  
范围：第二周项目工作台持久化；不含 Dify、收费管理和第三周专业工作流。

| 阶段 | 证据 | 结果 | 证明边界 |
|---|---|---|---|
| 基线 | `baseline/source-hashes-before.tsv` | HISTORICAL_LIMITATION：56 个条目；原始输入范围未包含 `lib` 和捕获脚本自身 | 普通文件有 SHA-256，但不能证明分发构建输出或捕获器自身未变化；该限制由第二周修复证据补齐 |
| 真实 Profile | `baseline/profile-hashes-before.tsv`、`runtime/profile-compare-after-host.txt`、`runtime/profile-compare-after-client.txt` | HISTORICAL_LIMITATION：664 条、530 个 link/reparse；普通文件有 SHA-256，原捕获器对 link 仅记录 lstat 路径/大小且哈希为空；Host/Client 两批后在该较弱口径下无差异 | 不跟随 link，但原证据未哈希链接目标文本；不得表述为完整强基线，该限制由第二周修复证据补齐 |
| 工具链 | `baseline/toolchain-before.json` | PASS：6/6；Node 22.19.0、pnpm 11.19.0、DSH 0.1.1-rc.2、隔离 Home 为项目 `.dsh-test` | 当前本机固定版本输出 |
| Domain RED/GREEN | `runtime/domain-red.txt`、`runtime/domain-invalid-time-red.txt`、`runtime/domain-green.txt` | PASS：8/8 | schema、深冻结、身份/任务不变量和真实日历时间 |
| Repository RED/GREEN | `runtime/repository-red.txt`、`runtime/repository-green.txt` | PASS：13/13（含 Domain 8 项） | 单 Host 进程内 revision、Workspace 队列和失败语义 |
| RPC RED/GREEN | `runtime/rpc-red.txt`、`runtime/host-lifecycle-red.txt`、`runtime/rpc-green.txt` | PASS：7/7 | dispatcher、loopback channel、状态工具与真实 Cordis 生命周期组合 |
| 全包回归 | `runtime/package-tests-after-host.txt` | PASS：65/65 | 本地 Node package 测试，不证明浏览器或 Host 重启 |
| Client 构建 | `runtime/build-after-host.txt` | PASS：exit 0 | 直接调用既有 tsdown 模块；不证明 clean install |
| 分发预检 | `runtime/pack-after-host.json` | PASS：3 个新增 Host 模块进入包，test 未进入 | npm dry-run，不证明隔离 Profile 已加载 |
| 依赖锁与工具链恢复 | `package.json`、`pnpm-lock.yaml`、`runtime/toolchain-repair-frozen-install.txt` | PASS：官方 npm 注册表补齐后，再执行 frozen/offline install exit 0；`.bin` 与 `.modules.yaml` 已恢复 | 固定 rc.2/Zod 版本；此前 OneDrive `EPERM` 环境关注项已关闭 |
| Client persistence RED/GREEN | `runtime/client-persistence-red.txt`、`runtime/client-persistence-green-core.txt` | PASS：12/12 | remote、模型、hydrate 前零写入、revision 串行、A/B 隔离、冲突和 transport fault |
| Client UI RED/GREEN | `runtime/client-ui-red.txt`、`runtime/client-title-refresh-red.txt`、`runtime/client-ui-green.txt` | PASS：11/11 | Connection 注入、加载/保存/冲突/错误反馈、重命名回显和显式关闭控件 |
| Client 全包验证 | `runtime/client-package-verify.txt` | PASS：build + 81/81 tests + npm pack dry-run | 本地构建/测试/打包；尚不证明 DSH 浏览器实际加载或 Host 重启恢复 |

## 停止条件

- 基线捕获意外写入真实 Profile；
- 当前 DSH 固定版本不提供已冻结的 Storage/Connection 合同；
- 需要覆盖、重置、暂存或提交既有 untracked 基线；
- 需要接入 Dify、收费管理或第三周功能；
- RED 失败原因不是预期缺失行为，或 GREEN 依赖放宽合同。
