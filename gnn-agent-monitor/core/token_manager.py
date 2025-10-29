import tiktoken
from typing import List, Dict
import logging


class TokenManager:
    """Manage token counting and context truncation"""

    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)

        try:
            self.encoding = tiktoken.get_encoding(config.MODEL_ENCODING)
            self.logger.info(f"Initialized tiktoken: {config.MODEL_ENCODING}")
        except Exception as e:
            self.logger.error(f"Failed to initialize tiktoken: {e}")
            self.encoding = None

    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        if self.encoding:
            try:
                return len(self.encoding.encode(text))
            except Exception as e:
                self.logger.warning(f"Token counting failed: {e}")
                return len(text) // 4
        return len(text) // 4

    def truncate_context(self, text: str, max_tokens: int) -> str:
        """Truncate text to max tokens"""
        if self.count_tokens(text) <= max_tokens:
            return text

        if self.encoding:
            tokens = self.encoding.encode(text)
            truncated = tokens[:max_tokens]
            return self.encoding.decode(truncated)
        else:
            return text[:max_tokens * 4]

    def batch_token_counts(self, texts: List[str]) -> List[int]:
        """Count tokens for multiple texts"""
        return [self.count_tokens(text) for text in texts]