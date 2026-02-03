import React, { useState, useEffect, useMemo } from 'react';
import { Check, Users, RefreshCw, AlertCircle, Phone, MessageCircle, Bus, Snowflake, ArrowUpRight, Mountain, ClipboardList, Mail, MapPin, Shirt, ChevronLeft, Calendar, ExternalLink, Lock, Copy, FileText, PenLine, Flame, Download, Share2, MessageSquare, Truck, Settings, Save, Disc, DoorOpen, ArrowRightLeft, User, Globe, Repeat, Ban, Camera, ChevronsRight, CableCar, CloudSnow, Backpack, X, FileSpreadsheet } from 'lucide-react';

// *** 구글 시트 데이터 연결 ***
const SHEET_ID = "1Celx7ApccgzrNwbw6VyZRqUG_zg1z_dp3WmBhTFDlF0";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const APP_VERSION = "v1.77"; // 버스관리 기능 분리 -> 메시지 센터로 이동

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
    if (!pickup) return 'bg-white text-slate-400 border-slate-200';
    if (pickup.includes('홍대')) return 'bg-white text-green-600 border-green-600 border';
    if (pickup.includes('명동')) return 'bg-white text-sky-500 border-sky-500 border';
    if (pickup.includes('동대문')) return 'bg-white text-purple-600 border-purple-600 border';
    if (pickup.includes('스키장')) return 'bg-white text-slate-500 border-slate-400 border';
    return 'bg-white text-slate-700 border-slate-700 border';
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

