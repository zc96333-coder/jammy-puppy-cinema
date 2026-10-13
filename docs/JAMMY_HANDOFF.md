# Jammy · 开发交接

## 本次变更

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

协作建议：功能分支 → PR → 测试后合并；改数据模型时维护迁移、权限及事务测试。`frontend/README.md` 下方是旧原型说明，当前入口和存储以根 README 与本文件为准。
