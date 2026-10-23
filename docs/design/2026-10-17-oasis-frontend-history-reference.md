# 历史导航源码参考核对

日期：2026-10-17。范围：只读参考原前端，为阶段4视觉样品提供依据；不运行或移植原前端。

## 来源与访问证据

用户截图确认私有仓库 `Tina-patentpro/oasis-frontend`。已通过用户现有登录的 Chrome 页面读取源码；页面显示提交 `9c287d212cc6edf22ed2a1684d09cdb17574d025`（Initial sanitized source snapshot）。GitHub 插件已登录 Tina-patentpro，但此前目标仓库返回404；浏览器成功读取源码不等于插件授权范围已修复。无需用户再次提供仓库路径。

## 已核对的结构

- [ManagementSection.tsx](https://github.com/Tina-patentpro/oasis-frontend/blob/9c287d212cc6edf22ed2a1684d09cdb17574d025/src/components/workspace/left-sidebar/ManagementSection.tsx)：共享搜索框“搜索项目或会话”；“独立会话历史”和“项目管理”两个互斥切换页。说明明确独立会话是未关联项目的会话。
- [management/tabs.tsx](https://github.com/Tina-patentpro/oasis-frontend/blob/9c287d212cc6edf22ed2a1684d09cdb17574d025/src/components/workspace/left-sidebar/management/tabs.tsx)：独立会话单独列表；项目页有“进行中/已归档”筛选，项目列表、项目内会话及子项目分别加载/分页。
- [management/ProjectCard.tsx](https://github.com/Tina-patentpro/oasis-frontend/blob/9c287d212cc6edf22ed2a1684d09cdb17574d025/src/components/workspace/left-sidebar/management/ProjectCard.tsx)：项目卡片显示名称、客户、会话数和子项目数；选择项目与展开项目是项目操作，具体会话行才是会话入口。展开区先列项目会话，再列子项目摘要。当前代码中的子项目摘要并非递归展开树，不能据此声称任意层级导航已实现。
- [LeftSidebar.tsx](https://github.com/Tina-patentpro/oasis-frontend/blob/9c287d212cc6edf22ed2a1684d09cdb17574d025/src/components/workspace/left-sidebar/LeftSidebar.tsx)：独立会话菜单可“关联项目”；项目会话菜单可“转移关联/取消关联”；共有重命名、导出和删除会话等动作。项目内会话缩进显示。

本地只读摘取留在 `.local/stage4-ui-20261015/reference-oasis-frontend`，不纳入产品或发布包。以上只证明所读源码表达的界面结构，未启动参考网站、未核验后台或真实数据行为。

## 本次样品采用方式

保持左DSH原生菜单、右Oasis业务菜单和贯穿竖线；右侧新会话/网站导入下方加入共享搜索与两个历史切换页。独立页继续展示10条合成独立会话；另补项目页展开状态，展示项目→项目内会话及子项目摘要。两页是同一功能中心的互斥状态，不并排混放。

沿用既定精简风格，紧凑行、低对比边框与轻量选中态是本项目的视觉适配，不声称与原网站逐像素一致。点击具体会话才打开绿洲工作台；项目行负责选择/展开。图中数量、名称、客户与时间均为合成数据。实际公开接点、持久化、关联/归档操作另需实施核对，样品不证明这些功能已接线。
