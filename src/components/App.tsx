import React, { useState, useEffect, useMemo } from 'react';
import { Check, Users, RefreshCw, AlertCircle, Phone, MessageCircle, Bus, Snowflake, ArrowUpRight, Mountain, ClipboardList, Mail, MapPin, Shirt, ChevronLeft, Calendar, ExternalLink, Lock, Copy, FileText, PenLine, Flame, Download, Share2, MessageSquare, Truck, Settings, Save, Disc, DoorOpen, ArrowRightLeft, User, Globe, Repeat, Ban, Camera, ChevronsRight, CableCar, CloudSnow, Backpack, X, FileSpreadsheet, Home, Menu, PhoneCall, ChevronDown, ChevronUp } from 'lucide-react';

// *** 구글 시트 데이터 연결 ***
const SHEET_ID = "1Celx7ApccgzrNwbw6VyZRqUG_zg1z_dp3WmBhTFDlF0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1905716770`;

const APP_VERSION = "v4.01_Hotfix_Stability"; 

// --- 데이터 컬럼 매핑 ---
const COLS = {
  TEAM: 0, GUIDE: 1, BUS_INFO: 2, CODE: 3, EVENT: 4, RES_NO: 5, NAME: 6, CONTACT: 7, APP_ID: 8, EMAIL: 9, LANG: 10, PAX: 11, PICKUP: 12, SHUTTLE: 13, SLED: 14, SIGHTSEEING: 15, MOVING: 16, LIFT: 17, EQUIP: 18, LESSON: 19, CLOTH_E: 20, CLOTH_S: 21, NOTE: 22
};

// --- 전역 테마 ---
const TEAM_THEMES = {
  'A': { bg: 'bg-white', badgeBg: 'bg-white', button: 'bg-blue-600 border-blue-600', text: 'text-blue-600', ring: 'ring-blue-600', lightBg: 'bg-white', border: 'border-blue-600', bar: 'bg-blue-600' },
  'B': { bg: 'bg-white', badgeBg: 'bg-white', button: 'bg-emerald-600 border-emerald-600', text: 'text-emerald-600', ring: 'ring-emerald-600', lightBg: 'bg-white', border: 'border-emerald-600', bar: 'bg-emerald-600' },
  'C': { bg: 'bg-white', badgeBg: 'bg-white', button: 'bg-violet-600 border-violet-600', text: 'text-violet-600', ring: 'ring-violet-600', lightBg: 'bg-white', border: 'border-violet-600', bar: 'bg-violet-600' },
  'DEFAULT': { bg: 'bg-white', badgeBg: 'bg-white', button: 'bg-slate-600 border-slate-600', text: 'text-slate-600', ring: 'ring-slate-600', lightBg: 'bg-white', border: 'border-slate-600', bar: 'bg-slate-600' }
};

// --- 유틸리티 함수 ---
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (insideQuotes && nextChar === '"') { currentCell += '"'; i++; } else { insideQuotes = !insideQuotes; }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim()); currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim()); if (currentRow.length > 0) rows.push(currentRow); currentRow = []; currentCell = '';
    } else { currentCell += char; }
  }
  if (currentCell) currentRow.push(currentCell.trim());
  if (currentRow.length > 0) rows.push(currentRow);
  return rows;
}

function safeParseInt(val) {
  if (!val) return 0;
  const str = String(val).replace(/,/g, '').trim();
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function copyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
  document.body.removeChild(textArea);
}

function getPickupSeatTint(pickup) {
  if (!pickup) return 'bg-white';
  if (pickup.includes('홍대')) return 'bg-[#f2fdf2]';
  if (pickup.includes('명동')) return 'bg-[#f0f9ff]';
  if (pickup.includes('동대문')) return 'bg-[#f9f5ff]';
  return 'bg-white';
}

function getPickupColor(pickup) {
    if (!pickup) return 'text-slate-400 border-slate-200';
    if (pickup.includes('홍대')) return 'text-green-600 border-green-600';
    if (pickup.includes('명동')) return 'text-sky-500 border-sky-500';
    if (pickup.includes('동대문')) return 'text-purple-600 border-purple-600';
    if (pickup.includes('스키장')) return 'text-slate-500 border-slate-400';
    return 'text-slate-700 border-slate-700';
}

function getPlatformInfo(item) {
    const resNo = (item.resNo || '').toUpperCase();
    const appId = (item.appId || '').toUpperCase();
    const code = (item.code || '').toUpperCase();
    if (resNo.includes('KK') || appId.includes('KKDAY')) { return { label: 'K', color: 'text-cyan-500' }; }
    const klookPattern = /[A-Z0-9]{6,}/; 
    if ((klookPattern.test(resNo) && !resNo.startsWith('TK')) || appId.includes('KLOOK') || code.includes('KLOOK')) { return { label: 'K', color: 'text-orange-500' }; }
    if (resNo.includes('Q') || appId.includes('QIKE')) { return { label: 'Q', color: 'text-emerald-500' }; }
    return null; 
}

function getLangInfo(lang) {
    const lower = (lang || '').toLowerCase();
    if (lower.includes('taiwan') || lower.includes('대만') || lower.includes('hong') || lower.includes('홍콩') || lower.includes('chi') || lower.includes('중국') || lower.includes('cn')) 
        return { label: '中', color: 'bg-rose-100 text-rose-700', type: 'cn' }; 
    if (lower.includes('eng') || lower.includes('영어') || lower.includes('en')) 
        return { label: '英', color: 'bg-blue-100 text-blue-700', type: 'en' };
    return { label: '한', color: 'bg-slate-100 text-slate-500', type: 'kr' };
}

function getNationality(contact) {
    if (!contact) return '';
    const num = contact.replace(/[^0-9]/g, '');
    if (num.startsWith('82') || num.startsWith('010')) return 'KR';
    if (num.startsWith('86')) return 'CN';
    if (num.startsWith('886')) return 'TW';
    if (num.startsWith('852')) return 'HK';
    if (num.startsWith('1')) return 'US';
    if (num.startsWith('65')) return 'SG'; 
    if (num.startsWith('60')) return 'MY'; 
    if (num.startsWith('66')) return 'TH';
    if (num.startsWith('81')) return 'JP';
    if (num.startsWith('84')) return 'VN';
    if (num.startsWith('63')) return 'PH';
    return '';
}

