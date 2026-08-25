# 第二周第一批与第二批全面审计状态卡

日期：2026-08-25

## 目标合同

- 审计对象：第二周第一批（Domain、Repository、Host loopback RPC、Host 生命周期）与第二批（Client remote/model/store、hydrate、串行保存、冲突与错误 UI）。
- 审计基线：`docs/plans/2026-08-25-week2-design.md`、`docs/plans/2026-08-25-week2-implementation.md`、本机 DSH `0.1.1-rc.2` 合同与当前工作树。
- 排除项：Dify、收费管理、专业生成服务、材料正文、产物下载、项目文件写回、第三周功能。
- 变更边界：不修改产品源码、不暂存、不提交、不重置；只新增本审计证据与报告；真实 `C:\Users\TinaD\.dsh` 只读。
- 证明分层：静态审查、本地单测、构建、打包、真实 Host 重启、浏览器、生产分别报告，不相互替代。

## 验收门槛

1. findings-first，P0/P1/P2/P3 分级并给出可复核文件与行号。
2. 第一批和第二批合同、实现、测试、分发及证据均完成双向追踪。
3. fresh frozen/offline install、build、全包 tests、pack dry-run 均有本轮新证据。
4. 禁止项扫描覆盖 `localStorage`、非法 `details` Slot、业务状态进入工具输出、真实 Profile 写入。
5. 真实 Profile 前后强基线无差异；link/reparse 只记录自身及目标文本，不跟随目标。
6. 无本地可行动 P0-P2 才建议进入隔离 Host 重启与浏览器 E2E；未执行该层时不得关闭第二周。

## 当前状态

- V4.1 最终状态：`FAIL`。
- Findings：P0 0、P1 0、P2 2、P3 2。
- 已知证据缺口：原 Task 5 的隔离 Host 重启与浏览器 E2E 尚未执行。

## 证据台账

| 证据 | 目的 | 状态 |
|---|---|---|
| `baseline/product-hashes-before.tsv` | 当前产品、测试、合同和既有证据强基线 | 完成：107 项 |
| `baseline/profile-hashes-before.tsv` | 真实 Profile 只读前基线 | 完成：664 项、530 link |
| `review/*` | 第一/二批静态审查与需求追踪 | 完成 |
| `verification/*` | fresh install/build/test/pack/扫描 | 完成；另有 1 个预期失败负向探针 |
| `baseline/*-after.tsv` | 审计后源文件与真实 Profile 对比 | 完成：两组均相同 |
| `docs/第二周-第一二批全面审计报告.md` | findings-first 结论 | 完成 |

## 停止条件

- 真实 Profile 哈希或 link 目标文本发生变化；
- 审计命令要求真实 Profile 安装、写入或清理；
- 需要修改、覆盖、暂存、提交或重置现有产品文件；
- 验证扩展到 Dify、收费管理或第三周功能；
- 本轮 fresh 验证结果与既有证据矛盾且尚未定位原因。
