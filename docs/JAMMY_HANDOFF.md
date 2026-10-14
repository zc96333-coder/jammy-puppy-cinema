# Jammy · 开发交接

## 本次变更

基线：上次上传 `60e7052`（首次入场过渡）。本节只列该版本之后的变化；原架构和部署边界见下文。

### TL;DR for Jammy

- 新增 `frontend/composer.js`：下半区 inline stepper + 洗牌选类，选中后**真实面板单次展开**，不再 clone 临时卡片交接。步骤只动 transform/opacity，不反复动画 height；返回清理牌堆锁定和残留动画。
- 电影直接输入新片名 → 豆瓣候选版本 → 确认；书/游戏保留已有作品标签复用。草稿只在内存保留，整页刷新会丢失。
- 新建默认 `dateIntent=unsure, date=""`；另有 future（确定想做但未定日期）和 dated。未定日期计划只留在下半区；日期节点快捷添加带入具体日期。
- Pointer Events 拖拽计划左侧柄定日/改期，支持目标日预览、边缘平移、触摸、Esc/失焦取消。PATCH 使用记录 version，只改日期，不自动完成、不重建作品。
- 时间轴：同日多事件下方只显示当前一条；单事件不重复弹图标。默认倍率及以上显示竖排事件名，以下隐藏；惩罚标题简化为「惩罚」。今天标题居中放大，轴上橙点简化并呼吸。
- 细节：下半页全幅底色、浅色面板；片名输入框闲时隐藏边框，编辑用 SVG flowing dash、成功短暂绿色反馈；评分滑块添加弹簧惯性，真实 0.1 分数即时更新，视觉惯性不自动保存。
- 性能：visibleEvents 按 state 引用缓存；滚轮缩放仍采用整体缩放，运动期间延后 LOD 重建，避免每帧重建节点。未定日期在所有 LOD 中排除。
- API：events 的 dateIntent 新字段，旧非空 date 兼容；done 必须有具体日期。惩罚要求改期仅 owner，可事务同步 demand/event，不能借日期接口完成/删除或再次扣机会。
- 验证：`node --test backend/*.test.cjs frontend/*.test.cjs`，**137 passed**。浏览器自动化访问受限，动效/拖拽手感仍需人工 QA。
- 部署未变：Vanilla JS + Node 24 + SQLite；无新 npm 依赖。拉取后重启 Node 服务，数据库不需全量迁移；运行时数据库和密钥不在本次提交中。

### 下半区分步录入

- 新增 `frontend/composer.js`：日程下半区「想做的事 / 还想做什么」页签，类别→已有作品或名称→电影版本→确认，一次只展示一个步骤。
- 默认暂不确定日期、两人一起、想做；确认页可分别修改日期、参与人和状态。日期节点带入日期，顶部添加按钮移除。
- 复用元数据查询和共享 API；草稿只保留于当前页面内存，不因悬停、刷新共享数据或返回步骤丢失。离开页面再回来可继续，整页刷新不保留草稿。
- 惩罚采用获得机会 / 提出要求专用流程，默认当前人、一次机会；成功后回计划页，防重复提交，失败保留表单。新增回归测试；浏览器自动化当前受限，仍需人工体验确认。

### 时间轴交互补充

- 拖动/惯性速度驱动 `--flight`，高速时淡化日数字和图标，减速后恢复；不吸附日期。
- 最近节点（横向 58px、垂直 28px 范围）有靠近反馈；同日图标错峰展开、邻项让位、离开时收回。
- LOD 聚合保留中心日期、循环视窗拖动位移与下方固定编辑 DOM；滚轮连续缩放期间不播放快照交叉淡入，稳定后更新细节。
- 尊重 reduced motion；动效不写业务数据。本轮浏览器预览因工具访问策略受限，仍需人工体验确认。

### 页面入场动效补充

- 日程首次挂载时播放约 4 秒的入场过渡：中心向两侧展开时间轴、日期节点与月份色带；上半区结束后再淡入下半区计划卡片。不添加引导弹窗。
- 使用 Web Animations API，仅作用于显示，不移动日期、不写业务数据。pointerdown / wheel / keydown 立即结束过渡；同次页面加载内切页、保存及数据刷新不重播。
- 尊重 `prefers-reduced-motion`。测试覆盖播放顺序、上下区不交叠、只播放一次、交互结束与无数据写入。入场主体已在基线版本上传，本轮主要更新后续交互。

