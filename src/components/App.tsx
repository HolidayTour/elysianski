<?php
// index.php

// --------------------------------------------------------------------------
// 1. 설정 및 데이터베이스 초기화 (SQLite)
// --------------------------------------------------------------------------
$SHEET_ID = "1Celx7ApccgzrNwbw6VyZRqUG_zg1z_dp3WmBhTFDlF0";
$CSV_URL = "https://docs.google.com/spreadsheets/d/" . $SHEET_ID . "/export?format=csv&gid=1905716770";
$DB_FILE = __DIR__ . '/ski_tour.db';

// DB 연결 및 테이블 생성 (없을 경우)
try {
    $db = new PDO("sqlite:" . $DB_FILE);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 테이블: 좌석 배정 정보
    $db->exec("CREATE TABLE IF NOT EXISTS seat_assignments (
        team_id TEXT,
        seat_num INTEGER,
        passenger_id TEXT,
        passenger_name TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, seat_num)
    )");

    // 테이블: 탑승/체크 상태 정보
    $db->exec("CREATE TABLE IF NOT EXISTS passenger_status (
        passenger_id TEXT PRIMARY KEY,
        boarded INTEGER DEFAULT 0,
        distributed TEXT DEFAULT '{}', 
        memo TEXT DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

} catch (PDOException $e) {
    die("Database Error: " . $e->getMessage());
}

// --------------------------------------------------------------------------
// 2. API 처리 (POST 요청 - 데이터 저장)
// --------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    try {
        if ($action === 'assign_seat') {
            // 좌석 배정/해제
            $stmt = $db->prepare("REPLACE INTO seat_assignments (team_id, seat_num, passenger_id, passenger_name) VALUES (:tid, :snum, :pid, :pname)");
            $stmt->execute([
                ':tid' => $input['teamId'],
                ':snum' => $input['seatNum'],
                ':pid' => $input['passengerId'],
                ':pname' => $input['passengerName']
            ]);
            
            // 만약 승객 ID가 없으면(해제) 해당 로우 삭제 로직이 필요할 수 있으나, REPLACE로 덮어쓰거나 null 처리
            if (!$input['passengerId']) {
                $stmt = $db->prepare("DELETE FROM seat_assignments WHERE team_id = :tid AND seat_num = :snum");
                $stmt->execute([':tid' => $input['teamId'], ':snum' => $input['seatNum']]);
            }
            echo json_encode(['status' => 'success']);

        } elseif ($action === 'update_status') {
            // 탑승, 물품 배분, 메모 상태 업데이트
            $stmt = $db->prepare("REPLACE INTO passenger_status (passenger_id, boarded, distributed, memo) VALUES (:pid, :brd, :dist, :memo)");
            $stmt->execute([
                ':pid' => $input['passengerId'],
                ':brd' => $input['boarded'] ? 1 : 0,
                ':dist' => json_encode($input['distributed']),
                ':memo' => $input['memo']
            ]);
            echo json_encode(['status' => 'success']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        }
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

// --------------------------------------------------------------------------
// 3. 데이터 로딩 (GET 요청 - 초기 렌더링)
// --------------------------------------------------------------------------

// 3-1. CSV 데이터 가져오기
$csvData = [];
$phpError = null;
try {
    $context = stream_context_create(["http" => ["header" => "User-Agent: SkiApp\r\n"]]);
    $rawCsv = @file_get_contents($CSV_URL, false, $context);
    if ($rawCsv === false) throw new Exception("Google Sheet 연결 실패");
    $lines = explode("\n", $rawCsv);
    $csvData = array_map('str_getcsv', $lines);
} catch (Exception $e) {
    $phpError = $e->getMessage();
}

// 3-2. DB 데이터 가져오기 (좌석 및 상태)
$dbSeats = [];
$dbStatus = [];

$stmt = $db->query("SELECT * FROM seat_assignments");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $dbSeats[$row['team_id']][$row['seat_num']] = $row;
}

$stmt = $db->query("SELECT * FROM passenger_status");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $dbStatus[$row['passenger_id']] = [
        'boarded' => (bool)$row['boarded'],
        'distributed' => json_decode($row['distributed'], true) ?? [],
        'memo' => $row['memo']
    ];
}

