#!/usr/bin/env python3
"""Set a GitHub Actions repo secret via API (reads token from .git/config remote URL)."""
import base64
import json
import re
import sys
import urllib.request
from pathlib import Path

from nacl import encoding, public

REPO = "vahidaskari1365/DADBAN"


def token_from_git() -> str:
    cfg = Path("/home/z/my-project/.git/config").read_text()
    m = re.search(r"https://([^@]+)@github\.com/", cfg)
    return m.group(1) if m else ""


def api(method: str, url: str, token: str, payload: dict | None = None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode() or "{}"
        return r.status, json.loads(body)


def main() -> int:
    name, value = sys.argv[1], sys.argv[2]
    token = token_from_git()
    if not token:
        print("FAIL: no token in .git/config")
        return 1

    st, pk = api("GET", f"https://api.github.com/repos/{REPO}/actions/secrets/public-key", token)
    if st != 200:
        print(f"FAIL: public-key {st}")
        return 1

    key = public.PublicKey(pk["key"].encode(), encoding.Base64Encoder())
    sealed = public.SealedBox(key).encrypt(value.encode())
    payload = {
        "encrypted_value": base64.b64encode(sealed).decode(),
        "key_id": pk["key_id"],
    }
    st, _ = api("PUT", f"https://api.github.com/repos/{REPO}/actions/secrets/{name}", token, payload)
    print(f"{'OK' if st in (201, 204) else 'FAIL'}: {name} -> HTTP {st}")
    return 0 if st in (201, 204) else 1


if __name__ == "__main__":
    raise SystemExit(main())
