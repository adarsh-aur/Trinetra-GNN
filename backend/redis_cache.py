"""
redis_cache.py - Redis Cache Manager for Multi-Cloud GNN Threat Analyzer

Provides efficient caching with automatic expiration and memory management.
"""
import os
import json
import redis
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import hashlib


class RedisCache:
    """Redis cache manager with TTL and memory optimization"""
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        default_ttl: int = 3600,  # 1 hour default
        max_memory: str = "256mb",
        eviction_policy: str = "allkeys-lru"
    ):
        """
        Initialize Redis cache connection
        
        Args:
            host: Redis server host
            port: Redis server port
            db: Redis database number (0-15)
            password: Redis password if authentication is required
            default_ttl: Default time-to-live in seconds
            max_memory: Maximum memory (e.g., "256mb", "1gb")
            eviction_policy: Policy when max memory reached (allkeys-lru, volatile-lru, etc.)
        """
        self.default_ttl = default_ttl
        
        try:
            self.redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=False,  # We'll handle encoding ourselves
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            self.redis_client.ping()
            
            # Configure memory settings
            try:
                self.redis_client.config_set("maxmemory", max_memory)
                self.redis_client.config_set("maxmemory-policy", eviction_policy)
            except redis.ResponseError:
                print("⚠️ Unable to set memory config (requires admin privileges)")
            
            print(f"✅ Redis cache initialized: {host}:{port} (DB: {db})")
            print(f"   TTL: {default_ttl}s | Max Memory: {max_memory} | Policy: {eviction_policy}")
            
        except redis.ConnectionError as e:
            print(f"❌ Redis connection failed: {e}")
            print("   Cache operations will be disabled")
            self.redis_client = None
    
    def is_available(self) -> bool:
        """Check if Redis is available"""
        if self.redis_client is None:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False
    
    # ==================== RESULTS CACHING ====================
    
    def cache_results(
        self,
        results_data: Dict[str, Any],
        key_suffix: Optional[str] = None,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Cache results.json data with automatic expiration
        
        Args:
            results_data: Dictionary containing nodes, links, and metadata
            key_suffix: Optional suffix for the cache key (e.g., session ID)
            ttl: Time-to-live in seconds (uses default_ttl if None)
        
        Returns:
            True if cached successfully, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            # Generate cache key
            if key_suffix:
                cache_key = f"results:{key_suffix}"
            else:
                # Use hash of results as key
                results_hash = self._hash_dict(results_data)
                cache_key = f"results:{results_hash[:16]}"
            
            # Add timestamp to metadata
            if "metadata" not in results_data:
                results_data["metadata"] = {}
            results_data["metadata"]["cached_at"] = datetime.now(timezone.utc).isoformat()
            
            # Serialize to JSON
            json_data = json.dumps(results_data, ensure_ascii=False)
            
            # Store in Redis with TTL
            ttl_value = ttl if ttl is not None else self.default_ttl
            self.redis_client.setex(
                cache_key,
                ttl_value,
                json_data.encode('utf-8')
            )
            
            # Store metadata separately for quick lookups
            metadata_key = f"{cache_key}:meta"
            metadata = {
                "total_nodes": results_data.get("metadata", {}).get("analysis_summary", {}).get("total_nodes", 0),
                "total_links": results_data.get("metadata", {}).get("analysis_summary", {}).get("total_links", 0),
                "timestamp": results_data.get("metadata", {}).get("timestamp", "unknown"),
                "cached_at": results_data["metadata"]["cached_at"],
                "size_bytes": len(json_data)
            }
            self.redis_client.setex(
                metadata_key,
                ttl_value,
                json.dumps(metadata).encode('utf-8')
            )
            
            # Add to index for tracking all cached results
            self._add_to_index(cache_key, ttl_value)
            
            print(f"📦 Cached results: {cache_key} ({len(json_data)} bytes, TTL: {ttl_value}s)")
            return True
            
        except Exception as e:
            print(f"⚠️ Failed to cache results: {e}")
            return False
    
    def get_cached_results(
        self,
        key_suffix: Optional[str] = None,
        extend_ttl: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached results.json data
        
        Args:
            key_suffix: Optional suffix for the cache key
            extend_ttl: Whether to extend TTL on access (LRU behavior)
        
        Returns:
            Dictionary with results data or None if not found
        """
        if not self.is_available():
            return None
        
        try:
            # Determine cache key
            if key_suffix:
                cache_key = f"results:{key_suffix}"
            else:
                # Get latest result from index
                cache_key = self._get_latest_from_index()
                if not cache_key:
                    return None
            
            # Retrieve from Redis
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data is None:
                print(f"❌ Cache miss: {cache_key}")
                return None
            
            # Decode and parse JSON
            results = json.loads(cached_data.decode('utf-8'))
            
            # Extend TTL if requested
            if extend_ttl:
                self.redis_client.expire(cache_key, self.default_ttl)
                metadata_key = f"{cache_key}:meta"
                self.redis_client.expire(metadata_key, self.default_ttl)
            
            print(f"✅ Cache hit: {cache_key}")
            return results
            
        except Exception as e:
            print(f"⚠️ Failed to retrieve cached results: {e}")
            return None
    
    def get_all_cached_results(self) -> List[Dict[str, Any]]:
        """
        Retrieve all cached results (useful for dashboard/monitoring)
        
        Returns:
            List of all cached results with metadata
        """
        if not self.is_available():
            return []
        
        try:
            # Get all result keys
            pattern = "results:*"
            keys = self.redis_client.keys(pattern)
            
            # Filter out metadata keys
            result_keys = [k.decode('utf-8') for k in keys if not k.endswith(b':meta') and not k.endswith(b':index')]
            
            all_results = []
            for key in result_keys:
                try:
                    # Get metadata
                    meta_key = f"{key}:meta"
                    meta_data = self.redis_client.get(meta_key)
                    
                    if meta_data:
                        metadata = json.loads(meta_data.decode('utf-8'))
                        ttl = self.redis_client.ttl(key)
                        
                        all_results.append({
                            "cache_key": key,
                            "metadata": metadata,
                            "ttl_remaining": ttl
                        })
                except:
                    continue
            
            return sorted(all_results, key=lambda x: x["metadata"].get("cached_at", ""), reverse=True)
            
        except Exception as e:
            print(f"⚠️ Failed to retrieve all cached results: {e}")
            return []
    
    # ==================== FLUSH OPERATIONS ====================
    
    def flush_old_results(self, max_age_seconds: int = 3600) -> int:
        """
        Flush results older than specified age
        
        Args:
            max_age_seconds: Maximum age in seconds before deletion
        
        Returns:
            Number of entries deleted
        """
        if not self.is_available():
            return 0
        
        try:
            deleted_count = 0
            current_time = datetime.now(timezone.utc)
            
            # Get all cached results
            all_results = self.get_all_cached_results()
            
            for result in all_results:
                try:
                    cached_at_str = result["metadata"].get("cached_at")
                    if not cached_at_str:
                        continue
                    
                    cached_at = datetime.fromisoformat(cached_at_str.replace('Z', '+00:00'))
                    age = (current_time - cached_at).total_seconds()
                    
                    if age > max_age_seconds:
                        cache_key = result["cache_key"]
                        self._delete_result(cache_key)
                        deleted_count += 1
                        
                except Exception as e:
                    print(f"⚠️ Error processing result for flush: {e}")
                    continue
            
            if deleted_count > 0:
                print(f"🧹 Flushed {deleted_count} old results (age > {max_age_seconds}s)")
            
            return deleted_count
            
        except Exception as e:
            print(f"⚠️ Failed to flush old results: {e}")
            return 0
    
    def flush_by_pattern(self, pattern: str = "results:*") -> int:
        """
        Flush all keys matching a pattern
        
        Args:
            pattern: Redis key pattern (e.g., "results:*", "results:session_*")
        
        Returns:
            Number of entries deleted
        """
        if not self.is_available():
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            
            if not keys:
                print(f"ℹ️ No keys found matching pattern: {pattern}")
                return 0
            
            deleted_count = self.redis_client.delete(*keys)
            print(f"🧹 Flushed {deleted_count} entries matching pattern: {pattern}")
            
            return deleted_count
            
        except Exception as e:
            print(f"⚠️ Failed to flush by pattern: {e}")
            return 0
    
    def flush_all_results(self) -> bool:
        """
        Flush all cached results (nuclear option)
        
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            # Delete all result keys and metadata
            deleted = self.flush_by_pattern("results:*")
            print(f"🧹 Flushed all results cache ({deleted} entries)")
            return True
            
        except Exception as e:
            print(f"⚠️ Failed to flush all results: {e}")
            return False
    
    def flush_by_size(self, max_entries: int = 100) -> int:
        """
        Keep only the N most recent entries, flush the rest
        
        Args:
            max_entries: Maximum number of entries to keep
        
        Returns:
            Number of entries deleted
        """
        if not self.is_available():
            return 0
        
        try:
            all_results = self.get_all_cached_results()
            
            if len(all_results) <= max_entries:
                print(f"ℹ️ Cache size OK ({len(all_results)}/{max_entries})")
                return 0
            
            # Sort by cached_at timestamp (newest first)
            sorted_results = sorted(
                all_results,
                key=lambda x: x["metadata"].get("cached_at", ""),
                reverse=True
            )
            
            # Delete oldest entries
            deleted_count = 0
            for result in sorted_results[max_entries:]:
                cache_key = result["cache_key"]
                self._delete_result(cache_key)
                deleted_count += 1
            
            print(f"🧹 Flushed {deleted_count} oldest entries (keeping {max_entries} most recent)")
            return deleted_count
            
        except Exception as e:
            print(f"⚠️ Failed to flush by size: {e}")
            return 0
    
    # ==================== CACHE STATISTICS ====================
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive cache statistics
        
        Returns:
            Dictionary with cache statistics
        """
        if not self.is_available():
            return {"status": "unavailable"}
        
        try:
            info = self.redis_client.info()
            all_results = self.get_all_cached_results()
            
            total_size = sum(r["metadata"].get("size_bytes", 0) for r in all_results)
            
            stats = {
                "status": "available",
                "redis_version": info.get("redis_version"),
                "used_memory": info.get("used_memory_human"),
                "used_memory_peak": info.get("used_memory_peak_human"),
                "connected_clients": info.get("connected_clients"),
                "total_cached_results": len(all_results),
                "total_cache_size_bytes": total_size,
                "total_cache_size_mb": round(total_size / (1024 * 1024), 2),
                "evicted_keys": info.get("evicted_keys", 0),
                "expired_keys": info.get("expired_keys", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(
                    info.get("keyspace_hits", 0),
                    info.get("keyspace_misses", 0)
                )
            }
            
            return stats
            
        except Exception as e:
            print(f"⚠️ Failed to get cache stats: {e}")
            return {"status": "error", "message": str(e)}
    
    # ==================== HELPER METHODS ====================
    
    def _hash_dict(self, data: Dict[str, Any]) -> str:
        """Generate hash of dictionary for cache key"""
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()
    
    def _add_to_index(self, cache_key: str, ttl: int):
        """Add key to index for tracking"""
        try:
            index_key = "results:index"
            timestamp = datetime.now(timezone.utc).isoformat()
            self.redis_client.zadd(index_key, {cache_key: timestamp})
            self.redis_client.expire(index_key, ttl + 3600)  # Index lives longer
        except:
            pass
    
    def _get_latest_from_index(self) -> Optional[str]:
        """Get latest result key from index"""
        try:
            index_key = "results:index"
            latest = self.redis_client.zrange(index_key, -1, -1)
            if latest:
                return latest[0].decode('utf-8')
        except:
            pass
        return None
    
    def _delete_result(self, cache_key: str):
        """Delete result and associated metadata"""
        try:
            self.redis_client.delete(cache_key)
            self.redis_client.delete(f"{cache_key}:meta")
            
            # Remove from index
            index_key = "results:index"
            self.redis_client.zrem(index_key, cache_key)
        except:
            pass
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> str:
        """Calculate cache hit rate percentage"""
        total = hits + misses
        if total == 0:
            return "0%"
        rate = (hits / total) * 100
        return f"{rate:.2f}%"
    
    # ==================== CONTEXT MANAGER ====================
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.redis_client:
            self.redis_client.close()


# ==================== USAGE EXAMPLE ====================

if __name__ == "__main__":
    # Initialize cache
    cache = RedisCache(
        host="localhost",
        port=6379,
        default_ttl=3600,
        max_memory="256mb"
    )
    
    # Example results data
    sample_results = {
        "nodes": [{"id": 1, "name": "node1"}],
        "links": [{"source": 1, "target": 2}],
        "metadata": {
            "timestamp": "2025-10-25T10:00:00",
            "analysis_summary": {
                "total_nodes": 1,
                "total_links": 1
            }
        }
    }
    
    # Cache results
    cache.cache_results(sample_results, key_suffix="test_session")
    
    # Retrieve results
    cached = cache.get_cached_results(key_suffix="test_session")
    print(f"Retrieved: {cached is not None}")
    
    # Get statistics
    stats = cache.get_cache_stats()
    print(f"Cache stats: {json.dumps(stats, indent=2)}")
    
    # Flush operations
    cache.flush_old_results(max_age_seconds=1800)  # Flush entries older than 30 minutes
    cache.flush_by_size(max_entries=50)  # Keep only 50 most recent