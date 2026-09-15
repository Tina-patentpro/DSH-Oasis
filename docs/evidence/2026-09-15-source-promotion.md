# 已验收隔离适配同步至主项目

当前目标状态：PASS_WITH_CONCERNS。仅代表源码统一与隔离构建验证，不是实际 API、发布或新的 Desktop 安装验收。用户本轮“同意进行”批准了主源码同步范围；单代理自检，没有独立审查。

## 变更与保全

- 执行前重验原主包 157 项快照及 29 项差异双方哈希，退出 0。备份根：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\backup。
- 主包同步 7 个运行源文件、package/lock、通用适配测试；新增其必需的内存 Connection fixture。五个固定候选集成测试未混入主包默认 glob。两处测试改为显式固定 Home，新增构建副本 Home 拒绝断言；生产代码 fixture 白名单原样保留，未扩大权限。
- 两个新版补丁原样同步，旧版目录保留；更新 AGENTS 与开发 Skill 的固定版本及原生 Tab 合同。
- 新隔离构建物理复制已固定依赖，链接解析先确认在候选 node_modules 内；不安装新依赖、不改主项目 node_modules。构建 Home/user/cache/temp 全部在新副本内。测试只使用内存替身和已有本地合成测试服务器；未真实模型/API/上传。
- 重建 lib 与候选相同后才复制。client.js SHA：9e7ac9ce808a0fcbd52fe9b716c92ff6756dd9f4b83ce54ab3176c17c4d6dcc2；map SHA：1a52667d7c20991b038499033d899992111b202aa3ae2c355bb3c5cb41d55a3d。
- 最终主包 src/lib 与候选逐项相同，范围外 146 个主包文件不变；API实现、业务 Skill 和旧记录未改。原候选两个 pin 哈希不变，启动器 --check 退出 0，未启动 Host。未操作日常 DSH 或原候选安装、未提交/暂存/发布。

## 新鲜验证

命令执行器：cmd.exe；以下脚本绝对根均为 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test。

- `run-promotion-check.py --test ...`：13 个受影响测试文件，75/75，退出 0。日志：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\check-1789446993172022700.log。
- `run-promotion-check.py --npm run verify`：构建、426 测试中的 424 通过 / 2 跳过 / 0 失败、pack dry-run 93 项，退出 0。日志：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\check-1789447023079861200.log。
- `replay-promoted-patches.mjs`：主项目补丁对固定输入重放，11 项 Sidebar 输出与当前安装相同，两项 Markdown 输出与当前 ASAR 成员相同，退出 0。清单及每项前后哈希：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\patch-replay.json。
- `verify-promotion.py`：源码/构建一致、范围外保全、候选 pin 和启动预检，退出 0。记录：D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\source-promotion-20260915\final-verification.json。

失败记录保留：首次两项固定 Home 测试引用旧 cwd；其后暴露迁入测试缺少 connection-fixture。完整 verify 首次缺构建副本的项目 Skill 及已有合成服务器。分别修正测试定位、补齐必要 fixture、复制已有静态测试输入后通过；未改运行白名单、未伪造 skip 或删除失败日志。

## 固定候选集成入口与未覆盖项

以下五个用例继续保留在 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\source\packages\oasis-professional-service\test：

1. connection-target.integration.test.mjs
2. sidebar-target-contract.test.mjs
3. s3c-native-markdown-policy.test.mjs
4. s3c-sidebar-safe-file.test.mjs
5. s3c-web-markdown-policy.test.mjs

固定候选命令（cmd.exe，项目根为工作目录）：

```bat
python .dsh-test\isolated-dev-20260913\run-source-check.py --test test/connection-target.integration.test.mjs test/sidebar-target-contract.test.mjs test/s3c-native-markdown-policy.test.mjs test/s3c-sidebar-safe-file.test.mjs test/s3c-web-markdown-policy.test.mjs
```

依赖固定原始备份、.target-sidebar 构建和 contract-build；缺材料应失败，不得静默跳过。这五项本轮未重新运行；之前安装/UI证据仅因运行源码、lib 和补丁输出逐字节一致而保持适用，不借此宣称新安装或新功能已验收。

两项旧 native-offline-runtime 的 stage2 路径条件测试在新构建树中仍跳过。主项目原 node_modules 仍旧版，不能把直接在主树运行 npm 的结果视为本次固定环境验证；后续继续使用本次新隔离构建副本。旧 stage2 专用测试不是新固定 Home 的肯定证明；新固定 Home 测试已实际通过。跨版本 Desktop 演练由用户排除，仍未验证。

后续回到已批准 API 第 3 片：先核对账户/Workspace/folder 绑定、冻结快照及四字段映射的字段级合同，再进行离线接线。真实 TXT/省略字段接受性、实际上传/生成与费用仍无新许可，不修改后端。
