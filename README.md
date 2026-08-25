# 绿洲慧写 DSH 专业工作台预研

当前代码已完成第一周插件/右栏基础和第二周项目状态持久化：在不替换 DSH 左栏、中栏和原生详情能力的前提下，为技术研发辅助与中国发明专利撰写提供按 Workspace 隔离、可跨 Host 重启恢复的多页右栏骨架。

## 当前组成

- `packages/oasis-professional-service`：Host 状态工具、Web Client、构建配置和 Bundle patch。
- `.dsh/skills/dsh-plugin-development`：以当前 DSH 版本、官方合同和隔离 Profile 规则为基线的插件开发 Skill。
- `.dsh/skills/oasis-rd-intake`：技术研发与中国发明专利任务受理 Skill。
- `scripts/dsh-isolated.cmd` / `scripts/dsh-isolated.mjs`：只接受可追溯到官方 `@deepseek-ai/dsh` 包的 CLI，以 `shell:false` 原样传参，并把运行限定到项目 `.dsh-test` 或 `%TEMP%\oasis-dsh-*` 下的无链接隔离 Home。
- `scripts/dsh-local-api-smoke.mjs`：仅允许 loopback、固定 RPC allowlist 且校验 `result.ok=true` 的烟雾工具。
- `scripts/verify-week1-supplement.mjs`：新建临时 Profile、启动无凭据回环 Host、运行 RPC/Skill/live Slot/A-A-B 浏览器回归、保护真实 Profile 并在成功后清理临时根。
- `scripts/baseline-capture-core.mjs` / `scripts/compare-baselines.mjs`：普通文件强哈希、link 目标文本哈希且不遍历目标，并以精确 allowlist 失败关闭。
- `scripts/verify-week2-persistence.mjs`：在同一临时 Home 上执行 Host1 写入/冲突、Host2 恢复和真实浏览器 A/A/B/A、刷新及布局验证。

## 右栏合同

- 入口注册到 `conversation.input.right`；`shell.overlay`只作为生命周期锚点，工作台通过 React Portal 挂到 `document.body`；不注册 `details`、`root`、`sidebar` 或 `conversation` 单槽。
- normal 由版本化最小布局适配器给 `#root` 增加插件自有360px右侧推挤，保证中栏不被遮挡；expanded清除推挤并只读跟随原生侧栏边界；hidden卸载面板、清除全部自有CSS/属性并把焦点返回当前Workspace入口。
- 视口小于1024px或预计中栏小于520px时，normal请求自动显示为expanded；DSH DOM失配、布局冲突、异常、HMR和卸载均fail-closed并恢复原布局。
- 页面状态按 DSH Workspace 保存；Workspace 只通过当前 Session 在 `sessionIds` 中的唯一归属解析，不按 cwd 猜测。
- 新页先显示两类工作流选择，选择后原位显示“输入材料”和“生成结果预览”骨架。
- 当前完成的是第二周状态层：共享严格 wire schema、revision/CAS、任务页与面板状态持久化，并固定资源预算（32 tasks、64 inputRefs、JSON 深度 8、草稿 1 MiB）。专业生成、材料正文、产物下载和项目写回仍未接入。

## 静态与包验证

```cmd
cd packages\oasis-professional-service
pnpm install --frozen-lockfile
pnpm --config.verify-deps-before-run=false run verify
cd ..\..
node --test tests\scripts\*.test.mjs tests\skills\*.test.mjs
```

`verify-deps-before-run=false`只关闭 pnpm 11 在执行脚本前的隐式重装；显式的 frozen install 仍然必须先成功。依赖升级必须单独执行并审查锁文件。

## 一键隔离 Host 与浏览器验证

```cmd
set OASIS_BROWSER_EXECUTABLE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
node scripts\verify-week1-supplement.mjs
node scripts\verify-week2-persistence.mjs
```

验证器只接受本机 loopback Host，使用 `%TEMP%\oasis-dsh-week1-remediation-*` 作为新 Profile，前后比较真实 `C:\Users\TinaD\.dsh` 全树 SHA-256，并在成功后确认安全边界再清理临时根。浏览器路径也可指向本机 Chrome；不得在命令、日志或文档中写 API Key。

手工检查隔离路径时可使用：

```cmd
scripts\dsh-isolated.cmd --print-home
scripts\dsh-isolated.cmd --print-bin
scripts\dsh-isolated.cmd --home C:\path\to\new-temp-home plugin --profile web add .\packages\oasis-professional-service
scripts\dsh-isolated.cmd --home C:\path\to\new-temp-home --profile web --dump-config
```

`--dump-config`会准备 Profile 文件，不是对真实 Profile 的纯读取操作。

## 当前边界

Dify 和收费系统是既有稳定外部能力，不在本仓库内开发或重新验收。第一周修复证据位于 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week1-audit-remediation-2026-08-24`；第二周修复与持久化证据位于 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week2-repair-2026-08-25` 和 `D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\docs\evidence\week2-persistence-2026-08-25`。这些结论只适用于当前本机 DSH `0.1.1-rc.2` 的隔离 loopback 环境，不代表生产部署、真实 Profile 运行、未来 DSH 版本或其他 Windows 机器。
