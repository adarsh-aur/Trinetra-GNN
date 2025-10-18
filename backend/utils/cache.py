# simple in-memory cache with optional file persistence
import json
import os
from time import time

CACHE_FILE = "cache.json"

class SimpleCache:
    def __init__(self):
        self._data = {}
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r") as f:
                    self._data = json.load(f)
            except Exception:
                self._data = {}

    def get(self, key, default=None):
        return self._data.get(key, default)

    def set(self, key, value):
        self._data[key] = value
        with open(CACHE_FILE, "w") as f:
            json.dump(self._data, f)

cache = SimpleCache()
