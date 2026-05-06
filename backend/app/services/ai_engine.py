import json
import logging
from typing import Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings
from app.services.stock_data import StockDataService

logger = logging.getLogger(__name__)

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
{{
  "bull_eye_score": 85,
  "scores": {{
    "trend": 80,
    "capital": 90,
    "chip": 85,
    "sentiment": 70,
    "fundamental": 80
  }},
  "trend_status": "强势上行",
  "trend_position": "中低位",
  "capital_status": "主力持续流入",
  "chip_status": "筹码集中低位",
  "sentiment": "中性",
  "buy_signals": [],
  "sell_signals": [],
  "analysis_for_beginner": "用大白话解释...",
  "analysis_for_intermediate": "进阶分析...",
  "analysis_for_advanced": "高阶分析...",
  "key_support": 10.5,
  "key_resistance": 12.8,
  "risk_factors": ["风险1"],
  "personal_take": "如果是我来看...",
  "disclaimer": "以上分析为AI基于历史数据的参考性解读，不构成投资建议，市场有风险，请独立判断。"
}}

【严格禁止】
- 不得出现"建议买入/卖出"等操作指令
- 不得承诺涨跌幅
- 不得给出确定性预测
- 买卖点必须标注"参考区间"而非"目标价"
"""

class AIEngine:
    def __init__(self):
        # Using OpenAI compatible client (can be swapped for Claude/DeepSeek etc)
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    async def generate_stock_analysis(self, stock_code: str) -> Dict[str, Any]:
        """Generate comprehensive stock analysis using LLM"""
        data = StockDataService.get_full_analysis_data(stock_code)
        
        prompt = STOCK_ANALYSIS_PROMPT.format(
            stock_name=data["stock_name"],
            stock_code=data["stock_code"],
            current_price=data["current_price"],
            ma_status=data["ma_status"],
            macd_status=data["macd_status"],
            boll_position=data["boll_position"],
            capital_flow_5d=data["capital_flow_5d"],
            main_capital_net=data["main_capital_net"],
            chip_concentration=data["chip_concentration"],
            profit_chip_ratio=data["profit_chip_ratio"],
            loss_chip_ratio=data["loss_chip_ratio"],
            market_sentiment=data["market_sentiment"],
            pe=data["pe"],
            pb=data["pb"],
            announcement_risk=data["announcement_risk"],
        )

        if not self.client:
            logger.warning("No API key provided. Returning mock AI analysis.")
            return self._generate_mock_ai_response(data)

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview", # Or preferred model
                messages=[
                    {"role": "system", "content": "You are a professional financial AI assistant. Always output valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" },
                temperature=0.2,
            )
            
            result = json.loads(response.choices[0].message.content)
            return self._enrich_result(result, data)
        except Exception as e:
            logger.error(f"AI Engine Error: {str(e)}")
            return self._generate_mock_ai_response(data)

    def _enrich_result(self, result: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
        """补齐模型输出缺失字段，保证前后端结构稳定。"""
        result["stock_code"] = result.get("stock_code") or data.get("stock_code")
        result["stock_name"] = result.get("stock_name") or data.get("stock_name")
        result["market"] = result.get("market") or data.get("market", "")
        result["industry"] = result.get("industry") or data.get("industry", "")
        result["data_as_of"] = result.get("data_as_of") or data.get("data_as_of")
        if "market_price" not in result:
            result["market_price"] = data.get("current_price", 0)
        return result

    def _generate_mock_ai_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback mock response when API is not available"""
        return self._enrich_result({
          "bull_eye_score": 75,
          "scores": {
            "trend": 70,
            "capital": 80,
            "chip": 75,
            "sentiment": 60,
            "fundamental": 90
          },
          "trend_status": "温和上行",
          "trend_position": "中位",
          "capital_status": "主力小幅流入",
          "chip_status": "筹码集中低位",
          "sentiment": "中性",
          "buy_signals": [
              {
                  "type": "B2",
                  "description": "回踩重要均线支撑",
                  "zone_low": round(data["current_price"] * 0.95, 2),
                  "zone_high": round(data["current_price"] * 0.98, 2),
                  "strength": "中",
                  "conditions_met": 3
              }
          ],
          "sell_signals": [],
          "analysis_for_beginner": f"当前{data['stock_name']}走势平稳，大资金有小幅介入迹象，适合耐心观察。",
          "analysis_for_intermediate": f"技术面呈现{data['ma_status']}，结合资金面{data['capital_flow_5d']}，短期具备一定支撑。",
          "analysis_for_advanced": f"筹码结构显示获利盘比例{data['profit_chip_ratio']}，结合当前估值(PE:{data['pe']})，具备一定安全边际。",
          "key_support": round(data["current_price"] * 0.92, 2),
          "key_resistance": round(data["current_price"] * 1.1, 2),
          "risk_factors": [data["announcement_risk"] if data["announcement_risk"] != "无" else "大盘系统性风险"],
          "personal_take": "如果是我来看这支股票，当前位置具备一定的盈亏比优势，但需严格控制仓位。",
          "disclaimer": "以上分析为AI基于历史数据的参考性解读，不构成投资建议，市场有风险，请独立判断。"
        }, data)

ai_engine = AIEngine()
