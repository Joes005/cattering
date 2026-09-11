import re
import uuid


def slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "company"
    return f"{base}-{uuid.uuid4().hex[:6]}"
