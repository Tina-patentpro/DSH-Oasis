# 供应链干净恢复与旧Windows测试Mac适配收口

日期：2026-10-21。依据[执行清单](../plans/2026-10-21-supply-chain-mac-tests.md)，完成不依赖Desktop2.0.17恢复件的F5与3份旧测试适配。单代理执行/复审，根目录 `/Users/tinadong7036/Documents/开发项目/dsh-lab`，分支 `mac/continuity-v2`，HEAD保持 `84c0cc5bd103a1860e2490494f3f50a1be8404d1`。

**裁定：F5主包供应链校验及旁置干净恢复在本轮关闭；3份旧Windows安全测试已绑定固定Mac输入并全部执行通过。主包活跃树与干净树均903通过/2历史跳过，Mac安全与启动26/26通过、0跳过。本轮复审未发现新增P1/P2。Desktop准入仍拒绝漂移，F1/R6/实际安装包及发行验收继续未完成。**

没有修改产品源码、主包manifest/lock、lib、活跃依赖、Profile、已安装应用、准入或远端。改动仅为4份测试、新增测试输入助手和文档/状态。前轮P1修复、阶段5及原设计/运行证据保持。未真实生成、上传、认证、发送对话、提交/推送或发布。

## 一 F5：取得完整校验终态与干净恢复证据

原45秒尝试虽形成包目录，但无校验终态，旧失败/超时及“未关闭”报告均保留。本轮在全新 `.local/supply-mac-20261021/clean/packages/oasis-professional-service/` 复制原manifest/lock，用固定Node24.21.0、pnpm11.8.0及私有HOME/cache执行：

```text
pnpm install --offline --frozen-lockfile --ignore-scripts
  --config.manage-package-manager-versions=false
  --config.optimistic-repeat-install=false
  --store-dir=<原固定.local/pnpm-store>
  --fetch-retries=0 --fetch-timeout=10000 --reporter=ndjson
```

使用空user/global npm配置与无秘密环境，仅对官方registry元数据开放直连，其他代理仍阻断。没有复制活跃node_modules，没有新版本解析或包体下载。固定pnpm实际实现表明：锁校验可与物化并行，并在最后等待完成；目录/summary先出现不能代替成功回执。

本轮 `pnpm:lockfile-verification` 明确记录started→done、136项、2897ms，安装完整退出0（3.43秒）。机器生成的lockfile-verified回执记录：

```json
{
  "tarballUrlBinding": true,
  "minimumReleaseAge": 1440,
  "minimumReleaseAgeExclude": [],
  "trustPolicy": null,
  "trustPolicyExclude": [],
  "resolutionShapeCheck": true,
  "dependencyAliasCheck": true
}
```

这与本次主包实际有效政策一致，没有关闭校验、增加排除项或启用trust-lockfile。trustPolicy原为null，本轮不宣称执行了未启用的no-downgrade规则，也不把该校验等同于漏洞数据库审计。

验证不止退出码：

- 主包锁SHA256保持 `903575be3f84c6b60e716a7ef7980efdb6f024af4e62982319261d1db27a18f9`，干净副本与原件逐字相同。
- 92个物化包复用固定store；主包fetched事件0，包体下载0。
- 活跃树与干净树的2737份依赖包体文件逐字相同；仅生成的链接、shims与pnpm元数据不作为跨目录相等要求。`pnpm store status`退出0并报告Packages in the store are untouched。
- 干净树固定构建退出0，client.js与活跃已审产物逐字相等；全量905项903通过、2历史跳过；pack退出0、114成员，无测试、node_modules、工具、运行、认证或归档成员。
- 反向控制仅在新的临时锁副本给cordis-plugin-group@1.0.4加入伪tarball地址，校验136项后明确failed，并以 `ERR_PNPM_TARBALL_URL_MISMATCH` 退出1；原锁不动。这证明不能靠物化目录存在或复用成功cache绕过绑定检查。

原始证据：clean-install.ndjson/result.json、cache/pnpm/lockfile-verified.jsonl、clean-integrity.json、fixed-store-status.log、policy-negative.ndjson/result.json、clean-build.log、clean-final-tests.log、clean-pack.log。完整argv、cwd、环境边界与时间均保留本地账本，不只记录摘要。

## 二 3份测试：固定Mac组件与独立测试依赖

### 输入绑定与依赖漂移隔离

新增[Mac输入助手](/Users/tinadong7036/Documents/开发项目/dsh-lab/tests/helpers/mac-component-inputs.mjs)，路径由import.meta.url定位，不依赖cwd或扫描最高版本；先核对当前批准Mac组件的package.json、固定版本及入口文件SHA256，再读取实际代码。只检查本测试组件子集，不绕过或重写整套Desktop准入。

固定组件仍是原批准的UI/Web `0.2.0-rc.2.oasis-mac.1` 和Sidebar `0.24.1`。核验的12项组件/补丁pin均未改变。未知组件、字节漂移、缺件及支持模块漂移的4个负向检查均明确拒绝，只修改临时复制件，没有让测试跳过。

原UI目录node_modules链接指向现已升级的应用，其中workspace-path已为0.2.1-rc.2，且react-dom/server缺失。直接使用它会把新应用依赖带进旧固定组件测试。因此本轮没有修写该链接，也没有把2.0.18依赖作为目标组合证据。

为原生Markdown完整富文本断言单独恢复测试依赖：

