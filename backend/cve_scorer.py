# cve_scorer.py
import nvdlib
from utils.cache import cache

def get_cve_score(cve_id: str):
    cache_key = f"cve_{cve_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        results = nvdlib.searchCVE(cveId=cve_id)
        if results:
            # nvdlib CVE object has .cvss and .cvssv3 etc depending on version. adapt if needed.
            score = None
            r = results[0]
            # try attributes defensively
            score = getattr(r, "cvss", None) or getattr(r, "cvssv3", None) or None
            # if score is an object, get baseScore
            if score and hasattr(score, "base_score"):
                val = float(score.base_score)
            else:
                # fallback: maybe r.cvss_score or r.cvss3_base_score
                val = float(getattr(r, "cvss_score", 0) or getattr(r, "cvss3_base_score", 0) or 0)
            cache.set(cache_key, val)
            return val
    except Exception:
        pass
    cache.set(cache_key, 0.0)
    return 0.0
