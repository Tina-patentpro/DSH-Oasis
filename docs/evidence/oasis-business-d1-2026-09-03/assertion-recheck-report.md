# D1 单条断言修正与复验

状态：STATIC_ONLY

## 本轮改动

用户批准仅更新既有断言并复验。仅修改 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\packages\oasis-professional-service\test\client-panel-contract.test.mjs 第 104 行，将精确注入列表更新为 settingsScope/remote 与 betterSidebar；未删除或放宽断言，其余注册/卸载检查保留。

## 验证结果

- 定向命令：C:\Program Files\nodejs\node.exe --test test/oasis-connection-settings.test.mjs test/oasis-connection-settings-ui.test.mjs test/oasis-runtime-config.test.mjs test/client-panel-contract.test.mjs test/panel-local-loop-ui.test.mjs test/workbench-store.test.mjs；exit=0，67/67 通过，0 跳过。
- 包命令：pnpm --config.verify-deps-before-run=false --config.cache=D:/OneDrive/4、董娣相关/9、绿洲慧写4.0预研/docs/evidence/oasis-business-d1-2026-09-03/npm-cache run verify。构建成功，包测试 284/284 通过，0 跳过；组合命令在 npm pack 默认缓存目录 mkdir 权限处退出 -4048（EPERM），不可记为整条 verify exit=0。pnpm 的 cache 参数未传递为 npm 子进程的缓存目录。
- 只复跑失败的打包步骤：npm pack --dry-run --json --cache D:/OneDrive/4、董娣相关/9、绿洲慧写4.0预研/docs/evidence/oasis-business-d1-2026-09-03/npm-cache；exit=0，清单 45 项，包含新增配置模块。未生成正式发布包，也未安装/发布。没有修改全局 npm 配置或权限，没有再次构建或跑测试。
- git diff --check -- packages/oasis-professional-service/test/client-panel-contract.test.mjs：exit=0。全库历史构建文件尾随空白不是本次修改范围。
- 工具：Node v22.19.0，pnpm 11.25.0。

## 保全与边界

- 对本轮修改前 3236 个 Git 可见文件逐一比对 SHA256：仅上述测试文件改变，无文件丢失；其内容与“仅替换已批准那一行”的预期逐字一致。业务源码及重建后的 lib 文件 hash 全部未变。
- 新文件仅本轮记录和局部 npm 缓存，均在既有 D1 证据目录内。HEAD 3c2bd5a469b67ed4070b0b9beacc30212cd038e3 及暂存区保持不变；未提交。
- 测试文件 SHA256：CE52BD7F3FCA6EF94DB7A03B966AF68B0BEF5962D8618056B1C61C4631647FB4 → 132FE9D80AB6D941D6FD1020D2E4F044E930585C998DF684205698CFABF84AE1。
- 未启动 DSH 应用、浏览器或真实业务 API。D1 的本地验证阻塞已解除；D2 人工界面验收和 D3 真实非生产任务尚未进行，也未因本轮测试通过而自动开始。

原始输出保留在本目录 assertion-recheck-focused.txt、assertion-recheck-verify.txt、assertion-recheck-pack.txt。旧失败报告保留为历史记录，不回写为成功。
