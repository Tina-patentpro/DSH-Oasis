# S3C 归档完整性门禁与开发包调整

当前目标状态：BLOCKED_WAITING_FOR_USER。开发已正常退出且原启动器 --check 退出0；未安装Markdown归档，原EXE/ASAR/pin未改。原“只替换ASAR、不改EXE”范围不能满足实际完整性要求。

## 只读事实

- EXE SHA256 c48b36342907d286a47c000e8c569462cc0daceb92aaae03f98ee6f5a04cd318；Fuse V1，9位101111011。EnableEmbeddedAsarIntegrityValidation与OnlyLoadAppFromAsar均为1。
- Windows Integrity / ElectronAsar资源指向 resources\app.asar，SHA256值2cbfa4739f6bc2a877a15761d23ec134c922ffa7c8dd818b5a04a90d0d5063b3，与原归档JSON header一致。
- Get-AuthenticodeSignature返回NotSigned（Status2）。现有开发EXE本身未签名，不可宣传为签名发行包。
- 证据：候选evidence\s3c-fuses-readonly-20260915.json及s3c-integrity-resource-20260915.json。Fuse解析初始误以版本字节为ASCII，读取官方实现后按数值1修正；随后安全断言明确因校验已启用而退出1。未执行修改Fuse。

来源：[Electron ASAR Integrity](https://www.electronjs.org/docs/latest/tutorial/asar-integrity)、[官方Fuse字节读取](https://raw.githubusercontent.com/electron/fuses/main/src/index.ts)、[选项索引](https://raw.githubusercontent.com/electron/fuses/main/src/config.ts)。启用情况下必须随包提供匹配的header哈希；不能通过关闭Fuse或改成展开目录规避。

## 建议的最小范围扩展（待批准）

1. 仅在新的 D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\delivery-s3c-integrity-pair-20260915 中复制原开发EXE，保留旧包。
2. 用Windows资源更新接口或已有等价打包工具，仅将副本Integrity/ElectronAsar资源中目标ASAR的value改成已验证新归档JSON header SHA256。不改文件路径/算法、图标、版本、其他资源、代码节或Fuse。不得关闭校验，不使用用户签名凭据，不新增下载安装工具。工具不可用则停止。
3. 读取回验EXE全部资源，除目标资源外相同；PE代码节与非资源节内容相同，允许资源布局与相应PE尺寸/校验和随标准资源更新变化；Fuse全部位逐字节不变，签名状态仍准确记录为未签名。归档22094成员再次复核；仅已批准两个Markdown成员内容变化。
4. 正常退出态重新确认，创建新的完整用户态备份并额外备份原EXE/ASAR及pins。日常新基线只读对比；任何漂移停止。
5. 仅将开发EXE与ASAR作为同一组合安装，更新candidate-pin中对应两项哈希。锁住启动、失败保留锁并仅恢复可证为本次写入的字节，不覆盖未知修改。不得在只替换一个文件时启动。
6. 完整pins/其他数据保全校验后通过原启动器重开，核对renderer healthy、A审核产物不变。由用户检查富Markdown标题/表格，并另取得资源不自动加载及普通查看器回归证据。没有这些证据不宣称S3完整通过。

影响仅开发候选本地EXE资源及ASAR/pins；日常DSH、全局CLI、Profile依赖、业务源码、网络生成和发布均不在范围内。替代方案是保留当前已通过的纯文本预览，暂不安装富预览补丁。
