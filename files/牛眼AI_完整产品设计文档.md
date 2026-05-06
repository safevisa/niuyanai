# 🎯 牛眼AI — 完整产品设计文档 v2.0
> 专业投资分析师 + 产品经理视角重构版  
> 核心押注：AI分析质量 × 交易模型深度 × 三类用户全覆盖

---

## 一、产品战略定位

### 1.1 真实竞争环境分析

| 竞品 | 核心能力 | 致命弱点 |
|------|---------|---------|
| 同花顺 | 数据全、用户多 | 分析浅、信号噪音大 |
| 东方财富 | 社区活跃 | 情绪驱动、无AI深度 |
| 万得(Wind) | 数据专业 | 贵、门槛高、不面向散户 |
| 雪球 | 社区好 | 无结构化AI分析 |
| **牛眼AI** | **AI交易模型 + 买卖点逻辑 + 套牢解套路径** | 待建立 |

### 1.2 核心差异化：交易模型是护城河

竞品都在"展示数据"，我们要做的是"解释数据背后的交易逻辑"。

**我们的核心武器：**
- 🔴 **动态买点识别模型**（基于量价关系 + 筹码结构）
- 🟢 **分批减仓逻辑引擎**（基于盈利空间 + 趋势强度）
- 🟡 **套牢分析与解套路径**（基于成本分布 + 市场状态）
- 📊 **市场情绪-资金-趋势三维模型**

### 1.3 合规策略（适度灰色方案）

**核心原则：** "参考性标注" 而非 "指令性建议"

```
❌ 禁止表达："建议买入" "应该止损" "目标价XX元"
✅ 允许表达："历史上类似形态，多数出现在..." 
             "从量价关系看，当前位置具备..." 
             "参考买点区间：XX-XX（仅供参考，风险自担）"
```

**法律护盾设计：**
1. 每个分析页强制展示免责声明（不可关闭）
2. 首次使用必须签署《风险知情书》
3. 所有买卖点标注使用"历史参考"而非"预测"措辞
4. 准确率数据不对外公布（避免被追责）

---

## 二、用户分层模型

### 2.1 三类用户 × 不同需求设计

#### 🔵 A类用户：纯新手散户
- **核心痛点：** 看不懂K线、不知道什么是好股、被套后不知道怎么办
- **产品设计重点：** 
  - 用大白话解释所有指标
  - "被套了怎么办"是第一功能
  - 不要图表，要文字结论

#### 🟡 B类用户：有基础的散户（最大用户群）
- **核心痛点：** 懂技术但判断不准、频繁做错方向、情绪化操作
- **产品设计重点：**
  - 买卖点可视化标注
  - 提供判断依据而不只是结论
  - 历史相似形态对比

#### 🔴 C类用户：半专业投资者
- **核心痛点：** 缺少系统化工具整合、多维数据分析耗时
- **产品设计重点：**
  - 多因子量化评分
  - 自定义指标组合
  - 批量持仓分析

---

## 三、核心交易模型设计（产品灵魂）

> ⚠️ 这是整个产品最重要的部分，决定用户是否愿意付费

### 3.1 牛眼评分系统（BullEye Score）

每支股票生成一个 0-100 分的综合评分，由5个维度加权合成：

```
牛眼评分 = 
  趋势得分(25%) + 
  资金得分(25%) + 
  筹码得分(20%) + 
  情绪得分(15%) + 
  基本面得分(15%)
```

**评分区间含义：**
| 分值 | 含义 | 视觉 |
|------|------|------|
| 80-100 | 多方强势，具备参考买点条件 | 🟢 绿色 |
| 60-79 | 偏多，需结合大盘判断 | 🟡 黄绿 |
| 40-59 | 震荡中性，观望为主 | 🟡 黄色 |
| 20-39 | 偏空，风险偏高 | 🟠 橙色 |
| 0-19 | 空方主导，回避 | 🔴 红色 |

### 3.2 五维分析模型详解

#### 维度1：趋势模型（Trend Model）

**指标组合：**
- 均线系统：5/10/20/60日均线多空排列
- MACD：金叉/死叉/顶背离/底背离
- 布林带：位置 + 带宽收窄信号
- 趋势强度：ADX指标

**AI输出逻辑：**
```
if 5>10>20>60均线 AND MACD金叉 AND ADX>25:
    趋势状态 = "强势上行" 
    趋势得分 = 85-100
elif 均线多头但MACD弱:
    趋势状态 = "温和上行"
    趋势得分 = 65-84
...
```

