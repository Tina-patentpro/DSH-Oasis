# 第三方通知（MIT）

本候选在编辑方法层使用了 `cn-patent-drafting` 仓库（作者 Huang Xinzhe，Copyright (c) 2026）在 MIT 许可下发布的 `references/` 文档片段。
按 MIT 许可第 2 段要求，**完整许可全文**随附如下（逐字节保留，1090 字节，sha256 `010444fa8759a89fc9b6c9d90ecbd331075f75a487fa09dc6802627f9e12c83d`）。

- 许可文件路径：`oiw-source:0a4d576627fa8db460df`
- 记录提交：`9be95a93c096d682f1a72613725cda990c2ef594`
- 许可全文 sha256：`010444fa8759a89fc9b6c9d90ecbd331075f75a487fa09dc6802627f9e12c83d`
- 独立审计复核：完整 LICENSE 的 1090 字节与本轮随附全文逐字节一致（R03 审计 `MIT_license_exact_raw_match=true`）

## 1 许可全文（verbatim）

```text
MIT License

Copyright (c) 2026 Huang Xinzhe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

## 2 具名片段与拟用位置（7 条）

| 片段 | 源文件 | bytes | 文件 sha256 | 行区间 | 片段 sha256 |
|---|---|---|---|---|---|
| `CAND-CNWRITE-01` | `cn-patent-drafting/references/disclosure-and-application.md` | 8366 | `59352b357c41b77b06da44b60a2562f04b4c2c0435a94615fc1dde9ba1852b82` | 94–116 | `aca70bd98f62136ffcba635d43d6b0cf42c4a7c3bbcc7f931bead1a7e318dbe2` |
| `CAND-CNWRITE-02` | `cn-patent-drafting/references/disclosure-and-application.md` | 8366 | `59352b357c41b77b06da44b60a2562f04b4c2c0435a94615fc1dde9ba1852b82` | 117–138 | `84c4e71152292fdc90bc72e50ae2ebe75a6411f2fc0f51e7d6b43fe0a9fff7c5` |
| `CAND-CNWRITE-03` | `cn-patent-drafting/references/disclosure-and-application.md` | 8366 | `59352b357c41b77b06da44b60a2562f04b4c2c0435a94615fc1dde9ba1852b82` | 162–168 | `fa79e8b5604bf6fcd0ba7a2be58480945e33a87ef38b4ca8a54ff7e0fbaa5b5f` |
| `CAND-CNWRITE-04` | `cn-patent-drafting/references/disclosure-and-application.md` | 8366 | `59352b357c41b77b06da44b60a2562f04b4c2c0435a94615fc1dde9ba1852b82` | 39–43 | `9578d5a3ceebdcbdf2415fbd1880f730a4a9a78e7326405e68d9298d68d69ef8` |
| `CAND-CNWRITE-05` | `cn-patent-drafting/references/intake-and-scan.md` | 3791 | `2001050e3652007e71a9be94f6568cbe55faa49106298ffa75becb36d98c26dd` | 41–47 | `60954197444c0ba2a0c0ecdd5195c42705e4cd464cfb25d63850be2eb3926e10` |
| `CAND-CNWRITE-06` | `cn-patent-drafting/references/intake-and-scan.md` | 3791 | `2001050e3652007e71a9be94f6568cbe55faa49106298ffa75becb36d98c26dd` | 28–39 | `56ded8d6ed016af56a5616934981ab2c882118184c90c0a824fe0b79b019d043` |
| `CAND-CNWRITE-07` | `cn-patent-drafting/references/intake-and-scan.md` | 3791 | `2001050e3652007e71a9be94f6568cbe55faa49106298ffa75becb36d98c26dd` | 14–24 | `9cae5f9d13d83e913eed6caeca2bf5293a6ec7497549a37b85ba804f4fe95159` |

### 2.1 逐片段用途、拟用位置与边界

**CAND-CNWRITE-01**

- 用途：权利要求/说明书结构占位骨架（发明点→权项层级的排布顺序）
- 拟用位置：`business-skill/SKILL.md` §4 S1/S2 的步骤划分；`references/03-n02-claim-graph-and-fallback.md` §2 权项节点表
- 边界：只作占位骨架；**不证明**两部分实质划界，不得据此声称独权/从权边界成立

**CAND-CNWRITE-02**

- 用途：说明书章节结构与支持锚点定位方式
- 拟用位置：`references/04-n03-support-terms-parameters.md` §3.5 参数定位表（说明书位置列）
- 边界：仅语境参考；支持结论必须由官方 3.2.1 逐权项判断得出，不由该结构推出

**CAND-CNWRITE-03**

- 用途：撰写文体与禁用表述（实施例口径、避免无支持程度词、不在正文写工具名）
- 拟用位置：`business-skill/SKILL.md` §4 S4 第 5 点；`references/02-n01-feature-and-independent-claim.md` §B.5 第 5 点
- 边界：只作文体约束；该片段属**说明书文体**语境，不得搬入正式权项造成范围不清

**CAND-CNWRITE-04**

- 用途：缺图时的占位与「不臆造未公开结构」规则
- 拟用位置：`business-skill/SKILL.md` §4 S0 第 4 点；`references/03-n02-claim-graph-and-fallback.md` §3.4
- 边界：只用于缺口登记；占位符不得进入正式交付文本

**CAND-CNWRITE-05**

- 用途：「技术问题—技术手段—技术效果」贯通写法与「要素须有实施例与效果支撑」提示
- 拟用位置：`references/02-n01-feature-and-independent-claim.md` §A.2 第 3 点
- 边界：**不用于**新颖性/创造性/实用性结论；该片段含可专利性启发式，本候选只取技术三要素贯通口径

**CAND-CNWRITE-06**

- 用途：发明点提取表字段（问题/手段/效果/证据/权项类型/缺口/风险）
- 拟用位置：`references/02-n01-feature-and-independent-claim.md` §A.1 输入项与 §A.3 输出表
- 边界：字段作记录骨架；不得把「风险」栏写成法律结论

**CAND-CNWRITE-07**

- 用途：材料证据优先级（专利笔记→设计/论文→代码/配置→产品文档→原始图表）
- 拟用位置：`business-skill/SKILL.md` §4 S0 第 3 点；`references/02-n01-feature-and-independent-claim.md` §A.1 第 2 项
- 边界：只用于确定锚点优先次序；不改变八输入边界，不把非输入材料当技术来源

## 3 使用方式声明

1. 本候选对上述片段作**改写使用**（中文化、结构化、按 M06 需求裁剪），未逐字复制片段长文本进入 `SKILL.md` 或 `references/`；`LICENSE` 全文按许可要求逐字节随附于本文件。
2. **MIT 不证明法律正确性**，不授予专利实施权，不覆盖六载体（CLM/CHAIN/TMPL/CLAIM_FAILURES/BODY/DX06）内容，不覆盖样例代码之外的排版与商标。
3. 六载体 UID 不进入任何 MIT 片段列；六载体许可仍 `PENDING`。
4. 若本包被再分发，必须同时随附本文件（含 LICENSE 全文）；删除或截断许可全文即违反 MIT 第 2 段。
5. 本候选**未**使用 MIT 之外的任何第三方代码或文档；未引入依赖、未新增运行脚本。
