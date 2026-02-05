<?php
// index.php

// *** 설정 ***
$SHEET_ID = "1Celx7ApccgzrNwbw6VyZRqUG_zg1z_dp3WmBhTFDlF0";
$CSV_URL = "https://docs.google.com/spreadsheets/d/" . $SHEET_ID . "/export?format=csv&gid=1905716770";

// *** PHP 데이터 처리 (CSV 가져오기) ***
$csvData = [];
$error = null;

try {
    $context = stream_context_create([
        "http" => ["header" => "User-Agent: PHPScript\r\n"]
    ]);
    $rawCsv = @file_get_contents($CSV_URL, false, $context);

    if ($rawCsv === false) {
        throw new Exception("Google Sheet 데이터를 불러올 수 없습니다.");
    }

    $lines = explode("\n", $rawCsv);
    $csvData = array_map('str_getcsv', $lines);
} catch (Exception $e) {
    $error = $e->getMessage();
}

// JSON 형태로 JS에 넘겨줄 데이터 준비
$jsonData = json_encode($csvData);
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Ski Tour Bus Manager (PHP)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        /* 좌석 카드 애니메이션 */
        .seat-enter { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; transform: scale(0.8); }
        @keyframes popIn { to { opacity: 1; transform: scale(1); } }
    </style>
</head>
<body class="bg-slate-50 text-slate-900 pb-20">

<div id="app" class="max-w-xl mx-auto min-h-screen bg-slate-50 relative">
    
    <header id="header-container" class="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm"></header>

    <main id="main-content" class="p-4 space-y-4"></main>

    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 pb-6 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] max-w-xl mx-auto">
        <div class="flex justify-between items-center" id="bottom-nav">
            </div>
    </nav>
</div>

<script>
    const RAW_CSV_DATA = <?php echo $jsonData; ?>;
    const PHP_ERROR = "<?php echo $error; ?>";
</script>

<script>
/**
 * 유틸리티 및 전역 설정
 */
const COLS = { TEAM: 0, GUIDE: 1, BUS_INFO: 2, CODE: 3, EVENT: 4, RES_NO: 5, NAME: 6, CONTACT: 7, APP_ID: 8, EMAIL: 9, LANG: 10, PAX: 11, PICKUP: 12, SHUTTLE: 13, SLED: 14, SIGHTSEEING: 15, MOVING: 16, LIFT: 17, EQUIP: 18, LESSON: 19, CLOTH_E: 20, CLOTH_S: 21, NOTE: 22 };

// 상태 관리
let state = {
    tab: 'home',
    selectedTeam: null,
    busSelectedTeam: null,
    rawData: [],
    groupedData: [], // 현재 선택된 팀의 그룹화된 데이터
    appState: JSON.parse(localStorage.getItem('guide_pro_state_vphp') || '{}'),
    seatMap: {}, // 현재 팀의 좌석 정보
    blockedSeats: []
};

// *** 중요: A10 버그 수정을 위한 문자열 파싱 함수 ***
function getCodeBadge(code) {
    if (!code) return '';
    // 기존 오류 로직: code.substring(0, 2) -> A10을 A1로 만듦
    // 수정 로직: 숫자가 포함되어 있다면 전체를 표시하거나, 하이픈 제거 후 표시
    return code.replace('-', '');
}

/**
 * 데이터 파싱 및 초기화
 */
function init() {
    if (PHP_ERROR) {
        document.getElementById('main-content').innerHTML = `<div class="p-8 text-center text-rose-500 font-bold">${PHP_ERROR}</div>`;
        return;
    }
    
    // CSV 데이터를 객체로 변환
    state.rawData = parseRawData(RAW_CSV_DATA);
    renderApp();
}