#### 维度2：资金流向模型（Capital Flow Model）

**数据来源：**
- 主力净流入（大单资金）
- 超大单 vs 大单 vs 中单 vs 散单
- 连续N日资金流向趋势
- 龙虎榜数据（异动提醒）

**核心逻辑：**
```
主力连续3日净流入 + 量能放大 + 价格上涨 = 资金评分高
主力净流出 + 量能萎缩 + 价格下跌 = 资金评分低
主力净流入 + 价格不涨 = 警惕（出货嫌疑）
```

#### 维度3：筹码结构模型（Chip Structure Model）

**A股特色核心模型，这是我们的差异化重点**

**关键指标：**
- **获利盘比例：** 当前价格上方有多少筹码（压力）
- **套牢盘比例：** 当前价格下方有多少筹码（支撑）
- **筹码集中度：** 筹码是否集中在窄区间（主力控盘信号）
- **成本密集区：** 历史成交密集的价格区间（关键支撑/阻力）

**买点识别逻辑：**
```
筹码高度集中（集中度>70%) + 低位 + 资金开始流入
= 潜在建仓机会（参考）

筹码大量套牢区上方 + 价格突破
= 解套盘压力区（参考卖点）
```

#### 维度4：市场情绪模型（Sentiment Model）

**数据来源：**
- 涨跌家数比
- 涨停数量 / 跌停数量
- 行业轮动速度
- 热门题材热度变化
- 融资融券余额变化

**输出：**
```
情绪温度计：冰点(0) → 冷(25) → 正常(50) → 热(75) → 沸点(100)

沸点附近 = 短期风险加大（历史上多为阶段顶部）
冰点附近 = 恐慌情绪（历史上多为阶段底部）
```

#### 维度5：基本面快筛模型（Fundamental Filter）

**不做深度基本面分析，只做风险筛查：**
- PE/PB是否极度偏高（估值泡沫风险）
- 近期是否有重大利空公告
- 财务是否有异常（ST风险）
- 行业政策风险

### 3.3 买点识别系统（参考性标注）

#### 买点类型分类：

**B1 - 趋势启动买点（最强信号）**
```
条件：
✅ 长期均线走平后向上拐
✅ 量能温和放大（非暴量）
✅ 筹码完成换手，浮筹减少
✅ 主力资金持续流入≥3日
✅ 大盘环境不恶劣

参考区间：突破前高后回踩确认位
```

**B2 - 回调买点（趋势中继）**
```
条件：
✅ 上升趋势中的正常回调
✅ 回调至10日或20日均线附近
✅ 回调量能萎缩（健康缩量）
✅ 主力资金未出现大幅流出

参考区间：均线支撑位 ±2%
```

**B3 - 底部反转买点（风险最高）**
```
条件：
✅ 下跌超过30%后出现底背离
✅ 成交量出现异常放大（主力建仓）
✅ 筹码高度集中在低位
✅ 市场情绪处于冰点附近

参考区间：成交密集区下沿
风险提示：此类买点失败率较高，须严格控制仓位
```

### 3.4 卖点识别系统（参考性标注）

**S1 - 趋势顶部卖点**
```
条件：
❗ MACD顶背离
❗ 量能在高位萎缩（价涨量缩）
❗ 主力资金开始流出
❗ 筹码大量集中在高位（获利盘大）

参考减仓区间：分批减仓，非一次性
```

**S2 - 跌破关键支撑卖点**
```
条件：
❗ 价格跌破20日均线且无力收复
❗ 成交量放大下跌
❗ 资金持续流出

操作参考：考虑止损或减仓
```

**S3 - 趋势破位卖点**
```
条件：
❗ 跌破上升趋势线
❗ 均线系统空头排列
❗ 大盘同步恶化

参考：趋势可能已改变
```

### 3.5 套牢分析与解套路径（核心留存功能）

> 这是最能打动被套散户的功能，也是A股最真实的需求

#### 套牢状态评估：

```
输入：用户买入价格 + 当前价格 + 持仓数量

系统输出：
1. 套牢深度分类：
   - 轻度套牢：-5% ~ -15%
   - 中度套牢：-15% ~ -30%  
   - 深度套牢：-30% ~ -50%
   - 极度套牢：>-50%

2. 当前股票状态评估（用3.1模型）

3. 解套路径分析（根据状态给出路径）
```

#### 解套路径引擎：

