#!/usr/bin/env python3
"""
Chrome에 로그인된 네이버 쿠키를 자동 추출해서 .env.local에 NAVER_COOKIE로 저장.

macOS 전용. Chrome의 Cookies SQLite DB를 읽고 macOS Keychain의
"Chrome Safe Storage" 키로 AES-CBC 복호화한다.

사용법:
    python3 scripts/extract-naver-cookie.py              # Default 프로파일
    python3 scripts/extract-naver-cookie.py "Profile 1"  # 다른 프로파일 지정

실행 전 Chrome은 꺼도 되고 켜져 있어도 된다 (DB는 복사본으로 읽음).

의존성:
    pip3 install --user pycryptodome
"""
import os
import sys
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path

try:
    from Crypto.Cipher import AES
    from Crypto.Protocol.KDF import PBKDF2
except ImportError:
    sys.exit("pycryptodome이 필요합니다: pip3 install --user pycryptodome")


CHROME_ROOT = Path.home() / "Library/Application Support/Google/Chrome"
ENV_PATH = Path(".env.local")
REQUIRED_NAMES_HINT = ("NID_AUT", "NID_SES", "NID_JKL")


def load_keychain_password() -> bytes:
    out = subprocess.check_output(
        ["security", "find-generic-password", "-w", "-s", "Chrome Safe Storage"]
    )
    return out.strip()


def derive_key(password: bytes) -> bytes:
    return PBKDF2(password, b"saltysalt", dkLen=16, count=1003)


def decrypt(value: bytes, key: bytes) -> str:
    if not value:
        return ""
    if value[:3] in (b"v10", b"v11"):
        cipher = AES.new(key, AES.MODE_CBC, IV=b" " * 16)
        dec = cipher.decrypt(value[3:])
        dec = dec[: -dec[-1]]  # PKCS#7 unpad
        try:
            return dec.decode("utf-8")
        except UnicodeDecodeError:
            # Chrome v20+ prefixes 32-byte SHA256 integrity hash
            return dec[32:].decode("utf-8", errors="replace")
    return value.decode("utf-8", errors="replace")


def extract(profile: str = "Default") -> str:
    db_src = CHROME_ROOT / profile / "Cookies"
    if not db_src.exists():
        sys.exit(f"Cookies DB 없음: {db_src}")

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        shutil.copyfile(db_src, tmp.name)
        db_tmp = tmp.name

    try:
        key = derive_key(load_keychain_password())
        conn = sqlite3.connect(db_tmp)
        cur = conn.cursor()
        cur.execute(
            "SELECT host_key, name, encrypted_value FROM cookies "
            "WHERE host_key LIKE '%naver.com%'"
        )
        pairs = []
        names = []
        for host, name, enc in cur.fetchall():
            val = decrypt(enc, key)
            pairs.append(f"{name}={val}")
            names.append(name)
        conn.close()
    finally:
        os.unlink(db_tmp)

    if not pairs:
        sys.exit(f"{profile} 프로파일에 naver.com 쿠키가 없습니다.")

    has_login = any(n.startswith("NID") for n in names)
    print(f"[{profile}] naver 쿠키 {len(pairs)}개 추출", file=sys.stderr)
    if not has_login:
        print(
            "  경고: NID_* 로그인 쿠키가 없습니다. 네이버에 로그인이 안 돼있거나\n"
            "        다른 프로파일일 수 있습니다.",
            file=sys.stderr,
        )
    return "; ".join(pairs)


def write_env(cookie: str) -> None:
    lines = []
    found = False
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            if line.startswith("NAVER_COOKIE="):
                lines.append(f"NAVER_COOKIE={cookie}")
                found = True
            else:
                lines.append(line)
    if not found:
        lines.append(f"NAVER_COOKIE={cookie}")
    ENV_PATH.write_text("\n".join(lines) + "\n")
    print(f".env.local에 NAVER_COOKIE 기록 완료 ({len(cookie)} bytes)")


def main():
    profile = sys.argv[1] if len(sys.argv) > 1 else "Default"
    cookie = extract(profile)
    write_env(cookie)


if __name__ == "__main__":
    main()