- 官方tag `dsh-v0.2.0-rc.2` 指向[提交639ed015397290b3745d163aafe02ffee4aa3f84](https://github.com/deepseek-ai/deepseek-harness/tree/639ed015397290b3745d163aafe02ffee4aa3f84)，只在 `.local/test-runtimes/dsh-0.2.0-rc.2-639ed015/` 解包。下载归档SHA256为 `bbc09e888e1df3aa37be049abdb7720951e76442d21e5432365d87a465d628f1`；原上游锁SHA256为 `80fe05eae33582ae26839afd05f1965f9b0e4be11034ddf9797af6085d5ba9b1`。
- 固定pnpm、冻结上游锁、忽略生命周期/pnpmfile并禁止自动下载包管理器，过滤ui-primitives依赖；测试专用store与主包store分开。这个测试夹具允许官方registry固定包体下载，首次fetched事件786、added787；**不能将主包下载0扩大为本轮全程下载0**。
- 上游workspace自带年龄排除项，首次回执按原配置完成。审计后在测试副本收紧为minimumReleaseAgeExclude=[]，再次验证1685项done（5553ms）、退出0，后次fetched0；固定上游锁未变。最终测试夹具政策也无年龄排除。原配置/首次及严格回执全部保留。
- 仅用固定tsdown构建同一提交的client/store、util/code-language、util/workspace-path三个支持库；不构建/启动Desktop。输入助手校验上游锁与三个输出hash。原生测试通过标准ESM解析，将固定UI入口的裸依赖定向到这一冻结夹具，真实路径不得逃出夹具；React/ReactDOM明确18.3.1。

测试依赖不会随测试自动安装或联网。路径、原件及重放方式见[开发布局说明](../development-layout.md)。它是可保留的忽略测试夹具，不进入产品包或Profile，不是新的候选发行组合。

### 保留及补齐的断言

| 文件 | 本轮适配与实际验证 |
| --- | --- |
| [native-markdown-policy](/Users/tinadong7036/Documents/开发项目/dsh-lab/tests/native-markdown-policy.test.mjs) | 加载真实固定补丁MarkdownText与真实React SSR；保留inline/reference图片抑制、streaming、标题/粗体/GFM表格、HTML惰性、默认图片支持和resourcePolicyVersion断言；3/3 |
| [sidebar-safe-file](/Users/tinadong7036/Documents/开发项目/dsh-lab/tests/sidebar-safe-file.test.mjs) | 读取固定0.24.1 bundle；测试VM继续只暴露内部函数，不改产品。按该版实际bottomSplits替换旧splits字段，使用POSIX样例路径；保留安全/普通预览不混用、重复打开去重、序列化meta及跨session拒绝；1/1 |
| [web-markdown-policy](/Users/tinadong7036/Documents/开发项目/dsh-lab/tests/web-markdown-policy.test.mjs) | 固定rc.2补丁/bundle；实际inline/reference函数都传递安全context；安全streaming清缓存并转settled、block/footnote共同策略、能力标记及拒绝未知/重复补丁；3/3 |
| [macos-safe-preview](/Users/tinadong7036/Documents/开发项目/dsh-lab/tests/macos-safe-preview.test.mjs) | 移除旧应用版本读取和恒false的patchedMode；用主包缓存中精确上游6b551f…原文重放当前patch，输出与准入Mac组件逐字相等；原4项及重放1项全部运行，原1项跳过已补齐 |

3份旧测试合计7/7；从根目录和主包cwd都执行通过。连同启动器14项及Mac安全预览5项，最终26/26、0跳过。native实际渲染断言没有替换为自制渲染器；CSS模块沿用原测试的空样式加载，不冒充视觉或Desktop验收。

## 三 失败保留、复审及边界

旧3文件装载失败的红测保留。适配过程中保留了：Sidebar旧splits字段不符；原生依赖错误落到升级应用；require条件将simple-icons解成CJS导致命名导入失败。最后使用冻结夹具、正确ESM条件及当前固定Sidebar状态合同，未删除业务断言取得通过。

干净树首轮缺外围测试输入，出现5个失败；补开发skill、oasis-rd-intake原文件及空的合成隔离home后，全量905通过。这个home只是合成路径合同的空目录，没有复制Profile、认证、运行数据或创建真实Host。后续没有修改产品门禁或建假真实运行回执。包构建所需metadata始终由固定pnpm生成。

native-runtime-install-result.json的首版包装器network字段沿用“metadata only”模板，不准确；原件保留，native-runtime-install-clarification.json明确该测试夹具实际下载源归档及包体，最终严格回执标签已纠正。负向控制的首个准备脚本误以为原锁有tarball字段而失败；改为仅在临时锁添加该字段后取得真实绑定拒绝，两个失败均有记录，不计为成功。

单代理复审覆盖固定输入/缺件拒绝、主包政策及反向控制、测试依赖与升级应用隔离、三项支持库身份、真实富文本/安全图片、Sidebar去重/归属和干净树构建/包体。未发现本次范围新增P1/P2。主包活跃树再次905总计、903通过/2跳过，与干净树一致，前轮两项P1回归保持。

本轮起点3249项文件冻结：除4份测试及报告后追加的布局/状态文档外，原版本控制范围文件保持；新helper/计划/报告单列。主包及P1/阶段5源、测试、编译产物均未改动，原12项Mac组件/补丁pin保持。状态只前置摘要，保留旧完整后缀及CRLF。没有重算准入或签名应用指纹。

更新状态：F5和3份旧测试装载缺口在上述范围关闭；F1、R6、Desktop交互/正常重启及发行仍阻塞。主包2项历史跳过仍依赖旧stage2-desktop真实离线运行材料，不能用这次UI测试夹具替代。此前F3/F4代码/组件通过仍保持Desktop待验，不因本轮恢复依赖而自动升级为宿主验收通过。

全部原始日志与机器摘要保留 `.local/supply-mac-20261021/`；没有Git提交/推送、远端变更或真实模型/API调用。
