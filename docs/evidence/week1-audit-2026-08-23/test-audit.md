# 测试有效性与构建可重复性审计

## Fresh运行结果

- `pnpm run build`：退出0，16ms生成`lib/client.js`和map；完整输出见`build.txt`。
- 构建前后`lib`两文件SHA-256清单完全一致，`fc /b`退出0；当前构建内容可重复。
- 全量命令：8项通过、0失败、0跳过，退出0；完整输出见`tests.txt`。
- DSH官方FileSystemSkillProvider发现测试通过且无warning。
- Codex `quick_validate.py`退出1，原因是运行时缺少PyYAML；见`quick-validate.txt`。没有擅自安装依赖。

## 测试强度矩阵

| 测试 | 类型 | 能证明 | 不能证明 |
|---|---|---|---|
| bundle-contract | 文件/manifest/正则合同 | 必需文件和声明存在 | Profile安装或Host启动 |
| client-build-contract | 构建产物正则合同 | 当前文件含Loader ID、React require和exports return | Loader在浏览器实际接受、按钮行为 |
| host-tool | mock ctx单元 | `apply`会向兼容mock注册工具，execute/render返回预期 | 真实DSH组合后工具可见/可调用 |
| skill-contract | 文本正则 | 受理Skill名称和两条边界存在 | Skill被真实运行时发现、专业质量 |
| status | 纯函数单元 | 当前状态对象及freeze行为 | 三个benchmark domain有需求来源 |
| discovery | 本机Provider集成 | 当前硬编码全局Provider能发现开发Skill | 其他安装布局、业务Skill运行时、Host/Client |
| development-skill test 1 | 文本正则 | 开发Skill包含约定关键词 | 操作步骤全部正确或可移植 |
| development-skill test 2 | 文本正则 | reference含链接和约定关键词 | 链接当前内容与本机合同一致 |

## Findings

### P2-T01：原有8项测试不能支撑三项runtime声明

第一周记录中的“Host实际加载”“浏览器实际渲染”“两个Skill运行时返回”没有对应持久化自动化测试。8项全部通过与这些runtime声明是不同证据层。Task 6必须重新取证；否则相应结论降级。

### P2-T02：没有验证按钮点击的可观察后置条件

旧浏览器检查只点击按钮并观察无错误，没有监听`oasis-professional-service:open`，也没有面板消费者。Task 6将只验证事件合同；不会把它表述为工作台已打开。

### P2-T03：关键隔离脚本没有自动化防回归测试

没有测试`--print-home`、shim缺失、真实Profile禁止、非loopback、endpoint逃逸、端口清理或Profile前后哈希。当前隔离安全依赖人工操作和文档。

### P3-T04：Codex补充验证器不可运行

PyYAML缺失令`quick_validate.py`无法运行。DSH自身Provider已经解析并发现Skill，因此这不是DSH运行失败；但第一周记录应继续披露，不能称所有验证器均通过。

## 负向覆盖结论

- 已有：非loopback目标被烟雾脚本拒绝。
- 缺失：错误Loader ID、错误包名、重复slot注入、shim不存在、无依赖checkout、无效Skill frontmatter、非法API响应。
- 本轮为审计，不修改测试；上述缺口进入修复门禁。
