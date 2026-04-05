# Design Checklist

매번 디자인 변경 시 반드시 확인할 것.

## 대비 (Contrast)
- [ ] 텍스트/배경 대비 최소 4.5:1 (WCAG AA) — 가능하면 7:1 (AAA)
- [ ] muted-foreground도 배경 대비 3:1 이상
- [ ] 카드 위 텍스트가 카드 배경 대비 충분한지 확인

## 색상 (Strict 5-Color Palette — Tailwind Stone)
Core 5색만 사용. 이외 색상 추가 금지.
- [ ] Dark #1c1917 — 텍스트, primary, 버튼
- [ ] Mid #78716c — muted 텍스트, 보조 정보
- [ ] Soft #a8a29e — focus ring, 아이콘
- [ ] Light #e0ddd8 — 테두리, 구분선
- [ ] Red #dc2626 — destructive만
- [ ] Surface: #ffffff → #f8f7f5 → #f3f1ee → #f0eeeb → #e7e5e0 (밝기순)
- [ ] 그라디언트 금지 — 단색만
- [ ] 보라색/네온/glow/파란색 금지
- [ ] 깊이감은 배경색 단계 차이로

## 타이포그래피
- [ ] Pretendard Variable 폰트
- [ ] font-bold로 위계 표현 (제목 bold, 본문 normal)
- [ ] 제목 크기: text-3xl font-bold
- [ ] 본문: text-sm ~ text-base

## 여백 (Spacing)
- [ ] 페이지 패딩: py-8 px-10 (세로 32px, 가로 40px)
- [ ] 섹션 간격: space-y-6 ~ space-y-8 (24~32px)
- [ ] 카드 내부 패딩: p-5 ~ p-6 (20~24px)
- [ ] 그리드 gap: gap-4 ~ gap-6 (16~24px)
- [ ] 제목-설명 간격: mt-1 (4px)
- [ ] 카드 내 요소 간격: space-y-3 ~ space-y-4 (12~16px)
- [ ] 사이드바 nav 간격: space-y-1 (4px)
- [ ] 사이드바 패딩: p-6 (24px)
- [ ] 여백이 답답하지 않은지 시각적 확인

## 컴포넌트
- [ ] 모서리: 8px (rounded-lg)
- [ ] 그림자: 없음 또는 최소
- [ ] 아이콘: Lucide만, h-4 w-4 기본
- [ ] Badge: 검정 bg (primary), outline (secondary)
- [ ] Input 높이: h-10 (40px), 배경 흰색
- [ ] 테이블: 흰 배경, 헤더는 작은 대문자 muted, 행 구분 border만
- [ ] 빈 상태: 아이콘 + 텍스트 center py-20

## Uber 스타일 원칙
- [ ] 검정 텍스트 + 흰 카드 = 최대 대비
- [ ] 배경색 shift로 depth (카드 #fff vs 본문 #f7f7f8)
- [ ] 사이드바: 밝은 neutral 배경 + 진한 텍스트
- [ ] 장식 최소화 — 기능에 충실
- [ ] 색상은 의미 있을 때만 (빨강=삭제, 파랑=focus)
