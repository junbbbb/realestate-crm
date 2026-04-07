# 설계 결정 기록

## 2026-04-06

### 1. 거래 관리 구조: deals 테이블 분리

**결정**: 매물(properties) ↔ 거래(deals) ↔ 고객(customers) 3개 엔티티 분리

**이유**:
- `is_my_listing` 플래그로는 크롤링 매물을 거래에 넣으면 원본 데이터 오염
- 같은 매물에 여러 거래 가능 (다른 고객)
- 거래 상태와 매물 상태는 별개

**구조**:
```
properties ←─ deals ──→ customers
(매물)     │   (거래)    │  (고객)
           ├ seller_id ──┤
           └ buyer_id ───┘
```

### 2. 고객 역할: buyer/seller/both

**결정**: customers.role 컬럼으로 구분

**이유**: 
- 같은 사람이 임대인이면서 다른 곳에선 임차인일 수 있음
- 거래 생성 시 seller/buyer 드롭다운에 역할별 필터링

### 3. 칸반 3단계: 거래전 → 거래중 → 거래완료

**결정**: 5단계(상담→투어→협상→완료→무산)에서 3단계로 축소

**이유**: 
- 이모가 비개발자, 단계가 많으면 관리 부담
- 메모로 세부 상태 기록 가능

### 4. 칸반 정렬: Trello 방식 (float position)

**결정**: `deals.position` float 컬럼

**정렬 규칙**:
- 새 거래: 컬럼 맨 위 (min - 1024)
- 드래그: (앞 + 뒤) / 2
- 상태 변경: 대상 컬럼 맨 위
- 수정: 위치 유지

### 5. 컬렉션: LocalStorage → Supabase

**결정**: collection-store를 Supabase 연동으로 이관

**이유**: 브라우저/기기 바뀌면 데이터 소실

### 6. 컬렉션 소프트 삭제

**결정**: `is_deleted` boolean 컬럼

**이유**: 실수로 삭제한 컬렉션 복원 가능. "삭제됨" 탭에서 확인/복원/영구삭제.

### 7. 네이버 상세 API: fin.land 선택

**결정**: new.land 대신 fin.land API 사용

**시행착오**:
- new.land: 데이터 풍부하지만 JWT 토큰 + 쿠키 필요, rate limit 공격적
- JWT secret "React Starter Kit" 발견했으나 쿠키 없이는 429
- IP 차단 장시간 지속

**결론**: fin.land basicInfo + agent API가 안정적

### 8. 네이버 지도 링크: lz-string layer 파라미터

**시행착오**:
- `new.land.naver.com/articles/{id}` → URL 형식 지원 안 함
- `fin.land.naver.com/article/{id}` → 페이지 없음
- layer 바이너리 분석 (protobuf, msgpack 등) → 전부 실패
- **해결**: lz-string `decompressFromEncodedURIComponent`로 JSON 디코딩 성공

### 9. 가격 표시: 원 단위 저장 + formatMoney 변환

**결정**: DB는 원 단위, UI는 formatMoney()로 "5억", "1,200만" 변환

**이유**: 네이버 API가 원 단위로 제공, 계산 정확성

### 10. 면적: 유형별 자동 판단

**문제**: 상가건물은 supplySpace=0, exclusiveSpace=0
**해결**: fallback 체인 — supply → floor → land
**표시**: 유형별 자동 라벨 (계약/전용, 대지/연면적)

### 11. 검색 debounce

**결정**: 300ms debounce (모듈 레벨 변수)

**시행착오**: 처음에 Zustand 상태 객체에 타이머 직접 저장 (type casting 해킹) → simplify에서 모듈 레벨 변수로 교체

### 12. Optimistic Update

**적용 범위**:
- 거래 상태 변경 (칸반 드래그/버튼)
- 컬렉션 추가/제거/이름변경
- 즐겨찾기 토글
- 메모 저장

**에러 처리**: DB 에러 시 loadDeals()/loadCollections()로 rollback

## 2026-04-07

### 13. Decodo 프록시 + curl_cffi 선택

**결정**: Vercel Python runtime에서 curl_cffi + Decodo 프록시로 네이버 API 호출

**이유**:
- 네이버 fin.land API는 TLS 지문(JA3)으로 봇 차단 → Python requests/httpx로는 403
- curl_cffi의 `impersonate="chrome"`이 실제 Chrome TLS 지문 생성
- Decodo: 한국 주거 IP 프록시 → 해외 서버(Vercel)에서도 한국 접속으로 인식
- Vercel Python runtime에서 curl_cffi 구동 가능 확인 완료

**대안 검토 (시도 순서)**:
- Vercel 직접 fetch: 해외 IP + TLS 지문 → 403/429 즉시 차단
- Oracle Cloud 한국 리전 VM: 데이터센터 IP 대역 → 봇으로 분류, 차단
- Bright Data 주거 프록시: IP는 통과하나 rate limit 공격적 (429)
- Decodo + Python requests: 프록시 IP 통과, TLS 지문이 Python → 403
- Playwright/Puppeteer: Vercel serverless에서 바이너리 크기 초과
- **최종**: Decodo + curl_cffi impersonate="chrome" → 한국 주거 IP + Chrome TLS 지문 = 성공

### 14. 사전 계산 랭킹 테이블 (price_change_rankings)

**결정**: 동기화 시 가격 변동 TOP을 미리 계산하여 별도 테이블에 저장

**이유**:
- 대시보드 로드마다 전체 properties 스캔 + 정렬하면 느림 (~20,000건)
- 랭킹은 크롤링 동기화 때만 변경됨 (1일 1~2회)
- 12행 고정 테이블 → 대시보드 쿼리 O(1)
- 전체 삭제 후 재삽입 방식으로 항상 최신 상태 보장

### 15. Supabase 네이버 상세 캐시

**결정**: naver_detail_cache 테이블에 상세 정보를 24시간 캐싱

**이유**:
- 네이버 API 호출은 프록시 비용 + rate limit 위험
- 같은 매물 상세를 여러 번 조회하는 패턴 (목록↔상세 왕복)
- 인메모리 캐시(5분)는 페이지 새로고침 시 소실
- DB 캐시(24시간)로 프록시 호출 최소화
- DB 레벨 자동 삭제는 미구현이나 `fetched_at` 인덱스가 존재하여 향후 확률적 정리 또는 cron 추가 가능