$initialData = [
    'csv' => $csvData,
    'seats' => $dbSeats,
    'status' => $dbStatus
];
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Ski Tour Manager Pro</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* 좌석 애니메이션 */
        .seat-pop { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform: scale(0.8); }
        @keyframes popIn { to { opacity: 1; transform: scale(1); } }

        /* 모바일 전체 높이 고정 */
        .app-container { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
        .content-area { flex: 1; overflow-y: auto; padding-bottom: 80px; }
    </style>
</head>
<body class="bg-slate-100 text-slate-900">

<div id="app" class="app-container max-w-xl mx-auto bg-slate-50 relative shadow-2xl">
    
    <header id="header-container" class="flex-none sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm transition-all"></header>

    <main id="main-content" class="content-area p-4 space-y-4"></main>

    <nav class="flex-none bg-white border-t border-slate-200 px-6 py-2 pb-6 z-50">
        <div class="flex justify-between items-center" id="bottom-nav"></div>
    </nav>
</div>

<script>
    const INITIAL_DATA = <?php echo json_encode($initialData); ?>;
    const PHP_ERROR = "<?php echo $phpError; ?>";
</script>

<script>
/**
 * 1. 전역 상태 및 유틸리티
 */
const COLS = { TEAM: 0, GUIDE: 1, BUS_INFO: 2, CODE: 3, EVENT: 4, RES_NO: 5, NAME: 6, CONTACT: 7, APP_ID: 8, EMAIL: 9, LANG: 10, PAX: 11, PICKUP: 12, SHUTTLE: 13, SLED: 14, SIGHTSEEING: 15, MOVING: 16, LIFT: 17, EQUIP: 18, LESSON: 19, CLOTH_E: 20, CLOTH_S: 21, NOTE: 22 };

let state = {
    tab: 'home',
    selectedTeam: null,
    busSelectedTeam: null,
    rawData: [],
    groupedData: [],
    // DB에서 불러온 상태들
    dbSeats: INITIAL_DATA.seats || {},
    dbStatus: INITIAL_DATA.status || {}
};

// API 호출 함수
async function apiCall(action, payload) {
    try {
        const res = await fetch('index.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action, ...payload })
        });
        return await res.json();
    } catch (e) {
        console.error("API Error:", e);
        alert("서버 저장 실패: " + e.message);
    }
}

// A10 버그 수정을 위한 정렬 함수
function naturalSort(a, b) {
    return a.groupLabel.localeCompare(b.groupLabel, undefined, { numeric: true, sensitivity: 'base' });
}

function init() {
    if (PHP_ERROR) {
        document.getElementById('main-content').innerHTML = `<div class="p-8 text-center text-rose-500 font-bold">${PHP_ERROR}<br>새로고침 해주세요.</div>`;
        return;
    }
    state.rawData = parseRawData(INITIAL_DATA.csv);
    renderApp();
}

function parseRawData(rows) {
    if (!rows || rows.length < 2) return [];
    return rows.filter((row, idx) => {
        if (idx === 0) return false;
        const teamCol = row[COLS.TEAM] ? row[COLS.TEAM].trim() : '';
        return teamCol && !['팀구분', 'TEAM'].includes(teamCol);
    }).map((row, idx) => ({
        id: `${row[COLS.TEAM]}-${row[COLS.CODE]}-${idx}`, // 고유 ID
        team: row[COLS.TEAM].toUpperCase(),
        guide: row[COLS.GUIDE],
        code: row[COLS.CODE],
        event: row[COLS.EVENT],
        resNo: row[COLS.RES_NO],
        name: row[COLS.NAME],
        contact: row[COLS.CONTACT],
        appId: row[COLS.APP_ID],
        lang: row[COLS.LANG],
        pax: parseInt(row[COLS.PAX] || 0),
        pickup: row[COLS.PICKUP] ? row[COLS.PICKUP].trim() : '',
        busInfo: row[COLS.BUS_INFO],
        items: {
            lift: parseInt(row[COLS.LIFT] || 0),
            moving: parseInt(row[COLS.MOVING] || 0),
            sled: parseInt(row[COLS.SLED] || 0),
            shuttle: parseInt(row[COLS.SHUTTLE] || 0),
            equip: parseInt(row[COLS.EQUIP] || 0),
            lesson: parseInt(row[COLS.LESSON] || 0),
            clothE: parseInt(row[COLS.CLOTH_E] || 0),
            clothS: parseInt(row[COLS.CLOTH_S] || 0),
        }
    }));
}

