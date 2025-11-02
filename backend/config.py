import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# NVD API Configuration
NVD_API_KEY = os.getenv("NVD_API_KEY", "")

# NVD API settings
NVD_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# Rate limiting
# With API key: 50 requests per 30 seconds
# Without API key: 5 requests per 30 seconds
NVD_RATE_LIMIT = 50 if NVD_API_KEY else 5
NVD_RATE_WINDOW = 30  # seconds

# Cache settings
CVE_CACHE_TTL = 86400  # 24 hours for CVE data
SEARCH_CACHE_TTL = 43200  # 12 hours for search results
FAILED_LOOKUP_TTL = 3600  # 1 hour for failed lookups