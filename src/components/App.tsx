import React, { useState, useEffect, useMemo } from 'react';
import { Check, Users, RefreshCw, AlertCircle, Phone, MessageCircle, Bus, Snowflake, ArrowUpRight, Mountain, ClipboardList, Mail, MapPin, Shirt, ChevronLeft, Calendar, ExternalLink, Lock, Copy, FileText, PenLine, Flame, Download, Share2, MessageSquare, Truck, Settings, Save, Disc, DoorOpen, ArrowRightLeft, User, Globe, Repeat, Ban, Camera, ChevronsRight, CableCar, CloudSnow, Backpack, X, FileSpreadsheet, Home, Menu, PhoneCall, ChevronDown, ChevronUp } from 'lucide-react';

// *** 구글 시트 데이터 연결 ***
const SHEET_ID = "1Celx7ApccgzrNwbw6VyZRqUG_zg1z_dp3WmBhTFDlF0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const APP_VERSION = "v3.53_Final"; // 중복 선언 오류 수정 및 디자인 고도화

// --- 데이터 컬럼 매핑 ---
const COLS = {
  TEAM: 0, GUIDE: 1, BUS_INFO: 2, CODE: 3, EVENT: 4, RES_NO: 5, NAME: 6, CONTACT: 7, APP_ID: 8, EMAIL: 9, LANG: 10, PAX: 11, PICKUP: 12, SHUTTLE: 13, SLED: 14, SIGHTSEEING: 15, MOVING: 16, LIFT: 17, EQUIP: 18, LESSON: 19, CLOTH_E: 20, CLOTH_S: 21, NOTE: 22
};

// --- 전역 테마 ---
const UNIFIED_THEME = {
    bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-800',
    badgeBg: 'bg-white', badgeText: 'text-blue-600', button: 'bg-blue-600 border-blue-600',
    bar: 'bg-blue-600', lightBg: 'bg-white'
};

const TEAM_THEMES = {
  'A': { bg: 'bg-white', badgeBg: 'bg-white', button: 'bg-blue-600 border-blue-600', text: 'text-blue-600', ring: 'ring-blue-600', lightBg: 'bg-white', border: 'border-blue-600' },
  'B': { bg: 'bg-white', badgeBg: 'bg-white', button: 'bg-emerald-600 border-emerald-600', text: 'text-emerald-600', ring: 'ring-emerald-600', lightBg: 'bg-white', border: 'border-emerald-600' },
  'C': { bg: 'bg-white', badgeBg: 'bg-white', button: 'bg-violet-600 border-violet-600', text: 'text-violet-600', ring: 'ring-violet-600', lightBg: 'bg-white', border: 'border-violet-600' },
  'DEFAULT': { bg: 'bg-white', badgeBg: 'bg-white', button: 'bg-slate-600 border-slate-600', text: 'text-slate-600', ring: 'ring-slate-600', lightBg: 'bg-white', border: 'border-slate-600' }
};

// --- 유틸리티 ---
const parseCSV = (text) => {
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
};

const safeParseInt = (val) => {
  if (!val) return 0;
  const str = String(val).replace(/,/g, '').trim();
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 0 : parsed;
};

const copyToClipboard = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
  document.body.removeChild(textArea);
};

const getPickupColor = (pickup) => {
    if (!pickup) return 'text-slate-400 border-slate-200';
    if (pickup.includes('홍대')) return 'text-green-600 border-green-600';
    if (pickup.includes('명동')) return 'text-sky-500 border-sky-500';
    if (pickup.includes('동대문')) return 'text-purple-600 border-purple-600';
    if (pickup.includes('스키장')) return 'text-slate-500 border-slate-400';
    return 'text-slate-700 border-slate-700';
};

const getTheme = (teamName) => {
    const t = teamName.replace('팀', '').trim().toUpperCase();
    return TEAM_THEMES[t] || TEAM_THEMES['DEFAULT'];
};

const getPlatformInfo = (item) => {
    const resNo = (item.resNo || '').toUpperCase();
    const appId = (item.appId || '').toUpperCase();
    const code = (item.code || '').toUpperCase();
    
    if (resNo.includes('KK') || appId.includes('KKDAY')) { return { label: 'K', color: 'text-cyan-500' }; }
    const klookPattern = /[A-Z0-9]{6,}/; 
    if ((klookPattern.test(resNo) && !resNo.startsWith('TK')) || appId.includes('KLOOK') || code.includes('KLOOK')) { return { label: 'K', color: 'text-orange-500' }; }
    if (resNo.includes('Q') || appId.includes('QIKE')) { return { label: 'Q', color: 'text-emerald-500' }; }
    return null; 
};

const getLangInfo = (lang) => {
    const lower = (lang || '').toLowerCase();
    if (lower.includes('taiwan') || lower.includes('대만')) return { label: '대만', color: 'bg-white text-red-600 border-red-200 border', type: 'cn' };
    if (lower.includes('hong') || lower.includes('홍콩')) return { label: '홍콩', color: 'bg-white text-red-600 border-red-200 border', type: 'cn' };
    if (lower.includes('chi') || lower.includes('중국') || lower.includes('cn')) return { label: '중국어', color: 'bg-white text-red-600 border-red-200 border', type: 'cn' }; 
    if (lower.includes('eng') || lower.includes('영어') || lower.includes('en')) return { label: '영어', color: 'bg-white text-blue-600 border-blue-200 border', type: 'en' };
    if (lower.includes('kor') || lower.includes('한국')) return { label: '한국', color: 'bg-white text-slate-600 border-slate-200 border', type: 'kr' };
    return { label: '기타', color: 'bg-white text-blue-600 border-blue-200 border', type: 'en' }; 
};

const getPickupShort = (pickup) => {
    if (!pickup) return '';
    if (pickup.includes('홍대')) return '홍대';
    if (pickup.includes('명동')) return '명동';
    if (pickup.includes('동대문')) return '동대문';
    if (pickup.includes('스키장')) return '스키장';
    return pickup.substring(0, 2);
};

const getNationality = (contact) => {
    if (!contact) return '';
    const num = contact.replace(/[^0-9]/g, '');
    if (num.startsWith('82') || num.startsWith('010')) return '한국';
    if (num.startsWith('86')) return '중국';
    if (num.startsWith('886')) return '대만';
    if (num.startsWith('852')) return '홍콩';
    if (num.startsWith('1')) return '미국';
    if (num.startsWith('65')) return '싱가'; 
    if (num.startsWith('60')) return '말레'; 
    if (num.startsWith('66')) return '태국';
    if (num.startsWith('81')) return '일본';
    if (num.startsWith('84')) return '베트남';
    if (num.startsWith('63')) return '필리핀';
    return '';
};

const downloadVCard = (teamData, teamName) => {
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
};

const toE164KR = (num) => {
  const only = (num || "").replace(/[^0-9]/g, '');
  if (!only) return '';
  if (only.startsWith('0')) return `+82${only.slice(1)}`;
  if (only.startsWith('82')) return `+${only}`;
  return `+${only}`;
};

