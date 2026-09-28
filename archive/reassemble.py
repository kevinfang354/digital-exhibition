from pathlib import Path
import hashlib

ARCHIVE_DIR = Path(__file__).resolve().parent
DESTINATION = ARCHIVE_DIR.parent / "website.zip"
EXPECTED_SHA256 = "b108413c88b184508add432711d13534c176a73999b63937121e16430a7b6518"

digest = hashlib.sha256()
with DESTINATION.open("wb") as output:
    for name in ("website.zip.part01", "website.zip.part02"):
        with (ARCHIVE_DIR / name).open("rb") as part:
            while chunk := part.read(1024 * 1024):
                output.write(chunk)
                digest.update(chunk)

if digest.hexdigest() != EXPECTED_SHA256:
    DESTINATION.unlink()
    raise SystemExit("SHA-256 不匹配，请重新下载两个分卷。")

print(f"已恢复 {DESTINATION}，SHA-256 校验通过。")
