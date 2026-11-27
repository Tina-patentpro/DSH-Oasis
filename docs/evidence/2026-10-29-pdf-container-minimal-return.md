# PDF最小隔离试验结果

2026-10-29，Asia/Shanghai；单代理作者自查。用户先批准本地Colima/Docker试验，随后要求“简化实验”；本轮以两个用例结束，不扩展测试矩阵。执行前记录见[preflight](2026-10-29-pdf-container-spike-preflight.json)。

| 用例 | 实际结果 |
|---|---|
| 公开两页PDF文字提取 | exit0，约0.54秒；2884字节原件提取74字节/48 UTF-16码元正文，raw/text哈希与固定公开样本相同 |
| 256MiB下申请384MiB native内存 | exit137，约0.15秒；Docker记录OOMKilled=true |

两用例均实际配置Memory=MemorySwap=268435456、network=none、根文件系统只读、无bind挂载、pids-limit=1、cap-drop=ALL、no-new-privileges；临时目录为8MiB tmpfs。原始输入/容器身份、参数、退出及输出见[两项实际结果](2026-10-29-pdf-container-two-cases.json)。约0.54/0.15秒包含SSH与Docker调用开销，只约束该小样本，不代表最大输入或完整期限验收。

实际运行栈为Docker29.7.0、Lima2.2.1、官方Alpine3.23.4的本地临时Python3.12.13镜像、已固定pypdf6.10.0。没有改原DSH固定组合或原Python候选。两个容器已移除，VM已正常停止；新试验文件及冷磁盘保留，结束可用空间约887MiB，比起始少约1.47GiB。

明确保留两次环境失败：Colima0.10.3声明的Ubuntu镜像通过发布方SHA256/SHA512，但派生raw触及768MiB磁盘保护线，未启动Colima VM。只退休本轮未完成派生raw，原压缩下载、失败元数据和旧原件保留。低空间子路径改用同套Lima官方Alpine模板，**不记作Colima完整启动通过**。Docker Hub拉取遇证书域名不匹配，未绕过TLS；改用已有VM公开运行库构建本地镜像，未复制home/root/var/opt或认证。主机Docker socket未接通，实际两个用例通过VM内Docker执行，未把host socket算通过。

**本轮只验证了公开PDF提取及一次超内存终止。** 严格运行时文件读取白名单、严格no-exec syscall、完整PDF对象/XRef/过滤器与聚合解码限额、恶意输出/取消回收、DOCX、来源/通知与发行、Host接线及新旧编码均未验；tmpfs/noexec等参数不冒充完整no-exec证明。U1/D1不关闭，也没有确定容器为正式产品必装依赖。

新版Flow-2-6继续沿[现服务与Profile核对](2026-10-29-pdf-docx-g0-unblock-r2-return.md)：现F已装M06受控入口，真实提供方为零调用候选禁用；新版远程八输入/七输出/权威归属合同仍缺。此次无业务模型/API生成、材料外传或费用，不用本试验替代双来源及专业/用户验收，G0仍OPEN。

保全与结果核对见[验证记录](2026-10-29-pdf-container-minimal-verification.json)。未修改产品源码、锁、pin、日常DSH或已有Profile；无提交、推送、发布或外部投递。本报告不称独立审计。