function downloadVCard(teamData, teamName) {
    let vcardContent = "";
    if (teamData) {
        teamData.forEach((item) => {
            if (item.contact && item.contact.length > 5) {
                const name = `${item.name} (${teamName}팀)`;
                const phone = item.contact.replace(/[-\s]/g, '');
                const codes = item.codes ? item.codes.join('/') : item.code;
                vcardContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:${phone}\nNOTE:Codes:${codes} / Res:${item.resNo} / ${item.pickup}\nEND:VCARD\n`;
            }
        });
    }
    const blob = new Blob([vcardContent], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SkiTour_${teamName}_Contacts.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function buildGroupedForTeam(dataRows) {
  const groups = new Map();
  dataRows.forEach((item) => {
    const key = item.contact && item.contact.length > 5 ? item.contact.replace(/[-\s]/g, '') : (item.name || '').trim().toLowerCase();
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, { ...item, codes: [item.code], members: [item], items: { ...item.items } });
    } else {
      const g = groups.get(key);
      g.codes.push(item.code);
      g.members.push(item);
      g.pax += (item.pax || 0);
      Object.keys(g.items).forEach(k => { g.items[k] += (item.items?.[k] || 0); });
      if (!g.note && item.note) g.note = item.note;
    }
  });
  return Array.from(groups.values()).sort((a, b) => (a.codes?.[0] || "").localeCompare(b.codes?.[0] || "", undefined, { numeric: true }));
}

// --- 하위 컴포넌트들 ---

function TopSummaryBox({ label, total, checked, color = "slate", simple = false }) {
    if (total === 0 || isNaN(total)) return null;
    const colors = {
        slate: 'bg-white border-slate-200 text-slate-400',
        gray: 'bg-white border-slate-300 text-slate-500',
        violet: 'bg-white border-violet-200 text-violet-600',
        amber: 'bg-white border-amber-200 text-amber-600',
        cyan: 'bg-white border-cyan-200 text-cyan-600',
        emerald: 'bg-white border-emerald-200 text-emerald-600',
    };
    const style = colors[color] || colors.slate;
    const remaining = checked !== undefined ? total - checked : total;
    return (
        <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl border flex-shrink-0 min-w-[3.5rem] h-[3.8rem] shadow-sm ${style}`}>
            <span className="text-[10px] font-bold mb-0.5 opacity-80">{label}</span>
            <div className="flex items-end gap-0.5">
                <span className="text-xl font-black leading-none tracking-tight">{simple ? total : remaining}</span>
                {!simple && checked !== undefined && (<span className="text-[10px] font-bold opacity-60 mb-0.5">/{total}</span>)}
            </div>
        </div>
    );
}

function MessengerLink({ text }) {
    if (!text) return null;
    const rawId = (text.match(/[:\s]+(.+)/) || [])[1]?.trim() || text;
    return (
        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(rawId); alert(`복사되었습니다: ${rawId}`); }} className="flex items-center px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors w-full justify-center">
             <MessageCircle size={14} className="mr-1.5 text-slate-500"/> 
             <span className="break-all">{text}</span>
             <Copy size={10} className="ml-1 opacity-50 flex-shrink-0"/>
        </button>
    );
}

