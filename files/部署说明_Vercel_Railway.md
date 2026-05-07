# 牛眼AI 部署说明（Vercel + Railway）

## 1) 后端部署到 Railway

- 仓库：`safevisa/niuyanai`
- Root Directory: `backend`
- 启动命令已内置：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Railway 必填环境变量

- `DATABASE_URL`（可直接添加 Railway Postgres 后自动注入）
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM=HS256`
- `JWT_EXPIRE_HOURS=72`
- `OPENAI_API_KEY`（如暂时不用可留空）
- `STOCK_DATA_PROVIDER=real`
- `REALTIME_DATA_SOURCE=eastmoney`
- `LOGIN_CODE_MODE=mock`

部署成功后记下后端地址，例如：

`https://your-backend.up.railway.app`

## 2) 前端部署到 Vercel

- 仓库：`safevisa/niuyanai`
- Root Directory: `/`（项目根目录）

### Vercel 必填环境变量

- `NEXT_PUBLIC_API_BASE_URL=https://your-backend.up.railway.app`

部署成功后访问 Vercel 域名即可。

## 3) 回归检查

- 首页搜索：输入“比亚迪”可出现结果并可点击
- 市场总览：可看到“当前 X 条 / 全市场 Y 条”
- 分析页：点击“去分析”可正常进入
- 登录：手机号/邮箱验证码流程可通