const extractPhoneNumber = (str) => {
    if (!str) return '';
    return str.match(/\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/)?.[0] || '';
};

const tryOpenDeepLink = (url) => {
  try {
      window.location.href = url;
  } catch (e) {
      console.warn("Deep link failed", e);
  }
};

const buildGroupedForTeam = (dataRows) => {
  const groups = new Map();
  dataRows.forEach((item) => {
    const key = item.contact && item.contact.length > 5
      ? item.contact.replace(/[-\s]/g, '')
      : (item.name || '').trim().toLowerCase();
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, { ...item, codes: [item.code], members: [item] });
    } else {
      const g = groups.get(key);
      g.codes.push(item.code);
      g.members.push(item);
      g.pax += (item.pax || 0);
      Object.keys(g.items).forEach(k => { g.items[k] += (item.items?.[k] || 0); });
      if (!g.note && item.note) g.note = item.note;
    }
  });
  return Array.from(groups.values()).sort((a, b) => {
      const codeA = a.codes?.[0] || "";
      const codeB = b.codes?.[0] || "";
      return codeA.localeCompare(codeB, undefined, { numeric: true });
  });
};

// --- 컴포넌트들 ---

const TopSummaryBox = ({ label, total, checked, color = "slate", simple = false }) => {
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
    const remaining = checked !== undefined ? total - checked : null;
    const showRemaining = !simple && remaining !== null && checked > 0;
    
    let numClass = 'text-xl font-black leading-none tracking-tight';
    if (color === 'slate') numClass = 'text-lg font-medium leading-none tracking-tight'; 
    if (color === 'gray') numClass = 'text-lg font-bold leading-none tracking-tight'; 

    return (
        <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl border flex-shrink-0 min-w-[3.5rem] h-[3.8rem] shadow-sm ${style}`}>
            <span className="text-[10px] font-bold mb-0.5 opacity-80">{label}</span>
            <div className="flex items-end gap-0.5">
                <span className={numClass}>{total}</span>
                {showRemaining && (<span className="text-[10px] font-bold opacity-60 mb-0.5">({remaining})</span>)}
            </div>
        </div>
    );
};

const MessengerLink = ({ text }) => {
    if (!text) return null;
    
    const lower = text.toLowerCase();
    const rawId = (text.match(/[:\s]+(.+)/) || [])[1]?.trim() || text;
    const cleanNumber = rawId.replace(/[^0-9]/g, '');

    let type = 'Messenger';
    let action = 'copy';
    let url = null;
    let deep = null;

    if (lower.includes('line')) {
        type = 'Line';
        url = `https://line.me/R/ti/p/~${rawId}`;
        action = 'link';
    } else if (lower.includes('whats') || lower.includes('wa')) {
        type = 'WhatsApp';
        url = `https://wa.me/${cleanNumber}`;
        action = 'link';
    } else if (lower.includes('kakao') || lower.includes('kkt') || lower.includes('talk')) {
        type = 'KakaoTalk';
        action = 'copy';
        deep = 'kakaotalk://';
    } else if (lower.includes('wechat') || lower.includes('wx')) {
        type = 'WeChat';
        action = 'copy';
        deep = 'weixin://';
    } else if (lower.includes('viber')) {
        type = 'Viber';
        if (/^\+?\d+$/.test(rawId) || cleanNumber.length > 5) {
             const e164 = toE164KR(cleanNumber);
             action = 'link';
             url = `viber://chat?number=${encodeURIComponent(e164)}`;
        } else {
            action = 'copy';
            deep = 'viber://';
        }
    }

    const handleClick = (e) => {
        e.stopPropagation();
        if (action === 'copy') {
            copyToClipboard(rawId);
            alert(`${type} 정보가 복사되었습니다: ${rawId}\n앱을 열어 친구 추가를 진행하세요.`);
            if (deep) tryOpenDeepLink(deep);
        }
    };

    const iconColors = {
        'Line': 'text-green-500',
        'WhatsApp': 'text-green-600',
        'KakaoTalk': 'text-yellow-600',
        'WeChat': 'text-green-700',
        'Viber': 'text-purple-600',
        'Messenger': 'text-slate-500'
    };

    const btnClass = "flex items-center px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer w-full justify-center";

    if (action === 'link' && url) {
        return (
            <a href={url} target="_blank" rel="noreferrer" className={btnClass} onClick={(e) => e.stopPropagation()}>
                <MessageCircle size={14} className={`mr-1.5 flex-shrink-0 mt-0.5 ${iconColors[type] || iconColors['Messenger']}`}/> 
                <span className="break-all">{text}</span>
                <ExternalLink size={10} className="ml-1 opacity-50 flex-shrink-0 mt-0.5"/>
            </a>
        );
    } else {
        return (
            <button onClick={handleClick} className={btnClass}>
                 <MessageCircle size={14} className={`mr-1.5 flex-shrink-0 mt-0.5 ${iconColors[type] || iconColors['Messenger']}`}/> 
                 <span className="break-all">{text}</span>
                 <Copy size={10} className="ml-1 opacity-50 flex-shrink-0 mt-0.5"/>
            </button>
        );
    }
};

