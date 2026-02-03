import React, { useState, useEffect, useMemo } from 'react';
import { Check, Users, RefreshCw, AlertCircle, Phone, MessageCircle, Bus, Snowflake, ArrowUpRight, Mountain, ClipboardList, Mail, MapPin, Shirt, ChevronLeft, Calendar, ExternalLink, Lock, Copy, FileText, PenLine, Flame, Download, Share2, MessageSquare, Truck, Settings, Save, Disc, DoorOpen, ArrowRightLeft, User, Globe, Repeat, Ban, Camera, ChevronsRight, CableCar, CloudSnow, Backpack, X, FileSpreadsheet, Home, Menu } from 'lucide-react';

// *** 구글 시트 데이터 연결 ***
const SHEET_ID = "1Celx7ApccgzrNwbw6VyZRqUG_zg1z_dp3WmBhTFDlF0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const APP_VERSION = "v2.1"; // 하단 네비게이션, 상세카드 디자인(1행 스크롤), 오류 수정

// --- 데이터 컬럼 매핑 ---
const COLS = {
  TEAM: 0, GUIDE: 1, BUS_INFO: 2, CODE: 3, EVENT: 4, RES_NO: 5, NAME: 6, CONTACT: 7, APP_ID: 8, EMAIL: 9, LANG: 10, PAX: 11, PICKUP: 12, SHUTTLE: 13, SLED: 14, SIGHTSEEING: 15, MOVING: 16, LIFT: 17, EQUIP: 18, LESSON: 19, CLOTH_E: 20, CLOTH_S: 21, NOTE: 22
};

// --- 전역 테마 (ReferenceError 방지용 최상단 선언) ---
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
    
    if (resNo.includes('KK') || appId.includes('KKDAY')) {
        return { label: 'K', color: 'bg-cyan-500 text-white border-cyan-600' };
    }
    const klookPattern = /[A-Z0-9]{6,}/; 
    if ((klookPattern.test(resNo) && !resNo.startsWith('TK')) || appId.includes('KLOOK') || code.includes('KLOOK')) {
        return { label: 'K', color: 'bg-orange-500 text-white border-orange-600' };
    }
    if (resNo.includes('Q') || appId.includes('QIKE')) {
        return { label: 'Q', color: 'bg-emerald-500 text-white border-emerald-600' };
    }
    return null; 
};

const getLangInfo = (lang) => {
    const lower = (lang || '').toLowerCase();
    if (lower.includes('taiwan') || lower.includes('대만')) 
        return { label: '대만', color: 'bg-white text-red-600 border-red-200 border', type: 'cn' };
    if (lower.includes('hong') || lower.includes('홍콩')) 
        return { label: '홍콩', color: 'bg-white text-red-600 border-red-200 border', type: 'cn' };
    if (lower.includes('chi') || lower.includes('중국') || lower.includes('cn')) 
        return { label: '중국어', color: 'bg-white text-red-600 border-red-200 border', type: 'cn' }; 
    if (lower.includes('eng') || lower.includes('영어') || lower.includes('en')) 
        return { label: '영어', color: 'bg-white text-blue-600 border-blue-200 border', type: 'en' };
    if (lower.includes('kor') || lower.includes('한국')) 
        return { label: '한국', color: 'bg-white text-slate-600 border-slate-200 border', type: 'kr' };
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
    }
  });
  return Array.from(groups.values());
};

// --- 하위 컴포넌트들 ---