- 从电影静态原型升级为共享记录应用：日程 / 电影 / 图书 / 游戏 / 惩罚 / 年度回顾。
- 日程统一关联作品档案（`workId`），同一作品可多次记录；计划需手动完成，支持拖动改期。
- 时间轴支持循环视窗、中心缩放、惯性平移、日→周→月→年 LOD 与事件聚合；月份点击居中。悬停展开，点击固定下方编辑区，再点取消。
- 作品支持独立 0.1 分评分、感受、服务端双人揭晓；电影支持豆瓣关联、Wikidata 补全、个人海报选择及卡片翻面。海报与作品页同步，不串到另一人的卡片。
- 电影表格保留可选列、行内编辑、批量软删除和恢复；游戏支持复用已录入作品。惩罚支持机会累计→提出要求扣一次→完成留历史。
- 新增固定账号认证、本地 SQLite 持久化、旧 localStorage 迁移和当前账号可见数据导出。

## Run / Test

Node.js 24，零 npm 依赖：

```sh
git pull --ff-only origin main
node frontend/server.cjs
# http://127.0.0.1:4173/
node --test backend/*.test.cjs frontend/*.test.cjs
```

本次验证：95 tests passed。无密码时是 loopback 本地预览，可切换身份；不是公网登录模式。

## Code map

| 文件 | 职责 |
| --- | --- |
| `frontend/life.js` / `life.css` | 六页 UI、编辑、时间轴交互、海报与评价卡片 |
| `frontend/composer.js` | 下半区分步录入、单次卡片展开、日期意图与内存草稿 |
| `frontend/timeline-engine.js` | UTC civil-day 几何、循环视窗、月份分段与 LOD 聚合（可单测） |
| `frontend/server.cjs` | 本地 HTTP / 静态白名单 / 元数据接口装配 |
| `backend/application.cjs` | Fetch Request/Response API、固定账号、cookie session、同源检查与限流 |
| `backend/service.cjs` | 作品、日程、评分揭晓、惩罚与迁移的业务约束 |
| `backend/repository.cjs` | SQLite JSON document store、WAL、事务与乐观版本冲突（409） |
| `frontend/*lookup.cjs` | 豆瓣 / Wikidata / 海报来源查询与降级 |

## 数据 / 部署边界

- 当前：Vanilla JS + Node HTTP API + `node:sqlite`，数据库默认 `.runtime/shared-life.sqlite`；GitHub 上传代码不等于部署，也不会同步运行时数据库。
- `.env`、数据库、备份、截图不提交。已有公开 `data/film-records-snapshot.json` 仅用于首次 seed，不覆盖后续编辑。
- 正式认证：复制 `.env.example` 为 `.env`，设置不同的 puppy/jammy 密码（各 ≥12 字符）、`NODE_ENV=production`、HTTPS `PUBLIC_ORIGIN`；运行 `node --env-file=.env frontend/server.cjs`。生产缺配置拒绝启动。
- 云部署尚未完成。若做 FC + Tablestore，必须适配存储边界、事务/并发版本、持久化会话与网关，不能把当前文件数据库直接当 Serverless 云数据库。见 [架构说明](共享空间架构.md)。
- 元数据/海报依赖第三方可达性、反爬和反盗链；豆瓣评分可能为来源快照，不保证实时。保留来源与手动补全，不绕过限制。

## 未定日期计划与拖拽

- 日程支持 `dateIntent: dated | future | unsure`。未定日期存 `date: ""`，不伪造日期；旧记录按非空 `date` 解释为 dated，无需重写数据库。
- 下半区新建默认 unsure，日期节点快捷添加默认 dated。future / unsure 都保持 plan，不进入轴上任何 LOD 聚合；作品档案仍可显示。
- 计划左侧拖拽柄通过 Pointer Events 定日，支持触摸、目标日期预览和边缘平移。落点按 UTC civil-day 几何计算，PATCH 携带版本，仅修改日期；取消、落在轴外不会写入。
- 惩罚要求只允许 owner 改期，同时事务更新 demand + event，不再次扣机会，不允许借此完成或删除。机会获得是已发生记录，仍需日期。未定日期的要求完成后补当天日期。
- 日期修改使用既有 optimistic revision / 409，后台刷新不打断正在拖拽的卡片；Esc、pointercancel、失焦均清理拖拽状态。

协作建议：功能分支 → PR → 测试后合并；改数据模型时维护迁移、权限及事务测试。`frontend/README.md` 下方是旧原型说明，当前入口和存储以根 README 与本文件为准。
