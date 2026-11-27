# 0.1.0-rc.1旁置隔离安装及同版离线核对 R1

2026-11-07，Asia/Shanghai；Codex单代理。用户本轮明确要求旁置安装、同版离线核对、保留旧安装与历史，暂不启动应用、真实调用或发布。按[EXEC-R2](preflight.json)和R3-02/RL06执行；不将安装准备记为R3-03原生验收。

| 对象 | 本轮准确身份 |
|---|---|
| 业务包 | oasis-professional-service 0.1.0-rc.1 / private=true；123成员 |
| 归档SHA256 | `a7cf9a5dd59db1da2c7fe34fb4eac413c3dbb0d2baad7ab88147c7bfaab63bc3`，复用原包，未重建/重包 |
| 新bundle SHA256 | `061d3e6eb6dafb6183f0f1b3e85255010ddc741360913db997f93b17df701c9c` |
| 新安装根 | `/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.dsh-test/m06-public-installed-20261107-r1` |
| 固定组合 | Desktop2.0.17 / DSH0.2.0-rc.2 / Sidebar0.24.1 / Cordis4.0.4 / Node24.21.0 / pnpm11.8.0 / checkpoint3 |
| 公开资源 | 0.1.3-public.1；e06aa152容器/254a685f manifest，原pin不变 |

[同版安装配对](../../release/m06-public-0.1.0-rc.1/installation-r1.json)附7个实际组件与安装身份；新宿主组合仅供本地隔离使用，不把签名App和依赖树列为已许可公开分发。

## 安装器适配及实际命令

先完整核验原7aca55e9载荷，[base-verify-command.json](base-verify-command.json)exit0。新载荷将c3换成原123成员，保留固定宿主字节；新零策略仅绑定本次归档hash，index/RPC两个guard原字节、零预算及停用插件清单保持。

旧安装器把业务版本固定为0.0.1，使用新包时[RED校验](controller-version-red-command.json)准确拒绝：`installed component version policy mismatch`。原controller/未适配manifest完整字节另存，未修改旧安装器。仅在新副本把该一处业务版本literal固定为0.1.0-rc.1，见[准确diff](controller-version.diff)，没有改其他版本/guard/lease/接受范围。[GREEN校验](controller-version-green-command.json)exit0，接受新准确组合并拒绝错误manifest身份。

相对原bundle，7件修改、6件新增、23件移除；仅c3、profile-template归档绑定及独立控制器，其他27,158文件与14链接原样保留。23件移除对应旧20兼容资源、2混合原容器和API基线；它们只在新组合中排除，旧安装保留。完整列表见[installation-spec.json](installation-spec.json)。

[实际安装](install-command.json)exit0：只在新根调用既有固定安装逻辑，签名App核验、pnpm11.8.0离线/冻结/忽略脚本物化和官方本地配置准备均完成；未启动App/Host，没有手写依赖元数据，没有复制旧Profile或认证，也未升级依赖。

## 本轮离线结果

- [新根自身controller --check](controller-check-command.json)exit0，程序/快照/当前Profile、控制器与门禁身份匹配；`outerInstallerReleaseAccepted=false`及`arbitraryLegacyWriterEnforced=false`保持原限定。
- [123成员安装核对](installed-member-inspection.json)逐字等于a7cf9a5d归档，7个Profile组件均realpath到新release；业务版本为0.1.0-rc.1，MIT/许可及公开资源原字节保持。
- [实际安装模块/规格检查](installed-import-and-spec-command.json)exit0：从新安装位置导入公开加载器、受控Host模块（不调用apply），公开资源指纹和Zod4.4.3解析正确。只构造withInstalledLaunchSpec回调，核HOME/DSH_HOME与Profile/release双锚点、零预算和零生成环境，不执行exe；双writer锁释放，provider事务释放后可复取，无业务JSON或启动回执。
- [实际安装编译客户端](compiled-client-smoke-command.json)exit0；51自有map源码逐字等于安装物，17件Zod与MIT配对，扩展注册RPC0。仅VM内惰性边界注入，没有DOM/App/Host启动或原生视觉验收。
- 原142项归档离线检查以完全相同的包hash和123成员复用；只新增安装/解析/锁与控制器版本差异核对，不重复构建、pack、合成生成或旧UNKNOWN场景。

## 历史、范围和下一接点

[旧安装前](old-installed-before.json)与[旧安装后](old-installed-after.json)证明原134＋140成员共274件及各原安装身份未变；UNKNOWN、受限固定稿、R3、原采用文本/范围、审阅ZIP和旧bundle等在[保全核对](protected-after.json)保持原字节。未读取/迁移日常Profile或认证，未将旧原生/专业/用户接受移授新组合。

读取与当前来源：根AGENTS/协同全文、本项目原约束、登记与整体/项目followup解析、BM1/角色/S1/S2/G1的适用章节、当前入口、R3-02/03及完整现控制器，绑定38项输入；未展开的历史/其他接口只核身份，见preflight。不创建新worktree/目标、不提交/推送、不使用子代理、不删除历史；作者自审，不称独立接受。

**本轮状态：旁置隔离安装与同版离线核对完成，应用未启动。** 新根原生启停/界面、升级恢复及真实业务仍未验，独立法律专业复核未取得；没有模型/API/上传/费用、WorkBuddy导入/投递、提交/推送/部署或发布。下一接点仍按本组合另行明确授权，本轮不发起启动或调用许可请求。最终命令/保全/状态见[verification.json](verification.json)。
