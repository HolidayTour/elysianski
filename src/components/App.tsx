<?php
// =========================================================
// index.php (DB-backed) - Single File
// =========================================================
header("Content-Type: text/html; charset=UTF-8");

// ---- [DB CONFIG] 반드시 수정 ----
const DB_HOST = "localhost";
const DB_NAME = "DB이름";
const DB_USER = "DB아이디";
const DB_PASS = "DB비번";

// ---- [GOOGLE SHEET] 고정 ----
const SHEET_ID = "1Celx7ApccgzrNwbw6VyZRqUG_zg1z_dp3WmBhTFDlF0";
const CSV_GID  = "1905716770";
const CSV_URL  = "https://docs.google.com/spreadsheets/d/".SHEET_ID."/export?format=csv&gid=".CSV_GID;

// ---- PDO ----
function pdo() : PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $dsn = "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4";
  $pdo = new PDO($dsn, DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}

function json_out($data, int $code=200) {
  http_response_code($code);
  header("Content-Type: application/json; charset=UTF-8");
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function read_json_body(): array {
  $raw = file_get_contents("php://input");
  if (!$raw) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

// ---- API ROUTER ----
if (isset($_GET["api"])) {
  try {
    $pdo = pdo();
    $body = read_json_body();

    $action  = $_GET["api"];
    $tourKey = trim($body["tour_key"] ?? "");   // ex) 2026-02-05
    $team    = strtoupper(trim($body["team"] ?? ""));

    if (!$tourKey) $tourKey = date("Y-m-d");
    if ($team && !preg_match('/^[A-Z0-9]{1,8}$/', $team)) $team = "";

    // ---------- LOAD ALL STATE FOR A TEAM ----------
    if ($action === "load_team") {
      if (!$team) json_out(["ok"=>false, "msg"=>"team required"], 400);

      // state
      $stmt = $pdo->prepare("SELECT group_id, boarded, memo, dist_json FROM tm_state WHERE tour_key=? AND team=?");
      $stmt->execute([$tourKey, $team]);
      $rows = $stmt->fetchAll();

      $state = [];
      foreach ($rows as $r) {
        $state[$r["group_id"]] = [
          "boarded" => (int)$r["boarded"] === 1,
          "memo"    => $r["memo"] ?? "",
          "dist"    => $r["dist_json"] ? json_decode($r["dist_json"], true) : new stdClass(),
        ];
      }

      // seat map
      $stmt = $pdo->prepare("SELECT bus_size, blocked_json, seat_json FROM tm_seatmap WHERE tour_key=? AND team=?");
      $stmt->execute([$tourKey, $team]);
      $seatRow = $stmt->fetch();

      $seatmap = [
        "bus_size" => $seatRow ? (int)$seatRow["bus_size"] : 44,
        "blocked"  => $seatRow && $seatRow["blocked_json"] ? json_decode($seatRow["blocked_json"], true) : [],
        "seats"    => $seatRow && $seatRow["seat_json"] ? json_decode($seatRow["seat_json"], true) : new stdClass(),
      ];

      // settings
      $stmt = $pdo->prepare("SELECT guide_name, global_notice FROM tm_settings WHERE tour_key=? AND team=?");
      $stmt->execute([$tourKey, $team]);
      $setRow = $stmt->fetch();

      json_out([
        "ok"=>true,
        "tour_key"=>$tourKey,
        "team"=>$team,
        "state"=>$state,
        "seatmap"=>$seatmap,
        "settings"=>[
          "guide_name"=>$setRow["guide_name"] ?? "",
          "global_notice"=>$setRow["global_notice"] ?? "",
        ]
      ]);
    }

    // ---------- UPSERT GROUP STATE ----------
    if ($action === "save_group") {
      if (!$team) json_out(["ok"=>false, "msg"=>"team required"], 400);

      $groupId = trim($body["group_id"] ?? "");
      if (!$groupId) json_out(["ok"=>false, "msg"=>"group_id required"], 400);

      $boarded = !empty($body["boarded"]) ? 1 : 0;
      $memo    = (string)($body["memo"] ?? "");
      $dist    = $body["dist"] ?? [];
      if (!is_array($dist)) $dist = [];

      $distJson = json_encode($dist, JSON_UNESCAPED_UNICODE);

      $sql = "
        INSERT INTO tm_state (tour_key, team, group_id, boarded, memo, dist_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          boarded=VALUES(boarded),
          memo=VALUES(memo),
          dist_json=VALUES(dist_json)
      ";
      $stmt = $pdo->prepare($sql);
      $stmt->execute([$tourKey, $team, $groupId, $boarded, $memo, $distJson]);

      json_out(["ok"=>true]);
    }

    // ---------- UPSERT SEATMAP ----------
    if ($action === "save_seatmap") {
      if (!$team) json_out(["ok"=>false, "msg"=>"team required"], 400);

      $busSize = (int)($body["bus_size"] ?? 44);
      if ($busSize !== 44 && $busSize !== 45) $busSize = 44;

      $blocked = $body["blocked"] ?? [];
      $seats   = $body["seats"] ?? [];
      if (!is_array($blocked)) $blocked = [];
      if (!is_array($seats)) $seats = [];

      $blockedJson = json_encode(array_values($blocked), JSON_UNESCAPED_UNICODE);
      $seatJson    = json_encode($seats, JSON_UNESCAPED_UNICODE);

      $sql = "
        INSERT INTO tm_seatmap (tour_key, team, bus_size, blocked_json, seat_json)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          bus_size=VALUES(bus_size),
          blocked_json=VALUES(blocked_json),
          seat_json=VALUES(seat_json)
      ";
      $stmt = $pdo->prepare($sql);
      $stmt->execute([$tourKey, $team, $busSize, $blockedJson, $seatJson]);

      json_out(["ok"=>true]);
    }

    // ---------- UPSERT SETTINGS ----------
    if ($action === "save_settings") {
      if (!$team) json_out(["ok"=>false, "msg"=>"team required"], 400);

      $guide = (string)($body["guide_name"] ?? "");
      $notice = (string)($body["global_notice"] ?? "");

      $sql = "
        INSERT INTO tm_settings (tour_key, team, guide_name, global_notice)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          guide_name=VALUES(guide_name),
          global_notice=VALUES(global_notice)
      ";
      $stmt = $pdo->prepare($sql);
      $stmt->execute([$tourKey, $team, $guide, $notice]);

      json_out(["ok"=>true]);
    }

    json_out(["ok"=>false, "msg"=>"unknown api"], 404);
  } catch (Throwable $e) {
    json_out(["ok"=>false, "msg"=>$e->getMessage()], 500);
  }
}

// =========================================================
// UI (HTML + JS)
// =========================================================
?>
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Tour Master (DB) - Seat Design</title>
  <style>
    :root{
      --bg:#f1f5f9;
      --card:#ffffff;
      --line:#e2e8f0;
      --text:#0f172a;
      --sub:#64748b;
      --blue:#2563eb;
      --green:#16a34a;
      --sky:#0284c7;
      --purple:#7c3aed;
      --red:#dc2626;
      --amber:#d97706;
      --violet:#7c3aed;
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Pretendard,Apple SD Gothic Neo,sans-serif;background:var(--bg);color:var(--text)}
    .wrap{max-width:1100px;margin:0 auto;padding:16px}
    .topbar{position:sticky;top:0;z-index:50;background:rgba(241,245,249,.92);backdrop-filter: blur(8px);border-bottom:1px solid var(--line)}
    .topbar .inner{max-width:1100px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;gap:10px}
    .pill{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 10px;font-weight:800;font-size:12px}
    .btn{border:1px solid var(--line);background:#fff;border-radius:12px;padding:10px 12px;font-weight:900;cursor:pointer}
    .btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}
    .grid{display:grid;gap:12px}
    .card{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:0 1px 2px rgba(15,23,42,.06);overflow:hidden}
    .row{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .muted{color:var(--sub)}
    .teams{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    @media (max-width:860px){.teams{grid-template-columns:repeat(2,minmax(0,1fr));}}
    @media (max-width:520px){.teams{grid-template-columns:1fr;}}
    .teamCard{padding:14px}
    .teamBadge{width:52px;height:52px;border-radius:14px;border:2px solid var(--blue);display:flex;align-items:center;justify-content:center;font-weight:1000;font-size:22px;color:var(--blue);background:#fff}
    .progress{height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden}
    .bar{height:100%;background:var(--blue)}
    .tabs{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--line);padding:10px 16px 18px;z-index:60}
    .tabs .inner{max-width:1100px;margin:0 auto;display:flex;justify-content:space-around;gap:8px}
    .tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:14px;border:1px solid transparent;font-weight:900;color:var(--sub);cursor:pointer}
    .tab.active{background:#eff6ff;color:var(--blue);border-color:#dbeafe}

    /* Seat Map (Image-like) */
    .seatWrap{padding:12px}
    .seatGrid{display:grid;grid-template-columns:1fr 1fr .55fr 1fr 1fr;gap:6px}
    .seat{aspect-ratio:1/1;border-radius:16px;border:2px solid #cbd5e1;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.08);padding:8px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;cursor:pointer}
    .seat.empty{border-style:dashed;color:#cbd5e1}
    .seat.blocked{background:#f1f5f9;border-style:dashed;color:#cbd5e1;cursor:not-allowed}
    .seat.selected{border-color:var(--blue);box-shadow:0 0 0 3px rgba(37,99,235,.18)}
    .seatTop{display:flex;justify-content:space-between;align-items:flex-start}
    .seatNum{font-weight:900;color:#94a3b8;font-size:12px}
    .seatRight{display:flex;gap:6px;align-items:center}
    .hot{font-weight:1000;color:#ef4444}
    .plat{font-weight:1000}
    .plat.klook{color:#f97316}
    .plat.kk{color:#06b6d4}
    .mid{display:flex;align-items:center;justify-content:center;flex:1}
    .teamBig{font-size:64px;font-weight:1000;letter-spacing:-2px;line-height:1;color:#334155}
    .teamSmall{font-size:14px;font-weight:900;color:#64748b;margin-left:6px;margin-bottom:6px}
    .seatBottom{display:flex;justify-content:space-between;align-items:flex-end}
    .badge{width:30px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:1000;border:1px solid transparent}
    .bHong{background:#dcfce7;color:#166534}
    .bMyeong{background:#e0f2fe;color:#075985}
    .bDong{background:#f3e8ff;color:#5b21b6}
    .lang{width:30px;height:30px;border-radius:999px;border:1px solid #fee2e2;display:flex;align-items:center;justify-content:center;font-weight:1000}
    .lang.cn{color:var(--red);background:#fff}
    .lang.en{color:var(--blue);border-color:#dbeafe;background:#fff}
    .nat{font-size:11px;color:#94a3b8;font-weight:900;text-align:right;line-height:1}
    .pax{font-size:18px;font-weight:1000;color:#0f172a}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="inner">
      <div class="pill">DB 저장형</div>
      <div class="pill">CSV: <?=htmlspecialchars(CSV_GID) ?></div>
      <button class="btn" id="btnReload">데이터 새로고침</button>
      <div style="flex:1"></div>
      <div class="pill" id="tourKeyPill"></div>
    </div>
  </div>

  <div class="wrap" style="padding-bottom:96px;">
    <div id="view"></div>
  </div>

  <div class="tabs">
    <div class="inner">
      <button class="tab active" data-tab="home">홈</button>
      <button class="tab" data-tab="bus">버스</button>
      <button class="tab" data-tab="msg">메시지</button>
      <button class="tab" data-tab="menu">관리</button>
    </div>
  </div>

<script>
/* =========================================================
   CONFIG
========================================================= */
const CSV_URL = <?=json_encode(CSV_URL, JSON_UNESCAPED_UNICODE)?>;

/* =========================================================
   STATE
========================================================= */
let rawRows = [];
let items = [];      // parsed passengers
let teams = [];
let activeTab = 'home';
let selectedTeam = '';
let tourKey = new Date().toISOString().slice(0,10); // 기본 날짜키 (원하면 시트에서 읽어 교체)
let dbTeamState = {};     // group_id => {boarded,memo,dist}
let dbSeatMap = {bus_size:44, blocked:[], seats:{}}; // seats: seatNum => group_id
let dbSettings = {guide_name:'', global_notice:''};

/* =========================================================
   CSV PARSER
========================================================= */
function parseCSV(text){
  const rows=[];
  let curRow=[], curCell='', inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"'){
      if(inQ && n === '"'){ curCell+='"'; i++; }
      else inQ=!inQ;
    } else if(c === ',' && !inQ){
      curRow.push(curCell.trim()); curCell='';
    } else if((c === '\n' || c === '\r') && !inQ){
      if(c === '\r' && n === '\n') i++;
      curRow.push(curCell.trim());
      if(curRow.length>1) rows.push(curRow);
      curRow=[]; curCell='';
    } else {
      curCell += c;
    }
  }
  if(curCell || curRow.length){
    curRow.push(curCell.trim());
    if(curRow.length>1) rows.push(curRow);
  }
  return rows;
}
const safeInt = v => {
  if(!v) return 0;
  const s=String(v).replace(/,/g,'').trim();
  const n=parseInt(s,10);
  return isNaN(n)?0:n;
};

/* =========================================================
   BUSINESS UTILS
========================================================= */
function getPickupShort(p){
  if(!p) return '';
  if(p.includes('홍대')) return '홍';
  if(p.includes('명동')) return '명';
  if(p.includes('동대문')) return '동';
  if(p.includes('스키장')) return '스';
  return p.slice(0,1);
}
function getPickupBadgeClass(p){
  if(!p) return '';
  if(p.includes('홍대')) return 'bHong';
  if(p.includes('명동')) return 'bMyeong';
  if(p.includes('동대문')) return 'bDong';
  return '';
}
function getLangType(lang){
  const s=(lang||'').toLowerCase();
  if(/chi|cn|중국|대만|홍콩/.test(s)) return 'cn';
  if(/eng|en|영어/.test(s)) return 'en';
  return 'en';
}
function getNationality(contact){
  if(!contact) return '';
  const num = String(contact).replace(/[^0-9]/g,'');
  if(num.startsWith('82') || num.startsWith('010')) return '한국';
  if(num.startsWith('86')) return '중국';
  if(num.startsWith('886')) return '대만';
  if(num.startsWith('852')) return '홍콩';
  return '';
}
function getPlatform(item){
  const resNo=(item.res_no||'').toUpperCase();
  const appId=(item.app_id||'').toUpperCase();
  const code=(item.code||'').toUpperCase();
  if(resNo.includes('KK') || appId.includes('KKDAY')) return {label:'K', cls:'kk'};
  const klookPattern=/[A-Z0-9]{6,}/;
  if((klookPattern.test(resNo) && !resNo.startsWith('TK')) || appId.includes('KLOOK') || code.includes('KLOOK')) return {label:'K', cls:'klook'};
  return null;
}

/* =========================================================
   GROUPING
   - A10 이상이 A1로 인식되는 문제 방지 핵심:
     1) groupLabel을 "A" + (index)로 만들되
     2) 렌더에서 문자/숫자를 분리 출력
========================================================= */
function buildGroupId(item){
  // 같은 손님(연락처 우선) 묶기 위한 안정 키
  const c=(item.contact||'').replace(/[-\s]/g,'');
  if(c && c.length>5) return 'C:'+c;
  return 'N:'+(item.name||'').trim().toLowerCase();
}
function groupByPerson(teamItems){
  const map=new Map();
  teamItems.forEach(it=>{
    const gid = buildGroupId(it);
    if(!map.has(gid)){
      map.set(gid, {
        group_id: gid,
        team: it.team,
        guide: it.guide,
        name: it.name,
        pickup: it.pickup,
        lang: it.lang,
        contact: it.contact,
        res_no: it.res_no,
        app_id: it.app_id,
        pax: it.pax,
        items: {...it.items},
        codes: [it.code],
      });
    } else {
      const g = map.get(gid);
      g.codes.push(it.code);
      g.pax += it.pax;
      Object.keys(g.items).forEach(k=> g.items[k]+= (it.items[k]||0));
    }
  });
  // 정렬 안정화: 코드 숫자 기반
  return Array.from(map.values()).sort((a,b)=>{
    const a1=a.codes[0]||'', b1=b.codes[0]||'';
    return a1.localeCompare(b1, undefined, {numeric:true});
  }).map((g, idx)=>{
    g.group_no = idx+1;                 // 숫자 따로 저장 (A10 문제 방지)
    g.group_label = g.team + (idx+1);   // 표시용
    return g;
  });
}

/* =========================================================
   DB API
========================================================= */
async function api(action, payload){
  const res = await fetch(`?api=${encodeURIComponent(action)}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload||{})
  });
  const j = await res.json().catch(()=>null);
  if(!j || !j.ok) throw new Error(j?.msg || 'API Error');
  return j;
}
async function loadTeamFromDB(team){
  const j = await api('load_team', {tour_key: tourKey, team});
  dbTeamState = j.state || {};
  dbSeatMap = j.seatmap || {bus_size:44, blocked:[], seats:{}};
  dbSettings = j.settings || {guide_name:'', global_notice:''};
}
async function saveGroupToDB(team, group){
  const s = dbTeamState[group.group_id] || {boarded:false, memo:'', dist:{}};
  await api('save_group', {
    tour_key: tourKey,
    team,
    group_id: group.group_id,
    boarded: !!s.boarded,
    memo: s.memo || '',
    dist: s.dist || {}
  });
}
async function saveSeatMapToDB(team){
  await api('save_seatmap', {
    tour_key: tourKey,
    team,
    bus_size: dbSeatMap.bus_size || 44,
    blocked: dbSeatMap.blocked || [],
    seats: dbSeatMap.seats || {}
  });
}
async function saveSettingsToDB(team){
  await api('save_settings', {
    tour_key: tourKey,
    team,
    guide_name: dbSettings.guide_name || '',
    global_notice: dbSettings.global_notice || ''
  });
}

/* =========================================================
   LOAD CSV
========================================================= */
async function loadCSV(){
  const res = await fetch(CSV_URL, {cache:'no-store'});
  if(!res.ok) throw new Error('CSV Load failed');
  const txt = await res.text();
  rawRows = parseCSV(txt);

  // 헤더 제거
  const dataRows = rawRows.filter(r=>{
    const t=(r[0]||'').trim();
    if(!t) return false;
    const headers = ['팀구분','TEAM','Team','구분','Guide','가이드','Code','순번'];
    return !headers.some(h => t.toUpperCase().includes(h.toUpperCase()));
  });

  // 컬럼 인덱스 (React 코드와 동일)
  const COLS = {TEAM:0,GUIDE:1,BUS_INFO:2,CODE:3,EVENT:4,RES_NO:5,NAME:6,CONTACT:7,APP_ID:8,EMAIL:9,LANG:10,PAX:11,PICKUP:12,SHUTTLE:13,SLED:14,SIGHTSEEING:15,MOVING:16,LIFT:17,EQUIP:18,LESSON:19,CLOTH_E:20,CLOTH_S:21,NOTE:22};

  items = dataRows.map((r, idx)=>({
    id: `${(r[COLS.TEAM]||'').toUpperCase()}-${(r[COLS.CODE]||'')}-${idx}`,
    team: (r[COLS.TEAM]||'').toUpperCase().trim(),
    guide: r[COLS.GUIDE]||'',
    bus_info: r[COLS.BUS_INFO]||'',
    code: r[COLS.CODE]||'',
    event: r[COLS.EVENT]||'',
    res_no: r[COLS.RES_NO]||'',
    name: r[COLS.NAME]||'',
    contact: r[COLS.CONTACT]||'',
    app_id: r[COLS.APP_ID]||'',
    email: r[COLS.EMAIL]||'',
    lang: r[COLS.LANG]||'',
    pax: safeInt(r[COLS.PAX]),
    pickup: (r[COLS.PICKUP]||'').trim(),
    note: r[COLS.NOTE]||'',
    items: {
      shuttle: safeInt(r[COLS.SHUTTLE]),
      sled: safeInt(r[COLS.SLED]),
      sightseeing: safeInt(r[COLS.SIGHTSEEING]),
      moving: safeInt(r[COLS.MOVING]),
      lift: safeInt(r[COLS.LIFT]),
      equip: safeInt(r[COLS.EQUIP]),
      lesson: safeInt(r[COLS.LESSON]),
      clothE: safeInt(r[COLS.CLOTH_E]),
      clothS: safeInt(r[COLS.CLOTH_S]),
    }
  }));

  teams = Array.from(new Set(items.map(i=>i.team).filter(Boolean))).sort();
}

/* =========================================================
   RENDER
========================================================= */
const view = document.getElementById('view');

function setActiveTab(tab){
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(b=>{
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  render();
}

function render(){
  document.getElementById('tourKeyPill').textContent = `TourKey: ${tourKey}`;

  if(activeTab === 'home') return renderHome();
  if(activeTab === 'bus') return renderBus();
  if(activeTab === 'msg') return renderMsg();
  if(activeTab === 'menu') return renderMenu();
}

/* ---------- HOME (팀 선택) ---------- */
function renderHome(){
  const summaries = teams.map(t=>{
    const teamRows = items.filter(i=>i.team===t);
    const grouped = groupByPerson(teamRows);
    const totalPax = grouped.reduce((a,g)=>a+(g.pax||0),0);
    const boardedPax = grouped.reduce((a,g)=>{
      const st = dbTeamState[g.group_id];
      return a + (st?.boarded ? (g.pax||0) : 0);
    },0);
    const progress = totalPax ? Math.round(boardedPax/totalPax*100) : 0;
    const guide = Array.from(new Set(teamRows.map(x=>x.guide).filter(Boolean))).join(', ');
    const busInfo = teamRows.find(x=>x.bus_info)?.bus_info || '';
    return {team:t,totalPax,boardedPax,progress,guide,busInfo,count:grouped.length};
  });

  view.innerHTML = `
    <div class="grid">
      <div class="card" style="padding:16px;">
        <div class="row">
          <div>
            <div style="font-size:18px;font-weight:1000;">팀을 선택하세요</div>
            <div class="muted" style="font-weight:800;font-size:12px;margin-top:4px;">체크/메모/좌석/공지사항은 DB에 저장되어 모두 공유됩니다.</div>
          </div>
          <button class="btn primary" id="btnPickFirst">A팀 바로</button>
        </div>
      </div>

      <div class="teams">
        ${summaries.map(s=>`
          <div class="card teamCard" data-team="${s.team}" style="cursor:pointer;">
            <div class="row">
              <div style="display:flex;gap:12px;align-items:center;">
                <div class="teamBadge">${s.team}</div>
                <div>
                  <div style="font-size:16px;font-weight:1000;">${escapeHtml(s.guide||'가이드 미정')}</div>
                  <div class="muted" style="font-weight:900;font-size:12px;margin-top:2px;">총 ${s.totalPax}명 / 탑승 ${s.boardedPax}명</div>
                </div>
              </div>
              <div style="font-size:22px;font-weight:1000;color:var(--blue);">${s.progress}%</div>
            </div>
            <div style="margin-top:10px;" class="progress"><div class="bar" style="width:${s.progress}%"></div></div>
            <div class="muted" style="font-weight:900;font-size:12px;margin-top:10px;">🚌 ${escapeHtml(s.busInfo||'정보 없음')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('btnPickFirst').onclick = async ()=>{
    if(!teams.length) return;
    await openTeam(teams[0]);
  };
  document.querySelectorAll('[data-team]').forEach(el=>{
    el.onclick = async ()=> openTeam(el.dataset.team);
  });
}

/* ---------- TEAM DETAIL (간단: 탑승/메모/아이템 체크) ---------- */
async function openTeam(team){
  selectedTeam = team;
  await loadTeamFromDB(team);
  setActiveTab('bus'); // 요청 흐름상 버스로 바로
}

/* ---------- BUS (좌석 배치) ---------- */
function renderBus(){
  if(!selectedTeam){
    view.innerHTML = `<div class="card" style="padding:16px;">
      <div style="font-weight:1000;">버스 탭</div>
      <div class="muted" style="font-weight:900;margin-top:6px;">홈에서 팀을 선택하세요.</div>
    </div>`;
    return;
  }

  const grouped = groupByPerson(items.filter(i=>i.team===selectedTeam));
  // 좌석에 들어갈 때 사용할 빠른 lookup
  const groupMap = new Map(grouped.map(g=>[g.group_id,g]));

  // 44/45 렌더
  const busSize = dbSeatMap.bus_size || 44;
  const blocked = new Set(dbSeatMap.blocked || []);
  const seats = dbSeatMap.seats || {}; // { "1": "C:010..." }

  function renderSeatCell(seatNum){
    if(seatNum === null) return `<div></div>`; // aisle
    if(blocked.has(seatNum)){
      return `<div class="seat blocked" data-seat="${seatNum}"><div class="seatTop"><div class="seatNum">${seatNum}</div></div><div class="mid"><div style="font-weight:1000;">X</div></div></div>`;
    }
    const gid = seats[String(seatNum)];
    if(!gid || !groupMap.has(gid)){
      return `<div class="seat empty" data-seat="${seatNum}">
        <div class="seatTop"><div class="seatNum">${seatNum}</div></div>
        <div class="mid"><div style="font-weight:1000;">+</div></div>
        <div class="seatBottom"><div></div><div></div></div>
      </div>`;
    }

    const g = groupMap.get(gid);
    const plat = getPlatform(g);
    const hot = /HOT/i.test(g.event||'');
    const pickupShort = getPickupShort(g.pickup);
    const pickupCls = getPickupBadgeClass(g.pickup);
    const langType = getLangType(g.lang);
    const nat = getNationality(g.contact);

    // --- A10 문제 방지: "A"와 "10"을 분리 렌더 ---
    const teamLetter = (g.team||'').slice(0,1);
    const teamNum = String(g.group_no || 0); // 10 이상도 그대로

    return `
      <div class="seat" data-seat="${seatNum}">
        <div class="seatTop">
          <div class="seatNum">${seatNum}</div>
          <div class="seatRight">
            ${hot ? `<div class="hot">🔥</div>` : ``}
            ${plat ? `<div class="plat ${plat.cls}">${plat.label}</div>` : ``}
          </div>
        </div>

        <div class="mid">
          <div style="display:flex;align-items:flex-end;">
            <div class="teamBig">${escapeHtml(teamLetter)}</div>
            <div class="teamSmall">${escapeHtml(teamNum)}</div>
          </div>
        </div>

        <div class="seatBottom">
          <div class="badge ${pickupCls}">${escapeHtml(pickupShort || '')}</div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
            <div class="nat">${escapeHtml(nat||'')}</div>
            <div class="lang ${langType}">${langType==='cn'?'中':'英'}</div>
          </div>
        </div>
      </div>
    `;
  }

  // 44인승: 1~40 (10줄 * 4좌석), 마지막줄 41~44
  // 45인승: 마지막줄 41~45 (5좌석)
  const rows = [];
  for(let r=0;r<10;r++){
    const base = r*4;
    rows.push([base+1, base+2, null, base+3, base+4]);
  }
  const lastRow = (busSize===45) ? [41,42,43,44,45] : [41,42,null,43,44];

  view.innerHTML = `
    <div class="grid">
      <div class="card" style="padding:16px;">
        <div class="row">
          <div>
            <div style="font-weight:1000;font-size:18px;">버스 배치도 (${selectedTeam}팀)</div>
            <div class="muted" style="font-weight:900;font-size:12px;margin-top:4px;">
              좌석 클릭 → 다른 좌석 클릭하면 스왑됩니다. (DB 저장)
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn" id="btnBackHome">홈</button>
            <button class="btn primary" id="btnSaveSeat">좌석 DB저장</button>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn" data-bus="44">44인승</button>
          <button class="btn" data-bus="45">45인승</button>
          <div style="flex:1"></div>
          <button class="btn" id="btnBlockMode">좌석 비우기 모드: OFF</button>
        </div>
      </div>

      <div class="card seatWrap">
        <div class="muted" style="font-weight:1000;font-size:12px;margin:0 0 10px 2px;">FRONT (운전석)</div>
        <div class="seatGrid" id="seatGrid">
          ${rows.map(row=>row.map(renderSeatCell).join('')).join('')}
          ${lastRow.map(renderSeatCell).join('')}
        </div>
      </div>

      <div class="card" style="padding:16px;">
        <div class="row">
          <div style="font-weight:1000;">그룹 리스트</div>
          <div class="muted" style="font-weight:900;font-size:12px;">탑승/메모/분배 체크 → DB 저장</div>
        </div>
        <div style="margin-top:12px;display:grid;gap:10px;">
          ${grouped.map(g=>{
            const st = dbTeamState[g.group_id] || {boarded:false,memo:'',dist:{}};
            const boarded = st.boarded ? '✅' : '⬜';
            // label (A10 보장)
            const label = `${g.team}${g.group_no}`;
            return `
              <div class="card" style="padding:12px;border-radius:14px;">
                <div class="row">
                  <div style="display:flex;gap:10px;align-items:center;">
                    <div class="pill" style="font-size:12px;">${escapeHtml(label)}</div>
                    <div style="font-weight:1000;">${escapeHtml(g.name||'')}</div>
                    <div class="muted" style="font-weight:1000;">${g.pax}명</div>
                  </div>
                  <button class="btn" data-act="toggleBoard" data-gid="${encodeURIComponent(g.group_id)}">${boarded} 탑승</button>
                </div>
                <div class="muted" style="font-weight:900;font-size:12px;margin-top:8px;">
                  픽업: ${escapeHtml(g.pickup||'')} / 언어: ${escapeHtml(g.lang||'')}
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                  ${renderDistBtn('lift','리프트',g,st)}
                  ${renderDistBtn('moving','무빙',g,st)}
                  ${renderDistBtn('sled','눈썰매',g,st)}
                  ${renderDistBtn('sightseeing','관광L',g,st)}
                  ${renderDistBtn('equip','장비',g,st)}
                  ${renderDistBtn('lesson','강습',g,st)}
                  ${renderDistBtn('clothE','의류E',g,st)}
                  ${renderDistBtn('clothS','의류S',g,st)}
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;">
                  <input class="pill" style="flex:1;border-radius:12px;border:1px solid var(--line);padding:10px;font-weight:900;" placeholder="특이사항 메모" value="${escapeAttr(st.memo||'')}" data-memo="${encodeURIComponent(g.group_id)}" />
                  <button class="btn primary" data-act="saveMemo" data-gid="${encodeURIComponent(g.group_id)}">메모저장</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // handlers
  document.getElementById('btnBackHome').onclick = ()=> setActiveTab('home');

  // bus size
  document.querySelectorAll('[data-bus]').forEach(b=>{
    b.onclick = async ()=>{
      dbSeatMap.bus_size = parseInt(b.dataset.bus,10);
      // 45로 바꿀때 기존 45 좌석 저장 없으면 그냥 유지
      render();
    };
  });

  // block mode + swapping
  let selectedSeat = null;
  let blockMode = false;

  const btnBlockMode = document.getElementById('btnBlockMode');
  btnBlockMode.onclick = ()=>{
    blockMode = !blockMode;
    btnBlockMode.textContent = `좌석 비우기 모드: ${blockMode?'ON':'OFF'}`;
  };

  document.querySelectorAll('.seat[data-seat]').forEach(el=>{
    el.onclick = async ()=>{
      const seatNum = parseInt(el.dataset.seat,10);
      if((dbSeatMap.blocked||[]).includes(seatNum)) {
        // blocked click: allow un-block in blockMode
        if(blockMode){
          dbSeatMap.blocked = (dbSeatMap.blocked||[]).filter(n=>n!==seatNum);
          render();
        }
        return;
      }
      if(blockMode){
        dbSeatMap.blocked = Array.from(new Set([...(dbSeatMap.blocked||[]), seatNum]));
        render();
        return;
      }

      // swap mode
      if(selectedSeat === null){
        selectedSeat = seatNum;
        el.classList.add('selected');
      } else {
        if(selectedSeat === seatNum){
          selectedSeat = null;
          render();
          return;
        }
        // swap seat assignment by group_id
        const seats = dbSeatMap.seats || {};
        const a = seats[String(selectedSeat)] || null;
        const b = seats[String(seatNum)] || null;
        if(a) seats[String(seatNum)] = a; else delete seats[String(seatNum)];
        if(b) seats[String(selectedSeat)] = b; else delete seats[String(selectedSeat)];
        dbSeatMap.seats = seats;
        selectedSeat = null;
        render();
      }
    };
  });

  // seat save
  document.getElementById('btnSaveSeat').onclick = async ()=>{
    try{
      await saveSeatMapToDB(selectedTeam);
      alert('좌석/막힘좌석 DB 저장 완료');
    }catch(e){
      alert('저장 실패: '+e.message);
    }
  };

  // toggle boarded / dist / memo
  document.querySelectorAll('[data-act="toggleBoard"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const gid = decodeURIComponent(btn.dataset.gid);
      const st = dbTeamState[gid] || {boarded:false,memo:'',dist:{}};
      st.boarded = !st.boarded;
      dbTeamState[gid] = st;
      // DB save
      const group = groupMap.get(gid);
      try{
        await api('save_group', {tour_key: tourKey, team: selectedTeam, group_id: gid, boarded: st.boarded, memo: st.memo||'', dist: st.dist||{}});
        render();
      }catch(e){ alert('저장 실패: '+e.message); }
    };
  });

  document.querySelectorAll('[data-act="toggleDist"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const gid = decodeURIComponent(btn.dataset.gid);
      const key = btn.dataset.key;
      const st = dbTeamState[gid] || {boarded:false,memo:'',dist:{}};
      st.dist = st.dist || {};
      st.dist[key] = !st.dist[key];
      dbTeamState[gid] = st;
      try{
        await api('save_group', {tour_key: tourKey, team: selectedTeam, group_id: gid, boarded: !!st.boarded, memo: st.memo||'', dist: st.dist||{}});
        render();
      }catch(e){ alert('저장 실패: '+e.message); }
    };
  });

  document.querySelectorAll('[data-act="saveMemo"]').forEach(btn=>{
    btn.onclick = async ()=>{
      const gid = decodeURIComponent(btn.dataset.gid);
      const input = document.querySelector(`[data-memo="${encodeURIComponent(gid)}"]`);
      const st = dbTeamState[gid] || {boarded:false,memo:'',dist:{}};
      st.memo = input ? input.value : '';
      dbTeamState[gid] = st;
      try{
        await api('save_group', {tour_key: tourKey, team: selectedTeam, group_id: gid, boarded: !!st.boarded, memo: st.memo||'', dist: st.dist||{}});
        alert('메모 DB 저장 완료');
        render();
      }catch(e){ alert('저장 실패: '+e.message); }
    };
  });

  function renderDistBtn(key, label, g, st){
    const on = !!(st.dist && st.dist[key]);
    const val = (g.items && g.items[key]) ? g.items[key] : 0;
    if(val<=0) return '';
    return `<button class="btn" data-act="toggleDist" data-gid="${encodeURIComponent(g.group_id)}" data-key="${key}"
      style="${on?'border-color:var(--line);color:#cbd5e1;background:#f8fafc;':''}">
      ${on?'✅':'⬜'} ${label} ${val}
    </button>`;
  }
}

/* ---------- MSG / MENU (간단) ---------- */
function renderMsg(){
  if(!selectedTeam){
    view.innerHTML = `<div class="card" style="padding:16px;">
      <div style="font-weight:1000;">메시지 탭</div>
      <div class="muted" style="font-weight:900;margin-top:6px;">홈에서 팀을 선택하세요.</div>
    </div>`;
    return;
  }
  view.innerHTML = `
    <div class="card" style="padding:16px;">
      <div class="row">
        <div>
          <div style="font-weight:1000;font-size:18px;">메시지 설정 (${selectedTeam}팀)</div>
          <div class="muted" style="font-weight:900;font-size:12px;margin-top:4px;">가이드명/공지사항은 DB 저장(공유)됩니다.</div>
        </div>
        <button class="btn" id="btnBackHome2">홈</button>
      </div>

      <div style="margin-top:14px;display:grid;gap:10px;">
        <div>
          <div class="muted" style="font-weight:900;font-size:12px;margin-bottom:6px;">가이드 영문 이름</div>
          <input id="guideName" class="pill" style="width:100%;border-radius:12px;border:1px solid var(--line);padding:12px;font-weight:900;" value="${escapeAttr(dbSettings.guide_name||'')}" />
        </div>
        <div>
          <div class="muted" style="font-weight:900;font-size:12px;margin-bottom:6px;">공통 공지사항</div>
          <textarea id="globalNotice" class="pill" style="width:100%;min-height:120px;border-radius:12px;border:1px solid var(--line);padding:12px;font-weight:900;">${escapeHtml(dbSettings.global_notice||'')}</textarea>
        </div>
        <button class="btn primary" id="btnSaveMsg">DB 저장</button>
      </div>
    </div>
  `;
  document.getElementById('btnBackHome2').onclick = ()=> setActiveTab('home');
  document.getElementById('btnSaveMsg').onclick = async ()=>{
    dbSettings.guide_name = document.getElementById('guideName').value;
    dbSettings.global_notice = document.getElementById('globalNotice').value;
    try{
      await saveSettingsToDB(selectedTeam);
      alert('설정 DB 저장 완료');
    }catch(e){
      alert('저장 실패: '+e.message);
    }
  };
}
function renderMenu(){
  view.innerHTML = `
    <div class="card" style="padding:16px;">
      <div class="row">
        <div>
          <div style="font-weight:1000;font-size:18px;">관리</div>
          <div class="muted" style="font-weight:900;font-size:12px;margin-top:4px;">TourKey(날짜키)는 기본 오늘 날짜로 잡혀있습니다.</div>
        </div>
      </div>

      <div style="margin-top:14px;display:grid;gap:10px;">
        <div>
          <div class="muted" style="font-weight:900;font-size:12px;margin-bottom:6px;">TourKey (예: 2026-02-05)</div>
          <input id="tourKeyInput" class="pill" style="width:100%;border-radius:12px;border:1px solid var(--line);padding:12px;font-weight:900;" value="${escapeAttr(tourKey)}" />
        </div>
        <button class="btn primary" id="btnApplyTourKey">적용</button>
        <div class="muted" style="font-weight:900;font-size:12px;">팀 선택 후 탭 이동하면 해당 TourKey 기준으로 DB를 읽습니다.</div>
      </div>
    </div>
  `;
  document.getElementById('btnApplyTourKey').onclick = ()=>{
    tourKey = document.getElementById('tourKeyInput').value.trim() || tourKey;
    render();
  };
}

/* =========================================================
   HELPERS
========================================================= */
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function escapeAttr(s){
  return escapeHtml(s).replace(/"/g,'&quot;');
}

/* =========================================================
   BOOT
========================================================= */
document.getElementById('btnReload').onclick = async ()=>{
  try{
    await loadCSV();
    if(selectedTeam) await loadTeamFromDB(selectedTeam);
    render();
  }catch(e){ alert(e.message); }
};
document.querySelectorAll('.tab').forEach(b=>{
  b.onclick = async ()=>{
    const tab = b.dataset.tab;
    setActiveTab(tab);
    if((tab==='bus' || tab==='msg') && selectedTeam){
      try{ await loadTeamFromDB(selectedTeam); render(); }catch(e){ alert(e.message); }
    }
  };
});

(async function init(){
  try{
    await loadCSV();
    // 팀 선택 전이라도 UI 먼저
    render();
  }catch(e){
    view.innerHTML = `<div class="card" style="padding:16px;">
      <div style="font-weight:1000;color:#ef4444;">CSV 로딩 실패</div>
      <div class="muted" style="font-weight:900;margin-top:6px;">${escapeHtml(e.message)}</div>
      <div class="muted" style="font-weight:900;margin-top:6px;">시트 공개/권한/CSV URL을 확인하세요.</div>
    </div>`;
  }
})();
</script>
</body>
</html>
