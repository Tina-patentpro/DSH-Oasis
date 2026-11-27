# M06结构修订最小实施方案 R1

> 执行者使用 executing-plans，单代理。接续既定项目R2/P3；不新增界面、真实生成或发布。具体实现选择由Codex在该范围内决定，不补造用户设计签收。

**Goal:** 通过现有 result/edit 公共接口，将已审阅的正文和T2/T4建议形成新的不可变产品revision，保全原版、来源与12条警示，随后重新审核/无覆盖保存/固定引用及离线重读；专业/用户接受另列。

**Architecture:** `v340-runtime-contract.js`增加可选m06Structure；`v340-document.js`仅替换已存在的T2/T4行、留下before/after与来源历史；`v340-result-service.js`从run冻结输入恢复材料，不从请求或当前磁盘取得权威原文。原正文编辑行为保持。无新UI、通用编辑器、存储迁移或模型接口。

**Tech Stack:** 当前Node24.21.0、既有Zod/JSON与工作区repository/writeback/RPC。固定依赖、客户端构建及原资源不改。

**Spec:** 项目总结R2/P3、原修订建议R1/source-map/inherited-warnings与本次preflight；MC01回退待论证，MC02只回填已有延伸属性，MC03保留出处与充分支持的区别。

## Global Constraints

- m06Structure包含schemaVersion=1、reason、replacements。每行指定table=T2|T4、rowId、beforeSha256、完整data及sources；sources为inputId/sourceSha256/quote/start/end，按UTF-16定位冻结正文，不接受user_input等指令当材料。
- 仅Flow-2-6、同时明确给T2/T4的现有行替换；拒绝新增/删除、重复行、错旧hash、错/越界quote和缺失来源。单次最多16行、每行16来源、整体64KiB；沿原结果容量限制原子拒绝。
- 父版本hash、expectedRevision、草稿hash、requestKey保持；幂等判断同时绑定结构编辑hash，重复key但结构不同拒绝。
- 所有旧warnings原对象保留，新增人工未核提示；原输入、其他表、正文/表格before及旧审核不改，新版本not-reviewed/not_recommended_for_filing。
- 本轮只在新隔离repository使用公开样本的源记录副本，通过公共服务/RPC操作；不手写原活跃快照，不调用原App，零生成App的写入拒绝不放开。
- 本轮不提交、推送或发布；新源码不替换已冻结c07f/db673f66安装候选，源码/归档/安装的版本证据分开。

## Review Focus

1. 相同requestKey不同结构被静默当同一请求：单独冲突负例。
2. quote在错误输入/指令里命中，或UTF-16范围错位：冻结材料与位置负例。
3. 替换一张表或加删行形成伪同步：强制两表、指定已存在行；语义仍人工复核。
4. 内容修订继承旧approved或删警示：新版本默认未审，12原警示逐对象验证。
5. 旧输入压缩编码、容量和冲突失败破坏草稿/原稿：restoreV340Prepared、事务及定向回归。

## Task 1：合同、文档边界与公共服务

- [x] 先写结构修订成功、非法来源/行/hash、幂等冲突与失败原子性的测试；RED应显示可选合同未支持或表格未更新。
- [x] 在上述三个现有文件最小实现；不改变现有无结构参数的编辑语义。
- [x] 运行新测试及既有v340-workflow/results/native-zero受影响测试，确认GREEN；记录准确命令与出口。

## Task 2：公开R2原件的离线产品链与审阅包

- [x] 原始business record只读复制到新隔离storageDomain，registry绑定新scratch；核父稿和输入hash。
- [x] 准备只回填原延伸属性的新正文、T2/T4行及准确来源；通过原RPC草稿→edit→未审拒绝保存→明确工程review→prepare/commit-save→固定引用→repository关闭重开。
- [x] 逐项核原父版/12警示/其他表/源文件保全，以及MC01/02/03处置，提供具名专业/用户待审包；不代签专业接受。
- [x] 新源码另版离线pack并核成员；旧源码归档/安装不覆盖。更新原current_entry并做单代理技术自审和原件保全检查。

任务接口：Task1产生可选m06Structure与持久化revision；Task2消费它并产出准确版本/文件hash。原App运行验证与此离线链分别保留，不用Task2替代P2。

工程任务记录：上述实现、离线验证与待审包已交；专业/用户接受未取得，P3整体接受与全goal不标完成。