function buildGroupedList(teamName) {
    const teamRows = state.rawData.filter(d => d.team === teamName);
    const groups = new Map();

    teamRows.forEach(item => {
        const key = (item.contact && item.contact.length > 5) 
            ? item.contact.replace(/[-\s]/g, '') 
            : (item.name || '').trim().toLowerCase();
            
        if (!groups.has(key)) {
            groups.set(key, { ...item, codes: [item.code], members: [item], items: { ...item.items } });
        } else {
            const g = groups.get(key);
            g.codes.push(item.code);
            g.members.push(item);
            g.pax += (item.pax || 0);
            Object.keys(g.items).forEach(k => { g.items[k] += (item.items?.[k] || 0); });
        }
    });

    // *** 핵심: A1, A2, ... A10 정렬 로직 적용 ***
    // 코드를 기준으로 먼저 정렬
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
        const codeA = a.codes?.[0] || "";
        const codeB = b.codes?.[0] || "";
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // 정렬된 순서대로 라벨 부여 (A1 ~ A10)
    return sortedGroups.map((g, i) => ({
        ...g, 
        groupLabel: `${teamName}${i+1}`
    }));
}

/**
 * 2. 렌더링 라우터
 */
function renderApp() {
    renderHeader();
    renderBottomNav();
    const content = document.getElementById('main-content');
    content.innerHTML = '';

    if (state.tab === 'home') {
        if (!state.selectedTeam) renderDashboard(content);
        else renderTeamDetail(content);
    } else if (state.tab === 'bus') {
        if (!state.busSelectedTeam) renderTeamSelector(content, 'bus');
        else renderBusManager(content);
    } else {
        content.innerHTML = `<div class="flex items-center justify-center h-64 text-slate-400">준비 중입니다.</div>`;
    }
    lucide.createIcons();
}

/**
 * 3. 컴포넌트: 대시보드
 */
