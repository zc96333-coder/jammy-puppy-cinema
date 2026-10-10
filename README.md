# jammy和puppy的电影院

仅供两人使用的影视片单原型，以 Notion 风格表格为主，支持想看/看过清单、双人独立评分、筛选、时间线、批量删除与回收站。

## 本地运行

需要 Node.js 18 或以上。无需安装 npm 依赖：

```sh
cd frontend
node server.cjs
```

打开 http://127.0.0.1:4173/ 。

## 测试

```sh
cd frontend
node --test *.test.cjs
```

## 数据与资料源

新增影片、个人评分、修改和回收站平时保存在当前浏览器的 localStorage，不跨设备同步。代码包含初始十部影片及观看日期。用户已确认公开上传本次数据快照，见 [数据备份](data/README.md)；后续浏览器修改不会自动上传。可在本地 `/backup.html` 导出最新数据。

豆瓣站内候选搜索用于关联影片，资料读取受豆瓣访问限制影响；评分可能是已有快照，并非保证实时。添加时支持从 Wikidata 查询候选并补全空白资料，允许继续手动录入。Windows 使用系统 curl 请求 Wikidata。

当前没有登录鉴权、共享数据库或正式双人隐藏权限。Node 服务默认仅监听本机地址；上传 GitHub 不等于部署网站。

更多说明见 [前端说明](frontend/README.md)、[架构说明](frontend/架构说明.md) 和 [产品需求](共同观影档案-PRD.md)。