**路径A：趋势向好 + 深度套牢**
```
分析逻辑：
- 股票基本面无重大问题
- 技术面显示有修复迹象
- 市场情绪改善

参考路径：
1. 当前位置不建议追加（摊低有风险）
2. 观察XX价格能否站稳（关键支撑）
3. 若企稳信号出现，可参考分批减仓离场
4. 预计回本所需时间区间估算
```

**路径B：趋势恶化 + 套牢**
```
分析逻辑：
- 技术面继续走坏
- 资金持续流出
- 基本面有隐患

参考路径：
1. 当前继续持有的额外风险提示
2. 历史上类似形态的后续走势统计
3. 若出现反弹，可参考的减仓窗口
4. 最坏情景估算
```

**路径C：震荡整理 + 套牢**
```
分析逻辑：
- 趋势不明朗
- 资金无明显方向
- 需要时间消化

参考路径：
1. 当前阶段以观察为主
2. 设置关键价格观察点（上方阻力/下方支撑）
3. 时间成本分析（持有等待 vs 止损换股）
4. 仓位建议（非操作建议）
```

---

## 四、产品架构设计

### 4.1 页面结构

```
牛眼AI
├── 首页（Home）
│   ├── 今日市场情绪温度计
│   ├── 快速股票搜索
│   ├── 我的持仓快览
│   └── 热点板块 Top3
│
├── 个股分析（Stock Analysis）
│   ├── 基础信息 + 牛眼评分
│   ├── K线图（含AI标注买卖点）
│   ├── 五维雷达图
│   ├── 详细分析文字（分级展示）
│   ├── 相似历史形态
│   └── 参考买卖区间
│
├── 持仓中心（Portfolio）
│   ├── 总览（总市值/总盈亏）
│   ├── 单票状态（调用个股分析）
│   ├── 套牢股票专区 ⭐
│   ├── 风险集中度分析
│   └── 历史分析记录
│
├── 市场（Market）
│   ├── 市场情绪总览
│   ├── 热点板块资金流
│   ├── 异动股票雷达
│   └── 行业轮动图
│
├── 工具箱（Tools）
│   ├── 选股器（多因子筛选）
│   ├── 回测工具（简版）
│   └── 自选股管理
│
└── 个人中心（Profile）
    ├── 会员状态
    ├── 历史分析记录
    └── 设置
```

### 4.2 核心交互流程

#### 流程1：新用户首次分析

```
搜索股票 → 输入代码/名称 → 
展示分析加载动画（增加仪式感）→ 
牛眼评分呈现（大数字动画）→ 
五维雷达图展开 → 
K线 + 买卖点标注 → 
文字分析（大白话版本）→ 
底部：查看持仓分析 / 保存记录
```

#### 流程2：被套用户核心流程

```
进入持仓 → 输入股票+成本+数量 → 
系统识别套牢 → 显示"套牢分析"入口 → 
展示套牢深度 + 当前股票状态 → 
三条解套路径（可选查看）→ 
设置价格预警（关键支撑/阻力）→ 
每日推送状态变化
```

---

## 五、技术架构

### 5.1 技术栈（最终版）

```
前端：
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- ECharts（K线 + 雷达图 + 资金流）
- Framer Motion（动画）

后端：
- FastAPI (Python 3.11+)
- PostgreSQL（主数据库）
- Redis（缓存 + 限流）
- Celery（异步任务）

AI层：
- Claude 3.5 Sonnet（主力分析模型）
- GPT-4.1（备用/对比）
- 自研 Prompt 引擎（核心资产）
- 结构化输出（JSON格式强制）

数据层：
- Tushare Pro（基础行情 + 资金流）
- AkShare（筹码数据 + 龙虎榜）
- 东方财富API（实时行情）
- 自建数据缓存（降低API调用成本）

部署：
- 前端：Vercel
- 后端：阿里云/腾讯云 ECS
- 数据库：RDS PostgreSQL
- 缓存：Redis Cloud
```

### 5.2 数据库设计

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY,
    phone VARCHAR(11) UNIQUE,
    nickname VARCHAR(50),
    vip_level INTEGER DEFAULT 0,  -- 0:免费 1:VIP 2:PRO
    vip_expire_at TIMESTAMP,
    daily_quota INTEGER DEFAULT 3, -- 每日免费次数
    daily_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 股票分析记录表
