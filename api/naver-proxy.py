from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
from concurrent.futures import ThreadPoolExecutor

class handler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        article = params.get("articleNumber", [None])[0]
        real_estate = params.get("realEstateType", [None])[0]
        trade = params.get("tradeType", [None])[0]

        if not article or not real_estate or not trade:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "missing params"}).encode())
            return

        cookie = os.environ.get("NAVER_COOKIE", "")
        proxy_user = os.environ.get("PROXY_USER", "")
        proxy_pass = os.environ.get("PROXY_PASS", "")

        if not cookie or not proxy_user or not proxy_pass:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "env vars not set"}).encode())
            return

        try:
            from curl_cffi import requests as cffi_requests

            proxies = {
                "https": f"http://{proxy_user}:{proxy_pass}@gate.decodo.com:10001"
            }

            headers = {
                "accept": "application/json, text/plain, */*",
                "accept-encoding": "gzip, deflate, br, zstd",
                "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                "cookie": cookie,
                "priority": "u=1, i",
                "referer": "https://fin.land.naver.com/map",
                "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
            }

            base = "https://fin.land.naver.com/front-api/v1/article"
            basic_url = f"{base}/basicInfo?articleNumber={article}&realEstateType={real_estate}&tradeType={trade}"
            agent_url = f"{base}/agent?articleNumber={article}"

            def fetch(url):
                return cffi_requests.get(url, headers=headers, proxies=proxies, impersonate="chrome", timeout=15)

            with ThreadPoolExecutor(max_workers=2) as pool:
                basic_future = pool.submit(fetch, basic_url)
                agent_future = pool.submit(fetch, agent_url)
                basic_res = basic_future.result()
                agent_res = agent_future.result()

            basic_json = basic_res.json() if basic_res.status_code == 200 else None
            agent_json = agent_res.json() if agent_res.status_code == 200 else None

            result = {
                "basicInfo": basic_json.get("result") if basic_json and basic_json.get("isSuccess") else None,
                "agentInfo": agent_json.get("result") if agent_json and agent_json.get("isSuccess") else None,
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))

        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "proxy failed"}).encode())
