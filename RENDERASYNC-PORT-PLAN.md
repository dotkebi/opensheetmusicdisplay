# renderAsync 이식 계획 (web OSMD 2.0.0, dotkebi fork)

## 목표
대형 오케스트라 악보 로드 시 메인 스레드 통블록(파싱+계산+드로잉)을 프레임 예산 단위로
쪼개, 02front 로딩 인디케이터가 얼지 않게 한다. osmd-dart(11osmd-dart)가 이미 한
renderAsync 작업을 web OSMD로 1:1 포팅.

## 브랜치/리모트
- fork: origin=https://github.com/dotkebi/opensheetmusicdisplay
- upstream=공식
- 작업 브랜치: renderAsync-2.0.0 (develop=2.0.0 기반)

## 핵심 설계 (osmd-dart 검증됨)
- **yield**: `await new Promise(r => setTimeout(r, 0))` (macrotask). queueMicrotask/Promise.resolve 금지(프레임 못 pump).
- **12ms 예산 협력 yielder**: 매 반복이 아니라 예산 초과 시에만 yield. self-tuning.
- **sync render()/calculate()/drawSheet()는 그대로 유지** — async는 별도 mirror 메서드. 재생/리사이즈 회귀 방지.
- 진행률: layout 0→0.65, draw 0.65→1.0 (osmd-dart 값).

## 이식 대상 (2.0.0 파일:라인)
1. **CooperativeYielder** 신규: src/Util/CooperativeYielder.ts (Dart cooperative_yielder.dart 포팅)
2. **MusicSheetCalculator**: src/MusicalScore/Graphical/MusicSheetCalculator.ts
   - calculate() @281 → calculateAsync(yielder, onProgress)
   - calculateXLayout() @329 → calculateXLayoutAsync (마디 컬럼별 yield, measureWidthFactor는 루프 밖 유지 = 파리티 필수)
   - calculateMusicSystems() @906 → calculateMusicSystemsAsync (skyline이 지배적)
   - calculateSkyBottomLines() @3187 → 셀별 yield
3. **MusicSheetDrawer**: src/MusicalScore/Graphical/MusicSheetDrawer.ts
   - drawSheet() @92 → drawSheetAsync (시스템별 yield)
   - drawMusicSystem() @316, drawMusicSystemComponents() @339
   - **함정: VexFlow 페이지 backend는 beginDrawPage/endDrawPage 훅 경유** (late backend 크래시). VexFlowMusicSheetDrawer가 override.
4. **GraphicalMusicSheet**: reCalculate() @194 → reCalculateAsync
5. **OpenSheetMusicDisplay**: src/OpenSheetMusicDisplay/OpenSheetMusicDisplay.ts
   - render() @268 → renderAsync(onProgress, yieldBudgetMs) — _renderAsyncInFlight 가드
   - load()에 onProgress (파싱 진행). web은 isolate 없으니 measure 루프에서 직접 yield.

## 02front 전환 (별도)
- package.json: opensheetmusicdisplay → git dependency (dotkebi fork#renderAsync-2.0.0 빌드 산출물)
- 1.9.7→2.0.0 API/동작 diff 점검 필요
- use-score-renderer.ts: loadScoreChunked/renderScoreChunked(런타임 복제) 제거 → 네이티브 renderAsync/load(onProgress) 사용
- 기존 런타임 패치 4개(perf/dynamics/cursor-playhead/vexflow-tick)가 2.0.0에서 여전히 필요한지 재점검 (perf-patch는 소스에 반영됐을 수 있음)
- 파리티 테스트 재작성

## 검증
- OSMD 자체 파리티 테스트: sync vs async draw-command 수 동일, 진행률 단조, 이벤트루프 회전(setInterval로 증명)
- 02front: 브라우저 실측(Beach Op.32)으로 SYNC eval 타임아웃 vs ASYNC 즉시응답 재확인

## 진행 상태
- [x] fork remote 설정, renderAsync-2.0.0 브랜치
- [x] npm install (osmd 빌드 의존성)
- [x] CooperativeYielder (src/Util/CooperativeYielder.ts, setTimeout(0) 기반)
- [x] calculateAsync 계열 (calculateAsync/calculateXLayoutAsync/calculateMusicSystemsAsync/calculateSkyBottomLinesAsync, measureWidthFactor carry 유지)
- [x] drawSheetAsync 계열 (base + VexFlow override, beginDrawPage/endDrawPage backend 훅 = late-backend 크래시 방지)
- [x] renderAsync (sync render() 정확 mirror, _renderAsyncInFlight 가드) + reCalculateAsync
- [ ] load onProgress (스킵 — 02front가 loadScoreChunked로 파싱 청크 이미 처리; 네이티브화는 후속)
- [x] 빌드 성공 (npm run build)
- [x] lint 통과 (npm run eslint)
- [x] OSMD 파리티 테스트 (test/Common/OSMD/OSMD_renderAsync_Test.ts, 4/4 통과: 출력동일/진행률단조/이벤트루프회전/재진입가드)
- [ ] 전체 OSMD 스위트 회귀 확인 (진행 중)
- [ ] fork 푸시 (사용자 승인 필요 — 외부 저장소)
- [ ] 02front git dependency 전환 (1.9.7→2.0.0 API diff 점검 포함)
- [ ] 02front 앱 코드 전환 (loadScoreChunked/renderScoreChunked 런타임 복제 제거 → 네이티브 renderAsync)
- [ ] 브라우저 검증 (Beach Op.32 실측)
