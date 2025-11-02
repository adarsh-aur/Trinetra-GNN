# # 1st version simple in-memory cache with optional file persistence
# import json
# import os
# from time import time

# CACHE_FILE = "cache.json"

# class SimpleCache:
#     def __init__(self):
#         self._data = {}
#         if os.path.exists(CACHE_FILE):
#             try:
#                 with open(CACHE_FILE, "r") as f:
#                     self._data = json.load(f)
#             except Exception:
#                 self._data = {}

#     def get(self, key, default=None):
#         return self._data.get(key, default)

#     def set(self, key, value):
#         self._data[key] = value
#         with open(CACHE_FILE, "w") as f:
#             json.dump(self._data, f)

# cache = SimpleCache()

# 2nd version more advanced cache with TTL support
"""
Simple cache implementation with TTL support
"""
import time
from typing import Any, Optional


class SimpleCache:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self):
        self._cache = {}
        self._expiry = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache, return None if expired or not found"""
        if key in self._cache:
            # Check if expired
            if key in self._expiry and time.time() > self._expiry[key]:
                # Expired, remove it
                del self._cache[key]
                del self._expiry[key]
                return None
            return self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache with optional TTL (time-to-live in seconds)
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (None = never expires)
        
        Returns:
            True on success
        """
        self._cache[key] = value
        
        if ttl is not None:
            self._expiry[key] = time.time() + ttl
        elif key in self._expiry:
            # Remove expiry if ttl is None
            del self._expiry[key]
        
        return True
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
            return True
        return False
    
    def clear(self):
        """Clear all cache"""
        self._cache.clear()
        self._expiry.clear()
    
    def cleanup_expired(self):
        """Remove all expired entries (call periodically)"""
        now = time.time()
        expired_keys = [
            key for key, expiry in self._expiry.items()
            if now > expiry
        ]
        for key in expired_keys:
            self.delete(key)
        
        return len(expired_keys)


# Global cache instance
cache = SimpleCache()


# """
# Cache wrapper that supports both Redis and SimpleCache
# with unified TTL interface
# """

# import time
# from typing import Any, Optional

# try:
#     import redis
#     REDIS_AVAILABLE = True
# except ImportError:
#     REDIS_AVAILABLE = False


# class SimpleCacheWithTTL:
#     """
#     Simple in-memory cache with TTL support
#     Compatible with the cve_scorer.py requirements
#     """
#     def __init__(self):
#         self._cache = {}
#         self._expiry = {}
    
#     def get(self, key: str) -> Optional[Any]:
#         """Get value from cache, return None if expired or not found"""
#         if key in self._cache:
#             # Check if expired
#             if key in self._expiry and time.time() > self._expiry[key]:
#                 # Expired, remove it
#                 del self._cache[key]
#                 del self._expiry[key]
#                 return None
#             return self._cache[key]
#         return None
    
#     def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
#         """
#         Set value in cache with optional TTL (time-to-live in seconds)
        
#         Args:
#             key: Cache key
#             value: Value to cache
#             ttl: Time to live in seconds (None = never expires)
        
#         Returns:
#             True on success
#         """
#         self._cache[key] = value
        
#         if ttl is not None:
#             self._expiry[key] = time.time() + ttl
#         elif key in self._expiry:
#             # Remove expiry if ttl is None
#             del self._expiry[key]
        
#         return True
    
#     def delete(self, key: str) -> bool:
#         """Delete key from cache"""
#         if key in self._cache:
#             del self._cache[key]
#             if key in self._expiry:
#                 del self._expiry[key]
#             return True
#         return False
    
#     def clear(self):
#         """Clear all cache"""
#         self._cache.clear()
#         self._expiry.clear()
    
#     def cleanup_expired(self):
#         """Remove all expired entries"""
#         now = time.time()
#         expired_keys = [
#             key for key, expiry in self._expiry.items()
#             if now > expiry
#         ]
#         for key in expired_keys:
#             self.delete(key)


# class RedisCacheWithTTL:
#     """
#     Redis cache wrapper with TTL support
#     """
#     def __init__(self, host='localhost', port=6379, db=0):
#         self.redis_client = redis.Redis(
#             host=host,
#             port=port,
#             db=db,
#             decode_responses=True
#         )
    
#     def get(self, key: str) -> Optional[Any]:
#         """Get value from Redis cache"""
#         import json
#         value = self.redis_client.get(key)
#         if value is not None:
#             try:
#                 return json.loads(value)
#             except json.JSONDecodeError:
#                 return value
#         return None
    
#     def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
#         """
#         Set value in Redis cache with optional TTL
        
#         Args:
#             key: Cache key
#             value: Value to cache
#             ttl: Time to live in seconds (None = never expires)
        
#         Returns:
#             True on success
#         """
#         import json
        
#         # Serialize value
#         if not isinstance(value, str):
#             value = json.dumps(value)
        
#         if ttl is not None:
#             return self.redis_client.setex(key, ttl, value)
#         else:
#             return self.redis_client.set(key, value)
    
#     def delete(self, key: str) -> bool:
#         """Delete key from Redis cache"""
#         return bool(self.redis_client.delete(key))
    
#     def clear(self):
#         """Clear all Redis cache (be careful!)"""
#         self.redis_client.flushdb()


# # Initialize cache based on availability
# def get_cache():
#     """
#     Get cache instance - tries Redis first, falls back to SimpleCache
#     """
#     import os
    
#     if REDIS_AVAILABLE:
#         try:
#             redis_host = os.getenv('REDIS_HOST', 'localhost')
#             redis_port = int(os.getenv('REDIS_PORT', 6379))
            
#             cache_instance = RedisCacheWithTTL(host=redis_host, port=redis_port)
            
#             # Test connection
#             cache_instance.redis_client.ping()
            
#             print("✅ Using Redis cache")
#             return cache_instance
#         except Exception as e:
#             print(f"⚠️  Redis not available ({e}), using SimpleCache")
    
#     print("✅ Using SimpleCache (in-memory)")
#     return SimpleCacheWithTTL()


# # Global cache instance
# cache = get_cache()


# # Backward compatibility with old SimpleCache interface
# class SimpleCache:
#     """
#     Wrapper for backward compatibility
#     Redirects all calls to the global cache instance
#     """
#     @staticmethod
#     def get(key: str) -> Optional[Any]:
#         return cache.get(key)
    
#     @staticmethod
#     def set(key: str, value: Any, ttl: Optional[int] = None) -> bool:
#         return cache.set(key, value, ttl=ttl)
    
#     @staticmethod
#     def delete(key: str) -> bool:
#         return cache.delete(key)
    
#     @staticmethod
#     def clear():
#         return cache.clear()