function parseRawData(rows) {
    if (!rows || rows.length < 2) return [];
    
    // 헤더 제외하고 데이터 필터링
    return rows.filter((row, idx) => {
        if (idx === 0) return false;
        const teamCol = row[COLS.TEAM] ? row[COLS.TEAM].trim() : '';
        if (!teamCol || ['팀구분', 'TEAM'].includes(teamCol)) return false;
        return true;
    }).map((row, idx) => ({
        id: `${row[COLS.TEAM]}-${row[COLS.CODE]}-${idx}`,
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

/**
 * 데이터 그룹화 로직 (JS 로직 이식)
 */
function buildGroupedList(teamName) {
    const teamRows = state.rawData.filter(d => d.team === teamName);
    const groups = new Map();

    teamRows.forEach(item => {
        // 키 생성: 연락처가 있으면 연락처, 없으면 이름
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

    // 정렬 (A1, A2, ... A10 순서 보장 - Natural Sort)
    return Array.from(groups.values()).map((g, i) => ({
        ...g, 
        groupLabel: `${teamName}${i+1}` // 임의 그룹 번호 부여
    })).sort((a, b) => {
        const codeA = a.codes?.[0] || "";
        const codeB = b.codes?.[0] || "";
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

/**
 * 렌더링 라우터
 */
function renderApp() {
    renderHeader();
    renderBottomNav();
    
    const content = document.getElementById('main-content');
    content.innerHTML = '';

    if (state.tab === 'home') {
        if (!state.selectedTeam) {
            renderDashboard(content);
        } else {
            renderTeamDetail(content);
        }
    } else if (state.tab === 'bus') {
        if (!state.busSelectedTeam) {
            renderTeamSelector(content, 'bus');
        } else {
            renderBusManager(content);
        }
    } else {
        content.innerHTML = `<div class="flex items-center justify-center h-64 text-slate-400">준비 중입니다.</div>`;
    }
    
    lucide.createIcons(); // 아이콘 렌더링
}

/**
 * 컴포넌트: 대시보드 (팀 목록)
 */
function renderDashboard(container) {
    const teams = [...new Set(state.rawData.map(d => d.team))].sort();
    
    const title = document.createElement('h2');
    title.className = "text-lg font-bold text-slate-800 mb-4 flex items-center";
    title.innerHTML = `<i data-lucide="users" class="mr-2 text-blue-600 w-5 h-5"></i> 팀별 현황`;
    container.appendChild(title);

    teams.forEach(team => {
        const teamData = state.rawData.filter(d => d.team === team);
        const totalPax = teamData.reduce((acc, cur) => acc + cur.pax, 0);
        const guide = teamData[0]?.guide || '미정';
        
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-4 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden";
        card.onclick = () => { state.selectedTeam = team; state.groupedData = buildGroupedList(team); renderApp(); };
        
        // 배경 장식
        card.innerHTML = `
            <div class="absolute right-0 top-0 w-20 h-20 rounded-bl-full opacity-10 bg-blue-600"></div>
            <div class="flex items-center">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm border mr-4 bg-white text-blue-600 border-blue-600">
                    ${team}
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 text-lg leading-tight mb-1">${guide}</h4>
                    <span class="text-xs text-slate-500 font-medium">총 ${totalPax}명</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * 컴포넌트: 팀 상세 (리스트)
 */
function renderTeamDetail(container) {
    const list = state.groupedData;
    
    list.forEach(item => {
        const isBoarded = state.appState[item.id]?.boarded;
        const pickupColor = getPickupColorClass(item.pickup);
        const codeDisplay = getCodeBadge(item.code); // A10 버그 수정 적용

        const card = document.createElement('div');
        card.className = `rounded-2xl border shadow-sm bg-white mb-4 transition-all duration-300 ${isBoarded ? 'border-blue-200 bg-blue-50/10' : 'border-slate-200'}`;
        
        card.innerHTML = `
            <div class="p-4">
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-2">
                        <div class="flex items-center justify-center px-2 h-8 rounded-lg shadow-sm border text-sm font-black bg-white text-slate-700 border-slate-200">
                            ${codeDisplay}
                        </div>
                        <span class="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">${item.resNo}</span>
                    </div>
                    <button onclick="toggleBoarding('${item.id}')" class="flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isBoarded ? 'bg-white border-blue-600 text-blue-600 shadow-sm' : 'bg-white text-slate-400 border-slate-200'}">
                        ${isBoarded ? '탑승완료' : '탑승'}
                    </button>
                </div>
                <div class="flex items-center gap-1.5 mb-2">
                    <h3 class="font-bold text-xl text-slate-900 leading-none">${item.name}</h3>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="flex items-center text-xs font-bold text-slate-600"><i data-lucide="users" class="w-3 h-3 mr-0.5"></i> ${item.pax}명</span>
                    <div class="px-2 py-0.5 rounded text-[10px] font-bold border ${pickupColor}">${item.pickup}</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * 컴포넌트: 팀 선택기 (버스용)
 */
function renderTeamSelector(container, type) {
    const teams = [...new Set(state.rawData.map(d => d.team))].sort();
    container.innerHTML = `<h2 class="text-lg font-bold text-slate-800 mb-4">팀을 선택하세요</h2>`;
    
    teams.forEach(team => {
        const btn = document.createElement('div');
        btn.className = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-3 font-bold text-lg cursor-pointer hover:bg-slate-50";
        btn.innerText = `${team}팀 버스 관리`;
        btn.onclick = () => {
            state.busSelectedTeam = team;
            state.groupedData = buildGroupedList(team);
            // 저장된 좌석 정보 불러오기
            const savedMap = localStorage.getItem(`tm_seatMap_${team}`);
            state.seatMap = savedMap ? JSON.parse(savedMap) : {};
            renderApp();
        };
        container.appendChild(btn);
    });
}

/**
 * 컴포넌트: 버스 매니저 (좌석 배치도)
 */
function renderBusManager(container) {
    // 자동 배차 버튼 영역
    const controls = document.createElement('div');
    controls.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-4";
    controls.innerHTML = `
        <h3 class="font-bold text-slate-700 mb-3 flex items-center"><i data-lucide="settings" class="w-4 h-4 mr-2"></i> 자동 배차</h3>
        <button onclick="runAutoAssign()" class="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all flex justify-center items-center">
            <i data-lucide="arrow-right-left" class="w-4 h-4 mr-2"></i> 자동 배차 실행
        </button>
    `;
    container.appendChild(controls);

    // 좌석 지도 영역
    const mapContainer = document.createElement('div');
    mapContainer.className = "bg-slate-100 p-3 rounded-xl border border-slate-300";
    
    // 운전석 표시
    mapContainer.innerHTML = `<div class="text-center text-xs text-slate-400 mb-3 font-bold border-b border-slate-200 pb-2">FRONT (운전석)</div>`;
    
    const grid = document.createElement('div');
    // 5열 그리드 (좌2 - 통로 - 우2)
    grid.className = "grid grid-cols-5 gap-2"; 

    // 11줄 (총 44석 가정)
    for (let row = 0; row < 10; row++) {
        const seatsInRow = [row*4+1, row*4+2, null, row*4+3, row*4+4];
        seatsInRow.forEach(seatNum => {
            if (seatNum === null) {
                // 통로
                const aisle = document.createElement('div');
                grid.appendChild(aisle);
            } else {
                grid.appendChild(renderBusSeat(seatNum));
            }
        });
    }
    // 마지막 줄 (5석)
    [41, 42, 43, 44, 45].forEach(num => {
         // 마지막 줄은 통로 없이 5개 꽉 채우거나 로직에 따라 다름. 여기선 45인승 기준 예시
         if(num === 43) {
            // 통로 자리에 보조석이 있거나 비우거나. 이미지를 위해 비움 처리
            const aisle = document.createElement('div');
            grid.appendChild(aisle);
         } else {
             // 43번 제외하고 배치하거나 45인승 로직 추가 필요. 
             // 단순화를 위해 41,42,(통로),43,44로 처리 (44인승)
             if(num <= 44) grid.appendChild(renderBusSeat(num > 42 ? num-1 : num)); // 번호 보정
         }
    });

    mapContainer.appendChild(grid);
    container.appendChild(mapContainer);
}

/**
 * *** 핵심: 좌석 카드 렌더링 (이미지 디자인 적용) ***
 */
function renderBusSeat(seatNum) {
    const passenger = state.seatMap[seatNum];
    const el = document.createElement('div');
    
    // 기본 스타일 (빈 좌석)
    let className = "aspect-[4/5] bg-white rounded-lg border border-slate-300 shadow-sm flex flex-col items-center justify-center relative cursor-pointer hover:border-blue-400 transition-all seat-enter";
    let content = `<span class="text-slate-300 font-bold text-sm absolute top-1 left-2">${seatNum}</span>`;

    if (passenger) {
        // 데이터 추출
        const groupLabel = passenger.groupLabel || 'A1'; // 그룹명 (예: A4)
        const pax = passenger.pax;
        const pickupShort = getPickupShort(passenger.pickup);
        const pickupClass = getPickupBadgeColor(pickupShort);
        const isHot = passenger.event && passenger.event.includes('HOT');
        const platform = getPlatformInfo(passenger); // K or Q
        const lang = getLangFlag(passenger.lang);

        // 스타일 (채워진 좌석)
        className = "aspect-[4/5] bg-white rounded-lg border-b-4 border-slate-300 shadow-sm flex flex-col justify-between relative cursor-pointer hover:brightness-95 transition-all seat-enter overflow-hidden p-1";
        
        // 이미지와 동일한 레이아웃 구성
        content = `
            <div class="flex justify-between items-start w-full pl-1 pr-0.5 pt-0.5">
                <span class="text-slate-400 font-bold text-lg leading-none tracking-tighter">${seatNum}</span>
                <div class="flex gap-0.5 items-center">
                    <div class="border border-orange-300 text-orange-500 rounded-[3px] w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-white leading-none pt-0.5">무</div>
                    ${isHot ? `<i data-lucide="flame" class="w-4 h-4 text-red-500 fill-red-500"></i>` : ''}
                    ${platform ? `<span class="text-xl font-black ${platform.color} leading-none ml-[-2px]">${platform.label}</span>` : ''}
                </div>
            </div>

            <div class="absolute inset-0 flex items-center justify-center pointer-events-none mt-1">
                <span class="text-[2.8rem] font-black text-slate-700 tracking-tighter leading-none">${groupLabel}</span>
            </div>

            <div class="flex justify-between items-end w-full px-1 pb-0.5 relative z-10">
                <span class="text-lg font-black text-slate-700 leading-none">${pax}<span class="text-[10px] font-bold text-slate-400 ml-0.5">명</span></span>
                
                <div class="mb-0.5">${lang}</div>

                <div class="w-6 h-6 rounded-full ${pickupClass} flex items-center justify-center text-xs font-black shadow-sm border border-white">
                    ${pickupShort}
                </div>
            </div>
        `;
    }

    el.className = className;
    el.innerHTML = content;
    el.onclick = () => handleSeatClick(seatNum, passenger);
    
    return el;
}

/**
 * 로직: 좌석 클릭
 */
function handleSeatClick(seatNum, passenger) {
    if (!state.busSelectedTeam) return;

    // 현재 선택된 승객이 있으면 자리 교체, 없으면 할당 해제 등 복잡한 로직이 들어가지만
    // 여기서는 단순화를 위해 비어있으면 목록에서 첫번째 미배정 그룹을 넣는 로직을 넣거나,
    // 상세 구현은 생략하고 alert으로 대체합니다.
    if(passenger) {
        if(confirm(`${seatNum}번 좌석 (${passenger.name}) 배정을 취소하시겠습니까?`)) {
            delete state.seatMap[seatNum];
            saveSeatMap();
            renderBusManager(document.getElementById('main-content').lastChild.parentNode); // Re-render
        }
    } else {
        alert("좌석 배정을 위해서는 '자동 배차'를 이용해주세요.");
    }
}

/**
 * 로직: 자동 배차 (알고리즘)
 */
function runAutoAssign() {
    if (!state.busSelectedTeam) return;
    
    // 인원 많은 순 정렬
    const groups = [...state.groupedData].sort((a, b) => b.pax - a.pax);
    const newMap = {};
    let seatIdx = 1;

    groups.forEach(group => {
        let needed = group.pax;
        while(needed > 0 && seatIdx <= 44) {
            // 통로(3열) 건너뛰기 로직이 필요하면 추가. 여기서는 단순 순차 배정
            newMap[seatIdx] = group;
            seatIdx++;
            needed--;
        }
    });

    state.seatMap = newMap;
    saveSeatMap();
    renderBusManager(document.getElementById('main-content').lastChild.parentNode);
}

function saveSeatMap() {
    localStorage.setItem(`tm_seatMap_${state.busSelectedTeam}`, JSON.stringify(state.seatMap));
}

// *** 헬퍼 함수들 ***

function toggleBoarding(id) {
    if (!state.appState[id]) state.appState[id] = {};
    state.appState[id].boarded = !state.appState[id].boarded;
    localStorage.setItem('guide_pro_state_vphp', JSON.stringify(state.appState));
    renderApp();
}

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
    return 'bg-slate-100 text-slate-600';
}

function getPlatformInfo(item) {
    const resNo = (item.resNo || '').toUpperCase();
    if (resNo.includes('KK')) return { label: 'K', color: 'text-cyan-500' };
    if (/[A-Z0-9]{6,}/.test(resNo) && !resNo.startsWith('TK')) return { label: 'K', color: 'text-orange-500' };
    if (resNo.includes('Q')) return { label: 'Q', color: 'text-emerald-500' };
    return null;
}

function getLangFlag(lang) {
    const lower = (lang || '').toLowerCase();
    if (lower.includes('cn') || lower.includes('중국')) return '<span class="text-red-600 font-bold text-xs">中文</span>';
    if (lower.includes('en') || lower.includes('영어')) return '<span class="text-blue-600 font-bold text-xs">ENG</span>';
    return '<span class="text-slate-400 font-bold text-xs">KR</span>';
}

function getPickupColorClass(pickup) {
    if (!pickup) return 'text-slate-400 border-slate-200';
    if (pickup.includes('홍대')) return 'text-green-600 border-green-600 bg-green-50';
    if (pickup.includes('명동')) return 'text-sky-600 border-sky-600 bg-sky-50';
    if (pickup.includes('동대문')) return 'text-purple-600 border-purple-600 bg-purple-50';
    return 'text-slate-700 border-slate-700';
}

// UI 렌더링 (헤더/네비)
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
        { id: 'msg', label: '메시지', icon: 'message-square' },
    ];
    
    nav.innerHTML = tabs.map(t => {
        const isActive = state.tab === t.id;
        const colorClass = isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400';
        return `
            <button onclick="state.tab='${t.id}'; renderApp()" class="flex flex-col items-center justify-center p-2 rounded-xl w-16 transition-all ${colorClass}">
                <i data-lucide="${t.icon}" class="w-6 h-6 mb-1 ${isActive ? 'stroke-2' : 'stroke-1'}"></i>
                <span class="text-[10px] font-bold">${t.label}</span>
            </button>
        `;
    }).join('');
}

// 실행
init();

</script>
</body>
</html>