function DetailCard({ data, state, onToggleBoarding, onToggleDist, onUpdateMemo, styles, assignedSeat }) {
    const isBoarded = state.boarded;
    const memo = state.memo || '';
    const dist = state.distributed || {};
    const [isOpen, setIsOpen] = useState(false);
    const [isEditingMemo, setIsEditingMemo] = useState(false);
    const [tempMemo, setTempMemo] = useState(memo);
    const langInfo = getLangInfo(data.lang); 

    const allOptions = [
        { id: 'lift', label: '리프트', val: data.items.lift, icon: CableCar, colorClass: 'bg-white text-violet-600 border-violet-200' }, 
        { id: 'moving', label: '무빙', val: data.items.moving, icon: ChevronsRight, colorClass: 'bg-white text-amber-600 border-amber-200' },
        { id: 'sled', label: '눈썰매', val: data.items.sled, icon: CloudSnow, colorClass: 'bg-white text-cyan-600 border-cyan-200' },
        { id: 'sightseeing', label: '관광L', val: data.items.sightseeing, icon: Camera, colorClass: 'bg-white text-emerald-600 border-emerald-200' },
        { id: 'shuttle', label: '셔틀', val: data.items.shuttle, icon: Bus, colorClass: 'bg-white text-slate-500 border-slate-300' },
        { id: 'equip', label: '장비', val: data.items.equip, icon: Backpack, colorClass: 'bg-white text-slate-400 border-slate-200' },
        { id: 'lesson', label: '강습', val: data.items.lesson, icon: Users, colorClass: 'bg-white text-slate-400 border-slate-200' },
        { id: 'clothE', label: '의류(E)', val: data.items.clothE, icon: Shirt, colorClass: 'bg-white text-slate-400 border-slate-200' },
        { id: 'clothS', label: '의류(S)', val: data.items.clothS, icon: Shirt, colorClass: 'bg-white text-slate-400 border-slate-200' },
    ].filter(item => item.val > 0);

    const handleSave = () => { onUpdateMemo(data.id, tempMemo); setIsEditingMemo(false); };

    return (
        <div className={`rounded-2xl border bg-white overflow-hidden transition-all duration-300 shadow-md ${isBoarded ? `border-blue-200 bg-blue-50/10` : 'border-slate-200 hover:shadow-lg'} mb-5`}>
            <div className="p-4 border-b border-slate-100 cursor-pointer active:bg-slate-50" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg shadow-sm border text-sm font-black ${styles.badgeBg} ${styles.text} ${styles.border}`}>{data.code.substring(0, 2)}</div>
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(data.resNo); alert("번호 복사됨"); }} className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border font-mono">{data.resNo}</button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onToggleBoarding(data.id); }} className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isBoarded ? `bg-white border-blue-600 text-blue-600` : `bg-white text-slate-400 border-slate-200`}`}>
                        <Check size={12} className="mr-1" strokeWidth={3}/>{isBoarded ? '탑승완료' : '탑승'}
                    </button>
                </div>
                <h3 className="font-bold text-xl text-slate-900 leading-none mb-2">{data.name}</h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center text-xs font-bold text-slate-600"><Users size={12} className="mr-0.5"/> {data.pax}명</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${langInfo.color}`}>{langInfo.label}</span>
                    <div className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getPickupColor(data.pickup)}`}>{data.pickup}</div>
                    {assignedSeat && <span className="flex items-center text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100"><Bus size={10} className="mr-0.5"/>{assignedSeat}</span>}
                </div>
                <div className="mt-3 space-y-2">
                     {data.event && <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 leading-snug"><span className="font-bold text-blue-600 mr-1">PKG</span>{data.event}</div>}
                     {memo && <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200 animate-in fade-in shadow-sm text-xs font-bold text-slate-700 flex items-start"><AlertCircle size={12} className="text-yellow-600 mr-1.5 mt-0.5 flex-shrink-0"/>{memo}</div>}
                </div>
                <div className="flex w-full gap-2 overflow-x-auto scrollbar-hide py-3 mt-1 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                    {allOptions.map((item) => {
                        const isChecked = dist[item.id];
                        return (
                            <button key={item.id} onClick={() => onToggleDist(data.id, item.id)} className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all flex-shrink-0 flex-none w-[4.5rem] ${isChecked ? 'bg-slate-50 border-slate-200 text-slate-300' : `${item.colorClass} shadow-sm active:scale-95`}`}>
                                {isChecked && <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl"><Check size={20} className="text-slate-400" strokeWidth={3}/></div>}
                                <span className="text-[10px] font-bold opacity-70">{item.label}</span>
                                <div className="flex items-center mt-0.5">{item.icon && !isChecked && <item.icon size={12} className="mr-1 opacity-70"/>}<span className="text-base font-black">{item.val}</span></div>
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-center opacity-20">{isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
            </div>
            {isOpen && (
                <div className="p-4 pt-0 bg-white space-y-3 animate-in slide-in-from-top-2 border-t border-slate-100">
                    <div className="grid grid-cols-4 gap-2 pt-3">
                         {data.contact && (<a href={`tel:${data.contact}`} className="flex items-center justify-center px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200"><Phone size={14} className="mr-1.5"/>전화</a>)}
                         <div className="col-span-2">{data.appId && <MessengerLink text={data.appId} />}</div>
                         <button onClick={(e) => { e.stopPropagation(); setIsEditingMemo(!isEditingMemo); }} className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold border ${memo ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{memo ? '수정' : '특이사항'}</button>
                    </div>
                    {isEditingMemo && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-3" onClick={(e) => e.stopPropagation()}>
                            <textarea value={tempMemo} onChange={(e) => setTempMemo(e.target.value)} className="w-full h-24 p-3 border border-slate-200 rounded-lg text-sm bg-white mb-2" autoFocus/>
                            <button onClick={handleSave} className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold text-sm">저장</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function BusSeatMap({ seatMap, busSize, onSeatClick, selectedSeat, blockedSeats }) {
    const renderSeat = (seatNum) => {
        const passenger = seatMap[seatNum];
        const isSelected = selectedSeat === seatNum;
        const isBlocked = blockedSeats.includes(seatNum);
        if (isBlocked) return <div key={seatNum} className="aspect-square border border-dashed rounded-lg flex flex-col items-center justify-center bg-slate-100 border-slate-300 text-slate-300 opacity-70"><Ban size={16} /></div>;
        if (!passenger) return <div key={`empty-${seatNum}`} onClick={() => onSeatClick && onSeatClick(seatNum, null)} className={`aspect-square border border-dashed rounded-lg bg-white border-slate-300 flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 ring-2 ring-blue-300 border-blue-400' : ''}`}><span className="opacity-50">{seatNum}</span></div>;
        
        const platform = getPlatformInfo(passenger);
        const lang = getLangInfo(passenger.lang);
        const nationality = getNationality(passenger.contact); 
        const isHot = passenger.event && (passenger.event.includes('HOT') || passenger.event.includes('[HOT]'));
        const pickupTint = getPickupSeatTint(passenger.pickup);

        const seatBaseClass = isSelected 
          ? 'border-blue-500 border-b-4 ring-1 ring-blue-500 bg-blue-50' 
          : `border-slate-300 border-b-[3px] active:border-b-0 active:translate-y-[3px] ${pickupTint}`;

        return (
            <div 
              key={`seat-${seatNum}`} 
              onClick={() => onSeatClick && onSeatClick(seatNum, passenger)} 
              style={{ transform: 'scale(1.05)', transformOrigin: 'center' }}
              className={`aspect-square w-full rounded-xl border flex flex-col items-center justify-between shadow-sm cursor-pointer transition-all ${seatBaseClass} p-1`}
            >
                <div className="w-full flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 leading-none">{seatNum}</span>
                    <div className="flex gap-0.5 items-center">
                        {isHot && <Flame size={12} className="text-rose-500 fill-rose-500" strokeWidth={2.5}/>}
                        {platform && <span className={`text-[10px] font-black ${platform.color}`}>{platform.label}</span>}
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center w-full flex-1 -mt-1 relative">
                    <span className={`text-[27px] font-black text-slate-700 leading-none tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]`}>{passenger.groupLabel}</span>
                </div>
                <div className="w-full grid grid-cols-3 items-end px-0.5 pb-0.5">
                     <div className="flex justify-start">
                        {nationality && <span className="text-[9px] font-bold text-slate-400 leading-none uppercase">{nationality}</span>}
                     </div>
                     <div className="flex justify-center whitespace-nowrap">
                        <span className="text-[10px] font-bold text-slate-800 leading-none">{passenger.pax}명</span>
                     </div>
                     <div className="flex justify-end">
                        <span className={`flex items-center justify-center w-4 h-4 rounded-full ${lang.color} text-[9px] font-black`}>{lang.label}</span>
                     </div>
                </div>
            </div>
        );
    };

    const rows = [];
    for(let r=0; r<10; r++) {
        rows.push(
            <div key={`row-${r}`} className="grid grid-cols-[1fr_1fr_0.5fr_1fr_1fr] gap-1.5 mb-2">
                {renderSeat(r*4 + 1)}
                {renderSeat(r*4 + 2)}
                <div key={`aisle-${r}`} className="aspect-square"></div>
                {renderSeat(r*4 + 3)}
                {renderSeat(r*4 + 4)}
            </div>
        ); 
    }
    const lastRow = (
        <div key="last-row" className="grid grid-cols-[1fr_1fr_0.5fr_1fr_1fr] gap-1.5 mt-1">
            {busSize === 45 
                ? [41, 42, 43, 44, 45].map(n => renderSeat(n)) 
                : [renderSeat(41), renderSeat(42), <div key="last-aisle" className="aspect-square"></div>, renderSeat(43), renderSeat(44)]
            }
        </div>
    );
    
    return (
        <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 mt-4 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-center font-bold text-slate-600 mb-3 flex items-center justify-center gap-2">
                <Bus size={20}/> 좌석 배치도 ({busSize}인승)
            </h4>
            <div className="bg-white p-3 rounded-2xl border shadow-sm overflow-hidden">
                <div className="text-center text-xs text-slate-400 mb-3 font-bold border-b border-slate-100 pb-1 uppercase tracking-widest font-sans">FRONT</div>
                {rows}
                {lastRow}
            </div>
        </div>
    );
}

function BusManager({ isOpen, onClose, teamData, teamName, setSeatMap }) {
    if (!isOpen) return null;
    const [busSize, setBusSize] = useState(44); 
    const [localSeatMap, setLocalSeatMap] = useState({});
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [priorities, setPriorities] = useState({ solo: true, group4: false, lang_cn: false, lang_en: false, loc_hong: false, loc_myeong: false, loc_dong: false });
    const [fillDirection, setFillDirection] = useState('front');
    const [blockedSeats, setBlockedSeats] = useState([]); 

    useEffect(() => {
        const savedMap = localStorage.getItem(`tm_seatMap_${teamName}`);
        if (savedMap) setLocalSeatMap(JSON.parse(savedMap));
    }, [teamName]);

    const handleSeatClick = (seatNum, passenger) => {
        if (blockedSeats.includes(seatNum)) return;
        if (selectedSeat === null) setSelectedSeat(seatNum);
        else {
            if (selectedSeat === seatNum) setSelectedSeat(null);
            else {
                const newMap = { ...localSeatMap };
                const temp = newMap[selectedSeat];
                newMap[selectedSeat] = newMap[seatNum];
                newMap[seatNum] = temp;
                if (!newMap[selectedSeat]) delete newMap[selectedSeat];
                if (!newMap[seatNum]) delete newMap[seatNum];
                setLocalSeatMap(newMap); setSeatMap(newMap);
                localStorage.setItem(`tm_seatMap_${teamName}`, JSON.stringify(newMap));
                setSelectedSeat(null);
            }
        }
    };

    const runAutoAssign = () => {
        const list = teamData.list.map((group, idx) => ({ ...group, groupLabel: `${teamName}${idx+1}` }));
        let sorted = [...list].sort((a,b) => b.pax - a.pax);
        sorted.sort((a, b) => {
            let scoreA = 0; let scoreB = 0;
            if (priorities.group4) { if (a.pax >= 4) scoreA += 50; if (b.pax >= 4) scoreB += 50; }
            if (priorities.solo) { if (a.pax === 1) scoreA += 20; if (b.pax === 1) scoreB += 20; }
            const isCn = (l) => /chi|cn|중국|대만|홍콩/.test((l||'').toLowerCase());
            const isEn = (l) => /eng|en|영어/.test((l||'').toLowerCase());
            if (priorities.lang_cn) { if (isCn(a.lang)) scoreA += 40; if (isCn(b.lang)) scoreB += 40; }
            if (priorities.lang_en) { if (isEn(a.lang)) scoreA += 40; if (isEn(b.lang)) scoreB += 40; }
            if (priorities.loc_hong && a.pickup.includes('홍대')) scoreA += 30;
            if (priorities.loc_hong && b.pickup.includes('홍대')) scoreB += 30;
            if (priorities.loc_myeong && a.pickup.includes('명동')) scoreA += 30;
            if (priorities.loc_myeong && b.pickup.includes('명동')) scoreB += 30;
            if (priorities.loc_dong && a.pickup.includes('동대문')) scoreA += 30;
            if (priorities.loc_dong && b.pickup.includes('동대문')) scoreB += 30;
            return scoreB - scoreA;
        });
        const newSeatMap = {};
        let seatIdx = fillDirection === 'front' ? 1 : busSize;
        const step = fillDirection === 'front' ? 1 : -1;
        sorted.forEach(group => {
            let seatsNeeded = group.pax;
            while (seatsNeeded > 0) {
                if (seatIdx < 1 || seatIdx > busSize) break;
                if (blockedSeats.includes(seatIdx)) { seatIdx += step; continue; }
                newSeatMap[seatIdx] = group;
                seatIdx += step;
                seatsNeeded--;
            }
        });
        setLocalSeatMap(newSeatMap); setSeatMap(newSeatMap);
        localStorage.setItem(`tm_seatMap_${teamName}`, JSON.stringify(newSeatMap));
        setSelectedSeat(null);
    };

    return (
        <div className="p-4 space-y-4 pb-20">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center text-lg"><Settings size={18} className="mr-2"/> 배차 옵션</h3>
                <div className="flex gap-2 mb-4">
                        <label className="flex-1 flex items-center justify-center text-sm font-bold text-slate-600 bg-white px-3 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="radio" checked={busSize===44} onChange={()=>setBusSize(44)} className="mr-2 accent-blue-600"/> 44인승</label>
                        <label className="flex-1 flex items-center justify-center text-sm font-bold text-slate-600 bg-white px-3 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="radio" checked={busSize===45} onChange={()=>setBusSize(45)} className="mr-2 accent-blue-600"/> 45인승</label>
                </div>
                <div className="mb-4 space-y-3">
                    <div><label className="text-xs font-bold text-slate-500 mb-1.5 block">기본 정렬</label><div className="flex flex-wrap gap-2"><button onClick={() => setPriorities(p => ({...p, solo: !p.solo}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.solo ? 'bg-white text-blue-600 border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>혼자</button><button onClick={() => setPriorities(p => ({...p, group4: !p.group4}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.group4 ? 'bg-white text-blue-600 border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>4인↑</button></div></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1.5 block">언어 우선</label><div className="flex flex-wrap gap-2"><button onClick={() => setPriorities(p => ({...p, lang_cn: !p.lang_cn}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.lang_cn ? 'bg-white text-red-600 border-red-600' : 'bg-white text-slate-500 border-slate-200'}`}>중국어</button><button onClick={() => setPriorities(p => ({...p, lang_en: !p.lang_en}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.lang_en ? 'bg-white text-blue-600 border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>영어</button></div></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1.5 block">픽업지 우선</label><div className="flex flex-wrap gap-2"><button onClick={() => setPriorities(p => ({...p, loc_hong: !p.loc_hong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_hong ? 'bg-white text-green-600 border-green-600' : 'bg-white text-slate-500 border-slate-200'}`}>홍대</button><button onClick={() => setPriorities(p => ({...p, loc_myeong: !p.loc_myeong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_myeong ? 'bg-white text-sky-600 border-sky-600' : 'bg-white text-slate-500 border-slate-200'}`}>명동</button><button onClick={() => setPriorities(p => ({...p, loc_dong: !p.loc_dong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_dong ? 'bg-white text-purple-600 border-purple-600' : 'bg-white text-slate-500 border-slate-200'}`}>동대문</button></div></div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 mb-2 block">채우기 방향</label><div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setFillDirection('front')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${fillDirection === 'front' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>앞 → 뒤</button><button onClick={() => setFillDirection('back')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${fillDirection === 'back' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>뒤 → 앞</button></div></div>
                        <div><label className="text-xs font-bold text-slate-500 mb-2 block">좌석 비우기</label><div className="flex gap-1">{[1, 2, 3, 4].map(num => (<button key={num} onClick={() => setBlockedSeats(prev => prev.includes(num) ? prev.filter(s => s !== num) : [...prev, num])} className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-colors ${blockedSeats.includes(num) ? 'bg-white border-rose-600 text-rose-600' : 'bg-white border-slate-200 text-slate-400'}`}>{num}</button>))}</div></div>
                </div>
                <button onClick={runAutoAssign} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md hover:bg-slate-900 active:scale-95 transition-all flex justify-center items-center"><ArrowRightLeft size={18} className="mr-2"/> 자동 배차 실행</button>
            </div>
            <BusSeatMap seatMap={localSeatMap} busSize={busSize} onSeatClick={handleSeatClick} selectedSeat={selectedSeat} blockedSeats={blockedSeats} />
        </div>
    );
}

function TeamSelector({ allTeamsSummary, onSelect }) {
    return (
        <div className="p-4 space-y-4 pb-20">
             <div className="flex items-center mb-2"><h2 className="text-lg font-bold text-slate-800">팀을 선택하세요</h2></div>
             {allTeamsSummary.map((team) => {
                 const styles = TEAM_THEMES[team.team] || TEAM_THEMES['DEFAULT'];
                 return (
                     <div key={team.team} onClick={() => onSelect(team.team)} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                          <div className={`absolute right-0 top-0 w-20 h-20 rounded-bl-full opacity-10 ${styles.bg}`}></div>
                          <div className="flex items-center">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm border mr-4 ${styles.badgeBg} ${styles.text} ${styles.border}`}>{team.team}</div>
                              <div><h4 className="font-bold text-slate-800 text-lg leading-tight mb-1">{team.guides || '가이드 미정'}</h4><span className="text-xs text-slate-500 font-medium">총 {team.totalPax}명</span></div>
                          </div>
                     </div>
                 );
             })}
        </div>
    );
}

function MessageCenter({ isOpen, onClose, teamData, teamName, seatMap }) {
    if (!isOpen) return null;
    const [guideName, setGuideName] = useState(localStorage.getItem('tm_guideName') || ""); 
    const [globalNotice, setGlobalNotice] = useState(localStorage.getItem('tm_globalNotice') || ""); 
    const getAssignedSeats = (group) => {
        const assigned = []; if (!seatMap) return '';
        Object.entries(seatMap).forEach(([seat, passenger]) => { if (passenger.id === group.id) assigned.push(seat); });
        return assigned.sort((a,b) => a-b).join(', ');
    };
    const getMessage = (group) => {
        const pickupTime = group.pickup.includes('홍대') ? '06:40' : group.pickup.includes('명동') ? '07:10' : '07:20'; 
        return encodeURIComponent(`[${guideName}]\n\nHello, this is your ski tour guide.\nMeeting: ${group.pickup} / ${pickupTime}\n\n*${globalNotice}`);
    };
    return (
        <div className="p-4 space-y-4 pb-20">
             <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center mb-2"><Settings size={14} className="mr-2"/> 가이드 설정</h4>
                <div><label className="block text-xs font-bold text-slate-400 mb-1">가이드 영문 이름</label><input type="text" value={guideName} onChange={(e)=>{setGuideName(e.target.value); localStorage.setItem('tm_guideName', e.target.value);}} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50" placeholder="ex) Mr. Kim"/></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-1">공통 공지사항</label><textarea value={globalNotice} onChange={(e)=>{setGlobalNotice(e.target.value); localStorage.setItem('tm_globalNotice', e.target.value);}} className="w-full p-3 border border-slate-200 rounded-xl h-24 text-sm bg-slate-50 resize-none" placeholder="추가 공지사항..."/></div>
                <button onClick={() => downloadVCard(teamData.list, teamName)} className="w-full bg-green-600 text-white px-4 py-3 rounded-xl font-bold shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center text-sm"><Save size={16} className="mr-2"/> 연락처 VCard 저장</button>
            </div>
            <div className="space-y-3">
                 <h3 className="font-bold text-slate-700 text-sm flex items-center justify-between px-1"><span>발송 리스트 ({teamData.list?.length || 0})</span></h3>
                 {teamData.list?.map((group, idx) => {
                    const seats = getAssignedSeats(group);
                    return (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div><span className="inline-block bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-bold mb-1 mr-2">{group.groupLabel}</span><span className="font-bold text-slate-800 text-base">{group.name}</span><div className="flex items-center gap-2 mt-1"><span className="text-xs text-slate-500">({group.pax}명)</span>{seats && <span className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100"><Bus size={10} className="mr-1"/>{seats}</span>}</div></div>
                                <div className="text-right"><span className="text-xs font-bold bg-white border border-blue-600 text-blue-600 px-2 py-1 rounded">{group.pickup}</span></div>
                            </div>
                            <div className="flex gap-2">
                                <a href={`https://wa.me/${group.contact.replace(/[^0-9]/g,'')}?text=${getMessage(group)}`} target="_blank" rel="noreferrer" className="flex-1 bg-[#25D366] text-white py-2.5 rounded-xl text-center font-bold text-sm flex items-center justify-center hover:opacity-90 shadow-sm"><MessageCircle size={16} className="mr-1.5"/> WhatsApp</a>
                                <button onClick={() => { copyToClipboard(decodeURIComponent(getMessage(group))); alert("메시지 복사됨"); }} className="bg-white text-slate-500 border border-slate-200 px-4 rounded-xl hover:bg-slate-50"><Copy size={18}/></button>
                            </div>
                        </div>
                    );
                 })}
            </div>
        </div>
    );
}

function Dashboard({ allTeamsSummary, stats, onTeamClick }) {
    return (
        <div className="p-4 space-y-4 pb-20">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Users size={20} className="mr-2 text-blue-600"/> 종합 현황</h2>
                <div className="flex items-center justify-between mb-6">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none"/><circle cx="48" cy="48" r="40" stroke="#2563eb" strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (stats.boardedPax / stats.total || 0))} className="transition-all duration-1000"/>
                        </svg>
                        <div className="absolute flex flex-col items-center"><span className="text-xl font-black text-slate-800">{isNaN(Math.round((stats.boardedPax / stats.total) * 100)) ? 0 : Math.round((stats.boardedPax / stats.total) * 100)}%</span><span className="text-[10px] text-slate-400 font-bold">탑승률</span></div>
                    </div>
                    <div className="flex-1 ml-6 space-y-2">
                         <div className="flex justify-between items-center border-b border-slate-50 pb-2"><span className="text-xs text-slate-500 font-bold">총 인원</span><span className="text-lg font-black text-slate-800">{stats.total}명</span></div>
                         <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-bold">탑승 완료</span><span className="text-lg font-black text-blue-600">{stats.boardedPax}명</span></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-slate-600 flex items-center"><Snowflake size={12} className="mr-1 text-sky-500"/>스키 강습</span><span className="text-sm font-black text-slate-800">{stats.lessonSkiTotal || 0}</span></div><div className="flex text-[10px] text-slate-400 gap-2"><span>중: <b className="text-slate-600">{stats.lessonSkiCn || 0}</b></span><span>영: <b className="text-slate-600">{stats.lessonSkiEn || 0}</b></span></div></div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100"><div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-slate-600 flex items-center"><Snowflake size={12} className="mr-1 text-rose-500"/>보드 강습</span><span className="text-sm font-black text-slate-800">{stats.lessonBoardTotal || 0}</span></div><div className="flex text-[10px] text-slate-400 gap-2"><span>중: <b className="text-slate-600">{stats.lessonBoardCn || 0}</b></span><span>영: <b className="text-slate-600">{stats.lessonBoardEn || 0}</b></span></div></div>
                </div>
            </div>
            <h3 className="font-bold text-slate-700 text-lg px-1">팀별 현황</h3>
            {allTeamsSummary.map((team) => {
                const styles = TEAM_THEMES[team.team] || TEAM_THEMES['DEFAULT'];
                return (
                    <div key={team.team} onClick={() => onTeamClick(team.team)} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                         <div className={`absolute right-0 top-0 w-20 h-20 rounded-bl-full opacity-10 ${styles.bg}`}></div>
                         <div className="flex justify-between items-start mb-3">
                             <div className="flex items-center">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm border mr-3 ${styles.badgeBg} ${styles.text} ${styles.border}`}>{team.team}</div>
                                 <div><h4 className="font-bold text-slate-800 text-lg">{team.guides || '가이드 미정'}</h4><span className="text-xs text-slate-500 font-medium">총 {team.totalPax}명 / 탑승 {team.boardedPax}명</span></div>
                             </div>
                             <div className="text-right"><span className={`text-2xl font-black ${styles.text}`}>{team.progress}%</span></div>
                         </div>
                         <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4"><div className={`h-full rounded-full transition-all duration-1000 ${styles.bar}`} style={{ width: `${team.progress}%` }}></div></div>
                         <div className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}><span className="text-xs text-slate-500 font-bold truncate max-w-[150px]"><Bus size={12} className="inline mr-1"/>{team.busInfo}</span></div>
                    </div>
                );
            })}
        </div>
    );
}

function BottomNavigation({ activeTab, onTabChange }) {
    const tabs = [{ id: 'home', label: '홈', icon: Home }, { id: 'bus', label: '버스', icon: Bus }, { id: 'message', label: '메시지', icon: MessageSquare }, { id: 'menu', label: '관리', icon: Menu }];
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 pb-6 z-50 shadow-md">
            <div className="flex justify-between items-center max-w-xl mx-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${isActive ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400'}`}>
                            <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
                            <span className="text-[10px] font-bold">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedTeam, setSelectedTeam] = useState(null); 
  const [locationFilter, setLocationFilter] = useState('전체');
  const [busSelectedTeam, setBusSelectedTeam] = useState(null); 
  const [msgSelectedTeam, setMsgSelectedTeam] = useState(null); 
  const [appState, setAppState] = useState({});
  const [seatMap, setSeatMap] = useState({}); 

  useEffect(() => {
    const saved = localStorage.getItem('guide_pro_state_v40'); 
    if (saved) setAppState(JSON.parse(saved));
    loadData(); 
  }, []);

  const saveState = (newState) => { setAppState(newState); localStorage.setItem('guide_pro_state_v40', JSON.stringify(newState)); };

  const loadData = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error("Load failed");
        const text = await response.text();
        const parsed = parseCSV(text);
        const dataRows = parsed.filter((row, idx) => {
            const teamCol = row[0] ? row[0].trim() : '';
            if (!teamCol) return false;
            const headers = ['팀구분', 'TEAM', 'Team', '구분', 'Guide', '가이드', 'Code', '순번'];
            return idx > 0 && !headers.some(h => teamCol.toUpperCase().includes(h.toUpperCase()));
        });
        const formatted = dataRows.map((row, idx) => ({
            id: `${row[COLS.TEAM]}-${row[COLS.CODE]}-${idx}`,
            team: row[COLS.TEAM].toUpperCase(),
            guide: row[COLS.GUIDE],
            code: row[COLS.CODE],
            event: row[COLS.EVENT], 
            resNo: row[COLS.RES_NO],
            name: row[COLS.NAME],
            contact: row[COLS.CONTACT],
            appId: row[COLS.APP_ID],
            email: row[COLS.EMAIL],
            lang: row[COLS.LANG],
            pax: safeParseInt(row[COLS.PAX]),
            pickup: row[COLS.PICKUP] ? row[COLS.PICKUP].trim() : '',
            items: {
                shuttle: safeParseInt(row[COLS.SHUTTLE]), sled: safeParseInt(row[COLS.SLED]),
                sightseeing: safeParseInt(row[COLS.SIGHTSEEING]), moving: safeParseInt(row[COLS.MOVING]),
                lift: safeParseInt(row[COLS.LIFT]), equip: safeParseInt(row[COLS.EQUIP]),
                lesson: safeParseInt(row[COLS.LESSON]), clothE: safeParseInt(row[COLS.CLOTH_E]), clothS: safeParseInt(row[COLS.CLOTH_S]),
            },
            busInfo: row[COLS.BUS_INFO]
        }));
        setRawData(formatted);
      } catch (err) { setError("데이터 로딩 실패"); } finally { setLoading(false); }
  };

  const handleTabChange = (tabId) => {
      setActiveTab(tabId);
      if (tabId === 'bus') setBusSelectedTeam(null);
      if (tabId === 'message') setMsgSelectedTeam(null);
  };

  const availableTeams = useMemo(() => [...new Set(rawData.map(d => d.team).filter(Boolean))].sort(), [rawData]);

  const allTeamsSummary = useMemo(() => {
    return availableTeams.map(team => {
      const teamList = rawData.filter(d => d.team === team);
      const grouped = buildGroupedForTeam(teamList);
      const totalPax = grouped.reduce((acc, g) => acc + g.pax, 0);
      const boardedPax = grouped.reduce((acc, g) => appState[g.id]?.boarded ? acc + g.pax : acc, 0);
      return { team, totalPax, boardedPax, guides: [...new Set(teamList.map(d => d.guide).filter(Boolean))].join(', '), busInfo: teamList.find(d => d.busInfo)?.busInfo || '정보 없음', progress: totalPax > 0 ? Math.round((boardedPax / totalPax) * 100) : 0 };
    });
  }, [availableTeams, rawData, appState]);

  const dashboardStats = useMemo(() => {
    const s = { total: 0, boardedPax: 0, lessonSkiTotal: 0, lessonSkiCn: 0, lessonSkiEn: 0, lessonBoardTotal: 0, lessonBoardCn: 0, lessonBoardEn: 0 };
    allTeamsSummary.forEach(t => { s.total += t.totalPax; s.boardedPax += t.boardedPax; });
    rawData.forEach(item => {
        const count = item.items.lesson || 0;
        if (count > 0) {
            const isBoard = item.event && (/board/i.test(item.event) || /보드/i.test(item.event));
            const isCn = /chi|cn|중국|대만|홍콩/.test((item.lang || '').toLowerCase());
            if (isBoard) { s.lessonBoardTotal += count; if (isCn) s.lessonBoardCn += count; else s.lessonBoardEn += count; }
            else { s.lessonSkiTotal += count; if (isCn) s.lessonSkiCn += count; else s.lessonSkiEn += count; }
        }
    });
    return s;
  }, [allTeamsSummary, rawData]);

  const groupedList = useMemo(() => {
    let targetTeam = activeTab === 'home' ? selectedTeam : (activeTab === 'bus' ? busSelectedTeam : msgSelectedTeam);
    if (!targetTeam) return [];
    const currentTeamData = rawData.filter(d => d.team === targetTeam);
    return buildGroupedForTeam(currentTeamData).map((g, i) => ({...g, groupLabel: `${targetTeam}${i+1}`}));
  }, [rawData, selectedTeam, busSelectedTeam, msgSelectedTeam, activeTab]);

  const currentList = useMemo(() => locationFilter === '전체' ? groupedList : groupedList.filter(item => item.pickup.includes(locationFilter)), [groupedList, locationFilter]);

  const stats = useMemo(() => {
    const initialStats = { total: 0, boardedPax: 0, pickups: {}, boardedPickups: {}, totalItems: { shuttle: 0, sled: 0, sightseeing: 0, moving: 0, lift: 0, equip: 0, lesson: 0, clothE: 0, clothS: 0 }, checkedItems: { shuttle: 0, sled: 0, sightseeing: 0, moving: 0, lift: 0, equip: 0, lesson: 0, clothE: 0, clothS: 0 } };
    return groupedList.reduce((acc, curr) => {
      acc.total += curr.pax;
      // 픽업지별 집계 (상위 필터 버튼과 호환되도록 정리)
      const pickupRaw = curr.pickup || '기타';
      let pickupKey = '기타';
      if (pickupRaw.includes('홍대')) pickupKey = '홍대';
      else if (pickupRaw.includes('명동')) pickupKey = '명동';
      else if (pickupRaw.includes('동대문')) pickupKey = '동대문';
      else if (pickupRaw.includes('스키장')) pickupKey = '스키장';
      
      acc.pickups[pickupKey] = (acc.pickups[pickupKey] || 0) + curr.pax;
      if (appState[curr.id]?.boarded) { 
          acc.boardedPax += curr.pax; 
          acc.boardedPickups[pickupKey] = (acc.boardedPickups[pickupKey] || 0) + curr.pax; 
      }
      
      Object.keys(acc.totalItems).forEach(k => acc.totalItems[k] += curr.items[k]);
      const dist = appState[curr.id]?.distributed || {};
      Object.keys(acc.checkedItems).forEach(k => { if(dist[k]) acc.checkedItems[k] += curr.items[k]; });
      return acc;
    }, initialStats);
  }, [groupedList, appState]);

  const findAssignedSeat = (passengerId) => {
      const targetTeam = activeTab === 'bus' ? busSelectedTeam : (activeTab === 'message' ? msgSelectedTeam : selectedTeam);
      const savedMap = localStorage.getItem(`tm_seatMap_${targetTeam}`);
      if (!savedMap) return null;
      const parsedMap = JSON.parse(savedMap);
      const entry = Object.entries(parsedMap).find(([seat, p]) => p.id === passengerId);
      return entry ? entry[0] : null;
  };

  const renderContent = () => {
      if (loading) return <div className="h-[60vh] flex items-center justify-center"><RefreshCw className="animate-spin text-blue-600"/></div>;
      if (error) return <div className="p-8 text-center"><AlertCircle className="mx-auto text-rose-500 mb-4" size={32}/><button onClick={loadData} className="px-6 py-2 bg-blue-600 text-white rounded-lg">재시도</button></div>;
      
      switch(activeTab) {
        case 'bus': if (!busSelectedTeam) return <TeamSelector allTeamsSummary={allTeamsSummary} onSelect={setBusSelectedTeam} />;
            return (<div><div className="bg-white px-4 py-3 flex items-center border-b sticky top-0 z-10"><button onClick={() => setBusSelectedTeam(null)} className="p-1 mr-2 text-slate-500"><ChevronLeft size={24}/></button><h2 className="font-bold text-lg">버스 배차 ({busSelectedTeam}팀)</h2></div><BusManager isOpen={true} teamData={{list: groupedList}} teamName={busSelectedTeam} setSeatMap={(m) => { localStorage.setItem(`tm_seatMap_${busSelectedTeam}`, JSON.stringify(m)); setSeatMap(m); }} /></div>);
        case 'message': if (!msgSelectedTeam) return <TeamSelector allTeamsSummary={allTeamsSummary} onSelect={setMsgSelectedTeam} />;
            return (<div><div className="bg-white px-4 py-3 flex items-center border-b sticky top-0 z-10"><button onClick={() => setMsgSelectedTeam(null)} className="p-1 mr-2 text-slate-500"><ChevronLeft size={24}/></button><h2 className="font-bold text-lg">메시지 센터 ({msgSelectedTeam}팀)</h2></div><MessageCenter isOpen={true} teamData={{list: groupedList}} teamName={msgSelectedTeam} seatMap={seatMap} /></div>);
        case 'menu': return (<div className="p-4"><div className="bg-white p-5 rounded-2xl shadow-sm border"><h3 className="font-bold text-lg mb-4">관리 메뉴</h3><button onClick={loadData} className="w-full flex items-center p-3 bg-slate-50 rounded-xl mb-2"><RefreshCw size={18} className="mr-3 text-blue-600"/><span className="font-bold">데이터 새로고침</span></button><div className="p-3 text-xs text-slate-400 text-center mt-4">App Version {APP_VERSION}</div></div></div>);
        default: if (!selectedTeam) return <Dashboard allTeamsSummary={allTeamsSummary} stats={dashboardStats} onTeamClick={(t) => { setSelectedTeam(t); setLocationFilter('전체'); }} />;
            const currentTeamInfo = allTeamsSummary.find(t => t.team === selectedTeam);
            return (<>
                    <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
                        <div className="px-4 py-3 flex items-center justify-between"><button onClick={() => setSelectedTeam(null)} className="p-1 -ml-2 text-slate-500"><ChevronLeft size={28}/></button><h1 className="text-xl font-black">{selectedTeam}팀 <span className="text-sm font-bold text-slate-500 ml-1">{currentTeamInfo?.guides}</span></h1><div className="w-8"></div></div>
                        <div className="px-4 pb-3"><div className="flex items-center gap-3"><div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 bg-blue-600`} style={{ width: `${currentTeamInfo?.progress}%` }}></div></div><span className="text-sm font-black">{currentTeamInfo?.progress}%</span></div></div>
                        <div className="px-4 py-2 border-t overflow-x-auto scrollbar-hide flex items-center space-x-2">
                             <TopSummaryBox label="리프트" total={stats.totalItems.lift} checked={stats.checkedItems.lift} color="violet" />
                             <TopSummaryBox label="무빙" total={stats.totalItems.moving} checked={stats.checkedItems.moving} color="amber" />
                             <TopSummaryBox label="눈썰매" total={stats.totalItems.sled} checked={stats.checkedItems.sled} color="cyan" />
                             <TopSummaryBox label="관광L" total={stats.totalItems.sightseeing} checked={stats.checkedItems.sightseeing} color="emerald" />
                             <TopSummaryBox label="셔틀" total={stats.totalItems.shuttle} simple color="slate" />
                             <TopSummaryBox label="장비" total={stats.totalItems.equip} checked={stats.checkedItems.equip} simple color="slate" />
                             <TopSummaryBox label="강습" total={stats.totalItems.lesson} checked={stats.checkedItems.lesson} simple color="slate" />
                             <TopSummaryBox label="의류" total={stats.totalItems.clothE + stats.totalItems.clothS} checked={stats.checkedItems.clothE + stats.checkedItems.clothS} simple color="slate" />
                        </div>
                        <div className="px-4 py-2 border-t flex gap-1 overflow-x-auto scrollbar-hide">
                            {['전체', '홍대', '명동', '동대문', '스키장'].map(loc => {
                                const total = loc === '전체' ? stats.total : (stats.pickups[loc] || 0);
                                if (loc !== '전체' && total === 0) return null;
                                const boarded = loc === '전체' ? stats.boardedPax : (stats.boardedPickups[loc] || 0);
                                const isActive = locationFilter === loc;
                                return (<button key={loc} onClick={() => setLocationFilter(loc)} className={`px-3 py-2 rounded-xl whitespace-nowrap flex items-center gap-1.5 transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-slate-500'}`}><span className="text-xs font-bold">{loc}</span><div className="flex items-baseline"><span className="text-sm font-black">{total - boarded}</span><span className="text-[10px] font-medium ml-0.5 opacity-70">/{total}</span></div></button>);
                            })}
                        </div>
                    </div>
                    <div className="p-4 space-y-4 pb-24 bg-slate-50 min-h-screen">
                        {currentList.map(item => (<DetailCard key={item.id} data={item} state={appState[item.id] || {}} onToggleBoarding={(id) => { const c = appState[id] || {}; saveState({ ...appState, [id]: { ...c, boarded: !c.boarded } }); }} onToggleDist={(id, k) => { const c = appState[id] || {}; const d = c.distributed || {}; saveState({ ...appState, [id]: { ...c, distributed: { ...d, [k]: !d[k] } } }); }} onUpdateMemo={(id, text) => { const c = appState[id] || {}; saveState({ ...appState, [id]: { ...c, memo: text } }); }} styles={TEAM_THEMES[selectedTeam] || TEAM_THEMES['DEFAULT']} assignedSeat={findAssignedSeat(item.id)}/>))}
                    </div>
                </>
            );
      }
  };

  return (<div className="min-h-screen bg-slate-50 font-sans text-slate-900">{renderContent()}<BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} /></div>);
}
