# Design System — BEST MOUNTAIN

## 브랜드

- **제품명**: BEST MOUNTAIN (부동산 매물 관리 CRM)
- **로고**: `/public/logo.svg` (산 아이콘)
- **로고 폰트**: Montserrat 900 (Black), tracking-wider
- **본문 폰트**: Pretendard Variable
- **Primary**: `#000000` (텍스트, 로고)

## 로고 사용

```tsx
<div className="flex items-center gap-1.5">
  <img src="/logo.svg" alt="Best Mountain" className="h-5 w-5" />
  <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900 }}>
    BEST MOUNTAIN
  </span>
</div>
```

## 색상 팔레트 (Strict 5-Color + Surface)

Core 5색만 사용. 이외 색상 추가 금지.

| 역할 | 색상 | 용도 |
|---|---|---|
| Dark | `#1c1917` | 텍스트, primary, 버튼 |
| Mid | `#78716c` | muted 텍스트, 보조 정보 |
| Soft | `#a8a29e` | focus ring, 아이콘 |
| Light | `#e0ddd8` | 테두리, 구분선 |
| Red | `#dc2626` | destructive만 |

**Surface 5단계** (밝기순):
`#ffffff` -> `#f8f7f5` -> `#f3f1ee` -> `#f0eeeb` -> `#e7e5e0`

## 금지 사항

- [ ] 그라디언트 금지 -- 단색만
- [ ] 보라색/네온/glow/파란색 금지
- [ ] 색상 추가 금지 (위 5색 + surface만)
- [ ] 깊이감은 배경색 단계 차이로

## 대비 (Contrast)

- [ ] 텍스트/배경 대비 최소 4.5:1 (WCAG AA) -- 가능하면 7:1 (AAA)
- [ ] muted-foreground도 배경 대비 3:1 이상
- [ ] 카드 위 텍스트가 카드 배경 대비 충분한지 확인

## 타이포그래피

- [ ] Pretendard Variable 폰트 (본문)
- [ ] Montserrat 900 (로고/브랜드 텍스트만)
- [ ] font-bold로 위계 표현 (제목 bold, 본문 normal)
- [ ] 제목 크기: text-3xl font-bold
- [ ] 본문: text-sm ~ text-base

## 여백 (Spacing)

- [ ] 페이지 패딩: py-4 px-4 md:px-6
- [ ] 섹션 간격: space-y-6 ~ space-y-8 (24~32px)
- [ ] 카드 내부 패딩: p-5 ~ p-6 (20~24px)
- [ ] 그리드 gap: gap-4 ~ gap-6 (16~24px)
- [ ] 사이드바 nav 간격: space-y-1 (4px)
- [ ] 사이드바 패딩: p-3 xl:p-6

## 컴포넌트

- [ ] 모서리: 8px (rounded-lg)
- [ ] 그림자: 없음 또는 최소
- [ ] 아이콘: Lucide만, h-4 w-4 기본 (모바일 탭 h-5 w-5)
- [ ] Badge: 검정 bg (primary), outline (secondary)
- [ ] Input 높이: h-10 (40px), 배경 흰색
- [ ] 테이블: 흰 배경, 헤더는 작은 대문자 muted, 행 구분 border만
- [ ] 빈 상태: 아이콘 + 텍스트 center py-20

## 레이아웃

- **사이드바**: hidden(mobile) / w-14 아이콘(md) / w-56 풀(xl+)
- **모바일**: 하단 탭 바 (5개: 대시보드/매물/저장/고객/설정)
- **상세 패널**: 우측 고정 380px (데스크톱), 오버레이 (모바일)
- **safe area**: pb-[calc(0.5rem+env(safe-area-inset-bottom))]

## 스타일 원칙

- [ ] 검정 텍스트 + 흰 카드 = 최대 대비
- [ ] 배경색 shift로 depth (카드 #fff vs 본문 #f7f7f8)
- [ ] 사이드바: 밝은 neutral 배경 + 진한 텍스트
- [ ] 장식 최소화 -- 기능에 충실
- [ ] 색상은 의미 있을 때만 (빨강=삭제/하락, 파랑=focus)
