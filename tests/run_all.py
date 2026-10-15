"""Runs every browser test against a fresh build and fails if any script fails, crashes or prints FAIL.
Some older scripts report problems by printing (FAIL ..., ERRORS [...]) rather than by their exit code.
Run: node build.mjs && python3 tests/run_all.py"""
import re, subprocess, sys
from pathlib import Path

TESTS = ["smoke", "checkoff", "batch", "batch2", "batch3", "cloud", "contrast", "hit", "pdf", "polish", "polish2",
         "standalone", "regimen", "program", "gsync", "gut", "supply"]
BAD = re.compile(r"^FAIL|Traceback|ERRORS \[.+\]|page errors \[.+\]", re.M)
here = Path(__file__).resolve().parent
failed = []
for t in TESTS:
    r = subprocess.run([sys.executable, str(here / f"{t}.py")], cwd=here.parent, capture_output=True, text=True, timeout=600)
    out = r.stdout + r.stderr
    bad = r.returncode != 0 or BAD.search(out)
    print(("FAIL " if bad else "ok   ") + t)
    if bad:
        failed.append(t)
        print("\n".join(l for l in out.splitlines() if BAD.search(l) or l.startswith("  "))[-3000:])
print(f"{len(TESTS) - len(failed)} of {len(TESTS)} passed")
sys.exit(1 if failed else 0)
