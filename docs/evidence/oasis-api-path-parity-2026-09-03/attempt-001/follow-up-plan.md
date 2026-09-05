# 范围偏差后的最小复验计划（待批准，尚未执行）

## 目标与授权边界
仅修正本轮新增回归运行器，防止再向历史证据根产生输出。继续冻结 N3、浏览器、DSH、业务 API 和所有既有源码。发现偏差后的本轮不继续执行测试。

## 允许的变更
- 只修改 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001\regression-runner.mjs。
- 仅在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\oasis-api-path-parity-2026-09-03\attempt-001 内新增排他的复验子目录和报告；保留当前全部红绿测试、偏差文件和原始报告，不覆盖、不删除。
- 不修改 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\tests\scripts\oasis-api-phase4-contract.test.mjs，不移动或删除越界生成的 context.json 与两个目录。

## 执行步骤
1. 冻结当前三项新增源码、旧测试、运行器、全部现有证据及已记录越界目录；再次核对原有 3118 文件、九项工具/API 指纹与 HEAD/暂存区。出现未解释漂移停止。
2. 先为运行器参数构造编写无子进程的回归检查，证明当前 root-safe 过滤器仍包含有副作用的旧证据写失败测试；归档失败断言。
3. root-safe 的跳过模式改为仅匹配下面两个完整测试名称的锚定正则；package 选择保持不变。同时在输入证据中逐项保存排除名称、理由、旧测试 SHA-256，以及执行前的固定输入核验结果。未知选择/测试指纹漂移直接失败，不启动子进程。
   - inspection CLI timeout terminates its owned nested process tree on Windows
   - native diagnostic evidence write failure cannot return collection success
4. 复核显式枚举的测试文件中写入/CLI 调用的目标，确认运行器与测试持久输出不再落入历史证据根；发现其他越界目的地即停止并报告，不扩大排除列表或改写旧测试。修正过滤器检查应转绿，确认新 parity 的证据写失败用例仍保留。
5. 在新子目录运行 root-safe/package，保存实际 argv/cwd、源码 hash、完整 stdout/stderr、关闭/退出码。按当前集合预计根测试 156 项、包测试 271 项，以实际结果为准；新 parity 25 项必须包含在根回归中。不得把新 parity 用例说成旧诊断用例的等价运行证明。
6. 再比对本次冻结的既有文件和历史证据目录，无变化才可接受本轮受限复验。根回归明确是排除两个用例的受限结果，而不是全量运行。

## 验收与停止
- 三项新源码不变，新增 25 项测试保留且通过；受限根/包回归无失败，输入与结果绑定，历史证据不再新增或修改。
- 遗留缺口：旧诊断证据写失败用例本次不运行；真实 Windows 嵌套树收尾仍未运行；C# 未编译、原生路径 API 未采集。
- 本批准只用于运行器范围修正与本地复验。即使通过，也在 N3 独立授权点停止，不启动任何原生采集。
