from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "BullEye AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    # Railway/本地默认使用 sqlite，避免未配置外部数据库时服务启动失败
    DATABASE_URL: str = "sqlite:///./bulleye.db"
    
    # AI Engine
    CLAUDE_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"  # openai | gemini | doubao
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4.1-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    ARK_API_KEY: str = ""
    ARK_MODEL: str = "doubao-seed-2-0-lite-260428"
    ARK_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"
    ANALYSIS_REQUIRE_LLM: bool = True
    ANALYSIS_TIMEOUT_SECONDS: int = 30

    # Auth
    JWT_SECRET_KEY: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 72
    
    # Data Providers
    TUSHARE_TOKEN: str = ""
    STOCK_DATA_PROVIDER: str = "real"  # mock | real
    REALTIME_DATA_SOURCE: str = "eastmoney"  # eastmoney | tushare
    WECHAT_PAY_CALLBACK_SECRET: str = ""
    LOGIN_CODE_MODE: str = "mock"  # mock | strict
    SMS_CODE_WEBHOOK_URL: str = ""
    EMAIL_CODE_WEBHOOK_URL: str = ""
    SMS_PROVIDER: str = "aliyun"  # aliyun | webhook | mock
    SMS_ALIYUN_ACCESS_KEY_ID: str = ""
    SMS_ALIYUN_ACCESS_KEY_SECRET: str = ""
    SMS_ALIYUN_SIGN_NAME: str = ""
    SMS_ALIYUN_TEMPLATE_CODE: str = ""
    EMAIL_PROVIDER: str = "gmail"  # gmail | webhook | mock
    EMAIL_GMAIL_USER: str = ""
    EMAIL_GMAIL_APP_PASSWORD: str = ""
    EMAIL_FROM_NAME: str = "BullEye AI"
    STARTUP_WARMUP_ENABLED: bool = True
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
