import asyncio
from core.llm_client import GroqClient
from core.config import Config

async def main():
    cfg = Config()
    groq = GroqClient(cfg)
    res = await groq.generate("Summarize the role of GNNs in network anomaly detection.")
    print("\n✅ Groq API Test Response:\n", res)
    await groq.close()

if __name__ == "__main__":
    asyncio.run(main())
