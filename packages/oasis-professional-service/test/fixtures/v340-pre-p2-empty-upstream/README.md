# 修复前空前序运行记录（合成夹具）

这三份JSON逐字保留2026-10-22审计中由修复前真实准备/运行/仓库模块生成的磁盘记录，供`test/v340-legacy-upstream.test.mjs`长期回归使用。没有真实用户数据、凭据或外部请求；每份均混存旧approved审核、原输入/产物hash及Markdown/JSON双文件保存回执。运行状态分别为prepared、unknown、failed，空前序正文与其SHA256保持原值，不经当前代码重算或修正。

来源为仓库根目录下忽略的`.local/stage5-p2-reaudit-20261022/legacy-{status}.json`，生成步骤见`docs/evidence/2026-10-22-stage5-p2-runtime-reaudit.md`。原探针实际读取0字节`empty.md`，旧代码允许带structure警示的前序快照。prepared记录是旧所有者关闭前的崩溃映像；先关闭旧所有者，再交给新仓库，不存在并发写入。

| 文件 | 原字节SHA256 |
| --- | --- |
| prepared.json | fbd2cf8670ce61154fd3610ce213ec20e52f9dfa786c22a908de81325ec3a781 |
| unknown.json | cafd505716a164715c7e9f0103eb38967fb340bd69ba9b7a983b70e7da142b3d |
| failed.json | 0f83d8725d776e51bafbf279180fdf9abe04ffb3c1e6b0778e2ba87f8d7e0979 |

生成器8个模块的原源码均与前轮修复前冻结清单匹配；私有副本仅改写导入路径以独立运行，原源码身份如下：

| 模块 | 修复前原源码SHA256 |
| --- | --- |
| v340-runtime-service.js | d7110977526310774aa56c89a74e4decc891887190c97a24fbd53c8f8edb18e1 |
| v340-document.js | 0d1dfd36972225e8797024cf8af45788eec670cda19bbec4e6dff884fd0e5bba |
| v340-runtime-contract.js | df067dfe49ea411207842a5934ea3338ae52a7178ef2096defa589c868fc105e |
| workbench-domain.js | 8dea28170ba1dea9e2a143108e88a234df1a40a6eec510d94ad6be8cb7f80331 |
| workbench-repository.js | dd70348151a5dd0ad7997521e834d79b79df02245314928e798a0aba98dc867f |
| workbench-contract.js | 62d11bcf3f132222e04fc5b8378356f9fc8d55c92699905f06ea43ceadb7c359 |
| v340-preparation.js | fafb6cd0842f578246842828e57ee3fb3ee7a2906055fccf1dda5868ef865572 |
| v340-runtime-integrity.js | b36788aaea95fa796355c618c660c57858f1d35121fcfe6e890701032ba97ee8 |

正式测试只依赖本目录及仓库现有源码/依赖，不依赖忽略目录或旧生成器，且只写临时测试目录。
