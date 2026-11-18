// ==UserScript==
// @name         DLsite 언어 고정 + 일본 이벤트 + 할인 배너만
// @namespace    dlsite-locale-filter
// @version      0.54.0
// @updateURL    https://raw.githubusercontent.com/kkjapi040828-commits/dl-helper/main/dlsitehelper.user.js
// @downloadURL  https://raw.githubusercontent.com/kkjapi040828-commits/dl-helper/main/dlsitehelper.user.js
// @description  (테스트중: 0.38~0.41 실제 폰 확인 전) 사이트 원래 화면은 그대로 두고: 언어 고정, 이벤트 페이지 자동 일본어, 할인 외 배너 숨김, 목록 할인·쿠폰 필터·성우 표시 (성능·태그 검색 최적화).
// @match        https://www.dlsite.com/*
// @match        https://play.dlsite.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @run-at       document-start
// @noframes
// ==/UserScript==

/*
 * 구조 (위에서 아래 순서로 실행된다)
 *   1. CONFIG   상수와 설정 기본값. 바꿀 일이 생기면 여기만 고친다.
 *   2. store    설정·캐시 저장(GM 저장소).
 *   3. route    지금 주소가 어떤 페이지인지 판별.
 *   4. locale   언어 쿠키 고정, 이동 직전 쿠키 미리 쓰기.
 *   5. redirect 검색 주소에 조건(할인중, 한국어)을 붙여 한 번만 이동. (쿠폰 대상 페이지에는 할인중 조건을 붙이지 않는다)
 *   5.6 kw      한국어 태그 이름 검색어에 일본어 태그 이름을 '또는'으로 붙임.
 *   6. clean    배너·다른 층·쿠폰 팝업 숨김(원래 화면에서 빼기만 함).
 *   7. list     목록 상단 바(한 줄): 쿠폰 · 정렬 · ↺ · 개수(쿠폰 켠 때만). 아래 고정 필터/적용 버튼. 카드: 형식 칸 · 품번 · DLW · 칩 줄(마감·쿠폰·묶음) · ♥.
 *   7.6 fav     카드 ♥(사이트 즐겨찾기). 7.7 sbox 사이트 검색창 아래 목록(저장한 검색 · 자주 쓰는 태그 · 최근 · 태그 후보).
 *   8. voice    성우: 음성 작품 카드에 있는 이름을 쓰고, 없을 때만 작품 정보를 받아 카드에 붙임.
 *   9. jaFetch  일본어 화면을 받아 일본 할인 배너·이벤트 목록을 만듦.
 *  10. panel    설정 버튼과 바텀 시트 설정 창.
 *  10.5 play    DLsite Play(play.dlsite.com)에서 작품 숨기기(Play 자체 비표시)·품번 띠. Play에서는 이것만 돈다.
 *  11. boot     시작과 화면 변화 감시.
 *
 * 0.54.0
 *   - 마이페이지 구입 이력·라이브러리(/mypage/userbuy·library): 카드마다 ♡, 꾹 누르면 내 태그·메모 시트, 위 칩 줄(전체·♡·메모·#태그), ⋯ 내보내기/가져오기. 이 기기 저장, 요청 없음. 로그인 화면이라 실제 구조는 못 봄(품번 링크로 카드를 찾음).
 *   - 바꾼 함수: lib(새)·libLongPress(새), route.isLib, tidy, CSS(#dllib·.dllh·#dllsh).
 * 0.53.0
 *   - 번역 허가 목록: 언어 칩(한국어 기본)+'신청 1↑·판매 0' 걸러내기(응답 가로채기, 요청 수 그대로). 번역 ○/✕ 딱지(목록 카드·작품 페이지). 이름 꾹=검색·검색어 저장·차단 메뉴. 메뉴에 빠른 차단·스위치·화면 저장. 첫 화면 DLW.
 *   - 바꾼 함수: reviewNewest(trFix), trBar·workTrans·homeDlw·nameMenu·nameLongPress(새), voice.putCoupons·agreeFor, list.row·nameChip, views.menu·blockForm, CSS(#dltr·.dltg·.dlwt·#dlnmm).
 * 0.52.0
 *   - TL·BL은 따로(필터 표에서 다른 층 칸을 누르면 층이 바뀜). DLW 꾹 = 품번 팝업(복사, 바깥 누르면 닫힘), 작품 페이지에도 DLW. 장바구니 칩 줄 아래 여백. 만화 필터에서 발매 예정·만화 아닌 작품 숨김.
 *   - 바꾼 함수: typeTable.pickCell, list.dlw·dlwPop(새), workDlw(새), list.apply, CSS(#dlwp·.dlwk).
 * 0.51.2
 *   - 쿠폰·묶음은 목록 카드에서 형식 딱지 옆(C안), 장바구니는 언어 딱지 줄 맨 뒤(묶음→쿠폰). 알약이 장바구니·작품 페이지 아래 구매 줄 위로. '나중에 산다' 링크 배경 없음, DLW 28→22px.
 *   - 바꾼 함수: list.row·deco·chips, buildPanel(liftNav), CSS(.dlcpn·.dlw·cart_item_foot).
 * 0.51.1
 *   - 작품 페이지: 유저 리뷰를 구매 상자 바로 아래로(CSS order, 사이트 노드는 안 옮김) + 리뷰 요청을 신착순(order=regist_d)으로. 설정 '작품 화면: 리뷰 먼저'로 끔(요청 수 그대로).
 *   - 바꾼 함수: reviewNewest(새), applyReviewFirst(새), tidy, 설정 창 스위치, CSS(html.dlh-rv).
 * 0.51.0
 *   - 필터 창: 맨 위 '태그 찾기'(누르면 자주 쓰는 태그 → 가나다순 묶음) + 정렬 줄을 필터 안으로. 서클·못 바꾸는 화면은 정렬 줄만 회색.
 *   - 사이트 아래 고정 메뉴가 올라오면 알약(필터·한/일)도 그 위로 올라가 안 겹침.
 *   - 바꾼 함수: list.filterSpec·filterCount, tagChip(새), views.filter·genre, buildPanel(liftNav), CSS(#dlh bottom, .gh.find.top, .vs.srt).
 * 0.50.3
 *   - 정리(동작·화면 변화 없음): 안 쓰는 코드 삭제 — sheet.openSale·openFloor·openLang·opt, list.fitRank, NON_SORT_PAGE·RATE_STEPS, 아이콘 tk·ct, 필터 창 band, 안 쓰는 CSS 24줄(.dlrank·.dlbs·띠 쿠폰·.band·.gn·#dlsheet .op/.g2~4/.bx 등).
 * 0.50.2
 *   - 사용자 편집 시안(guide/ui-0.50-사용자편집본.png) 반영: 형식 칸(사이트 색) 왼쪽 + 품번, 할인율 칸은 가격 왼쪽 같은 줄, 그 아래 칩 줄(마감·쿠폰·묶음), ♥ + 노란 '카트에 넣기', 장바구니·랭킹도 오른쪽 칸 맨 위에 형식·품번·DLW 줄.
 *   - DLW 원 28px(즐겨찾기 사이트 ⋮ 버튼도 28px로 같게). 설정 '할인 딱지 크기'(작게·보통·크게). 칩 글자 위아래 가운데.
 * 0.50.1
 *   - 사용자 결정: ♥·카트 버튼은 옛 0.46 B안(작은 52px 두 개, 가운데)으로 되돌림, 형식 칸(보이스·만화)은 줄 오른쪽, 할인율 칸은 작게(옛 크기 근처), 할인 없는 카드도 가격 아래 줄 자리를 비워 둠.
 *   - 고침: 즐겨찾기 폴더 칩이 'PC판 DLsite로'로 덮어써지던 것(같은 폴더 번호의 다른 링크 글자).
 * 0.50.0
 *   - 카드 시안(사용자): 제목 위 줄 = 품번 · 형식(사이트 색 그대로) · DLW 원, 쿠폰·묶음은 가격 아래 칩(쿠폰 파랑·묶음 보라), ♥·카트는 큰 알약 버튼. 장바구니 [고르기]는 처음에 체크가 없고 체크한 것만 카트에 남김.
 *   - 장바구니·즐겨찾기 가격 옆 마감 칸(오늘 마감 빨간 테두리·3일 안 주황·그 뒤 회색). 즐겨찾기의 빨간 마감 띠는 이 칸으로 대신. 장바구니도 쿠폰·묶음 칩.
 *   - 바꾼 함수: list.deco·row·chips(새)·due(새), cart.pickTap·paint, CSS(.dlrow·.dlty·.dlch·.dldue·.dlact·.dlsl).
 * 0.49.2
 *   - 장바구니·즐겨찾기: 사이트가 카드를 늦게(몇 초 뒤) 다시 그리면 DLW 줄이 지워진 채 남던 것 → 불러온 뒤 1·3·6초에 한 번씩 다시 붙임(list.decoMy).
 * 0.49.1
 *   - 정렬 창: 줄을 꾹 누르면 집어 올리고, 옮길 자리를 누르면 그 앞으로 간다(순서는 저장). 띠에 성우 2명까지(각자 짧게 복사·꾹 검색). DLW는 오른쪽 가장자리에 크게, 형식 띠 아래 빈틈을 줄임.
 *   - 바꾼 함수: sheet.openSort, list.person·nameChip·deco, CSS(.dlrow·work_categories).
 * 0.49.0
 *   - 카드: 사진 띠 = CV(음성)·작가(만화 등, 짧게 복사·꾹 검색) + 쿠폰·묶음, 제목 위 줄 = 품번·DLW, 할인율 크게, 쿠폰은 분홍. 즐겨찾기·장바구니도 장식(이름 띠 없음).
 *   - 장바구니 아래 [고르기] → 살 것만 체크 → [적용]이 사이트 '나중에 산다'·'카트로' 링크를 차례로 누름. 즐겨찾기 = 우리 바(폴더·정렬·쿠폰, 종료임박은 할인만·100개로 열고 마감순으로 다시 줄 세움), ♥ 꾹 = 폴더로 옮기기.
 *   - 바꾼 함수: list.deco·row·person(새)·nameChip(새)·decoMy(새)·wishSort(새)·mount·filterSpec·syncFab, cart.rows·pick*(새), fav.toggle·folders·folder·moveTo(새), WSORTS·wishPath·wishGet(새), sheet.openSort, route.isWish·isMy, CSS.
 * 0.48.0
 *   - 기본 대상 없음(work_category/all = 모든 형식, 만화 태그도 만화가 나옴). 모든 목록에서 필터 창 전부: 서클은 주소에 붙이고, 할인·독점·장르·형식 목록은 같은 검색으로 넘어감(fsrOf), 못 쓰는 칸은 회색.
 *   - 필터 버튼 꾹 = 정렬 창. 설정 '품번 표시'(기본 꺼짐, 끄면 딱지 없는 카드는 줄도 빠짐). 바꾼 함수: DEF_FLOOR·floorUnset·floorPairs·urlSale·urlRate·fsrOf(새)·list.filterSpec·list.row·views.filter·#dlfb, CSS .dis.
 * 0.47.3
 *   - 로그아웃 화면에 ♥가 다 나오던 것(0.47.1에서 생김) 고침: 로그인 '모름'을 로그인으로 치지 않음, 쿠키 이름 loginchecked 추가. 바꾼 함수: fav.ok·fav.loginNow.
 *   - 마감 날짜 연도 추정(list.parseEnd)·성우 실패 목록 상한(voice._capDead·_capTries).
 * 0.47.2
 *   - 성능: ResizeObserver가 사이트가 카드를 새로 그릴 때마다 옛 노드를 계속 관찰해 쌓이던 것(메모리·발열) → 끊어진 노드만 골라 해제(list._sweepRo, 400개 넘을 때만 훑음).
 *   - 성능: MutationObserver가 돌 때마다 list.items() 전체를 다시 훑던 것 → 카드 목록이 실제로 바뀌었을 때만 무효화(list.invalidateIfStale, 링크 개수·연결 여부로 싸게 비교).
 *   - 바꾼 함수: list.watch·_sweepRo(새 함수)·invalidate·invalidateIfStale(새 함수)·items, tidy.
 * 0.47.1
 *   - 카드 ♥(즐겨찾기)가 안 보이던 것 고침: 로그인 판정이 로그아웃 링크·dlloginjp 쿠키뿐이라 폰에서 둘 다 없으면 즐겨찾기 0개 계정은 ♥를 아예 안 그렸다.
 *   - 2026-11-07 실제 확인: 로그아웃 화면에도 /mypage·/logout 링크가 HTML에 다 있어서 링크로는 로그인 판정이 안 된다 → 서버가 준 favorites(c.ok) + 로그인 쿠키/보이는 로그인 링크로 판정.
 *   - 바꾼 함수: fav.ok·fav.login·fav.loginNow(새 함수).
 * 0.47.0
 *   - 정렬을 사이트 정렬 창의 10개로 맞춤(종료일 가까운 순·발매일 오래된 순·가격 높은 순이 없었다). 할인 개시/종료순은 이제 언제나 보인다.
 *   - 필터 창에 '태그 찾기' 버튼을 되살림(0.46.0 필터 압축 때 빠져서 태그 검색 화면에 들어갈 길이 없었다).
 *   - PC 목록 카드의 사이트 '카트에 추가·즐겨찾기에 추가' 버튼을 숨김(우리 ♥·장바구니 줄과 겹쳐 두 줄로 보였다).
 *   - 바꾼 함수: SORTS·SORT_NAME, sheet.openSort, views.filter(genreBox), CSS(.dlhas .work_operation_btn, .gh.find).
 * 0.46.2
 *   - 설정에 '썸네일 흐리게' 스위치 추가(기본 꺼짐). 켜면 목록·장바구니 사진과 작품 화면 표지가 흐려지고(12px, 표지 20px) 품번·딱지 글자는 그대로.
 *   - 작품 화면의 샘플 사진(_img_smp1~)은 안 흐린다(사용자 결정: "뒤에 나오는 이미지들 말고"). 끄면 새로고침 없이 바로 원래대로.
 *   - 바꾼 함수: applyThumbBlur(새 함수), tidy, buildPanel(설정 스위치), CSS(.dlh-blur).
 * 0.46.1
 *   - 카드 맨 아래 ♥·장바구니 줄을 좁힘: 버튼 52px 고정·가운데(전엔 카드 절반 141px), 아이콘 22→17px, 줄 높이 36→28px.
 *   - 바꾼 함수: 없음(CSS `.dlact`만). 시안 `guide/ui-0.46-카드아이콘.png` B안.
 * 0.46.0
 *   - 필터 창을 '표 + 왼쪽 라벨'로 압축: 대상×작품 종류 표(칸 하나씩, 계단은 네 칸으로 넓힘), 언어·연령·가격·할인은 띠 대신 왼쪽 라벨 한 줄. 세로 약 190px 줄어듦.
 *   - 정렬 칩을 검색이 아닌 목록(할인·독점·장르·서클)에도 켬 — 주소에 order/값(검색은 order%5B0%5D/값). 작품 형식 목록만 사이트가 정렬을 무시해서 흐린 칩.
 *   - 연령(R18·R15·전연령 = age_category[0])·가격(~500·~1000·1000~·3000~ = price_low/price_high, 진짜 이하·이상) 조건 추가.
 *   - 바꾼 함수: views.filter(압축 배치·typeTable), filterSpec(age·price), filterCount, sortChip·goOrder·siteOrder·nonSearchOrder(새 함수), CSS(.lr·.mx·.fx).
 * 0.45.0
 *   - 목록 위 '검색 조건 저장'·정렬/격자 줄·개수(보이는/전체) 숨김. 이모지·글자 기호 아이콘을 선 아이콘으로(LINE, icon()). 태그 가나다순.
 *   - 카드: 묶음 = 보라 바탕 흰 글자, 맨 아래 줄 ♥·장바구니 아이콘(.dlact, 사이트 a.btn_cart를 대신 누름). 바로가기 줄을 누르면 편집(scadd), ≡ 끌기는 순서.
 *   - 바꾼 함수: icon·list.row·list.apply·views.shortcuts/scadd/filter/genre·tags.favs.
 * 0.44.0
 *   - 색을 분홍으로(켜진 것 = 연분홍 #f6e5eb + 분홍 글자 #d76088, 진분홍은 적용·토글·배지), 칩·알약 둥글게, 아이콘·글자 위아래·좌우 가운데(inline-flex 버튼에 justify-content 빠져 왼쪽 쏠리던 것).
 *   - 언어 불필요(NM)를 안 붙임(한국어 기본·언어 칩·서클). 사이트 제목의 언어 글자 제거(tidyTitle), 사이트 검색창·미구입만 토글 모양만 CSS로.
 * 0.43.0
 *   - BL 검색이 안 나오던 것 수정: TL/BL은 sex_category가 아니라 주소의 층(/girls ↔ /bl). /girls 에 gay를 붙이면 거의 0건이었다.
 *   - 위 바는 쿠폰·정렬(고른 이름)·↺·개수(보이는/전체)만. 대상·언어·할인은 필터 창(대상→형식→언어→할인→장르 접기·꾹 누르면 즐겨찾기).
 *   - 바뀐 함수: floorOf·withFloor·floorRead·floorPairs·filterSpec·kw.load(그룹)·tags(그룹)·list.mount(바)·syncFab·apply(개수)
 *
 * 0.42.2
 *   - 칩 줄: 그 화면에서 못 쓰는 칩(대상·언어·정렬)은 빼지 않고 흐리게 자리만 둔다(화면마다 줄 모양이 같게).
 *
 * 0.42.1
 *   - 아래 한/일 알약: 스크롤해도 숨거나 움직이지 않고 고정(애니메이션·scroll 감시 삭제).
 *
 * 0.42.0
 *   - 시안 ui-0.42: 카드(품번 위 틈 줄임, サンプル/カート 줄·빨간 할인 띠 숨김, 할인율은 가격 옆 딱지), 칩은 글자 폭+▾·가로 스크롤, 아래 한/일 알약은 내려갈 때 숨김(0.42.1에서 고정으로 바뀜).
 *   - 필터 버튼 = 우리 필터 창(대상·형식·장르·할인·언어, 🔖 사이트 검색 조건 저장·리셋·검색하기). 메뉴(바로가기 칸·이벤트)·설정(묶음)·차단(서클·성우·작가 칸)·바로가기 편집(끌기·지우기·추가) 새로 그림.
 *   - buildPanel 다시 씀, list.filterSpec·saleTag·syncFab, 바로가기 기본에 검색조건. 저장 키는 그대로(shortcuts.custom·block.list) + block.kind.
 *
 * 0.41.3
 *   - 대상 칩 형식을 망가·ASMR·보이스 3칸으로(주소 work_category × work_type_category comic·audio). 기본 = TL + ASMR·보이스(동인·드라마 × audio, 전엔 동인 보이스만). SEXES·FORMS·floorRead·floorPairs, floorChip·sheet.openFloor.
 *
 * 0.41.2
 *   - 검색 기본 조건: 신작순(order/release_d)·TL+보이스(sex_category female + work_type SOU)를 주소에 없으면 붙임(이름 검색·쿠폰 대상 제외). 사이트 검색창(from/fs.header)의 trend·TL+BL도 바꿈. DEF_ORDER·DEF_FLOOR, searchRedirectTarget·floorChip·sortChip·goOrder·resetAll.
 *
 * 0.41.1
 *   - 태그 후보·자주 쓰는 태그 = 태그 이름(한·일)으로 글자 검색(제목·본문·태그 모두, 태그 번호보다 2배쯤 많음). '#'로 시작할 때만 태그 번호. tags.word·words, sbox.parts, list.openBulk.
 *   - '#근친'처럼 태그가 아니면 #를 떼고 글자 검색(전엔 0개). 여러 단어는 단어마다 일본어를 붙임, 태그 아닌 짝 KW_EXTRA(근친|近親). kw.expand·expandOne·before.
 *
 * 0.41.0
 *   - 새 화면 구조: 칩 5칸(대상·언어·할인·쿠폰·정렬) 한 줄, 칩=팝업·✕=끄기. 아래 고정 '필터 N/적용' + 한/일 알약(꾹=메뉴, ⚙=설정). 사이트 정렬·선택 조건 줄·'작품 페이지로' 숨김.
 *   - 없앰: 칩 순서·보이기 설정, 상태 구역, 알약 끌기(위치 고정), 필터·↺ 칩. list.syncFab·onApply.
 *
 * 0.40.0
 *   - 칩을 글자(켜기/끄기)와 ▾(목록)로 나눔. 정렬을 칩으로 분리(인기·신작·할인 개시·저가·판매·리뷰·평가). 검색 화면에서 고른 조건은 '적용'에서 한 번에 연다. list.staged·curPath·stage·sortChip.
 *
 * 0.39.2
 *   - 층 칩: 코믹→망가, ASMR 칸 추가(주소 work_type/SOU, 동인·드라마 안의 작품 형식). 검색창 '#임신,순애' = 태그 번호 검색(쉼표로 여러 개, 그리고). tags.goAll·parse.
 *   - 필터 칩은 줄 3개 아이콘. 품번 줄 여백 줄임. 저장한 검색 보관 1시간 → 5분.
 *
 * 0.39.1
 *   - 묶음 할인 화면에 검색 칩: 글자(한국어 태그 이름이면 일본어도) 또는 태그 후보로 그 묶음 안에서 거름(주소 ?keyword=·?genre[n]=, 사이트가 거름). openBulk.
 *
 * 0.39.0
 *   - 정리안3: 바 맨 앞 ↺(바꾼 게 있을 때)·층 칩(TL·BL × 동인·코믹·드라마)·필터 칩, 칩 순서·보이기 설정. 사진 아래 줄에 품번·쿠폰·♥(즐겨찾기, 누를 때만 요청 1).
 *   - 사이트 검색창을 누르면 저장한 검색·자주 쓰는 태그(☆)·최근, 치면 태그 후보 → 태그 번호로 검색. 정사각형 썸네일·목록 진단 삭제. row·fav·sbox·tags·saved.
 *
 * 0.38.2
 *   - 한국어 태그 이름(또는 '연하 공'의 '연하' 같은 앞말)으로 검색하면 일본어 이름을 '또는'(|)으로 붙여 일본어보다 적게 안 나오게(임신 → 임신|妊娠|孕ませ). kw. 태그 목록 7일에 2번.
 *
 * 0.38.1
 *   - 기본값: 인기순·한국어·할인 없음(saleOnly 기본 끔)·쿠폰 없음. 칩을 짧게 누르면 바꾼 게 있을 땐 기본으로, 기본일 땐 팝업. 꾹 = 언제나 팝업. tapHold.
 *   - 언어 칩은 기본(한국어)과 다를 때만 파란색. 일본어 첫 화면(배너·이벤트) 캐시 30분 → 2시간.
 *
 * 0.38.0
 *   - 할인중·언어를 직접 끄면 그 검색에 기본값(할인중·한국어)을 다시 붙이지 않음(전엔 같은 페이지를 다시 받음). 'TL만' 자동 붙이기·🔍 검색 시트·태그 받기 없앰.
 *   - 성우는 음성 작품 카드의 이름을 씀(작품 정보 요청: 쪽당 최대 30 → 성우가 잘린 카드만). 언어 쿠키 ko-kr도 한국어로 봐서 처음 새로고침 안 함. 중복 코드 정리.
 *
 * 0.37.5
 *   - 브라우저를 껐다 켤 때마다 사이트가 성인 확인을 다시 묻던 것: 전에 '네'를 눌러 adultchecked=1이 남아 있으면 사라진 세션 쿠키(adultchecked_session)만 다시 넣는다. 처음 확인은 직접 눌러야 함. locale.ageSession.
 *
 * 0.37.4
 *   - 일본어 쿠키(KO 버튼 한/일 전환, 이벤트 페이지)일 때 사이트가 '언어 선택' 창을 계속 띄우던 것을 막음: localesuggested=true 쿠키가 없으면 넣는다. locale.suggested.
 *
 * 0.37.3
 *   - 사이트 연령 확인 창이 떠 있는 동안 설정 버튼(KO)을 숨김. 버튼이 창의 '네' 위에 겹쳐 보였음. ageGateHide.
 *
 * 0.37.2
 *   - 한국어 기본으로 이동한 검색(language/jp + options KO_KR)에서 언어 칩이 '한·일'로 보이던 것 고침(사이트는 한국어만 보여 줌). langNow.
 *
 * 0.37.1
 *   - 목록 카드 아래 띠에 품번 표시, 누르면 작품을 열지 않고 품번 복사(초록). 언어를 안 정한 검색은 한국어(+언어 불필요)로(설정 koDefault, 이름·쿠폰 검색 제외). list.deco copier.
 *
 * 0.37.0
 *   - 검색 목록의 할인율(30·50·80%↑)·할인중을 사이트 필터(주소 discount_rates%5B0%5D/c8·c9·c10, campaign/campaign)로. 서버가 거르므로 개수·다음 쪽도 맞음. 70%는 사이트에 없어 80%로.
 *   - 정렬에 신작순·판매순 추가. 사이트가 주소를 order%5B0%5D/cend로 바꿔 정렬이 늘 '인기순'으로 읽히던 것·order가 두 번 붙던 것 고침. pathPairs·pathGet·pathSet.
 *
 * 0.36.3
 *   - CV 이름을 길게 눌러도(링크·이미지 메뉴 대신) 성우 이름만 복사(CV 글자는 안 들어감). copyVa.
 *
 * 0.36.2
 *   - 카드의 'CV 이름'을 누르면 작품을 열지 않고 성우 이름 복사(글자가 잠깐 초록색). list.deco.
 *
 * 0.36.1
 *   - 서클 목록에도 언어 버튼(주소 options[]). 서클은 언어가 없으면 사이트가 일본어로 되돌려서, 다 끄면 네 언어를 다 넣는다. langNow·langPath.
 *
 * 0.36.0
 *   - 목록 위 바: 쿠폰·할인·언어·🔍를 누르면 바 바로 아래 팝업(바깥을 누르면 닫힘). 이모지 대신 선 아이콘, 버튼은 회색 채움·고르면 파란색.
 *   - 할인 팝업 = 할인율(위) + 정렬(할인 개시일·마감 임박·저가·인기, 사이트 정렬). 언어 팝업 = 한·일·간체·번체 여러 개(검색 주소 options[]).
 *   - 이 스크립트의 정렬 창·할인율순·마감순(이 쪽 안에서) 없앰. 고른 것을 다시 누르면 꺼져 기본으로.
 *
 * 0.35.1
 *   - 선택 창(정렬·할인율·쿠폰) 안의 빈 곳(제목 줄)을 눌러도 닫힘. sheet.ensure.
 *
 * 0.35.0
 *   - 정렬 창: 한 줄씩 아이콘과 함께, 사이트 정렬 8개(인기·신작·오래된·판매·평점·리뷰·가격 2, 검색 주소의 order) + 할인율·마감 임박. 꾸욱 끌어 순서 바꿈.
 *   - 목록 위 정렬 버튼에 지금 정렬의 아이콘과 이름. 장바구니 쿠폰 딱지를 표지 왼쪽 아래에 겹침(PC에선 작품 형식 줄에 붙어 있었음).
 *
 * 0.34.0
 *   - Play 버튼 '편집' → '숨기기'. 아래 칸엔 이번에 고른 작품만, 버튼을 꾸욱(0.5초) 누르면 이미 숨긴 작품도 보여 되돌릴 수 있음.
 *   - 버튼을 끌어서 옮김(이 기기에 위치 저장, play.fabPos). 요청 수는 그대로.
 *
 * 0.33.1
 *   - Play 품번 띠를 누르면 작품을 열지 않고 품번 복사(띠가 잠깐 초록색).
 *   - 쿠폰: 작품 정보 요청 중에 쿠폰함이 도착하면 모든 작품이 '쿠폰 없음'으로 6시간 남던 문제(쿠폰 필터를 켜면 다 숨겨짐). checkNow.
 *
 * 0.33.0
 *   - Play 숨기기를 Play 자체 비표시(/api/ignore, 계정에 저장)로: 빈칸·스크롤 튐 없음, 폰·PC 같이. 편집 한 번에 요청 GET 1 + POST·DELETE 각 1 이하.
 *   - 아래 칸 표지·제목은 Play 저장소에서(번역판 표지가 안 뜨던 문제). Play 목록 썸네일마다 품번 띠. 예전 이 기기 숨김은 다음 편집 때 보냄.
 *
 * 0.32.1
 *   - Play 숨기기: 목록에서 숨긴 작품 자리를 빈칸으로 남김. 빼 버리면 스크롤할 때 화면이 위아래로 튀었음('최근 본 작품' 줄은 그대로 뺌).
 *
 * 0.32.0
 *   - Play 숨기기 편집 중: 누른 작품은 목록에서 빠지고 화면 아래 '숨긴 작품' 칸으로(거기서 누르면 되돌림). 저장값에 표지·제목을 같이 저장.
 *
 * 0.31.1
 *   - Play 숨기기: 스크롤하면 숨긴 작품이 잠깐 보였다 사라지던 문제. 카드가 생긴 뒤 숨기지 않고 CSS(:has)로 처음부터 안 그림.
 *
 * 0.31.0
 *   - 차단 목록(설정, 바로가기 아래): 서클·성우·작가 이름이 정확히 같은 작품을 목록에서 숨김(요청 0번).
 *   - 성우·작가·서클 이름 검색(keyword_creater 등)에는 할인중 조건을 자동으로 안 붙임. 설정의 한국어/日本語 버튼 삭제(JA 버튼 탭은 그대로).
 *   - DLsite Play: 오른쪽 아래 '편집'으로 작품 숨기기(이 기기에만 저장, 10.5 play).
 *
 * 0.30.1
 *   - 장바구니 쿠폰 딱지를 썸네일 왼쪽 아래로(왼쪽 위는 사이트 발매 딱지와 겹쳐 지저분했음).
 *
 * 0.30.0
 *   - 카드 오른쪽 위에 쿠폰(1개부터 쓰는 최고율, 2개 이상 조건은 따로)·묶음 할인 딱지. 쿠폰 필터를 꺼도 보임(작품 정보 50개당 1번).
 *   - CV·DLW는 썸네일 아래 어두운 띠로. 세일 마감 배지는 뺌. 안 쓰는 코드(coupon.on, CSS 몇 줄) 정리.
 *
 * 0.29.8
 *   - 쿠폰 대상 페이지(genres/works?genrekey=)를 같은 조건의 검색 화면으로 바꿔 열기(필터를 쓸 수 있게).
 *   - 마감 배지: 무엇이 끝나는지(세일)와 오늘/내일을 두 칸으로. 쿠폰 창은 최고율이 같으면 최저율 높은 쪽이 위.
 *
 * 0.29.7
 *   - 🔍 검색어를 같은 목록 안에서는 쪽을 넘겨도 기억(탭마다). 이벤트 페이지는 다음 쪽이 새로 열려서 검색이 풀렸음.
 *
 * 0.29.6
 *   - 검색창을 ✕나 지우기로 비우면 바로 검색 거르기를 풂(예전엔 🔍를 다시 눌러야 풀려서, 창을 닫으면 지운 검색어로 계속 걸러졌음).
 *
 * 0.29.5
 *   - 서클 페이지(/circle/profile/)와 작품 형식 목록(/works/type/, 예: 만화)도 목록으로 봐서 쿠폰·할인중 바가 뜸.
 *
 * 0.29.4
 *   - DLW 링크를 dlwatcher.com/product/품번으로(예전 ?q=는 그 사이트가 안 받아 첫 화면만 열림).
 *   - 묶음 할인 2쪽 이상에서 필터를 걸면 사이트가 2쪽을 그대로 요청해 404로 멈추던 문제: 누르기 직전 쪽 번호를 1로.
 *
 * 0.29.3
 *   - 장바구니 쿠폰 딱지: 할인율이 제일 큰 쿠폰 하나만, 할인율별 색(50%+ 빨강, 30%+ 주황, 그 아래 파랑), 글자 위아래 가운데.
 *
 * 0.29.2
 *   - PC 장바구니(li._cart_items, .work_thumb)에도 쿠폰 딱지. 폰 화면 구조만 찾아서 PC에선 안 보이던 문제.
 *
 * 0.29.1
 *   - 태그를 한국어+일본어로 저장(작품 정보를 한국어로 받음). 이벤트 페이지에서 받은 태그가 일본어뿐이라 한글 검색(예: 임신)이 안 되던 문제.
 *
 * 0.29.0
 *   - 쿠폰을 켜면 개수를 '대상/이 쪽 · 전체 대상/전체'로(전체는 999 같은 묶음 할인·검색 페이지, 300개 이하만). 장바구니 썸네일에 쓸 수 있는 쿠폰 딱지.
 *   - 일본 한정 이벤트: 날짜 대신 이벤트 이름(배너 alt)과 조건 배지(3개 999엔 등), 마감. 쿠폰 튜토리얼은 뺌.
 *
 * 0.28.2
 *   - 사이트 정렬·필터를 써도 할인중 조건이 안 빠지게: 검색 주소에 할인중이 있으면 사이트 필터 창의 '할인중 작품'을 한 번 켜 둠.
 *
 * 0.28.1
 *   - 쿠폰: 가진 쿠폰을 쿠폰함 데이터에서 자동으로 읽음(6시간에 한 번). Obey Me처럼 이름에 coupon이 없는 쿠폰도 인식.
 *   - 쿠폰 대상 판정: 작품 정보 묶음 주소로 50개씩 한 번에(요청 50번 → 1번). 성우 조회는 0.27.4 방식으로 되돌림.
 *
 * 0.28.0
 *   - 특집 배너(media.vivion-bcs.com 이미지 + 검색 페이지로 가는 링크)도 할인 아니면 숨김. 위 신작 슬라이드는 그대로.
 *   - 쿠폰 필터: 쿠폰 대상 목록 전체(최대 2000개, 요청 수십 번)를 받지 않고, 성우 조회 때 받는 작품 정보의 쿠폰 키로 판정. 확인 전 카드는 보여 둠.
 *
 * 0.27.4
 *   - JA 버튼 위치: 끌어서 옮긴 자리를 화면 비율 대신 px로 저장('fab.xy'의 {l, t}). 화면 폭이 바뀌어도 자리가 안 변함.
 *   - 예전 비율 값({x, y})은 그대로 읽어 쓰고, 다음에 끌면 px 값으로 바뀜.
 *
 * 0.27.3
 *   - 쿠폰 팝업: 검사 기록을 글자 수 기준으로 바꿔 늦게 그려져도 다시 보고, 위로 6단계 제한 대신 글자 수 300자 제한으로 고정 컨테이너를 찾음.
 *   - JA 버튼: 위치 계산 폭을 innerWidth 대신 스크롤바를 뺀 clientWidth로 바꿈.
 *   - 배너 판정: OFF·sale은 단어 단위로, /campaign/tutorial은 제외. isList에 /works/genre/·/works/exclusive 추가.
 *
 * 0.27.2
 *   - 언어 쿠키는 .dlsite.com 도메인 쿠키만 쓰고 host-only 쿠키는 삭제(중복 쿠키 충돌 방지).
 *   - 가격이 늦게 그려지는 카드를 '할인 아님'으로 굳히지 않음. 지연 로딩 자리표시자 이미지는 배너 판정에서 제외.
 *   - 이미지 주소 폴백은 https만 허용. 검색용 텍스트는 검색어가 있을 때만 생성. 쿠폰은 받을 게 있을 때만 요청.
 *   - 태그는 작품당 15개, 태그 캐시 1500개까지. 만료된 coupon:* 저장 키를 하루 한 번 정리.
 *
 * 0.27.1
 *   - 서버 보호: 403은 3연속일 때만 정지, 429/503은 즉시 30분 정지(탭 간 공유), 일본어 화면 요청도 정지 규칙 적용.
 *   - 성우 조회: 404/410·성인 인증 필요는 재시도하지 않고, 인증 필요 시 5분 쉼. 쉬는 동안 타이머로 자동 재개.
 *   - @noframes 추가(iframe에서 중복 실행 방지).
 *
 * 0.27.0
 *   - 쿠폰 팝업 숨기기 버그 수정(couponPopup에서 host를 먼저 checked에 넣던 줄 삭제).
 *   - isList에 /genres/works 추가(쿠폰 페이지에서 필터 바가 안 뜨던 문제).
 *   - 태그 요청은 검색 중에도 화면에 보이는 카드만 받는다(서버 요청 수를 늘리지 않음).
 *   - 썸네일 정사각형 CSS는 설정 스위치(기본 꺼짐)로 바꾸고 목록 페이지에서만 적용.
 *   - clean.banners()가 이미 본 이미지를 WeakSet으로 건너뜀.
 *   - 설정의 바로가기 안내 문구 단축.
 */
(function () {
  'use strict';

  /* ========== 1. CONFIG ========== */
  const COOKIE = 'locale'; // 쿠키 이름이 다르면 여기만 수정
  const DEFAULTS = {
    locale: 'ko_KR',
    autoJa: true, // 이벤트 페이지는 일본어
    searchJa: false, // 검색 결과는 일본어
    hideBanners: true,
    saleStrip: true,
    onlyTlBl: true,
    hideCouponPop: true,
    saleOnly: false, // 검색 주소에 할인중 조건(2026-11-01 사용자: 기본은 할인중 아님)
    koDefault: true, // 검색 주소에 작품 언어가 없으면 한국어로
    showVA: true,
    'sb.sale': false, // 필터: 할인중만
    'sb.rate': 0, // 필터: 최소 할인율(0이면 끔)
    'sb.coupon': '', // 쿠폰 대상만: 빈 값이면 끔, '*'이면 아는 모든 쿠폰, 그 외는 쿠폰 id 하나
    hideAI: false, // AI 생성 작품 숨기기
    blurThumb: false, // 목록 썸네일 흐리게(설정 스위치). 끄면 바로 원래대로
    chipSize: 'm', // 0.50.1 할인율·마감·쿠폰·묶음 칸 크기(작게 s / 보통 m / 크게 l, 사용자가 대강 조절)
    trOnly: true, // 0.53.0 번역 허가 목록: 고른 언어로 '신청 1↑ · 판매 0'인 작품만(바의 토글, ⚙ 스위치 아님)
    reviewFirst: true, // 0.51.1 작품 페이지: 리뷰를 상품 정보 바로 아래로 올리고 신착순으로 받는다
    showPid: false, // 0.48.0 카드 사진 아래 품번(사용자 결정: 기본 꺼짐). 끄면 그 줄도 빠진다(딱지가 없을 때)
  };
  const KEEP_HREF = /\/(?:campaign\b(?!\/tutorial)|bulkbuy\b)|discount|coupon|(?:^|[^a-z])sale(?![a-z])/i; // 남길 배너(주소)
  const KEEP_TEXT = /セール|割引|%\s*OFF|(?:^|[^a-z])OFF(?![a-z])|まとめ買い|クーポン|\d+本\d+円|할인|세일|쿠폰|(?:^|[^a-z])sale(?![a-z])|coupon|discount/i; // 남길 배너(글자)
  const BANNER_IMG = /bcsv2_temp|media\.dlsite\.com\/bcs\/|\/modpub\/[^"']*\/bn_/i; // 배너 이미지 경로
  const FEATURE_IMG = /vivion-bcs\.com\/images\//i; // 특집 배너 이미지 서버(신작 슬라이드도 같은 서버라 FEATURE_HREF와 함께 본다)
  const FEATURE_HREF = /\/fsr\/|\/works\/genre\//; // 특집 배너는 검색 페이지로 간다
  const NOT_BANNER_IMG = /logo|icon|btn_|common\//i;
  const ALLOWED_FLOORS = ['girls', 'bl', 'girls-pro', 'bl-pro', 'girls-drama', 'bl-drama'];
  const FLOOR_SUB = /^(|asmr|voice|tool|girlsgame)$/;
  // '기간' 같은 너무 흔한 단어를 제거해 불필요한 텍스트 노드 매칭 방지
  const COUPON_HINT = /쿠폰|초이득|期間限定|クーポン/;
  const POP_MAX_TEXT = 300; // 쿠폰 팝업으로 숨길 컨테이너의 최대 글자 수
  const COUPON_POP = /DLsite\s*쿠폰|기간\s*임박|초이득|期間限定|クーポン.{0,10}(確認|チェック)/;
  const STRIP_FLOORS = ['girls', 'bl', 'maniax', 'home', 'girls-pro', 'bl-pro', 'girls-drama', 'bl-drama', 'pro', 'books', 'garumani'];
  const SALE_RE = /\d+\s*%\s*(OFF|오프)/i;
  const AI_RE = /AI生成|AI一部利用|AI\s*생성|AI\s*일부/i;
  const NAME_SEARCH = /\/keyword_(?:creater|maker_name)\//; // 성우·작가·서클 이름 검색(할인중 조건을 자동으로 안 붙임)
  const normName = (s) => String(s || '').toLowerCase().replace(/[\s　"“”]+/g, '');
  // 차단 목록(설정의 '차단' 칸). 서클·성우·작가 구분 없이 이름이 정확히 같으면 숨긴다.
  const blockSet = () => blockSet.cache || (blockSet.cache = new Set(String(store.get('block.list', '')).split('\n').map(normName).filter(Boolean)));
  const PRICE_RE = /\d[\d,.]*\s*(?:円|JPY|원|KRW|USD|CNY|TWD|HKD|EUR|元)|[$₩¥€]\s*\d/i; // 가격이 그려졌는지 판단(늦게 로드되는 카드 대응)
  const PID_RE = /product_id\/([A-Za-z]{2}\d{6,8})/;
  const OURS = '#dllib,#dllsh,.dllh,#dlnmm,#dltr,.dlwt,.dltg,#dlwp,#dlh,#dlsale,#dlbar,#dlsheet,.dlva,.dlpn,.dlx,.dlw,.dlcp,.dlrow,.dlact,.dlsl,.dlpk,.dlch,.dldue,.dlty'; // 이 스크립트가 만든 요소
  const CACHE_MS = 2 * 3600 * 1000; // 일본어 첫 화면(할인 배너·이벤트 목록) 캐시. 30분 → 2시간(요청 1/4, 0.38.1)
  const DLW_URL = (id) => `https://dlwatcher.com/product/${encodeURIComponent(id)}`;
  const FAB_LONG_MS = 450; // 버튼을 이만큼 꾹 누르면 설정 시트
  const PICK_GAP = 400; // 0.49.0 장바구니 고르기: 사이트 링크를 차례로 누르는 간격(ms). 손으로 누르는 것보다 빠르지 않게
  const VA_PARALLEL = 1;
  const VA_GAP_MS = 1500;
  const VA_SAVE_DEBOUNCE_MS = 5000; // 대용량 객체 저장 빈도 완화 (5초)
  const FETCH_TIMEOUT = 20000;
  // 성우가 없는 작품 형식(카드 .work_category.type_XXX): 만화·극화·웹툰·CG·노벨. 이런 카드는 성우를 받지 않는다
  const NO_VOICE_TYPE = /\btype_(?:MNG|SCM|WBT|ICG|NRE)\b/;

  /* ========== 2. store ========== */
  const store = {
    get(k, d = DEFAULTS[k]) { try { const v = GM_getValue(k); return v === undefined ? d : v; } catch (e) { return d; } },
    set(k, v) { try { GM_setValue(k, v); } catch (e) { /* 저장 실패는 무시 */ } },
  };
  const opt = (k) => store.get(k);

  // 0.51.1 작품 페이지 리뷰 신착순: 사이트가 보내는 리뷰 요청의 order=top(TOP 리뷰 순)을 order=regist_d(신착순, 2026-11-18 응답 확인)로 바꾼다. 요청 수는 그대로.
  // 사이트 Vue 화면이 만든 요청이라 fetch·XHR을 시작 때(document-start) 감싼다.
  (function reviewNewest() {
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const fix = (u) => (typeof u === 'string' && /\/fetchReview\?/.test(u) && opt('reviewFirst') ? u.replace(/([?&])order=top\b/, '$1order=regist_d') : u);
    const put = (name, fn) => { try { w[name] = typeof exportFunction === 'function' ? exportFunction(fn, w) : fn; } catch (e) { /* 못 감싸면 사이트 기본 순서 */ } };
    // 0.53.0 번역 허가 목록(/works/translatable)이 받는 translatableProducts.json에서 '고른 언어로 신청 1 이상 · 판매 0 · 거절 아님'만 남긴다(요청 수 그대로)
    const trLang = (u) => { const m = /translation_can_apply(?:%5B|\[)\d*(?:%5D|\])=([A-Za-z_]+)/.exec(u); return m ? m[1] : 'KO_KR'; };
    const trOk = (p, l) => { const s = p && p.translationInfo && p.translationInfo.translationStatusForTranslator && p.translationInfo.translationStatusForTranslator[l]; return !!s && s.applied_count >= 1 && !s.on_sale_count && !s.is_denied; };
    const trFix = (r, u) => r.clone().json().then((j) => {
      const ps = j && j.data && j.data.products;
      if (!Array.isArray(ps)) return r;
      j.data.products = ps.filter((p) => trOk(p, trLang(u)));
      return new w.Response(JSON.stringify(j), { status: r.status, statusText: r.statusText, headers: r.headers });
    }, () => r);
    const of = w.fetch;
    if (typeof of === 'function') {
      put('fetch', function (a, b) {
        const u = typeof a === 'string' ? a : (a && a.url) || '';
        const p = of.call(this, fix(a), b);
        return /\/translatableProducts\.json/.test(u) && opt('trOnly') ? p.then((r) => trFix(r, u)) : p;
      });
    }
    const XO = w.XMLHttpRequest && w.XMLHttpRequest.prototype;
    const oo = XO && XO.open;
    if (oo) { try { XO.open = function (m, u, ...r) { return oo.call(this, m, fix(u), ...r); }; } catch (e) { /* 위와 같음 */ } }
  })();

  // 서버 요청 공통: 시간 초과(본문 읽기까지), 429/403/503이면 쉬기(net), 실패면 err.status가 붙은 오류. as = 'json' | 'text'
  function netFetch(url, init, as) {
    if (!net.ok()) return Promise.reject(new Error('서버 제한으로 쉬는 중'));
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
    return fetch(url, { ...init, signal: ctl.signal })
      .then((r) => { if (!r.ok) { net.trip(r.status); throw Object.assign(new Error('HTTP ' + r.status), { status: r.status }); } return r[as](); })
      .catch((e) => { throw e && e.name === 'AbortError' ? new Error('시간 초과') : e; })
      .finally(() => clearTimeout(to));
  }
  const XHR = { 'X-Requested-With': 'XMLHttpRequest' };
  // 글자 복사(클립보드가 막히면 옛 방식). 되면 node에 잠깐 'ok'
  function copyText(node, text) {
    const done = () => { node.classList.add('ok'); setTimeout(() => node.classList.remove('ok'), 800); };
    const old = () => {
      const ta = el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text;
      document.body.append(ta); ta.select();
      try { if (document.execCommand('copy')) done(); } catch (err) { /* 복사 실패 */ }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, old);
    else old();
  }
  const toneOf = (n) => (n >= 50 ? 'c3' : n >= 30 ? 'c2' : n ? 'c1' : 'c0'); // 쿠폰 할인율 색

  // 안전 정지: 사이트가 429/403/503을 돌려주면 백그라운드 요청을 30분 멈춘다.
  const NET_COOL_MS = 30 * 60 * 1000;
  const net = {
    until: 0,
    hit403: 0,
    ok() { // 매번 저장소를 읽어 다른 탭이 건 정지도 따른다
      net.until = Math.max(net.until, +store.get('net.until', 0) || 0);
      return Date.now() >= net.until;
    },
    good() { net.hit403 = 0; },
    trip(status) {
      if (status === 403) { // 403은 3연속일 때만(일시적 차단·인증 문제와 구분)
        if (++net.hit403 < 3) return;
      } else if (status !== 429 && status !== 503) return;
      net.hit403 = 0;
      net.until = Date.now() + NET_COOL_MS;
      store.set('net.until', net.until);
    },
  };

  /* ========== 3. route ========== */
  const route = {
    isSearch: (p) => /\/fsr\//.test(p),
    isCampaign: (p) => /\/(campaign|bulkbuy)(\/|$|\?)/.test(p) && !/\/fsr\//.test(p),
    isList: (p) => route.isCampaign(p) || route.isSearch(p) || /\/works\/discount/.test(p) || /\/genres\/works/.test(p) || /\/works\/genre\//.test(p) || /\/works\/exclusive/.test(p) || /\/works\/type\//.test(p) || /\/circle\/profile\//.test(p),
    floor: () => (location.pathname.split('/')[1] || 'girls').replace(/-touch$/, ''),
    isCouponBox: (p) => /\/mypage\/coupon\//.test(p),
    isCart: (p) => /^\/[^/]+\/cart(\/|$)/.test(p),
    isWish: (p) => /^\/[^/]+\/mypage\/wishlist(\/|$)/.test(p), // 0.49.0 즐겨찾기(카드 장식만)
    isMy: (p) => route.isCart(p) || route.isWish(p),
    isLib: (p) => /^\/[^/]+\/mypage\/(?:userbuy|library)(?:\/|$)/.test(p), // 0.54.0 마이페이지 구입 이력·라이브러리(로그인 필요 — 실제 화면 구조는 못 봄, 품번 링크로 카드를 찾는다)
    isTrans: (p) => /\/works\/translatable/.test(p), // 0.53.0 번역 허가 목록(바 대신 언어·신청 칩 줄 #dltr)
    isRank: (p) => /^\/[^/]+\/ranking(\/|$)/.test(p), // 0.50.0 랭킹: 바 없이 카드 장식만(♥·CV 띠 포함)
  };
  // 0.50.0 번역판 링크는 .../product_id/원작번호.html/?translation=번역판번호 모양이다(즐겨찾기에서 확인). 카드의 다른 링크(다운로드 등)는 번역판 번호라서
  // 첫 번호만 읽으면 한 카드에 번호가 둘이 되어 카드로 못 잡았다(즐겨찾기 30장 중 1장에 DLW·품번이 안 붙음) → translation 번호를 우선한다
  const pidOf = (href) => {
    const h = href || '';
    const t = h.match(/[?&]translation=([A-Z]{2}\d+)/);
    return t ? t[1] : (h.match(PID_RE) || [])[1];
  };

  /* ========== 4. locale ========== */
  const cookieAttr = () => 'path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  // 사이트는 ko-kr 모양도 한국어로 받는다(2026-11-01 locale=ko-kr 쿠키로 받은 검색 결과가 한국어). 모양만 다르면 다시 쓰지 않는다(전엔 처음 열 때 새로고침이 한 번 더 났음)
  const sameLocale = (a, b) => !!a && !!b && a.replace('-', '_').toLowerCase() === b.toLowerCase();
  const locale = {
    read() {
      let c = '';
      try { c = document.cookie; } catch (e) { return null; }
      const m = c.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    },
    // 일본어 쿠키일 때 사이트가 '언어 선택' 창(div._adultcheck.type_lang_select)을 띄운다. 언어를 하나 고르면 사이트가
    // localesuggested=true(365일)를 남겨 멈춘다(2026-11-01 폰 화면 크기 브라우저로 확인). 그 쿠키가 없으면 같은 값을 넣어 창을 막는다.
    // 성인 확인(adultchecked)은 본인이 직접 누르는 것이라 건드리지 않는다.
    suggested() {
      try {
        if (/(?:^|; )localesuggested=/.test(document.cookie)) return;
        document.cookie = 'localesuggested=true; ' + cookieAttr() + '; max-age=31536000; domain=.dlsite.com';
      } catch (e) { /* 쿠키 접근이 막힌 문서 */ }
    },
    // 사이트 성인 확인 창은 세션 쿠키 adultchecked_session이 없으면(브라우저를 닫았다 켜면 사라짐) adultchecked=1(400일)이 있어도 다시 뜬다(2026-11-01 쿠키 조합 8가지로 확인).
    // 전에 직접 '네'를 눌러 adultchecked=1이 남아 있을 때만 세션 표시를 다시 넣는다. 처음 확인은 건너뛰지 않는다.
    ageSession() {
      try {
        if (!/(?:^|; )adultchecked=1(?:;|$)/.test(document.cookie) || /(?:^|; )adultchecked_session=/.test(document.cookie)) return;
        document.cookie = 'adultchecked_session=1; ' + cookieAttr() + '; domain=.dlsite.com';
      } catch (e) { /* 쿠키 접근이 막힌 문서 */ }
    },
    write(v) {
      locale.suggested();
      const attr = cookieAttr();
      try {
        document.cookie = `${COOKIE}=${v}; ${attr}; max-age=31536000; domain=.dlsite.com`;
        document.cookie = `${COOKIE}=; ${attr}; max-age=0`; // 같은 이름의 host-only 쿠키가 도메인 쿠키를 가리지 않게 삭제
      } catch (e) { /* 쿠키 접근이 막힌 문서 */ }
    },
    wantFor(path) {
      const ja = (route.isCampaign(path) && opt('autoJa')) || (route.isSearch(path) && opt('searchJa'));
      return ja ? 'ja_JP' : opt('locale');
    },
    enforce(reload) {
      locale.suggested();
      locale.ageSession();
      const want = locale.wantFor(location.pathname);
      if (sameLocale(locale.read(), want)) return;
      locale.write(want);
      if (!reload) return;
      const key = 'dlh_reload:' + location.pathname;
      try {
        if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, '1'); location.reload(); }
      } catch (e) { /* sessionStorage 막힘 */ }
    },
    clearReloadGuards() {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('dlh_reload:')) sessionStorage.removeItem(k);
        }
      } catch (e) { /* 무시 */ }
    },
    hookNavigation() {
      const before = (raw) => {
        try {
          const u = new URL(raw, location.href);
          if (!u.hostname.endsWith('dlsite.com')) return;
          const w = locale.wantFor(u.pathname);
          if (!sameLocale(locale.read(), w)) locale.write(w);
        } catch (e) { /* 잘못된 주소 */ }
      };
      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[href]');
        if (a && a.target !== '_blank') before(a.href);
      }, true);
      document.addEventListener('submit', (e) => before(e.target.action || location.href), true);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) locale.enforce(false); });
    },
  };

  /* ========== 5. redirect ========== */
  const COUPON_RE = /custom_genres\/([A-Za-z0-9_]*coupon[A-Za-z0-9_]*)/i;
  // 쿠폰 대상 페이지(genres/works?genrekey=키)는 필터가 없다. 같은 목록을 검색 주소로 연다(작품 형식 group1 → work_type_category).
  function genreSearchPath() {
    const m = location.pathname.match(/^\/([^/]+)\/genres\/works\/?$/);
    const u = new URL(location.href);
    const key = u.searchParams.get('genrekey');
    if (!m || !key || !/^[A-Za-z0-9_]+$/.test(key)) return null;
    let np = `/${m[1]}/fsr/=/custom_genres/${key}`;
    let n = 0;
    for (const [k, v] of u.searchParams) {
      if (k === 'genrekey' || k === 'locale') continue;
      if (!/^group1\[\d*\]$/.test(k) || !/^[a-z_]+$/.test(v)) return null; // 모르는 조건이 있으면 바꾸지 않는다
      np += `/work_type_category[${n++}]/${v}`;
    }
    return np;
  }
  function searchRedirectTarget() {
    const gp = genreSearchPath();
    const p = gp || location.pathname;
    if (!route.isSearch(p)) return null;
    let np = p.replace(/\/?$/, '');
    const origPath = np;
    const off = userOff.get(p); // 이 검색에서 사용자가 직접 끈 기본값은 다시 붙이지 않는다
    if (opt('saleOnly') && !off.sale && !/\/campaign\/campaign/.test(p) && !/discount_rates/.test(p) && !/\/is_free/.test(p) && !COUPON_RE.test(p) && !NAME_SEARCH.test(p)) np += '/campaign/campaign';
    // 작품 언어를 안 정한 검색은 한국어로(언어 불필요 NM은 0.44.0부터 안 붙임). 이름 검색·쿠폰 대상 검색은 일본어 작품이 많아 그대로 둔다
    if (opt('koDefault') && !off.lang && /^\/(?:girls|bl)(-touch)?\/fsr\//.test(p) && !/options(?:%5B|\[)/i.test(p) && !COUPON_RE.test(p) && !NAME_SEARCH.test(p)) np += '/options%5B0%5D/KO_KR';
    // 기본 정렬(신작순)·대상(TL+보이스). 사이트 검색창에서 왔으면 사이트가 넣은 trend·TL+BL을 우리 기본으로 바꾼다
    const hdr = HEADER_SEARCH.test(p), ord = pathGet(np, 'order');
    if (/\/fsr\/=/.test(p) && !COUPON_RE.test(p) && (ord === undefined || (hdr && ord === 'trend'))) np = pathSet(np, ['order', 'page'], [['order%5B0%5D', DEF_ORDER]]);
    if (!off.floor && floorDefOk(p) && (floorUnset(np) || hdr)) np = pathSet(np, [...FLOOR_KEYS, 'work_type_name', 'page'], floorDefPairs());
    if (hdr) np = pathSet(np, ['from'], []);
    np = kw.path(np) || np; // 한국어 태그 이름 검색어에 일본어 이름을 '또는'으로(검색창에서 못 바꾼 경우)
    const u = new URL(location.href);
    if (gp) u.search = '';
    u.pathname = np === origPath ? p : np;
    if (opt('searchJa') && u.searchParams.get('locale') !== 'ja_JP') u.searchParams.set('locale', 'ja_JP');
    return u.href === location.href ? null : u.href;
  }

  // 칩으로 직접 끈 기본값(할인중 sale, 한국어 lang)을 검색 조건별로 기억한다(탭마다, 탭을 닫으면 다시 기본). 정렬·쪽은 빼고 비교
  const userOff = {
    key: (p) => pathSet(p.replace(/\/?$/, ''), ['order', 'page'], []),
    all() { try { return JSON.parse(sessionStorage.getItem('dlh_off') || '{}') || {}; } catch (e) { return {}; } },
    get(p) { return userOff.all()[userOff.key(p)] || {}; },
    mark(p, k) { // 지금 주소에서 이미 끈 것도 새 주소로 이어 간다(할인중을 끈 뒤 언어를 끄는 경우)
      const all = userOff.all(), key = userOff.key(p);
      const prev = { ...(all[userOff.key(location.pathname)] || {}), ...(all[key] || {}) };
      delete all[key]; // 최근 것을 뒤로(20개까지)
      all[key] = { ...prev, [k]: true };
      const ks = Object.keys(all);
      for (let i = 0; i < ks.length - 20; i++) delete all[ks[i]];
      try { sessionStorage.setItem('dlh_off', JSON.stringify(all)); } catch (e) { /* sessionStorage 막힘 */ }
    },
  };

  /* ========== 5.6 kw: 한국어 검색어에 일본어 태그 이름을 '또는'(|)으로 붙임 ==========
     한국어로 치면 일본어보다 적게 나왔다(2026-11-01: 임신 3034 / 妊娠 3258, 순애 4829 / 純愛 5496). 사이트 검색어는 '|'가 '또는'이다(妊娠|임신 3667).
     태그 목록(/girls/genre/list, 한국어·일본어 각 1번, 7일 캐시)에서 번호가 같은 이름을 짝짓고, 검색어가 한국어 태그 이름(또는 '/'로 나눈 한 조각)과
     같으면 일본어 이름을 붙인다(임신 → 임신|妊娠|孕ませ). 띄어쓰기가 든 검색어(여러 단어)는 그대로 둔다. */
  const TAGS_KEY = 'tags1';
  const TAGS_TTL = 7 * 864e5;
  const HANGUL = /[가-힣]/;
  // 태그가 아닌 말의 짝(사람이 넣음). 근친은 TL 층 태그에 없다(2026-11-02 확인: 근친 881 / 近親 984 / 근친|近親 984)
  const KW_EXTRA = [['근친', '近親']];
  const kw = {
    list() { const c = store.get(TAGS_KEY, null); return c && Array.isArray(c.list) ? c.list : []; }, // [[번호, 한국어, 일본어]]
    // 공식 분류(어필 포인트·캐릭터·…, 한국어 태그 목록 화면의 제목 순서) [[이름, [번호…]]]. 분류가 없는 태그는 '기타'로. 목록 화면에서 못 읽었으면 전부 '전체 태그' 하나
    groups() {
      const c = store.get(TAGS_KEY, null), list = kw.list(), have = new Set(list.map((x) => x[0]));
      const gs = (c && Array.isArray(c.groups) ? c.groups : []).map(([t, ids]) => [t, ids.filter((n) => have.has(n))]).filter((g) => g[1].length);
      const used = new Set(gs.flatMap((g) => g[1])), rest = list.map((x) => x[0]).filter((n) => !used.has(n));
      return gs.length ? (rest.length ? [...gs, ['기타', rest]] : gs) : (rest.length ? [['전체 태그', rest]] : []);
    },
    _busy: null,
    load() {
      const c = store.get(TAGS_KEY, null);
      if ((c && Array.isArray(c.groups) && Date.now() - c.t < TAGS_TTL) || kw._busy || !net.ok()) return; // 0.43.0 전 캐시는 분류가 없어 한 번 다시 받는다
      const get = (loc) => fetchDoc(`https://www.dlsite.com/girls/genre/list?locale=${loc}`, 'omit').then(({ doc }) => {
        const m = new Map();
        for (const a of doc.querySelectorAll('a[href*="/works/genre/=/genre/"]')) {
          const n = (a.getAttribute('href').match(/\/genre\/(\d+)/) || [])[1];
          const t = [...a.childNodes].filter((x) => x.nodeType === 3).map((x) => x.data).join('').trim(); // 뒤의 (개수) span은 뺀다
          if (n && t) m.set(n, t);
        }
        // 공식 분류: 제목(.versatility_linklist_title)과 태그 링크가 한 상자 안에 번갈아 있다(2026-11-02 확인: 8개 분류, 태그 230개)
        const groups = [];
        let cur = null;
        for (const e of doc.querySelectorAll('.versatility_linklist_wrapper .versatility_linklist_title, .versatility_linklist_wrapper a[href*="/works/genre/=/genre/"]')) {
          if (e.matches('.versatility_linklist_title')) { cur = [e.textContent.trim(), []]; groups.push(cur); continue; }
          const n = (e.getAttribute('href').match(/\/genre\/(\d+)/) || [])[1];
          if (cur && n && !groups.some((g) => g[1].includes(n))) cur[1].push(n);
        }
        return { m, groups };
      });
      store.set(TAGS_KEY, { t: Date.now() - TAGS_TTL + NET_COOL_MS, list: kw.list(), groups: (c && c.groups) || [] }); // 실패해도 30분은 다시 안 받음
      kw._busy = get('ko_KR')
        .then((ko) => new Promise((ok) => setTimeout(ok, VA_GAP_MS)).then(() => get('ja_JP')).then((ja) => {
          const list = [...ko.m].filter(([n]) => ja.m.has(n)).map(([n, k]) => [n, k, ja.m.get(n)]);
          if (list.length > 50) store.set(TAGS_KEY, { t: Date.now(), list, groups: ko.groups.filter((g) => g[0] && g[1].length) });
        }))
        .catch(() => { /* 다음에 다시 */ })
        .finally(() => { kw._busy = null; });
    },
    // 짝 목록: 태그 이름 그대로 + '공(攻め)·수(受け)'를 뗀 앞말(연하 공/年下攻め → 연하/年下, 집착 공/執着攻め → 집착/執着). 앞말은 두 글자 이상만
    pairs() {
      const list = kw.list();
      if (kw._pairsOf === list.length && kw._pairs) return kw._pairs;
      const out = [...KW_EXTRA];
      for (const [, ko, ja] of list) {
        out.push([ko, ja]);
        const m = ko.match(/^(.{2,})\s(공|수)$/), j = m && ja.match(m[2] === '공' ? /^(.+?)攻め?$/ : /^(.+?)受け?$/);
        if (j) out.push([m[1], j[1]]);
      }
      kw._pairsOf = list.length;
      return (kw._pairs = out);
    },
    // 한국어 검색어 → '한국어|일본어…'. 바꿀 게 없으면 null. 띄어쓰기는 태그 이름 하나와 같을 때만(연하 공 → 연하공|年下攻め), 아니면 여러 단어라 그대로
    // 여러 단어면(태그 이름 하나와 같지 않을 때) 단어마다 붙인다: 임신 근친 → 임신|妊娠|孕ませ 근친|近親. 사이트는 '|'를 띄어쓰기보다 먼저 묶는다(2026-11-02: 近親 妊娠 135 / 근친|近親 임신|妊娠 147)
    expand(word) {
      const raw = String(word || '').trim();
      if (!raw || /\|/.test(raw) || !HANGUL.test(raw)) return null;
      const one = kw.expandOne(raw);
      if (one || !/\s/.test(raw)) return one;
      const ws = raw.split(/\s+/), xs = ws.map((x) => kw.expandOne(x) || x);
      return xs.some((x, i) => x !== ws[i]) ? xs.join(' ') : null;
    },
    expandOne(raw) {
      if (!HANGUL.test(raw)) return null;
      const w = raw.replace(/\s+/g, '');
      const out = [];
      for (const [ko, ja] of kw.pairs()) {
        const kp = ko.split('/').map((x) => x.replace(/\s+/g, ''));
        const i = kp.indexOf(w);
        if (i < 0 && ko.replace(/\s+/g, '') !== w) continue;
        const jp = ja.split('/').map((x) => x.trim()).filter(Boolean);
        for (const j of (i >= 0 && kp.length > 1 && kp.length === jp.length ? [jp[i]] : jp)) if (!out.includes(j)) out.push(j); // 조각 수가 같으면 같은 자리 것만
      }
      return out.length ? [w, ...out].join('|') : null;
    },
    // 검색 주소의 keyword를 바꾼 주소(바꿀 게 없으면 null)
    path(pathname) {
      const k = pathGet(pathname, 'keyword');
      if (k === undefined) return null;
      let d = '';
      try { d = decodeURIComponent(k.replace(/\+/g, ' ')); } catch (e) { return null; }
      const x = kw.expand(d);
      return x ? pathSet(pathname, ['keyword', 'page'], [['keyword', encodeURIComponent(x).replace(/%20/g, '+')]]) : null; // 띄어쓰기는 '+'(주소에 %20을 넣은 요청은 응답이 없었다, 2026-11-02)
    },
    // 사이트 검색창에서 검색하기 직전(제출·Enter·검색 버튼, 사이트보다 먼저)에 글자를 바꾼다. 그러면 요청이 늘지 않는다
    before(e) {
      const t = e.target;
      let inp = null;
      if (e.type === 'submit') inp = t.querySelector && t.querySelector('input[name=keyword]');
      else if (e.type === 'keydown') { if (e.key === 'Enter' && t.matches && t.matches('input[name=keyword]')) inp = t; }
      else { const f = t.closest && t.closest('.globalSearchBtn, #search_button'); inp = f && f.closest('form') && f.closest('form').querySelector('input[name=keyword]'); }
      if (inp && inp.value.trim()) sbox.remember(inp.value.trim());
      if (inp && sheet.opener === inp) sheet.close(); // 검색하면 검색창 목록은 닫는다
      const ns = inp && tags.parse(inp.value); // '#임신,순애': 태그 번호로 검색(그리고)
      if (ns) { e.preventDefault(); e.stopPropagation(); tags.goAll(ns); return; }
      // '#근친'처럼 태그가 아닌 조각이 있으면 #를 떼고 글자 검색(전엔 '#근친' 그대로 검색해 0개, 2026-11-02)
      const ps = inp && tags.pieces(inp.value.trim());
      const v = ps && ps.length ? ps.filter(Boolean).join(' ') : inp && inp.value;
      const x = inp && (kw.expand(v) || (v !== inp.value ? v : null));
      if (!x) return;
      inp.value = x;
      inp.dispatchEvent(new Event('input', { bubbles: true })); // 사이트(Vue)가 값을 들고 있으면 같이 바뀌게
    },
    // 바꾼 검색어(임신|妊娠|孕ませ)가 검색창에 보이면 원래 한국어만 보이게(다시 검색하면 before가 또 붙임)
    shown: new WeakSet(),
    tidyBox() {
      for (const inp of document.querySelectorAll('input[name=keyword]')) {
        if (kw.shown.has(inp)) continue;
        const m = inp.value.match(/^([^|]+)\|/);
        if (!m || kw.expand(m[1]) !== inp.value) continue;
        kw.shown.add(inp);
        inp.value = m[1];
      }
    },
  };

  /* ========== 공통 도우미 ========== */
  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (tag === 'button') e.type = 'button';
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    e.append(...kids.flat().filter((x) => x != null));
    return e;
  }
  function pressable(b, onTap, onLong, drag, ms = 500) {
    let timer = 0, down = false, moved = false, long = false, px = 0, py = 0;
    const stop = () => clearTimeout(timer);
    b.addEventListener('pointerdown', (e) => {
      down = true; moved = false; long = false; px = e.clientX; py = e.clientY; stop();
      if (drag) { drag.start(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ } }
      timer = setTimeout(() => {
        if (!down || moved) return;
        long = true;
        if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) { /* 무시 */ }
        onLong();
      }, ms);
    });
    b.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (!moved && Math.hypot(dx, dy) > (drag ? 16 : 24)) { moved = true; stop(); if (drag) long = true; }
      if (moved && drag) drag.move(dx, dy);
    });
    const end = () => { stop(); if (down && moved && drag) drag.end(); down = false; };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', () => { if (long) { long = false; return; } onTap(); });
    b.style.webkitTouchCallout = 'none';
    b.style.userSelect = 'none';
    if (drag) b.style.touchAction = 'none';
  }
  const setText = (id, t) => { const n = document.getElementById(id); if (n && n.textContent !== t) n.textContent = t; };
  const hide = (n, flag) => { n.style.display = 'none'; n.dataset[flag] = '1'; };

  // 바·팝업 아이콘: Google Material Symbols Rounded의 path (Apache License 2.0, https://github.com/google/material-design-icons)
  const ICON = {
    sr: 'M380-320q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l224 224q11 11 11 28t-11 28q-11 11-28 11t-28-11L532-372q-30 24-69 38t-83 14Zm0-80q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z',
    hf: 'M480-147q-14 0-28.5-5T426-168l-69-63q-106-97-191.5-192.5T80-634q0-94 63-157t157-63q53 0 100 22.5t80 61.5q33-39 80-61.5T660-854q94 0 157 63t63 157q0 115-85 211T602-230l-68 62q-11 11-25.5 16t-28.5 5Z',
    dn: 'M480-362q-8 0-15-2.5t-13-8.5L268-557q-11-11-11-28t11-28q11-11 28-11t28 11l156 156 156-156q11-11 28-11t28 11q11 11 11 28t-11 28L508-373q-6 6-13 8.5t-15 2.5Z',
    fl: 'M440-240q-17 0-28.5-11.5T400-280q0-17 11.5-28.5T440-320h80q17 0 28.5 11.5T560-280q0 17-11.5 28.5T520-240h-80ZM280-440q-17 0-28.5-11.5T240-480q0-17 11.5-28.5T280-520h400q17 0 28.5 11.5T720-480q0 17-11.5 28.5T680-440H280ZM160-640q-17 0-28.5-11.5T120-680q0-17 11.5-28.5T160-720h640q17 0 28.5 11.5T840-680q0 17-11.5 28.5T800-640H160Z', // 필터(줄 3개)
    ck: 'm382-354 339-339q12-12 28-12t28 12q12 12 12 28.5T777-636L410-268q-12 12-28 12t-28-12L182-440q-12-12-11.5-28.5T183-497q12-12 28.5-12t28.5 12l142 143Z',
  };
  // 0.45.0 선 아이콘(이모지·글자 기호 대신, 직접 그린 단순한 선. 색은 글자색을 따라가고 켜지면 fill로 채움). viewBox 0 0 24 24
  const LINE = {
    x: 'M6 6l12 12M18 6L6 18',
    ok: 'M5 12.5l4.5 4.5L19 7.5',
    rs: 'M5 12a7 7 0 1 0 2.1-5M5 4v4h4',
    gr: 'M5 8h14M5 12h14M5 16h14',
    tr: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
    st: 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
    ban: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM6.3 6.3l11.4 11.4',
    bm: 'M7 4h10v16l-5-3.5L7 20z',
    hl: 'M12 20.5s-7.5-4.7-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.5-7.5 10.2-7.5 10.2z', // 0.54.0 하트 선
  };
  function icon(k) {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', LINE[k] ? '0 0 24 24' : '0 -960 960 960');
    s.setAttribute('aria-hidden', 'true');
    if (LINE[k]) { s.setAttribute('class', 'ln'); s.dataset.i = k; }
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', LINE[k] || ICON[k]);
    s.append(p);
    return s;
  }
  // 할인 팝업의 정렬: 검색 주소의 order 값(2026-10-30 사이트 정렬 창에서 확인, cstart_d·cend는 할인 작품 검색일 때 사이트에도 나옴). trend = 사이트 기본
  // 2026-10-31 사이트 정렬 창에서 확인: 신작 release_d, 판매수 dl_d. cstart_d·cend는 할인 작품 검색일 때만 사이트에 있다
  // 정렬 칩(0.47.0): 사이트 정렬 창의 10개를 그대로 쓴다.
  // 2026-11-07 실제 사이트(폰 크기 헤드리스)에서 사이트 정렬 창을 열어 읽은 목록: 할인 개시일이 새로운 순·할인 종료일이 가까운 순·
  // 인기순·발매일이 새로운 순·발매일이 오래된 순·판매수가 많은 순·가격이 낮은 순·가격이 높은 순·평가가 높은 순·리뷰가 많은 순.
  // 값(cstart_d·cend·trend·release_d·release·dl_d·price·price_d·rate_d·review_d)은 /fsr/·할인 목록 둘 다 HTTP 200 + 서로 다른 결과로 확인.
  // 전에는 7개만 있고 '할인 개시순'이 할인 검색일 때만 나와서 보통 화면엔 6개뿐이었다(사용자 지적: 종료일 가까운 순이 없다).
  // 세 번째 값은 칩 글자. 사이트와 같은 순서로 둔다.
  const SORTS = [
    ['cstart_d', '할인 개시일이 새로운 순', '개시'],
    ['cend', '할인 종료일이 가까운 순', '종료임박'],
    ['trend', '인기순', '인기'],
    ['release_d', '발매일이 새로운 순', '신작'],
    ['release', '발매일이 오래된 순', '오래된'],
    ['dl_d', '판매수가 많은 순', '판매'],
    ['price', '가격이 낮은 순', '저가'],
    ['price_d', '가격이 높은 순', '고가'],
    ['rate_d', '평가가 높은 순', '평가'],
    ['review_d', '리뷰가 많은 순', '리뷰'],
  ];
  // 검색 기본 조건(2026-11-02 사용자 결정): 신작순 · 한국어(koDefault) · TL + ASMR·보이스(FORMS) · 할인 없음 · 쿠폰 없음.
  // 주소에 정렬·대상이 없을 때 붙인다. 사이트 검색창(주소 끝 from/fs.header)은 정렬 trend·대상 TL+BL을 스스로 넣어서, 그때는 우리 기본으로 바꾸고 from을 뺀다
  const DEF_ORDER = 'release_d';
  // 0.49.0 즐겨찾기 정렬(2026-11-08 로그인 폰 화면의 사이트 정렬 상자 그대로, 주소 …/mypage/wishlist/=/order/값).
  // 사이트의 종료임박(cend)은 할인 없는 작품이 섞이고 '할인만'을 켜도 11/25가 11/12 사이에 끼는 버그가 있다 → 우리는 할인만 + 한 쪽 100개로 열고 카드의 마감 시각으로 다시 줄 세운다(list.wishSort)
  const WSORTS = [
    ['reserve_date_d', '즐겨찾기 등록일이 새로운 순', '등록'], ['reserve_date', '즐겨찾기 등록일이 오래된 순', '등록 오래된'],
    ['cstart_d', '할인 개시일이 새로운 순', '할인 개시'], ['cend', '할인 종료일이 가까운 순', '종료임박'],
    ['maker_name', '서클명 순', '서클명'], ['dl_count_d', '판매수 순', '판매'], ['regist_date_d', '발매일이 새로운 순', '신작'],
    ['regist_date', '발매일이 오래된 순', '오래된'], ['price_d', '가격이 높은 순', '고가'], ['price', '가격이 낮은 순', '저가'],
  ];
  const WISH_DEF = 'reserve_date_d';
  // 즐겨찾기 주소 고치기: '/=/' 뒤의 키/값 쌍(order·discount·per_page·page)을 바꾼다. 폴더 주소(…/wishlist/folder/=/folder_id/N)도 같은 모양
  function wishPath(p, set) {
    const i = p.indexOf('/=/');
    const head = (i < 0 ? p : p.slice(0, i)).replace(/\/+$/, '');
    const seg = i < 0 ? [] : p.slice(i + 3).split('/').filter(Boolean), pairs = [];
    for (let k = 0; k + 1 < seg.length; k += 2) if (!(seg[k] in set) && seg[k] !== 'page') pairs.push([seg[k], seg[k + 1]]);
    for (const [k, v] of Object.entries(set)) if (v != null) pairs.push([k, v]);
    return pairs.length ? head + '/=/' + pairs.map((x) => x.join('/')).join('/') : head + '/';
  }
  const wishGet = (p, k) => { const m = String(p).match(new RegExp('/' + k + '/([^/]+)')); return m ? m[1] : undefined; };
  // 바 정렬 칩 글자(짧게). SORTS의 10개를 다 담는다
  const SORT_NAME = {
    trend: '인기순', release_d: '신작순', release: '오래된순', cstart_d: '할인 개시순', cend: '종료임박순',
    price: '저가순', price_d: '고가순', dl_d: '판매순', review_d: '리뷰순', rate_d: '평가순',
  };
  // 0.48.0(사용자 결정): 대상 기본 없음 = 모든 형식. 층을 안 넣으면 사이트는 동인만 찾아서 work_category/all을 붙인다
  // (2026-11-07 실제 사이트: 없음 37883 / all 140436 / 동인+books+드라마 140360). 만화 작품에서 태그를 눌러도 만화가 나온다
  const DEF_FLOOR = { sex: ['girls'], forms: [] };
  const HEADER_SEARCH = /\/from\/fs\.header(?:\/|$)/;
  const floorDefOk = (p) => /\/fsr\/=/.test(p) && !COUPON_RE.test(p) && !NAME_SEARCH.test(p); // 이름 검색·쿠폰 대상은 대상 기본을 안 붙임(만화 작가 등)
  const floorUnset = (p) => { const pp = pathPairs(p); return !!pp && !pp.pairs.some((x) => FLOOR_KEYS.includes(segKey(x[0]))); }; // 0.48.0: work_category(all 포함)도 '정함'으로 본다
  const floorDefPairs = () => floorPairs(DEF_FLOOR);
  // 검색 주소 읽기·고치기. 사이트는 누를 때 주소를 order%5B0%5D/cend처럼 바꾸므로 [n]·%5Bn%5D는 무시하고 키로 본다
  const segKey = (k) => { try { k = decodeURIComponent(k); } catch (e) { /* 그대로 */ } return k.replace(/\[\d*\]$/, ''); };
  function pathPairs(pathname) {
    const m = pathname.match(/^(.*?\/fsr\/=\/)(.*)$/);
    if (!m) return null;
    const seg = m[2].split('/').filter(Boolean), pairs = [];
    for (let i = 0; i + 1 < seg.length; i += 2) pairs.push([seg[i], seg[i + 1]]);
    return { head: m[1], pairs };
  }
  const pathGet = (pathname, key) => { const p = pathPairs(pathname); const f = p && p.pairs.find((x) => segKey(x[0]) === key); return f ? f[1] : undefined; };
  const pathSet = (pathname, drop, add) => {
    const p = pathPairs(pathname);
    return p ? p.head + [...p.pairs.filter((x) => !drop.includes(segKey(x[0]))), ...add].map((x) => x.join('/')).join('/') : pathname;
  };
  // 칩에서 고른 조건은 바로 열지 않고 list.staged(고른 조건을 반영한 주소)에 모아 두었다가 '적용'에서 한 번에 연다
  const curPath = () => list.staged || location.pathname;
  // 0.46.0: 정렬(order)은 화면마다 조각 모양이 다르다(2026-11-05 실제 확인).
  //   검색(/fsr/…)은 order%5B0%5D/값, 그 밖 목록(할인·독점·장르·서클)은 order/값.
  //   /works/type/은 사이트가 정렬을 무시한다(라벨만 바뀜) → 칩을 흐리게 둔다.
  const isFsrPath = (p) => /\/fsr\/=/.test(String(p));
  // 비검색 목록 주소에서 order/값을 찾는다(…/order/price, ?order=price 둘 다)
  function nonSearchOrderGet(p) {
    const m = String(p).match(/\/order\/([a-z_]+)/);
    if (m) return m[1];
    try { return new URL('https://www.dlsite.com' + p).searchParams.get('order') || undefined; } catch (e) { return undefined; }
  }
  // 비검색 목록 주소의 order를 값으로 바꾼다. 없으면 붙인다. 실패하면 null.
  // 2026-11-05·06 사이트에서 실제로 열리는 모양(전부 200 확인):
  //   /circle/profile/=/order/price/maker_id/RG….html  ← .html 주소는 /=/ 바로 뒤
  //   /works/genre/=/genre/129/order/price             ← /=/ 가 이미 있으면 끝에
  //   /works/discount/=/order/price                    ← /=/ 자체가 없으면 '/=/'+order
  // (사이트는 ?order= 쿼리도 받지만, 사이트가 스스로 만드는 정식 경로 모양으로 통일한다)
  function nonSearchOrder(p, v) {
    const s = String(p).replace(/[?&]order=[^&]*/, '').replace(/[?&]$/, ''); // 쿼리 order는 지우고 경로로 만든다
    if (/\/order\/[a-z_]+/.test(s)) return s.replace(/\/order\/[a-z_]+/, '/order/' + v);
    if (/\.html$/.test(s)) {
      const k = s.indexOf('/=/');
      if (k < 0) return null;
      return s.slice(0, k + 3) + 'order/' + v + '/' + s.slice(k + 3);
    }
    if (/\/=/.test(s)) return s.replace(/\/$/, '') + '/order/' + v;
    return s.replace(/\/$/, '') + '/=/order/' + v;
  }
  // 주소에 order/값 또는 ?order=값 읽기
  const siteOrder = () => (isFsrPath(curPath()) ? pathGet(curPath(), 'order') : nonSearchOrderGet(curPath())) || 'trend';
  // 할인율 사이트 필터: discount_rates%5B0%5D/c8(30%↑)·c9(50%↑)·c10(80%↑) (2026-10-31 사이트 필터 창에서 확인, 서버가 거름. c7은 1~29%)
  const RATE_CODE = { 30: 'c8', 50: 'c9', 80: 'c10' };
  const urlRate = (p = curPath()) => { const c = pathGet(p, 'discount_rates'); return Number(Object.keys(RATE_CODE).find((k) => RATE_CODE[k] === c)) || 0; };
  const urlSale = (p = curPath()) => pathGet(p, 'campaign') === 'campaign' || pathGet(p, 'discount_rates') !== undefined;
  // 작품 언어: 검색 주소 options[n]/<값>(2026-10-30 사이트 필터에서 확인). 여러 개 넣으면 OR(일본어 33025 + 한국어 4239 → 37166)
  const LANGS = [['KO_KR', '한국어', '한'], ['JPN', '일본어', '일'], ['CHI_HANS', '중국어 간체', '간'], ['CHI_HANT', '중국어 번체', '번']];
  // 사이트 필터의 언어 값 전부(그 밖의 options[]는 그대로 둔다). NM = 언어 불필요(그림만 있는 작품 등), 언어를 고르면 같이 넣는다
  const LANG_ALL = /^(JPN|ENG|CHI|CHI_HANS|CHI_HANT|KO_KR|SPA|GER|FRE|IND|ITA|POR|SWE|THA|VIE|OTL|NM|DOT)$/;
  const OPT_SEG = /^options(?:%5B|\[)\d*(?:%5D|\])$/i;
  // 언어를 고를 수 있는 목록: 검색, 서클(주소 …/maker_id/RG….html/options[0]/JPN…, 2026-10-30 PC 서클 화면에서 확인)
  const LANG_PAGE = /\/(?:fsr|circle\/profile)\/(?:ajax\/)?=\/(.*)$/;
  const isCircle = (p) => /\/circle\/profile\//.test(p);
  // 0.48.0 검색이 아닌 목록에서도 필터 창 전부를 쓰게: 같은 작품을 찾는 검색 주소(/fsr/)로 바꿔 계산한다.
  // 2026-11-07 실제 사이트(폰) 건수: 할인 목록 22437 ↔ fsr campaign/campaign 22422, 독점 15479 ↔ dlsite_only/1 15464,
  // 장르 /works/genre/=/genre/129 1840 ↔ fsr 1840, 형식 /works/type/=/work_type_category/comic 10700 ↔ fsr 10700.
  // 할인·독점 목록은 주소에 조건을 붙여도 무시한다(그대로 22437·15479) → 검색 화면으로 넘어간다.
  // 서클은 /=/ 뒤(maker_id 앞)에 조건을 붙이면 사이트가 거른다(가격 500↓ 0건·1000↓ 35건, 망가 35·SOU 0, 할인 20 → 18) → 서클 화면에 남는다.
  // { fsr: 계산에 쓸 /fsr/ 주소, base: 그 목록의 처음 상태(리셋 기준), back: 계산한 /fsr/ 주소 → 실제로 열 주소 }. 못 바꾸면 null(이벤트·묶음 할인)
  function fsrOf(p) {
    const m = String(p).match(/^(\/[^/]+)\/(.*)$/);
    if (!m) return null;
    const head = m[1] + '/fsr/=/', same = (np) => np;
    if (/^works\/discount(?:\/|$)/.test(m[2])) return { fsr: head + 'campaign/campaign', base: head + 'campaign/campaign', back: same };
    if (/^works\/exclusive(?:\/|$)/.test(m[2])) return { fsr: head + 'dlsite_only/1', base: head + 'dlsite_only/1', back: same };
    let t = m[2].match(/^works\/(?:type|genre)\/=\/(.*)$/);
    if (t) { const q = head + t[1].replace(/\/+$/, ''); return { fsr: q, base: q, back: same }; }
    t = m[2].match(/^circle\/profile\/=\/(.*)$/);
    if (!t) return null;
    const seg = t[1].split('/').filter(Boolean), keep = [];
    let mk = '';
    for (let i = 0; i + 1 < seg.length; i += 2) { if (seg[i] === 'maker_id') mk = seg[i + 1].replace(/\.html$/, ''); else keep.push(seg[i], seg[i + 1]); }
    if (!mk) return null;
    return { fsr: head + keep.join('/'), base: head, back: (np) => np.replace(/\/fsr\/=\/?/, '/circle/profile/=/').replace(/\/+$/, '') + `/maker_id/${mk}.html` };
  }
  // 지금 언어(language/jp는 주소에 언어 options[]가 없을 때만 사이트가 JPN으로 읽는다. KO_KR가 같이 있으면 한국어 작품만 나옴, 2026-11-01 확인).
  // 서클은 주소에 없으면 사이트가 일본어·언어 불필요를 기본으로 체크하므로 화면의 체크를 읽는다
  function langNow(pathname) {
    const m = pathname.match(LANG_PAGE);
    if (!m) return [];
    const seg = m[1].split('/');
    const out = new Set();
    let jp = false, hasLang = false;
    for (let i = 0; i + 1 < seg.length; i += 2) {
      if (OPT_SEG.test(seg[i])) { out.add(seg[i + 1]); if (LANG_ALL.test(seg[i + 1])) hasLang = true; }
      if (seg[i] === 'language' && seg[i + 1] === 'jp') jp = true;
    }
    if (jp && !hasLang) out.add('JPN');
    if (!out.size && isCircle(pathname)) for (const i of document.querySelectorAll('input[name="options[]"]:checked')) out.add(i.value);
    return LANGS.map((x) => x[0]).filter((k) => out.has(k));
  }
  // 언어를 바꾼 주소. 언어 값과 language/jp·page는 빼고, 다른 options[]는 번호를 다시 매겨 남긴다.
  // 서클은 언어가 없으면 사이트가 일본어로 되돌리므로, 다 끄면 네 언어를 다 넣는다(= 전체)
  function langPath(pathname, langs) {
    const m = pathname.match(/^(.*?\/(?:fsr|circle\/profile)\/=\/)(.*)$/);
    if (!m) return null;
    if (!langs.length && isCircle(pathname)) langs = LANGS.map((x) => x[0]);
    const seg = m[2].split('/').filter(Boolean);
    const rest = [], opts = [];
    for (let i = 0; i + 1 < seg.length; i += 2) {
      if (OPT_SEG.test(seg[i])) { if (!LANG_ALL.test(seg[i + 1])) opts.push(seg[i + 1]); continue; }
      if ((seg[i] === 'language' && seg[i + 1] === 'jp') || seg[i] === 'page') continue;
      rest.push(seg[i], seg[i + 1]);
    }
    const all = [...langs, ...opts];
    return m[1] + [...all.flatMap((v, i) => [`options%5B${i}%5D`, v]), ...rest].join('/');
  }

  const AGE_GATE = /年齢認証|年齢確認|adult_?check|age_?check|18歳未満/i;
  function fetchDoc(href, credentials) {
    return netFetch(href, { credentials }, 'text')
      .then((t) => { net.good(); return { t, doc: new DOMParser().parseFromString(t, 'text/html') }; });
  }
  function jaFetch(url, looksOk = () => true) {
    const u = new URL(url, location.href);
    u.searchParams.set('locale', 'ja_JP');
    return fetchDoc(u.href, 'omit').then(({ t, doc }) => {
      if (looksOk(doc) || !AGE_GATE.test(t)) return doc;
      return fetchDoc(u.href, 'include').then((r) => { locale.enforce(false); return r.doc; });
    });
  }
  const safeUrl = (raw) => {
    try {
      const u = new URL(raw, 'https://www.dlsite.com');
      return u.protocol === 'https:' && /(^|\.)dlsite\.com$/.test(u.hostname) ? u : null;
    } catch (e) { return null; }
  };

  /* ========== 6. clean ========== */
  const clean = {
    bannersHidden: new Set(),
    bannerSeen: new WeakSet(), // 이미 판정한 이미지는 다시 보지 않는다(옵션을 바꾸면 resetBanners로 비움)
    resetBanners() { clean.bannerSeen = new WeakSet(); clean.banners(); },
    banners() {
      const on = opt('hideBanners');
      for (const img of document.querySelectorAll('a[href] img')) {
        if (clean.bannerSeen.has(img)) continue;
        const src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
        if (!src || /^data:|blank|spacer|1x1/i.test(src)) continue; // 지연 로딩 자리표시자면 나중에 진짜 주소로 다시 본다
        const link = img.closest('a[href]');
        if (link.closest(OURS)) continue;
        clean.bannerSeen.add(img);
        if (!(BANNER_IMG.test(src) || (FEATURE_IMG.test(src) && FEATURE_HREF.test(link.href))) || NOT_BANNER_IMG.test(src)) continue;
        const label = (img.alt || '') + ' ' + (link.title || '') + ' ' + (link.textContent || '');
        const keep = KEEP_HREF.test(link.href) || KEEP_TEXT.test(label);
        const box = link.closest('li') || link;
        if (!keep && on) { hide(box, 'dlhHid'); clean.bannersHidden.add(box); }
        else if (box.dataset.dlhHid === '1') { box.style.display = ''; box.dataset.dlhHid = ''; clean.bannersHidden.delete(box); }
      }
      setText('dlh-hid', `숨긴 배너 ${clean.bannersHidden.size}개`);
    },

    seenFloorLinks: new WeakSet(),
    floors() {
      if (!opt('onlyTlBl')) return;
      const touched = new Set();
      for (const a of document.querySelectorAll('a[href]')) {
        if (clean.seenFloorLinks.has(a)) continue;
        clean.seenFloorLinks.add(a);
        if (a.closest(OURS)) continue;
        let u;
        try { u = new URL(a.href, location.href); } catch (e) { continue; }
        if (!/(^|\.)dlsite\.com$/.test(u.hostname)) continue;
        const seg = u.pathname.split('/').filter(Boolean);
        if (!seg.length) continue;
        const fl = seg[0].replace(/-touch$/, '');
        const sub = seg[1] || '';
        const isFloorLink = seg.length === 1 || (seg.length === 2 && FLOOR_SUB.test(sub));
        if (!isFloorLink || (ALLOWED_FLOORS.includes(fl) && sub !== 'girlsgame')) continue;
        const box = a.closest('li') || a;
        box.style.display = 'none';
        touched.add(box.parentElement);
      }
      for (const ul of touched) {
        if (!ul || ul === document.body) continue;
        const kids = [...ul.children];
        if (!kids.length || !kids.every((k) => k.style.display === 'none')) continue;
        ul.style.display = 'none';
        const prev = ul.previousElementSibling;
        if (prev && prev.textContent.trim().length < 20) prev.style.display = 'none';
      }
    },

    // 쿠폰 팝업 검사: COUPON_HINT가 있는 텍스트 노드만 찾는다. '팝업 아님'으로 본 컨테이너는 글자 수가 같을 때만 건너뛴다.
    // (팝업처럼 보이는데 아직 고정 컨테이너를 못 찾은 경우는 기록하지 않아 다음 검사에서 다시 본다)
    popSeen: new WeakMap(),
    couponPopup() {
      if (!opt('hideCouponPop')) return;
      const checked = clean.popSeen;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement && COUPON_HINT.test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
      });
      for (let tn = walker.nextNode(); tn; tn = walker.nextNode()) {
        const host = tn.parentElement;
        if (!host || host.closest(OURS)) continue;
        if (host.closest('[data-dlh-pop]')) continue;
        const box = host.closest('a,div,section,aside') || host;
        const t = box.textContent || '';
        if (checked.get(box) === t.length) continue;
        if (t.length > 120 || !COUPON_POP.test(t)) { checked.set(box, t.length); continue; }
        for (let p = box; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
          if ((p.textContent || '').length > POP_MAX_TEXT) break; // 팝업 말고 다른 내용까지 든 컨테이너는 숨기지 않는다
          const pos = getComputedStyle(p).position;
          if (pos === 'fixed' || pos === 'sticky') { hide(p, 'dlhPop'); break; }
        }
      }
    },
  };

  /* ========== 6.5 공통: 성우 이름 나누기 ========== */
  const splitVa = (s) => (s && s !== '-' ? s.split(/\s*[\/／、,，・]\s*/).map((x) => x.trim()).filter(Boolean) : []);

  /* ========== 7. list ==========
     작품 목록 찾기 + 상단 바. 화면에 불러온 작품만 대상이다. */
  const list = {
    state: {
      sale: opt('sb.sale'), rate: opt('sb.rate'),
      coupon: opt('sb.coupon'),
    },
    _items: null,
    _anchorCount: -1, // 0.47.2: items()를 훑을 때의 작품 링크 개수(바뀌었는지 싸게 비교하는 용도)
    _cardCache: new WeakMap(), // 카드별 정적 파싱 결과 캐시 (매 apply마다 정규식·textContent 재실행 방지)
    _priceMiss: new WeakMap(), // 가격이 아직 안 보인 카드의 재시도 횟수
    _thumbCache: new WeakMap(), // 카드별 대표 썸네일 캐시
    _pendingPlaces: new Map(), // box -> card (일괄 위치 계산 큐)
    _rafId: 0,
    _applyTimer: 0,

    invalidate() { list._items = null; list._anchorCount = -1; },

    // 0.47.2: tidy()가 MutationObserver마다 불리는데, 그때마다 items() 전체를 다시 훑으면
    // 사이트가 DOM을 조금만 바꿔도 매번 O(카드수 × 트리깊이) 탐색이 돌아 스크롤이 버벅인다.
    // 그래서 '카드 목록이 실제로 바뀌었을 때만' 무효화한다. 확인은 싼 방법 두 가지로:
    //  (1) 첫 카드가 아직 화면에 붙어 있나(isConnected, O(1))
    //  (2) 작품 링크 개수가 그대로인가(브라우저 querySelectorAll 1회. items()의 Map·조상탐색보다 훨씬 싸다)
    invalidateIfStale() {
      const it = list._items;
      if (!it) return; // 아직 안 훑었으면 다음 items()가 알아서 한다
      if (!it.length) { // 카드가 없던 화면: 링크가 새로 생겼을 때만 다시 본다
        if (document.querySelectorAll('a[href*="/product_id/"]').length !== list._anchorCount) list.invalidate();
        return;
      }
      if (!it[0].isConnected || !it[it.length - 1].isConnected) { list.invalidate(); return; }
      if (document.querySelectorAll('a[href*="/product_id/"]').length !== list._anchorCount) list.invalidate();
    },

    // 여러 곳에서 동시에 부르는 apply를 하나로 묶어 실행
    scheduleApply(ms = 120) {
      clearTimeout(list._applyTimer);
      list._applyTimer = setTimeout(() => list.apply(), ms);
    },

    items() {
      if (list._items) return list._items;
      const ids = new Map();
      const anchors = [];
      const all = document.querySelectorAll('a[href*="/product_id/"]');
      list._anchorCount = all.length; // invalidateIfStale()이 '카드가 바뀌었나'를 이 숫자로 싸게 비교한다
      for (const a of all) {
        const pid = pidOf(a.href);
        if (!pid || a.closest(OURS)) continue;
        anchors.push(a);
        for (let n = a; n && n !== document.body; n = n.parentElement) {
          let s = ids.get(n);
          if (!s) ids.set(n, (s = new Set()));
          s.add(pid);
        }
      }
      const cards = new Set();
      for (const a of anchors) {
        let e = a;
        while (e.parentElement && e.parentElement !== document.body && ids.get(e.parentElement).size <= 1) e = e.parentElement;
        cards.add(e);
      }
      const groups = new Map();
      for (const e of cards) {
        const g = groups.get(e.parentElement) || [];
        g.push(e);
        groups.set(e.parentElement, g);
      }
      let best = [];
      for (const g of groups.values()) if (g.length > best.length) best = g;
      list._items = best.length >= 3 ? best : [];
      return list._items;
    },

    // 카드의 "～12/25 23:59까지" 같은 마감 시각을 ms로. 연도가 없어서 지금 연도로 추정한다.
    // 0.47.3: 1월 초에 "12/31"을 보면 '올해 12월 31일'(약 1년 뒤)로 계산되던 것 고침.
    //   규칙: 올해로 잡아 30일 넘게 과거면 → 내년(연말에 본 "1/5"). 올해로 잡아 330일 넘게 미래면 → 작년(1월에 본 "12/31").
    //   판매 마감은 보통 몇 달 안이라 두 경우 다 '가까운 해'가 맞다.
    parseEnd(t) {
      const m = t.match(/[~～〜]\s*(\d{1,2})\/(\d{1,2})\s*(?:[(（][^)）]*[)）]\s*)?(\d{1,2})[:時]\s*(\d{2})?/);
      if (!m) return Infinity;
      const now = Date.now();
      const mk = (y) => new Date(y, +m[1] - 1, +m[2], +m[3], +(m[4] || 0));
      const y = new Date(now).getFullYear();
      let d = mk(y);
      if (d < now - 30 * 864e5) d = mk(y + 1);        // 연말에 본 이듬해 1월
      else if (d > now + 330 * 864e5) d = mk(y - 1);  // 1월에 본 지난해 12월
      return +d;
    },

    // 카드의 정적 텍스트·할인율·마감일은 최초 1회만 파싱하여 WeakMap에 저장하고,
    // 나중에 받는 성우(vas)만 결합해 반환한다.
    read(e, i) {
      let base = list._cardCache.get(e);
      if (!base) {
        const rawText = e.textContent || '';
        const a = e.querySelector('a[href*="/product_id/"]');
        const id = a && pidOf(a.href);
        const rates = [...rawText.matchAll(/(\d{1,3})\s*%\s*(?:OFF|오프)/gi)].map((m) => +m[1]).filter((n) => n > 0 && n < 100);
        base = {
          id,
          cardVa: voice.fromCard(e),
          sale: SALE_RE.test(rawText) || !!e.querySelector('.strike,del,s'),
          rate: rates.length ? Math.max(...rates) : 0,
          ai: AI_RE.test(rawText),
          end: list.parseEnd(rawText),
          names: list.names(e),
        };
        // 가격이 아직 없으면 '할인 아님'으로 굳히지 않는다(최대 5번까지 다시 읽고, 그래도 없으면 확정)
        const miss = (list._priceMiss.get(e) || 0) + 1;
        if (base.sale || PRICE_RE.test(rawText) || miss >= 5) list._cardCache.set(e, base);
        else list._priceMiss.set(e, miss);
      }
      const id = base.id;
      const got = id ? voice.getCached(id) : null; // 받아 온 전체 성우가 있으면 그것, 없으면 카드의 이름
      const vas = got ? splitVa(got) : base.cardVa ? base.cardVa.names : [];
      return {
        e, i, id, vas,
        more: !got && !!(base.cardVa && base.cardVa.more), // 카드에 첫 성우만 있음(아직 다 안 받음)
        sale: base.sale,
        rate: base.rate,
        ai: base.ai,
        end: base.end,
        names: base.names,
      };
    },

    // 카드의 서클·작가·성우 링크 이름. 링크 글자와 주소 속 원래 이름(자동 번역돼도 그대로)을 둘 다 넣는다.
    names(e) {
      const out = [];
      for (const a of e.querySelectorAll('a[href*="/maker_id/"], a[href*="/keyword_creater/"], a[href*="/keyword_maker_name/"]')) {
        out.push(normName(a.textContent));
        const m = (a.getAttribute('href') || '').match(/\/keyword_(?:creater|maker_name)\/([^/?#]+)/);
        if (m) { try { out.push(normName(decodeURIComponent(m[1]))); } catch (err) { /* 잘못된 주소 */ } }
      }
      return out.filter(Boolean);
    },

    thumb(card) {
      const cachedImg = list._thumbCache.get(card);
      if (cachedImg && cachedImg.isConnected) return cachedImg;
      const imgs = card.querySelectorAll('img');
      if (imgs.length === 1) {
        list._thumbCache.set(card, imgs[0]);
        return imgs[0];
      }
      let best = null;
      let area = 0;
      for (const img of imgs) {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (w * h > area) { area = w * h; best = img; }
      }
      if (best && area > 2500) list._thumbCache.set(card, best);
      return best || imgs[0] || null;
    },

    host(card) {
      const img = list.thumb(card);
      if (!img) return null;
      return (img.closest('a') || img).parentElement;
    },

    _cb: new WeakMap(),
    cbOf(box) {
      let cb = list._cb.get(box);
      if (cb !== undefined && (cb === null || cb.isConnected)) return cb;
      cb = null;
      for (let n = box.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.position !== 'static' || cs.transform !== 'none') { cb = n; break; }
      }
      list._cb.set(box, cb);
      return cb;
    },

    // 강제 리플로우(Layout Thrashing) 방지:
    // 개별 place 호출을 큐에 모았다가 requestAnimationFrame에서
    // 1) 모든 getBoundingClientRect() 읽기 수행 -> 2) 모든 style 쓰기 수행 순서로 일괄 처리한다.
    queuePlace(box, card) {
      list._pendingPlaces.set(box, card);
      if (list._rafId) return;
      list._rafId = requestAnimationFrame(() => {
        list._rafId = 0;
        list.flushPlaces();
      });
    },

    flushPlaces() {
      if (!list._pendingPlaces.size) return;
      const entries = [...list._pendingPlaces.entries()];
      list._pendingPlaces.clear();

      // 1단계: DOM/레이아웃 읽기 전용 (리플로우 최대 1회)
      const sY = window.scrollY;
      const sX = window.scrollX;
      const cbRects = new Map();
      const reads = [];

      for (const [box, card] of entries) {
        if (!box.isConnected || !card.isConnected) continue;
        const img = list.thumb(card);
        if (!img) continue;
        const ir = img.getBoundingClientRect();
        if (ir.height < 20) continue; // 숨겨졌거나 아직 안 그려짐
        const cb = list.cbOf(box);
        let top, left;
        if (cb) {
          let cr = cbRects.get(cb);
          if (!cr) {
            cr = {
              rect: cb.getBoundingClientRect(),
              clientTop: cb.clientTop,
              clientLeft: cb.clientLeft,
              scrollTop: cb.scrollTop,
              scrollLeft: cb.scrollLeft,
            };
            cbRects.set(cb, cr);
          }
          top = Math.round(ir.top - cr.rect.top - cr.clientTop + cr.scrollTop);
          left = Math.round(ir.left - cr.rect.left - cr.clientLeft + cr.scrollLeft);
        } else {
          top = Math.round(ir.top + sY);
          left = Math.round(ir.left + sX);
        }
        reads.push({
          box,
          top: top + 'px',
          left: left + 'px',
          width: Math.round(ir.width) + 'px',
          height: Math.round(ir.height) + 'px',
        });
      }

      // 2단계: 스타일 쓰기 전용 (레이아웃 재계산 유발 없음)
      for (const r of reads) {
        const st = r.box.style;
        if (st.top !== r.top) st.top = r.top;
        if (st.left !== r.left) st.left = r.left;
        if (st.width !== r.width) st.width = r.width;
        if (st.height !== r.height) st.height = r.height;
      }
    },

    _ro: null,
    _roFn: null,
    _roTargets: null, // 0.47.2: 관찰 중인 노드(사이트가 카드를 새로 그리면 옛 노드를 해제하려고)
    // 0.47.2: ResizeObserver는 observe()만 하고 unobserve()를 안 하면, 사이트가 카드를 새로 그릴 때마다
    // 옛 노드(이미 분리된 DOM)를 계속 관찰한다. 목록을 여러 번 넘기면 관찰 대상이 계속 쌓여 느려지고 발열이 생긴다.
    // 지금 관찰 중인 노드를 Set으로 들고 있다가, 끊어진 노드는 unobserve 한다(watch() 때마다 한 번씩).
    _sweepRo() {
      if (!list._ro || !list._roTargets) return;
      for (const n of list._roTargets) if (!n.isConnected) { list._ro.unobserve(n); list._roTargets.delete(n); }
    },
    watch(box, card) {
      if (box.dataset.dlxWatch) return;
      const img = list.thumb(card);
      if (!img) return;
      box.dataset.dlxWatch = '1';
      const redo = () => list.queuePlace(box, card);
      if (!list._ro && 'ResizeObserver' in window) {
        list._roFn = new WeakMap();
        list._roTargets = new Set();
        list._ro = new ResizeObserver((es) => es.forEach((en) => { const f = list._roFn.get(en.target); if (f) f(); }));
      }
      if (list._ro) {
        if (list._roTargets.size > 400) list._sweepRo(); // 400개 넘을 때만 훑는다(보통은 비용 0)
        for (const n of [img, box.parentElement]) if (n) { list._roFn.set(n, redo); list._ro.observe(n); list._roTargets.add(n); }
      } else window.addEventListener('resize', redo);
      img.addEventListener('load', redo, { passive: true });
    },

    dlw(id) {
      const a = el('a', { class: 'dlw', href: DLW_URL(id), 'aria-label': 'DLwatcher에서 ' + id + ' 보기' }, 'DLW');
      // 0.52.0 짧게 = DLwatcher로, 0.5초 꾹 = 품번 팝업(복사 버튼, 바깥을 누르면 닫힘)
      let t = 0, long = false;
      const stop = () => clearTimeout(t);
      a.addEventListener('pointerdown', () => { long = false; stop(); t = setTimeout(() => { long = true; list.dlwPop(a, id); }, 500); });
      for (const e of ['pointerup', 'pointercancel', 'pointerleave']) a.addEventListener(e, stop);
      a.addEventListener('contextmenu', (ev) => ev.preventDefault());
      a.addEventListener('click', (ev) => { ev.stopPropagation(); if (long) { ev.preventDefault(); long = false; } });
      a.style.webkitTouchCallout = 'none';
      return a;
    },
    dlwPop(a, id) {
      document.getElementById('dlwp')?.remove();
      const r = a.getBoundingClientRect();
      const btn = el('button', { class: 'dlwb', type: 'button' }, '복사');
      const pop = el('div', { id: 'dlwp', role: 'dialog', 'aria-label': '품번' }, el('span', {}, id), btn);
      btn.addEventListener('click', (ev) => { ev.stopPropagation(); copyText(btn, id); setTimeout(() => pop.remove(), 600); });
      pop.style.top = Math.round(r.bottom + 6) + 'px';
      pop.style.left = Math.max(8, Math.min(innerWidth - 170, Math.round(r.right - 160))) + 'px';
      document.documentElement.append(pop);
      const off = (ev) => { if (pop.contains(ev.target)) return; pop.remove(); document.removeEventListener('pointerdown', off, true); };
      setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
    },

    deco(x) {
      const card = x.e;
      const boxes = card.querySelectorAll('.dlx');
      for (let i = 1; i < boxes.length; i++) boxes[i].remove();
      let box = boxes[0];
      if (!box) {
        const h = list.host(card);
        if (!h) return;
        box = el('div', { class: 'dlx' });
        h.append(box);
      }
      list.watch(box, card);
      list.queuePlace(box, card);
      list.row(card, x);
      list.saleTag(card);
      // 0.49.0 사진 위 띠(사용자 시안): 왼쪽 CV(음성)·작가(그 밖), 오른쪽 쿠폰·묶음 딱지. DLW·품번은 제목 위 줄(list.row)로 옮겼다.
      // 장바구니·즐겨찾기는 이름을 안 띄우고, 장바구니 쿠폰은 cart.paint(.dlcp)가 따로 그린다
      const my = route.isMy(location.pathname);
      const bs = route.isRank(location.pathname) ? [] : (coupon.badges(x.id) || []);
      const who = my ? null : list.person(card, x);
      const due = my ? list.due(x) : null;
      const sig = [who ? who.k + who.names.join('/') + who.tail : '', bs.map((b) => b.join(':')).join(','), due ? due.k + due.t : ''].join('|');
      const mine = card.querySelector('.dlch, dd.n_work_option .dlcpn'), dueOn = card.querySelector('.dldue');
      const grid = !route.isCart(location.pathname) && !route.isRank(location.pathname); // 0.51.2 격자 카드는 쿠폰이 형식 줄(list.row)에 있어 가격 아래 칩 줄은 마감 칸이 있을 때만
      const needCover = grid && x.id;
      if (box.dataset.sig === sig && (mine || grid ? !(grid && due && card.querySelector('.n_work_price_wrap')) || mine : !(bs.length || due || card.querySelector('.n_work_price_wrap .dlsl, .n_work_price_wrap .overseas_discount_label') || (!route.isCart(location.pathname) && !route.isRank(location.pathname) && card.querySelector('.n_work_price_wrap')))) && (dueOn || !(due && card.querySelector('.n_work_price_wrap'))) && (!needCover || box.querySelector('.dlw'))) return;
      box.dataset.sig = sig;
      const name = who ? list.nameChip(who) : null;
      const cover = !route.isCart(location.pathname) && !route.isRank(location.pathname);
      box.replaceChildren(...(name ? [el('div', { class: 'dlbd' }, name)] : []), ...(cover && x.id ? [list.dlw(x.id)] : []));
      list.chips(card, bs, due);
      if (route.isCart(location.pathname)) list.cartFoot(card);
    },
    // 0.50.2 장바구니: 언어 라벨 → 카트로 되돌린다 → ☆ → 🗑을 한 줄로 이어 붙인다(라벨 바로 오른쪽에서 시작, 세로 가운데 같게). 위치는 카드마다 라벨 폭이 달라 재서 정한다
    cartFoot(card) {
      const o = card.querySelector('dd.n_work_option'), f = card.querySelector('dd.cart_item_foot');
      if (!o || !f || !o.getClientRects().length || !o.firstElementChild) return;
      const chips = [...o.children], oh = o.getBoundingClientRect(), ml = parseFloat(getComputedStyle(o).marginLeft) || 0;
      const last = chips.reduce((w, c) => Math.max(w, c.getBoundingClientRect().right), 0); // 라벨들이 끝나는 곳
      f.style.setProperty('margin-left', Math.round(ml + (last - oh.left) + 10) + 'px', 'important');
      const cy = (e) => { const r = e.getBoundingClientRect(); return (r.top + r.bottom) / 2; };
      const link = f.querySelector('a') || f;
      let mt = -Math.round((oh.height + f.getBoundingClientRect().height) / 2);
      f.style.setProperty('margin-top', mt + 'px', 'important');
      const d = cy(o.firstElementChild) - cy(link); // 라벨 글자 줄과 링크 글자 줄의 세로 차이를 한 번 더 보정
      if (Math.abs(d) >= 0.5) f.style.setProperty('margin-top', (mt + Math.round(d)) + 'px', 'important');
      // 라벨이 둘 이상(전연령·한국어 등)이라 링크가 카드 끝을 넘으면 글자가 접히므로, 그 카드만 라벨 아래 줄 오른쪽 끝으로 내린다
      const L = card.getBoundingClientRect();
      if (f.getBoundingClientRect().right > L.right - 4 || f.getBoundingClientRect().height > 22) {
        f.style.setProperty('margin-left', '0px', 'important'); f.style.setProperty('margin-top', '4px', 'important'); f.style.setProperty('align-self', 'flex-end', 'important');
      }
    },
    // 0.50.0 가격 아래 칩(쿠폰 파랑·묶음 보라)과 가격 옆 마감 칸. 가격 칸(.n_work_price_wrap)이 없는 카드는 안 붙인다
    chips(card, bs, due) {
      bs = bs || [];
      const pw = card.querySelector('.n_work_price_wrap');
      const at = pw || card.querySelector('.n_work_name, .work_name, .dlrow'); // 가격 칸이 없으면 제목(없으면 제목 위 줄) 바로 아래
      for (const o of card.querySelectorAll('.dlch, .dldue, dd.n_work_option .dlcpn')) o.remove();
      // 0.51.2 장바구니: 묶음·쿠폰은 언어·연령 딱지 줄 맨 뒤로(사용자: R18 · 한국어 · 묶음 · 쿠폰 순, 한 줄)
      const lab = route.isCart(location.pathname) && bs.length ? card.querySelector('dd.n_work_option') : null;
      if (lab) {
        lab.append(...[...bs].sort((a, b) => (b[0] === 'bk') - (a[0] === 'bk')).map(([c, t]) => el('span', { class: 'dlcpn' + (c === 'bk' ? ' bk' : '') }, t)));
        bs = [];
      }
      if (pw) { const sl0 = pw.querySelector('.dlsl, .overseas_discount_label'); if (sl0 && pw.firstElementChild !== sl0) pw.prepend(sl0); } // 0.50.2 할인율 칸은 가격 왼쪽(같은 줄, 사용자 편집본)
      if (!at || route.isRank(location.pathname)) return; // 랭킹은 칩 줄 없음
      const keep = !route.isCart(location.pathname) && !!pw; // 2열 카드는 비어 있어도 줄 높이를 남겨 옆 카드와 맞춘다
      if (!bs.length && !(due && pw) && !keep) return;
      const ch = el(at.tagName === 'DD' ? 'dd' : 'div', { class: 'dlch' }, ...(due && pw ? [el('span', { class: 'dldue ' + due.k }, due.t)] : []), ...bs.map(([c, t]) => el('span', { class: 'dlcpn' + (c === 'bk' ? ' bk' : '') }, t)));
      at.after(ch);
    },
    // 마감 칸 글자: 오늘 마감 HH:MM(빨간 테두리) · 3일 안 D-n MM/DD(주황) · 그 뒤(회색). 마감 시각은 카드 글자(~ 11/12 13:59)에서 읽는다(요청 없음), 없으면 칸을 안 붙인다
    due(x) {
      if (!isFinite(x.end) || x.end < Date.now()) return null;
      const e = new Date(x.end), n = new Date(), day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const d = Math.round((day(e) - day(n)) / 864e5), p2 = (v) => String(v).padStart(2, '0');
      if (d <= 0) return { k: 'hot', t: `오늘 마감 ${p2(e.getHours())}:${p2(e.getMinutes())}` };
      return { k: d <= 3 ? 'mid' : 'low', t: `D-${d} ${e.getMonth() + 1}/${e.getDate()}` };
    },
    // 띠에 띄울 사람: 음성은 성우(x.vas), 그 밖(만화 등)은 카드의 작가 링크(keyword_creater) 글자. 카드에 있는 것만 쓴다(요청 없음)
    person(card, x) {
      if (x.vas.length) return { k: 'CV', names: x.vas.slice(0, 2), tail: x.vas.length > 2 ? ' +' + (x.vas.length - 2) : x.more ? ' +' : '', all: x.vas.join(' / ') };
      const a = card.querySelector('a[href*="keyword_creater"]');
      const n = a && a.textContent.trim();
      return n ? { k: '작가', names: [n], tail: '', all: n } : null;
    },
    // 이름: 짧게 = 복사, 꾹 = 그 이름으로 검색(사이트 작가 링크와 같은 주소 keyword_creater/"이름"/ana_flg/all, 이름 검색이라 기본 조건은 안 붙는다)
    nameChip(who) {
      const node = el('span', { class: 'dlva', title: who.all + ' (꾹 = 검색)' }, el('i', {}, who.k));
      node.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); }); // 사진 링크로 안 넘어가게
      who.names.forEach((name, i) => { // 0.49.1 이름마다 따로: 짧게 = 복사, 꾹 = 그 이름 검색
        const n = el('span', { class: 'dlnm' }, name);
        pressable(n, () => copyText(n, name), () => nameMenu(name, who.k === 'CV' ? '성우' : '작가', n)); // 0.53.0 꾹 = 메뉴(검색·검색어 저장·차단)
        node.append(...(i ? [' / '] : []), n);
      });
      if (who.tail) node.append(who.tail);
      return node;
    },
    // 누르거나 길게 누르면 작품을 열지 않고(링크·이미지 메뉴도 막고) 글자 복사. 복사되면 잠깐 초록색
    copier(node, text) {
      const copy = (ev) => { ev.preventDefault(); ev.stopPropagation(); copyText(node, text); };
      for (const t of ['click', 'contextmenu']) node.addEventListener(t, copy);
      return node;
    },
    // 할인율을 가격 옆 작은 딱지로(0.42.0, 폰 카드). 원화 화면은 사이트가 가격 옆(.overseas_discount_label)에 넣고, 엔화 화면은 아래 빨간 띠(.n_sale_state)에만 있어
    // 그 글자를 가격 옆에 복사한다. 띠·サンプル/カート 버튼 줄은 CSS로 숨김(작품 화면에 들어가면 그대로 있음)
    saleTag(card) {
      const pw = card.querySelector('.n_work_price_wrap');
      if (!pw || pw.querySelector('.icon_campaign') || card.querySelector('.dlsl, .dlch .icon_campaign')) return;
      const s = card.querySelector('.n_sale_state .icon_campaign, .sale_discount_rate'); // 0.50.0 즐겨찾기 카드는 .sale_discount_rate에 할인율이 있다
      if (s && s.textContent.trim()) pw.append(el('span', { class: 'dlsl' }, s.textContent.trim()));
    },
    // 사진 아래 한 줄(정리안3): 품번(누르면 복사) · 쿠폰·묶음 · ♥(로그인일 때). 사진 칸(dt 등) 바로 뒤에 넣는다
    // 0.49.0: 제목 바로 위 한 줄 = DLW · 품번(설정 '품번 표시'일 때). 제목 칸이 없는 카드는 예전처럼 사진 칸 바로 뒤
    row(card, x) {
      const img = list.thumb(card);
      let tb = img && card.contains(img.closest('dt')) ? img.closest('dt') : img; // 사진 칸(dt), 없으면 카드 바로 아래에서 사진을 품은 칸
      while (tb && tb.parentElement && tb.parentElement !== card && !(tb.tagName === 'DT')) tb = tb.parentElement;
      if (!x.id || !tb || tb === card || !card.contains(tb)) return;
      const rank = route.isRank(location.pathname); // 0.50.2 랭킹도 오른쪽 칸 맨 위 줄(형식·품번·DLW, 사용자 편집본), 랭킹은 품번을 늘 보인다
      const ttl = card.querySelector('.n_work_name, .work_name');
      const pidOn = !!opt('showPid') || rank;
      let r = card.querySelector('.dlrow');
      const at = ttl ? r === ttl.previousElementSibling : r === tb.nextElementSibling; // 자리가 맞나(사이트가 다시 그리면 어긋난다)
      const on = fav.has(x.id);
      const sc = card.querySelector('a.btn_cart'); // 사이트 장바구니(만화 등): 숨기고 아이콘 버튼이 이걸 대신 누른다
      let act = card.querySelector(':scope > .dlact');
      const onCover = !route.isCart(location.pathname) && !route.isRank(location.pathname); // 0.50.0 사용자 결정: 즐겨찾기·검색 목록은 DLW를 표지 오른쪽 위에(list.deco)
      const bs = onCover ? (coupon.badges(x.id) || []) : []; // 0.51.2 쿠폰·묶음은 형식 딱지 옆(사용자 확정 C안). 장바구니·랭킹은 가격 아래(list.chips)
      const ag = onCover ? voice.agreeFor(x.id) : undefined; // 0.53.0 번역 허가 ○/✕(받은 적 없으면 안 그림)
      const sig = [x.id, fav.ok(), on, !!sc, !!act, pidOn, bs.map((b) => b.join(':')).join(','), ag].join('|');
      if (card.dataset.dlsig === sig && r && at) return;
      card.dataset.dlsig = sig;
      if (r && !at) { r.remove(); r = null; }
      if (!r) {
        const ref = ttl || tb;
        r = el(ref.parentElement.tagName !== 'DL' ? 'div' : 'dd', { class: 'dlrow' });
        if (ttl) ttl.before(r); else tb.after(r);
      }
      // 0.50.0 형식 칸: 사이트 형식 띠(.work_category)의 글자·색을 그대로 옮겨 품번 옆에 둔다(장바구니는 사진 아래 사이트 띠를 그대로 둠)
      const cat = card.querySelector('.work_category');
      let ty = null;
      if (cat) {
        const cs = getComputedStyle(cat);
        ty = el('span', { class: 'dlty', style: `background:${cs.backgroundColor};color:${cs.color}` }, cat.textContent.trim().replace(/[・･].*$/, ''));
        card.classList.add('dlkind');
      }
      r.replaceChildren(...(ty ? [ty] : []), ...bs.map(([c, t]) => el('span', { class: 'dlcpn' + (c === 'bk' ? ' bk' : '') }, t)), ...(ag === undefined ? [] : [el('span', { class: 'dltg ' + (ag ? 'y' : 'n'), title: '번역 허가' }, ag ? '번역 ○' : '번역 ✕')]), ...(pidOn ? [list.copier(el('span', { class: 'dlpn', title: '누르면 품번 복사' }, x.id), x.id)] : []), ...(onCover ? [] : [list.dlw(x.id)])); // 형식 · 품번 · DLW
      card.classList.toggle('dlgrid', onCover);
      if (!r.childElementCount) r.remove(); // 보일 게 없으면(품번 꺼짐·형식 칸 없음·DLW는 표지) 빈 줄을 안 남긴다
      let heart = null;
      const wish = route.isMy(location.pathname) || route.isRank(location.pathname); // 즐겨찾기·장바구니는 사이트가 빼기·카트 버튼을 따로 갖고 있어 ♥·장바구니 줄을 안 붙인다. 랭킹은 사용자 요청으로 작가·DLW만(0.50.0)
      if (fav.ok() && !wish) {
        heart = el('button', { class: 'dlfav' + (on ? ' on' : ''), 'aria-label': on ? '즐겨찾기에서 빼기' : '즐겨찾기', 'aria-pressed': String(on) }, icon('hf'));
        heart.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); });
        pressable(heart, () => fav.toggle(x.id, card, heart), () => fav.folder(x.id, card, heart)); // 0.49.0 짧게 = 추가·빼기, 꾹 = 폴더로 옮기기
      }
      // 0.45.0: 맨 아래 줄 = ♥ · 장바구니(아이콘만). 사이트 버튼 줄(.item_btn_box)은 이 줄이 있을 때 숨긴다
      const cartB = sc && !wish ? el('button', { class: 'dlcart', 'aria-label': '장바구니' }, '카트에 넣기') : null;
      if (cartB) cartB.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); sc.click(); });
      if (act) act.remove();
      if (heart || cartB) { act = el('div', { class: 'dlact' }, heart, cartB); card.append(act); card.classList.add('dlhas'); } else card.classList.remove('dlhas');
    },

    lastData: [],
    seq: 0,
    apply() {
      clearTimeout(list._applyTimer);
      const bar = document.getElementById('dlbar');
      if (!bar) { if (route.isMy(location.pathname) || route.isRank(location.pathname)) list.decoMy(); return; }
      const cnt = bar.querySelector('.cnt');
      const items = list.items();
      if (!items.length) { cnt.textContent = ''; return; }
      const S = list.state;
      for (const e of items) if (!e.dataset.dlIdx) e.dataset.dlIdx = String(list.seq++);
      const data = items.map((e) => list.read(e, +e.dataset.dlIdx));
      list.lastData = data;
      const hideAiOpt = opt('hideAI');
      const bl = blockSet();
      const couponIds = S.coupon ? coupon.ids(S.coupon) : [];
      const couponOn = couponIds.length > 0;
      const siteSide = route.isSearch(location.pathname); // 검색 목록의 할인·할인율은 사이트가 주소로 거르므로 여기서 또 거르지 않는다
      let shown = 0;
      const unknown = [];
      // 0.52.0 형식을 만화(comic) 하나만 골랐을 때: 사이트가 섞어 보내는 발매 예정·만화 아닌 작품은 숨긴다(사용자: 만화 필터에 발매 전 작품이 나옴)
      const wtc = decodeURIComponent(location.pathname).match(/work_type_category(?:\[\d+\])?\/[a-z_]+/g) || [];
      const mangaOnly = siteSide && wtc.length === 1 && /\/comic$/.test(wtc[0]);
      const notManga = (e) => { const c = e.querySelector('.work_category'); return (c && !c.classList.contains('type_MNG')) || /발매\s*예정|발매\s*전|発売予定/.test(e.textContent); };

      for (const x of data) {
        const cm = couponOn ? coupon.match(couponIds, x.id) : true;
        if (x.id && voice.couponsFor(x.id) === null) unknown.push(x.id); // 쿠폰 거르기와 카드 딱지에 쓴다
        const ok = !(x.ai && hideAiOpt) && !(mangaOnly && notManga(x.e))
          && !(bl.size && (x.names.some((n) => bl.has(n)) || x.vas.some((n) => bl.has(normName(n)))))
          && (siteSide || !S.sale || x.sale)
          && (siteSide || !S.rate || x.rate >= S.rate)
          && cm !== false;
        const wantDisp = ok ? '' : 'none';
        if (x.e.style.display !== wantDisp) x.e.style.display = wantDisp;
        if (ok) shown++;
      }
      if (unknown.length) coupon.checkSoon(unknown);
      if (couponOn) allList.start(data.length);

      // 보이는 카드만 오버레이 갱신 및 일괄 위치 측정 예약
      for (const x of data) if (x.e.style.display !== 'none') list.deco(x);
      list.flushPlaces();
      if (route.isWish(location.pathname) && wishGet(location.pathname, 'order') === 'cend') list.wishSort(data);

      const v = voice.stat;
      const pending = voice.queue.length + voice.busy;
      // 개수는 한 줄 '보이는 / 전체'(0.43.0, 쉼표 없음). 전체는 사이트가 목록 위에 적는 '16911건 중 1～30번째'(PC .page_total, 폰 .item_count)에서 읽는다(요청 없음). 쿠폰을 켜면 예전처럼 '보이는/불러온'+쿠폰 대상 수
      cnt.textContent = couponOn ? `${shown}/${data.length}` + allList.part(couponIds) : ''; // 0.45.0: 쿠폰이 꺼져 있으면 개수를 안 보인다(사이트 위에 이미 '건 중'이 있음)
      setText('dlh-cs', S.coupon ? coupon.status(S.coupon, data) : '');
      bar.setAttribute('aria-busy', pending ? 'true' : 'false');
      setText('dlh-va', `성우: 찾음 ${v.ok} · 없음 ${v.none} · 실패 ${v.err}${v.why ? ' (' + v.why + ')' : ''}`);
    },

    // 0.49.0 즐겨찾기 종료임박: 사이트 순서가 틀려서(WSORTS 설명) 카드 글자의 마감 시각(list.parseEnd)으로 CSS order만 바꾼다(사이트가 그린 노드는 안 옮김)
    wishSort(data) {
      const par = data[0] && data[0].e.parentElement;
      if (!par) return;
      if (!/flex|grid/.test(getComputedStyle(par).display)) par.style.display = 'flex', par.style.flexWrap = 'wrap';
      const mine = new Set(data.map((x) => x.e));
      for (const c of par.children) if (!mine.has(c) && c.style.order !== '9999') c.style.order = '9999'; // 카드로 못 읽은 칸은 맨 뒤
      [...data].map((x) => [x, list.parseEnd(((x.e.querySelector('.sale_period') || {}).textContent) || '')] /* 마감 칸만(다른 글자의 날짜를 잘못 읽지 않게), 없으면 맨 뒤 */).sort((a, b) => a[1] - b[1]).forEach(([x], i) => { if (x.e.style.order !== String(i)) x.e.style.order = String(i); });
    },
    // 0.49.0 즐겨찾기·장바구니: 위 바·거르기 없이 카드 장식만(DLW·품번·쿠폰·묶음 딱지). 2026-11-08 로그인 폰 화면에서 카드가 검색 목록과 같은
    // li.n_work_list_item > dl.n_work_item 모양인 것을 확인. 즐겨찾기는 쿠폰을 몰라 작품 정보 묶음 요청이 붙는다(검색 목록과 같은 방식, 장바구니는 cart.paint가 이미 함)
    decoMy() {
      // 장바구니는 카트·나중에 산다 두 목록에 같은 카드가 하나씩 있어서(한쪽만 보임) list.items()가 한 목록만 고른다 → 보이는 카드를 직접 모은다
      const items = route.isCart(location.pathname) ? [...document.querySelectorAll('li._cart_item, li._cart_items')].filter((li) => li.getClientRects().length) : list.items();
      if (!items.length) return;
      for (const e of items) if (!e.dataset.dlIdx) e.dataset.dlIdx = String(list.seq++);
      const data = items.map((e) => list.read(e, +e.dataset.dlIdx));
      const unknown = data.filter((x) => x.id && voice.couponsFor(x.id) === null).map((x) => x.id);
      if (unknown.length && route.isWish(location.pathname)) coupon.checkSoon(unknown);
      for (const x of data) list.deco(x);
      list.flushPlaces();
    },

    // 필터 창에서 기본과 다른 항목 수(형식·언어·할인·장르·연령·가격). 층(TL/BL)은 기본이 '지금 층'이라 안 센다
    filterCount() {
      const s = list.filterSpec && list.filterSpec();
      if (!s) return 0;
      const a = s.cur, b = s.def, key = (x) => [...(x || [])].sort().join();
      let n = 0;
      for (const k of ['forms', 'lang']) if (a[k] && key(a[k]) !== key(b[k])) n++;
      if (`${a.sale ? 1 : 0}|${a.rate || 0}` !== `${b.sale ? 1 : 0}|${b.rate || 0}`) n++;
      if (a.genres && a.genres.length) n++;
      if ((a.age || '') !== (b.age || '')) n++; // 0.46.0 연령
      if ((a.price || '') !== (b.price || '')) n++; // 0.46.0 가격
      if ((a.order || '') !== (b.order || '')) n++; // 0.51.0 정렬
      return n;
    },

    // 아래 '필터 N' / '적용' 버튼(#dlfb, 패널이 만듦)과 바의 ↺를 지금 조건에 맞춘다
    syncFab() {
      const bar = document.getElementById('dlbar');
      const n = bar ? list.filterCount() : 0;
      const rs = bar && bar.querySelector('.rs');
      if (rs) rs.hidden = !(n || list.staged || bar.querySelector('.c.on'));
      const fb = document.getElementById('dlfb');
      if (!fb) return;
      const px = document.getElementById('dlpkx');
      if (route.isCart(location.pathname)) { // 0.49.0 장바구니: 아래 버튼 = 고르기 / 적용 N / 옮기는 중
        const on = !!cart.pk;
        fb.hidden = false; fb.disabled = !!cart.busy;
        fb.classList.toggle('ap', on);
        fb.replaceChildren(icon('ck'), el('span', {}, cart.busy ? '옮기는 중 ' + cart.busy : on ? (cart.pk.size ? '적용' : '닫기') : '고르기'), ...(on && cart.pk.size ? [el('b', {}, String(cart.pk.size))] : []));
        if (px) px.hidden = !on;
        return;
      }
      if (px) px.hidden = true;
      const ap = !!list.staged;
      fb.hidden = !bar; // 목록 화면이면 늘 보인다(0.42.0: 우리 필터 창을 연다)
      fb.classList.toggle('ap', ap);
      fb.replaceChildren(icon(ap ? 'ck' : 'fl'), el('span', {}, ap ? '적용' : '필터'), ...(n ? [el('b', {}, String(n))] : []));
    },

    mount() {
      const wish = route.isWish(location.pathname); // 0.49.0 즐겨찾기도 바(폴더·쿠폰·정렬)
      if (!route.isList(location.pathname) && !wish) return;
      if (!document.getElementById('dlbar')) {
        const items = list.items();
        if (!items.length) return;
        const S = list.state;
        // 켜진 칩에는 오른쪽에 ✕(끄기)가 붙는다. 칩 몸통은 항상 팝업 열기, ✕는 끄기 — 서로 떼어 실수로 안 켜고 끄게(0.41.0)
        const toggle = (b, on) => {
          b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', String(!!on));
          // 꺼진 칩은 글자 뒤에 ▾(누르면 고르는 창), 켜진 칩은 ✕(기본으로) — 0.42.0 시안
          const dn = b.querySelector('svg.dn');
          if (on && dn) dn.remove();
          else if (!on && !dn) { const s = icon('dn'); s.setAttribute('class', 'dn'); b.append(s); }
          if (b.wrap) {
            b.wrap.classList.toggle('on', !!on);
            const x = b.wrap.querySelector('.x');
            if (on && !x) b.wrap.append(el('button', { class: 'x', 'aria-label': '끄기', onclick: () => b.reset && b.reset() }, icon('x')));
            else if (!on && x) x.remove();
          }
          list.syncFab();
        };
        const chip = (label) => { const b = el('button', { class: 'c', 'aria-haspopup': 'dialog' }); b.dataset.k = label; b.wrap = el('span', { class: 'cg' }, b); return b; };
        const label = (b, text) => b.replaceChildren(el('span', {}, text));
        // 칩 누르기(0.41.0, 사용자 결정): 칩 = 언제나 팝업 열기, 켜진 칩의 ✕ = 기본으로(끄기). isOn은 안 쓴다(예전 시그니처 유지)
        const tapHold = (b, isOn, reset, open) => { b.reset = reset; b.addEventListener('click', open); };
        // 바로 열지 않고 모아 둔다: 고른 조건을 반영한 주소를 list.staged에 두고 바를 다시 그린다('적용'에서 한 번에 연다)
        const remount = () => { document.getElementById('dlbar')?.remove(); list.mount(); };
        const stage = (np) => {
          const next = np && np !== location.pathname ? np : null;
          if (next === (list.staged || null)) return false;
          list.staged = next;
          remount();
          return true;
        };
        const go = (np) => { if (np && np !== location.pathname) { const u = new URL(location.href); u.pathname = np; location.assign(u.href); return true; } return false; };
        // 기본 언어: 한국어 기본(koDefault)이 붙는 검색이면 한국어, 아니면(서클·이름·쿠폰 검색) 조건 없음
        const langDef = () => { const p = location.pathname; return opt('koDefault') && isSearch && /^\/(?:girls|bl)(-touch)?\/fsr\//.test(p) && !COUPON_RE.test(p) && !NAME_SEARCH.test(p) ? ['KO_KR'] : []; };
        const isSearch = route.isSearch(location.pathname);
        // 주소의 order를 바꿔 다시 연다(사이트에서 정렬을 누를 때처럼 1번).
        // 0.46.0: 검색(/fsr/)은 order%5B0%5D/값, 그 밖 목록은 order/값(2026-11-05 실제 사이트에서 확인).
        // 비검색 목록은 /fsr/ 모양이 아니라 pathSet이 못 고치므로 URL 조각을 직접 만진다.
        const goPath = (drop, add) => stage(pathSet(curPath(), drop, add));
        const goOrder = (v) => {
          if (isSearch) return goPath(['order', 'page'], [['order', v]]);
          return stage(nonSearchOrder(curPath(), v) || null);
        };
        // 쿠폰: 팝업에서 하나(맨 위 '가진 쿠폰 아무거나' = 전부). 고른 것을 다시 누르면 끔
        const couponChip = () => {
          const b = chip('coupon');
          b.id = 'dl-coupon-chip';
          const paint = () => { label(b, S.coupon === '*' ? '쿠폰 전체' : S.coupon ? coupon.label(S.coupon) : '쿠폰'); toggle(b, S.coupon); };
          const set = (id) => {
            S.coupon = S.coupon === id ? '' : id;
            store.set('sb.coupon', S.coupon);
            paint();
            list.apply();
            if (S.coupon) coupon.refreshHeld().then((did) => did && list.apply());
          };
          const open = () => {
            sheet.openCoupons(b, set);
            coupon.refreshHeld().then((did) => { if (did && !sheet.node.hidden && sheet.opener === b) sheet.openCoupons(b, set); });
          };
          tapHold(b, () => !!S.coupon, () => set(S.coupon), open);
          paint();
          return b;
        };
        // 검색(묶음 할인 화면만, 사이트 검색창이 없음): 주소 ?keyword=·?genre[n]=을 사이트가 거른다(2026-11-01: 247368 → keyword=純愛 9978건). 짧게 = 조건 있으면 빼기
        const bulkChip = () => {
          const b = chip('search');
          const u = new URL(location.href);
          const k = u.searchParams.get('keyword') || '';
          const gs = [...u.searchParams.keys()].filter((x) => /^genre\[\d*\]$/.test(x));
          const names = new Map(kw.list().map((x) => [x[0], x[1]]));
          const t = [k.split('|')[0], ...gs.map((g) => '#' + (names.get(u.searchParams.get(g)) || u.searchParams.get(g)))].filter(Boolean).join(' ');
          b.replaceChildren(icon('sr'), el('span', {}, t || '검색'));
          toggle(b, !!t);
          const clear = () => { const v = new URL(location.href); for (const x of ['keyword', 'page', ...gs]) v.searchParams.delete(x); location.assign(v.href); };
          tapHold(b, () => !!t, clear, () => sheet.openBulk(b, k.split('|')[0]));
          return b;
        };
        // 정렬: 한 개 고름. 고른 것을 다시 누르면 기본(신작순). 할인 개시순은 할인 검색일 때만 목록에 나온다
        // 0.46.0: 검색(/fsr/)이 아닌 목록에서도 정렬한다. 사이트가 화면마다 order 조각 모양이 다르다(2026-11-05 실제 확인):
        //   /fsr/ → order%5B0%5D/값 (기본), 그 밖 목록(할인·독점·장르·서클) → order/값
        //   작품 형식 목록(/works/type/)은 사이트가 정렬을 무시한다(라벨만 바뀜) → 칩을 흐리게 둔다
        const sortChip = () => {
          const b = chip('sort');
          const cur = siteOrder();
          const name = SORT_NAME[cur];
          const def = COUPON_RE.test(curPath()) ? 'trend' : (isSearch ? DEF_ORDER : 'trend'); // 쿠폰 대상·비검색 목록은 사이트 기본 인기순
          label(b, name ? (isSearch ? '정렬 · ' + name : name) : '정렬');
          toggle(b, cur !== def);
          const pick = (v) => goOrder(v === cur ? def : v);
          tapHold(b, () => cur !== def, () => goOrder(def), () => sheet.openSort(b, cur, urlSale(), pick));
          return b;
        };
        // 정렬 칩이 이 화면에서 못 쓰이면 빼지 않고 흐리게 자리만 둔다(0.42.2: 화면마다 칩 줄이 같은 모양)
        const offChip = () => { const b = chip('sort'); b.disabled = true; label(b, '정렬'); return b; };
        // 정렬이 되는 목록인가: 검색은 늘 되고, 작품 형식 목록(/works/type/)만 안 된다
        const canSort = isSearch || !/\/works\/type\//.test(location.pathname);
        // 0.49.0 즐겨찾기 정렬(WSORTS). 종료임박은 할인만·100개로 열어 우리가 다시 줄 세운다. 다른 정렬로 바꾸면 그 두 조건은 뺀다
        const wishSortChip = () => {
          const b = chip('sort');
          const p = location.pathname, cur = wishGet(p, 'order') || WISH_DEF;
          const name = (WSORTS.find((x) => x[0] === cur) || [])[2];
          label(b, '정렬 · ' + (name || '등록'));
          toggle(b, cur !== WISH_DEF);
          const goW = (v) => {
            const end = v === 'cend';
            const np = wishPath(p, { order: v === WISH_DEF ? null : v, ...(end ? { discount: '1', per_page: '100' } : wishGet(p, 'order') === 'cend' ? { discount: null, per_page: null } : {}) });
            go(np);
          };
          tapHold(b, () => cur !== WISH_DEF, () => goW(WISH_DEF), () => sheet.openSort(b, cur, false, (v) => goW(v === cur ? WISH_DEF : v), WSORTS));
          return b;
        };
        // 0.49.0 즐겨찾기 폴더: 사이트 화면에 있는 폴더 링크(…/wishlist/folder/=/folder_id/N)의 글자를 읽는다(요청 없음)
        const folderChip = () => {
          const b = chip('folder');
          const fm = new Map();
          for (const a of document.querySelectorAll('a[href*="/wishlist/folder/=/folder_id/"]')) { const t = a.textContent.trim().replace(/\s*\(\d+\)\s*$/, ''); const k = a.href.match(/folder_id\/(\d+)/)[1]; if (t && !/PC판|PC版|DLsite/.test(t) && !fm.has(k)) fm.set(k, t); } // 0.50.1 같은 번호의 'PC판 DLsite로' 링크가 이름을 덮어쓰던 것
          const fs = [...fm.entries()];
          const cur = wishGet(location.pathname, 'folder_id') || '';
          const name = cur ? (fs.find((f) => f[0] === cur) || [0, '폴더'])[1] : '';
          label(b, name ? '폴더 · ' + name : '폴더');
          toggle(b, !!cur);
          const base = location.pathname.replace(/\/mypage\/wishlist.*$/, '/mypage/wishlist');
          const pick = (id) => go(id && id !== cur ? `${base}/folder/=/folder_id/${id}` : base + '/');
          tapHold(b, () => !!cur, () => pick(''), () => sheet.show([sheet.sec('폴더'), ...[['', '모두'], ...fs].map(([id, t]) => el('button', { class: 'li' + (id === cur ? ' on' : ''), onclick: () => { sheet.close(); pick(id); } }, el('span', { class: 'pt' }, t), id === cur ? icon('ck') : null))], b));
          return b;
        };
        const make = wish ? { folder: folderChip, coupon: couponChip, sort: wishSortChip } : { sort: canSort ? sortChip : offChip, coupon: couponChip, search: BULK_PAGE.test(location.pathname) && bulkChip };
        const chips = (wish ? ['folder', 'sort', 'coupon'] : chipOrder()).filter((k) => make[k]).map((k) => make[k]());
        // 지금 언어: 서클에서 네 언어를 다 켠 것은 '전체'(= 조건 없음)로 본다
        const langCur = (p) => { const c = langNow(p); return isCircle(p) && c.length === LANGS.length ? [] : c; };
        // ↺: 바꾼 게 있을 때만 보임. 누르면 전부 기본으로(검색은 주소 1번 이동). 층(TL/BL)은 지금 있는 곳 그대로 둔다
        const resetAll = () => {
          if (S.coupon) { S.coupon = ''; store.set('sb.coupon', ''); }
          list.staged = null;
          let np = location.pathname;
          if (isSearch) {
            np = pathSet(np, ['discount_rates', 'campaign', 'order', 'page', 'genre', ...FLOOR_KEYS, 'work_type_name'], [...(COUPON_RE.test(np) ? [] : [['order', DEF_ORDER]]), ...(floorDefOk(np) ? floorDefPairs() : [])]);
            if (opt('saleOnly')) userOff.mark(np, 'sale');
          } else { S.sale = false; S.rate = 0; store.set('sb.sale', false); store.set('sb.rate', 0); }
          if (wish) np = wishPath(np, { order: null, discount: null, per_page: null }); // 0.49.0 즐겨찾기: 정렬·할인만 빼기(폴더는 그대로)
          if (LANG_PAGE.test(np) && langCur(np).join() !== langDef().join()) {
            np = langPath(np, langDef()) || np;
            if (!langDef().length) userOff.mark(np, 'lang');
          }
          if (!go(np)) remount();
        };
        const rs = el('button', { class: 'rs', 'aria-label': '전부 기본으로 되돌리기', onclick: resetAll }, icon('rs'));
        // 적용: 칩에서 고른 조건(list.staged)을 한 번에 연다(주소 1번 이동). 고르기만 하고 안 누르면 아무것도 안 바뀐다. 버튼은 아래 알약 옆 '필터' 자리에 뜬다(list.syncFab)
        list.onApply = () => { const np = list.staged; list.staged = null; if (!go(np)) remount(); };
        // 우리 필터 창(0.42.0, panel이 그림): 지금 조건(cur)·기본(def)·검색하기(run). 검색 화면은 주소를 한 번에 바꿔 1번 이동, 아닌 목록은 할인(서클은 언어도)만 한다
        // 0.43.0: 대상(TL/BL)은 주소의 층. 리셋·↺의 기본 대상은 '지금 있는 층'이라 층은 필터 개수에 안 센다
        list.filterSpec = () => {
          const lp0 = location.pathname, conv = isSearch ? null : fsrOf(lp0);
          const ordOf = (q) => pathGet(q, 'order') || (conv ? nonSearchOrderGet(lp0) : '') || DEF_ORDER; // 0.51.0 정렬도 필터 창에서 고른다
          const stateOf = (q) => { const f = floorRead(q), qq = pathPairs(q); return { sex: f.sex, forms: f.forms, genres: qq ? qq.pairs.filter((x) => segKey(x[0]) === 'genre').map((x) => x[1]) : [], sale: urlSale(q), rate: urlRate(q), lang: langNow(q), age: ageNow(q), price: priceNow(q), order: ordOf(q) }; };
          if (!isSearch && !conv) {
            // 검색 주소로 못 바꾸는 목록(이벤트·묶음 할인): 할인만 이 쪽 안에서 거른다. 나머지 칸은 회색으로 자리만(0.48.0, search:false)
            const fl0 = floorOf(lp0), blank = { sex: fl0 ? [fl0] : [], forms: [], genres: [], sale: false, rate: 0, lang: [], age: '', price: '', order: '' };
            if (wish) { // 0.49.0 즐겨찾기: 할인중은 사이트 주소 discount/1(2026-11-08 확인), 할인율은 이 쪽 안에서 거른다
              return { search: false, cur: { ...blank, sale: wishGet(lp0, 'discount') === '1', rate: S.rate || 0 }, def: blank, run: (v) => {
                S.sale = false; S.rate = v.rate; store.set('sb.sale', false); store.set('sb.rate', v.rate);
                if (!go(wishPath(lp0, { discount: v.sale || v.rate ? '1' : (wishGet(lp0, 'order') === 'cend' ? '1' : null) }))) remount();
              } };
            }
            return { search: false, cur: { ...blank, sale: !!S.sale, rate: S.rate || 0 }, def: blank, run: (v) => {
              S.sale = v.sale; S.rate = v.rate; store.set('sb.sale', v.sale); store.set('sb.rate', v.rate);
              remount();
            } };
          }
          const p = conv ? conv.fsr : curPath(), fl = floorRead(p);
          const cur = stateOf(p);
          if (conv && isCircle(lp0)) cur.lang = langCur(lp0); // 서클은 주소에 언어가 없으면 화면의 체크를 읽는다
          // 기본: 검색은 우리 기본값, 바꾼 목록은 그 목록의 처음 상태(할인 목록 = 할인중, 장르 목록 = 그 태그)
          const def = conv ? stateOf(conv.base) : { sex: fl.sex, forms: DEF_FLOOR.forms, genres: [], sale: !!opt('saleOnly') && !COUPON_RE.test(p) && !NAME_SEARCH.test(p), rate: 0, lang: langDef(), age: '', price: '', order: COUPON_RE.test(p) ? 'trend' : DEF_ORDER };
          const save = isSearch && document.querySelector('a.search_save');
          return { search: true, sortOk: !(conv && isCircle(lp0)), cur, def, canSave: !!save, save: () => save.click(), run: (v) => {
            const off = !v.sale && !v.rate;
            const ordPick = v.order && v.order !== cur.order && !(conv && isCircle(lp0)); // 0.51.0 필터 창에서 정렬을 바꿨다(서클 목록은 주소 모양이 달라 제외)
            // 바꾼 목록은 형식을 안 건드렸으면 원래 형식 조건(예: 형식 목록의 comic)을 그대로 둔다
            const keepFloor = conv && v.forms.join() === cur.forms.join();
            let np = pathSet(p, [...(keepFloor ? [] : [...FLOOR_KEYS, 'work_type_name']), 'genre', 'discount_rates', 'campaign', 'page', ...AGE_KEYS, 'price_low', 'price_high', ...(ordPick || (off && /^c/.test(siteOrder())) ? ['order'] : [])],
              [...(ordPick ? [['order%5B0%5D', v.order]] : []), ...(keepFloor ? [] : floorPairs(v)), ...v.genres.map((n, i) => [`genre%5B${i}%5D`, n]), ...(v.rate ? [['discount_rates%5B0%5D', RATE_CODE[v.rate]]] : v.sale ? [['campaign', 'campaign']] : []),
                ...(v.age ? [['age_category%5B0%5D', v.age]] : []), ...priceSegs(v.price).map(([k, val], i) => [k, val])]);
            np = withFloor(np, v.sex[0]);
            if (conv) {
              // 검색 화면으로 넘어가면 시작할 때 한국어 기본이 붙으니, 언어를 안 고른 것은 그 검색에 다시 붙이지 않게 적어 둔다
              if (!v.lang.length) userOff.mark(langPath(np, []) || np, 'lang');
              if (S.sale || S.rate) { S.sale = false; S.rate = 0; store.set('sb.sale', false); store.set('sb.rate', 0); } // 할인은 이제 주소로 거른다
              if (!isCircle(lp0)) { // 검색 화면이 시작할 때 다시 고쳐 여는 것(정렬·형식 기본)을 미리 넣어 문서 1번으로 끝낸다
                if (pathGet(np, 'order') === undefined) np = pathSet(np, [], [['order%5B0%5D', nonSearchOrderGet(lp0) || DEF_ORDER]]);
                if (floorUnset(np)) np = pathSet(np, [], floorPairs({ forms: [] }));
              }
              np = conv.back(np);
            }
            np = langPath(np, v.lang) || np;
            if (!conv && !v.lang.length && langDef().length) userOff.mark(np, 'lang');
            if (off && opt('saleOnly')) userOff.mark(np, 'sale');
            list.staged = null;
            if (!go(np)) remount();
          } };
        };
        // 한 줄: 쿠폰 · 정렬 · ↺ ····· 개수(보이는/전체)
        const bar = el('div', { id: 'dlbar', role: 'toolbar', 'aria-label': '목록 거르기' },
          el('div', { class: 'rw' }, el('div', { class: 'cr' }, ...chips.map((b) => b.wrap), rs), el('span', { class: 'cnt', role: 'status', 'aria-live': 'polite' })));
        let ref = items[0].parentElement;
        while (ref.parentElement && ref.parentElement !== document.body && /flex|grid/.test(getComputedStyle(ref.parentElement).display)) ref = ref.parentElement;
        ref.parentElement.insertBefore(bar, ref);
        if (wish) document.documentElement.classList.add('dlwish'); // 0.49.0 우리 바가 붙은 뒤에만 사이트 폴더·정렬·범위 축소 칸을 숨긴다
        list.syncFab();
        if (list.state.coupon)coupon.refreshHeld().then((did) => did && list.apply());
      }
      fav.refresh();
      list.apply();
    },
  };
  // 칩 순서는 고정(0.41.0: 순서·보이기 설정을 없앰). 묶음 할인 화면에서만 맨 앞에 검색 칩
  const CHIPS = [['search', '검색(묶음 할인)'], ['coupon', '쿠폰'], ['sort', '정렬']]; // 0.43.0: 대상·언어·할인은 필터 창으로
  const BULK_PAGE = /^\/[^/]+\/campaign\/bulkbuy\/=\/key\//;
  // 대상(sex_category) × 형식 3칸(0.41.3 사용자 결정). 형식은 층(work_category)과 작품 분류(work_type_category)의 조합. 키끼리는 '그리고', 값끼리는 '또는'이라
  // 둘 이상 고르면 층×분류 전부가 된다: 망가+ASMR·ASMR+보이스·셋 다는 정확, 망가+보이스만 동인 ASMR이 섞인다(코믹·드라마의 다른 분류는 0건).
  // 2026-11-02 TL 개수: 동인 audio 24583 · 드라마 audio 2843(드라마 전체 2851) · 코믹 comic 97264 · 동인 comic 15882 · 코믹 SOU 0. 층을 안 넣으면 사이트는 동인만 찾는다(TL 전체 50792 < 코믹 106315)
  // TL/BL = 주소의 층(/girls ↔ /bl), sex_category가 아니다(2026-11-02 사이트 조회 `fsr/ajax` 개수: /girls+gay 는 동인 ASMR 0·전체 1건, /bl 은 동인 ASMR 4090·전체 42084.
  // /bl 안에서 gay는 ゲイ向け 일부(6130)이고 여성향 BL은 female 35954라, sex_category로는 BL을 못 고른다). 층은 하나만 고른다(주소 하나가 곧 층)
  const SEXES = [['girls', 'TL'], ['bl', 'BL']];
  const floorOf = (p) => { const m = String(p).match(/^\/(girls|bl)(?:-touch)?\//); return m ? m[1] : null; };
  const withFloor = (p, fl) => (fl ? String(p).replace(/^\/(?:girls|bl)((?:-touch)?\/)/, `/${fl}$1`) : p);
  const FORMS = [['manga', '망가', ['books', 'doujin'], ['comic']], ['asmr', 'ASMR', ['doujin'], ['audio']], ['voice', '보이스', ['drama'], ['audio']]];
  // 0.46.0 연령·가격(2026-11-05 사이트 필터에서 확인).
  //   연령은 age_category[0]/adult|r15|general 하나(라디오). 비우면 안 붙인다(= 전체).
  //   가격은 price_low/price_high(진짜 '이하·이상'). price_category는 구간 하나만 되고 여러 개를 못 묶는다.
  const AGES = [['adult', 'R18'], ['r15', 'R15'], ['general', '전연령']];
  const PRICES = [['~500', '~500'], ['~1000', '~1000'], ['1000~', '1000~'], ['3000~', '3000~']];
  const AGE_KEYS = ['age_category'];
  const priceSegs = (v) => (v === '~500' ? [['price_high', '500']] : v === '~1000' ? [['price_high', '1000']] : v === '1000~' ? [['price_low', '1000']] : v === '3000~' ? [['price_low', '3000']] : []);
  const ageNow = (p) => pathGet(p, 'age_category') || '';
  const priceNow = (p) => { const lo = pathGet(p, 'price_low'), hi = pathGet(p, 'price_high'); return lo === '3000' ? '3000~' : lo === '1000' ? '1000~' : hi === '1000' ? '~1000' : hi === '500' ? '~500' : ''; };
  const FLOOR_KEYS = ['sex_category', 'work_category', 'work_type', 'work_type_category'];
  // 주소 → {sex, forms}. 층이 없으면 사이트처럼 동인으로 본다. 예전 기본(work_type/SOU)은 audio로 읽는다. work_category/all(이름 검색 주소) = 조건 없음
  function floorRead(p) {
    const pp = pathPairs(p), vals = (k) => (pp ? pp.pairs.filter((x) => segKey(x[0]) === k && x[1] !== 'all').map((x) => x[1]) : []);
    const cats = vals('work_category'), wtc = [...vals('work_type_category'), ...(vals('work_type').includes('SOU') ? ['audio'] : [])];
    const cs = cats.length ? cats : ['doujin'];
    return { sex: floorOf(p) ? [floorOf(p)] : [], forms: wtc.length ? FORMS.filter((f) => f[2].every((c) => cs.includes(c)) && f[3].every((t) => wtc.includes(t))).map((f) => f[0]) : [] };
  }
  // {sex, forms} → 주소 조각(값마다 [n])
  function floorPairs(sel) {
    const fs = FORMS.filter((f) => sel.forms.includes(f[0]));
    const uniq = (xs) => [...new Set(xs)];
    const seg = (k, vs) => vs.map((v, i) => [`${k}%5B${i}%5D`, v]);
    if (!fs.length) return [['work_category', 'all']]; // 0.48.0: 형식을 안 고르면 전부(빼면 사이트가 동인만 찾는다)
    return [...seg('work_category', uniq(fs.flatMap((f) => f[2]))), ...seg('work_type_category', uniq(fs.flatMap((f) => f[3])))];
  }
  const chipOrder = () => CHIPS.map((x) => x[0]);

  /* ========== 7.2 coupon: 쿠폰 적용 대상 ========== */
  const COUPON_TTL = 6 * 3600 * 1000;
  const HELD_URL = 'https://www.dlsite.com/girls-touch/mypage/coupon/list/ajax'; // 쿠폰함 화면이 쓰는 데이터(가진 쿠폰 전부)
  const INFO_URL = 'https://www.dlsite.com/girls-touch/product/info/ajax?product_id='; // 목록 화면이 쓰는 작품 정보 묶음(다른 층 작품도 됨)
  const INFO_BATCH = 50;
  const coupon = {
    seen: new WeakSet(),
    _path: '',
    _cacheAll: null,
    _cacheList: null,
    _cacheAt: 0,

    invalidateCache() {
      coupon._cacheAll = null;
      coupon._cacheList = null;
    },

    allMap() {
      if (!coupon._cacheAll || Date.now() - coupon._cacheAt > 10000) {
        coupon._cacheAll = store.get('coupons', {}) || {};
        coupon._cacheAt = Date.now();
        coupon._cacheList = null;
      }
      return coupon._cacheAll;
    },

    // 카드마다 GM_getValue와 정렬을 반복하지 않도록 메모리 캐시 사용
    list() {
      const all = coupon.allMap();
      if (coupon._cacheList) return coupon._cacheList;
      const now = Date.now();
      coupon._cacheList = Object.values(all)
        .filter((c) => !c.id.startsWith('q:') && (c.until ? c.until > now : now - c.seen < 30 * 864e5)) // q:는 예전 버전이 쿠폰 아닌 기획까지 저장한 것
        .sort((a, b) => (a.until || Infinity) - (b.until || Infinity));
      return coupon._cacheList;
    },
    get(id) { return coupon.allMap()[id] || null; },
    ids(sel) { return sel === '*' ? coupon.list().map((c) => c.id) : (sel ? [sel] : []); },
    rate(id) {
      const c = coupon.get(id);
      if (c && Array.isArray(c.pcts) && c.pcts.length) return c.pcts.length > 1 ? c.pcts[0] + '~' + c.pcts[c.pcts.length - 1] : String(c.pcts[0]);
      const pct = c && c.title && (c.title.match(/(\d+)\s*%\s*OFF/i) || [])[1];
      if (pct) return pct;
      const m = id.match(/coupon(\d+)/i);
      if (!m) return '';
      const d = m[1];
      const ok = (s) => +s >= 5 && +s <= 90 && +s % 5 === 0;
      if (ok(d)) return d;
      if (d.length === 4 && ok(d.slice(0, 2)) && ok(d.slice(2))) return d.slice(0, 2) + '~' + d.slice(2);
      return '';
    },
    label(id) { const r = coupon.rate(id); return r ? r + '%' : '쿠폰'; },
    context(a) {
      let box = a;
      for (let i = 0; i < 6 && box.parentElement; i++) {
        box = box.parentElement;
        if (/まで/.test(box.textContent) && /クーポン|COUPON|쿠폰/i.test(box.textContent)) break;
      }
      const t = box.textContent.replace(/\s+/g, ' ').trim();
      let title = '';
      for (const e of box.querySelectorAll('*')) {
        if (e.closest('a[href*="custom_genres/"]')) continue;
        const x = e.textContent.replace(/\s+/g, ' ').trim();
        if (x.length < 8 || x.length > 120 || !/クーポン|쿠폰/.test(x) || /まで/.test(x)) continue;
        if (!title || x.length < title.length) title = x;
      }
      const um = t.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*まで/);
      return {
        title: title.slice(0, 80),
        until: um ? +new Date(+um[1], +um[2] - 1, +um[3], +um[4], +um[5], +(um[6] || 0)) : 0,
      };
    },
    // 가진 쿠폰을 쿠폰함 데이터에서 읽는다. 6시간에 한 번(실패하면 30분 뒤), 쿠폰함 페이지에선 5분마다까지.
    // 대상 작품 표시(custom_genres/키)가 있는 쿠폰만 쓴다. 같은 키를 쓰는 쿠폰(20%·30%)은 하나로 묶는다.
    // 반환값: 실제로 새로 받았으면 true
    _heldBusy: null,
    heldFresh() { const h = store.get('coupons.held', null); return !!(h && h.ok && Date.now() - h.t < COUPON_TTL); },
    refreshHeld(soon) {
      if (coupon._heldBusy) return coupon._heldBusy;
      const h = store.get('coupons.held', null) || { t: 0, ok: false };
      const age = Date.now() - h.t;
      if (age < (soon ? 5 * 60 * 1000 : h.ok ? COUPON_TTL : NET_COOL_MS) || !net.ok()) return Promise.resolve(false);
      store.set('coupons.held', { t: Date.now(), ok: false });
      coupon._heldBusy = netFetch(HELD_URL, { credentials: 'include', headers: XHR }, 'json')
        .then((arr) => {
          net.good();
          if (!Array.isArray(arr)) throw new Error('쿠폰함 형식 다름');
          const all = {};
          for (const c of arr) {
            const keys = [...new Set([...JSON.stringify(c).matchAll(/custom_genres\/([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
            const until = Date.parse(String(c.end_date || '').replace(' ', 'T') + '+09:00') || 0;
            const pct = c.discount_type === 'rate' ? +c.discount : 0;
            const need = +((c.conditions && c.conditions.post_condition && c.conditions.post_condition.count) || 1) || 1; // 2작품 이상 쿠폰은 2
            for (const id of keys) {
              const o = all[id] || (all[id] = { id, floor: 'girls', title: '', until: 0, seen: Date.now(), pcts: [], need: {} });
              if (pct && !o.pcts.includes(pct)) o.pcts.push(pct);
              if (pct) o.need[pct] = Math.min(o.need[pct] || need, need);
              if (!o.title || pct >= Math.max(...o.pcts)) o.title = String(c.coupon_name || '').slice(0, 80);
              o.until = Math.max(o.until, until);
            }
          }
          for (const o of Object.values(all)) o.pcts.sort((a, b) => a - b);
          const before = new Set(Object.keys(store.get('coupons', {}) || {}));
          if (Object.keys(all).some((id) => !before.has(id))) { voice.cpCache = {}; voice.cpDirty = true; voice.flushSaves(); } // 새 쿠폰이 생기면 작품별 기록을 다시 받는다
          store.set('coupons', all);
          store.set('coupons.held', { t: Date.now(), ok: true });
          coupon.invalidateCache();
          setText('dlh-cp', `쿠폰: 쿠폰함에서 ${Object.keys(all).length}종 확인`);
          return true;
        })
        .catch((e) => { setText('dlh-cp', '쿠폰함을 못 읽음: ' + ((e && e.message) || e)); return false; })
        .finally(() => { coupon._heldBusy = null; locale.enforce(false); });
      return coupon._heldBusy;
    },
    // 쿠폰 기록이 없는 작품을 최대 50개씩 한 번에 받는다(사이트 화면이 쓰는 작품 정보 묶음 주소). 묶음 사이는 VA_GAP_MS 쉼.
    // 대상: need에 넣은 작품(목록 화면·목록 전체·장바구니). 화면에 보이는 목록 것이 먼저.
    need: new Set(),
    _infoBusy: false,
    _infoT: 0,
    _infoFail: 0,
    checkSoon(ids) {
      if (ids) for (const id of ids) if (id) coupon.need.add(id);
      clearTimeout(coupon._infoT);
      coupon._infoT = setTimeout(coupon.checkNow, 300);
    },
    checkNow() {
      if (coupon._infoBusy || !net.ok() || Date.now() - coupon._infoFail < 60 * 1000) return;
      for (const id of coupon.need) if (voice.couponsFor(id) !== null) coupon.need.delete(id);
      const ids = [...coupon.need].slice(0, INFO_BATCH);
      if (!ids.length) return;
      coupon._infoBusy = true;
      netFetch(INFO_URL + ids.map(encodeURIComponent).join(','), { credentials: 'include', headers: XHR }, 'json')
        .then((j) => {
          net.good();
          // 아는 쿠폰은 응답이 온 때 기준. 보낼 때 기준이면, 그 사이 쿠폰함이 와서 기록을 비운 뒤에 '쿠폰 없음'을 6시간 다시 써 버렸다(T2가 가끔 전부 숨김)
          const known = new Set(coupon.ids('*'));
          for (const id of ids) {
            const w = j && j[id];
            const ks = w && Array.isArray(w.custom_genres) ? w.custom_genres.filter((k) => known.has(k)) : [];
            voice.putCoupons(id, ks, w && typeof w.bulkbuy_key === 'string' ? w.bulkbuy_key : '', w && w.translation_info ? (w.translation_info.is_translation_agree ? 1 : 0) : undefined);
            coupon.need.delete(id);
          }
        })
        .catch(() => { coupon._infoFail = Date.now(); })
        .finally(() => {
          locale.enforce(false);
          list.scheduleApply(50);
          cart.paint();
          setTimeout(() => { coupon._infoBusy = false; coupon.checkNow(); }, VA_GAP_MS);
        });
    },
    learn() {
      if (route.isCouponBox(location.pathname)) coupon.refreshHeld(true).then((did) => did && list.apply());
      if (coupon.heldFresh()) return; // 쿠폰함 데이터가 있으면 페이지 링크로 배우지 않는다(가진 쿠폰이 아닌 배너 쿠폰이 섞이지 않게)
      const found = [];
      const diag = { links: 0, fsr: 0, other: [] };
      const add = (href, a) => {
        let u;
        try { u = new URL(href, location.href); } catch (e) { return; }
        const m = u.pathname.match(COUPON_RE);
        if (!m) return; // 작품 정보의 쿠폰 키(custom_genres)로 판정하므로 키가 있는 쿠폰만 기억한다
        const fl = (u.pathname.split('/')[1] || route.floor()).replace(/-touch$/, '');
        found.push({ id: m[1], floor: fl, ...(a ? coupon.context(a) : {}) });
      };
      if (coupon._path !== location.pathname && COUPON_RE.test(location.pathname)) { coupon._path = location.pathname; add(location.href, null); }
      const nodes = new Set();
      for (const n of document.querySelectorAll('a,button')) {
        if (coupon.seen.has(n)) continue;
        coupon.seen.add(n);
        if ((n.getAttribute('href') || '').includes('custom_genres/') || /対象作品|대상\s*작품/.test(n.textContent || '')) nodes.add(n);
      }
      for (const n of nodes) {
        if (n.closest(OURS)) continue;
        diag.links++;
        const href = n.getAttribute('href') || n.dataset.href || n.dataset.url || (n.closest('a[href]') || {}).href || '';
        if (/\/fsr\//.test(href) || COUPON_RE.test(href)) { diag.fsr++; add(href, n); } else diag.other.push(href || '(주소 없음: ' + n.tagName.toLowerCase() + ')');
      }
      if (diag.links || found.length) {
        setText('dlh-cp', `쿠폰: 이 페이지 대상 링크 ${diag.links}개 · 인식 ${found.length}개`
          + (diag.other.length ? ` · 모르는 형식: ${diag.other.slice(0, 2).join(' , ').slice(0, 160)}` : ''));
      }
      if (!found.length) return;
      const all = store.get('coupons', {}) || {};
      for (const f of found) {
        const old = all[f.id] || {};
        all[f.id] = { id: f.id, floor: f.floor, title: f.title || old.title || '', until: f.until || old.until || 0, seen: Date.now() };
      }
      store.set('coupons', all);
      coupon.invalidateCache();
    },
    // 만료된 coupon:* 캐시 키 정리(하루 한 번, 화면이 한가할 때)
    sweep() {
      if (typeof GM_listValues !== 'function' || typeof GM_deleteValue !== 'function') return;
      const last = +store.get('coupon.sweepAt', 0) || 0;
      if (Date.now() - last < 24 * 3600 * 1000) return;
      store.set('coupon.sweepAt', Date.now());
      try {
        for (const k of GM_listValues()) {
          if (/^(cpCache1|cpCache2|tagCache1|tagCache2|search\.recent|tlOnly|squareThumb|flt\..*)$/.test(k)) { GM_deleteValue(k); continue; } // 예전 버전이 쓰던 값(작품별 쿠폰 옛 형식, 태그, 🔍 최근 검색, TL만, 필터 기억)
          if (!k.startsWith('coupon:')) continue;
          const c = store.get(k, null);
          if (!c || !(Date.now() - c.t < COUPON_TTL)) GM_deleteValue(k);
        }
      } catch (e) { /* 저장소 접근 실패는 무시 */ }
    },
    // 작품 하나가 고른 쿠폰 대상인가: true/false, 아직 작품 정보를 못 받았으면 null(이때는 보여 둔다)
    match(ids, pid) {
      const ks = pid ? voice.couponsFor(pid) : [];
      return ks === null ? null : ks.some((k) => ids.includes(k));
    },
    // 카드 딱지: 1개부터 쓰는 쿠폰 중 최고율, 그보다 높은 '2개 이상' 쿠폰, 묶음 할인. 아직 모르면 null
    badges(pid) {
      const ks = pid ? voice.couponsFor(pid) : [];
      if (ks === null) return null;
      let one = 0, multi = 0, multiN = 0;
      const live = new Set(coupon.ids('*')); // 기한이 지난 쿠폰은 빼고
      for (const k of ks) {
        if (!live.has(k)) continue;
        const c = coupon.get(k);
        const pcts = c && Array.isArray(c.pcts) && c.pcts.length ? c.pcts : (coupon.rate(k).match(/\d+/g) || []).map(Number);
        for (const pc of pcts) {
          const n = (c && c.need && c.need[pc]) || 1;
          if (n <= 1) one = Math.max(one, pc);
          else if (pc > multi) { multi = pc; multiN = n; }
        }
      }
      const out = [];
      if (one) out.push([toneOf(one), `쿠폰 ${one}%`]);
      if (multi > one) out.push([toneOf(multi), `${multiN}개 ${multi}%`]);
      if (voice.bulkFor(pid)) out.push(['bk', '묶음']);
      return out;
    },
    status(sel, data) {
      const ids = coupon.ids(sel);
      if (!ids.length) return '아는 쿠폰 없음 (쿠폰 목록 페이지를 먼저 한 번 열어 주세요)';
      const name = sel === '*' ? `쿠폰 ${ids.length}종` : coupon.label(sel);
      let hit = 0, unk = 0;
      for (const x of data) { const r = coupon.match(ids, x.id); if (r === null) unk++; else if (r) hit++; }
      return `${name} 대상 ${hit}개` + (unk ? ` · 확인 중 ${unk}개` : '');
    },
  };

  /* ========== 7.3 allList: 목록 전체(최대 300개)의 작품 id. 쿠폰을 켰을 때 '전체 대상/전체' 숫자용 ==========
     999 같은 묶음 할인 페이지와 검색 페이지만. 사이트가 보여 준 전체 개수와 받은 개수가 다르면 숫자를 안 보인다. */
  const ALL_MAX = 300;
  const TOTAL_RE = /([\d,]+)\s*(?:件中|건\s*중)/;
  const allList = {
    key: '', // 지금 받았거나 받는 중인 목록(정렬 조건은 뺌: 정렬만 바뀌면 다시 받지 않는다)
    ids: null,
    source() {
      const p = location.pathname;
      const qs = new URLSearchParams(location.search);
      qs.delete('order'); qs.delete('locale');
      const q = qs.toString();
      const b = p.match(/^\/([^/]+)\/campaign\/bulkbuy\/=\/key\/([^/]+)/);
      if (b) return { key: 'b:' + b[2] + '?' + q, per: 50, json: false, conds: [''], url: (n, x) => `https://www.dlsite.com/${b[1]}/campaign/bulkbuy/ajax/=/key/${b[2]}/page/${n}/${q ? '?' + q : ''}` };
      if (!route.isSearch(p)) return null;
      const cond = p.replace(/^.*?\/fsr\/(?:ajax\/)?=\//, '').replace(/\/(?:per_page|page|order(?:%5B0%5D|\[0\])?|from|show_type)\/[^/]+/g, '').replace(/\/+$/, '');
      const fl = route.floor();
      // 화면 주소가 language/jp뿐이면 사이트는 작품 언어 조건(options JPN·NM)을 숨겨서 붙인다. 개수가 안 맞으면 이걸 붙여 한 번 더 본다.
      const conds = [cond];
      if (/(^|\/)language\/jp(\/|$)/.test(cond) && !/(^|\/)options(%5B|\[|\/)/.test(cond)) conds.push(cond + '/options%5B0%5D/JPN/options%5B1%5D/NM');
      return { key: 's:' + fl + '/' + cond, per: 100, json: true, conds, url: (n, c) => `https://www.dlsite.com/${fl}/fsr/ajax/=/${c}/per_page/100/page/${n}` };
    },
    start(onPage) {
      const src = allList.source();
      if (!src || src.key === allList.key) return;
      if (allList.ids && allList.idsKey !== src.key) allList.ids = null; // 다른 목록으로 바뀜
      const total = +((((document.body.textContent || '').match(TOTAL_RE)) || [])[1] || '').replace(/,/g, '');
      if (!total) return; // 사이트가 총 개수를 아직 안 그렸으면 다음에 다시 본다(전엔 이 목록을 다시 안 셌음)
      allList.key = src.key;
      allList.ids = null;
      if (total <= onPage || total > ALL_MAX) return; // 한 쪽에 다 있거나 너무 많으면 세지 않는다
      const c = (store.get('lists1', null) || {})[src.key];
      if (c && Date.now() - c.t < COUPON_TTL && c.ids.length === total) { allList.done(c.ids); return; }
      const ids = new Set();
      const pages = Math.ceil(total / src.per);
      const wait = () => new Promise((ok) => setTimeout(ok, VA_GAP_MS));
      const page = (n, ci) => {
        if (allList.key !== src.key) return null; // 그새 다른 목록으로 바뀜
        return netFetch(src.url(n, src.conds[ci]), { credentials: 'include', headers: XHR }, src.json ? 'json' : 'text')
          .then((d) => {
            net.good();
            const html = src.json ? String(d.search_result || '') : d.replace(/&nbsp;/g, ' '); // 개수 글자가 '414&nbsp;件中'으로 온다
            const cnt = src.json ? +(d.page_info && d.page_info.count) : +((html.match(TOTAL_RE) || [])[1] || '').replace(/,/g, '');
            if (cnt !== total) {
              if (n === 1 && ci + 1 < src.conds.length) return wait().then(() => page(1, ci + 1)); // 숨은 조건을 붙여 다시
              throw new Error('개수 다름');
            }
            for (const m of html.matchAll(/product_id\/([A-Za-z]{2}\d{6,8})/g)) ids.add(m[1]);
            return n < pages ? wait().then(() => page(n + 1, ci)) : null;
          });
      };
      page(1, 0)
        .then(() => {
          if (allList.key !== src.key || ids.size !== total) return;
          const all = store.get('lists1', null) || {};
          all[src.key] = { t: Date.now(), ids: [...ids] };
          const ks = Object.keys(all);
          for (let i = 0; i < ks.length - 20; i++) delete all[ks[i]];
          store.set('lists1', all);
          allList.done([...ids]);
        })
        .catch(() => { /* 못 세면 '전체' 숫자를 안 보인다 */ })
        .finally(() => locale.enforce(false));
    },
    done(ids) { allList.ids = ids; allList.idsKey = allList.key; coupon.checkSoon(ids); list.scheduleApply(50); },
    // ' · 전체 대상/전체'. 아직 다 모르면 빈 글자
    part(couponIds) {
      if (!allList.ids) return '';
      let hit = 0;
      for (const id of allList.ids) { const r = coupon.match(couponIds, id); if (r === null) return ''; if (r) hit++; }
      return ` · 전체 ${hit}/${allList.ids.length}`;
    },
  };

  /* ========== 7.4 cart: 장바구니 작품에 쓸 수 있는 쿠폰 딱지(숨기지 않음: 숨겨도 결제에는 들어가므로) ========== */
  const cart = {
    // 0.49.0 고르기: 아래 [고르기] → 살 작품만 체크(0.50.0부터 처음엔 체크 없음, 0개면 적용이 아무것도 안 함) → [적용]에서 달라진 것만 사이트 링크를 차례로 누른다
    // (카트에서 뺀 것 = '나중에 산다' a.link_move_later.in_buy_now, 새로 고른 것 = '카트로 되돌린다' a.link_move_cart.in_later).
    // 2026-11-08 로그인 폰 화면: 사이트에 여러 개를 한꺼번에 옮기는 기능이 없다. 카드는 카트·나중에 산다 두 목록에 하나씩 들어 있고 한쪽만 보인다.
    // 요청 수 = 옮기는 작품 수(손으로 누를 때와 같음), 간격 PICK_GAP
    pk: null, // null = 꺼짐, Set(고른 품번)
    busy: '',
    rows() {
      const out = [];
      for (const li of document.querySelectorAll('li._cart_item, li._cart_items')) { // '나중에 산다' 쪽은 _cart_item만 있다(2026-11-08 확인)
        if (!li.getClientRects().length) continue; // 안 보이는 쪽 목록의 같은 카드
        const id = li.dataset.productId || pidOf((li.querySelector('a[href*="/product_id/"]') || {}).href);
        const toLater = li.querySelector('a.link_move_later.in_buy_now'), toCart = li.querySelector('a.link_move_cart.in_later');
        if (id && (toLater || toCart)) out.push({ li, id, inCart: !!toLater, link: toLater || toCart });
      }
      return out;
    },
    pickTap() {
      if (cart.busy) return;
      if (cart.pk) return cart.pickApply();
      cart.pk = new Set(); // 0.50.0 처음엔 아무것도 체크 안 함: 살 것만 체크 → 적용하면 체크한 것만 카트에, 나머지는 전부 나중에 산다
      cart.pickPaint();
    },
    pickOff() { cart.pk = null; cart.pickPaint(); },
    pickPaint() {
      const rows = cart.pk ? cart.rows() : [];
      const want = new Set(rows.map((r) => r.li));
      for (const b of document.querySelectorAll('.dlpk')) if (!want.has(b.closest('li'))) b.remove();
      for (const li of document.querySelectorAll('li.dlpk-on, li.dlpk-off')) if (!want.has(li)) li.classList.remove('dlpk-on', 'dlpk-off');
      for (const r of rows) {
        const on = cart.pk.has(r.id);
        let b = r.li.querySelector('.dlpk');
        if (!b) {
          b = el('span', { class: 'dlpk', 'aria-hidden': 'true' }); // 사진 밖 왼쪽 칸(사진 왼쪽 위는 사이트 리본 자리)
          r.li.append(b);
        }
        b.classList.toggle('on', on);
        r.li.classList.toggle('dlpk-on', on); r.li.classList.toggle('dlpk-off', !on);
      }
      list.syncFab();
    },
    // 고르기 중에는 카드를 누르면 작품을 열지 않고 체크만 바꾼다
    pickClick(e) {
      if (!cart.pk || !e.target.closest) return;
      const li = e.target.closest('li._cart_item, li._cart_items');
      if (!li || e.target.closest('#dlh')) return;
      e.preventDefault(); e.stopPropagation();
      const r = cart.rows().find((x) => x.li === li);
      if (!r) return;
      if (cart.pk.has(r.id)) cart.pk.delete(r.id); else cart.pk.add(r.id);
      cart.pickPaint();
    },
    pickApply() {
      // 0.50.0 안전장치: 처음엔 체크가 0개라 그대로 적용하면 카트 전부가 '나중에 산다'로 간다 → 하나도 안 골랐으면 아무것도 옮기지 않고 닫는다
      if (!cart.pk.size) { cart.pickOff(); return; }
      const jobs = cart.rows().filter((r) => r.inCart !== cart.pk.has(r.id)).map((r) => r.link);
      cart.pickOff();
      if (!jobs.length) return;
      let i = 0;
      const step = () => {
        const a = jobs[i++];
        cart.busy = `${i}/${jobs.length}`; list.syncFab();
        if (a && a.isConnected) a.click(); // 사이트가 이 링크에 붙인 처리(카드 옮기기)를 그대로 쓴다
        if (i < jobs.length) setTimeout(step, PICK_GAP);
        else setTimeout(() => { cart.busy = ''; list.syncFab(); }, PICK_GAP);
      };
      step();
    },
    paint() {
      if (!route.isCart(location.pathname)) return;
      list.syncFab();
      if (cart.pk) cart.pickPaint();
      coupon.refreshHeld().then((did) => did && cart.paint());
      const known = coupon.ids('*');
      if (!known.length) return;
      const need = [];
      for (const li of document.querySelectorAll('li._cart_item, li._cart_items')) {
        const a = li.querySelector('a[href*="/product_id/"]');
        const id = a && pidOf(a.href);
        if (!id) continue;
        if (voice.couponsFor(id) === null) need.push(id); // 0.50.0 칩은 list.deco가 그린다(요청은 그대로)
      }
      if (need.length) coupon.checkSoon(need);
    },
  };

  /* ========== 7.6 fav: 카드 ♥(사이트 즐겨찾기) ==========
     내 즐겨찾기 품번 목록 GET /girls/load/favorite/product(약 1.3KB, 10분에 한 번, 목록 화면에서만). 로그아웃이면 ♥를 안 보인다.
     누르면 POST /{층}/cart/ajax mode=wishlist(추가)·wishlist_remove(빼기), obj_nocheck=1, product_id(사이트 코드, 2026-11-01 사용자가 ☆를 눌러 본 요청). 누를 때만 1번.
     폴더 고르기(꾹)는 폴더로 옮길 때 쓰는 번호가 즐겨찾기 화면을 그린 뒤에만 생겨서 아직 없음. */
  const FAV_TTL = 10 * 60 * 1000;
  const fav = {
    c: null,
    get() { if (!fav.c) fav.c = store.get('fav1', null) || { t: 0, ok: false, ids: [] }; return fav.c; },
    // 로그아웃이어도 빈 목록({favorites:[]})이 온다(2026-11-01 확인).
    // 0.47.1: 예전엔 '즐겨찾기가 1개 이상'이거나 로그인 표시가 있을 때만 ♥를 그렸는데, 로그인 판정이 로그아웃 링크·dlloginjp 쿠키뿐이라
    // 폰 화면에서 그 둘이 없으면 즐겨찾기 0개 계정은 ♥가 아예 안 보였다(사용자 지적).
    // 2026-11-07 실제 로그아웃 화면 확인: 로그아웃 상태에서도 /mypage·/logout 링크가 HTML에 다 들어 있어서 링크로는 판정이 안 된다.
    // 그래서 로그인 여부는 쿠키로 본다. 0.47.3: 로그아웃이어도 빈 목록이 와서 c.ok가 true이므로, '모름(null)'을 로그인으로 치면 로그아웃 화면에 ♥가 다 나왔다(T21) → 확실할 때(true)만.
    ok() { const c = fav.get(); return !!c.ok && (c.ids.length > 0 || fav.login() === true); },
    _lg: [0, null],
    // true = 로그인 흔적 있음, false = 확실히 로그아웃(로그인 유도 쿠키 없음), null = 모름
    login() {
      if (Date.now() - fav._lg[0] > 2000) fav._lg = [Date.now(), fav.loginNow()];
      return fav._lg[1];
    },
    loginNow() {
      let ck = '';
      try { ck = document.cookie || ''; } catch (e) { /* 쿠키 막힘 */ }
      // 로그인했을 때만 남는 쿠키들(2026-11-01 로그인 계정에서 확인한 이름은 dlloginjp·loginchecked). 로그아웃이면 없다
      if (/(?:^|; )(?:dlloginjp|loginchecked|loginchk|loginid|member_id)=/.test(ck)) return true;
      // 로그인 화면으로 보내는 링크가 '보이는' 자리에 있으면 로그아웃으로 본다(/mypage 같은 링크는 로그아웃이어도 HTML에 있다)
      const a = [...document.querySelectorAll('a[href*="/login"], a[href*="/regist/user"]')].filter((n) => n.getClientRects().length > 0);
      if (a.length) return false;
      return null;
    },
    has(id) { return fav.get().ids.includes(id); },
    save(c) { fav.c = c; store.set('fav1', c); },
    _busy: false,
    refresh() {
      const c = fav.get();
      if (fav._busy || Date.now() - c.t < (c.ok ? FAV_TTL : NET_COOL_MS) || !net.ok()) return;
      fav._busy = true;
      fav.save({ ...c, t: Date.now() });
      netFetch('https://www.dlsite.com/girls/load/favorite/product', { credentials: 'include', headers: XHR }, 'text')
        .then((t) => {
          let j = null;
          try { j = JSON.parse(t); } catch (e) { /* 로그아웃이면 HTML */ }
          net.good();
          const ids = j && Array.isArray(j.favorites) ? j.favorites.filter((x) => typeof x === 'string') : null;
          fav.save({ t: Date.now(), ok: !!ids, ids: ids || [] });
        })
        .catch(() => { /* 다음에 */ })
        .finally(() => { fav._busy = false; locale.enforce(false); list.scheduleApply(50); });
    },
    toggle(id, card, btn) {
      if (btn.disabled) return;
      const on = fav.has(id);
      const a = card.querySelector('a[href*="/product_id/"]');
      const fl = (((a && a.href.match(/dlsite\.com\/([^/]+)\//)) || [])[1] || route.floor()).replace(/-touch$/, '');
      btn.disabled = true;
      return netFetch(`https://www.dlsite.com/${fl}/cart/ajax`, {
        method: 'POST', credentials: 'include',
        headers: { ...XHR, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams({ mode: on ? 'wishlist_remove' : 'wishlist', obj_nocheck: '1', product_id: id }).toString(),
      }, 'text')
        .then(() => { net.good(); const c = fav.get(); fav.save({ ...c, ids: on ? c.ids.filter((x) => x !== id) : [id, ...c.ids.filter((x) => x !== id)] }); })
        .catch(() => { btn.classList.add('err'); setTimeout(() => btn.classList.remove('err'), 1200); })
        .finally(() => { btn.disabled = false; locale.enforce(false); list.scheduleApply(0); });
    },
    // 0.49.0 ♥ 꾹 = 폴더로 옮기기(사용자 요청). 2026-11-08 로그인 폰 화면·사이트 app.js에서 확인:
    //  폴더 목록 GET /{사이트}/favorite/folder/ajax?type=wishlist(X-Requested-With) → {result:true, data:{folders:[{id,name,item_count}], unclassified:{item_count}}}
    //  즐겨찾기 번호(wishNo)는 즐겨찾기 화면 HTML의 recoverDeletedItem(번호, '품번')에만 있다 → 등록 새로운 순 1쪽(100개)을 받아 찾는다(그보다 오래된 작품은 못 찾음)
    //  옮기기 POST /{사이트}/mypage/wishlist/ajax type=1&action=move&item_id=번호(&dst_folder=폴더 id, 없으면 미분류)
    //  요청은 꾹 누를 때만: 폴더 목록(5분 보관) 1 + 즐겨찾기 1쪽 1 + 옮기기 1(즐겨찾기에 없던 작품은 추가 1)
    _fd: null,
    folders(site) {
      if (fav._fd && Date.now() - fav._fd.t < 5 * 60 * 1000) return Promise.resolve(fav._fd.list);
      return netFetch(`https://www.dlsite.com/${site}/favorite/folder/ajax?type=wishlist`, { credentials: 'include', headers: XHR }, 'text').then((t) => {
        const j = JSON.parse(t);
        const list = (j && j.data && Array.isArray(j.data.folders) ? j.data.folders : []).map((f) => [f.id == null ? '' : String(f.id), String(f.name || '미분류')]);
        fav._fd = { t: Date.now(), list };
        return list;
      });
    },
    folder(id, card, btn) {
      const site = location.pathname.split('/')[1] || 'girls-touch';
      const fail = () => { btn.classList.add('err'); setTimeout(() => btn.classList.remove('err'), 1200); };
      Promise.resolve(fav.has(id) ? null : fav.toggle(id, card, btn)).then(() => fav.folders(site)).then((fs) => {
        const rows = [...(fs.some((f) => f[0] === '') ? [] : [['', '미분류']]), ...fs];
        sheet.show([sheet.sec('폴더로 옮기기'), ...rows.map(([fid, name]) => el('button', { class: 'li', onclick: () => fav.moveTo(site, id, fid, name, btn) }, el('span', { class: 'pt' }, name)))], btn);
      }).catch(fail);
    },
    moveTo(site, id, fid, name, btn) {
      const done = (t) => { sheet.show([sheet.sec(t)], btn); setTimeout(() => sheet.close(), 1500); };
      sheet.show([sheet.sec('옮기는 중')], btn);
      netFetch(`https://www.dlsite.com/${site}/mypage/wishlist/=/per_page/100`, { credentials: 'include' }, 'text').then((h) => {
        const m = h.match(new RegExp(`recoverDeletedItem\\((\\d+), '${id}'\\)`));
        if (!m) throw new Error('즐겨찾기 번호를 못 찾음');
        const body = new URLSearchParams({ type: '1', action: 'move', item_id: m[1], ...(fid ? { dst_folder: fid } : {}) });
        return netFetch(`https://www.dlsite.com/${site}/mypage/wishlist/ajax`, { method: 'POST', credentials: 'include', headers: { ...XHR, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: body.toString() }, 'text');
      }).then((t) => { const r = JSON.parse(t); done(r && r.data && r.data.item_id ? `'${name}'(으)로 옮겼어요` : '못 옮겼어요'); })
        .catch(() => done('못 옮겼어요'));
    },
  };

  /* ========== 7.7 sbox: 사이트 검색창 아래 목록(정리안3) ==========
     빈 검색창을 누르면 저장한 검색(사이트 마이페이지, 열 때만·1시간에 1번) · 자주 쓰는 태그(☆) · 최근 검색.
     글자를 치면 태그 후보(한국어·일본어 이름, 목록은 kw가 받은 것) → 누르면 태그 번호로 검색(언어와 상관없이 같은 결과). 맨 아래는 그 글자로 검색. */
  const SAVED_TTL = 5 * 60 * 1000; // 사이트에서 저장한 검색을 바꾸면 5분 안에 보이게(전엔 1시간)
  const saved = {
    list() { const c = store.get('saved1', null); return c && Array.isArray(c.list) ? c.list : []; },
    refresh() {
      const c = store.get('saved1', null);
      if ((c && Date.now() - c.t < SAVED_TTL) || !net.ok()) return Promise.resolve(false);
      store.set('saved1', { t: Date.now(), list: saved.list() });
      return fetchDoc('https://www.dlsite.com/girls-touch/mypage/searchword', 'include').then(({ doc }) => {
        const touch = /-touch$/.test(location.pathname.split('/')[1] || '');
        const list = [];
        for (const li of doc.querySelectorAll('li._favorite_item')) { // 2026-11-01 사용자 계정에서 확인: dt.work_thumb > a[href=검색 주소][title=이름]
          const a = li.querySelector('dt a[href*="/fsr/"]');
          const u = a && safeUrl(a.getAttribute('href'));
          if (!u) continue;
          if (!touch) u.pathname = u.pathname.replace(/^\/([^/]+)-touch\//, '/$1/');
          list.push([(a.getAttribute('title') || a.textContent || '').trim().slice(0, 30) || '검색', u.href]);
        }
        store.set('saved1', { t: Date.now(), list });
        return true;
      }).catch(() => false).finally(() => locale.enforce(false));
    },
  };
  const tags = {
    favIds() { const v = store.get('tags.fav', []); return Array.isArray(v) ? v : []; },
    favs() { const m = new Map(kw.list().map((x) => [x[0], x])); return tags.favIds().map((n) => m.get(n)).filter(Boolean).sort((a, b) => a[1].localeCompare(b[1], 'ko')); }, // 가나다순(0.45.0)
    toggleFav(n) { const f = tags.favIds(); store.set('tags.fav', f.includes(n) ? f.filter((x) => x !== n) : [...f, n]); },
    // 이름(한국어·일본어)에 친 글자가 든 태그, 앞에서 맞는 것부터 8개
    find(v) {
      const q = v.replace(/\s+/g, '').toLowerCase();
      if (!q) return [];
      const sc = (t) => { const i = t.replace(/\s+/g, '').toLowerCase().indexOf(q); return i < 0 ? 9 : i ? 1 : 0; };
      return kw.list().map((x) => [Math.min(sc(x[1]), sc(x[2])), x]).filter(([n]) => n < 9).sort((a, b) => a[0] - b[0]).slice(0, 8).map(([, x]) => x);
    },
    // 태그 번호로 검색: 검색 화면이면 지금 조건에 더하고(태그끼리는 '그리고') 검색어는 뺀다, 아니면 새 검색
    go(n) { tags.goAll([n]); },
    // 태그 이름으로 글자 검색: 한국어·일본어 이름('/'로 나눈 조각 각각)을 '|'(또는)로 묶어 검색창에 넣고 제출한다(오빠/형 → 오빠|형|兄)
    words(n) {
      const t = kw.list().find((x) => x[0] === n);
      return t ? [...new Set([t[1], t[2]].flatMap((x) => x.split('/')).map((x) => x.trim()).filter(Boolean))].join('|') : '';
    },
    word(inp, n) {
      const w = tags.words(n);
      if (!w || !inp) return;
      sbox.remember(w.split('|')[0]);
      inp.value = w;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      sbox.submit(inp);
    },
    // 여러 태그를 한 번에(# 검색). 이미 걸린 태그는 건너뛴다
    goAll(ns) {
      const p = location.pathname, pp = route.isSearch(p) && pathPairs(p);
      if (BULK_PAGE.test(p)) {
        const u = new URL(location.href);
        const gs = [...u.searchParams.keys()].filter((x) => /^genre\[\d*\]$/.test(x));
        const add = ns.filter((n) => !gs.some((x) => u.searchParams.get(x) === n));
        if (!add.length) return;
        u.searchParams.delete('page');
        add.forEach((n, i) => u.searchParams.set(`genre[${gs.length + i}]`, n));
        location.assign(u.href);
        return;
      }
      if (pp) {
        const gs = pp.pairs.filter((x) => segKey(x[0]) === 'genre');
        const add = ns.filter((n) => !gs.some((x) => x[1] === n));
        if (!add.length) return;
        const np = pathSet(p, ['keyword', 'page'], add.map((n, i) => [`genre%5B${gs.length + i}%5D`, n]));
        const u = new URL(location.href); u.pathname = np; location.assign(u.href);
      } else location.assign(`https://www.dlsite.com/${location.pathname.split('/')[1] || 'girls'}/fsr/=/language/jp/` + ns.map((n, i) => `genre%5B${i}%5D/${n}`).join('/'));
    },
    // '#임신,순애' → 앞의 # 를 떼고 쉼표로 나눈 조각들. 조각이 태그 이름(한국어·일본어, '/'로 나눈 한 조각도, 띄어쓰기 무시)과 정확히 같으면 번호, 아니면 null
    pieces(v) { return /^#/.test(v) ? v.replace(/^#/, '').split(',').map((x) => x.replace(/^\s*#?/, '').trim()) : []; },
    resolve(piece) {
      const w = normName(piece);
      if (!w) return null;
      const hit = kw.list().find(([, ko, ja]) => [ko, ja].some((t) => normName(t) === w || t.split('/').some((x) => normName(x) === w)));
      return hit ? hit[0] : null;
    },
    // 검색창 글자가 모두 태그면 번호 목록, 아니면 null
    parse(v) {
      const ps = tags.pieces(v.trim());
      if (!ps.length) return null;
      const ns = ps.map(tags.resolve);
      return ns.every(Boolean) ? [...new Set(ns)] : null;
    },
  };
  const sbox = {
    seen: new WeakSet(),
    recent() { const v = store.get('search.recent2', []); return Array.isArray(v) ? v : []; },
    remember(t) { if (t && !/\|/.test(t)) store.set('search.recent2', [t, ...sbox.recent().filter((x) => x !== t)].slice(0, 10)); },
    attach() {
      for (const inp of document.querySelectorAll('input[name=keyword]')) {
        if (sbox.seen.has(inp) || inp.closest(OURS)) continue;
        sbox.seen.add(inp);
        const open = () => sbox.open(inp);
        inp.addEventListener('focus', open);
        inp.addEventListener('click', open);
        inp.addEventListener('input', () => { if (sheet.node && !sheet.node.hidden && sheet.opener === inp) { const ps = sbox.parts(inp); if (ps.length) sheet.redraw(ps); else sheet.close(); } else open(); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') sheet.close(); });
      }
    },
    open(inp) {
      if (sheet.node && !sheet.node.hidden && sheet.opener === inp) return;
      const ps = sbox.parts(inp);
      if (ps.length) sheet.show(ps, inp, { noBack: true });
      if (!inp.value.trim()) saved.refresh().then((did) => { if (did && document.activeElement === inp && !inp.value.trim()) { const p2 = sbox.parts(inp); if (p2.length) { if (sheet.node && !sheet.node.hidden && sheet.opener === inp) sheet.redraw(p2); else sheet.show(p2, inp, { noBack: true }); } } });
    },
    submit(inp) { const f = inp.form; if (f && f.requestSubmit) f.requestSubmit(); else if (f) f.submit(); },
    parts(inp) {
      const v = inp.value.trim();
      const chips = (xs) => el('div', { class: 'chips' }, xs);
      if (!v) {
        const out = [];
        const sv = saved.list(), ft = tags.favs(), rc = sbox.recent();
        if (sv.length) out.push(sheet.sec('저장한 검색'), chips(sv.map(([t, u]) => el('a', { class: 'chip sv', href: u }, t))));
        if (ft.length) out.push(sheet.sec('자주 쓰는 태그'), chips(ft.map(([n, ko]) => el('button', { class: 'chip', onclick: () => { sheet.close(); tags.word(inp, n); } }, ko))));
        if (rc.length) out.push(sheet.sec('최근'), chips(rc.map((t) => el('button', { class: 'chip', onclick: () => { inp.value = t; sheet.close(); sbox.submit(inp); } }, t))));
        return out;
      }
      const fs = tags.favIds();
      // '#임신,순' 처럼 #로 시작하면 마지막 쉼표 뒤 글자로 후보를 찾고, 앞 조각이 태그면 같이 건다(태그 번호 검색 = 태그 붙은 작품만).
      // # 없이 후보를 누르면 태그 이름(한국어·일본어)으로 글자 검색 = 제목·본문·태그 모두(태그 129번 2483 / 임신|妊娠|孕ませ 4986, 2026-11-02)
      const ps = tags.pieces(v), prev = ps.slice(0, -1).map(tags.resolve).filter(Boolean);
      const go = (n) => { if (ps.length) tags.goAll([...new Set([...prev, n])]); else tags.word(inp, n); };
      const rows = tags.find(ps.length ? ps[ps.length - 1] : v).map(([n, ko, ja]) => {
        const st = el('button', { class: 'st' + (fs.includes(n) ? ' on' : ''), 'aria-label': '자주 쓰는 태그', 'aria-pressed': String(fs.includes(n)), onclick: (e) => { e.stopPropagation(); tags.toggleFav(n); sheet.redraw(sbox.parts(inp)); } }, icon('st'));
        return el('div', { class: 'li tr' }, el('button', { class: 'tb', onclick: () => { sheet.close(); go(n); } }, el('span', { class: 'pt' }, (ps.length ? '#' : '') + ko), ko !== ja ? el('span', { class: 'ps' }, ja) : null), st);
      });
      return [...rows, el('button', { class: 'li all', onclick: () => { sheet.close(); sbox.submit(inp); } }, icon('sr'), el('span', { class: 'pt' }, `'${v}' 전체 검색`))];
    },
  };

  /* ========== 7.5 sheet: 바 바로 아래 팝업(쿠폰·할인·언어·층·검색창 목록) ==========
     바깥(투명 막)을 누르면 닫힌다. 화면을 어둡게 덮지 않는다. */
  const sheet = {
    node: null,
    back: null,
    opener: null,
    onClose: null,
    at: 0,
    close() {
      if (!sheet.node || sheet.node.hidden) return;
      sheet.node.hidden = true;
      sheet.back.hidden = true;
      const f = sheet.onClose;
      sheet.onClose = null;
      if (sheet.opener && !sheet.opener.matches('input')) sheet.opener.focus(); // 검색창이면 포커스를 돌려주지 않는다(다시 열림)
      if (f) f();
    },
    ensure() {
      if (sheet.node) return;
      sheet.back = el('div', { id: 'dlsheet-back', hidden: '', onclick: () => { if (Date.now() - sheet.at > 300) sheet.close(); } });
      sheet.node = el('div', { id: 'dlsheet', role: 'dialog', 'aria-label': '선택', hidden: '' });
      sheet.node.addEventListener('keydown', (e) => { if (e.key === 'Escape') sheet.close(); });
      document.documentElement.append(sheet.back, sheet.node);
      // 막 없이 연 팝업(검색창 목록)은 팝업·검색창 칸 바깥을 누르면 닫는다(사이트 검색 버튼은 그대로 눌리게)
      document.addEventListener('pointerdown', (e) => { if (!sheet.node.hidden && sheet.outside && !sheet.node.contains(e.target) && !sheet.outside.contains(e.target)) sheet.close(); }, true);
      const vv = window.visualViewport;
      if (vv) { vv.addEventListener('resize', sheet.fit); vv.addEventListener('scroll', sheet.fit); }
      window.addEventListener('scroll', sheet.fit, { passive: true });
    },
    // 바 바로 아래에(바가 화면 위로 지나갔으면 화면 맨 위에). 키보드가 올라오면 보이는 높이 안에서만
    fit() {
      if (!sheet.node || sheet.node.hidden) return;
      const bar = sheet.opener && (sheet.opener.closest('#dlbar') || sheet.opener); // 바 또는 검색창 아래
      const vv = window.visualViewport;
      const vTop = vv ? vv.offsetTop : 0, vH = vv ? vv.height : innerHeight;
      const top = Math.max(vTop + 8, bar ? Math.round(bar.getBoundingClientRect().bottom) + 6 : vTop + 8);
      sheet.node.style.top = top + 'px';
      sheet.node.style.maxHeight = Math.max(160, Math.round(vTop + vH - top - 10)) + 'px';
    },
    show(parts, opener, opt = {}) {
      sheet.ensure();
      if (!sheet.node.hidden) { sheet.onClose = null; sheet.close(); } // 다른 팝업이 열려 있었으면 닫고(보낼 것 없이)
      sheet.opener = opener;
      sheet.onClose = opt.onClose || null;
      sheet.outside = opt.noBack ? opener.closest('form') || opener : null;
      sheet.at = Date.now();
      sheet.node.replaceChildren(...parts.filter(Boolean));
      sheet.node.hidden = false;
      sheet.back.hidden = !!opt.noBack;
      sheet.fit();
      if (opt.focus) sheet.node.querySelector(opt.focus)?.focus();
    },
    // 내용만 바꾼다(열린 채로)
    redraw(parts) { sheet.node.replaceChildren(...parts.filter(Boolean)); sheet.fit(); },
    sec: (t) => el('div', { class: 'sec' }, t),
    // 정렬 하나(세로 목록). 고르면 닫힌다
    // 0.47.0: 10개를 언제나 다 보여준다(사용자: 할인 개시/종료순이 항상 있어야 한다). 전에는 cstart_d를 할인 검색일 때만 보여 줬다.
    // 0.49.1 줄 꾹 = 집어 올림 → 옮길 자리(줄)를 누르면 그 앞으로 간다. 순서는 'sort.order.s'(검색 등)·'sort.order.w'(즐겨찾기)에 저장
    openSort(opener, cur, sale, pick, rows = SORTS) { // 0.49.0 즐겨찾기는 WSORTS를 넘긴다
      const key = 'sort.order.' + (rows === WSORTS ? 'w' : 's');
      const saved = String(store.get(key, '')).split(',').filter(Boolean);
      const at = (v) => { const i = saved.indexOf(v); return i < 0 ? 99 : i; };
      const ord = [...rows].sort((a, b) => (at(a[0]) - at(b[0])) || (rows.indexOf(a) - rows.indexOf(b)));
      let mv = null;
      const draw = () => sheet.show([sheet.sec(mv ? '옮길 자리를 누르세요' : '정렬 · 꾹 = 순서 바꾸기'), ...ord.map(([v, t]) => {
        const b = el('button', { class: 'li' + (cur === v ? ' on' : '') + (mv === v ? ' mv' : ''), 'aria-pressed': String(cur === v) }, el('span', { class: 'pt' }, t), cur === v ? icon('ck') : null);
        pressable(b, () => {
          if (!mv) { sheet.close(); pick(v); return; }
          if (mv !== v) {
            const from = ord.findIndex((x) => x[0] === mv), it = ord.splice(from, 1)[0];
            ord.splice(ord.findIndex((x) => x[0] === v), 0, it);
            store.set(key, ord.map((x) => x[0]).join(','));
          }
          mv = null; draw();
        }, () => { mv = mv === v ? null : v; draw(); });
        return b;
      })], opener);
      draw();
    },
    openCoupons(opener, pick) {
      const cur = list.state.coupon;
      const num = (c, i) => parseFloat(coupon.rate(c.id).split('~').slice(i)[0]) || 0; // i=-1 최고율, 0 최저율
      const items = [...coupon.list()].sort((a, b) => (num(b, -1) - num(a, -1)) || (num(b, 0) - num(a, 0)));
      const fmt = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()}까지`; };
      const row = (id, big, title, sub, tone) => el('button', { class: 'li' + (cur === id ? ' on' : ''), 'aria-pressed': String(cur === id), onclick: () => { sheet.close(); pick(id); } },
        el('span', { class: 'pr ' + tone }, big),
        el('span', { class: 'pb' }, el('span', { class: 'pt' }, title), sub ? el('span', { class: 'ps' }, sub) : null),
        cur === id ? icon('ck') : null);
      const tone = (r) => toneOf(Math.max(0, ...(r.match(/\d+/g) || []).map(Number)));
      const parts = [row('*', '전체', '가진 쿠폰 아무거나', items.length ? `쿠폰 ${items.length}종` : '', 'c0')];
      for (const c of items) {
        const r = coupon.rate(c.id);
        parts.push(row(c.id, r ? r + '%' : '쿠폰', c.title || (r ? r + '% 쿠폰' : '쿠폰'), c.until ? fmt(c.until) : '', tone(r)));
      }
      sheet.show(parts, opener);
    },
    // 묶음 할인 검색: 입력칸 + 태그 후보. Enter = 그 글자로(한국어면 일본어도 '또는'), 후보 = 태그 이름으로 글자 검색. '#'로 시작하면 태그 번호(검색창과 같은 규칙)
    openBulk(opener, q) {
      const inp = el('input', { type: 'search', class: 'tin', value: q, enterkeyhint: 'search', 'aria-label': '묶음 할인 안에서 검색' });
      const list = el('div', {});
      const run = (word) => {
        const v = word || inp.value.trim();
        const ns = !word && tags.parse(v);
        if (ns) { sheet.close(); tags.goAll(ns); return; }
        const ps = tags.pieces(v), w = ps.length ? ps.filter(Boolean).join(' ') : v;
        const u = new URL(location.href);
        u.searchParams.delete('page');
        if (w) { sbox.remember(w.split('|')[0]); u.searchParams.set('keyword', kw.expand(w) || w); } else u.searchParams.delete('keyword');
        sheet.close();
        location.assign(u.href);
      };
      const draw = () => {
        const v = inp.value.trim(), ps = tags.pieces(v), prev = ps.slice(0, -1).map(tags.resolve).filter(Boolean);
        const go = (n) => { if (ps.length) { sheet.close(); tags.goAll([...new Set([...prev, n])]); } else run(tags.words(n)); };
        list.replaceChildren(...(v ? tags.find(ps.length ? ps[ps.length - 1] : v) : tags.favs()).map(([n, ko, ja]) => el('button', { class: 'li', onclick: () => go(n) },
          el('span', { class: 'pb' }, el('span', { class: 'pt' }, (ps.length ? '#' : '') + ko), ko !== ja ? el('span', { class: 'ps' }, ja) : null))));
        sheet.fit();
      };
      inp.addEventListener('input', draw);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
      sheet.show([el('label', { class: 'sin' }, icon('sr'), inp), list], opener, { focus: '.tin' });
      draw();
    },
  };
  /* ========== 8. voice (성우 수집 및 캐시) ==========
     - 음성 작품(.work_category.type_SOU) 카드에는 성우 링크(.author a[keyword_creater])가 있다. 그 이름을 쓰고 요청하지 않는다
       (2026-11-01 검색 결과 3개를 product.json voice_by와 대조해 같음). 성우가 둘 이상이면 카드엔 첫 명만 있고 .author.omit이라 그때만 받는다.
     - 만화·CG·노벨 같은 형식(NO_VOICE_TYPE)은 받지 않는다. 형식 표시가 없는 카드(이벤트 목록 등)는 예전처럼 받는다.
     - 요청 대상은 항상 화면에 보이는 카드뿐이다. 서버 요청 수를 늘리지 않기 위함.
     - GM_setValue는 5초 디바운스로 묶고, 페이지 이탈(visibilitychange / pagehide) 시 즉시 저장한다. */
  const VA_KEY = 'vaCache3';
  const VA_KEY_OLD = 'vaCache2';
  const VA_MAX = 3000;
  const CP_KEY = 'cpCache3'; // 작품별 쿠폰 키(가진 쿠폰 것만)와 묶음 할인 키 { 작품id: { t: 받은 시각, k: '키|키', b: '묶음 키' } }, COUPON_TTL 동안 유효
  const CP_MAX = 1500;
  const CV_HINT = /CV|ＣＶ|C\.V|声優|声の出演|성우/i;
  const CV_LABEL = /(?<![A-Za-z])(?:CV|ＣＶ|C\.V\.?|声優|声の出演|성우)[ \t\u3000]*[:：][ \t\u3000]*([^\n\r<>()（）【】\[\]「」『』]{1,80})/gi;
  const CV_SKIP = /^(?:未定|なし|無し|不明|非公開|秘密|tba|tbd|none|n\/a|[-―ー—]+)$|後日|発表|公開|決定|予定|お楽しみ|お知らせ/i;
  const plainText = (t) => t
    .replace(/<br\s*\/?>|<\/(?:p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
  function vaFromText(json) {
    const texts = [];
    const walk = (v, d) => {
      if (typeof v === 'string') { if (v.length < 20000 && CV_HINT.test(v)) texts.push(v); }
      else if (v && typeof v === 'object' && d < 4) for (const k of Object.keys(v)) walk(v[k], d + 1);
    };
    walk(json, 0);
    const names = [];
    for (const t of texts) {
      for (const m of plainText(t).matchAll(CV_LABEL)) {
        for (let n of splitVa(m[1].split(/[。！!？?※★☆■◆●▼]/)[0])) {
          n = n.replace(/(?:様|さん|氏)$/, '').trim();
          if (n && n.length <= 30 && !CV_SKIP.test(n) && !names.includes(n)) names.push(n);
        }
      }
    }
    return names.slice(0, 8);
  }
  const voice = {
    cpTimer: null,
    cache: null,
    vaDirty: false,
    saveTimer: null,
    cpCache: null,
    cpDirty: false,

    ensureCpCache() {
      if (!voice.cpCache) voice.cpCache = store.get(CP_KEY, null) || {};
      return voice.cpCache;
    },
    // 쿠폰 키 목록. 받은 적 없거나 오래됐으면 null
    couponsFor(id) {
      const c = voice.ensureCpCache()[id];
      return c && Date.now() - c.t < COUPON_TTL ? (c.k ? c.k.split('|') : []) : null;
    },
    bulkFor(id) { const c = voice.ensureCpCache()[id]; return c && Date.now() - c.t < COUPON_TTL ? c.b || '' : null; },
    // 0.53.0 번역 허가(a: 1 가능 · 0 불가 · 없음 모름) — 쿠폰 기록과 같은 작품 정보 응답(translation_info.is_translation_agree)에서 받아 같은 칸에 둔다(요청 없음)
    agreeFor(id) { const c = voice.ensureCpCache()[id]; return c && Date.now() - c.t < COUPON_TTL ? c.a : undefined; },
    putCoupons(id, keys, bulk, agree) {
      const cc = voice.ensureCpCache();
      delete cc[id];
      cc[id] = bulk ? { t: Date.now(), k: keys.join('|'), b: bulk } : { t: Date.now(), k: keys.join('|') };
      if (agree === 0 || agree === 1) cc[id].a = agree;
      const ids = Object.keys(cc);
      if (ids.length > CP_MAX + 50) {
        for (let i = 0; i < ids.length - CP_MAX; i++) delete cc[ids[i]];
      }
      voice.cpDirty = true;
      clearTimeout(voice.cpTimer);
      voice.cpTimer = setTimeout(() => voice.flushSaves(), VA_SAVE_DEBOUNCE_MS);
    },

    // 카드에 있는 성우: { names, more(첫 명만 있음), need(받아야 함) }. 성우 표시를 끄면 null
    fromCard(card) {
      if (!opt('showVA')) return null;
      const t = card.querySelector('.work_category');
      const type = t ? t.className : '';
      if (NO_VOICE_TYPE.test(type)) return { names: [], more: false, need: false };
      if (!/\btype_SOU\b/.test(type)) return { names: [], more: false, need: true };
      const names = [];
      for (const a of card.querySelectorAll('.author a[href*="/keyword_creater/"]')) {
        const m = (a.getAttribute('href') || '').match(/\/keyword_creater\/([^/?#]+)/);
        let n = '';
        try { n = m ? decodeURIComponent(m[1]).replace(/^"|"$/g, '') : ''; } catch (e) { /* 잘못된 주소 */ }
        n = n || a.textContent.trim(); // 주소 속 이름은 자동 번역돼도 원래 일본어
        if (n && !names.includes(n)) names.push(n);
      }
      const more = !!card.querySelector('.author.omit');
      return { names, more, need: !names.length || more };
    },

    ensureVaCache() {
      if (!voice.cache) {
        voice.cache = store.get(VA_KEY, null);
        if (!voice.cache) {
          voice.cache = {};
          for (const [k, v] of Object.entries(store.get(VA_KEY_OLD, null) || {})) if (v && v !== '-') voice.cache[k] = v;
          store.set(VA_KEY, voice.cache);
          store.set(VA_KEY_OLD, {});
        }
      }
      return voice.cache;
    },
    getCached(id) {
      return voice.ensureVaCache()[id] || null;
    },
    // 받아 온 성우가 있으면(없음 '-'도 기록) 다시 받지 않는다
    hasVa(id) {
      return !!voice.getCached(id);
    },
    putCached(id, name) {
      const vc = voice.ensureVaCache();
      delete vc[id];
      vc[id] = name;
      const keys = Object.keys(vc);
      if (keys.length > VA_MAX + 50) {
        for (let i = 0; i < keys.length - VA_MAX; i++) delete vc[keys[i]];
      }
      voice.vaDirty = true;
      clearTimeout(voice.saveTimer);
      voice.saveTimer = setTimeout(() => voice.flushSaves(), VA_SAVE_DEBOUNCE_MS);
    },

    flushSaves() {
      clearTimeout(voice.saveTimer);
      clearTimeout(voice.cpTimer);
      if (voice.vaDirty && voice.cache) {
        voice.vaDirty = false;
        store.set(VA_KEY, voice.cache);
      }
      if (voice.cpDirty && voice.cpCache) {
        voice.cpDirty = false;
        store.set(CP_KEY, voice.cpCache);
      }
    },

    queue: [],
    busy: 0,
    dead: new Set(),   // 다시 시도해도 소용없는 작품(404/410, 인증 필요)
    // 0.47.3: dead·tries는 예전에 지우는 곳이 없어서, 목록을 오래 넘길수록 계속 쌓였다(메모리 증가).
    // 상한을 넘으면 오래된 것부터 버린다. dead를 너무 작게 잡으면 같은 실패를 반복하므로 500개(넉넉히).
    DEAD_MAX: 500,
    TRIES_MAX: 800,
    _capDead() {
      if (voice.dead.size <= voice.DEAD_MAX) return;
      // Set은 넣은 순서를 지킨다 → 앞에서부터(가장 오래된 것) 버린다
      let extra = voice.dead.size - voice.DEAD_MAX;
      for (const id of voice.dead) { if (extra-- <= 0) break; voice.dead.delete(id); }
    },
    _capTries() {
      const keys = Object.keys(voice.tries);
      if (keys.length <= voice.TRIES_MAX) return;
      for (let i = 0; i < keys.length - voice.TRIES_MAX; i++) delete voice.tries[keys[i]];
    },
    pausedUntil: 0,    // 인증 필요 등으로 잠시 멈춘 시각
    _resume: 0,
    stat: { ok: 0, none: 0, err: 0, why: '' },

    fetchVa(id, href) {
      const fl = ((href.match(/dlsite\.com\/([^/]+)\//) || [])[1] || route.floor()).replace(/-touch$/, '');
      return netFetch(`https://www.dlsite.com/${fl}/api/=/product.json?workno=${encodeURIComponent(id)}`, { credentials: 'include' }, 'text')
        .catch((e) => { if (e && (e.status === 404 || e.status === 410)) e.noRetry = true; throw e; })
        .then((t) => {
          let j;
          try { j = JSON.parse(t); } catch (e) {
            const er = new Error('성인 인증 필요: dlsite.com에서 한 번 인증해 주세요');
            er.noRetry = true; er.pause = true;
            throw er;
          }
          net.good();
          const w = Array.isArray(j) ? j[0] : j;
          let names = ((w && w.creaters && w.creaters.voice_by) || []).map((x) => x.name).filter(Boolean);
          if (!names.length && w) names = vaFromText(w);
          return names.length ? names.join(' / ') : '-';
        })
        .finally(() => locale.enforce(false));
    },

    // 우선순위 선택:
    // 1순위: 현재 화면에 보이고(vis) 숨겨지지 않은 카드
    // 2순위: 화면 근처로 들어와 있지만 숨겨진 카드(쿠폰 거르기를 풀면 곧 보일 카드)
    // 화면 밖 카드는 받지 않는다.
    pickNextJobIndex() {
      const idx = voice.queue.findIndex((j) => voice.vis.has(j.card) && j.card.style.display !== 'none');
      if (idx >= 0) return idx;
      return voice.queue.findIndex((j) => voice.vis.has(j.card));
    },

    pump() {
      const wait = Math.max(net.ok() ? 0 : net.until - Date.now(), voice.pausedUntil - Date.now());
      if (wait > 0) {
        voice.stat.why = net.ok() ? '인증 필요: 잠시 쉬는 중' : '서버가 제한해서 30분 쉬는 중';
        clearTimeout(voice._resume);
        voice._resume = setTimeout(voice.pump, wait + 1000);
        return;
      }
      voice.queue = voice.queue.filter((j) => j.card.isConnected && !voice.hasVa(j.id) && !voice.dead.has(j.id) && (voice.tries[j.id] || 0) < 3);
      while (voice.busy < VA_PARALLEL) {
        const k = voice.pickNextJobIndex();
        if (k < 0) break;
        const job = voice.queue.splice(k, 1)[0];
        const { id, url } = job;
        voice.busy++;
        voice.fetchVa(id, url)
          .then((name) => {
            voice.stat[name === '-' ? 'none' : 'ok']++;
            voice.putCached(id, name);
            if (name !== '-') list.scheduleApply(150);
          })
          .catch((e) => {
            voice.stat.err++;
            voice.stat.why = String((e && e.message) || e);
            if (e && e.pause) voice.pausedUntil = Date.now() + 5 * 60 * 1000;
            if (e && e.noRetry) { voice.dead.add(id); voice._capDead(); return; }
            voice.tries[id] = (voice.tries[id] || 0) + 1;
            voice._capTries();
            if (voice.tries[id] < 3) voice.queue.push(job);
          })
          .finally(() => {
            setTimeout(() => {
              voice.busy--;
              voice.pump();
              if (!voice.busy) list.scheduleApply(100);
            }, VA_GAP_MS);
          });
      }
    },

    load() {
      if (!opt('showVA') || !route.isList(location.pathname)) return;
      for (const card of list.items()) {
        if (card.dataset.dlva) continue;
        const a = card.querySelector('a[href*="/product_id/"]');
        const id = a && pidOf(a.href);
        if (!id) continue;
        card.dataset.dlva = '1';
        if (voice.hasVa(id)) continue;
        const cv = voice.fromCard(card);
        if (cv && !cv.need) continue; // 카드에 성우가 다 있거나(음성) 성우가 없는 형식(만화 등)이면 받지 않는다
        voice.jobs.set(card, { card, id, url: a.href.split('?')[0] });
        voice.io().observe(card); // 화면에 들어올 때만 큐에 들어간다
      }
    },

    jobs: new WeakMap(),
    vis: new Set(),
    tries: {},
    _io: null,
    io() {
      if (voice._io) return voice._io;
      const enter = (card) => {
        voice.vis.add(card);
        const job = voice.jobs.get(card);
        if (job && !voice.queue.includes(job) && !voice.hasVa(job.id) && !voice.dead.has(job.id) && (voice.tries[job.id] || 0) < 3) voice.queue.push(job);
      };
      if (!('IntersectionObserver' in window)) return (voice._io = { observe: (c) => { enter(c); voice.pump(); } });
      voice._io = new IntersectionObserver((entries) => {
        for (const en of entries) { if (en.isIntersecting) enter(en.target); else voice.vis.delete(en.target); }
        voice.pump();
      }, { rootMargin: '300px 0px' });
      return voice._io;
    },
  };

  // 탭을 닫거나 이동할 때 미저장된 성우·태그 캐시를 즉시 기록
  window.addEventListener('pagehide', () => voice.flushSaves());
  document.addEventListener('visibilitychange', () => { if (document.hidden) voice.flushSaves(); });

  /* ========== 9. 일본어 화면에서 가져오는 것들 ========== */
  const stripFloor = () => (STRIP_FLOORS.includes(route.floor()) ? route.floor() : 'girls');
  const cached = (key, make) => {
    const c = store.get(key, null);
    if (c && Date.now() - c.t < CACHE_MS) return Promise.resolve(c.list);
    return make().then((v) => { store.set(key, { t: Date.now(), list: v }); return v; });
  };
  const imgUrl = (img) => {
    if (!img) return '';
    for (const k of ['src', 'data-src', 'data-original', 'data-lazy-src', 'srcset', 'data-srcset']) {
      const v = (img.getAttribute(k) || '').trim().split(/\s+/)[0];
      if (!v || /^data:/.test(v) || /blank|spacer|1x1/i.test(v)) continue;
      const u = safeUrl(v) || (() => { try { const x = new URL(v, 'https://www.dlsite.com'); return x.protocol === 'https:' ? x : null; } catch (e) { return null; } })();
      if (u) return u.href;
    }
    return '';
  };

  const topDocs = {};
  // 실패한 요청은 남기지 않는다(전엔 실패한 약속이 그대로 남아 '다시 시도'해도 계속 실패했다)
  const jaTop = (f) => (topDocs[f] = topDocs[f] || jaFetch(`https://www.dlsite.com/${f}/`).catch((e) => { delete topDocs[f]; throw e; }));

  function parseSaleBanners(doc) {
    const out = [];
    const byKey = new Map();
    for (const a of doc.querySelectorAll('a[href]')) {
      const u = safeUrl(a.getAttribute('href'));
      if (!u || /\/mypage\/|\/work\/|\/ranking\//.test(u.pathname)) continue;
      const img = a.querySelector('img');
      const src = imgUrl(img);
      const t = ((img && img.alt) || a.title || a.textContent || '').trim().replace(/\s+/g, ' ');
      const isCamp = /\/campaign\//.test(u.pathname);
      const hit = isCamp || KEEP_TEXT.test(t) || (src && KEEP_HREF.test(u.href) && BANNER_IMG.test(src));
      if (!hit || (!src && !isCamp) || (src && NOT_BANNER_IMG.test(src))) continue;
      const key = u.pathname + u.search.replace(/[?&](ai|site_group)[^&]*/g, '');
      const old = byKey.get(key);
      if (old) { if (!old.img && src) old.img = src; continue; }
      const item = { u: u.href, img: src, t: t.slice(0, 60) };
      byKey.set(key, item);
      out.push(item);
    }
    out.sort((a, b) => (b.img ? 1 : 0) - (a.img ? 1 : 0));
    return out.slice(0, 12);
  }
  function paintStrip(items) {
    document.getElementById('dlsale')?.remove();
    setText('dlh-st', `일본 할인 배너 ${items.length}개 (이미지 ${items.filter((x) => x.img).length}개)`);
    if (!items.length) return;
    const withImg = items.filter((x) => x.img);
    if (!withImg.length) return;
    const strip = el('div', { id: 'dlsale' }, withImg.map((x) =>
      el('a', { href: x.u, title: x.t }, el('img', { src: x.img, alt: x.t, referrerpolicy: 'no-referrer', loading: 'lazy' }))));
    for (const img of strip.querySelectorAll('img')) {
      img.addEventListener('load', () => {
        const r = img.naturalWidth / (img.naturalHeight || 1);
        if (r >= 2 && r <= 8) return;
        (img.closest('a') || img).remove();
        if (!strip.children.length) strip.remove();
      });
    }
    const spot = stripSpot();
    if (spot) spot.after(strip);
    else document.body.insertBefore(strip, document.body.firstChild);
  }
  function stripSpot() {
    const anchor = document.querySelector('input[type=search], input[name=keyword], form[action*="fs"]');
    let n = anchor && (anchor.closest('form') || anchor);
    while (n && n.parentElement && n !== document.body) {
      const p = n.parentElement;
      if (n.getBoundingClientRect().width > innerWidth * 0.6 && !/flex|grid/.test(getComputedStyle(p).display)) return n;
      n = p;
    }
    return null;
  }
  function loadStrip() {
    if (!opt('saleStrip') || sameLocale(locale.read(), 'ja_JP')) return;
    const f = stripFloor();
    cached('strip:' + f, () => jaTop(f).then(parseSaleBanners))
      .then(paintStrip)
      .catch((e) => setText('dlh-st', '일본 배너를 못 가져왔어요: ' + ((e && e.message) || '연결 실패')));
  }

  function parseEvents(doc) {
    const seen = new Set();
    const out = [];
    const sp = (s) => (s || '').trim().replace(/\s+/g, ' ');
    for (const a of doc.querySelectorAll('a[href*="/campaign/"]')) {
      const u = safeUrl(a.getAttribute('href'));
      if (!u || /\/campaign\/tutorial/.test(u.pathname) || seen.has(u.href)) continue;
      // 배너 링크의 글자는 마감 날짜뿐이고 이벤트 이름은 이미지 alt에 있다
      const alt = sp((a.querySelector('img') || {}).alt);
      const txt = sp(a.textContent);
      const dm = txt.match(/^(\d{1,2}\/\d{1,2})\s*(\d{1,2}:\d{2})\s*まで$/);
      const t = alt || txt;
      if (!t) continue;
      seen.add(u.href);
      out.push({ u: u.href, t: t.slice(0, 80), d: alt && dm ? `${dm[1]} ${dm[2]}まで` : '' });
    }
    return out;
  }
  function evBadges(t) {
    const s = t.replace(/％/g, '%');
    const badges = [];
    let max = -1;
    const unit = (u) => (u === '冊' ? '권' : '개');
    let nb = 0;
    for (const m of s.matchAll(/(\d{1,3})\s*(本|冊|点|作品|個)\s*(?:以上)?\s*(?:で|→)\s*(\d{1,2})\s*%/g)) { badges.push(`${m[1]}${unit(m[2])} ${m[3]}%`); max = Math.max(max, +m[3]); nb++; }
    const ns = nb ? [] : [...s.matchAll(/(\d{1,2})\s*%?\s*[~～〜]\s*(\d{1,2})\s*%|(\d{1,2})\s*%/g)]
      .flatMap((m) => (m[3] ? [+m[3]] : [+m[1], +m[2]])).filter((n) => n > 0 && n < 100);
    if (ns.length) {
      const lo = Math.min(...ns), hi = Math.max(...ns);
      max = hi;
      badges.push(/最大|最高|MAX|up\s*to|최대/i.test(s) ? `최대 ${hi}%` : lo === hi ? hi + '%' : lo + '~' + hi + '%');
    }
    for (const m of s.matchAll(/(\d{1,3})\s*(本|冊|点|作品|個)\s*(?:で|→)?\s*(\d[\d,]*)\s*円/g)) { badges.push(`${m[1]}${unit(m[2])} ${m[3]}엔`); nb++; }
    return { max, nb, badges };
  }
  function loadEvents(box) {
    box.textContent = '불러오는 중…';
    box.setAttribute('aria-busy', 'true');
    const f = route.floor();
    cached('events2:' + f, () => jaTop(f).then(parseEvents)) // events2: 이름(alt)·마감(d)을 담는 새 형식
      .then((items) => box.replaceChildren(...(items.length
        ? items.map((x, i) => ({ x, i, r: evBadges(x.t) })).sort((a, b) => (b.r.max - a.r.max) || (b.r.nb - a.r.nb) || (a.i - b.i)).map(({ x, r }) =>
          el('a', { class: 'ev', href: x.u }, r.badges.length ? el('span', { class: 'rts' }, r.badges.map((l) => el('span', { class: 'rt' }, l))) : null, el('span', { class: 'et' }, x.t, x.d ? el('i', {}, x.d) : null)))
        : [el('span', { class: 'mut' }, '이벤트를 찾지 못했어요')])))
      .catch((e) => box.replaceChildren(el('span', { class: 'mut' }, '이벤트를 못 불러왔어요 (' + ((e && e.message) || '연결 실패') + ')'), el('button', { class: 'lnk', onclick: () => loadEvents(box) }, '다시 시도')))
      .finally(() => box.setAttribute('aria-busy', 'false'));
  }

  /* ========== 10. panel ========== */
  const CSS = `
#dlh,#dlbar,#dlsheet,.dlx,.dlw{--ink:#111;--sub:#555559;--faint:#8a8a90;--line:#dcdce0;--surface:#f2f2f3;--bg:#fff;--red:#e5322d;--acc:#d76088;
  font-family:"Pretendard Variable",Pretendard,"Hiragino Sans","Noto Sans JP","Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif}
#dlh *,#dlbar *,#dlsheet *{box-sizing:border-box}
#dlh button,#dlbar button,#dlsheet button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
#dlh :focus-visible,#dlbar :focus-visible,#dlsheet :focus-visible,.dlx :focus-visible,.dlw :focus-visible{outline:2px solid var(--acc);outline-offset:2px}

#dlbar{display:block;position:relative;z-index:1;float:none;clear:both;flex:0 0 100%;grid-column:1/-1;width:auto;max-width:100%;margin:0;padding:12px 10px 12px;
  background:var(--bg);border-bottom:1px solid var(--line);font-size:13px;line-height:1.2;color:var(--ink)}
#dlbar .cr{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
#dlbar .cr::-webkit-scrollbar{display:none}
#dlbar .cg{display:flex;flex:none;max-width:70%;height:38px;border-radius:19px;background:#f0eeef;color:#3c3f46}
#dlbar .cg.on{background:#f6e5eb;color:#d76088;box-shadow:inset 0 0 0 1px #ecc5d3}
#dlbar .c{display:flex;align-items:center;justify-content:center;gap:2px;flex:1 1 auto;min-width:0;height:100%;padding:0 8px 0 12px;border:0;border-radius:10px;background:none;color:inherit;font-size:13.5px;font-weight:600;line-height:1;white-space:nowrap}
#dlbar .c:disabled{color:#b5bbcb}
#dlbar .c>span{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis}
#dlbar .c svg{flex:none;width:18px;height:18px;fill:currentColor}
#dlbar .c svg.dn{width:16px;height:16px;opacity:.7}
#dlbar .cg.on .c{padding-right:2px}
#dlbar .x{flex:none;width:26px;height:100%;padding:0;border:0;border-radius:0 19px 19px 0;display:flex;align-items:center;justify-content:center;background:none;color:#d76088;font-size:13px}
#dlbar .rw{display:flex;align-items:center;gap:8px}
#dlbar .rw .cr{flex:1 1 auto;min-width:0;align-items:center}
#dlbar .cnt{flex:none;font-size:13px;font-weight:700;color:var(--sub);white-space:nowrap;font-variant-numeric:tabular-nums}
#dlbar .rs{flex:none;width:38px;height:38px;padding:0;border:0;border-radius:19px;display:flex;align-items:center;justify-content:center;background:#f6e5eb;color:#d76088;font-size:20px;line-height:1}
#dlbar .rs[hidden]{display:none}
.status_select.search,.search_tag_wrap,a.btn_page,a.search_sort,a.search_save{display:none!important}
#keyword_form.search_form{height:46px!important;border:0!important;border-radius:23px 0 0 23px!important;background:#f0eeef!important}
#search_button.globalSearchBtn{background:#d76088!important;border-radius:0 23px 23px 0!important}
#hide_bought.cp_floor_link_item{border:0!important;border-radius:19px!important;background:#f0eeef!important;color:#3c3f46!important;align-items:center;justify-content:center}
#hide_bought.cp_floor_link_item.is-on{background:#f6e5eb!important;color:#d76088!important}

.dlx{position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;visibility:visible!important;opacity:1!important;display:block!important;overflow:hidden;box-sizing:border-box;pointer-events:none;font-size:12px;line-height:1.3}
.dlx *{box-sizing:border-box}
.dlx>*{pointer-events:auto}
.dlrow{display:flex!important;align-items:center;gap:4px;margin-top:0!important;margin-bottom:4px!important;padding:0 2px!important;min-height:20px;list-style:none;font:700 11px/1 "Pretendard Variable",Pretendard,system-ui,sans-serif;color:#555}
.dlrow .dlpn{white-space:nowrap;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.dlrow .dlpn.ok{color:#2e7d32}
.dlrow .dlw{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;margin-left:auto;width:22px;height:22px;padding:0;border:1.3px solid #222;border-radius:50%;color:#111;font:900 6.5px/1 system-ui,sans-serif;text-decoration:none;white-space:nowrap;position:relative}
.dlrow .dlw::after{content:'';position:absolute;inset:-12px -12px -12px -16px}
li.n_work_list_item dd.work_categories{margin-bottom:4px!important;padding-bottom:4px!important}
li.dlkind dd.work_categories,li.dlkind .work_category{display:none!important}
/* 0.50.2 장바구니: 카드 안 줄이 세로로 쌓여(flex column) 언어 라벨(.n_work_option)과 '카트로 되돌린다·☆·🗑' 줄(.cart_item_foot)이 두 줄이 되던 것 → 라벨 바로 다음 줄을 위로 끌어올려 같은 줄·같은 높이(라벨 왼쪽, 링크 오른쪽)로 */
li._cart_item dd.n_work_option + dd.cart_item_foot,li._cart_items dd.n_work_option + dd.cart_item_foot{width:auto!important;margin-left:180px!important;margin-top:-20px!important;align-self:flex-start;text-align:left;position:relative;z-index:2}
/* 0.50.2 사이트 언어·연령 딱지(.n_work_option 안 span: 한국어·전연령 등)도 우리 칩과 같은 높이·모양·글자 가운데로(높이 18px·모서리 2px로 어긋나 보이던 것) */
li.n_work_list_item dd.n_work_option{align-items:center;gap:5px}
li.n_work_list_item dd.n_work_option > span:not(:empty){display:inline-flex!important;align-items:center;justify-content:center;box-sizing:border-box;height:calc(var(--dlz,1)*20px);margin:0!important;padding:1px 6px 0!important;border-radius:5px!important;font-family:system-ui,sans-serif;font-weight:800!important;font-size:calc(var(--dlz,1)*10px)!important;line-height:1!important}
li._cart_item dd.cart_item_foot,li._cart_items dd.cart_item_foot{white-space:nowrap}
.dlrow .dlty{flex:none;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:calc(var(--dlz,1)*20px);border-radius:5px;padding:1px 6px 0;font-family:system-ui,sans-serif;font-weight:800;font-size:calc(var(--dlz,1)*10px);line-height:1;white-space:nowrap}
.dlch{display:flex!important;flex-wrap:wrap;align-items:center;gap:5px;margin-top:6px!important;margin-bottom:0!important;padding:0 0 0 2px!important;list-style:none} /* 좌우 여백은 사이트 값 그대로(장바구니 dd는 margin-left 93px로 사진 옆에 맞춰져 있음) */
.dlch .dlcpn,.dlrow .dlcpn,dd.n_work_option .dlcpn{flex:none;display:inline-flex;align-items:center;justify-content:center;height:calc(var(--dlz,1)*20px);padding:1px 7px 0;border-radius:5px;background:#2a63ad;color:#fff;font-family:system-ui,sans-serif;font-weight:800;font-size:calc(var(--dlz,1)*9.5px);line-height:1;white-space:nowrap}
.dlch .dlcpn.bk,.dlrow .dlcpn.bk,dd.n_work_option .dlcpn.bk{background:#6b49b3}
dd.n_work_option{flex-wrap:wrap}
/* 0.51.2 '나중에 산다·카트로' 링크는 배경 없이 글자만(사용자) */
li._cart_item dd.cart_item_foot a,li._cart_items dd.cart_item_foot a{background:none!important;box-shadow:none!important;border:0!important}
.dldue{display:inline-flex;align-items:center;justify-content:center;align-self:center;height:calc(var(--dlz,1)*20px);margin:0;padding:0 6px;border-radius:5px;font-family:system-ui,sans-serif;font-weight:800;font-size:calc(var(--dlz,1)*11px);line-height:1;white-space:nowrap}
.dldue.hot{background:#fff;color:#dc2a30;box-shadow:inset 0 0 0 1.5px #dc2a30}.dldue.mid{background:#fff3e0;color:#b4690e}.dldue.low{background:#eee;color:#666}
html.dlwish .work_bottom .work_labels{display:none!important}
.dlx .dlnm.ok{color:#7be08a}
#dlsheet .li.mv{background:#f6e5eb;outline:2px solid #d76088;outline-offset:-2px}
/* 0.46.0 카드 맨 아래 ♥·장바구니 줄: 버튼을 카드 폭 절반(약 141px)에서 52px 고정으로 줄이고 가운데 모음.
   아이콘 22→17px, 줄 높이 36→28px, 위아래 여백 8→5px. 카드가 2열이라 절반씩 쓰면 아이콘에 비해 배경만 컸다.
   누르는 크기는 52×28px로 WCAG 2.2 AA(최소 24×24)를 넘는다. 시안 guide/ui-0.46-카드아이콘.png B안. */
.dlact{display:flex!important;gap:7px;margin:8px 4px 4px!important;padding:0!important}
.dlact button{flex:none;height:34px;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:12px;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dlact .dlfav{width:74px;background:#fff;box-shadow:inset 0 0 0 1px #666}
.dlact .dlfav:only-child{flex:1;width:auto}
.dlact .dlfav svg{width:18px;height:18px;fill:none;stroke:#555;stroke-width:70}
.dlact .dlfav.on{background:#fde4ec;box-shadow:none}
.dlact .dlfav.on svg{fill:#d76088;stroke:#d76088}
.dlact .dlfav.err svg{stroke:#e5322d}
.dlact .dlfav[disabled]{opacity:.5}
.dlact .dlcart{flex:1;background:#fad23a;color:#111;font:800 12px/1 system-ui,sans-serif}
.dlhas .item_btn_box{display:none!important}
svg.ln{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#dlbar .x svg,#dlh .x svg{width:16px;height:16px}
#dlbar .rs svg{width:20px;height:20px}
#dlh .x.gr svg,#dlh .del svg,#dlh .grip svg,#dlh .bdg svg{width:20px;height:20px}
#dlh .bdg svg{width:18px;height:18px}
#dlh .tgc svg,#dlh .op svg,#dlh .li svg,#dlh .gh svg{width:14px;height:14px;vertical-align:-2px;margin-right:2px}
#dlh .bl svg{width:16px;height:16px;fill:currentColor;vertical-align:-3px;margin-right:2px}
#dlh .svb svg{width:22px;height:22px}
#dlh .tile .ti svg{width:22px;height:22px}
#dlsheet .st svg{width:22px;height:22px}
#dlsheet .st.on svg{fill:#f5a400;stroke:#f5a400}
li.n_work_list_item .item_btn_box,li.n_work_list_item .n_sale_state{display:none!important}
li.n_work_list_item dt.n_work_thumb{margin-bottom:2px!important}
/* 0.46.3 PC 목록 카드(li.search_result_img_box_inner)는 사이트가 '카트에 추가'·'즐겨찾기에 추가'를 ul.work_operation_btn으로 그린다.
   우리 ♥·장바구니 줄(.dlact)이 붙은 카드에서는 그것을 숨긴다(전엔 폰 카드 .item_btn_box만 숨겨서 PC는 두 줄이 겹쳐 보였다).
   숨겨도 사이트 링크(a.btn_cart)는 그대로 있어서 우리 장바구니 버튼이 click()으로 누를 수 있다. */
.dlhas .work_operation_btn{display:none!important}
/* 0.46.2 썸네일 흐리게(설정 blurThumb). 목록·장바구니 사진과, 작품 화면의 표지(_img_main)에만 건다.
   작품 화면의 샘플 사진(_img_smp1~)은 일부러 안 건다(사용자: "뒤에 나오는 이미지들 말고").
   품번·딱지 같은 우리 글자는 사진이 아니라서 안 걸리고, filter는 자리(레이아웃)를 안 바꿔 카드 위 겹침 위치 계산도 그대로다. */
html.dlh-blur .n_work_thumb img,html.dlh-blur .work_thumb img,html.dlh-blur img[src*="_img_main"],html.dlh-blur img[srcset*="_img_main"]{filter:blur(12px)}
html.dlh-blur #work_visual img[src*="_img_main"],html.dlh-blur #work_left img[src*="_img_main"]{filter:blur(20px)}
.dlch{min-height:calc(var(--dlz,1)*20px)}
.n_work_price_wrap>.dlsl{margin:0 6px 0 0;min-width:calc(var(--dlz,1)*50px)}
li.n_work_list_item .n_work_price_wrap{display:flex!important;align-items:center;flex-wrap:wrap}
li.dlgrid .strike,li.dlgrid .work_price_original{display:none!important}
li.dlgrid.n_work_list_item .operations .btn{width:28px!important;height:28px!important}
.n_work_price_wrap .overseas_discount_label{display:inline-flex;margin:0 6px 0 0}
.n_work_price_wrap .overseas_discount_label .icon_campaign{display:inline-flex;align-items:center;justify-content:center;height:calc(var(--dlz,1)*20px);min-width:calc(var(--dlz,1)*50px);padding:0 6px;border-radius:5px;background:#dc2a30!important;color:#fff!important;font-family:system-ui,sans-serif!important;font-weight:800!important;font-size:calc(var(--dlz,1)*12px)!important;line-height:1!important;white-space:nowrap}
.dlsl{display:inline-flex;align-items:center;justify-content:center;align-self:center;height:calc(var(--dlz,1)*20px);margin:4px 0 0 6px;padding:0 6px;border-radius:5px;background:#dc2a30;color:#fff;font-family:system-ui,sans-serif;font-weight:800;font-size:calc(var(--dlz,1)*12px);line-height:1;white-space:nowrap} /* 0.49.0 할인율은 크게(가장 눈에 띄게) */
.dlx .dlbd{position:absolute;left:0;right:0;bottom:0;pointer-events:none;display:flex;align-items:center;justify-content:space-between;gap:4px;height:24px;padding:0 6px;background:rgba(20,20,24,.72)}
.dlx .dlva{min-width:0;color:#fff;font-size:10px;font-weight:700;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:auto;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.dlx .dlva.ok{color:#7be08a}
.dlx .dlva i{font-style:normal;opacity:.7;margin-right:4px}
.dlx .dlw{visibility:visible!important;opacity:1!important;position:relative;flex:none;display:inline-flex;align-items:center;height:16px;margin:0 0 0 auto;padding:0 6px;border:0;border-radius:999px;background:#fff;color:#111;font-size:10px;font-weight:700;line-height:1;text-decoration:none;white-space:nowrap;pointer-events:auto;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.dlx .dlw::after{content:'';position:absolute;inset:-8px -8px}
.dlx>.dlw{position:absolute!important;top:6px;right:6px;margin:0!important;width:22px;height:22px;padding:0!important;justify-content:center;border-radius:50%!important;border:1.3px solid #222!important;background:#fff!important;font-size:6.5px!important;font-weight:900;box-shadow:0 1px 3px rgba(0,0,0,.25)}

.dlcp{position:absolute;left:4px;bottom:4px;z-index:5;display:flex;flex-wrap:wrap;gap:3px;pointer-events:none}
.dlcp b{display:inline-flex;align-items:center;height:16px;background:#e5322d;color:#fff;border-radius:999px;padding:0 6px;font:700 10px/1 system-ui,sans-serif;white-space:nowrap}
.dlcp b.c2{background:#f07800}.dlcp b.c1{background:#2f80d1}.dlcp b.c0{background:#888}


#dlsheet-back{position:fixed;inset:0;background:transparent;z-index:2147483001}
#dlsheet{position:fixed;left:10px;right:10px;z-index:2147483002;max-width:540px;margin:0 auto;padding:6px 0 10px;overflow:auto;background:var(--bg);color:var(--ink);border-radius:14px;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 8px 28px rgba(0,0,0,.18);font-size:14.5px;line-height:1.3}
#dlsheet[hidden],#dlsheet-back[hidden]{display:none}
#dlsheet .sec{display:flex;align-items:center;justify-content:space-between;padding:10px 16px 6px;font-size:12px;font-weight:700;color:var(--faint)}
#dlsheet .chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px}
#dlsheet .chip{display:inline-flex;align-items:center;justify-content:center;height:32px;max-width:100%;padding:0 12px;border:0;border-radius:8px;background:#f0eeef;color:#3c3f46;font-size:13.5px;font-weight:600;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none}
#dlsheet .chip.sv{background:#fff3e0;color:#b45309}
#dlsheet .li.tr{padding:0 6px 0 0}
#dlsheet .tb{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:48px;justify-content:center;padding:6px 16px;border:0;background:none;color:var(--ink);text-align:left}
#dlsheet .st{flex:none;width:44px;height:44px;border:0;background:none;color:#b0b3ba;font-size:20px}
#dlsheet .st.on{color:#f5a400}
#dlsheet .li.all>svg{fill:var(--faint)}
#dlsheet .sin{display:flex;align-items:center;gap:8px;height:46px;margin:4px 12px;padding:0 12px;border:1.5px solid #c4c6cc;border-radius:10px}
#dlsheet .sin:focus-within{border-color:#d76088}
#dlsheet .sin>svg{flex:none;width:20px;height:20px;fill:var(--faint)}
#dlsheet .tin{flex:1;min-width:0;height:100%;padding:0;border:0;background:none;color:var(--ink);font:inherit;font-size:16px;outline:0}
#dlsheet .li{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:6px 16px;border:0;background:none;color:var(--ink);text-align:left;line-height:1.25}
#dlsheet .li>svg{flex:none;width:20px;height:20px;fill:#d76088}
#dlsheet .li.on .pt{color:#d76088;font-weight:700}
#dlsheet .pr{flex:none;display:flex;align-items:center;justify-content:center;min-width:52px;height:30px;padding:0 6px;border-radius:7px;color:#fff;font-size:14px;font-weight:800;line-height:1}
#dlsheet .pr.c3{background:#e5322d}#dlsheet .pr.c2{background:#f07800}#dlsheet .pr.c1{background:#2f80d1}#dlsheet .pr.c0{background:#f0eeef;color:#3c3f46;font-size:12px}
#dlsheet .pb{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
#dlsheet .pt{font-size:14.5px;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#dlsheet .ps{font-size:12px;color:var(--faint)}

#dlh{position:fixed;left:0;right:0;bottom:calc(20px + var(--dlnav,0px) + env(safe-area-inset-bottom,0px));transition:bottom .15s;z-index:2147483000;display:flex;justify-content:center;gap:10px;pointer-events:none;font-size:14px;line-height:1.45;color:var(--ink)}
#dlh[hidden]{display:none}
#dlh .fab,#dlh .fb{pointer-events:auto;display:flex;align-items:center;gap:8px;height:52px;margin:0;border-radius:26px;font-size:15px;font-weight:600;line-height:1;outline:0;box-shadow:0 4px 14px rgba(0,0,0,.28);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
#dlh .fab{padding:0 5px;gap:0;border:0;background:#fff;color:#8a8a90;font-size:14px}
#dlh .fab span{display:flex;align-items:center;justify-content:center;height:40px;padding:0 14px;border-radius:20px}
#dlh .fab .on{background:#f6e5eb;color:#d76088;font-weight:700}
#dlh .fab .gp{display:none!important}
#dlh .fb{padding:0 20px;border:0;background:#fff;color:var(--ink)}
#dlh .fb[hidden]{display:none}
#dlh .fb.ap{background:#d76088}
#dlh .fb svg{width:20px;height:20px;fill:currentColor}
#dlh .fb b{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:11px;background:#d76088;color:#fff;font-size:13px}
#dlh .fb.ap b{background:#fff;color:#d76088}
#dlh .fb.px{width:52px;padding:0;justify-content:center}
#dlh .fb.px svg{fill:none;stroke:currentColor}
.dlpk{position:absolute;left:6px;top:50%;margin-top:-13px;z-index:5;width:26px;height:26px;border-radius:8px;border:2px solid #c8c8cc;background:#fff;pointer-events:none}
.dlpk.on{background:#d76088;border-color:#d76088}
.dlpk.on::after{content:'';position:absolute;left:7px;top:3px;width:7px;height:12px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
html.dlwish .sort_folder,html.dlwish dl.sort_type_only,html.dlwish form:has(input.narrowing){display:none!important}
li.dlpk-on,li.dlpk-off{position:relative!important;padding-left:40px!important}
li.dlpk-off>*:not(.dlpk){opacity:.45}
#dlh .bk{position:fixed;inset:0;z-index:2;background:rgba(12,14,20,.45);opacity:0;pointer-events:none;transition:opacity .25s}
#dlh.open .bk{opacity:1;pointer-events:auto}
#dlh .pnl{position:fixed;left:0;right:0;bottom:0;z-index:3;display:flex;flex-direction:column;max-width:560px;max-height:90vh;margin:0 auto;background:#fff;border-radius:22px 22px 0 0;box-shadow:0 -8px 28px rgba(0,0,0,.2);transform:translateY(100%);visibility:hidden;transition:transform .28s cubic-bezier(.2,.8,.2,1),visibility 0s .28s;pointer-events:auto}
#dlh.open .pnl{transform:none;visibility:visible;transition:transform .28s cubic-bezier(.2,.8,.2,1)}
#dlh .grab{flex:none;width:40px;height:4px;margin:8px auto 0;border-radius:999px;background:#c9cedb}
#dlh .hd{flex:none;display:flex;align-items:center;justify-content:space-between;min-height:48px;padding:2px 6px 2px 16px}
#dlh .hd h2{display:flex;align-items:center;margin:0;font-size:17px;font-weight:800;color:var(--ink)}
#dlh .x{width:40px;height:40px;border:0;border-radius:50%;background:none;color:#333;font-size:18px}
#dlh .x.gr{font-size:20px}
#dlh .x.bkb{width:32px;margin-left:-10px;font-size:24px;line-height:1}
#dlh .bd{flex:1;min-height:0;overflow:auto;padding:0 16px calc(14px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}
#dlh .bd.gray{background:#f6f7fb;padding-top:8px}
#dlh .gt{margin:14px 4px 6px;font-size:13px;font-weight:800;color:var(--ink)}
#dlh .bd>.gt:first-child{margin-top:4px}
#dlh .grp{background:#fff;border-radius:12px;padding:0 12px}
#dlh .bd:not(.gray) .grp{background:#f6f7fb;margin-top:8px}
#dlh .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
#dlh .tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0;height:64px;padding:0 4px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);font-size:12px;text-decoration:none}
#dlh .tile .ti{font-size:20px;line-height:1}
#dlh .tile .tn{max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#dlh .evl{max-height:34vh;overflow:auto;-webkit-overflow-scrolling:touch}
#dlh a.ev{display:block;padding:10px 0;border-bottom:1px solid #f0eeef;color:var(--ink);text-decoration:none;font-size:13.5px;line-height:1.4}
#dlh a.ev:last-child{border-bottom:0}
#dlh .ev .rts{display:inline}
#dlh .ev .rt{display:inline-block;margin-right:5px;padding:1px 6px;border-radius:4px;background:#d93a2f;color:#fff;font-size:11.5px;font-weight:700;vertical-align:1px}
#dlh .ev .et{display:inline}
#dlh .ev .et i{display:block;margin-top:2px;font-style:normal;font-size:11.5px;color:var(--sub)}
#dlh .mut{color:var(--faint);font-size:13px;padding:14px 0;text-align:center}
#dlh button.tg{width:100%;margin:0;border-radius:0;background:none;font:inherit;text-align:left;cursor:pointer}
#dlh .tg{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:0;border:0;border-bottom:1px solid #f0eeef;font-size:14px;color:var(--ink)}
#dlh .grp>.tg:last-child{border-bottom:0}
#dlh .tg .tl{flex:1;min-width:0;display:flex;align-items:center;gap:8px}
#dlh .bdg{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#f6e5eb;color:#d76088;font-size:14px}
#dlh .chv{color:var(--faint);font-size:20px}
#dlh .sw{position:relative;display:block;flex:none;width:42px;height:24px;border-radius:999px;background:#c9cedb;transition:background .15s}
#dlh .sw.y{background:#d76088}
#dlh .kn{position:absolute;top:2px;left:2px;display:block;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .15s}
#dlh .sw.y .kn{transform:translateX(18px)}
#dlh .seg{display:inline-flex;padding:3px;border-radius:10px;background:#f0eeef}
#dlh .seg button{min-height:32px;padding:0 12px;border:0;border-radius:8px;background:none;color:var(--sub);font-size:13px;font-weight:600}
#dlh .seg button.o{background:#d76088;color:#fff}
#dlh .fld{width:100%;height:42px;padding:0 12px;border:1px solid #c9cedb;border-radius:10px;background:#fff;color:var(--ink);font:inherit;font-size:16px}
#dlh .addr{display:flex;gap:8px;margin-top:10px}
#dlh .addb{flex:none;width:64px;height:42px;border:0;border-radius:10px;background:#d76088;color:#fff;font-weight:700}
#dlh .del{flex:none;width:40px;height:40px;border:0;background:none;color:var(--sub);font-size:15px}
#dlh .grip{flex:none;display:flex;align-items:center;justify-content:center;width:36px;height:40px;color:var(--faint);font-size:20px;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}
#dlh .sr.drag{opacity:.6}
#dlh .pri{width:100%;min-height:46px;margin-top:12px;border:0;border-radius:12px;background:#d76088;color:#fff;font-weight:700;font-size:14px}
#dlh .frm{display:flex;flex-direction:column;gap:10px;padding:12px}
#dlh .lnk{align-self:flex-end;border:0;background:none;color:#d76088;font-size:13px;font-weight:600}
#dlh .flt{padding:0}
#dlh .pad{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px}
#dlh .op{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink);font-size:13.5px;font-weight:600}
#dlh .op.on{border:1.5px solid #d76088;background:#f6e5eb;color:#d76088}
/* 0.46.0 필터 창 압축 배치: 띠 대신 왼쪽 라벨 줄(.lr) + 표(.mx).
   2026-11-06 시안 '더 압축'(guide/ui-0.46-필터창개선.html) 반영. 띠 4개(약 26px씩)와 위아래 여백이 사라져 세로 약 190px 줄어든다. */
#dlh .lr{display:flex;align-items:center;gap:6px;padding:3px 13px}
#dlh .dis{opacity:.35;pointer-events:none;filter:grayscale(1)}
#dlh .lr>.lb{flex:none;width:30px;font-size:10.5px;font-weight:800;color:var(--faint);letter-spacing:-.3px}
#dlh .lr>.vs{flex:1;min-width:0;display:flex;flex-wrap:wrap;gap:4px}
#dlh .vs.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
#dlh .vs.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
#dlh .lr .op{height:32px;padding:0 6px;font-size:12px;border-radius:7px}
#dlh .mxw{padding:2px 9px 0}
#dlh .mx{width:100%;border-collapse:separate;border-spacing:4px}
#dlh .mx th{font-size:10.5px;font-weight:700;color:var(--sub);padding:1px 0;text-align:center;letter-spacing:-.3px}
#dlh .mx th.cor{width:30px}
#dlh .mx th.rh{text-align:left;font-size:12px;color:var(--ink);padding-left:0;width:30px}
#dlh .mx .cc{width:100%;height:33px;padding:0;border:1px solid var(--line);border-radius:7px;background:#fff;color:#d8dade;font-size:13px;font-weight:700}
#dlh .mx .cc.on{border:1.5px solid #d76088;background:#f6e5eb;color:#d76088}
#dlh .mx .cc.al{background:#fbf1f5;border-color:#f3d9e3}
#dlh .mx th.rh.on{color:#d76088}
#dlh .mx .cc:disabled{background:#fbfbfc;border-color:#f0f0f2;border-style:dashed;color:#e6e8eb}
#dlh .fx{height:1px;background:#f0eef0;margin:6px 12px}
#dlh .bl{border:0;background:none;color:#d76088;font-size:13px;font-weight:700}
#dlh .gg{border-bottom:1px solid var(--line)}
#dlh .gh{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:46px;padding:0 16px;border:0;background:none;color:var(--ink);font-size:14px;font-weight:700;text-align:left}
#dlh .gh em{margin-left:6px;padding:1px 8px;border-radius:9px;background:#f6e5eb;color:#d76088;font-size:12px;font-style:normal}
#dlh .gh .chv{color:var(--faint);font-size:13px}
/* 0.47.0 태그 찾기 버튼: 분류 접기 줄(.gh)과 같은 모양이되 왼쪽 정렬로 '찾기' 느낌을 준다 */
#dlh .gh.find{justify-content:flex-start;gap:6px;color:#d76088;border-bottom:1px solid var(--line)}
#dlh .gh.find svg{width:16px;height:16px;vertical-align:0}
/* 0.51.0 필터 맨 위 태그 찾기 줄: 오른쪽 › 를 밀어내고, 아래 칸과 구분선 */
#dlh .gh.find.top{margin:4px 0 6px;padding:0 13px;min-height:44px;border:1.5px solid var(--line);border-radius:12px;background:#fff}
#dlh .gh.find.top .chv{margin-left:auto;font-size:18px}
#dlh .vs.srt{grid-template-columns:repeat(4,1fr)}
#dlh .gb{padding-top:2px}
#dlh .tgc{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
#dlh .ft{flex:none;display:flex;gap:8px;padding:10px 16px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line)}
#dlh .ft button{height:46px;border:0;border-radius:12px;font-weight:700;font-size:14px}
#dlh .ft .svb{width:52px;background:#f6e5eb;font-size:18px}
#dlh .ft .rsb{flex:1;background:#f0eeef;color:var(--ink)}
#dlh .ft .gob{flex:2;background:#d76088;color:#fff}
#dlh .gl .li{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;width:100%;min-height:46px;padding:6px 4px;border:0;border-bottom:1px solid #f0eeef;background:none;color:var(--ink);text-align:left}
#dlh .gl .li.on .pt{color:#d76088;font-weight:700}
#dlh .gl .ps{font-size:12px;color:var(--faint)}
#dlh .bd>.fld{margin-top:4px}

#dlsale{display:flex;align-items:flex-start;gap:8px;overflow-x:auto;width:100%;box-sizing:border-box;padding:8px 12px;margin:0;scrollbar-width:none;-webkit-overflow-scrolling:touch}
#dlsale::-webkit-scrollbar{display:none}
#dlsale a{flex:none;width:min(78vw,300px);display:block}
#dlsale img{width:100%!important;height:auto!important;max-width:none!important;display:block;border-radius:10px}
/* 0.52.0 DLW 품번 팝업(꾹), 작품 페이지 DLW(제목 상자 오른쪽 위), 장바구니 칩 줄 아래 여백 */
#dlwp{position:fixed;z-index:2147483002;display:flex;align-items:center;gap:8px;padding:6px 6px 6px 12px;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.22);font:700 13px/1 system-ui,sans-serif;color:#222}
#dlwp .dlwb{height:28px;padding:0 12px;border:0;border-radius:7px;background:#d76088;color:#fff;font:700 12px/1 system-ui,sans-serif}
#dlwp .dlwb.ok{background:#2e7d32}
.c-productTitleBox{position:relative;padding-right:40px!important;box-sizing:border-box}
.dlw.dlwk{position:absolute;top:8px;right:8px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1.3px solid #222;border-radius:50%;background:#fff;color:#111;font:900 7px/1 system-ui,sans-serif;text-decoration:none;z-index:2}
li._cart_item .dlch,li._cart_items .dlch{margin-bottom:8px!important}
/* 0.53.0 번역 허가 목록 줄·번역 ○/✕ 딱지·이름 꾹 메뉴·메뉴 글씨 얇게(글씨 400~500, 색은 켜진 것만 분홍) */
#dltr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px;font-family:Pretendard,system-ui,sans-serif}
#dltr button{height:32px;padding:0 13px;border:0;border-radius:16px;background:#f0eeef;color:#555;font:500 13px/1 Pretendard,system-ui,sans-serif;cursor:pointer}
#dltr button.on{background:#f6e5eb;color:#d76088}
#dltr .sp{flex:1 1 auto}
/* 0.54.0 라이브러리 ♡·태그·메모: 칩 줄은 번역 허가 줄과 같은 모양, ♡는 카드 오른쪽 아래, 메모 점은 왼쪽 아래 */
#dllib{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0;font-family:Pretendard,system-ui,sans-serif}
#dllib button{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:32px;padding:0 13px;border:0;border-radius:16px;background:#f0eeef;color:#555;font:500 13px/1 Pretendard,system-ui,sans-serif;cursor:pointer}
#dllib button.on{background:#f6e5eb;color:#d76088}
#dllib button svg{width:16px;height:16px}
#dllib small{font-size:11px;font-weight:400;opacity:.7}
#dllib .sp{flex:1 1 auto}
.dllb{position:relative;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
.dllb.dllx{display:none!important}
.dllb .dllh{position:absolute;right:6px;bottom:6px;z-index:5;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.88);color:#777;box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:pointer}
.dllb .dllh svg{width:17px;height:17px}
.dllb .dllh.on{color:#d76088}.dllb .dllh.on svg{fill:#d76088}
.dllb.dlmo::after{content:'';position:absolute;left:8px;bottom:8px;z-index:5;width:8px;height:8px;border-radius:50%;background:#d76088;box-shadow:0 0 0 2px rgba(255,255,255,.9);pointer-events:none}
#dllsh{position:fixed;inset:0;z-index:2147483003;font:400 14px/1.3 Pretendard,system-ui,sans-serif;color:#222}
#dllsh .bk{position:absolute;inset:0;background:rgba(0,0,0,.28)}
#dllsh .bx{position:absolute;left:0;right:0;bottom:0;max-width:560px;margin:0 auto;padding:14px 16px 18px;border-radius:20px 20px 0 0;background:#fff;box-shadow:0 -8px 28px rgba(0,0,0,.2)}
#dllsh .h{margin-bottom:10px;font-size:12px;font-weight:500;color:#8a8a8a}
#dllsh .cs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
#dllsh .cs button{height:32px;padding:0 13px;border:0;border-radius:16px;background:#f0eeef;color:#555;font:500 13px/1 Pretendard,system-ui,sans-serif;cursor:pointer}
#dllsh .cs button.on{background:#f6e5eb;color:#d76088}
#dllsh .in{display:block;width:100%;height:38px;margin-bottom:8px;padding:0 12px;border:1px solid #ddd;border-radius:10px;font:400 14px/1 Pretendard,system-ui,sans-serif;box-sizing:border-box}
#dllsh .ft{display:flex;gap:8px}
#dllsh .ft button{flex:1;height:40px;border:0;border-radius:10px;background:#f7f4f5;color:#666;font:500 14px/1 Pretendard,system-ui,sans-serif;cursor:pointer}
#dllsh .ft button.ok{background:#d76088;color:#fff}
.dlrow .dltg{flex:none;font-size:10px;font-weight:500;color:#9a9aa0;white-space:nowrap}
.dlrow .dltg.y{color:#4a8a5c}.dlrow .dltg.n{color:#b05050}
.dlwt{margin:6px 0 0;font:500 12px/1.4 Pretendard,system-ui,sans-serif;color:#9a9aa0}.dlwt.y{color:#4a8a5c}.dlwt.n{color:#b05050}
#dlnmm{position:fixed;z-index:2147483003;min-width:168px;padding:6px;border-radius:12px;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.28);font:400 14px/1.3 Pretendard,system-ui,sans-serif;color:#222}
#dlnmm .h{padding:6px 10px 8px;margin-bottom:4px;border-bottom:1px solid #f0eeef;font-weight:500;font-size:13px;color:#555}
#dlnmm .h small{margin-left:6px;padding:1px 6px;border-radius:4px;background:#f6e5eb;color:#d76088;font-size:10px}
#dlnmm button{display:block;width:100%;height:40px;padding:0 10px;border:0;border-radius:8px;background:none;text-align:left;font:inherit;cursor:pointer}
#dlnmm button:active{background:#f6e5eb}
#dlh .tg.light .tl{font-weight:400;color:#777}
#dlh .tile .tn,#dlh .gt{font-weight:500}
/* 0.51.1 작품 페이지 리뷰 먼저(설정 reviewFirst): 사이트 Vue 노드는 옮기지 않고 줄 순서(order)만 바꾼다 */
html.dlh-rv div:has(> #work_review){display:flex;flex-direction:column}
html.dlh-rv div:has(> #work_review) > *{order:1}
html.dlh-rv div:has(> #work_review) > :is(.c-keyVisual,.c-productTitleBox,.c-purchaseBox,.work_other_box,#work_review){order:0}
`;

  function buildPanel() {
    const root = el('div', { id: 'dlh' });
    // 0.51.0 사이트 아래 고정 메뉴(.global_fixed_nav)가 스크롤하면 올라와 알약을 덮어서, 그 높이만큼 알약을 올린다.
    const liftNav = () => {
      // 아래 고정 줄: 사이트 메뉴, 장바구니 아래 구매 줄(.work_cart_column_container, 73px), 작품 페이지 구매 줄(.c-purchaseBottomBar, 58px) — 2026-11-18 실제 폰 크기 확인
      let h = 0;
      for (const n of document.querySelectorAll('.global_fixed_nav, .work_cart_column_container, .c-purchaseBottomBar')) {
        const r = n.getBoundingClientRect();
        if (r.height > 0 && r.top < innerHeight && r.top > innerHeight / 2) h = Math.max(h, Math.round(innerHeight - r.top));
      }
      root.style.setProperty('--dlnav', h + 'px');
    };
    addEventListener('scroll', liftNav, { passive: true }); addEventListener('resize', liftNav); setInterval(liftNav, 700);
    const reload = () => location.reload();
    const applyLang = () => { locale.clearReloadGuards(); locale.write(locale.wantFor(location.pathname)); reload(); };
    const swi = (on) => el('span', { class: 'sw' + (on ? ' y' : ''), 'aria-hidden': 'true' }, el('span', { class: 'kn' }));
    const chk = (key, text, after) => {
      const b = el('button', { class: 'tg', role: 'switch', 'aria-checked': String(!!opt(key)) }, el('span', { class: 'tl' }, text), swi(!!opt(key)));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = !opt(key);
        store.set(key, on);
        b.setAttribute('aria-checked', String(on));
        b.lastChild.classList.toggle('y', on);
        if (after === reload || after === applyLang) setTimeout(after, 250); else after();
      });
      return b;
    };
    const evBox = el('div', { class: 'evl' });
    let evLoaded = false;
    let openedAt = 0;
    const ensureEv = () => { if (!evLoaded) { evLoaded = true; loadEvents(evBox); } };
    // 아래 알약: 짧게 = 한/일 전환, 꾹 = 메뉴. 끌어서 옮기기는 없다(0.41.0: 사용자가 위치 고정을 원함). 스크롤해도 숨지 않고 고정(0.42.1)
    const ja = () => opt('locale') === 'ja_JP';
    const fab = el('button', { class: 'fab', 'aria-label': '탭: 한/일 전환 · 꾹: 메뉴' });
    const paintFab = () => fab.replaceChildren(el('span', { class: ja() ? 'on' : '' }, '日本語'), el('span', { class: 'gp' }, '/'), el('span', { class: ja() ? '' : 'on' }, '한국어'));
    const toggleLang = () => {
      const now = opt('locale');
      if (now === 'ja_JP') store.set('locale', store.get('locale.prev', 'ko_KR') || 'ko_KR');
      else { store.set('locale.prev', now); store.set('locale', 'ja_JP'); }
      applyLang();
    };
    pressable(fab, toggleLang, () => setOpen(true, 'menu'), null, FAB_LONG_MS);
    paintFab();
    // 필터 N / 적용: 목록 화면이면 늘 보인다(list.syncFab). 적용 대기 중이면 적용, 아니면 우리 필터 창
    // 0.48.0: 꾹 누르면 정렬 창(바의 정렬 칩을 누른 것과 같음). 정렬이 안 되는 화면(흐린 칩)은 아무것도 안 한다
    const fb = el('button', { class: 'fb', id: 'dlfb', hidden: '', 'aria-label': '탭: 필터 · 꾹: 정렬' });
    pressable(fb, () => { if (route.isCart(location.pathname)) cart.pickTap(); else if (list.staged) list.onApply(); else setOpen(true, 'filter'); }, () => {
      const sc = document.querySelector('#dlbar .c[data-k="sort"]');
      if (sc && !sc.disabled) sc.click();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('open')) setOpen(false); }); // 패널 밖에 포커스가 있어도 닫히게

    // 바로가기: 저장은 예전 그대로 'shortcuts.custom'에 '이모지 이름|주소' 줄들(비면 기본). 이름 앞 이모지가 칸 아이콘
    const defaultLines = () => ''; // 0.43.0: 기본 바로가기는 없다(직접 등록)
    const parseShortcuts = (txt) => {
      const out = [];
      for (const line of String(txt || '').split('\n')) {
        const k = line.lastIndexOf('|');
        if (k < 1) continue;
        const label = line.slice(0, k).trim();
        let u;
        try { u = new URL(line.slice(k + 1).trim(), 'https://www.dlsite.com'); } catch (e) { continue; }
        if (label && /^https?:$/.test(u.protocol)) out.push([label, u.href]);
      }
      return out;
    };
    const curShortcuts = () => {
      const c = parseShortcuts(store.get('shortcuts.custom', ''));
      return c;
    };
    const saveShortcuts = (arr) => { const v = arr.map(([l, u]) => `${l}|${u}`).join('\n'); store.set('shortcuts.custom', v === defaultLines() ? '' : v); };
    const splitIcon = (label) => { const m = label.match(/^(\S+)\s+(.+)$/); return m && !/[\p{L}\p{N}]/u.test(m[1]) ? [m[1], m[2]] : ['', label]; };

    // 차단: 이름 목록은 예전 그대로 'block.list'(한 줄에 하나, 숨기는 규칙도 그대로). 칸 나눔(서클·성우·작가)만 'block.kind'에 따로. 종류를 모르는 예전 이름은 서클 칸
    const KINDS = ['서클', '성우', '작가'];
    // 0.53.0 바깥(이름 꾹 메뉴 등)에서 바로가기에 줄 하나 더하기. 같은 주소가 이미 있으면 안 더한다
    panelApi = { addShortcut: (label, url) => { const all = curShortcuts(); if (all.some((x) => x[1] === url)) return false; all.push([label, url]); saveShortcuts(all); return true; } };
    const blNames = () => String(store.get('block.list', '')).split('\n').map((x) => x.trim()).filter(Boolean);
    const blKinds = () => { const v = store.get('block.kind', {}); return v && typeof v === 'object' ? v : {}; };
    const blSave = (names, kinds) => { store.set('block.list', names.join('\n')); store.set('block.kind', kinds); blockSet.cache = null; list.apply(); };

    const pnl = el('div', { class: 'pnl', id: 'dlh-pnl', role: 'dialog', 'aria-modal': 'true', 'aria-label': '메뉴' });
    let view = 'menu', blTab = KINDS[0], fsel = null, fspec = null, draft = { n: '', u: '', b: '' };
    const go = (v) => { view = v; render(); };
    const close = el('button', { class: 'x', 'aria-label': '닫기', onclick: () => setOpen(false) }, icon('x'));
    const head = (title, backTo, right) => el('div', { class: 'hd' },
      el('h2', {}, backTo ? el('button', { class: 'x bkb', 'aria-label': '뒤로', onclick: () => go(backTo) }, '‹') : null, title), right || close);
    const gt = (t) => el('div', { class: 'gt' }, t);
    const grp = (...kids) => el('div', { class: 'grp' }, ...kids);
    const navRow = (ic, t, v) => el('button', { class: 'tg nv', onclick: () => go(v) }, el('span', { class: 'tl' }, el('span', { class: 'bdg' }, ic), t), el('span', { class: 'chv' }, '›'));
    const opt2 = (t, on, onclick) => el('button', { class: 'op' + (on ? ' on' : ''), 'aria-pressed': String(!!on), onclick }, on ? icon('ok') : null, t);
    const FAV_GROUP = '자주 쓰는 태그';
    const tagName = (n) => { const t = kw.list().find((x) => x[0] === n); return t ? t[1] : n; };

    // 태그 칩: 짧게 = 고르기·빼기, 0.5초 꾹 = 자주 쓰는 태그(★) 넣기·빼기. 꾹 누른 뒤 손을 뗄 때 따라오는 '누름'은 무시한다 (0.51.0 태그 창(views.genre)에서 쓰려고 views 밖으로 옮김)
    const tagChip = (n, byId, favIds) => {
      const s = fsel, t = byId.get(n);
      if (!t) return null;
      const on = s.genres.includes(n), fav = favIds.includes(n);
      const b = el('button', { class: 'op tgc' + (on ? ' on' : ''), 'aria-pressed': String(on), title: t[2] }, fav ? icon('st') : null, on ? icon('ok') : null, t[1]);
      let timer = 0, held = false, x0 = 0, y0 = 0;
      const stop = () => { clearTimeout(timer); timer = 0; };
      b.addEventListener('pointerdown', (e) => {
        held = false; x0 = e.clientX; y0 = e.clientY; stop();
        timer = setTimeout(() => { timer = 0; held = true; tags.toggleFav(n); try { navigator.vibrate && navigator.vibrate(20); } catch (err) { /* 진동 안 됨 */ } render(); }, 500);
      });
      b.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) stop(); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stop);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      b.addEventListener('click', () => { if (held) { held = false; return; } s.genres = on ? s.genres.filter((x) => x !== n) : [...s.genres, n]; render(); });
      return b;
    };
    // 0.53.0 차단 입력줄(종류 칸 + 이름 + 추가): 메뉴와 차단 화면이 같이 쓴다. 종류는 칸으로 먼저 고른다
    const blockForm = () => {
      const names = blNames(), kinds = blKinds();
      const inp = el('input', { class: 'fld', id: 'dlh-bl', placeholder: '이름', 'aria-label': '차단할 이름', value: draft.b });
      inp.addEventListener('input', () => { draft.b = inp.value; });
      const add = () => {
        const v = inp.value.trim();
        if (!v) return;
        if (!names.some((x) => normName(x) === normName(v))) names.push(v);
        kinds[v] = blTab;
        draft.b = '';
        blSave(names, kinds);
        render();
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
      return [el('div', { class: 'seg' }, ...KINDS.map((k) => el('button', { class: k === blTab ? 'o' : '', 'aria-pressed': String(k === blTab), onclick: () => { blTab = k; render(); } }, k))),
        el('div', { class: 'addr' }, inp, el('button', { class: 'addb', onclick: add }, '추가'))];
    };
    const saveHere = () => { // 지금 화면(필터·검색 조건이 든 주소)을 바로가기 한 칸으로 저장 = 내 기본값
      const h1 = document.querySelector('h1');
      const nm = ((h1 && h1.textContent) || decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '화면')).replace(/\s+/g, ' ').trim().slice(0, 14);
      panelApi.addShortcut('🔖 ' + nm, location.pathname + location.search); render();
    };
    const views = {
      menu: () => [head('메뉴', null, el('button', { class: 'x gr', 'aria-label': '설정', onclick: () => go('settings') }, icon('gear'))),
        el('div', { class: 'bd' }, gt('바로가기'),
          el('div', { class: 'tiles' }, ...curShortcuts().map(([label, url]) => { const [ic, nm] = splitIcon(label); return el('a', { class: 'tile', href: url }, el('span', { class: 'ti' }, ic || '🔗'), el('span', { class: 'tn' }, nm)); }),
            el('button', { class: 'tile', onclick: () => go('blocks') }, el('span', { class: 'ti' }, icon('ban')), el('span', { class: 'tn' }, '차단목록'))),
          curShortcuts().length ? null : el('div', { class: 'mut' }, '바로가기 없음 · ⚙ → 바로가기 편집에서 추가'),
          el('button', { class: 'tg nv light', onclick: saveHere }, el('span', { class: 'tl' }, '＋ 지금 화면(필터 조건)을 바로가기로 저장')),
          gt('빠른 차단'), ...blockForm(),
          gt('빠른 스위치'),
          grp(chk('blurThumb', '썸네일 흐리게', applyThumbBlur), chk('showPid', '품번 표시', () => list.apply()), chk('hideAI', 'AI 생성 작품 숨기기', () => list.apply()), chk('reviewFirst', '작품 화면: 리뷰 먼저(신착순)', reload)),
          gt('이벤트'), evBox)],
      settings: () => [head('설정', 'menu'),
        el('div', { class: 'bd gray' },
          grp(navRow(icon('ban'), '차단 목록', 'blocks'), navRow(icon('bm'), '바로가기 편집', 'shortcuts')),
          gt('이벤트 · 배너'),
          grp(chk('autoJa', '이벤트 페이지 일본어 자동', applyLang), chk('hideBanners', '할인 외 배너 숨기기', clean.resetBanners), chk('saleStrip', '일본 할인 배너 표시', reload), chk('hideCouponPop', '쿠폰 팝업 숨기기', reload)),
          gt('작품 표시'),
          grp(chk('showVA', '목록에 성우(CV) 표시', reload), chk('hideAI', 'AI 생성 작품 숨기기', () => list.apply()), chk('blurThumb', '썸네일 흐리게', applyThumbBlur), chk('showPid', '품번 표시', () => list.apply()), chk('onlyTlBl', 'TL/BL 층만 보이기', reload), chk('reviewFirst', '작품 화면: 리뷰 먼저(신착순)', reload),
            el('div', { class: 'tg' }, el('span', { class: 'tl' }, '할인 딱지 크기'), el('span', { class: 'seg' }, ...[['작게', 's'], ['보통', 'm'], ['크게', 'l']].map(([t, v]) =>
              el('button', { class: opt('chipSize') === v ? 'o' : '', 'aria-pressed': String(opt('chipSize') === v), onclick: () => { store.set('chipSize', v); applyChipSize(); render(); } }, t))))),
          gt('검색'),
          grp(chk('saleOnly', '할인중인 작품만 검색', reload), chk('koDefault', '한국어 작품만 (언어 안 정했을 때)', reload), chk('searchJa', '검색 결과는 일본어로', reload),
            el('div', { class: 'tg' }, el('span', { class: 'tl' }, '화면 언어'), el('span', { class: 'seg' }, ...[['한국어', false], ['日本語', true]].map(([t, j]) =>
              el('button', { class: ja() === j ? 'o' : '', 'aria-pressed': String(ja() === j), onclick: () => { if (ja() !== j) toggleLang(); } }, t))))))],
      blocks: () => {
        const names = blNames(), kinds = blKinds();
        const mine = names.filter((n) => (kinds[n] || KINDS[0]) === blTab);
        return [head('차단', 'settings'),
          el('div', { class: 'bd' },
            ...blockForm(),
            grp(...(mine.length ? mine.map((n) => el('div', { class: 'tg' }, el('span', { class: 'tl' }, n),
              el('button', { class: 'del', 'aria-label': n + ' 차단 해제', onclick: () => { const k2 = { ...kinds }; delete k2[n]; blSave(names.filter((x) => x !== n), k2); render(); } }, icon('x'))))
              : [el('div', { class: 'mut' }, `차단한 ${blTab} 없음`)])))];
      },
      shortcuts: () => {
        const arr = curShortcuts();
        // 0.45.0: 줄을 누르면 편집(이름·주소), ≡을 끌면 순서 바꾸기
        const lst = grp(...arr.map(([label, url], i) => { const [ic, nm] = splitIcon(label); return el('div', { class: 'tg sr', 'data-i': String(i), onclick: (e) => { if (e.target.closest('.grip,.del')) return; draft.n = label; draft.u = url; draft.i = i; go('scadd'); } },
          el('span', { class: 'tl' }, el('span', { class: 'bdg' }, ic || '🔗'), nm),
          el('span', { class: 'grip', 'aria-label': '끌어서 순서 바꾸기' }, icon('gr')),
          el('button', { class: 'del', 'aria-label': nm + ' 지우기', onclick: () => { saveShortcuts(arr.filter((_, j) => j !== i)); render(); } }, icon('tr'))); }));
        // ≡ 끌기: 손가락 위치가 옆 줄의 가운데를 넘으면 자리를 바꾸고, 놓으면 그 순서로 저장
        lst.addEventListener('pointerdown', (e) => {
          const h = e.target.closest('.grip');
          if (!h) return;
          const row = h.closest('.sr');
          e.preventDefault();
          h.setPointerCapture(e.pointerId);
          row.classList.add('drag');
          const move = (ev) => {
            const prev = row.previousElementSibling, next = row.nextElementSibling;
            if (prev && ev.clientY < prev.getBoundingClientRect().top + prev.offsetHeight / 2) lst.insertBefore(row, prev);
            else if (next && ev.clientY > next.getBoundingClientRect().top + next.offsetHeight / 2) lst.insertBefore(next, row);
          };
          const up = () => {
            h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
            saveShortcuts([...lst.children].map((r) => arr[+r.dataset.i]));
            render();
          };
          h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
        });
        return [head('바로가기 편집', 'settings'),
          el('div', { class: 'bd gray' }, arr.length ? lst : el('div', { class: 'mut' }, '바로가기 없음'),
            el('button', { class: 'pri', onclick: () => { draft.n = draft.u = ''; draft.i = null; go('scadd'); } }, '+ 바로가기 추가'))];
      },
      scadd: () => {
        const editI = draft.i != null ? draft.i : null; // 0.45.0: 줄을 눌러 들어오면 그 칸을 고친다
        const n = el('input', { class: 'fld', placeholder: '이름 (앞에 이모지를 쓰면 아이콘, 예: 🎁 쿠폰함)', 'aria-label': '바로가기 이름', value: draft.n });
        const u = el('input', { class: 'fld', placeholder: 'https://', 'aria-label': '바로가기 주소', value: draft.u });
        n.addEventListener('input', () => { draft.n = n.value; });
        u.addEventListener('input', () => { draft.u = u.value; });
        const save = () => {
          const ok = parseShortcuts(`${n.value.trim()}|${u.value.trim()}`);
          if (!ok.length) { u.focus(); return; }
          const all = curShortcuts();
          if (editI != null && all[editI]) all[editI] = ok[0]; else all.push(ok[0]);
          saveShortcuts(all);
          draft.n = draft.u = ''; draft.i = null;
          go('shortcuts');
        };
        return [head(editI != null ? '바로가기 편집' : '바로가기 추가', 'shortcuts'),
          el('div', { class: 'bd gray' }, el('div', { class: 'grp frm' }, n, u,
            el('button', { class: 'lnk', onclick: () => { u.value = draft.u = location.href; } }, '현재 페이지 주소 넣기')),
          el('button', { class: 'pri', onclick: save }, '저장'))];
      },
      // 필터(우리 창, 0.42.0): 검색 화면은 대상·형식·언어·할인·장르를 골라 '검색하기'에서 주소 1번 이동. 검색이 아닌 목록은 할인(서클은 언어도)만
      // 0.43.0: 순서 = 대상(TL/BL, 하나) → 형식 → 언어 → 할인 → 장르(공식 분류별로 접힘, 태그를 꾹 누르면 자주 쓰는 태그)
      filter: () => {
        fspec = list.filterSpec ? list.filterSpec() : null;
        if (!fspec) return [head('필터'), el('div', { class: 'bd' }, el('div', { class: 'mut' }, '이 화면에는 고를 조건이 없어요'))];
        if (!fsel) fsel = JSON.parse(JSON.stringify(fspec.cur));
        const s = fsel;
        // 언어는 고른 순서가 아니라 목록 순서(한국어·일본어·간체·번체)로 주소에 적는다(같은 조건이면 같은 주소)
        const tog = (k, v) => () => { const n = s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v]; s[k] = k === 'lang' ? LANGS.map((x) => x[0]).filter((x) => n.includes(x)) : n; render(); };
        const sale = (r) => () => { const on = r ? s.rate === r : s.sale && !s.rate; s.sale = !on; s.rate = on ? 0 : r; render(); };
        // 0.46.0 압축 배치: 왼쪽 라벨 + 버튼 한 줄(띠 대신). 값이 3~4개인 짧은 칸만 쓴다
        const lr = (t, cls, ...kids) => el('div', { class: 'lr' }, el('span', { class: 'lb' }, t), el('span', { class: 'vs ' + cls }, ...kids));
        // 대상 × 작품 종류 표. 칸 하나만 켜지고, 사이트가 못 만드는 계단 모양이면 네 칸으로 넓힌다
        // (2026-11-06 사용자 결정: B안. 사이트는 키끼리 AND라 '직사각형'만 된다 — TL망가+BLASMR 같은 체크무늬는 안 됨)
        const typeTable = () => {
          const ROWS = SEXES, COLS = FORMS.map((f) => [f[0], f[1]]);
          const SEXN = { girls: 'TL', bl: 'BL' }, FORMN = Object.fromEntries(FORMS.map((f) => [f[0], f[1]]));
          const cellOn = (sexV, formV) => s.sex.includes(sexV) && s.forms.includes(formV);
          const byOrder = (list, order) => order.filter((v) => list.includes(v));
          // 칸 하나 켜기: 그 행·열을 함께 켠다(사이트가 직사각형만 되기 때문). 끄기: 그 열만 끈다
          const pickCell = (sexV, formV) => {
            if (cellOn(sexV, formV)) { s.forms = s.forms.filter((v) => v !== formV); }
            else { s.sex = [sexV]; /* 0.52.0 TL·BL은 따로(사용자): 다른 층 칸을 누르면 층이 바뀐다. 둘을 합쳐 보면 요청·쪽 넘김이 어긋남 */ s.forms = byOrder([...new Set([...s.forms, formV])], FORMS.map((f) => f[0])); }
            render();
          };
          // 행 머리(TL·BL) = 그 대상으로 바꿈(형식은 그대로 둔다). 이미 그 하나만 켜져 있으면 끈다
          const pickRow = (sexV) => { s.sex = (s.sex.length === 1 && s.sex[0] === sexV) ? [] : [sexV]; render(); };
          // 열 머리(망가·ASMR…) = 그 형식을 켜고 끈다(대상은 그대로).
          const pickCol = (formV) => { s.forms = s.forms.includes(formV) ? s.forms.filter((v) => v !== formV) : byOrder([...s.forms, formV], FORMS.map((f) => f[0])); render(); };
          const th = (t, extra, onclick, extraAttrs) => {
            const n = el('th', { ...(extra ? { class: extra } : {}), ...(extraAttrs || {}) }, t);
            if (onclick) { n.style.cursor = 'pointer'; n.addEventListener('click', onclick); }
            return n;
          };
          const trs = [el('tr', {}, th('', 'cor'), ...COLS.map(([fV, fT]) => th(fT, '', () => pickCol(fV), { 'data-form': fV })))];
          for (const [sexV, sexT] of ROWS) {
            // 0.48.0: 형식을 안 고르면 '그 대상의 전부'라서, 행 머리를 분홍으로 하고 그 줄 칸을 옅게 칠한다(칸이 하나도 안 켜져 대상이 안 보이던 것)
            const rowOn = s.sex.includes(sexV), all = rowOn && !s.forms.length;
            trs.push(el('tr', {}, th(sexT, 'rh' + (rowOn ? ' on' : ''), () => pickRow(sexV), { 'data-sex': sexV }), ...COLS.map(([fV]) => {
              const on = cellOn(sexV, fV);
              const b = el('button', {
                class: 'cc' + (on ? ' on' : all ? ' al' : ''), 'aria-pressed': String(on),
                'aria-label': sexT + ' ' + FORMN[fV], 'data-sex': sexV, 'data-form': fV,
                'data-sexname': SEXN[sexV], 'data-formname': FORMN[fV],
              }, '');
              b.addEventListener('click', () => pickCell(sexV, fV));
              return el('td', {}, b);
            })));
          }
          return el('div', { class: 'mxw' }, el('table', { class: 'mx' }, ...trs));
        };
        // 0.51.0 태그: 필터 맨 위에 '태그 찾기' 한 줄(누르면 태그 창, 거기서 자주 쓰는 태그 → 분류별 가나다순)과 고른 태그 칩만 둔다
        const tagTop = () => [
          el('button', { class: 'gh find top', 'aria-label': '태그 이름으로 찾기', onclick: () => go('genre') }, icon('sr'), el('span', {}, s.genres.length ? `태그 찾기 · ${s.genres.length}개 고름` : '태그 찾기'), el('span', { class: 'chv' }, '›')),
          ...(s.genres.length ? [el('div', { class: 'pad' }, ...s.genres.map((n) => el('button', { class: 'op on', onclick: () => { s.genres = s.genres.filter((x) => x !== n); render(); } }, tagName(n), icon('x'))))] : [])];
        // 0.51.0 정렬: 필터 창 안에서 고른다(사이트가 정렬을 무시하는 형식 목록은 '검색하기'가 같은 작품 검색으로 넘기며 정렬을 적용한다)
        const sortRow = () => lr('정렬', 'g3 srt', ...SORTS.map(([v, , t]) => opt2(t, s.order === v, () => { s.order = v; render(); })));
        // 0.46.0 배치: 표(대상×종류) 위 → 언어·연령·가격·할인 왼쪽 라벨 줄 → 장르(접힘)
        // 장르는 수백 개라 접는 방식을 그대로 쓰고, 고른 태그만 라벨 줄에 칩으로 보여준다
        // 0.48.0: 모든 목록에서 같은 칸을 보인다. 이 화면에서 못 쓰는 칸은 빼지 않고 회색(사용자 결정, 이벤트·묶음 할인 화면만 해당)
        const dis = (n) => { if (!fspec.search) { n.classList.add('dis'); n.setAttribute('aria-disabled', 'true'); n.inert = true; } return n; };
        const disSort = (n) => { if (fspec.sortOk === false || !fspec.search) { n.classList.add('dis'); n.setAttribute('aria-disabled', 'true'); n.inert = true; } return n; };
        const body = el('div', { class: 'bd flt' },
          dis(el('div', {}, ...tagTop())),
          dis(typeTable()), el('div', { class: 'fx' }),
          dis(lr('언어', 'g4', ...LANGS.map(([v, t]) => opt2(t.replace('중국어 ', ''), s.lang.includes(v), tog('lang', v))))),
          dis(lr('연령', 'g3', ...AGES.map(([v, t]) => opt2(t, s.age === v, () => { s.age = s.age === v ? '' : v; render(); })))),
          dis(lr('가격', 'g4', ...PRICES.map(([v, t]) => opt2(t, s.price === v, () => { s.price = s.price === v ? '' : v; render(); })))),
          lr('할인', 'g3', opt2('할인중', s.sale && !s.rate, sale(0)), ...[30, 50, 80].map((r) => opt2(r + '%↑', s.rate === r, sale(r)))),
          disSort(sortRow()));
        const foot = el('div', { class: 'ft' },
          fspec.canSave ? el('button', { class: 'svb', 'aria-label': '지금 검색 조건 저장(사이트)', onclick: () => fspec.save() }, icon('bm')) : null,
          el('button', { class: 'rsb', onclick: () => { fsel = JSON.parse(JSON.stringify(fspec.def)); render(); } }, '리셋'),
          el('button', { class: 'gob', onclick: () => { const v = fsel; fsel = null; setOpen(false); fspec.run(v); } }, '검색하기'));
        return [head('필터'), body, foot];
      },
      genre: () => {
        const s = fsel;
        const inp = el('input', { class: 'fld', type: 'search', placeholder: '태그 이름(한국어·일본어)', 'aria-label': '태그 찾기', value: draft.g || '' });
        const lst = el('div', { class: 'gl' });
        const draw = () => {
          const v = inp.value.trim();
          draft.g = v;
          if (v) {
            lst.replaceChildren(...tags.find(v).map(([n, ko, ja2]) => el('button', { class: 'li' + (s.genres.includes(n) ? ' on' : ''), 'aria-pressed': String(s.genres.includes(n)), onclick: () => { s.genres = s.genres.includes(n) ? s.genres.filter((x) => x !== n) : [...s.genres, n]; render(); } },
              el('span', { class: 'pt' }, s.genres.includes(n) ? icon('ok') : null, ko), ko !== ja2 ? el('span', { class: 'ps' }, ja2) : null)));
            return;
          }
          // 0.51.0 입력이 없으면: 자주 쓰는 태그가 맨 위(처음부터 펼침), 그 아래 공식 분류별로 접힘, 안은 가나다순(영문·숫자가 먼저)
          kw.load(); // 목록이 아직 없거나 옛 모양이면 받아 둔다(요청 수는 그대로 주 1번)
          const byId = new Map(kw.list().map((x) => [x[0], x])), favIds = tags.favIds().filter((n) => byId.has(n));
          const koOf = (n) => (byId.get(n) || [0, ''])[1], byKo = (ids) => [...ids].sort((a, b) => koOf(a).localeCompare(koOf(b), 'ko'));
          const groups = [...(favIds.length ? [[FAV_GROUP, byKo(favIds)]] : []), ...kw.groups().map(([t, ids]) => [t, byKo(ids)])];
          if (!groups.length) { lst.replaceChildren(el('div', { class: 'mut' }, '태그 목록을 불러오는 중이에요')); return; }
          const open = (draft.open = draft.open || {});
          if (open[FAV_GROUP] === undefined) open[FAV_GROUP] = true;
          lst.replaceChildren(...groups.map(([name, ids]) => {
            const k = ids.filter((n) => s.genres.includes(n)).length;
            return el('div', { class: 'gg' },
              el('button', { class: 'gh', 'aria-expanded': String(!!open[name]), onclick: () => { open[name] = !open[name]; render(); } }, el('span', {}, name === FAV_GROUP ? icon('st') : null, name, k ? el('em', {}, String(k)) : null), el('span', { class: 'chv' }, open[name] ? '▴' : '▾')),
              open[name] ? el('div', { class: 'pad gb' }, ...ids.map((n) => tagChip(n, byId, favIds)).filter(Boolean)) : null);
          }));
        };
        inp.addEventListener('input', draw);
        draw();
        setTimeout(() => inp.focus(), 50);
        return [head('장르(태그)', 'filter'),
          el('div', { class: 'bd' }, inp,
            s.genres.length ? el('div', { class: 'pad' }, ...s.genres.map((n) => el('button', { class: 'op on', onclick: () => { s.genres = s.genres.filter((x) => x !== n); render(); } }, tagName(n) + ' ✕'))) : null,
            lst)];
      },
    };
    let lastV = '';
    // 다시 그려도 같은 화면이면 스크롤 위치를 지킨다(장르 접기·태그 고르기에서 맨 위로 튀지 않게)
    const render = () => {
      const old = pnl.querySelector('.bd'), top = old && lastV === view ? old.scrollTop : 0;
      lastV = view;
      pnl.dataset.v = view;
      pnl.replaceChildren(el('div', { class: 'grab' }), ...views[view]());
      const nb = pnl.querySelector('.bd');
      if (nb && top) nb.scrollTop = top;
    };
    const setOpen = (open, v) => {
      root.classList.toggle('open', open);
      if (open) {
        openedAt = Date.now();
        lastV = ''; // 새로 열면 스크롤은 맨 위부터
        if (v === 'filter') { fsel = null; draft.open = {}; } // 장르 분류는 열 때마다 모두 접힌 채로
        go(v || 'menu');
        if (view === 'menu') ensureEv();
      }
    };
    list.openPanel = (v) => setOpen(true, v);
    const bk = el('div', { class: 'bk', onclick: () => { if (Date.now() - openedAt > 400) setOpen(false); } });
    const pkx = el('button', { class: 'fb px', id: 'dlpkx', hidden: '', 'aria-label': '고르기 취소', onclick: () => cart.pickOff() }, icon('x')); // 0.49.0 장바구니 고르기 취소
    root.append(bk, pnl, pkx, fb, fab);
    document.documentElement.append(root);
    list.syncFab();
  }

  /* ========== 10.5 play: DLsite Play 작품 숨기기(Play 자체 '비표시' 기능을 씀) ==========
     - Play에는 원래 비표시 기능이 있다(작품 화면 ⋯ → '비표시 작품 목록으로 이동', 설정 → 비표시 작품 목록). 비표시 작품은 Play가 목록과
       개수에서 아예 빼서 빈칸도, 스크롤 튐도 없다. 그래서 숨기기는 Play 서버의 비표시 목록(/api/ignore)에 넣는다(계정에 저장).
       GET /api/ignore → {works:[id]}, POST /api/ignore {works:[전체 목록]}, DELETE /api/ignore {works:[뺄 id]} (2026-10-30 Play 코드와 시험으로 확인).
     - 오른쪽 아래 '숨기기' → 작품을 누르면 화면 아래 '숨긴 작품' 칸으로(그 칸에서 누르면 되돌림) → '완료'에 한꺼번에 보내고 새로고침.
       버튼을 꾸욱 누르면 칸에 이미 비표시인 작품도 보인다(되돌리기용). 버튼은 끌어서 옮긴다.
       요청은 편집 한 번에 GET 1 + (바뀐 게 있으면) POST 1·DELETE 1.
     - Play는 비표시 목록을 브라우저 저장소(IndexedDB 'Play_…'의 Ignore)에도 두고 그걸로 목록을 그린다. 서버만 바꾸면 새로고침해도 안 바뀌어서 같이 고친다.
     - 썸네일마다 품번 띠를 붙인다(주소에서 읽음, 요청 없음).
     - 0.31~0.32는 이 기기에만 저장(play.hidden)하고 CSS로 숨겼다. 그 목록은 다음 편집 때 숨길 작품으로 넣어 보내고 지운다. */
  const PLAY_KEY = 'play.hidden'; // 예전(0.31~0.32) 이 기기 숨김 목록 { 작품id: 1 또는 {i, n} }
  const PLAY_CSS = `
#dlph{position:fixed;right:14px;bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:2147483001;height:44px;padding:0 18px;border:0;border-radius:22px;background:#222;color:#fff;font:700 15px/44px system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3);cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#dlph.on{background:#2196f3}
#dlph[disabled]{opacity:.6}
#dlph-tray{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;padding:8px 12px calc(72px + env(safe-area-inset-bottom,0px));background:#f4f4f5;border-top:1px solid #ddd;font:13px/1.3 system-ui,sans-serif;color:#555}
#dlph-tray b{display:block;margin-bottom:6px}
#dlph-tray .row{display:flex;gap:8px;overflow-x:auto}
#dlph-tray button{flex:none;width:84px;padding:0;border:0;background:none;text-align:left;color:#555;font:inherit;font-size:11px;cursor:pointer}
#dlph-tray img,#dlph-tray .ph{display:block;width:84px;height:63px;object-fit:cover;border-radius:6px;background:#ddd}
#dlph-tray span{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.dlph-idh{position:relative}
.dlph-id{position:absolute;left:0;right:0;bottom:0;z-index:3;height:20px;display:flex;align-items:center;padding:0 6px;background:rgba(20,20,24,.72);color:#fff;font:700 10px/1 system-ui,sans-serif;letter-spacing:.2px;white-space:nowrap;overflow:hidden;cursor:copy}
.dlph-id.ok{background:#2e7d32}`;
  const PLAY_ID = /^[A-Z]{2}\d{6,8}$/;
  // Play의 IndexedDB(Play_…)에서 비표시 목록과 작품 정보(제목·표지)를 읽고 쓴다
  const playDb = {
    async open() {
      const list = indexedDB.databases ? await indexedDB.databases() : [];
      const d = list.find((x) => x.name && x.name.startsWith('Play_'));
      if (!d) return null;
      return new Promise((res) => { const r = indexedDB.open(d.name); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    },
    req: (r) => new Promise((res) => { r.onsuccess = () => res(r.result); r.onerror = () => res(null); }),
    async works(ids) { // { id: { i: 표지, n: 제목 } }
      const out = {};
      const db = await playDb.open().catch(() => null);
      if (!db) return out;
      try {
        const st = db.transaction('Purchase').objectStore('Purchase');
        for (const id of ids) {
          const p = await playDb.req(st.get(id));
          if (!p) continue;
          const nm = p.name || {};
          // 표지는 main(Play 비표시 목록도 이걸 씀). 번역판은 thumb(_img_sam)이 없는 경우가 있었다(2026-10-30, 61개 중 16개)
          out[id] = { i: (p.images && (p.images.main || p.images.thumb)) || '', n: nm.ko_KR || nm.ja_JP || Object.values(nm)[0] || '' };
        }
      } catch (e) { /* 저장소 구조가 다르면 제목·표지 없이 */ }
      db.close();
      return out;
    },
    async setIgnore(add, del) {
      const db = await playDb.open().catch(() => null);
      if (!db) return;
      try {
        await new Promise((res) => {
          const tx = db.transaction('Ignore', 'readwrite');
          const st = tx.objectStore('Ignore');
          for (const id of add) st.put({ id });
          for (const id of del) st.delete(id);
          tx.oncomplete = res; tx.onerror = res; tx.onabort = res;
        });
      } catch (e) { /* 없으면 Play가 다음 동기화 때 서버에서 받는다 */ }
      db.close();
    },
  };
  const playApi = (method, works) => fetch('/api/ignore', {
    method, credentials: 'include',
    headers: works ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: works ? JSON.stringify({ works }) : undefined,
  }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))));

  function playHide() {
    let legacy = store.get(PLAY_KEY, null) || {};
    let editing = false, busy = false, old = false; // old: 칸에 이미 비표시인 작품도 보임(버튼을 꾸욱 눌렀을 때)
    let server = []; // 편집을 열 때 받은 비표시 목록
    const add = new Set(), del = new Set(); // 이번 편집에서 숨길 것 / 되돌릴 것
    let info = {}; // 칸에 쓸 제목·표지
    const ID_HREF = /\/work\/([A-Z]{2}\d{6,8})/;
    const ID_IMG = /\/([A-Z]{2}\d{6,8})_img_/;
    // 카드(li 또는 '최근 본 작품'의 role=button)와 작품 id
    const cards = () => {
      const out = new Map();
      for (const a of document.querySelectorAll('a[href*="/work/"]')) {
        const m = (a.getAttribute('href') || '').match(ID_HREF);
        const c = m && a.closest('li');
        if (c && !out.has(c)) out.set(c, m[1]);
      }
      for (const img of document.querySelectorAll('[role=button] img[src*="_img_"]')) {
        const m = img.src.match(ID_IMG);
        const c = m && img.closest('[role=button]');
        if (c && !out.has(c)) out.set(c, m[1]);
      }
      return out;
    };
    const fab = el('button', { id: 'dlph', 'aria-label': '작품 숨기기(꾸욱 누르면 숨긴 작품도 보기, 끌면 옮김)' });
    const hideCss = el('style', { id: 'dlph-hide' });
    const tray = el('div', { id: 'dlph-tray', role: 'region', 'aria-label': '숨긴 작품' });
    tray.hidden = true;
    // CSS로 가리는 작품: 편집 중 새로 고른 것, 아직 보내지 않은 예전 목록. 목록 li는 빈칸으로 남긴다(빼면 스크롤 중 화면이 튐)
    const hideRule = (ids) => !ids.length ? ''
      : `${ids.map((id) => `li:has(a[href$="/work/${id}"])`).join(',')}{visibility:hidden!important}`
        + `${ids.map((id) => `[role=button]:has(img[src*="/${id}_img_"])`).join(',')}{display:none!important}`;
    const ids = () => (editing ? [...add] : Object.keys(legacy)).filter((id) => PLAY_ID.test(id));
    // 썸네일마다 품번 띠(목록 li만)
    const stamp = () => {
      for (const a of document.querySelectorAll('li a[href*="/work/"]')) {
        const m = (a.getAttribute('href') || '').match(ID_HREF);
        const img = m && a.querySelector('img');
        const box = img && img.parentElement;
        if (!box || (box.lastElementChild && box.lastElementChild.className === 'dlph-id' && box.lastElementChild.textContent === m[1])) continue;
        for (const old of box.querySelectorAll(':scope > .dlph-id')) old.remove();
        box.classList.add('dlph-idh');
        box.append(el('span', { class: 'dlph-id' }, m[1]));
      }
    };
    const paint = () => {
      const css = hideRule(ids());
      if (hideCss.textContent !== css) hideCss.textContent = css;
      stamp();
      fab.hidden = !editing && !document.querySelector('a[href*="/work/"], [role=button] img[src*="_img_"]');
      fab.classList.toggle('on', editing);
      fab.disabled = busy;
      fab.textContent = busy ? '저장 중' : editing ? '완료' : '숨기기';
    };
    // 아래 칸: 새로 숨길 것 + (꾸욱 눌렀으면) 이미 비표시인 것(되돌릴 것은 뺌). 누르면 되돌림
    const paintTray = () => {
      tray.hidden = !editing;
      if (!editing) return;
      const list = [...[...add].reverse(), ...(old ? server.filter((id) => !add.has(id) && !del.has(id)) : [])];
      tray.replaceChildren(el('b', {}, '숨긴 작품 ' + list.length), el('div', { class: 'row' }, list.map((id) => {
        const v = info[id] || {};
        return el('button', { 'data-id': id, title: v.n || id, onclick: () => {
          if (add.has(id)) add.delete(id); else del.add(id);
          paint(); paintTray();
        } }, v.i ? el('img', { src: v.i, alt: '', loading: 'lazy' }) : el('div', { class: 'ph' }), el('span', {}, v.n || id));
      })));
    };
    const fail = () => { busy = false; paint(); fab.textContent = '실패'; setTimeout(paint, 2000); };
    // 버튼을 끌면 옮긴다(이 기기에 위치 저장, 화면 밖으로는 안 나감). 0.5초 꾸욱 누르면 숨긴 작품도 칸에 보이며 편집 시작
    const POS_KEY = 'play.fabPos';
    const place = (p) => {
      if (!p) return;
      const x = Math.max(4, Math.min(innerWidth - (fab.offsetWidth || 90) - 4, p.x));
      const y = Math.max(4, Math.min(innerHeight - (fab.offsetHeight || 44) - 4, p.y));
      Object.assign(fab.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' });
    };
    let press = null, skipClick = false;
    fab.addEventListener('contextmenu', (e) => e.preventDefault()); // 폰에서 꾸욱 누를 때 메뉴가 뜨지 않게
    fab.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      skipClick = false;
      const r = fab.getBoundingClientRect();
      const p = press = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId, drag: false, long: false };
      p.t = setTimeout(() => { if (press !== p) return; p.long = skipClick = true; begin(true); }, 500);
    });
    // 움직임·뗌은 window에서 받는다(빨리 끌면 손가락이 버튼 밖으로 먼저 나감)
    window.addEventListener('pointermove', (e) => {
      if (!press || press.long || e.pointerId !== press.id) return;
      if (!press.drag) {
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 8) return;
        press.drag = true;
        clearTimeout(press.t);
        try { fab.setPointerCapture(press.id); } catch (err) { /* 무시 */ }
      }
      place({ x: e.clientX - press.dx, y: e.clientY - press.dy });
    });
    const release = () => {
      if (!press) return;
      clearTimeout(press.t);
      if (press.drag) { skipClick = true; store.set(POS_KEY, { x: parseFloat(fab.style.left), y: parseFloat(fab.style.top) }); }
      press = null;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('resize', () => { if (fab.style.left) place({ x: parseFloat(fab.style.left), y: parseFloat(fab.style.top) }); });
    // 편집 시작: 서버의 비표시 목록을 받는다(요청 1). 이미 편집 중이면 칸만 넓힌다
    const begin = async (showOld) => {
      if (busy) return;
      if (editing) { if (showOld && !old) { old = true; paintTray(); } return; }
      busy = true; paint();
      try { server = ((await playApi('GET')).works || []).filter((id) => typeof id === 'string'); } catch (e) { fail(); return; }
      add.clear(); del.clear();
      for (const id of Object.keys(legacy)) if (PLAY_ID.test(id) && !server.includes(id)) add.add(id); // 예전 이 기기 숨김을 같이 보낸다
      info = await playDb.works([...new Set([...server, ...add])]);
      busy = false; editing = true; old = showOld;
      paint(); paintTray();
    };
    fab.addEventListener('click', async () => {
      if (skipClick) { skipClick = false; return; }
      if (busy) return;
      if (!editing) { begin(false); return; }
      if (!add.size && !del.size && !Object.keys(legacy).length) { editing = false; paint(); paintTray(); return; }
      busy = true; paint();
      try { // POST는 Play처럼 전체 목록을 보낸다(덧붙이기인지 바꾸기인지 몰라도 안전하게)
        if (add.size) await playApi('POST', [...new Set([...server, ...add])].filter((id) => !del.has(id)));
        if (del.size) await playApi('DELETE', [...del]);
      } catch (e) { fail(); return; }
      await playDb.setIgnore([...add], [...del]);
      legacy = {};
      store.set(PLAY_KEY, null);
      location.reload();
    });
    // 품번 띠를 누르면 작품을 열지 않고 품번만 복사한다(편집 중에도). 복사되면 띠가 잠깐 초록색(copyText)
    // 편집 중에는 작품을 열지 않고 숨길 작품으로 고른다(사이트보다 먼저 받으려고 window 캡처 단계). 칸에 쓸 표지·제목도 같이 읽는다
    window.addEventListener('click', (e) => {
      const band = e.target.closest && e.target.closest('.dlph-id');
      if (band) { e.preventDefault(); e.stopImmediatePropagation(); copyText(band, band.textContent); return; }
      if (!editing || !e.target.closest || e.target.closest('#dlph, #dlph-tray')) return;
      for (const [c, id] of cards()) {
        if (!c.contains(e.target)) continue;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (busy) return;
        del.delete(id);
        add.delete(id); // 다시 넣어 칸의 맨 앞으로
        if (!server.includes(id)) add.add(id);
        if (!info[id]) {
          const img = c.querySelector('img[src*="_img_"]');
          const name = [...c.querySelectorAll('img[alt]')].map((x) => x.alt).find(Boolean) || c.getAttribute('aria-label') || '';
          info[id] = { i: img ? img.src : '', n: name.slice(0, 80) };
        }
        paint(); paintTray();
        return;
      }
    }, true);
    const start = () => {
      (document.head || document.documentElement).append(el('style', {}, PLAY_CSS), hideCss);
      document.body.append(tray, fab);
      paint();
      place(store.get(POS_KEY, null));
      let t = null;
      new MutationObserver((recs) => { // 숨기기는 CSS와 Play가 하고, 여기서는 품번 띠와 편집 버튼만
        const ours = (n) => n.nodeType !== 1 || n.classList.contains('dlph-id');
        if (recs.every((r) => fab.contains(r.target) || tray.contains(r.target) || ([...r.addedNodes].every(ours) && [...r.removedNodes].every(ours)))) return;
        clearTimeout(t);
        t = setTimeout(paint, 100);
      }).observe(document.body, { childList: true, subtree: true });
    };
    if (document.body && document.readyState !== 'loading') start();
    else document.addEventListener('DOMContentLoaded', start);
  }

  /* ========== 11. boot ========== */
  if (location.hostname === 'play.dlsite.com') { playHide(); return; } // Play에서는 숨기기만(언어·목록 기능은 www.dlsite.com 전용)
  const target = searchRedirectTarget();
  if (target) {
    let recent = false;
    try {
      const last = JSON.parse(sessionStorage.getItem('dlh_redirect') || 'null');
      recent = !!last && last.to === target && Date.now() - last.at < 10000;
      if (!recent) sessionStorage.setItem('dlh_redirect', JSON.stringify({ to: target, at: Date.now() }));
    } catch (e) { /* 무시 */ }
    if (!recent) { location.replace(target); return; }
  }
  locale.enforce(true);
  locale.hookNavigation();
  for (const t of ['submit', 'keydown', 'click']) document.addEventListener(t, kw.before, true);

  const isOurs = (n) => n.nodeType === 1 && (n.matches(OURS) || !!n.closest(OURS));
  const onlyOurs = (recs) => recs.every((r) =>
    isOurs(r.target) || [...r.addedNodes, ...r.removedNodes].every((n) => n.nodeType !== 1 || n.matches(OURS)));

  let popAt = 0, popT = 0;
  function popupSoon() {
    clearTimeout(popT);
    const wait = 2500 - (Date.now() - popAt);
    if (wait > 0) { popT = setTimeout(popupSoon, wait); return; }
    popAt = Date.now();
    clean.couponPopup();
  }
  // 사이트 필터 창의 '할인중 작품' 선택(campaign[])을 주소에 맞춘다. 사이트는 정렬·필터를 바꿀 때 이 선택으로 새 주소를 만들어서,
  // 안 맞추면 우리가 붙인 할인중 조건이 빠진다. 주소마다 한 번만(사용자가 직접 끄면 그대로 둔다).
  let saleSynced = '';
  function syncSaleFilter() {
    if (saleSynced === location.href || !route.isSearch(location.pathname) || !/\/campaign\/campaign/.test(location.pathname)) return;
    const r = document.querySelector('input[type=radio][name="campaign[]"]');
    if (!r) return; // 아직 안 그려졌으면 다음 정리 때
    saleSynced = location.href;
    if (!r.checked) r.click();
  }
  // 묶음 할인(bulkbuy) 페이지: 사이트는 필터를 바꿔도 지금 쪽 번호를 그대로 요청해서, 2쪽 이상이면 결과가 모자라 404로 멈춘다(스크립트 없이도 같음).
  // 사이트 필터 창의 '絞り込み'를 누르기 직전에 사이트가 들고 있는 쪽 번호(목록 상태 객체의 page)를 1로 바꾼다.
  function bulkPageReset(e) {
    if (!/\/campaign\/bulkbuy\//.test(location.pathname) || !e.target.closest || !e.target.closest('button.action_sheet_submit')) return;
    const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    for (const k of Object.keys(w)) {
      try {
        const o = w[k];
        if (o && typeof o === 'object' && typeof o.endpoint === 'string' && /\/bulkbuy\/ajax\//.test(o.endpoint) && o.page > 1) o.page = 1;
      } catch (err) { /* 다른 사이트 창(iframe)은 못 읽음 */ }
    }
  }
  // 사이트 연령 확인 창(div.adult_check_box._adultcheck, 2026-11-01 폰·PC 확인)이 떠 있는 동안 설정 버튼을 숨긴다(버튼이 창의 '네' 위에 겹쳤음).
  // head 안에도 숨은 ._adultcheck가 하나 더 있어서 전부 본다
  function ageGateHide() {
    const on = [...document.querySelectorAll('._adultcheck')].some((g) => g.getClientRects().length > 0 && getComputedStyle(g).visibility !== 'hidden');
    const h = document.getElementById('dlh');
    if (h && h.hidden !== on) h.hidden = on;
  }
  // 0.46.2 썸네일 흐리게(설정 blurThumb). CSS는 html.dlh-blur 아래 사이트 사진에만 걸리므로 카드가 다시 그려져도 자동으로 따라간다.
  // 설정을 끄면 클래스만 떼어 바로 원래대로(새로고침 없음)
  function applyThumbBlur() {
    document.documentElement.classList.toggle('dlh-blur', !!opt('blurThumb'));
  }
  // 0.51.1 작품 페이지 리뷰 먼저: html 클래스만 켜고 끈다(CSS는 위 스타일 끝)
  function applyReviewFirst() {
    document.documentElement.classList.toggle('dlh-rv', !!opt('reviewFirst'));
  }
  // 0.52.0 작품 페이지 DLW: 제목 상자(.c-productTitleBox) 오른쪽 위. 사이트(Vue)가 다시 그리면 없어지므로 tidy 때마다 확인
  function workDlw() {
    const m = /\/work\/=\/product_id\/([A-Z]{2}\d+)/.exec(location.pathname);
    const box = m && document.querySelector('.c-productTitleBox');
    if (!box || box.querySelector('.dlwk')) return;
    const a = list.dlw(m[1]); a.classList.add('dlwk'); box.append(a);
  }
  // 0.53.0 첫 화면(/girls·/bl 맨 위) 슬라이더·추천 카드에도 DLW(표지 오른쪽 위). 요청 없음: 카드 링크의 품번만 쓰고, 가격·쿠폰 줄은 안 붙인다
  function homeDlw() {
    if (!/^\/(?:girls|bl)(?:-touch)?\/?$/.test(location.pathname)) return;
    for (const card of document.querySelectorAll('li.n_work_list_item')) {
      if (card.querySelector('.dlx')) continue;
      const a = card.querySelector('a[href*="/work/=/product_id/"]'), id = a && pidOf(a.getAttribute('href')), h = id && list.host(card);
      if (!h) continue;
      const box = el('div', { class: 'dlx' }, list.dlw(id));
      h.append(box);
      list.queuePlace(box, card);
    }
  }
  // 0.53.0 작품 페이지 번역 허가 ○/✕: 작품 정보 묶음(목록이 쓰는 같은 주소) 1건. 작품 페이지에서만 +1 요청(사이트 자체 요청엔 이 값이 없음, 2026-11-18 확인)
  const trWork = { id: '', t: null, busy: false };
  function workTrans() {
    const m = /\/work\/=\/product_id\/([A-Z]{2}\d+)/.exec(location.pathname);
    const box = m && document.querySelector('.c-productTitleBox');
    if (!box) return;
    if (trWork.id !== m[1]) Object.assign(trWork, { id: m[1], t: null, busy: false });
    const paint = () => {
      const t = trWork.t;
      if (!t || box.querySelector('.dlwt')) return;
      const ko = (t.translation_status_for_translator || {}).KO_KR;
      const txt = t.is_original === false ? '번역판' : t.is_translation_agree ? '번역 ○ 허가' : '번역 ✕ 불가';
      box.append(el('div', { class: 'dlwt ' + (t.is_translation_agree ? 'y' : 'n') }, txt, ...(t.is_translation_agree && ko ? [` · 한국어 신청 ${ko.applied_count} · 판매 ${ko.on_sale_count}${ko.is_denied ? ' · 거절' : ''}`] : [])));
    };
    if (trWork.t === null && !trWork.busy && net.ok()) {
      trWork.busy = true;
      const id = m[1];
      netFetch(INFO_URL + id, { credentials: 'include', headers: XHR }, 'json')
        .then((j) => { net.good(); const w = j && j[id]; if (trWork.id === id) trWork.t = w && w.translation_info ? w.translation_info : false; })
        .catch(() => { if (trWork.id === id) trWork.t = false; })
        .finally(() => { trWork.busy = false; paint(); });
    }
    paint();
  }
  // 0.53.0 번역 허가 목록 위 한 줄: 언어(한국어 기본·영어·간체·번체) + '신청 1↑ · 판매 0'. 주소의 translation_can_apply[0]만 바꿔 다시 연다(걸러내기는 위 reviewNewest 쪽 응답 가로채기)
  const TR_LANGS = [['KO_KR', '한국어'], ['ENG', '영어'], ['CHI_HANS', '간체'], ['CHI_HANT', '번체']];
  function trBar() {
    if (!route.isTrans(location.pathname) || document.getElementById('dltr')) return;
    const ul = document.querySelector('ul.n_work_list');
    if (!ul || !ul.parentElement) return;
    const u = new URL(location.href), K = 'translation_can_apply[0]', cur = u.searchParams.get(K);
    if (!cur) { u.searchParams.set(K, 'KO_KR'); location.replace(u.href); return; } // 기본 한국어(사이트는 언어를 안 정하면 전부 보여 줌)
    const on = !!opt('trOnly');
    const chips = TR_LANGS.map(([c, t]) => el('button', { class: c === cur ? 'on' : '', 'aria-pressed': String(c === cur), onclick: () => { u.searchParams.set(K, c); u.searchParams.delete('page'); location.assign(u.href); } }, t));
    const tog = el('button', { class: 'tg' + (on ? ' on' : ''), 'aria-pressed': String(on), onclick: () => { store.set('trOnly', !on); location.reload(); } }, '신청 1↑ · 판매 0');
    ul.parentElement.insertBefore(el('div', { id: 'dltr', role: 'toolbar', 'aria-label': '번역 허가 거르기' }, ...chips, el('span', { class: 'sp' }), tog), ul);
  }
  // 0.53.0 이름(서클·성우·작가) 꾹 누르면 작은 메뉴: 검색 · 검색어 저장 · 차단. 종류는 눌린 이름에서 자동. 저장은 기존 키(shortcuts.custom 바로가기, block.list·block.kind)
  let panelApi = null; // buildPanel이 채움(바로가기 읽고 쓰기)
  function nameMenu(name, kind, at) {
    document.getElementById('dlnmm')?.remove();
    const fl = (location.pathname.split('/')[1] || 'girls').replace(/-touch$/, '');
    const url = `/${fl}/fsr/=/${kind === '서클' ? 'keyword_maker_name' : 'keyword_creater'}/${encodeURIComponent('"' + name + '"')}/ana_flg/all`;
    const m = el('div', { id: 'dlnmm', role: 'menu' }, el('div', { class: 'h' }, name, el('small', {}, kind)));
    const close = () => { m.remove(); document.removeEventListener('pointerdown', away, true); };
    const away = (e) => { if (!m.contains(e.target)) close(); };
    const item = (t, fn) => m.append(el('button', { role: 'menuitem', onclick: () => { const r = fn(); if (r === false) return; close(); } }, t));
    item('이 이름으로 검색', () => { location.assign(url); });
    item('검색어 저장', () => { if (panelApi) panelApi.addShortcut(`🔍 ${name}`, url); });
    item('차단', () => {
      const names = String(store.get('block.list', '')).split('\n').map((x) => x.trim()).filter(Boolean), kinds = { ...(store.get('block.kind', {}) || {}) };
      if (!names.some((x) => normName(x) === normName(name))) names.push(name);
      kinds[name] = kind;
      store.set('block.list', names.join('\n')); store.set('block.kind', kinds);
      blockSet.cache = null; list.apply();
    });
    document.body.append(m);
    const r = at.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.left)) + 'px';
    m.style.top = (r.bottom + m.offsetHeight + 12 > innerHeight ? Math.max(8, r.top - m.offsetHeight - 6) : r.bottom + 6) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
  }
  // 사이트 카드의 서클·작가·성우 링크: 0.5초 꾹 = 위 메뉴(짧게는 원래 링크). 꾹 누른 뒤 따라오는 클릭은 막는다
  function nameLongPress() {
    let timer = 0, x0 = 0, y0 = 0, hit = null;
    const SEL = '.n_maker_name a, .maker_name a, .author a';
    document.addEventListener('pointerdown', (e) => {
      const a = e.target.closest && e.target.closest(SEL);
      clearTimeout(timer); hit = null;
      if (!a || a.closest('#dlh')) return;
      const href = a.getAttribute('href') || '', name = a.textContent.trim();
      if (!name) return;
      const voiceCard = !!a.closest('li, dl') && /\btype_SOU\b/.test((a.closest('li, dl').querySelector('.work_category') || {}).className || '');
      const kind = /\/circle\/profile\//.test(href) ? '서클' : /keyword_creater|keyword_maker_name/.test(href) ? (voiceCard ? '성우' : '작가') : '';
      if (!kind) return;
      x0 = e.clientX; y0 = e.clientY;
      timer = setTimeout(() => { hit = a; try { navigator.vibrate && navigator.vibrate(20); } catch (err) { /* 진동 안 됨 */ } nameMenu(name, kind, a); }, 500);
    }, true);
    document.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) clearTimeout(timer); }, true);
    for (const t of ['pointerup', 'pointercancel']) document.addEventListener(t, () => clearTimeout(timer), true);
    document.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest(SEL)) e.preventDefault(); }, true);
    document.addEventListener('click', (e) => { if (hit && e.target.closest && e.target.closest(SEL) === hit) { e.preventDefault(); e.stopPropagation(); hit = null; } }, true);
  }
  // 0.50.1 딱지 크기: CSS 변수 --dlz(0.8·1·1.25)를 곱해 높이·글자를 바꾼다
  function applyChipSize() {
    document.documentElement.style.setProperty('--dlz', String({ s: 0.8, m: 1, l: 1.25 }[opt('chipSize')] || 1));
  }
  // 사이트가 검색을 주소만 바꿔(pushState) 보여 주면 시작할 때 바꾸기(searchRedirectTarget)가 안 돈다(폰 검색 화면 안에서 다시 검색하면 정렬이 빠짐, 2026-11-02 실제 사이트).
  // 그때 같은 계산으로 한 번 바꿔 연다(주소마다 1번, 요청 +1: 사이트가 이미 받은 결과 위에 문서 1번)
  function kwFix() {
    kw.tidyBox();
    const t = route.isSearch(location.pathname) && searchRedirectTarget();
    if (!t) return;
    try { if (sessionStorage.getItem('dlh_kw') === location.href) return; sessionStorage.setItem('dlh_kw', location.href); } catch (e) { return; }
    location.replace(t);
  }
  // 사이트 제목의 언어 글자(일본어 작품 언어 불문 작품)를 뺀다. 0.44.0
  function tidyTitle() {
    const h = document.querySelector('h1.main_lead_01');
    if (!h || h.dataset.dlt) return;
    h.dataset.dlt = '1';
    const t = h.textContent, n = t.replace(/\s*(?:일본어|한국어|영어|중국어 간체|중국어 번체|언어 불문)(?: 작품)?/g, '');
    if (n !== t) h.textContent = n;
  }
  /* 0.54.0 마이페이지 구입 이력·라이브러리: 카드마다 ♡(좋아요) · 내 태그 · 메모(이 기기 저장 lib.heart·lib.tags·lib.memo·lib.tagNames).
     요청 없음. 로그인이 필요한 화면이라 실제 구조를 못 봤다 → 품번(RJ…) 링크를 품은 사진 카드를 방어적으로 찾는다(한 품번만 품은 가장 큰 조상, 사진 4장 이하) */
  const LIBK = { h: 'lib.heart', t: 'lib.tags', m: 'lib.memo', n: 'lib.tagNames' };
  const libGet = (k) => { const d = k === LIBK.n ? [] : {}, v = store.get(k, d); return v && typeof v === 'object' ? v : d; };
  const lib = {
    f: 'all', // 보기: all · heart · memo · #태그이름
    ok(id) {
      const f = lib.f;
      if (f === 'all') return true;
      if (f === 'heart') return !!libGet(LIBK.h)[id];
      if (f === 'memo') return !!libGet(LIBK.m)[id];
      return (libGet(LIBK.t)[id] || []).includes(f.slice(1));
    },
    mark() { // 아직 표시 안 한 품번 링크마다 카드(.dllb)를 정한다
      for (const a of document.querySelectorAll('a[href]')) {
        if (a.closest('.dllb, #dlh, #dllsh, #dlnmm, header, nav, footer')) continue;
        const id = pidOf(a.getAttribute('href'));
        if (!id) continue;
        let c = a;
        for (let i = 0; i < 6 && c.parentElement && c.parentElement !== document.body; i++) {
          const p = c.parentElement;
          if (p.querySelectorAll('img').length > 4 || [...p.querySelectorAll('a[href]')].some((x) => { const q = pidOf(x.getAttribute('href')); return q && q !== id; })) break;
          c = p;
        }
        if (!c.querySelector('img') || c.querySelector('.dllb') || c.closest('.dllb')) continue;
        c.classList.add('dllb'); c.dataset.dlp = id;
      }
    },
    toggle(id) {
      const h = { ...libGet(LIBK.h) };
      if (h[id]) delete h[id]; else h[id] = 1;
      store.set(LIBK.h, h); lib.run();
    },
    sig() {
      const t = libGet(LIBK.t), cnt = {};
      for (const a of Object.values(t)) for (const n of a) cnt[n] = (cnt[n] || 0) + 1;
      return [lib.f, Object.keys(libGet(LIBK.h)).length, Object.keys(libGet(LIBK.m)).length, libGet(LIBK.n).map((n) => n + ':' + (cnt[n] || 0)).join(',')].join('|');
    },
    bar() { // 위 칩 줄: 전체 · ♡ · 메모 · 내 태그들 · ⋯(백업). 카드를 가장 많이 품은 칸 바로 위
      const cards = [...document.querySelectorAll('.dllb')];
      let b = document.getElementById('dllib');
      if (!cards.length) { if (b) b.remove(); return; }
      const sig = lib.sig(), by = new Map();
      for (const c of cards) by.set(c.parentElement, (by.get(c.parentElement) || 0) + 1);
      const grid = [...by.entries()].sort((x, y) => y[1] - x[1])[0][0];
      if (b && b.dataset.sig === sig && b.nextElementSibling === grid) return;
      if (b) b.remove();
      const t = libGet(LIBK.t), cnt = {};
      for (const a of Object.values(t)) for (const n of a) cnt[n] = (cnt[n] || 0) + 1;
      const chip = (f, label, n) => el('button', { type: 'button', class: lib.f === f ? 'on' : '', 'aria-pressed': String(lib.f === f), onclick: () => { lib.f = lib.f === f && f !== 'all' ? 'all' : f; lib.run(); } }, ...(f === 'heart' ? [icon('hl')] : []), label, ...(n != null ? [el('small', {}, String(n))] : []));
      b = el('div', { id: 'dllib', role: 'toolbar', 'aria-label': '내 라이브러리 거르기' },
        chip('all', '전체'), chip('heart', '', Object.keys(libGet(LIBK.h)).length), chip('memo', '메모', Object.keys(libGet(LIBK.m)).length),
        ...libGet(LIBK.n).map((n) => chip('#' + n, '#' + n, cnt[n] || 0)),
        el('span', { class: 'sp' }), el('button', { type: 'button', 'aria-label': '백업', onclick: (e) => lib.menu(e.currentTarget) }, '⋯'));
      b.dataset.sig = sig;
      grid.parentElement.insertBefore(b, grid);
    },
    run() {
      if (!route.isLib(location.pathname)) return;
      lib.mark();
      const h = libGet(LIBK.h), m = libGet(LIBK.m);
      for (const c of document.querySelectorAll('.dllb')) {
        const id = c.dataset.dlp;
        let b = c.querySelector(':scope > .dllh');
        if (!b) {
          b = el('button', { type: 'button', class: 'dllh', 'aria-label': '좋아요' }, icon('hl'));
          b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); lib.toggle(id); });
          c.append(b);
        }
        b.classList.toggle('on', !!h[id]); b.setAttribute('aria-pressed', String(!!h[id]));
        c.classList.toggle('dlmo', !!m[id]);
        if (m[id]) c.title = m[id]; else c.removeAttribute('title');
        c.classList.toggle('dllx', !lib.ok(id));
      }
      lib.bar();
    },
    sheet(id) { // 카드 꾹: 내 태그 고르기·새 태그·한 줄 메모
      document.getElementById('dllsh')?.remove();
      const mine = new Set(libGet(LIBK.t)[id] || []);
      const cs = el('div', { class: 'cs' });
      const draw = () => cs.replaceChildren(...libGet(LIBK.n).map((n) => el('button', { type: 'button', class: mine.has(n) ? 'on' : '', onclick: () => { if (mine.has(n)) mine.delete(n); else mine.add(n); draw(); } }, n)));
      const nt = el('input', { class: 'in', placeholder: '＋ 새 태그', maxlength: '20', 'aria-label': '새 태그' });
      const addTag = () => {
        const v = nt.value.trim();
        if (!v) return;
        const all = libGet(LIBK.n);
        if (!all.includes(v)) store.set(LIBK.n, [...all, v]);
        mine.add(v); nt.value = ''; draw();
      };
      nt.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } });
      const mm = el('input', { class: 'in', placeholder: '한 줄 메모', maxlength: '200', 'aria-label': '메모', value: libGet(LIBK.m)[id] || '' });
      const close = () => { w.remove(); };
      const w = el('div', { id: 'dllsh', role: 'dialog', 'aria-label': id + ' 내 표시' },
        el('div', { class: 'bk', onclick: close }),
        el('div', { class: 'bx' }, el('div', { class: 'h' }, id), cs, nt, mm,
          el('div', { class: 'ft' }, el('button', { type: 'button', onclick: close }, '닫기'), el('button', { type: 'button', class: 'ok', onclick: () => {
            addTag();
            const t = { ...libGet(LIBK.t) }, m = { ...libGet(LIBK.m) }, v = mm.value.trim();
            if (mine.size) t[id] = [...mine]; else delete t[id];
            if (v) m[id] = v; else delete m[id];
            store.set(LIBK.t, t); store.set(LIBK.m, m); close(); lib.run();
          } }, '저장'))));
      draw();
      document.body.append(w);
    },
    menu(at) { // ⋯ 백업: 내보내기(JSON 파일) · 가져오기(합치기)
      document.getElementById('dlnmm')?.remove();
      const m = el('div', { id: 'dlnmm', role: 'menu' }, el('div', { class: 'h' }, '내 라이브러리 표시'));
      const close = () => { m.remove(); document.removeEventListener('pointerdown', away, true); };
      const away = (e) => { if (!m.contains(e.target)) close(); };
      m.append(el('button', { role: 'menuitem', onclick: () => {
        const blob = new Blob([JSON.stringify({ v: 1, heart: libGet(LIBK.h), tags: libGet(LIBK.t), memo: libGet(LIBK.m), names: libGet(LIBK.n) })], { type: 'application/json' });
        const a = el('a', { href: URL.createObjectURL(blob), download: 'dlsite-library-' + new Date().toISOString().slice(0, 10) + '.json' });
        document.body.append(a); a.click(); a.remove(); close();
      } }, '내보내기 (파일)'), el('button', { role: 'menuitem', onclick: () => {
        const f = el('input', { type: 'file', accept: 'application/json,.json' });
        f.addEventListener('change', () => { const r = f.files && f.files[0]; if (r) r.text().then(lib.import).catch(() => {}); });
        f.click(); close();
      } }, '가져오기 (합치기)'));
      document.body.append(m);
      const r = at.getBoundingClientRect();
      m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
      m.style.top = Math.min(innerHeight - m.offsetHeight - 8, r.bottom + 6) + 'px';
      setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
    },
    import(text) { // 들어오는 값은 모양을 검사해서 합친다(품번 모양·글자 수 제한)
      let j; try { j = JSON.parse(text); } catch (e) { return; }
      if (!j || typeof j !== 'object') return;
      const ID = /^[A-Z]{2}\d+$/, h = { ...libGet(LIBK.h) }, t = { ...libGet(LIBK.t) }, m = { ...libGet(LIBK.m) }, names = new Set(libGet(LIBK.n));
      const tag = (s) => typeof s === 'string' && s.trim() && s.length <= 20 ? s.trim() : '';
      for (const id of Object.keys(j.heart || {})) if (ID.test(id) && j.heart[id]) h[id] = 1;
      for (const [id, a] of Object.entries(j.tags || {})) if (ID.test(id) && Array.isArray(a)) { const ok = a.map(tag).filter(Boolean); if (ok.length) { t[id] = [...new Set([...(t[id] || []), ...ok])]; ok.forEach((n) => names.add(n)); } }
      for (const [id, s] of Object.entries(j.memo || {})) if (ID.test(id) && typeof s === 'string' && s.trim() && s.length <= 200) m[id] = s.trim();
      for (const n of Array.isArray(j.names) ? j.names : []) if (tag(n)) names.add(tag(n));
      store.set(LIBK.h, h); store.set(LIBK.t, t); store.set(LIBK.m, m); store.set(LIBK.n, [...names]);
      lib.run();
    },
  };
  // 카드 꾹(0.5초) = 위 sheet. 꾹 누른 뒤 따라오는 클릭(작품 열기)은 막는다. ♡·시트 위는 제외
  function libLongPress() {
    let timer = 0, x0 = 0, y0 = 0, hit = null;
    const cardOf = (e) => e.target.closest && !e.target.closest('.dllh, #dllsh, #dllib') && e.target.closest('.dllb');
    document.addEventListener('pointerdown', (e) => {
      const c = cardOf(e);
      clearTimeout(timer); hit = null;
      if (!c) return;
      x0 = e.clientX; y0 = e.clientY;
      timer = setTimeout(() => { hit = c; try { navigator.vibrate && navigator.vibrate(20); } catch (err) { /* 진동 안 됨 */ } lib.sheet(c.dataset.dlp); }, 500);
    }, true);
    document.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) clearTimeout(timer); }, true);
    for (const t of ['pointerup', 'pointercancel']) document.addEventListener(t, () => clearTimeout(timer), true);
    document.addEventListener('contextmenu', (e) => { if (cardOf(e)) e.preventDefault(); }, true);
    document.addEventListener('click', (e) => { if (hit && cardOf(e) === hit) { e.preventDefault(); e.stopPropagation(); hit = null; } }, true);
  }
  function tidy() {
    ageGateHide();
    lib.run();
    applyThumbBlur();
    applyReviewFirst();
    workDlw();
    workTrans();
    trBar();
    homeDlw();
    applyChipSize();
    tidyTitle();
    kwFix();
    sbox.attach();
    locale.enforce(false);
    syncSaleFilter();
    // 0.47.2: 매번 전체 재탐색(list.invalidate)하지 않고, 카드 목록이 실제로 바뀌었을 때만 무효화한다.
    // 사이트가 DOM을 조금씩 바꿀 때마다 O(카드수 × 트리깊이) 탐색이 돌던 것을 줄인다(스크롤 버벅임 개선).
    list.invalidateIfStale();
    clean.banners();
    clean.floors();
    popupSoon();
    coupon.learn();
    list.mount();
    if (route.isMy(location.pathname) || route.isRank(location.pathname)) list.scheduleApply(); // 0.49.0 즐겨찾기·장바구니 카드 장식(list.decoMy)
    voice.load();
    cart.paint();
  }
  let started = false;
  function start() {
    if (started || !document.body) return;
    started = true;
    (document.head || document.documentElement).append(el('style', {}, CSS));
    buildPanel();
    document.addEventListener('click', bulkPageReset, true);
    document.addEventListener('click', cart.pickClick, true); // 0.49.0 장바구니 고르기 중 카드 누름 = 체크
    nameLongPress();
    libLongPress();
    tidy();
    if (route.isMy(location.pathname) || route.isRank(location.pathname)) for (const ms of [1000, 3000, 6000]) setTimeout(() => list.scheduleApply(0), ms); // 0.49.2 사이트가 카드를 늦게 다시 그려도 DLW 줄을 다시 붙인다
    loadStrip();
    setTimeout(coupon.sweep, 8000);
    setTimeout(kw.load, 5000); // 태그 목록(한국어·일본어 각 1번, 7일에 한 번)
    let t = null;
    new MutationObserver((recs) => {
      if (onlyOurs(recs)) return;
      clearTimeout(t);
      t = setTimeout(tidy, 350);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body && document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();