CREATE TABLE analyses (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stock_code VARCHAR(10),
    stock_name VARCHAR(50),
    analysis_date DATE,
    bull_eye_score INTEGER,         -- 牛眼评分 0-100
    trend_score INTEGER,
    capital_score INTEGER,
    chip_score INTEGER,
    sentiment_score INTEGER,
    fundamental_score INTEGER,
    ai_analysis JSONB,              -- 完整AI分析结果
    buy_zone_low DECIMAL(10,2),     -- 参考买点区间下沿
    buy_zone_high DECIMAL(10,2),    -- 参考买点区间上沿
    sell_zone_low DECIMAL(10,2),
    sell_zone_high DECIMAL(10,2),
    market_price DECIMAL(10,2),     -- 分析时价格
    created_at TIMESTAMP DEFAULT NOW()
);

-- 持仓表
CREATE TABLE positions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stock_code VARCHAR(10),
    stock_name VARCHAR(50),
    cost_price DECIMAL(10,2),       -- 买入成本
    shares INTEGER,
    current_price DECIMAL(10,2),
    profit_loss DECIMAL(10,2),      -- 浮盈浮亏金额
    profit_loss_pct DECIMAL(5,2),   -- 浮盈浮亏百分比
    trap_level VARCHAR(10),         -- 套牢级别: light/medium/deep/extreme
    latest_analysis_id UUID REFERENCES analyses(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 解套分析表
CREATE TABLE trap_analyses (
    id UUID PRIMARY KEY,
    position_id UUID REFERENCES positions(id),
    path_a JSONB,   -- 路径A：趋势向好
    path_b JSONB,   -- 路径B：趋势恶化
    path_c JSONB,   -- 路径C：震荡整理
    recommended_path VARCHAR(1),    -- 推荐路径
    key_support DECIMAL(10,2),      -- 关键支撑位
    key_resistance DECIMAL(10,2),   -- 关键阻力位
    created_at TIMESTAMP DEFAULT NOW()
);

-- 价格预警表
CREATE TABLE price_alerts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stock_code VARCHAR(10),
    alert_type VARCHAR(20),  -- support_break / resistance_break / score_change
    trigger_price DECIMAL(10,2),
    is_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 会员订单表
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    plan VARCHAR(10),        -- vip / pro
    amount DECIMAL(8,2),
    payment_method VARCHAR(20),
    started_at TIMESTAMP,
    expired_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.3 API接口设计

```
核心接口列表：

POST /api/auth/login          # 手机号登录
GET  /api/stock/{code}        # 获取股票基础数据
POST /api/analysis/stock      # 触发AI分析
GET  /api/analysis/{id}       # 获取分析结果

POST /api/portfolio/add       # 添加持仓
GET  /api/portfolio/list      # 获取持仓列表
POST /api/portfolio/trap      # 触发套牢分析
DELETE /api/portfolio/{id}    # 删除持仓

GET  /api/market/overview     # 市场总览
GET  /api/market/sectors      # 板块资金流
GET  /api/market/hot          # 热点异动

POST /api/alert/create        # 创建价格预警
GET  /api/alert/list          # 获取我的预警

POST /api/pay/create          # 创建支付订单
POST /api/pay/callback        # 支付回调

GET  /api/history/list        # 历史分析记录
```

---

## 六、AI Prompt 引擎设计

### 6.1 个股分析 Master Prompt

```python
STOCK_ANALYSIS_PROMPT = """
你是牛眼AI的核心分析引擎，专注于A股市场技术分析与量价关系研究。

【数据输入】
股票：{stock_name}（{stock_code}）
当前价格：{current_price}
分析数据：
- 均线状态：{ma_status}
- MACD状态：{macd_status}
- 布林带位置：{boll_position}
- 近5日资金流：{capital_flow_5d}
- 主力净流入：{main_capital_net}
- 筹码集中度：{chip_concentration}
- 获利盘比例：{profit_chip_ratio}
- 套牢盘比例：{loss_chip_ratio}
- 市场情绪：{market_sentiment}
- PE/PB：{pe}/{pb}
- 近期公告风险：{announcement_risk}

【输出要求】
请严格按照以下JSON结构输出，不要输出任何额外内容：

{
  "bull_eye_score": <0-100整数>,
  "scores": {
    "trend": <0-100>,
    "capital": <0-100>,
    "chip": <0-100>,
    "sentiment": <0-100>,
    "fundamental": <0-100>
  },
  "trend_status": "<强势上行|温和上行|横盘震荡|温和下行|强势下行>",
  "trend_position": "<高位|中高位|中位|中低位|低位>",
  "capital_status": "<主力持续流入|主力小幅流入|资金平衡|主力小幅流出|主力持续流出>",
  "chip_status": "<筹码集中低位|筹码分散|筹码集中高位>",
  "sentiment": "<过热|偏热|中性|偏冷|极度悲观>",
  
  "buy_signals": [
    {
      "type": "<B1|B2|B3>",
      "description": "<信号描述>",
      "zone_low": <参考价格下沿>,
      "zone_high": <参考价格上沿>,
      "strength": "<强|中|弱>",
      "conditions_met": <0-5>
    }
  ],
  "sell_signals": [
    {
      "type": "<S1|S2|S3>",
      "description": "<信号描述>",
      "zone_low": <参考价格下沿>,
      "zone_high": <参考价格上沿>,
      "strength": "<强|中|弱>"
    }
  ],
  
  "analysis_for_beginner": "<用大白话解释当前股票状态，100字以内，不含专业术语>",
  "analysis_for_intermediate": "<包含技术分析逻辑的分析，200字以内>",
  "analysis_for_advanced": "<完整的量价筹码分析，300字以内>",
  
  "key_support": <关键支撑价格>,
  "key_resistance": <关键阻力价格>,
  
  "risk_factors": [
    "<风险点1>",
    "<风险点2>",
    "<风险点3>"
  ],
  
  "personal_take": "<以第一人称，用'如果是我来看这支股票，我会这样理解'开头，分析当前状态，150字以内，不含买卖指令>",
  
  "disclaimer": "以上分析为AI基于历史数据的参考性解读，不构成投资建议，市场有风险，请独立判断。"
}

【严格禁止】
- 不得出现"建议买入/卖出"等操作指令
- 不得承诺涨跌幅
- 不得给出确定性预测
- 买卖点必须标注"参考区间"而非"目标价"
"""
```

### 6.2 套牢分析 Prompt

```python
TRAP_ANALYSIS_PROMPT = """
你是牛眼AI的套牢分析专家，专注于帮助被套投资者理清思路。

【持仓数据】
股票：{stock_name}（{stock_code}）
买入成本：{cost_price}元
当前价格：{current_price}元
套牢幅度：{loss_pct}%
套牢级别：{trap_level}
持仓金额：{position_value}元

【当前股票状态】
牛眼评分：{bull_eye_score}
趋势状态：{trend_status}
资金状态：{capital_status}
关键支撑：{key_support}
关键阻力：{key_resistance}

【输出三条解套路径】

{
  "trap_assessment": "<对当前套牢状况的客观评估，不带情绪，100字>",
  
  "path_a": {
    "title": "路径A：等待修复",
    "applicable": <true|false>,
    "conditions": "<适用此路径的前提条件>",
    "analysis": "<分析逻辑，150字>",
    "key_signals_to_watch": ["<观察信号1>", "<观察信号2>"],
    "reference_exit_zone": "<参考的可考虑减仓区间（如果有的话）>",
    "time_estimate": "<大概需要多长时间>",
    "risk_level": "<高|中|低>"
  },
  
  "path_b": {
    "title": "路径B：逢反弹减仓",
    "applicable": <true|false>,
    "conditions": "<适用此路径的前提条件>",
    "analysis": "<分析逻辑，150字>",
    "reference_rebound_zone": "<参考的反弹关注区间>",
    "risk_if_not_executed": "<不执行的风险>",
    "risk_level": "<高|中|低>"
  },
  
  "path_c": {
    "title": "路径C：观察等待",
    "applicable": <true|false>,
    "conditions": "<适用此路径的前提条件>",
    "analysis": "<分析逻辑，150字>",
    "key_price_levels": {
      "must_hold": <必须守住的关键价格>,
      "break_above": <突破后信号改善的价格>
    },
    "waiting_cost": "<时间成本分析>",
    "risk_level": "<高|中|低>"
  },
  
  "recommended_path": "<A|B|C>",
  "recommendation_reason": "<推荐该路径的核心原因，100字>",
  
  "psychological_note": "<给被套投资者的一段心理支持性文字，帮助保持理性，80字>",
  
  "disclaimer": "以上为AI基于数据的参考性分析，不构成投资建议，解套策略需结合个人实际情况判断，市场有风险。"
}
"""
```

---

## 七、会员体系设计

### 7.1 分层设计

| 功能 | 免费版 | VIP（39元/月） | PRO（99元/月） |
|------|--------|---------------|---------------|
| 每日分析次数 | 3次 | 无限 | 无限 |
| 个股基础分析 | ✅ | ✅ | ✅ |
| 牛眼评分 | ✅ | ✅ | ✅ |
| 买卖点标注 | ❌ | ✅ | ✅ |
| K线AI标注 | ❌ | ✅ | ✅ |
| 持仓分析 | 1支 | 20支 | 无限 |
| 套牢解套分析 | ❌ | ✅ | ✅ |
| 价格预警 | 2个 | 20个 | 无限 |
| 历史记录 | 7天 | 90天 | 永久 |
| 市场情绪总览 | 基础版 | 完整版 | 完整版 |
| 热点板块分析 | ❌ | ✅ | ✅ |
| 选股器 | ❌ | ❌ | ✅ |
| 行业轮动图 | ❌ | ❌ | ✅ |
| 批量持仓分析 | ❌ | ❌ | ✅ |
| 每日AI市场报告 | ❌ | ✅ | ✅ |
| 客服优先级 | 普通 | 优先 | 专属 |

### 7.2 付费转化设计

**关键转化点（用户最容易付费的时机）：**
1. 看到牛眼评分后，想查看详细买卖点 → VIP付费墙
2. 输入持仓发现被套，想查看解套路径 → VIP付费墙
3. 免费次数用完，分析到一半 → 升级提示
4. 历史记录超7天，想回看 → 升级提示

---

## 八、增长系统设计

### 8.1 分享裂变

**分享卡片内容（小红书/微信友好型）：**
```
┌─────────────────────────┐
│  🎯 牛眼AI 今日分析       │
│                         │
│  贵州茅台(600519)        │
│  牛眼评分：82/100 🟢     │
│                         │
│  趋势：温和上行           │
│  资金：主力持续流入        │
│  情绪：中性              │
│                         │
│  ⚠️ 仅供参考，风险自担    │
└─────────────────────────┘
扫码体验AI股票分析 → 
```

### 8.2 DAU 驱动机制

**每日推送（核心留存）：**
- 08:30：今日市场情绪预判
- 14:30：午后热点板块播报
- 15:30：收盘总结 + 持仓变化提示
- 异动推送：用户预警触发即时推送

### 8.3 邀请机制

```
邀请1人注册 → +5次分析机会
邀请3人注册 → VIP 7天体验
邀请5人注册 → VIP 1个月
邀请10人注册 → PRO 1个月
被邀请人首月VIP打8折
```

---

## 九、开发路线图

### Phase 1 - MVP（Week 1-2）优先级：必须上线
```
□ 用户系统（手机号登录 + JWT）
□ 股票搜索 + 基础数据获取
□ AI分析引擎（五维模型 + Prompt）
□ 牛眼评分展示
□ 基础K线图
□ 免责声明系统
□ 基础UI（首页 + 分析页）
```

### Phase 2 - 核心功能（Week 3-4）优先级：付费前提
```
□ 买卖点标注系统（K线AI标注）
□ 持仓录入 + 基础分析
□ 套牢分析 + 解套路径
□ 历史记录
□ 会员系统 + 微信支付
□ VIP功能解锁
```

### Phase 3 - 增长功能（Week 5-6）优先级：增长驱动
```
□ 市场情绪总览页
□ 热点板块资金流
□ 价格预警推送
□ 分享卡片生成
□ 邀请裂变系统
□ 每日AI报告推送
```

### Phase 4 - PRO功能（Week 7-8）优先级：ARPU提升
```
□ 选股器（多因子筛选）
□ 行业轮动图
□ 批量持仓分析
□ 历史相似形态匹配
□ 回测工具（简版）
```

---

## 十、风险与注意事项

### 10.1 监管风险
- 持续关注证监会对AI投顾的监管动态
- 避免在宣传材料中使用"准确率"等表述
- 每个分析结果强制展示免责声明

### 10.2 数据风险
- Tushare/AkShare接口有时延，需标注数据时间
- 实时行情需要合法数据授权
- 筹码数据准确性依赖数据源质量

### 10.3 模型风险
- AI分析结果受数据质量影响
- 需建立分析质量监控机制
- 定期回测历史买卖点标注准确性

---

## 附录：关键决策清单

在开发开始前，需要确认以下决策：

- [ ] 数据源授权（Tushare Pro账号 + 东财API）
- [ ] 服务器环境（阿里云 vs 腾讯云）
- [ ] 域名和品牌注册
- [ ] 微信支付商户号申请
- [ ] 小程序 vs H5 vs App（建议先做H5）
- [ ] Claude API账号和额度

---
*文档版本：v2.0 | 生成日期：2026-05 | 下一步：Cursor开发任务拆解*
