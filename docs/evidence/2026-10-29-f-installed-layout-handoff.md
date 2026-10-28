# F离线安装候选操作交接

本交接只适用于[执行返回](2026-10-29-f-installed-layout-return.md)及其精确执行单。完整F保持开放。当前可审对象是R3随包入口子集，不授权日常安装、认证迁移、真实调用、推送或发布。

入口为安装包`payload/node/bin/node`及`payload/controller/scripts/f-installed-runtime.mjs`；完成安装后使用安装根`control/node`和`control/scripts/f-installed-runtime.mjs`。CLI参数按独立argv传入，路径含空格/引号时不要拼接为shell代码。

| 操作 | controller参数顺序 |
|---|---|
| 全新旁置安装 | `--install bundle manifestSHA256 absentRoot` |
| 只读准入检查 | `--check root` |
| 持锁启动固定Desktop | `--start root` |
| 同根升级 | `--upgrade root bundle manifestSHA256 expectedCurrent` |
| 明确已知版本回退 | `--rollback root targetReleaseSHA256 expectedCurrent` |

受控SDK/恢复调用通过同一controller导出的`withInstalledWriter(root, role, callback)`，role只取sdk/recovery等声明值；callback获得此次租约环境和准确home，传给随包provider。环境中的nonce是协作租约，不是凭据，不写普通日志，不跨租约复用。未受控旧SDK不可作为该入口的替代。

只接收明确固定source2 release构建的包。整包hash、组件版本/关闭模型策略、controller与gate、实际物化路径及签名App在准入检查中绑定；文件变化不能仅重算expected hash绕过旧批准。旧包回执不可覆盖，失败候选和日志保留。

安装根data贯穿自有版本切换，回退不恢复旧业务JSON/IDB，不丢升级后编辑。已有根不能重新install；busy/遗留锁、错误current、别名/链接、源漂移或RECOVERY_REQUIRED均应停止受影响写入。没有自动删锁、重装、回退数据或重派UNKNOWN命令。需要修复时先保全准确根、current、回执、日志和公开/授权数据，按新有界方案处理。

本候选未提供自有签名外层安装器、系统安装入口或上游自动更新。官方App签名只证明原App完整性，不代表其维护方接受我们的组合。最终分发/许可、跨平台与真实业务接受另核。