const TopSummaryBox = ({ label, total, checked, color = "slate", simple = false }) => {
    if (total === 0 || isNaN(total)) return null;
    const colors = {
        slate: 'bg-white border-slate-200 text-slate-600',
        violet: 'bg-white border-violet-200 text-violet-600',
        amber: 'bg-white border-amber-200 text-amber-600',
        cyan: 'bg-white border-cyan-200 text-cyan-600',
        emerald: 'bg-white border-emerald-200 text-emerald-600',
    };
    const style = colors[color];
    const remaining = checked !== undefined ? total - checked : null;
    const showRemaining = !simple && remaining !== null && checked > 0;

    return (
        <div className={`flex flex-col items-center justify-center p-1.5 rounded-xl border flex-shrink-0 min-w-[3.5rem] h-[3.8rem] shadow-sm ${style}`}>
            <span className="text-[10px] font-bold mb-0.5 opacity-70">{label}</span>
            <div className="flex items-end gap-0.5">
                <span className="text-xl font-black leading-none tracking-tight">{total}</span>
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

const MemoModal = ({ isOpen, onClose, onSave, initialValue }) => {
    const [text, setText] = useState(initialValue);
    useEffect(() => { if (isOpen) setText(initialValue); }, [isOpen, initialValue]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center text-sm"><PenLine size={16} className="mr-2"/> 특이사항 입력</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
                </div>
                <div className="p-4">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none bg-slate-50" placeholder="특이사항을 입력하세요..." autoFocus/>
                    <div className="mt-2 text-xs text-slate-500 flex items-center"><AlertCircle size={12} className="mr-1"/> 특이사항 입력 시 버튼이 빨간색으로 변경됩니다.</div>
                    <button onClick={() => { onSave(text); onClose(); }} className="w-full mt-4 py-3 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all">저장</button>
                </div>
            </div>
        </div>
    );
};

const DetailCard = ({ data, teamBusInfo, state, onToggleBoarding, onToggleDist, onUpdateMemo, theme, styles, assignedSeat }) => {
    const isBoarded = state.boarded;
    const memo = state.memo || '';
    const dist = state.distributed || {};
    const [copied, setCopied] = useState(false);
    const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
    const [isMemoExpanded, setIsMemoExpanded] = useState(false);

    const handleCopy = (text) => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const langInfo = getLangInfo(data.lang); 
    const platform = getPlatformInfo(data);
    
    // 2행 구조 (라벨 / 아이콘+수량)
    const allOptions = [
        { id: 'lift', label: '리프트', val: data.items.lift, type: 'check', icon: CableCar, colorClass: 'bg-white text-violet-600 border-violet-200' },
        { id: 'moving', label: '무빙', val: data.items.moving, type: 'check', icon: ChevronsRight, colorClass: 'bg-white text-amber-600 border-amber-200' },
        { id: 'sled', label: '눈썰매', val: data.items.sled, type: 'check', icon: CloudSnow, colorClass: 'bg-white text-cyan-600 border-cyan-200' },
        { id: 'sightseeing', label: '관광L', val: data.items.sightseeing, type: 'check', icon: Camera, colorClass: 'bg-white text-emerald-600 border-emerald-200' },
        { id: 'shuttle', label: '셔틀', val: data.items.shuttle, type: 'check', icon: Bus, colorClass: 'bg-white text-slate-600 border-slate-200' },
        { id: 'equip', label: '장비', val: data.items.equip, type: 'info', icon: Backpack },
        { id: 'lesson', label: '강습', val: data.items.lesson, type: 'info', icon: Users },
        { id: 'clothE', label: '의류(E)', val: data.items.clothE, type: 'info', icon: Shirt },
        { id: 'clothS', label: '의류(S)', val: data.items.clothS, type: 'info', icon: Shirt },
    ].filter(item => item.val > 0);

    const btnClass = "flex items-center justify-center px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors";
    const isHot = data.event && (data.event.includes('[HOT]') || data.event.includes('HOT'));
    const boxWidthClass = allOptions.length <= 5 ? 'flex-none w-[4.5rem]' : 'flex-1 min-w-[3.5rem]';

    return (
        <div id={`card-${data.code}`} className={`rounded-2xl border shadow-sm bg-white overflow-hidden transition-all duration-300 ${isBoarded ? `border-blue-200 bg-blue-50/10` : 'border-slate-200 hover:shadow-md'} mb-4`}>
            {/* Header: 1.Code/Platform/ResNo/Boarding, 2.Name, 3.Info */}
            <div className="p-4 border-b border-slate-50 bg-white">
                {/* 1. 상단 정보 (코드, 플랫폼, 예약번호, 탑승버튼) */}
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg shadow-sm border text-sm font-black ${styles.badgeBg} ${styles.text} ${styles.border}`}>
                            {data.code.substring(0, 2)}
                        </div>
                        {platform && <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${platform.color.split(' ')[0]}`}>{platform.label}</span>}
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(data.resNo); }} className="flex items-center text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                            {copied ? <Check size={10} className="text-green-500 mr-1"/> : <Copy size={10} className="mr-1"/>}
                            <span className={`font-mono ${copied ? 'text-green-600' : ''}`}>{data.resNo}</span>
                        </button>
                    </div>
                    <button onClick={onToggleBoarding} className={`flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm border ${isBoarded ? `bg-white border-blue-600 text-blue-600` : `bg-white text-slate-400 border-slate-200`}`}>
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

                {/* Product Name (Optional) */}
                {data.event && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-3">
                        <p className="text-xs text-slate-600 font-medium leading-snug line-clamp-2">{data.event}</p>
                    </div>
                )}
            </div>

            {/* Options & Contact */}
            <div className="p-4 pt-3 bg-white space-y-3">
                {/* Options Grid (1 Line Scroll) */}
                <div className="flex w-full gap-2 overflow-x-auto scrollbar-hide py-1">
                    {allOptions.map((item) => {
                        const isDistributed = dist[item.id];
                        const isCheckItem = item.type === 'check';
                        if (isCheckItem) {
                            return (
                                <button key={item.id} onClick={() => onToggleDist(data.id, item.id)} className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 flex-shrink-0 ${boxWidthClass} ${isDistributed ? 'bg-slate-50 border-slate-200 text-slate-300 shadow-inner' : `${item.colorClass} shadow-sm`}`}>
                                    {isDistributed && (<div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl"><Check size={20} className="text-slate-400" strokeWidth={3}/></div>)}
                                    <span className={`text-[10px] font-bold ${isDistributed ? 'opacity-50' : ''}`}>{item.label}</span>
                                    <div className="flex items-center mt-0.5">
                                        {item.icon && !isDistributed && <item.icon size={12} className="mr-1 opacity-70"/>}
                                        <span className={`text-base font-black leading-none ${isDistributed ? 'opacity-30' : ''}`}>{item.val}</span>
                                    </div>
                                </button>
                            );
                        } else {
                            return (
                                <div key={item.id} className={`flex flex-col items-center justify-center p-2 rounded-xl border bg-white border-slate-200 flex-shrink-0 ${boxWidthClass} shadow-sm`}>
                                     <div className="text-[10px] text-slate-500 font-bold mb-0.5">{item.label}</div>
                                     <div className="flex items-center text-base font-black text-slate-700 leading-none mt-0.5">
                                        {item.icon && <item.icon size={12} className="mr-1 opacity-50"/>}
                                        {item.val}
                                     </div>
                                </div>
                            );
                        }
                    })}
                </div>

                {/* Contact Row */}
                <div className="grid grid-cols-4 gap-2">
                     {data.contact && (<a href={`tel:${data.contact}`} className={btnClass}><Phone size={14} className="mr-1.5"/>전화</a>)}
                     {data.email && (<a href={`mailto:${data.email}`} className={btnClass}><Mail size={14} className="mr-1.5"/>메일</a>)}
                     <div className="col-span-2">{data.appId && <MessengerLink text={data.appId} />}</div>
                </div>

                {/* Memo Button */}
                <div className="flex justify-end pt-2">
                    <button onClick={() => setIsMemoModalOpen(true)} className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${memo ? 'bg-rose-50 text-rose-600 border-rose-200' : 'text-slate-400 border-transparent hover:bg-slate-50'}`}>
                        {memo ? '수정' : <><PenLine size={12} className="mr-1.5"/>특이사항</>}
                    </button>
                </div>
                 
                 {/* Memo Content (Toggle) */}
                 {memo && (
                    <div onClick={() => setIsMemoExpanded(!isMemoExpanded)} className="bg-white border border-rose-500 rounded-xl p-2.5 shadow-sm cursor-pointer hover:bg-rose-50/30 transition-colors animate-in slide-in-from-top-2">
                        <div className="flex items-center mb-1">
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider">📝 MEMO</span>
                        </div>
                        <p className={`text-xs text-slate-700 font-medium whitespace-pre-wrap ${!isMemoExpanded && 'line-clamp-1'}`}>{memo}</p>
                    </div>
                )}
            </div>
             <MemoModal isOpen={isMemoModalOpen} onClose={() => setIsMemoModalOpen(false)} initialValue={memo} onSave={(newText) => onUpdateMemo(data.id, newText)} />
        </div>
    );
};

// ... BusSeatMap, BusManager ... (기존 유지)
const BusSeatMap = ({ seatMap, busSize, onSeatClick, selectedSeat, blockedSeats }) => {
   // ... code same as v1.79 ...
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
        const seatColorClass = lang.type === 'cn' ? 'bg-white text-red-600 border-red-200 border-2' : 'bg-white text-blue-600 border-blue-200 border-2';

        return (
            <div key={seatNum} onClick={() => onSeatClick && onSeatClick(seatNum, passenger)} className={`aspect-square rounded-lg flex flex-col items-center justify-center shadow-sm cursor-pointer relative overflow-hidden transition-all ${isSelected ? 'ring-4 ring-blue-400 z-10 scale-105' : ''} ${seatColorClass}`}>
                <span className="text-[9px] opacity-40 absolute top-0.5 left-1">{seatNum}</span>
                <div className="absolute top-0.5 right-0.5 flex gap-0.5">{isHot && <span className="w-3 h-3 flex items-center justify-center bg-white text-rose-500 rounded text-[8px] font-black border border-rose-200">H</span>}</div>
                <div className="flex flex-col items-center w-full px-0.5 mt-2"><span className="text-xl font-black break-words text-center leading-none truncate w-full tracking-tighter">{passenger.groupLabel}</span></div>
                <div className="absolute bottom-1 w-full flex justify-center items-center gap-0.5 flex-wrap">
                     {shortPickup && <span className="text-[7px] font-bold text-slate-500">{shortPickup}</span>}
                     {nationality && <span className="text-[7px] font-bold text-slate-700">{nationality}</span>}
                     <span className="text-[7px] font-bold">{lang.label}</span>
                     {platform && (<span className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white ${platform.color.split(' ')[0]}`}>{platform.label}</span>)}
                </div>
            </div>
        );
    };
    const rows = []; const totalRows = 10; for(let r=0; r<totalRows; r++) { const rowSeats = []; rowSeats.push(renderSeat(r*4 + 1)); rowSeats.push(renderSeat(r*4 + 2)); rowSeats.push(<div key={`aisle-${r}`} className="w-1"></div>); rowSeats.push(renderSeat(r*4 + 3)); rowSeats.push(renderSeat(r*4 + 4)); rows.push(<div key={r} className="grid grid-cols-5 gap-0.5 mb-0.5">{rowSeats}</div>); }
    let lastRow = null; if (busSize === 45) { lastRow = (<div className="grid grid-cols-5 gap-0.5 mt-0.5">{renderSeat(41)}{renderSeat(42)}{renderSeat(43)}{renderSeat(44)}{renderSeat(45)}</div>); } else { lastRow = (<div className="grid grid-cols-5 gap-0.5 mt-0.5">{renderSeat(41)}{renderSeat(42)}<div className="w-1"></div>{renderSeat(43)}{renderSeat(44)}</div>); }
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
        setSeatMap(newMap); // Update parent state
        localStorage.setItem(`tm_seatMap_${teamName}`, JSON.stringify(newMap));
    };

    const toggleBlockedSeat = (seatNum) => { setBlockedSeats(prev => prev.includes(seatNum) ? prev.filter(s => s !== seatNum) : [...prev, seatNum]); };

    const runAutoAssign = () => {
        let sorted = [...generatedGroups].sort((a,b) => b.pax - a.pax);
        // ... sort logic (same as v1.79) ...
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

const MessageCenter = ({ isOpen, onClose, teamData, teamName, seatMap }) => {
    if (!isOpen) return null;
    const [guideName, setGuideName] = useState(localStorage.getItem('tm_guideName') || ""); 
    const [globalNotice, setGlobalNotice] = useState(localStorage.getItem('tm_globalNotice') || ""); 
    const [msgTemplate, setMsgTemplate] = useState("");
    
    const handleGuideNameChange = (e) => { setGuideName(e.target.value); localStorage.setItem('tm_guideName', e.target.value); };
    const handleGlobalNoticeChange = (e) => { setGlobalNotice(e.target.value); localStorage.setItem('tm_globalNotice', e.target.value); };

    // Group info logic
    const groups = useMemo(() => {
        if (!teamData || !teamData.list) return [];
        return teamData.list.map((group, idx) => ({
            ...group,
            groupLabel: `${teamName}${idx+1}`
        }));
    }, [teamData, teamName]);

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
        let msg = `[${guideName}]\nHello, this is your ski tour guide.\nMeeting: ${group.pickup} / ${pickupTime}\n\n*${globalNotice}`;
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

// *** Bottom Navigation ***
const BottomNavigation = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'home', label: '홈', icon: Home },
        { id: 'bus', label: '버스', icon: Bus },
        { id: 'message', label: '메시지', icon: MessageSquare },
        { id: 'menu', label: '관리', icon: User }, // Label change to '관리'
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

export default function GuideProChecklist() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tourDate, setTourDate] = useState({ date: '', type: '' });
  
  const [activeTab, setActiveTab] = useState('home'); // Tab State
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [locationFilter, setLocationFilter] = useState('전체');
  
  const [appState, setAppState] = useState({});
  const [seatMap, setSeatMap] = useState({}); 

  // ... (useEffect for Load/Save - Same as v1.79) ...
  useEffect(() => {
    const saved = localStorage.getItem('guide_pro_state_v40'); 
    if (saved) setAppState(JSON.parse(saved));
    loadData(); 
  }, []);

  useEffect(() => {
      if (selectedTeam) {
          const savedMap = localStorage.getItem(`tm_seatMap_${selectedTeam}`);
          setSeatMap(savedMap ? JSON.parse(savedMap) : {});
      }
  }, [selectedTeam, activeTab]); 

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
    const currentTeamData = rawData.filter(d => d.team === selectedTeam);
    const groups = new Map();
    currentTeamData.forEach(item => {
        const key = item.contact && item.contact.length > 5 ? item.contact.replace(/[-\s]/g, '') : item.name.trim().toLowerCase();
        if (!groups.has(key)) {
            groups.set(key, { ...item, codes: [item.code], members: [item] });
        } else {
            const group = groups.get(key);
            group.codes.push(item.code);
            group.members.push(item);
            group.pax += item.pax; 
            Object.keys(group.items).forEach(k => { group.items[k] += item.items[k]; });
            if (!group.note && item.note) group.note = item.note;
        }
    });
    // Add Group Labels for list display
    return Array.from(groups.values()).sort((a, b) => {
        const codeA = a.codes[0] || ""; const codeB = b.codes[0] || "";
        return codeA.localeCompare(codeB, undefined, { numeric: true });
    }).map((g, i) => ({...g, groupLabel: `${selectedTeam}${i+1}`}));
  }, [rawData, selectedTeam]);

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
    // ... stats calculation (same) ...
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
      // ... others ...
      return acc;
    }, initialStats);
  }, [groupedList, appState]);

  const teamDetailData = { // Defined here before renderContent
      guides: [...new Set(rawData.filter(d => d.team === selectedTeam).map(d => d.guide).filter(Boolean))].join(', '),
      busInfo: rawData.filter(d => d.team === selectedTeam).find(d => d.busInfo && d.busInfo.length > 5)?.busInfo || '정보 없음',
      progress: Math.round((stats.boardedPax / stats.total) * 100) || 0,
      notesCodes: [] 
  };
  groupedList.forEach(g => { if(g.note) teamDetailData.notesCodes.push(g.codes.join('/')); });

  // Actions
  const toggleBoarding = (id) => { const current = appState[id] || {}; saveState({ ...appState, [id]: { ...current, boarded: !current.boarded } }); };
  const toggleDistribution = (id, key) => { const current = appState[id] || {}; const currentDist = current.distributed || {}; saveState({ ...appState, [id]: { ...current, distributed: { ...currentDist, [key]: !currentDist[key] } } }); };
  const updateMemo = (id, text) => { const current = appState[id] || {}; saveState({ ...appState, [id]: { ...current, memo: text } }); };

  // Helper for seat finding
  const findAssignedSeat = (passengerId) => {
      if (!seatMap) return null;
      const entry = Object.entries(seatMap).find(([seat, p]) => p.id === passengerId);
      return entry ? entry[0] : null;
  };

  // Render Content based on activeTab
  const renderContent = () => {
      if (loading) return <div className="h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
      if (error) return <div className="p-8 text-center"><AlertCircle className="mx-auto text-rose-500 mb-4" size={32}/><h3 className="text-lg font-bold text-slate-800">연결 실패</h3><p className="text-slate-500 text-sm mt-2 mb-6">데이터를 불러올 수 없습니다.</p><button onClick={loadData} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">재시도</button></div>;

      switch(activeTab) {
        case 'bus':
            return <BusManager isOpen={true} onClose={() => {}} teamData={{list: groupedList}} teamName={selectedTeam} setSeatMap={(m) => { setSeatMap(m); localStorage.setItem(`tm_seatMap_${selectedTeam}`, JSON.stringify(m)); }} />;
        case 'message':
            return <MessageCenter isOpen={true} onClose={() => {}} teamData={{list: groupedList}} teamName={selectedTeam} seatMap={seatMap} />;
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
            return (
                <>
                    {/* Top Stats Area */}
                    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <div className="px-4 py-3 overflow-x-auto scrollbar-hide flex items-center space-x-2">
                             <TopSummaryBox label="리프트" total={stats.totalItems.lift} checked={stats.checkedItems.lift} color="violet" />
                             <TopSummaryBox label="무빙" total={stats.totalItems.moving} checked={stats.checkedItems.moving} color="amber" />
                             {/* ... other stats ... */}
                             <TopSummaryBox label="눈썰매" total={stats.totalItems.sled} color="cyan" />
                             <TopSummaryBox label="관광L" total={stats.totalItems.sightseeing} color="emerald" />
                             <div className="w-[1px] h-8 bg-slate-100 mx-1"></div>
                             <TopSummaryBox label="장비" total={stats.totalItems.equip} simple color="slate" />
                             <TopSummaryBox label="의류" total={stats.totalItems.clothE + stats.totalItems.clothS} simple color="slate" />
                        </div>
                        {/* Team & Location Filter */}
                        <div className="px-4 pb-3 flex flex-col gap-2">
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                {availableTeams.map(t => (
                                    <button key={t} onClick={() => setSelectedTeam(t)} className={`px-4 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${selectedTeam === t ? 'bg-slate-900 text-white shadow-md transform scale-105' : 'bg-slate-100 text-slate-400'}`}>{t}팀</button>
                                ))}
                            </div>
                            {/* Location Filter (Simple) */}
                            <div className="flex gap-1 overflow-x-auto scrollbar-hide pt-1">
                                {['전체', '홍대', '명동', '동대문', '스키장'].map(loc => (
                                    <button key={loc} onClick={() => setLocationFilter(loc)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${locationFilter === loc ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}>{loc}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Main List */}
                    <div className="p-4 space-y-4 pb-24 bg-slate-50 min-h-screen">
                        {currentList.map(item => (
                             <DetailCard key={item.id} data={item} teamBusInfo={teamDetailData.busInfo} state={appState[item.id] || {}} onToggleBoarding={() => toggleBoarding(item.id)} onToggleDist={toggleDistribution} onUpdateMemo={(text) => updateMemo(item.id, text)} theme={UNIFIED_THEME} styles={TEAM_THEMES[selectedTeam] || TEAM_THEMES['DEFAULT']} assignedSeat={findAssignedSeat(item.id)}/>
                        ))}
                    </div>
                </>
            );
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {renderContent()}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