function renderDashboard(container) {
    const teams = [...new Set(state.rawData.map(d => d.team))].sort();
    
    container.innerHTML = `<h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center"><i data-lucide="users" class="mr-2 text-blue-600"></i> 팀별 현황</h2>`;
    
    teams.forEach(team => {
        const teamData = state.rawData.filter(d => d.team === team);
        const totalPax = teamData.reduce((acc, cur) => acc + cur.pax, 0);
        const guide = teamData[0]?.guide || '미정';
        
        // 진행률 계산 (DB 기반)
        let boardedPax = 0;
        teamData.forEach(p => {
            if (state.dbStatus[p.id]?.boarded) boardedPax += p.pax;
        });
        const progress = totalPax > 0 ? Math.round((boardedPax / totalPax) * 100) : 0;

        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-4 cursor-pointer relative overflow-hidden active:scale-[0.98] transition-transform";
        card.onclick = () => { state.selectedTeam = team; state.groupedData = buildGroupedList(team); renderApp(); };
        
        card.innerHTML = `
            <div class="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
            <div class="flex justify-between items-start relative z-10">
                <div class="flex items-center">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm border mr-4 bg-white text-blue-600 border-blue-600">
                        ${team}
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 text-lg leading-tight">${guide}</h4>
                        <span class="text-xs text-slate-500 font-medium">총 ${totalPax}명</span>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-2xl font-black text-blue-600">${progress}%</span>
                </div>
            </div>
            <div class="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <div class="h-full bg-blue-600 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * 4. 컴포넌트: 팀 상세
 */
function renderTeamDetail(container) {
    const list = state.groupedData;
    
    list.forEach(item => {
        const status = state.dbStatus[item.id] || {};
        const isBoarded = status.boarded;
        const pickupColor = getPickupColorClass(item.pickup);
        
        // 코드에서 A10 같은 번호를 추출해서 뱃지에 표시
        // 정규식으로 숫자만 추출하거나, 하이픈 뒤 제거
        const codeDisplay = item.code.split('-')[1] || item.code; 

        const card = document.createElement('div');
        card.className = `rounded-2xl border shadow-sm bg-white mb-4 transition-all duration-300 ${isBoarded ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200'}`;
        
        card.innerHTML = `
            <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex gap-2">
                        <span class="font-black text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs border border-blue-200">${codeDisplay}</span>
                        <span class="font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded text-xs border border-slate-200">${item.resNo}</span>
                    </div>
                    <button onclick="toggleBoarding('${item.id}')" class="flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isBoarded ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}">
                        ${isBoarded ? '<i data-lucide="check" class="w-3 h-3 mr-1"></i>탑승완료' : '탑승확인'}
                    </button>
                </div>
                
                <h3 class="font-bold text-xl text-slate-900 leading-tight mb-2">${item.name}</h3>
                
                <div class="flex items-center gap-2 mb-3">
                    <span class="flex items-center text-xs font-bold text-slate-600"><i data-lucide="users" class="w-3 h-3 mr-1"></i> ${item.pax}명</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${pickupColor}">${item.pickup}</span>
                </div>

                <div class="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs text-slate-500">
                    ${item.event || '이벤트 정보 없음'}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleBoarding(id) {
    const current = state.dbStatus[id]?.boarded || false;
    const newState = !current;
    
    // 로컬 상태 즉시 반영 (낙관적 업데이트)
    if (!state.dbStatus[id]) state.dbStatus[id] = {};
    state.dbStatus[id].boarded = newState;
    renderTeamDetail(document.getElementById('main-content'));
    
    // 서버 전송
    apiCall('update_status', {
        passengerId: id,
        boarded: newState,
        distributed: state.dbStatus[id].distributed || {},
        memo: state.dbStatus[id].memo || ''
    });
}

/**
 * 5. 컴포넌트: 버스 관리 (좌석 배치도)
 */
function renderTeamSelector(container) {
    const teams = [...new Set(state.rawData.map(d => d.team))].sort();
    container.innerHTML = `<h2 class="text-lg font-bold text-slate-800 mb-4">버스 관리할 팀 선택</h2>`;
    teams.forEach(team => {
        const btn = document.createElement('div');
        btn.className = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-3 font-bold text-lg cursor-pointer hover:border-blue-400 active:bg-slate-50 flex justify-between items-center";
        btn.innerHTML = `<span>${team}팀</span> <i data-lucide="chevron-right" class="text-slate-300"></i>`;
        btn.onclick = () => {
            state.busSelectedTeam = team;
            state.groupedData = buildGroupedList(team);
            renderApp();
        };
        container.appendChild(btn);
    });
}

function renderBusManager(container) {
    // 자동 배차 버튼
    const controls = document.createElement('div');
    controls.className = "sticky top-0 z-20 bg-slate-100 pt-2 pb-4"; // 스티키 헤더
    controls.innerHTML = `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <h3 class="font-bold text-slate-700">좌석 배치 (${state.busSelectedTeam}팀)</h3>
            <button onclick="runAutoAssign()" class="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-slate-700">
                자동 배차
            </button>
        </div>
    `;
    container.appendChild(controls);

    // 버스 컨테이너 (스크롤 가능)
    const busWrap = document.createElement('div');
    busWrap.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-inner min-h-[500px]";
    
    // 운전석
    busWrap.innerHTML = `
        <div class="flex justify-center mb-6 border-b border-slate-100 pb-2">
            <span class="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">FRONT (운전석)</span>
        </div>
    `;

    const grid = document.createElement('div');
    // 2-1-2 구조 (좌석2, 통로, 좌석2)
    grid.className = "grid grid-cols-[1fr_1fr_0.4fr_1fr_1fr] gap-x-2 gap-y-3";

    // 11줄 생성 (44석 기준)
    for (let row = 0; row < 11; row++) {
        const seats = [row*4+1, row*4+2, 'aisle', row*4+3, row*4+4];
        seats.forEach(item => {
            if (item === 'aisle') {
                const aisle = document.createElement('div'); // 통로
                grid.appendChild(aisle);
            } else {
                if (item <= 45) { // 45인승까지 커버
                    grid.appendChild(renderSeatCard(item));
                }
            }
        });
    }

    busWrap.appendChild(grid);
    container.appendChild(busWrap);
}

// *** 핵심: 좌석 카드 디자인 (이미지 완벽 매칭) ***
function renderSeatCard(seatNum) {
    const teamId = state.busSelectedTeam;
    // DB에서 좌석 정보 확인
    const assignInfo = state.dbSeats[teamId]?.[seatNum];
    let passenger = null;
    
    if (assignInfo) {
        // 그룹 데이터에서 해당 승객 찾기
        passenger = state.groupedData.find(g => g.id === assignInfo.passenger_id);
    }

    const el = document.createElement('div');
    // 디자인 베이스: 둥근 모서리, 흰 배경, 회색 테두리
    let baseClass = "relative aspect-[4/5] rounded-xl border flex flex-col items-center justify-between overflow-hidden cursor-pointer transition-all seat-pop select-none ";
    
    if (!passenger) {
        // 빈 좌석
        el.className = baseClass + "bg-white border-slate-200 hover:border-blue-300 border-dashed";
        el.innerHTML = `<span class="text-slate-300 font-bold text-lg m-auto">${seatNum}</span>`;
    } else {
        // 채워진 좌석 (이미지 스타일)
        const groupLabel = passenger.groupLabel; // A9, B2 등
        const pax = passenger.pax;
        const isHot = passenger.event && passenger.event.includes('HOT');
        const platform = getPlatformInfo(passenger); // K or Q
        const langInfo = getLangInfo(passenger.lang);
        const pickupShort = getPickupShort(passenger.pickup);
        const pickupColor = getPickupBadgeColor(pickupShort);

        el.className = baseClass + "bg-white border-slate-300 shadow-sm active:scale-95";
        
        el.innerHTML = `
            <div class="w-full flex justify-between items-start p-1.5">
                <span class="text-slate-500 font-bold text-sm leading-none">${seatNum}</span>
                <div class="flex items-center gap-0.5">
                    ${isHot ? `<i data-lucide="flame" class="w-3.5 h-3.5 text-red-500 fill-red-500"></i>` : ''}
                    ${platform ? `<span class="text-lg font-black ${platform.color} leading-none -mt-1 ml-0.5">${platform.label}</span>` : ''}
                </div>
            </div>

            <div class="absolute inset-0 flex items-center justify-center pointer-events-none mt-1">
                <span class="text-[2.6rem] font-black text-slate-700 tracking-tighter leading-none">${groupLabel}</span>
            </div>

            <div class="w-full flex justify-between items-end p-1.5 relative z-10">
                <div class="text-slate-700 font-black text-lg leading-none flex items-baseline">
                    ${pax}<span class="text-[10px] text-slate-400 ml-0.5">명</span>
                </div>
                
                <div class="flex flex-col items-end gap-0.5">
                    <span class="${langInfo.color} font-bold text-[10px]">${langInfo.text}</span>
                    <div class="w-6 h-6 rounded-full ${pickupColor} flex items-center justify-center text-xs font-black shadow-sm border border-white">
                        ${pickupShort}
                    </div>
                </div>
            </div>
        `;
    }
    
    // 클릭 이벤트 (배정 해제 등)
    el.onclick = () => {
        if (passenger) {
            if (confirm(`${seatNum}번 좌석 (${passenger.name}) 배정을 취소할까요?`)) {
                // DB 업데이트
                apiCall('assign_seat', { teamId, seatNum, passengerId: null, passengerName: null });
                // 로컬 상태 업데이트
                delete state.dbSeats[teamId][seatNum];
                // 리렌더링
                renderBusManager(document.getElementById('main-content').lastChild.parentNode);
            }
        } else {
            alert('자동 배차 버튼을 사용해주세요.');
        }
    };

    return el;
}

// 자동 배차 알고리즘
async function runAutoAssign() {
    if (!state.busSelectedTeam) return;
    
    // 이미 배정된 좌석 제외하고 로직을 짜거나, 전체 재배정. 여기선 전체 재배정 로직(덮어쓰기)
    const groups = [...state.groupedData].sort((a, b) => b.pax - a.pax); // 인원 많은 순
    let seatIdx = 1;
    
    // DB 업데이트를 위한 배치
    const teamId = state.busSelectedTeam;
    // 기존 배정 초기화 (메모리상) -> DB는 REPLACE로 덮어씌움
    state.dbSeats[teamId] = {}; 

    for (const group of groups) {
        let needed = group.pax;
        while(needed > 0 && seatIdx <= 45) {
            // 통로 로직: 45인승은 보통 쭉 채움.
            
            // DB 전송
            await apiCall('assign_seat', {
                teamId: teamId,
                seatNum: seatIdx,
                passengerId: group.id,
                passengerName: group.name
            });
            
            // 로컬 반영
            state.dbSeats[teamId][seatIdx] = {
                team_id: teamId, seat_num: seatIdx, passenger_id: group.id, passenger_name: group.name
            };

            seatIdx++;
            needed--;
        }
    }
    renderBusManager(document.getElementById('main-content').lastChild.parentNode);
}

/**
 * 헬퍼 함수들 (디자인용)
 */
function getPickupShort(pickup) {
    if (!pickup) return '';
    if (pickup.includes('홍대')) return '홍';
    if (pickup.includes('명동')) return '명';
    if (pickup.includes('동대문')) return '동';
    if (pickup.includes('스키장')) return '스';
    return pickup.substring(0, 1);
}

function getPickupBadgeColor(short) {
    if (short === '홍') return 'bg-green-100 text-green-700';
    if (short === '명') return 'bg-sky-100 text-sky-700';
    if (short === '동') return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-500';
}

function getPlatformInfo(item) {
    const resNo = (item.resNo || '').toUpperCase();
    if (resNo.includes('KK')) return { label: 'K', color: 'text-cyan-500' };
    if (/[A-Z0-9]{6,}/.test(resNo) && !resNo.startsWith('TK')) return { label: 'K', color: 'text-orange-500' };
    if (resNo.includes('Q')) return { label: 'Q', color: 'text-emerald-500' };
    return null;
}

function getLangInfo(lang) {
    const lower = (lang || '').toLowerCase();
    if (lower.includes('cn') || lower.includes('중국')) return { text: '中文', color: 'text-red-600' };
    if (lower.includes('en') || lower.includes('영어')) return { text: 'ENG', color: 'text-blue-600' };
    return { text: 'KR', color: 'text-slate-400' };
}

function getPickupColorClass(pickup) {
    if (!pickup) return 'text-slate-400 border-slate-200';
    if (pickup.includes('홍대')) return 'text-green-600 border-green-600 bg-green-50';
    if (pickup.includes('명동')) return 'text-sky-600 border-sky-600 bg-sky-50';
    return 'text-slate-700 border-slate-700';
}

/**
 * 헤더 & 네비게이션 렌더링
 */
function renderHeader() {
    const header = document.getElementById('header-container');
    let title = 'Ski Tour Manager';
    let leftBtn = '';
    
    if (state.tab === 'home' && state.selectedTeam) {
        title = `${state.selectedTeam}팀 상세`;
        leftBtn = `<button onclick="state.selectedTeam=null; renderApp()" class="p-2 -ml-2"><i data-lucide="chevron-left"></i></button>`;
    } else if (state.tab === 'bus' && state.busSelectedTeam) {
        title = `${state.busSelectedTeam}팀 좌석 배치`;
        leftBtn = `<button onclick="state.busSelectedTeam=null; renderApp()" class="p-2 -ml-2"><i data-lucide="chevron-left"></i></button>`;
    }

    header.innerHTML = `
        <div class="px-4 py-3 flex items-center h-14">
            ${leftBtn}
            <h1 class="font-bold text-lg text-slate-800 flex-1 ${leftBtn ? 'ml-2' : ''}">${title}</h1>
        </div>
    `;
}

function renderBottomNav() {
    const nav = document.getElementById('bottom-nav');
    const tabs = [
        { id: 'home', label: '홈', icon: 'home' },
        { id: 'bus', label: '버스', icon: 'bus' },
    ];
    
    nav.innerHTML = tabs.map(t => {
        const isActive = state.tab === t.id;
        const colorClass = isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400';
        return `
            <button onclick="state.tab='${t.id}'; renderApp()" class="flex flex-col items-center justify-center p-2 rounded-xl w-full transition-all ${colorClass}">
                <i data-lucide="${t.icon}" class="w-6 h-6 mb-1 ${isActive ? 'stroke-2' : 'stroke-1'}"></i>
                <span class="text-[10px] font-bold">${t.label}</span>
            </button>
        `;
    }).join('');
}

// 시작
init();
</script>
</body>
</html>