const downloadVCard = (teamData, teamName) => {
    let vcardContent = "";
    teamData.forEach((item) => {
        if (item.contact && item.contact.length > 5) {
            const name = `${item.name} (${teamName}팀)`;
            const phone = item.contact.replace(/[-\s]/g, '');
            const codes = item.codes ? item.codes.join('/') : item.code;
            vcardContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:${phone}\nNOTE:Codes:${codes} / Res:${item.resNo} / ${item.pickup}\nEND:VCARD\n`;
        }
    });
    const blob = new Blob([vcardContent], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SkiTour_${teamName}_Contacts.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- [정의] 하위 컴포넌트들 ---

const SummaryChipH = ({ label, total, checked, color = "slate", simple = false }) => {
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
        <div className={`flex items-center px-2 py-0.5 rounded-lg border flex-shrink-0 ${style}`}>
            <span className="text-[10px] font-bold mr-1.5 opacity-80">{label}</span>
            <span className="text-sm font-black">{total}</span>
            {showRemaining && (<span className="text-[10px] font-medium ml-1 opacity-60">({remaining})</span>)}
        </div>
    );
};

const PhoneLinkedText = ({ text, className }) => {
  if (!text) return null;
  const phoneRegex = /(010[-\s]?\d{4}[-\s]?\d{4}|\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/g;
  const parts = text.split(phoneRegex);
  const matches = text.match(phoneRegex) || [];
  if (matches.length === 0) return <span className={className}>{text}</span>;
  let matchIndex = 0;
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (matches[matchIndex] && part === matches[matchIndex]) {
           const phoneNumber = matches[matchIndex];
           matchIndex++;
           return <a key={index} href={`tel:${phoneNumber.replace(/[-\s]/g, '')}`} onClick={(e) => e.stopPropagation()} className="text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-2 hover:text-blue-600 transition-colors">{phoneNumber}</a>;
        }
        return part;
      })}
    </span>
  );
};

const MessengerLink = ({ text }) => {
    if (!text) return null;
    
    const lower = text.toLowerCase();
    const rawId = (text.match(/[:\s]+(.+)/) || [])[1]?.trim() || text;
    const cleanNumber = rawId.replace(/[^0-9]/g, '');

    let type = 'unknown';
    let url = null;
    let action = 'copy';

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
    } else if (lower.includes('wechat') || lower.includes('wx')) {
        type = 'WeChat';
        action = 'copy';
    } else if (lower.includes('viber')) {
        type = 'Viber';
        if (/^\+?\d+$/.test(rawId) || cleanNumber.length > 5) {
             url = `viber://chat?number=${cleanNumber.replace(/^0+/, '')}`; 
             action = 'link';
        } else {
            action = 'copy';
        }
    } else {
        type = 'Messenger';
        action = 'copy';
    }

    const handleClick = (e) => {
        e.stopPropagation();
        if (action === 'copy') {
            copyToClipboard(rawId);
            alert(`${type} ID가 복사되었습니다: ${rawId}\n앱을 실행하여 친구 추가하세요.`);
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

    const btnClass = "flex items-center px-2.5 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors";

    if (action === 'link' && url) {
        return (
            <a href={url} target="_blank" rel="noreferrer" className={btnClass} onClick={(e) => e.stopPropagation()}>
                <MessageCircle size={11} className={`mr-1.5 flex-shrink-0 mt-0.5 ${iconColors[type]}`}/> 
                <span className="break-all">{text}</span>
                <ExternalLink size={9} className="ml-1 opacity-50 flex-shrink-0 mt-0.5"/>
            </a>
        );
    } else {
        return (
            <button onClick={handleClick} className={btnClass}>
                 <MessageCircle size={11} className={`mr-1.5 flex-shrink-0 mt-0.5 ${iconColors[type]}`}/> 
                 <span className="break-all">{text}</span>
                 <Copy size={9} className="ml-1 opacity-50 flex-shrink-0 mt-0.5"/>
            </button>
        );
    }
};

const MemoModal = ({ isOpen, onClose, onSave, initialValue }) => {
    const [text, setText] = useState(initialValue);
    
    useEffect(() => {
        if (isOpen) setText(initialValue);
    }, [isOpen, initialValue]);

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center text-sm"><PenLine size={16} className="mr-2"/> 특이사항 입력</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
                </div>
                <div className="p-4">
                    <textarea 
                        value={text} 
                        onChange={(e) => setText(e.target.value)} 
                        className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none bg-slate-50"
                        placeholder="특이사항을 입력하세요..."
                        autoFocus
                    />
                    <div className="mt-2 text-xs text-slate-500 flex items-center">
                        <AlertCircle size={12} className="mr-1"/> 특이사항 입력 시 버튼이 빨간색으로 변경됩니다.
                    </div>
                    <button 
                        onClick={() => { onSave(text); onClose(); }} 
                        className="w-full mt-4 py-3 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        저장
                    </button>
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

    const btnClass = "flex items-center px-2.5 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors";
    const isHot = data.event && (data.event.includes('[HOT]') || data.event.includes('HOT'));
    const showBusInfo = data.busInfo && data.busInfo.length > 5 && data.busInfo !== teamBusInfo;
    const displayCode = data.codes ? data.codes.join('/') : data.code;
    const fontSize = displayCode.length > 6 ? 'text-xs' : 'text-base'; 
    
    // 박스 너비 스타일 결정
    const boxWidthClass = allOptions.length <= 5 ? 'flex-none w-[4.5rem]' : 'flex-1 min-w-[3.5rem]';

    return (
        <div id={`card-${data.code}`} className={`rounded-xl border shadow-sm bg-white overflow-hidden transition-all duration-300 ${isBoarded ? `border-blue-200 bg-blue-50/10` : 'border-slate-200 hover:shadow-md'}`}>
            <div className="flex items-center p-3 border-b border-slate-50 bg-white/80">
                <div className={`flex flex-col items-center justify-center min-w-[2.5rem] w-auto h-9 px-2 rounded-lg flex-shrink-0 mr-3 shadow-sm border ${styles.badgeBg} ${styles.text} ${styles.border}`}>
                    <span className={`${fontSize} font-black break-all text-center leading-none px-0.5`}>{displayCode}</span>
                </div>
                <div className="min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-1 mb-0.5"><h3 className={`font-bold truncate text-lg leading-tight text-slate-800`}>{data.name}</h3>{isHot && (<span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-black bg-white text-rose-600 border border-rose-200 leading-none"><Flame size={10} className="mr-0.5 fill-rose-600"/> HOT</span>)}</div>
                    <div className="flex items-center">
                        <div className="flex items-center text-xs font-bold text-slate-500 mr-2">
                            <Users size={12} className="mr-1"/>
                            <span>{isNaN(data.pax) ? 0 : data.pax}명</span>
                            <span className={`ml-2.5 px-1 rounded-[4px] text-[9px] ${langInfo.color}`}>
                                {langInfo.label}
                            </span>
                            {assignedSeat && (
                                <span className="ml-2.5 flex items-center text-[10px] font-bold text-blue-600 border border-blue-200 bg-blue-50 px-1 rounded-[4px]">
                                    <Bus size={10} className="mr-0.5"/> {assignedSeat}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button onClick={(e) => { e.stopPropagation(); handleCopy(data.resNo); }} className="flex items-center justify-center text-[10px] text-slate-400 bg-slate-50 px-1.5 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors active:scale-95 mr-2 flex-shrink-0">
                    {copied ? <Check size={10} className="text-green-500"/> : <Copy size={10}/>}
                    <span className={`ml-1 font-mono ${copied ? 'text-green-600' : ''}`}>{copied ? '복사됨' : data.resNo}</span>
                </button>

                <div className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold mr-2 ${getPickupColor(data.pickup)}`}>{data.pickup || '미정'}</div>
                
                <button onClick={onToggleBoarding} className={`flex items-center justify-center px-2 py-1.5 rounded text-[10px] font-bold transition-all active:scale-95 flex-shrink-0 shadow-sm ${isBoarded ? `bg-white border border-blue-600 text-blue-600` : `bg-white text-slate-500 border border-slate-200 hover:border-slate-300`}`}><Check size={10} className={`mr-1 ${isBoarded ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={3}/>{isBoarded ? '탑승완료' : '탑승'}</button>
            </div>
            
            <div className="p-3 bg-white">
                {data.event && (<div className="mb-3 text-xs font-medium text-slate-700 bg-slate-50/50 p-2 rounded-lg border border-slate-100 leading-snug">{data.event}</div>)}
                
                {data.note && (<div className="mb-3 p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex items-start text-rose-700 text-[11px]"><AlertCircle size={14} className="mt-0.5 mr-2 flex-shrink-0 text-rose-500"/><span className="font-bold leading-snug">{data.note}</span></div>)}
                
                {showBusInfo && (<div className="mb-3 p-2 border border-slate-100 rounded-lg bg-slate-50/80"><div className="text-[10px] text-slate-400 font-bold mb-0.5">개별 버스 정보</div><PhoneLinkedText text={data.busInfo} className="text-xs font-bold text-slate-700" /></div>)}
                
                <div className="flex w-full gap-2 mb-3 overflow-x-auto scrollbar-hide py-1">
                    {allOptions.map((item) => {
                        const isDistributed = dist[item.id];
                        const isCheckItem = item.type === 'check';
                        
                        if (isCheckItem) {
                            return (
                                <button key={item.id} onClick={() => onToggleDist(data.id, item.id)} className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all active:scale-95 flex-shrink-0 ${boxWidthClass} ${isDistributed ? 'bg-slate-50 border-slate-200 text-slate-300 shadow-inner' : `${item.colorClass} shadow-sm hover:brightness-95`}`}>
                                    {isDistributed && (<div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg"><Check size={18} className="text-slate-400 drop-shadow-sm" strokeWidth={3}/></div>)}
                                    <span className={`text-[9px] font-bold ${isDistributed ? 'opacity-50' : ''}`}>{item.label}</span>
                                    <div className="flex items-center mt-0.5">
                                        {item.icon && !isDistributed && <item.icon size={12} className="mr-1 opacity-70"/>}
                                        <span className={`text-base font-black leading-none ${isDistributed ? 'opacity-30' : ''}`}>{item.val}</span>
                                    </div>
                                </button>
                            );
                        } 
                        else {
                            return (
                                <div key={item.id} className={`flex flex-col items-center justify-center p-1.5 rounded-lg border bg-white border-slate-200 flex-shrink-0 ${boxWidthClass} shadow-sm`}>
                                     <div className="text-[9px] text-slate-500 font-bold mb-0.5">{item.label}</div>
                                     <div className="flex items-center text-base font-black text-slate-700 leading-none mt-0.5">
                                        {item.icon && <item.icon size={12} className="mr-1 opacity-50"/>}
                                        {item.val}
                                     </div>
                                </div>
                            );
                        }
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-1">
                    {data.contact && (<a href={`tel:${data.contact}`} className={btnClass}><Phone size={12} className="mr-1.5"/> 전화</a>)}
                    {data.email && (<a href={`mailto:${data.email}`} className={btnClass}><Mail size={12} className="mr-1.5"/> 메일</a>)}
                    {data.appId && <MessengerLink text={data.appId} />}
                    
                    {memo && (
                        <div 
                            onClick={() => setIsMemoExpanded(!isMemoExpanded)}
                            className="flex items-center flex-1 min-w-0 cursor-pointer group bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors"
                        >
                            <PenLine size={10} className="text-rose-500 mr-1 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-rose-500 truncate">
                                {memo}
                            </span>
                        </div>
                    )}

                    <button 
                        onClick={() => setIsMemoModalOpen(true)} 
                        className={`flex items-center px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex-shrink-0 ${!memo ? 'ml-auto' : ''} ${memo ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                        {memo ? <span className="text-[10px]">수정</span> : <><PenLine size={10} className="mr-1"/> 특이사항</>}
                    </button>
                </div>

                {memo && isMemoExpanded && (
                    <div className="mt-1.5 p-1.5 bg-white border border-rose-500 rounded-lg text-[10px] text-slate-800 font-bold whitespace-pre-wrap shadow-sm relative animate-in slide-in-from-top-1 leading-snug">
                        <span className="block text-[8px] text-rose-500 font-extrabold mb-0.5">📝 MEMO</span>
                        {memo}
                    </div>
                )}
            </div>

            <MemoModal 
                isOpen={isMemoModalOpen} 
                onClose={() => setIsMemoModalOpen(false)} 
                initialValue={memo}
                onSave={(newText) => onUpdateMemo(data.id, newText)}
            />
        </div>
    );
};

// ... BusSeatMap ...
const BusSeatMap = ({ seatMap, busSize, onSeatClick, selectedSeat, blockedSeats }) => {
    // ... code ...
    const renderSeat = (seatNum) => {
        const passenger = seatMap[seatNum];
        const isSelected = selectedSeat === seatNum;
        const isBlocked = blockedSeats.includes(seatNum);

        if (isBlocked) {
            return (
                <div key={seatNum} className="aspect-square border border-dashed rounded-lg flex flex-col items-center justify-center bg-slate-50 border-slate-300 text-slate-300 opacity-70">
                    <Ban size={16} />
                </div>
            );
        }
        
        if (!passenger) {
            return (
                <div key={seatNum} onClick={() => onSeatClick && onSeatClick(seatNum, null)} className={`aspect-square border border-dashed rounded-lg flex items-center justify-center text-xs font-bold relative transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300' : 'bg-white border-slate-300 text-slate-300 hover:bg-slate-50'}`}>
                    <span className="absolute top-0.5 left-1 text-[9px] opacity-50">{seatNum}</span>
                </div>
            );
        }

        const platform = getPlatformInfo(passenger);
        const lang = getLangInfo(passenger.lang);
        const isHot = passenger.event && passenger.event.includes('HOT');
        const shortPickup = getPickupShort(passenger.pickup);

        const seatColorClass = lang.type === 'cn' 
            ? 'bg-white text-red-600 border-red-200 border-2' 
            : 'bg-white text-blue-600 border-blue-200 border-2';

        return (
            <div key={seatNum} onClick={() => onSeatClick && onSeatClick(seatNum, passenger)} className={`aspect-square rounded-lg flex flex-col items-center justify-center shadow-sm cursor-pointer relative overflow-hidden transition-all ${isSelected ? 'ring-4 ring-blue-400 z-10 scale-105' : ''} ${seatColorClass}`}>
                <span className="text-[9px] opacity-40 absolute top-0.5 left-1">{seatNum}</span>
                
                <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                    {isHot && <span className="w-3 h-3 flex items-center justify-center bg-white text-rose-500 rounded text-[8px] font-black border border-rose-200">H</span>}
                </div>

                <div className="flex flex-col items-center w-full px-0.5 mt-2">
                    <span className="text-xl font-black break-words text-center leading-none truncate w-full tracking-tighter">{passenger.groupLabel}</span>
                    <span className="text-[9px] font-bold mt-1 opacity-80">{passenger.pax}명</span>
                </div>

                <div className="absolute bottom-1 w-full flex justify-center items-center gap-1">
                     {shortPickup && <span className="text-[8px] font-bold text-slate-500 mr-0.5">{shortPickup}</span>}
                     <span className="text-[8px] font-bold">{lang.label}</span>
                     {platform && (
                        <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${platform.color.split(' ')[0]}`}>{platform.label}</span>
                     )}
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
        rowSeats.push(<div key={`aisle-${r}`} className="w-4"></div>); 
        rowSeats.push(renderSeat(r*4 + 3)); 
        rowSeats.push(renderSeat(r*4 + 4));
        rows.push(<div key={r} className="grid grid-cols-5 gap-1.5 mb-1.5">{rowSeats}</div>);
    }
    
    let lastRow = null;
    if (busSize === 45) { 
        lastRow = (<div className="grid grid-cols-5 gap-1.5 mt-1.5">{renderSeat(41)}{renderSeat(42)}{renderSeat(43)}{renderSeat(44)}{renderSeat(45)}</div>); 
    } else { 
        lastRow = (<div className="grid grid-cols-5 gap-1.5 mt-1.5">{renderSeat(41)}{renderSeat(42)}<div className="w-4"></div>{renderSeat(43)}{renderSeat(44)}</div>); 
    }

    return (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6 animate-in slide-in-from-bottom-5">
            <h4 className="text-center font-bold text-slate-600 mb-4 flex items-center justify-center gap-2"><Bus size={20}/> 좌석 배치도 ({busSize}인승)</h4>
            <div className="text-center text-xs text-slate-400 mb-2">클릭 후 다른 좌석을 선택하면 자리가 교체됩니다.</div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><div className="text-center text-xs text-slate-400 mb-2 font-bold border-b border-slate-100 pb-1">FRONT (운전석)</div>{rows}{lastRow}</div>
        </div>
    );
};

const BusManager = ({ isOpen, onClose, teamData, teamName }) => {
    if (!isOpen) return null;
    const [busSize, setBusSize] = useState(44); 
    const [generatedGroups, setGeneratedGroups] = useState([]); 
    const [seatMap, setSeatMap] = useState({});
    const [showMap, setShowMap] = useState(false);
    
    // 배차 옵션 상태
    const [priorities, setPriorities] = useState({
        solo: true,         
        group4: false,      
        lang_cn: false,     
        lang_en: false,     
        loc_hong: false,    
        loc_myeong: false,  
        loc_dong: false     
    });
    const [fillDirection, setFillDirection] = useState('front');
    const [blockedSeats, setBlockedSeats] = useState([]); 
    const [selectedSeat, setSelectedSeat] = useState(null);

    useEffect(() => { 
        if(teamData && teamData.list) {
            const labeled = teamData.list.map((group, idx) => ({
                ...group,
                groupLabel: `${teamName}${idx+1}`
            }));
            setGeneratedGroups(labeled); 
        }
    }, [teamData, teamName]);

    useEffect(() => {
        if(isOpen && teamName) {
            const savedMap = localStorage.getItem(`tm_seatMap_${teamName}`);
            if (savedMap) {
                setSeatMap(JSON.parse(savedMap));
                setShowMap(true);
            }
        }
    }, [isOpen, teamName]);

    const updateSeatMap = (newMap) => {
        setSeatMap(newMap);
        localStorage.setItem(`tm_seatMap_${teamName}`, JSON.stringify(newMap));
    };

    const toggleBlockedSeat = (seatNum) => {
        setBlockedSeats(prev => prev.includes(seatNum) ? prev.filter(s => s !== seatNum) : [...prev, seatNum]);
    };

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
        setShowMap(true);
        setSelectedSeat(null);
    };

    const handleSeatClick = (seatNum, passenger) => {
        if (blockedSeats.includes(seatNum)) return; 
        if (selectedSeat === null) { setSelectedSeat(seatNum); } else {
            if (selectedSeat === seatNum) { setSelectedSeat(null); } else {
                const newMap = { ...seatMap };
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
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in slide-in-from-bottom-5">
            <div className="bg-white sticky top-0 border-b border-slate-200 px-4 py-3 flex justify-between items-center z-10 shadow-sm">
                <h2 className="font-bold text-lg text-slate-800 flex items-center"><Bus size={20} className="mr-2 text-blue-600"/> 버스 배차 관리 ({teamName}팀)</h2>
                <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-200">닫기</button>
            </div>
            <div className="p-4 max-w-2xl mx-auto space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center"><Settings size={16} className="mr-2"/> 배차 옵션 & 우선순위</h3>
                    <div className="flex gap-2 mb-4">
                         <label className="flex-1 flex items-center justify-center text-sm font-bold text-slate-600 bg-white px-3 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="radio" checked={busSize===44} onChange={()=>setBusSize(44)} className="mr-2 accent-blue-600"/> 44인승</label>
                         <label className="flex-1 flex items-center justify-center text-sm font-bold text-slate-600 bg-white px-3 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="radio" checked={busSize===45} onChange={()=>setBusSize(45)} className="mr-2 accent-blue-600"/> 45인승</label>
                    </div>
                    {/* ... (Priority Options UI) ... */}
                    <div className="mb-4 space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">기본 정렬</label>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setPriorities(p => ({...p, solo: !p.solo}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.solo ? 'bg-white text-blue-600 border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>혼자</button>
                                <button onClick={() => setPriorities(p => ({...p, group4: !p.group4}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.group4 ? 'bg-white text-blue-600 border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>4인↑</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">언어 우선</label>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setPriorities(p => ({...p, lang_cn: !p.lang_cn}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.lang_cn ? 'bg-white text-red-600 border-red-600' : 'bg-white text-slate-500 border-slate-200'}`}>중국어(Red)</button>
                                <button onClick={() => setPriorities(p => ({...p, lang_en: !p.lang_en}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.lang_en ? 'bg-white text-blue-600 border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>영어(Blue)</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">픽업지 우선</label>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setPriorities(p => ({...p, loc_hong: !p.loc_hong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_hong ? 'bg-white text-green-600 border-green-600' : 'bg-white text-slate-500 border-slate-200'}`}>홍대</button>
                                <button onClick={() => setPriorities(p => ({...p, loc_myeong: !p.loc_myeong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_myeong ? 'bg-white text-sky-600 border-sky-600' : 'bg-white text-slate-500 border-slate-200'}`}>명동</button>
                                <button onClick={() => setPriorities(p => ({...p, loc_dong: !p.loc_dong}))} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${priorities.loc_dong ? 'bg-white text-purple-600 border-purple-600' : 'bg-white text-slate-500 border-slate-200'}`}>동대문</button>
                            </div>
                        </div>
                    </div>
                    {/* ... (Filling & Blocking UI) ... */}
                    <div className="mb-4 grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">채우기 방향</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => setFillDirection('front')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${fillDirection === 'front' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>앞 → 뒤</button>
                                <button onClick={() => setFillDirection('back')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${fillDirection === 'back' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>뒤 → 앞</button>
                            </div>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">좌석 비우기 (선택)</label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map(num => (
                                    <button 
                                        key={num} 
                                        onClick={() => toggleBlockedSeat(num)}
                                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-colors ${blockedSeats.includes(num) ? 'bg-white border-rose-600 text-rose-600' : 'bg-white border-slate-200 text-slate-400'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                         </div>
                    </div>
                    <button onClick={runAutoAssign} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-md hover:bg-slate-900 active:scale-95 transition-all flex justify-center items-center">
                        <ArrowRightLeft size={18} className="mr-2"/> 자동 배차 실행
                    </button>
                </div>
                {showMap && <BusSeatMap seatMap={seatMap} busSize={busSize} onSeatClick={handleSeatClick} selectedSeat={selectedSeat} blockedSeats={blockedSeats} />}
                
            </div>
        </div>
    );
};

const MessageCenter = ({ isOpen, onClose, teamData, teamName }) => {
    // ... existing MessageCenter code ...
    if (!isOpen) return null;
    const [guideName, setGuideName] = useState(localStorage.getItem('tm_guideName') || ""); 
    const [globalNotice, setGlobalNotice] = useState(localStorage.getItem('tm_globalNotice') || ""); 
    const [msgTemplate, setMsgTemplate] = useState("");
    
    // Save to local storage on change
    const handleGuideNameChange = (e) => { setGuideName(e.target.value); localStorage.setItem('tm_guideName', e.target.value); };
    const handleGlobalNoticeChange = (e) => { setGlobalNotice(e.target.value); localStorage.setItem('tm_globalNotice', e.target.value); };
    
    // Generate groups with labels if not present (in case opened directly)
    const groups = useMemo(() => {
        if (!teamData || !teamData.list) return [];
        return teamData.list.map((group, idx) => ({
            ...group,
            groupLabel: `${teamName}${idx+1}`
        }));
    }, [teamData, teamName]);

    // Get assigned seats for display
    const savedMap = localStorage.getItem(`tm_seatMap_${teamName}`);
    const seatMap = savedMap ? JSON.parse(savedMap) : {};
    
    const getAssignedSeats = (group) => {
        const assigned = [];
        Object.entries(seatMap).forEach(([seat, passenger]) => {
            // Compare IDs or Codes
            if (passenger.id === group.id) assigned.push(seat);
        });
        return assigned.sort((a,b) => a-b).join(', ');
    };
    
    // Add getMessage function
    const getMessage = (group) => {
        const pickupTime = group.pickup.includes('홍대') ? '06:40' : group.pickup.includes('명동') ? '07:10' : '07:20'; 
        let msg = `[${guideName}]\n\nHello, this is your ski tour guide.\nMeeting: ${group.pickup} / ${pickupTime}\n\n*${globalNotice}`;
        return encodeURIComponent(msg);
    };

    const contacts = teamData.list.filter(p => p.contact && p.contact.length > 5).map(p => p.contact.replace(/[-\s]/g, ''));
    const uniqueContacts = [...new Set(contacts)];
    const handleCopyContacts = () => { copyToClipboard(uniqueContacts.join(',')); alert(`총 ${uniqueContacts.length}개의 연락처가 복사되었습니다.`); };
    const handleDownloadVCard = () => { downloadVCard(teamData.list, teamName); };
    
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                    <h3 className="font-bold text-slate-800 flex items-center"><MessageSquare size={18} className="mr-2 text-blue-600"/> 메시지 & 연락처 센터</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">닫기</button>
                </div>
                <div className="p-5 space-y-5">
                    {/* 가이드 정보 설정 (BusManager에서 이동됨) */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center"><Settings size={12} className="mr-1"/> 가이드 설정</h4>
                        <div><label className="block text-xs font-bold text-slate-400 mb-1">가이드 영문 이름</label><input type="text" value={guideName} onChange={handleGuideNameChange} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white" placeholder="ex) Mr. Kim"/></div>
                        <div><label className="block text-xs font-bold text-slate-400 mb-1">공통 공지사항</label><textarea value={globalNotice} onChange={handleGlobalNoticeChange} className="w-full p-2 border border-slate-200 rounded-lg h-20 text-sm bg-white" placeholder="추가 공지사항..."></textarea></div>
                        <button onClick={handleDownloadVCard} className="w-full bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center text-sm"><Save size={16} className="mr-2"/> 팀 연락처 VCard 저장</button>
                    </div>

                    {/* 발송 리스트 (BusManager에서 이동됨) */}
                    <div className="space-y-3">
                         <h3 className="font-bold text-slate-700 text-sm flex items-center justify-between">
                            <span>발송 리스트 ({groups.length} 그룹)</span>
                            <span className="text-xs text-slate-400 font-normal">좌석 배정 정보 포함</span>
                         </h3>
                         {groups.map((group, idx) => {
                            const seats = getAssignedSeats(group);
                            return (
                                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="inline-block bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-bold mb-1 mr-2">{group.groupLabel || `G${idx+1}`}</span>
                                            <span className="font-bold text-slate-800 text-sm">{group.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500">({group.pax}명)</span>
                                                {seats && <span className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100"><Bus size={10} className="mr-1"/>{seats}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right"><span className="text-[10px] font-bold bg-white border border-blue-600 text-blue-600 px-2 py-1 rounded">{group.pickup}</span></div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <a href={`https://wa.me/${group.contact.replace(/[^0-9]/g,'')}?text=${getMessage(group)}`} target="_blank" rel="noreferrer" className="flex-1 bg-[#25D366] text-white py-2 rounded-lg text-center font-bold text-xs flex items-center justify-center hover:opacity-90"><MessageCircle size={14} className="mr-1"/> WhatsApp</a>
                                        <button onClick={() => { copyToClipboard(decodeURIComponent(getMessage(group))); alert("메시지 복사됨"); }} className="bg-white text-slate-600 border border-slate-200 px-3 rounded-lg hover:bg-slate-50"><Copy size={14}/></button>
                                    </div>
                                </div>
                            );
                         })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function GuideProChecklist() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tourDate, setTourDate] = useState({ date: '', type: '' });
  
  const [currentView, setCurrentView] = useState('list');
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [locationFilter, setLocationFilter] = useState('전체');
  
  const [isBusManagerOpen, setIsBusManagerOpen] = useState(false); 
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [appState, setAppState] = useState({});
  const [seatMap, setSeatMap] = useState({}); // Lifted seatMap state

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
  }, [selectedTeam]);

  const handleBusManagerClose = () => {
      setIsBusManagerOpen(false);
      const savedMap = localStorage.getItem(`tm_seatMap_${selectedTeam}`);
      setSeatMap(savedMap ? JSON.parse(savedMap) : {});
  };

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
    return Array.from(groups.values()).sort((a, b) => {
        const codeA = a.codes[0] || ""; const codeB = b.codes[0] || "";
        return codeA.localeCompare(codeB, undefined, { numeric: true });
    });
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
    const notesCodes = [];
    return groupedList.reduce((acc, curr) => {
      acc.total += (curr.pax || 0);
      const place = curr.pickup || '기타';
      acc.pickups[place] = (acc.pickups[place] || 0) + (curr.pax || 0);
      if (appState[curr.id]?.boarded) {
          acc.boardedPax += (curr.pax || 0);
          acc.boardedPickups[place] = (acc.boardedPickups[place] || 0) + (curr.pax || 0);
      }
      if (curr.event && /HOT/i.test(curr.event)) acc.totalItems.hot += (curr.pax || 0);
      acc.totalItems.shuttle += curr.items.shuttle; acc.totalItems.lift += curr.items.lift;
      acc.totalItems.moving += curr.items.moving; acc.totalItems.sled += curr.items.sled;
      acc.totalItems.sightseeing += curr.items.sightseeing; acc.totalItems.equip += curr.items.equip;
      acc.totalItems.lesson += curr.items.lesson; acc.totalItems.clothE += curr.items.clothE; acc.totalItems.clothS += curr.items.clothS;
      
      const dist = appState[curr.id]?.distributed || {};
      if(dist.lift) acc.checkedItems.lift += curr.items.lift;
      if(dist.moving) acc.checkedItems.moving += curr.items.moving;
      if(dist.sled) acc.checkedItems.sled += curr.items.sled;
      if(dist.sightseeing) acc.checkedItems.sightseeing += curr.items.sightseeing;
      if(dist.shuttle) acc.checkedItems.shuttle += curr.items.shuttle;
      
      if (curr.note) notesCodes.push(curr.codes.join('/'));
      return acc;
    }, initialStats);
  }, [groupedList, appState]);

  const toggleBoarding = (id) => {
    const current = appState[id] || {};
    const newState = { ...appState, [id]: { ...current, boarded: !current.boarded } };
    saveState(newState);
  };
  const toggleDistribution = (id, key) => {
      const current = appState[id] || {};
      const currentDist = current.distributed || {};
      const newState = { ...appState, [id]: { ...current, distributed: { ...currentDist, [key]: !currentDist[key] } } };
      saveState(newState);
  };
  const updateMemo = (id, text) => {
      const current = appState[id] || {};
      const newState = { ...appState, [id]: { ...current, memo: text } };
      saveState(newState);
  };
  const scrollToCard = (code) => {
      const targetCode = code.split('/')[0];
      const element = document.getElementById(`card-${targetCode}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-rose-200');
          setTimeout(() => element.classList.remove('ring-4', 'ring-rose-200'), 2000);
      }
  };

  const lessonStats = useMemo(() => {
    const stats = { ski: { total: 0, cn: 0, en: 0 }, board: { total: 0, cn: 0, en: 0 } };
    rawData.forEach(item => {
        const count = item.items.lesson || 0;
        if (count > 0) {
            const isBoard = item.event && (/board/i.test(item.event) || /보드/i.test(item.event));
            const type = isBoard ? 'board' : 'ski';
            const lang = item.lang || '';
            const isCn = /중국|china|chinese|中/i.test(lang);
            const isEn = /영|english|eng/i.test(lang);
            stats[type].total += count;
            if (isCn) stats[type].cn += count; else stats[type].en += count;
        }
    });
    return stats;
  }, [rawData]);

  const allTeamsSummary = useMemo(() => {
    return availableTeams.map(team => {
      const teamList = rawData.filter(d => d.team === team);
      const totalPax = teamList.reduce((acc, curr) => acc + (curr.pax || 0), 0);
      // Calculate boarded pax
      const boardedPax = teamList.reduce((acc, curr) => {
          if (appState[curr.id]?.boarded) {
              return acc + (curr.pax || 0);
          }
          return acc;
      }, 0);
      
      const guides = [...new Set(teamList.map(d => d.guide).filter(Boolean))].join(', ');
      const busInfo = teamList.find(d => d.busInfo && d.busInfo.length > 3)?.busInfo || '정보 없음';
      const totalRows = teamList.length;
      const progress = totalPax > 0 ? Math.round((boardedPax / totalPax) * 100) : 0;
      return { team, totalPax, guides, busInfo, progress, count: totalRows };
    });
  }, [availableTeams, rawData, appState]);

  const teamDetailData = {
      guides: [...new Set(rawData.filter(d => d.team === selectedTeam).map(d => d.guide).filter(Boolean))].join(', '),
      busInfo: rawData.filter(d => d.team === selectedTeam).find(d => d.busInfo && d.busInfo.length > 5)?.busInfo || '정보 없음',
      progress: Math.round((stats.boardedPax / stats.total) * 100) || 0,
      notesCodes: [] 
  };
  groupedList.forEach(g => { if(g.note) teamDetailData.notesCodes.push(g.codes.join('/')); });

  // *** 데이터 로딩 실패 시 안내 화면 (v1.73 추가) ***
  if (error) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-rose-100 max-w-sm w-full">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="text-rose-500 w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">데이터 연결 실패</h2>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                      구글 시트 데이터를 불러올 수 없습니다.<br/>
                      시트가 <b>'웹에 게시'</b> 상태인지 확인해주세요.
                  </p>
                  
                  <div className="bg-slate-50 rounded-xl p-4 text-left mb-6 border border-slate-100">
                      <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center"><FileSpreadsheet size={14} className="mr-1.5"/> 해결 방법</h3>
                      <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                          <li>구글 스프레드시트 열기</li>
                          <li>상단 메뉴: <b>파일 &gt; 공유 &gt; 웹에 게시</b></li>
                          <li>설정 변경 없이 <b>'게시'</b> 버튼 클릭</li>
                          <li>아래 '다시 시도' 버튼 클릭</li>
                      </ol>
                  </div>
                  
                  <button 
                      onClick={loadData} 
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-200"
                  >
                      다시 시도
                  </button>
              </div>
              <p className="mt-8 text-xs text-slate-400">Error Code: {error}</p>
          </div>
      );
  }

  if (loading && rawData.length === 0) return <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div><p className="text-slate-500 font-medium">데이터 동기화 중...</p></div>;

  if (currentView === 'list') {
      return (
          <div className="min-h-screen bg-slate-50 p-4 pb-20 font-sans">
              <header className="mb-4 pt-2">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">Elysian Ski Tour <span className="text-slate-400 text-sm font-normal">{APP_VERSION}</span></h1>
                        <div className="flex items-center text-slate-600 font-bold text-lg"><Calendar size={18} className="mr-2 text-blue-600"/><span>{tourDate.date}</span></div>
                    </div>
                    <button onClick={loadData} className="p-3 bg-white rounded-full shadow-sm active:scale-95 text-slate-500 border border-slate-200"><RefreshCw size={20} /></button>
                  </div>
              </header>
              <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                      <div className="text-sm font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1 flex justify-between items-center"><span>⛷️ 스키 강습</span><span className="text-blue-600 text-lg">{lessonStats.ski.total}</span></div>
                      <div className="grid grid-cols-2 text-center text-xs"><div className="border-r border-slate-100"><span className="text-slate-400 block">중국어</span><span className="font-bold text-slate-700 text-sm">{lessonStats.ski.cn}</span></div><div><span className="text-slate-400 block">영어</span><span className="font-bold text-slate-700 text-sm">{lessonStats.ski.en}</span></div></div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                      <div className="text-sm font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1 flex justify-between items-center"><span>🏂 보드 강습</span><span className="text-rose-600 text-lg">{lessonStats.board.total}</span></div>
                      <div className="grid grid-cols-2 text-center text-xs"><div className="border-r border-slate-100"><span className="text-slate-400 block">중국어</span><span className="font-bold text-slate-700 text-sm">{lessonStats.board.cn}</span></div><div><span className="text-slate-400 block">영어</span><span className="font-bold text-slate-700 text-sm">{lessonStats.board.en}</span></div></div>
                  </div>
              </div>
              <div className="space-y-4">
                  {allTeamsSummary.map((teamData) => {
                      const styles = TEAM_THEMES[teamData.team] || TEAM_THEMES['DEFAULT'];
                      const isEmpty = teamData.count === 0;
                      return (
                          <div key={teamData.team} onClick={() => { if (isEmpty) return; setSelectedTeam(teamData.team); setLocationFilter('전체'); setCurrentView('detail'); }} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden transition-all ${isEmpty ? 'opacity-60 grayscale' : 'active:scale-[0.98] cursor-pointer hover:shadow-md'}`}>
                              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-60 ${styles.bg}`}></div>
                              <div className="relative z-10">
                                  <div className="flex justify-between items-center mb-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-inner ${styles.badgeBg} ${styles.text} ${styles.border}`}>{teamData.team}</div><div className="flex-1 ml-4 text-right"><div className="flex items-center justify-end gap-2 mb-1"><span className="text-xs text-slate-400 font-bold">탑승률</span><span className={`text-lg font-black ${styles.text}`}>{isNaN(teamData.progress) ? 0 : teamData.progress}%</span></div><div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden ml-auto"><div className={`h-full rounded-full transition-all duration-500 ${styles.bar}`} style={{ width: `${isNaN(teamData.progress) ? 0 : teamData.progress}%` }}></div></div></div></div>
                                  <div className="mb-3"><div className="text-lg font-bold text-slate-800 truncate">{teamData.guides || '가이드 배정중'}</div></div>
                                  <div className="mb-4 flex items-start text-slate-600"><Bus size={15} className="mr-2 mt-0.5 flex-shrink-0 text-slate-400" /><PhoneLinkedText text={teamData.busInfo} className="text-sm font-bold leading-snug" /></div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // --- 상세 화면 ---
  const styles = TEAM_THEMES[selectedTeam] || TEAM_THEMES['DEFAULT'];
  
  // 현재 팀의 배차 정보에서 해당 승객(그룹)의 좌석 찾기
  const findAssignedSeat = (passengerId) => {
      if (!seatMap) return null;
      const entry = Object.entries(seatMap).find(([seat, p]) => p.id === passengerId);
      return entry ? entry[0] : null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-12">
      <header className="bg-white shadow-sm border-b border-slate-200 z-30 relative">
        <div className="max-w-xl mx-auto">
            <div className="flex items-start justify-between px-4 py-4 border-b border-slate-100 bg-white">
                <div className="flex items-center flex-1 min-w-0">
                    <button onClick={() => setCurrentView('list')} className="mr-3 p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors flex-shrink-0"><ChevronLeft size={24} /></button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 truncate mb-1"><h1 className={`text-3xl font-black tracking-tight ${UNIFIED_THEME.text}`}>{selectedTeam}팀</h1><span className="text-xl font-bold text-slate-800 truncate">{teamDetailData.guides || '미정'}</span></div>
                        <div className="flex items-start text-slate-600 mt-1"><Bus size={16} className="mr-2 mt-0.5 flex-shrink-0 text-slate-400" /><PhoneLinkedText text={teamDetailData.busInfo} className="text-sm font-bold leading-snug" /></div>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end flex-shrink-0 ml-2 space-y-2">
                     <div className="flex gap-2">
                        {teamDetailData.notesCodes.length > 0 && (
                            <div className="flex flex-col items-center justify-center min-w-[max-content] px-2 py-1 rounded-lg border bg-rose-50 border-rose-100 text-rose-600 shadow-sm cursor-pointer hover:bg-rose-100">
                                <span className="text-[9px] font-bold opacity-80 mb-0.5 whitespace-nowrap flex items-center"><FileText size={9} className="mr-1"/>비고사항</span>
                                <div className="flex gap-1 max-w-[100px] overflow-hidden">
                                    {teamDetailData.notesCodes.slice(0, 3).map((code) => (<button key={code} onClick={() => scrollToCard(code)} className="text-xs font-black leading-none hover:text-rose-800 hover:underline active:scale-95 transition-transform">{code}</button>))}
                                    {teamDetailData.notesCodes.length > 3 && <span className="text-[10px]">..</span>}
                                </div>
                            </div>
                        )}
                        <button onClick={() => setIsBusManagerOpen(true)} className="p-2 h-fit bg-slate-50 rounded-full hover:bg-slate-100 active:scale-95 text-slate-500 border border-slate-200"><Bus size={18}/></button>
                        <button onClick={() => setIsMsgModalOpen(true)} className="p-2 h-fit bg-slate-50 rounded-full hover:bg-slate-100 active:scale-95 text-slate-500 border border-slate-200"><Mail size={18}/></button>
                        <button onClick={loadData} className="p-2 h-fit bg-slate-50 rounded-full hover:bg-slate-100 active:scale-95 text-slate-500 border border-slate-200"><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button>
                     </div>
                </div>
            </div>
        </div>
      </header>

      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md">
        <div className="max-w-xl mx-auto">
            <div className="px-4 py-2 border-b border-slate-100 bg-white">
                 <div className="flex space-x-2 overflow-x-auto scrollbar-hide py-1 items-center">
                    <div className="flex items-center bg-white border border-rose-200 text-rose-600 px-2.5 py-1 rounded-lg flex-shrink-0">
                        <span className="text-[10px] font-bold mr-1.5 opacity-80">HOT</span><span className="text-sm font-black">{stats.totalItems.hot}</span>
                    </div>
                    {/* checked prop을 리프트와 무빙에만 전달하여 카운트다운 표시 제어 */}
                    <SummaryChipH label="리프트" total={stats.totalItems.lift} checked={stats.checkedItems.lift} color="violet" />
                    <SummaryChipH label="무빙" total={stats.totalItems.moving} checked={stats.checkedItems.moving} color="amber" />
                    <SummaryChipH label="눈썰매" total={stats.totalItems.sled} color="cyan" />
                    <SummaryChipH label="관광L" total={stats.totalItems.sightseeing} color="emerald" />
                    <SummaryChipH label="셔틀" total={stats.totalItems.shuttle} color="slate" />
                    <SummaryChipH label="장비" total={stats.totalItems.equip} simple />
                    <SummaryChipH label="강습" total={stats.totalItems.lesson} simple />
                    <SummaryChipH label="의류(E)" total={stats.totalItems.clothE} simple />
                    <SummaryChipH label="의류(S)" total={stats.totalItems.clothS} simple />
                </div>
            </div>
            <div className="px-4 py-3">
                <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-1 mb-2">
                    <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
                        {(() => {
                           const fixedOrder = ['전체', '홍대', '명동', '동대문', '스키장'];
                           const locs = Object.keys(stats.pickups);
                           const others = locs.filter(l => !fixedOrder.includes(l)).sort();
                           const allLocs = [...fixedOrder.filter(l => l === '전체' || locs.includes(l)), ...others];
                           
                           return allLocs.map(loc => {
                               let total = loc === '전체' ? stats.total : (stats.pickups[loc] || 0);
                               let boarded = loc === '전체' ? stats.boardedPax : (stats.boardedPickups[loc] || 0);
                               const label = loc === '전체' ? '총원' : loc;
                               const displayText = `${label} ${boarded}/${total}`;
                               return (
                                  <button key={loc} onClick={() => setLocationFilter(loc)} className={`flex-1 min-w-[max-content] whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold transition-all ${locationFilter === loc ? `bg-white border border-blue-600 text-blue-600 shadow-sm` : 'bg-transparent text-slate-500 hover:bg-white hover:shadow-sm'}`}>{displayText}</button>
                               );
                           });
                        })()}
                    </div>
                </div>
                <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">현재 탑승률</span><span className={`text-sm font-black text-slate-800`}>{isNaN(teamDetailData.progress) ? 0 : teamDetailData.progress}%</span></div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ease-out bg-blue-600`} style={{ width: `${isNaN(teamDetailData.progress) ? 0 : teamDetailData.progress}%` }}></div></div>
            </div>
        </div>
      </div>

      <main className="flex-1 max-w-xl mx-auto w-full px-3 pt-4 pb-8 space-y-3">
        {currentList.map(item => (
             <DetailCard key={item.id} data={item} teamBusInfo={teamDetailData.busInfo} state={appState[item.id] || {}} onToggleBoarding={() => toggleBoarding(item.id)} onToggleDist={toggleDistribution} onUpdateMemo={(text) => updateMemo(item.id, text)} theme={UNIFIED_THEME} styles={styles} assignedSeat={findAssignedSeat(item.id)}/>
        ))}
      </main>
      
      <BusManager isOpen={isBusManagerOpen} onClose={handleBusManagerClose} teamData={{list: groupedList}} teamName={selectedTeam} />
      <MessageCenter isOpen={isMsgModalOpen} onClose={() => setIsMsgModalOpen(false)} teamData={{list: groupedList}} teamName={selectedTeam} />
    </div>
  );
}
