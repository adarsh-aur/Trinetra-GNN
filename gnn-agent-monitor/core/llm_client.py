"""
core/llm_client.py - Groq API Client with async support
"""

import aiohttp
import asyncio
from typing import Optional
import logging


class GroqClient:
    """Asynchronous Groq API client"""

    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def generate(
            self,
            prompt: str,
            temperature: Optional[float] = None,
            max_tokens: Optional[int] = None
    ) -> str:
        """Generate response from Groq API"""

        session = await self._get_session()

        headers = {
            "Authorization": f"Bearer {self.config.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.config.GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature or self.config.GROQ_TEMPERATURE,
            "max_tokens": max_tokens or self.config.GROQ_MAX_TOKENS
        }

        try:
            async with session.post(
                    self.config.GROQ_URL,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
            ) as response:

                if response.status == 200:
                    data = await response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    error_text = await response.text()
                    self.logger.error(f"Groq API error {response.status}: {error_text}")
                    return f"Error: API returned status {response.status}"

        except asyncio.TimeoutError:
            self.logger.error("Groq API timeout")
            return "Error: Request timeout"
        except Exception as e:
            self.logger.error(f"Groq API exception: {e}")
            return f"Error: {str(e)}"

    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
            self.session = None