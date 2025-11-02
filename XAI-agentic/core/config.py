import os
from dataclasses import dataclass, field
from typing import Optional, List
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass
class Config:
    """Complete configuration for the agentic AI system"""

    # ========================================
    # Agent Identity
    # ========================================
    AGENT_NAME: str = "GNN-Guardian"
    AGENT_ROLE: str = "Real-time GNN Anomaly Detection & CVE Intelligence Agent"

    # ========================================
    # Groq API Configuration
    # ========================================
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = "openai/gpt-oss-20b"  # Best for reasoning
    GROQ_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_MAX_TOKENS: int = 8192
    GROQ_TEMPERATURE: float = 0.2

    # ========================================
    # NVD API Configuration
    # ========================================
    NVD_API_KEY: Optional[str] = os.getenv("NVD_API_KEY", None)
    NVD_CACHE_TIMEOUT: int = 24  # hours
    NVD_ENABLED: bool = True

    # ========================================
    # Batch Processing
    # ========================================
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "32"))
    BATCH_TIMEOUT: float = 0.5  # seconds
    MAX_CONCURRENT_BATCHES: int = 4

    # ========================================
    # Token Management (tiktoken)
    # ========================================
    MODEL_ENCODING: str = "cl100k_base"  # For GPT-3.5/4 compatible
    MAX_PROMPT_TOKENS: int = 6000
    MAX_CONTEXT_TOKENS: int = 8000

    # ========================================
    # Anomaly Detection
    # ========================================
    ZSCORE_THRESHOLD: float = float(os.getenv("ZSCORE_THRESHOLD", "3.0"))
    WINDOW_SIZE: int = 100
    ANOMALY_HISTORY_SIZE: int = 1000

    # ========================================
    # GNN Model
    # ========================================
    HIDDEN_CHANNELS: int = 64
    NUM_LAYERS: int = 2
    LEARNING_RATE: float = 0.001

    # ========================================
    # CVE Analysis
    # ========================================
    ANALYZE_CVES: bool = os.getenv("ANALYZE_CVES", "true").lower() == "true"
    MAX_CVES_PER_NODE: int = 10
    CVE_SEVERITY_FILTER: Optional[List[str]] = None  # None = all severities

    # ========================================
    # Monitoring
    # ========================================
    UPDATE_INTERVAL: float = float(os.getenv("UPDATE_INTERVAL", "2.0"))
    SAVE_REPORTS: bool = True
    REPORT_DIR: str = "reports"

    # ========================================
    # Agent Behavior
    # ========================================
    AGENT_MEMORY_SIZE: int = 50  # Last N interactions
    AUTO_RESPONSE: bool = True
    ALERT_THRESHOLD: float = 0.1  # 10% anomaly rate triggers alert

    # ========================================
    # Logging
    # ========================================
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = "logs/syslogs2.log"

    def __post_init__(self):
        """Validate configuration and create directories"""

        # Create directories
        Path(self.REPORT_DIR).mkdir(parents=True, exist_ok=True)
        Path("logs").mkdir(parents=True, exist_ok=True)
        Path("data").mkdir(parents=True, exist_ok=True)

        # Validate required fields
        if not self.GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY is required! Get one from https://console.groq.com/keys"
            )

        # Warnings
        if self.ANALYZE_CVES and not self.NVD_API_KEY:
            print("⚠️  Warning: NVD_API_KEY not set. CVE lookups will be rate-limited.")
            print("   Get a free key: https://nvd.nist.gov/developers/request-an-api-key")