const DetailCard = ({ data, teamBusInfo, state, onToggleBoarding, onToggleDist, onUpdateMemo, theme, styles, assignedSeat }) => {
    const isBoarded = state.boarded;
    const memo = state.memo || '';
    const dist = state.distributed || {};
    const [copied, setCopied] = useState(false);
    
    // 카드 펼침 상태
    const [isOpen, setIsOpen] = useState(false);
    // 메모 수정 모드
    const [isEditingMemo, setIsEditingMemo] = useState(false);
    const [tempMemo, setTempMemo] = useState(memo);

    const handleCopy = (text) => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const langInfo = getLangInfo(data.lang); 
    const platform = getPlatformInfo(data);
    
    const allOptions = [
        { id: 'lift', label: '리프트', val: data.items.lift, type: 'check', icon: CableCar, colorClass: 'bg-white text-violet-600 border-violet-200', textClass: 'text-slate-700', numClass: 'font-black' }, 
        { id: 'moving', label: '무빙', val: data.items.moving, type: 'check', icon: ChevronsRight, colorClass: 'bg-white text-amber-600 border-amber-200', textClass: 'text-slate-700', numClass: 'font-black' },
        { id: 'sled', label: '눈썰매', val: data.items.sled, type: 'check', icon: CloudSnow, colorClass: 'bg-white text-cyan-600 border-cyan-200', textClass: 'text-slate-700', numClass: 'font-black' },
        { id: 'sightseeing', label: '관광L', val: data.items.sightseeing, type: 'check', icon: Camera, colorClass: 'bg-white text-emerald-600 border-emerald-200', textClass: 'text-slate-700', numClass: 'font-black' },
        { id: 'shuttle', label: '셔틀', val: data.items.shuttle, type: 'check', icon: Bus, colorClass: 'bg-white text-slate-500 border-slate-300', textClass: 'text-slate-600', numClass: 'font-bold' },
        { id: 'equip', label: '장비', val: data.items.equip, type: 'info', icon: Backpack, textClass: 'text-slate-400', numClass: 'font-medium' },
        { id: 'lesson', label: '강습', val: data.items.lesson, type: 'info', icon: Users, textClass: 'text-slate-400', numClass: 'font-medium' },
        { id: 'clothE', label: '의류(E)', val: data.items.clothE, type: 'info', icon: Shirt, textClass: 'text-slate-400', numClass: 'font-medium' },
        { id: 'clothS', label: '의류(S)', val: data.items.clothS, type: 'info', icon: Shirt, textClass: 'text-slate-400', numClass: 'font-medium' },
    ].filter(item => item.val > 0);

    const btnClass = "flex items-center justify-center px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors";
    const isHot = data.event && (data.event.includes('[HOT]') || data.event.includes('HOT'));
    const boxWidthClass = allOptions.length <= 5 ? 'flex-none w-[4.5rem]' : 'flex-1 min-w-[3.5rem]';

    const handleSaveMemo = () => {
        onUpdateMemo(data.id, tempMemo);
        setIsEditingMemo(false);
    };

    return (
        <div id={`card-${data.code}`} className={`rounded-2xl border shadow-sm bg-white overflow-hidden transition-all duration-300 ${isBoarded ? `border-blue-200 bg-blue-50/10` : 'border-slate-200 hover:shadow-md'} mb-4`}>
            {/* Header: Always Visible - Click to Toggle Open/Close */}
            <div 
                className="p-4 border-b border-slate-50 bg-white cursor-pointer active:bg-slate-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {/* 1. 상단 정보 */}
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg shadow-sm border text-sm font-black ${styles.badgeBg} ${styles.text} ${styles.border}`}>
                            {data.code.substring(0, 2)}
                        </div>
                        {/* 예약번호 */}
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(data.resNo); }} className="flex items-center text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                            {copied ? <Check size={10} className="text-green-500 mr-1"/> : <Copy size={10} className="mr-1"/>}
                            <span className={`font-mono ${copied ? 'text-green-600' : ''}`}>{data.resNo}</span>
                        </button>
                    </div>
                    {/* 탑승 버튼 */}
                    <button onClick={(e) => { e.stopPropagation(); onToggleBoarding(); }} className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm border ${isBoarded ? `bg-white border-blue-600 text-blue-600` : `bg-white text-slate-400 border-slate-200`}`}>
                        <Check size={12} className={`mr-1 ${isBoarded ? 'text-blue-600' : 'text-slate-300'}`} strokeWidth={3}/>{isBoarded ? '탑승완료' : '탑승'}
                    </button>
                </div>

                {/* 2. 이름 */}
                <div className="mb-2">
                    <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-xl text-slate-900 leading-none">{data.name}</h3>
                        {isHot && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded border border-rose-100">HOT</span>}
                    </div>
                </div>

                {/* 3. 상세 정보 뱃지들 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center text-xs font-bold text-slate-600"><Users size={12} className="mr-0.5"/> {data.pax}명</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${langInfo.color}`}>{langInfo.label}</span>
                    <div className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getPickupColor(data.pickup)}`}>{data.pickup}</div>
                    {assignedSeat && <span className="flex items-center text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100"><Bus size={10} className="mr-0.5"/>{assignedSeat}</span>}
                </div>

                {/* PKG Name & Memo */}
                <div className="mt-3 space-y-2">
                     {data.event && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                             <p className="text-xs text-slate-600 font-medium leading-snug line-clamp-2">
                                <span className="font-bold text-blue-600 mr-1">PKG</span>{data.event}
                             </p>
                        </div>
                    )}
                    {/* Memo (Yellow Box) */}
                    {memo && (
                        <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200 animate-in fade-in slide-in-from-top-1 shadow-sm">
                            <p className="text-xs text-slate-700 font-bold whitespace-pre-wrap flex items-start">
                                <AlertCircle size={12} className="text-yellow-600 mr-1.5 mt-0.5 flex-shrink-0"/>
                                {memo}
                            </p>
                        </div>
                    )}
                </div>
                
                {/* Options Box (Always Visible) */}
                <div className="flex w-full gap-2 overflow-x-auto scrollbar-hide py-3 mt-1 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                    {allOptions.map((item) => {
                        const isDistributed = dist[item.id];
                        const isCheckItem = item.type === 'check';

                        if (isCheckItem) {
                            return (
                                <button key={item.id} onClick={() => onToggleDist(data.id, item.id)} className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 flex-shrink-0 ${boxWidthClass} ${isDistributed ? 'bg-slate-50 border-slate-200 text-slate-300 shadow-inner' : `${item.colorClass} shadow-sm hover:brightness-95`}`}>
                                    {isDistributed && (<div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl"><Check size={20} className="text-slate-400" strokeWidth={3}/></div>)}
                                    <span className={`text-[10px] font-bold ${isDistributed ? 'opacity-50' : item.textClass || ''}`}>{item.label}</span>
                                    <div className="flex items-center mt-0.5">
                                        {item.icon && !isDistributed && <item.icon size={12} className="mr-1 opacity-70"/>}
                                        <span className={`text-base leading-none ${item.numClass} ${isDistributed ? 'opacity-30' : ''}`}>{item.val}</span>
                                    </div>
                                </button>
                            );
                        } else {
                            return (
                                <div key={item.id} className={`flex flex-col items-center justify-center p-2 rounded-xl border bg-white border-slate-200 flex-shrink-0 ${boxWidthClass} shadow-sm`}>
                                     <div className={`text-[10px] font-bold mb-0.5 ${item.textClass || 'text-slate-400'}`}>{item.label}</div>
                                     <div className={`flex items-center text-base leading-none mt-0.5 ${item.textClass}`}>
                                        {item.icon && <item.icon size={12} className="mr-1 opacity-50"/>}
                                        <span className={item.numClass}>{item.val}</span>
                                     </div>
                                </div>
                            );
                        }
                    })}
                </div>
                
                 {/* Chevron */}
                 <div className="flex justify-center mt-0 opacity-20">
                    {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                 </div>
            </div>

            {/* Collapsible Body (Contact & Inline Memo Input) */}
            {isOpen && (
                <div className="p-4 pt-0 bg-white space-y-3 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-50">
                         {data.contact && (<a href={`tel:${data.contact}`} className={btnClass} onClick={(e) => e.stopPropagation()}><Phone size={14} className="mr-1.5"/>전화</a>)}
                         <div className="col-span-2">{data.appId && <MessengerLink text={data.appId} />}</div>
                         
                         {/* 특이사항 버튼 */}
                         <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditingMemo(!isEditingMemo); }} 
                            className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${memo ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                         >
                            {memo ? '수정' : <><PenLine size={12} className="mr-1.5"/>특이사항</>}
                         </button>
                    </div>

                    {isEditingMemo && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-3 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                            <textarea 
                                value={tempMemo} 
                                onChange={(e) => setTempMemo(e.target.value)} 
                                className="w-full h-24 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none bg-white mb-2"
                                placeholder="특이사항을 입력하세요..."
                                autoFocus
                            />
                            <button 
                                onClick={handleSaveMemo} 
                                className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all"
                            >
                                저장
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const BusSeatMap = ({ seatMap, busSize, onSeatClick, selectedSeat, blockedSeats }) => {
    const renderSeat = (seatNum) => {
        const passenger = seatMap[seatNum];
        const isSelected = selectedSeat === seatNum;
        const isBlocked = blockedSeats.includes(seatNum);
        if (isBlocked) { return (<div key={seatNum} className="aspect-square border border-dashed rounded-lg flex flex-col items-center justify-center bg-slate-100 border-slate-300 text-slate-300 opacity-70"><Ban size={16} /></div>); }
        if (!passenger) { return (<div key={seatNum} onClick={() => onSeatClick && onSeatClick(seatNum, null)} className={`aspect-square border border-dashed rounded-lg flex items-center justify-center text-xs font-bold relative transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300' : 'bg-white border-slate-300 text-slate-300 hover:bg-slate-50'}`}><span className="absolute top-0.5 left-1 text-[9px] opacity-50">{seatNum}</span></div>); }
        const platform = getPlatformInfo(passenger);
        const lang = getLangInfo(passenger.lang);
        const nationality = getNationality(passenger.contact); 
        const isHot = passenger.event && passenger.event.includes('HOT');
        const shortPickup = getPickupShort(passenger.pickup);
        const seatBorderClass = isSelected ? 'border-blue-500 border-b-4 ring-1 ring-blue-500 bg-blue-50' : 'border-slate-300 border-b-[3px] active:border-b-0 active:translate-y-[3px] bg-white';
        const textClass = isSelected ? 'text-blue-700' : 'text-slate-600'; 

        return (
            <div key={seatNum} onClick={() => onSeatClick && onSeatClick(seatNum, passenger)} className={`aspect-square w-full rounded-lg border flex flex-col items-center justify-between shadow-sm cursor-pointer relative overflow-hidden transition-all duration-75 ${seatBorderClass} p-0.5`}>
                <div className="w-full flex justify-between items-start">
                    <span className="text-[11px] font-bold text-slate-400 leading-none ml-0.5">{seatNum}</span>
                    <div className="flex gap-0.5">
                        {isHot && <span className="w-4 h-4 flex items-center justify-center bg-rose-50 text-rose-500 rounded text-[9px] font-black border border-rose-100 leading-none pt-0.5">H</span>}
                        {platform && <span className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-black ${platform.color} leading-none pt-0.5`}>{platform.label}</span>}
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center w-full flex-1 -mt-1">
                    <span className={`text-2xl font-black ${textClass} break-words text-center leading-none truncate w-full tracking-tighter`}>{passenger.groupLabel}</span>
                </div>
                <div className="w-full flex justify-center items-center gap-0.5 text-[9px] font-bold text-slate-500 leading-none mb-0.5">
                     {shortPickup && <span>{shortPickup}</span>}
                     <span>{passenger.pax}</span>
                     {nationality && <span className="text-slate-400">{nationality}</span>}
                     <span>{lang.label}</span>
                </div>
            </div>
        );
    };

    const rows = [];
    const totalRows = 10; 
    for(let r=0; r<totalRows; r++) {
        const rowSeats = [];
        rowSeats.push(renderSeat(r*4 + 1)); 
        rowSeats.push(renderSeat(r*4 + 2)); 
        rowSeats.push(<div key={`aisle-${r}`} className="aspect-square"></div>); 
        rowSeats.push(renderSeat(r*4 + 3)); 
        rowSeats.push(renderSeat(r*4 + 4)); 
        rows.push(<div key={r} className="grid grid-cols-5 gap-1 mb-1">{rowSeats}</div>); 
    }
    
    let lastRow = null; 
    if (busSize === 45) { 
        const lastRowSeats = [41, 42, 43, 44, 45].map(n => renderSeat(n));
        lastRow = (<div className="grid grid-cols-5 gap-1 mt-1">{lastRowSeats}</div>); 
    } else { 
        lastRow = (<div className="grid grid-cols-5 gap-1 mt-1">{renderSeat(41)}{renderSeat(42)}<div className="aspect-square"></div>{renderSeat(43)}{renderSeat(44)}</div>); 
    }
    
    return (<div className="bg-slate-50 p-2 rounded-xl border border-slate-200 mt-4 animate-in slide-in-from-bottom-5"><h4 className="text-center font-bold text-slate-600 mb-2 flex items-center justify-center gap-2"><Bus size={20}/> 좌석 배치도 ({busSize}인승)</h4><div className="text-center text-xs text-slate-400 mb-2">클릭 후 다른 좌석을 선택하면 자리가 교체됩니다.</div><div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm"><div className="text-center text-xs text-slate-400 mb-2 font-bold border-b border-slate-100 pb-1">FRONT (운전석)</div>{rows}{lastRow}</div></div>);
};

const BusManager = ({ isOpen, onClose, teamData, teamName, setSeatMap }) => {
    if (!isOpen) return null;
    const [busSize, setBusSize] = useState(44); 
    const [generatedGroups, setGeneratedGroups] = useState([]); 
    const [localSeatMap, setLocalSeatMap] = useState({});
    const [priorities, setPriorities] = useState({ solo: true, group4: false, lang_cn: false, lang_en: false, loc_hong: false, loc_myeong: false, loc_dong: false });
    const [fillDirection, setFillDirection] = useState('front');
    const [blockedSeats, setBlockedSeats] = useState([]); 
    const [selectedSeat, setSelectedSeat] = useState(null);

    useEffect(() => { 
        if(teamData && teamData.list) {
            const labeled = teamData.list.map((group, idx) => ({ ...group, groupLabel: `${teamName}${idx+1}` }));
            setGeneratedGroups(labeled); 
        }
    }, [teamData, teamName]);

    useEffect(() => {
        const savedMap = localStorage.getItem(`tm_seatMap_${teamName}`);
        if (savedMap) setLocalSeatMap(JSON.parse(savedMap));
    }, [teamName]);

    const updateSeatMap = (newMap) => {
        setLocalSeatMap(newMap);
        setSeatMap(newMap);
        localStorage.setItem(`tm_seatMap_${teamName}`, JSON.stringify(newMap));
    };

    const toggleBlockedSeat = (seatNum) => { setBlockedSeats(prev => prev.includes(seatNum) ? prev.filter(s => s !== seatNum) : [...prev, seatNum]); };

    const runAutoAssign = () => {
        let sorted = [...generatedGroups].sort((a,b) => b.pax - a.pax);
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
        updateSeatMap(newSeatMap);
        setSelectedSeat(null);
    };

    const handleSeatClick = (seatNum, passenger) => {
        if (blockedSeats.includes(seatNum)) return; 
        if (selectedSeat === null) { setSelectedSeat(seatNum); } else {
            if (selectedSeat === seatNum) { setSelectedSeat(null); } else {
                const newMap = { ...localSeatMap };
                const temp = newMap[selectedSeat];
                newMap[selectedSeat] = newMap[seatNum];
                newMap[seatNum] = temp;
                if (!newMap[selectedSeat]) delete newMap[selectedSeat];
                if (!newMap[seatNum]) delete newMap[seatNum];
                updateSeatMap(newMap);
                setSelectedSeat(null);
            }
        }
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
                    <div><label className="text-xs font-bold text-slate-500 mb-1.5 block">언어 우선</label><div className="flex flex-wrap gap-2"><button onClick={() => setPriorities(p => ({...p, lang_cn: !p.lang_cn}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.lang_cn ? 'bg-white text-red-600 border-red-600' : 'bg-white text-slate-500 border-slate-200'}`}>중국어(Red)</button><button onClick={() => setPriorities(p => ({...p, lang_en: !p.lang_en}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.lang_en ? 'bg-white text-blue-600 border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>영어(Blue)</button></div></div>
                    <div><label className="text-xs font-bold text-slate-500 mb-1.5 block">픽업지 우선</label><div className="flex flex-wrap gap-2"><button onClick={() => setPriorities(p => ({...p, loc_hong: !p.loc_hong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_hong ? 'bg-white text-green-600 border-green-600' : 'bg-white text-slate-500 border-slate-200'}`}>홍대</button><button onClick={() => setPriorities(p => ({...p, loc_myeong: !p.loc_myeong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_myeong ? 'bg-white text-sky-600 border-sky-600' : 'bg-white text-slate-500 border-slate-200'}`}>명동</button><button onClick={() => setPriorities(p => ({...p, loc_dong: !p.loc_dong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_dong ? 'bg-white text-purple-600 border-purple-600' : 'bg-white text-slate-500 border-slate-200'}`}>동대문</button></div></div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 mb-2 block">채우기 방향</label><div className="flex bg-slate-100 p-1 rounded-lg"><button onClick={() => setFillDirection('front')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${fillDirection === 'front' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>앞 → 뒤</button><button onClick={() => setFillDirection('back')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${fillDirection === 'back' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>뒤 → 앞</button></div></div>
                        <div><label className="text-xs font-bold text-slate-500 mb-2 block">좌석 비우기 (선택)</label><div className="flex gap-1">{[1, 2, 3, 4].map(num => (<button key={num} onClick={() => toggleBlockedSeat(num)} className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-colors ${blockedSeats.includes(num) ? 'bg-white border-rose-600 text-rose-600' : 'bg-white border-slate-200 text-slate-400'}`}>{num}</button>))}</div></div>
                </div>
                <button onClick={runAutoAssign} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md hover:bg-slate-900 active:scale-95 transition-all flex justify-center items-center"><ArrowRightLeft size={18} className="mr-2"/> 자동 배차 실행</button>
            </div>
            <BusSeatMap seatMap={localSeatMap} busSize={busSize} onSeatClick={handleSeatClick} selectedSeat={selectedSeat} blockedSeats={blockedSeats} />
        </div>
    );
};

const TeamSelector = ({ allTeamsSummary, onSelect }) => {
    return (
        <div className="p-4 space-y-4 pb-20">
             <div className="flex items-center mb-2">
                 <h2 className="text-lg font-bold text-slate-800">팀을 선택하세요</h2>
             </div>
             {allTeamsSummary.map((team) => {
                 const styles = TEAM_THEMES[team.team] || TEAM_THEMES['DEFAULT'];
                 return (
                     <div key={team.team} onClick={() => onSelect(team.team)} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                          <div className={`absolute right-0 top-0 w-20 h-20 rounded-bl-full opacity-10 ${styles.bg}`}></div>
                          <div className="flex items-center">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm border mr-4 ${styles.badgeBg} ${styles.text} ${styles.border}`}>
                                  {team.team}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-lg leading-tight mb-1">{team.guides || '가이드 미정'}</h4>
                                  <span className="text-xs text-slate-500 font-medium">총 {team.totalPax}명</span>
                              </div>
                          </div>
                     </div>
                 );
             })}
        </div>
    );
};

const MessageCenter = ({ isOpen, onClose, teamData, teamName, seatMap }) => {
    if (!isOpen) return null;
    const [guideName, setGuideName] = useState(localStorage.getItem('tm_guideName') || ""); 
    const [globalNotice, setGlobalNotice] = useState(localStorage.getItem('tm_globalNotice') || ""); 
    const [msgTemplate, setMsgTemplate] = useState("");
    
    const handleGuideNameChange = (e) => { setGuideName(e.target.value); localStorage.setItem('tm_guideName', e.target.value); };
    const handleGlobalNoticeChange = (e) => { setGlobalNotice(e.target.value); localStorage.setItem('tm_globalNotice', e.target.value); };

    const getAssignedSeats = (group) => {
        const assigned = [];
        if (!seatMap) return '';
        Object.entries(seatMap).forEach(([seat, passenger]) => {
            if (passenger.id === group.id) assigned.push(seat);
        });
        return assigned.sort((a,b) => a-b).join(', ');
    };
    
    const getMessage = (group) => {
        const pickupTime = group.pickup.includes('홍대') ? '06:40' : group.pickup.includes('명동') ? '07:10' : '07:20'; 
        let msg = `[${guideName}]\n\nHello, this is your ski tour guide.\nMeeting: ${group.pickup} / ${pickupTime}\n\n*${globalNotice}`;
        return encodeURIComponent(msg);
    };

    const contacts = teamData.list ? teamData.list.filter(p => p.contact && p.contact.length > 5).map(p => p.contact.replace(/[-\s]/g, '')) : [];
    const uniqueContacts = [...new Set(contacts)];
    const handleCopyContacts = () => { copyToClipboard(uniqueContacts.join(',')); alert(`총 ${uniqueContacts.length}개의 연락처가 복사되었습니다.`); };
    const handleDownloadVCard = () => { downloadVCard(teamData.list, teamName); };

    return (
        <div className="p-4 space-y-4 pb-20">
             <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center mb-2"><Settings size={14} className="mr-2"/> 가이드 설정</h4>
                <div><label className="block text-xs font-bold text-slate-400 mb-1">가이드 영문 이름</label><input type="text" value={guideName} onChange={handleGuideNameChange} className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-slate-50" placeholder="ex) Mr. Kim"/></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-1">공통 공지사항</label><textarea value={globalNotice} onChange={handleGlobalNoticeChange} className="w-full p-3 border border-slate-200 rounded-xl h-24 text-sm bg-slate-50 resize-none" placeholder="추가 공지사항..."/></div>
                <button onClick={handleDownloadVCard} className="w-full bg-green-600 text-white px-4 py-3 rounded-xl font-bold shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center text-sm"><Save size={16} className="mr-2"/> 연락처 VCard 저장</button>
            </div>

            <div className="space-y-3">
                 <h3 className="font-bold text-slate-700 text-sm flex items-center justify-between px-1"><span>발송 리스트 ({teamData.list?.length || 0})</span></h3>
                 {teamData.list?.map((group, idx) => {
                    const seats = getAssignedSeats(group);
                    return (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="inline-block bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-bold mb-1 mr-2">{group.groupLabel}</span>
                                    <span className="font-bold text-slate-800 text-base">{group.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500">({group.pax}명)</span>
                                        {seats && <span className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100"><Bus size={10} className="mr-1"/>{seats}</span>}
                                    </div>
                                </div>
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
};

const Dashboard = ({ allTeamsSummary, stats, onTeamClick }) => {
    return (
        <div className="p-4 space-y-4 pb-20">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Users size={20} className="mr-2 text-blue-600"/> 종합 현황</h2>
                <div className="flex items-center justify-between mb-6">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none"/>
                            <circle cx="48" cy="48" r="40" stroke="#2563eb" strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (stats.boardedPax / stats.total || 0))} className="transition-all duration-1000"/>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-xl font-black text-slate-800">{isNaN(Math.round((stats.boardedPax / stats.total) * 100)) ? 0 : Math.round((stats.boardedPax / stats.total) * 100)}%</span>
                            <span className="text-[10px] text-slate-400 font-bold">탑승률</span>
                        </div>
                    </div>
                    <div className="flex-1 ml-6 space-y-2">
                         <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                             <span className="text-xs text-slate-500 font-bold">총 인원</span>
                             <span className="text-lg font-black text-slate-800">{stats.total}명</span>
                         </div>
                         <div className="flex justify-between items-center">
                             <span className="text-xs text-slate-500 font-bold">탑승 완료</span>
                             <span className="text-lg font-black text-blue-600">{stats.boardedPax}명</span>
                         </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-600 flex items-center"><Snowflake size={12} className="mr-1 text-sky-500"/>스키 강습</span>
                            <span className="text-sm font-black text-slate-800">{stats.lessonSkiTotal || 0}</span>
                        </div>
                        <div className="flex text-[10px] text-slate-400 gap-2">
                            <span>중: <b className="text-slate-600">{stats.lessonSkiCn || 0}</b></span>
                            <span>영: <b className="text-slate-600">{stats.lessonSkiEn || 0}</b></span>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-600 flex items-center"><Snowflake size={12} className="mr-1 text-rose-500"/>보드 강습</span>
                            <span className="text-sm font-black text-slate-800">{stats.lessonBoardTotal || 0}</span>
                        </div>
                        <div className="flex text-[10px] text-slate-400 gap-2">
                            <span>중: <b className="text-slate-600">{stats.lessonBoardCn || 0}</b></span>
                            <span>영: <b className="text-slate-600">{stats.lessonBoardEn || 0}</b></span>
                        </div>
                    </div>
                </div>
            </div>

            <h3 className="font-bold text-slate-700 text-lg px-1">팀별 현황</h3>
            {allTeamsSummary.map((team) => {
                const styles = TEAM_THEMES[team.team] || TEAM_THEMES['DEFAULT'];
                const phone = extractPhoneNumber(team.busInfo);
                return (
                    <div key={team.team} onClick={() => onTeamClick(team.team)} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer">
                         <div className={`absolute right-0 top-0 w-20 h-20 rounded-bl-full opacity-10 ${styles.bg}`}></div>
                         <div className="flex justify-between items-start mb-3">
                             <div className="flex items-center">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-sm border mr-3 ${styles.badgeBg} ${styles.text} ${styles.border}`}>
                                     {team.team}
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-slate-800 text-lg">{team.guides || '가이드 미정'}</h4>
                                     <span className="text-xs text-slate-500 font-medium">총 {team.totalPax}명 / 탑승 {team.boardedPax}명</span>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <span className={`text-2xl font-black ${styles.text}`}>{team.progress}%</span>
                             </div>
                         </div>
                         <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                             <div className={`h-full rounded-full transition-all duration-1000 ${styles.bar}`} style={{ width: `${team.progress}%` }}></div>
                         </div>
                         <div className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                             <span className="text-xs text-slate-500 font-bold truncate max-w-[150px]"><Bus size={12} className="inline mr-1"/>{team.busInfo}</span>
                             {phone && (
                                <a href={`tel:${phone}`} className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${styles.text} ${styles.border} bg-white hover:bg-slate-50`}>
                                    <PhoneCall size={12} className="mr-1.5"/>기사님
                                </a>
                             )}
                         </div>
                    </div>
                );
            })}
        </div>
    );
};

// *** Bottom Navigation ***
const BottomNavigation = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'home', label: '홈', icon: Home },
        { id: 'bus', label: '버스', icon: Bus },
        { id: 'message', label: '메시지', icon: MessageSquare },
        { id: 'menu', label: '관리', icon: Menu }, 
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 pb-6 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center max-w-xl mx-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button 
                            key={tab.id} 
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${isActive ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
                            <span className="text-[10px] font-bold">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

// *** Main App Component ***
export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tourDate, setTourDate] = useState({ date: '', type: '' });
  
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedTeam, setSelectedTeam] = useState(null); 
  const [locationFilter, setLocationFilter] = useState('전체');
  const [busSelectedTeam, setBusSelectedTeam] = useState(null); 
  const [msgSelectedTeam, setMsgSelectedTeam] = useState(null); 
  
  const [appState, setAppState] = useState({});
  const [seatMap, setSeatMap] = useState({}); 

  // ... (useEffect for Load/Save - Same as v1.79) ...
  useEffect(() => {
    const saved = localStorage.getItem('guide_pro_state_v40'); 
    if (saved) setAppState(JSON.parse(saved));
    loadData(); 
  }, []);

  useEffect(() => {
      // Load seat map for selected team in Bus/Msg tab or Main Detail
      const target = activeTab === 'bus' ? busSelectedTeam : (activeTab === 'message' ? msgSelectedTeam : selectedTeam);
      if (target) {
          const savedMap = localStorage.getItem(`tm_seatMap_${target}`);
          setSeatMap(savedMap ? JSON.parse(savedMap) : {});
      }
  }, [selectedTeam, busSelectedTeam, msgSelectedTeam, activeTab]); 

  const saveState = (newState) => { setAppState(newState); localStorage.setItem('guide_pro_state_v40', JSON.stringify(newState)); };

  const loadData = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error("Load failed");
        const text = await response.text();
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
            const row1 = parsed[0];
            if (row1[1] && !row1[1].includes('가이드')) setTourDate({ date: row1[1], type: '' });
            else setTourDate({ date: '날짜 정보 없음', type: '' });
        }
        const dataRows = parsed.filter(row => {
            const teamCol = row[0] ? row[0].trim() : '';
            if (!teamCol) return false;
            const headers = ['팀구분', 'TEAM', 'Team', '구분', 'Guide', '가이드', 'Code', '순번'];
            if (headers.some(h => teamCol.toUpperCase().includes(h.toUpperCase()))) return false;
            if (row[1] && headers.some(h => row[1].toUpperCase().includes(h.toUpperCase()))) return false;
            return true; 
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
            note: row[COLS.NOTE],
            busInfo: row[COLS.BUS_INFO], 
            items: {
                shuttle: safeParseInt(row[COLS.SHUTTLE]), sled: safeParseInt(row[COLS.SLED]),
                sightseeing: safeParseInt(row[COLS.SIGHTSEEING]), moving: safeParseInt(row[COLS.MOVING]),
                lift: safeParseInt(row[COLS.LIFT]), equip: safeParseInt(row[COLS.EQUIP]),
                lesson: safeParseInt(row[COLS.LESSON]), clothE: safeParseInt(row[COLS.CLOTH_E]), clothS: safeParseInt(row[COLS.CLOTH_S]),
            }
        }));
        setRawData(formatted);
      } catch (err) { setError("데이터 로딩 실패"); } finally { setLoading(false); }
  };

  const availableTeams = useMemo(() => [...new Set(rawData.map(d => d.team).filter(Boolean))].sort(), [rawData]);

  const groupedList = useMemo(() => {
    // Determine target team based on tab
    let targetTeam = null;
    if (activeTab === 'home') targetTeam = selectedTeam;
    else if (activeTab === 'bus') targetTeam = busSelectedTeam;
    else if (activeTab === 'message') targetTeam = msgSelectedTeam;
    
    if (!targetTeam) return [];
    
    const currentTeamData = rawData.filter(d => d.team === targetTeam);
    return buildGroupedForTeam(currentTeamData).map((g, i) => ({...g, groupLabel: `${targetTeam}${i+1}`}));
  }, [rawData, selectedTeam, busSelectedTeam, msgSelectedTeam, activeTab]);

  const currentList = useMemo(() => {
    if (locationFilter === '전체') return groupedList;
    return groupedList.filter(item => item.pickup && item.pickup.includes(locationFilter));
  }, [groupedList, locationFilter]);

  const stats = useMemo(() => {
    const initialStats = {
      total: 0, boardedPax: 0, pickups: {}, boardedPickups: {},
      totalItems: { shuttle: 0, sled: 0, sightseeing: 0, moving: 0, lift: 0, equip: 0, lesson: 0, clothE: 0, clothS: 0, hot: 0 },
      checkedItems: { shuttle: 0, sled: 0, sightseeing: 0, moving: 0, lift: 0 }
    };
    return groupedList.reduce((acc, curr) => {
      acc.total += (curr.pax || 0);
      if (appState[curr.id]?.boarded) acc.boardedPax += (curr.pax || 0);
      if (curr.event && /HOT/i.test(curr.event)) acc.totalItems.hot += (curr.pax || 0);
      acc.totalItems.shuttle += curr.items.shuttle; acc.totalItems.lift += curr.items.lift;
      acc.totalItems.moving += curr.items.moving; acc.totalItems.sled += curr.items.sled;
      acc.totalItems.sightseeing += curr.items.sightseeing; acc.totalItems.equip += curr.items.equip;
      acc.totalItems.lesson += curr.items.lesson; acc.totalItems.clothE += curr.items.clothE; acc.totalItems.clothS += curr.items.clothS;
      
      const dist = appState[curr.id]?.distributed || {};
      if(dist.lift) acc.checkedItems.lift += curr.items.lift;
      if(dist.moving) acc.checkedItems.moving += curr.items.moving;
      return acc;
    }, initialStats);
  }, [groupedList, appState]);

  // Dashboard Stats Logic (Aggregated)
  const dashboardStats = useMemo(() => {
      const stats = { 
          total: 0, boardedPax: 0, 
          lessonSkiTotal: 0, lessonSkiCn: 0, lessonSkiEn: 0,
          lessonBoardTotal: 0, lessonBoardCn: 0, lessonBoardEn: 0 
      };
      
      availableTeams.forEach(team => {
          const teamList = rawData.filter(d => d.team === team);
          const grouped = buildGroupedForTeam(teamList);
          
          grouped.forEach(g => {
             stats.total += g.pax;
          });
      });
      
      rawData.forEach(item => {
          const count = item.items.lesson || 0;
          if (count > 0) {
            const isBoard = item.event && (/board/i.test(item.event) || /보드/i.test(item.event));
            const lang = (item.lang || '').toLowerCase();
            const isCn = /chi|cn|중국|대만|홍콩/.test(lang);
            
            if (isBoard) {
                stats.lessonBoardTotal += count;
                if (isCn) stats.lessonBoardCn += count; else stats.lessonBoardEn += count;
            } else {
                stats.lessonSkiTotal += count;
                if (isCn) stats.lessonSkiCn += count; else stats.lessonSkiEn += count;
            }
          }
      });
      return stats;
  }, [rawData, availableTeams]);


  // Dashboard Summary per Team
  const allTeamsSummary = useMemo(() => {
    return availableTeams.map(team => {
      const teamList = rawData.filter(d => d.team === team);
      const grouped = buildGroupedForTeam(teamList);
      
      const totalPax = grouped.reduce((acc, g) => acc + (g.pax || 0), 0);
      const boardedPax = grouped.reduce((acc, g) => {
          if (appState[g.id]?.boarded) return acc + (g.pax || 0);
          return acc;
      }, 0);
      
      const guides = [...new Set(teamList.map(d => d.guide).filter(Boolean))].join(', ');
      const busInfo = teamList.find(d => d.busInfo && d.busInfo.length > 3)?.busInfo || '정보 없음';
      const progress = totalPax > 0 ? Math.round((boardedPax / totalPax) * 100) : 0;
      
      return { team, totalPax, boardedPax, guides, busInfo, progress, count: grouped.length };
    });
  }, [availableTeams, rawData, appState]);

  // Update Global Boarded Pax
  const finalGlobalStats = {
      ...dashboardStats,
      boardedPax: allTeamsSummary.reduce((acc, t) => acc + t.boardedPax, 0),
      total: allTeamsSummary.reduce((acc, t) => acc + t.totalPax, 0)
  };

  // Actions
  const toggleBoarding = (id) => { const current = appState[id] || {}; saveState({ ...appState, [id]: { ...current, boarded: !current.boarded } }); };
  const toggleDistribution = (id, key) => { const current = appState[id] || {}; const currentDist = current.distributed || {}; saveState({ ...appState, [id]: { ...current, distributed: { ...currentDist, [key]: !currentDist[key] } } }); };
  const updateMemo = (id, text) => { const current = appState[id] || {}; saveState({ ...appState, [id]: { ...current, memo: text } }); };
  const findAssignedSeat = (passengerId) => { if (!seatMap) return null; const entry = Object.entries(seatMap).find(([seat, p]) => p.id === passengerId); return entry ? entry[0] : null; };

  // Handlers for Navigation
  const handleTeamClick = (team) => {
      setSelectedTeam(team);
      setActiveTab('home'); // Ensure we are on home tab
  };
  const handleBackToDashboard = () => { setSelectedTeam(null); };

  const handleTabChange = (tabId) => {
      setActiveTab(tabId);
      // Reset team selections when switching tabs to show selector
      if (tabId === 'bus') setBusSelectedTeam(null);
      if (tabId === 'message') setMsgSelectedTeam(null);
  };

  // Render Content based on activeTab
  const renderContent = () => {
      if (loading) return <div className="h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
      if (error) return <div className="p-8 text-center"><AlertCircle className="mx-auto text-rose-500 mb-4" size={32}/><h3 className="text-lg font-bold text-slate-800">연결 실패</h3><p className="text-slate-500 text-sm mt-2 mb-6">데이터를 불러올 수 없습니다.</p><button onClick={loadData} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">재시도</button></div>;

      switch(activeTab) {
        case 'bus':
            if (!busSelectedTeam) {
                return <TeamSelector allTeamsSummary={allTeamsSummary} onSelect={setBusSelectedTeam} />;
            }
            return (
                <div>
                     {/* Back Button for Bus Manager */}
                    <div className="bg-white px-4 py-3 flex items-center border-b border-slate-200 sticky top-0 z-10">
                        <button onClick={() => setBusSelectedTeam(null)} className="p-1 -ml-2 mr-2 text-slate-500 hover:text-slate-800"><ChevronLeft size={24}/></button>
                        <h2 className="font-bold text-lg text-slate-800">버스 배차 관리 ({busSelectedTeam}팀)</h2>
                    </div>
                    <BusManager isOpen={true} onClose={() => setBusSelectedTeam(null)} teamData={{list: groupedList}} teamName={busSelectedTeam} setSeatMap={(m) => { setSeatMap(m); localStorage.setItem(`tm_seatMap_${busSelectedTeam}`, JSON.stringify(m)); }} />
                </div>
            );
        case 'message':
             if (!msgSelectedTeam) {
                return <TeamSelector allTeamsSummary={allTeamsSummary} onSelect={setMsgSelectedTeam} />;
            }
            return (
                 <div>
                    <div className="bg-white px-4 py-3 flex items-center border-b border-slate-200 sticky top-0 z-10">
                        <button onClick={() => setMsgSelectedTeam(null)} className="p-1 -ml-2 mr-2 text-slate-500 hover:text-slate-800"><ChevronLeft size={24}/></button>
                        <h2 className="font-bold text-lg text-slate-800">메시지 센터 ({msgSelectedTeam}팀)</h2>
                    </div>
                    <MessageCenter isOpen={true} onClose={() => setMsgSelectedTeam(null)} teamData={{list: groupedList}} teamName={msgSelectedTeam} seatMap={seatMap} />
                </div>
            );
        case 'menu':
            return (
                <div className="p-4 space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg mb-4">설정 및 메뉴</h3>
                        <button onClick={loadData} className="w-full flex items-center p-3 bg-slate-50 rounded-xl mb-2 hover:bg-slate-100"><RefreshCw size={18} className="mr-3 text-blue-600"/><span className="font-bold text-slate-700">데이터 새로고침</span></button>
                        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-400 text-center mt-4">App Version {APP_VERSION}</div>
                    </div>
                </div>
            );
        case 'home':
        default:
            if (!selectedTeam) {
                // Show Dashboard if no team selected
                return <Dashboard allTeamsSummary={allTeamsSummary} stats={finalGlobalStats} onTeamClick={handleTeamClick} />;
            }
            
            // Show Detail List
            const currentTeamInfo = allTeamsSummary.find(t => t.team === selectedTeam);
            const styles = TEAM_THEMES[selectedTeam] || TEAM_THEMES['DEFAULT'];
            const phone = extractPhoneNumber(currentTeamInfo?.busInfo);

            return (
                <>
                    {/* Detail Page Header */}
                    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                        <div className="px-4 py-3 flex items-center justify-between">
                            <button onClick={handleBackToDashboard} className="p-1 -ml-2 text-slate-500 hover:text-slate-800"><ChevronLeft size={28}/></button>
                            <div className="flex-1 text-center">
                                <h1 className={`text-xl font-black ${UNIFIED_THEME.text}`}>{selectedTeam}팀 <span className="text-sm font-bold text-slate-500 ml-1">{currentTeamInfo?.guides}</span></h1>
                            </div>
                            <div className="w-8"></div>
                        </div>
                        
                        <div className="px-4 pb-3">
                             <div className="flex justify-between items-center mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                 <div className="flex items-center text-xs font-bold text-slate-600 truncate">
                                     <Truck size={14} className="mr-1.5"/>{currentTeamInfo?.busInfo}
                                 </div>
                                 {phone && <a href={`tel:${phone}`} className="flex-shrink-0 bg-white border border-slate-200 text-slate-600 rounded-md p-1.5 shadow-sm active:scale-95"><PhoneCall size={14}/></a>}
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                     <div className={`h-full rounded-full transition-all duration-700 ${styles.bar}`} style={{ width: `${currentTeamInfo?.progress}%` }}></div>
                                 </div>
                                 <span className={`text-sm font-black ${styles.text}`}>{currentTeamInfo?.progress}%</span>
                             </div>
                        </div>
                        
                        {/* Stats Bar */}
                        <div className="px-4 py-2 border-t border-slate-100 overflow-x-auto scrollbar-hide flex items-center space-x-2">
                             <TopSummaryBox label="리프트" total={stats.totalItems.lift} checked={stats.checkedItems.lift} color="violet" />
                             <TopSummaryBox label="무빙" total={stats.totalItems.moving} checked={stats.checkedItems.moving} color="amber" />
                             <TopSummaryBox label="눈썰매" total={stats.totalItems.sled} color="cyan" />
                             <TopSummaryBox label="관광L" total={stats.totalItems.sightseeing} color="emerald" />
                             <TopSummaryBox label="셔틀" total={stats.totalItems.shuttle} color="slate" />
                             <TopSummaryBox label="장비" total={stats.totalItems.equip} simple color="slate" />
                             <TopSummaryBox label="강습" total={stats.totalItems.lesson} simple color="slate" />
                             <TopSummaryBox label="의류" total={stats.totalItems.clothE + stats.totalItems.clothS} simple color="slate" />
                        </div>
                        
                        {/* Location Filter */}
                        <div className="px-4 py-2 border-t border-slate-50 flex gap-1 overflow-x-auto scrollbar-hide">
                            {['전체', '홍대', '명동', '동대문', '스키장'].map(loc => (
                                <button key={loc} onClick={() => setLocationFilter(loc)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${locationFilter === loc ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>{loc}</button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Main List */}
                    <div className="p-4 space-y-4 pb-24 bg-slate-50 min-h-screen">
                        {currentList.map(item => (
                             <DetailCard key={item.id} data={item} teamBusInfo={currentTeamInfo?.busInfo} state={appState[item.id] || {}} onToggleBoarding={() => toggleBoarding(item.id)} onToggleDist={toggleDistribution} onUpdateMemo={(text) => updateMemo(item.id, text)} theme={UNIFIED_THEME} styles={styles} assignedSeat={findAssignedSeat(item.id)}/>
                        ))}
                    </div>
                </>
            );
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {renderContent()}
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
