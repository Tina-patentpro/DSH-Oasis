# 静态安全扫描证据

## 凭据与敏感字段

对`.dsh`、插件`src/lib`、patch、manifest和`scripts`分别搜索：

- `token`
- `api[_-]?key`
- `authorization`
- `secret`
- `password`

五个搜索均退出1且无匹配。该结果证明目标代码和当前构建产物没有这些明文字段；不证明依赖包或未来运行日志永远无敏感信息。

## 用户绝对路径

对可执行代码、测试、Skill和README搜索`C:\Users\TinaD`及`D:\OneDrive`，两项均退出1且无匹配。PRD/审计文档中的证据路径不属于运行时代码。

## 依赖漏洞查询

- 当前配置的`npmmirror`返回`ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`，不能据此判定安全或不安全。
- 使用一次性命令参数`pnpm --config.registry=https://registry.npmjs.org audit --json`后退出0。
- 结果：info/low/moderate/high/critical均为0；150个dev dependencies、39个optional dependencies。
- 原始规范化结果见`pnpm-audit-verified.json`；该快照只代表2026-08-23查询时的公告数据库。

## Loopback烟雾工具

- 非loopback目标`example.com`在读取请求文件前被拒绝，进程退出1，见`smoke-nonloopback.txt`。
- URL probe证明`/api/../settings`会归一化为`/settings`；源码没有endpoint allowlist。
- 源码只校验hostname，不显式限制`http:`/`https:`或验证目标服务确为DSH。
- 由于该脚本仅由开发者显式调用且目标仍限本机，当前按P3防御性缺口处理；接入自动化或处理不可信参数前应升级修复。
