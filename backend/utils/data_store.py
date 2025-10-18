# small helper to persist training examples and analysis reports
import json
import os
from datetime import datetime

DATA_DIR = "data_store"
os.makedirs(DATA_DIR, exist_ok=True)

def save_report(report: dict, name=None):
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    fname = name or f"report_{ts}.json"
    path = os.path.join(DATA_DIR, fname)
    with open(path, "w") as f:
        json.dump(report, f, indent=2)
    return path

def append_training_example(example: dict):
    path = os.path.join(DATA_DIR, "training_examples.jsonl")
    with open(path, "a") as f:
        f.write(json.dumps(example) + "\n")
    return path
