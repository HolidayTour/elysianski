import React, { useState, useEffect, useMemo } from 'react';
import { Check, Users, RefreshCw, AlertCircle, Phone, MessageCircle, Bus, Snowflake, ArrowUpRight, Mountain, ClipboardList, Mail, MapPin, Shirt, ChevronLeft, Calendar, ExternalLink, Lock, Copy, FileText, PenLine } from 'lucide-react';

// *** 구글 시트 CSV 주소 ***
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQxi-VFW9RLmKHtGDqcmUIyZcbLhMFuXrClqF1xL3QdTz945zC5TNrEuYQFOqNjgfTU1KoFttAZeHe/pub?output=csv";
const APP_VERSION = "v1.26";
const ACCESS_PASSWORD = "6578888";

// --- 데이터 컬럼 매핑 ---
const COLS = {
  TEAM: 0,       // A
  GUIDE: 1,      // B
  BUS_INFO: 2,   // C
  CODE: 3,       // D
  EVENT: 4,      // E
  RES_NO: 5,     // F
  NAME: 6,       // G
  CONTACT: 7,    // H
  APP_ID: 8,     // I
  EMAIL: 9,      // J
  LANG: 10,      // K
  PAX: 11,       // L
  PICKUP: 12,    // M
  SHUTTLE: 13,   // N
  SLED: 14,      // O
  SIGHTSEEING: 15, // P
  MOVING: 16,    // Q
  LIFT: 17,      // R
  EQUIP: 18,     // S
  LESSON: 19,    // T
  CLOTH_E: 20,   // U
  CLOTH_S: 21,   // V
  NOTE: 22       // W
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
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  if (currentCell) currentRow.push(currentCell.trim());
  if (currentRow.length > 0) rows.push(currentRow);
  return rows;
};

const safeParseInt = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/,/g, '').trim();
  if (!str) return 0;
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 0 : parsed;
};

// --- 컴포넌트들 ---
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
           return (
             <a 
                key={index} 
                href={`tel:${phoneNumber.replace(/[-\s]/g, '')}`} 
                onClick={(e) => e.stopPropagation()}
                className="text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-2 hover:text-blue-600 hover:decoration-blue-600 transition-colors"
             >
               {phoneNumber}
             </a>
           );
        }
        return part;
      })}
    </span>
  );
};

const MessengerLink = ({ text }) => {
    if (!text) return null;
    const isLine = /Line/i.test(text);
    const isWhatsApp = /Whats|WA/i.test(text);
    const extractId = (str) => {
        const match = str.match(/[:\s]+(.+)/);
        return match ? match[1].trim() : str;
    };
    const id = extractId(text);
    let link = null;
    if (isLine) link = `https://line.me/R/ti/p/~${id}`; 
    else if (isWhatsApp) {
        const cleanNumber = id.replace(/[^0-9]/g, '');
        link = `https://wa.me/${cleanNumber}`;
    }

    // 색상 통일: slate-100 (검회색 톤)
    const btnClass = "flex items-center px-2 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-colors";

    if (link) {
        return (
            <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className={btnClass}>
                <MessageCircle size={12} className="mr-1.5 flex-shrink-0"/> 
                <span className="break-all">{text}</span>
                <ExternalLink size={10} className="ml-1 opacity-50 flex-shrink-0"/>
            </a>
        );
    }
    return (
        <div className={btnClass}>
            <MessageCircle size={12} className="mr-1.5 opacity-70 flex-shrink-0"/> <span className="break-all">{text}</span>
        </div>
    );
};

const LoginScreen = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === ACCESS_PASSWORD) {
            onLogin();
        } else {
            setError(true);
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center border border-slate-100">
                <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-blue-200">
                    <Lock size={24} />
                </div>
                <h1 className="text-xl font-bold text-slate-800 mb-1">Elysian Ski Tour Checklist</h1>
                <p className="text-sm text-slate-400 font-medium mb-6">{APP_VERSION}</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input 
                            type="password" 
                            inputMode="numeric"
                            value={password}
                            onChange={(e) => { setError(false); setPassword(e.target.value); }}
                            placeholder="Password"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-xs mt-2 font-medium animate-pulse">비밀번호가 일치하지 않습니다.</p>}
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                        ENTER
                    </button>
                </form>
            </div>
        </div>
    );
};

export default function GuideProChecklist() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tourDate, setTourDate] = useState({ date: '', type: '' });
  
  const [currentView, setCurrentView] = useState('list');
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [locationFilter, setLocationFilter] = useState('전체');
  
  const [appState, setAppState] = useState({});

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('elysian_auth');
    if (sessionAuth === 'true') {
        setIsAuthenticated(true);
    }
    const saved = localStorage.getItem('guide_pro_state_v16'); // v16 업데이트
    if (saved) setAppState(JSON.parse(saved));
  }, []);

  const handleLogin = () => {
      setIsAuthenticated(true);
      sessionStorage.setItem('elysian_auth', 'true');
      loadData();
  };

  const saveState = (newState) => {
    setAppState(newState);
    localStorage.setItem('guide_pro_state_v16', JSON.stringify(newState));
  };

  useEffect(() => {
      if (isAuthenticated) {
          loadData();
      }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error("데이터 로딩 실패");
      const text = await response.text();
      const parsed = parseCSV(text);
      
      if (parsed.length > 0) {
          const row1 = parsed[0];
          if (row1[1] && !row1[1].includes('가이드') && !row1[1].includes('Guide')) {
             setTourDate({ date: row1[1], type: '' });
          } else {
             setTourDate({ date: '날짜 정보 없음', type: '' });
          }
      }

      const dataRows = parsed.filter(row => {
        const teamCol = row[0] ? row[0].trim() : '';
        if (!teamCol) return false;
        const headers = ['팀구분', 'TEAM', 'Team', '구분', 'Guide', '가이드', 'Code', '순번', 'Pickup', '픽업'];
        if (headers.some(h => teamCol.toUpperCase().includes(h.toUpperCase()))) return false;
        if (row[1] && headers.some(h => row[1].toUpperCase().includes(h.toUpperCase()))) return false;
        return true; 
      });
      
      const formatted = dataRows.map((row, idx) => {
        return {
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
            guideMemo: row[COLS.NOTE] || row[COLS.GUIDE_MEMO], // 비고 혹은 메모
            items: {
                shuttle: safeParseInt(row[COLS.SHUTTLE]),
                sled: safeParseInt(row[COLS.SLED]),
                sightseeing: safeParseInt(row[COLS.SIGHTSEEING]),
                moving: safeParseInt(row[COLS.MOVING]),
                lift: safeParseInt(row[COLS.LIFT]),
                equip: safeParseInt(row[COLS.EQUIP]),
                lesson: safeParseInt(row[COLS.LESSON]),
                clothE: safeParseInt(row[COLS.CLOTH_E]),
                clothS: safeParseInt(row[COLS.CLOTH_S]),
            }
        };
      });
      setRawData(formatted);
    } catch (err) {
      setError("데이터를 불러올 수 없습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const availableTeams = useMemo(() => {
    const teams = [...new Set(rawData.map(d => d.team).filter(Boolean))];
    return teams.sort();
  }, [rawData]);

  const teamDetailData = useMemo(() => {
    const filtered = rawData.filter(d => d.team === selectedTeam);
    const guides = [...new Set(filtered.map(d => d.guide).filter(Boolean))];
    const validBusInfo = filtered.find(d => d.busInfo && d.busInfo.length > 3)?.busInfo || '정보 없음';
    
    const totalRows = filtered.length;
    const boardedRows = filtered.filter(item => appState[item.id]?.boarded).length;
    const progress = totalRows > 0 ? Math.round((boardedRows / totalRows) * 100) : 0;

    const notesCodes = filtered
      .filter(item => (item.note && item.note.trim() !== '') || (item.guideMemo && item.guideMemo.trim() !== ''))
      .map(item => item.code);

    const stats = filtered.reduce((acc, curr) => {
      acc.total += (curr.pax || 0);
      const place = curr.pickup || '기타';
      acc.pickups[place] = (acc.pickups[place] || 0) + (curr.pax || 0);

      acc.totalItems.shuttle += (curr.items.shuttle || 0);
      acc.totalItems.sled += (curr.items.sled || 0);
      acc.totalItems.sightseeing += (curr.items.sightseeing || 0);
      acc.totalItems.moving += (curr.items.moving || 0);
      acc.totalItems.lift += (curr.items.lift || 0);
      acc.totalItems.equip += (curr.items.equip || 0);
      acc.totalItems.lesson += (curr.items.lesson || 0);
      acc.totalItems.clothE += (curr.items.clothE || 0);
      acc.totalItems.clothS += (curr.items.clothS || 0);

      const dist = appState[curr.id]?.distributed || {};
      if (dist.shuttle) acc.checkedItems.shuttle += (curr.items.shuttle || 0);
      if (dist.sled) acc.checkedItems.sled += (curr.items.sled || 0);
      if (dist.sightseeing) acc.checkedItems.sightseeing += (curr.items.sightseeing || 0);
      if (dist.moving) acc.checkedItems.moving += (curr.items.moving || 0);
      if (dist.lift) acc.checkedItems.lift += (curr.items.lift || 0);
      
      return acc;
    }, {
      total: 0, 
      pickups: {},
      totalItems: { shuttle: 0, sled: 0, sightseeing: 0, moving: 0, lift: 0, equip: 0, lesson: 0, clothE: 0, clothS: 0 },
      checkedItems: { shuttle: 0, sled: 0, sightseeing: 0, moving: 0, lift: 0 }
    });

    return { list: filtered, guides: guides.join(', '), busInfo: validBusInfo, progress, stats, notesCodes };
  }, [rawData, selectedTeam, appState]);

  const allTeamsSummary = useMemo(() => {
    return availableTeams.map(team => {
      const teamList = rawData.filter(d => d.team === team);
      const totalPax = teamList.reduce((acc, curr) => acc + (curr.pax || 0), 0);
      const guides = [...new Set(teamList.map(d => d.guide).filter(Boolean))].join(', ');
      const validBusInfo = teamList.find(d => d.busInfo && d.busInfo.length > 3)?.busInfo || '정보 없음';
      
      const pickupStats = teamList.reduce((acc, curr) => {
        const place = curr.pickup || '기타';
        acc[place] = (acc[place] || 0) + (curr.pax || 0);
        return acc;
      }, {});

      const totalRows = teamList.length;
      const boardedRows = teamList.filter(item => appState[item.id]?.boarded).length;
      const progress = totalRows > 0 ? Math.round((boardedRows / totalRows) * 100) : 0;

      return { team, totalPax, guides, busInfo: validBusInfo, pickupStats, progress, count: totalRows };
    });
  }, [availableTeams, rawData, appState]);

  const currentList = useMemo(() => {
    if (locationFilter === '전체') return teamDetailData.list;
    return teamDetailData.list.filter(item => item.pickup && item.pickup.includes(locationFilter));
  }, [teamDetailData, locationFilter]);

  const sortedLocations = useMemo(() => {
      const fixedOrder = ['전체', '홍대', '명동', '동대문', '스키장'];
      const currentLocs = Object.keys(teamDetailData.stats.pickups);
      const result = fixedOrder.filter(loc => loc === '전체' || currentLocs.includes(loc));
      const others = currentLocs.filter(loc => !fixedOrder.includes(loc)).sort();
      return [...result, ...others];
  }, [teamDetailData]);

  const toggleBoarding = (id) => {
    const current = appState[id] || {};
    const newState = { ...appState, [id]: { ...current, boarded: !current.boarded } };
    saveState(newState);
  };

  const toggleDistribution = (id, key) => {
    const current = appState[id] || {};
    const currentDist = current.distributed || {};
    const newState = {
      ...appState,
      [id]: { ...current, distributed: { ...currentDist, [key]: !currentDist[key] } }
    };
    saveState(newState);
  };

  const updateMemo = (id, text) => {
      const current = appState[id] || {};
      const newState = { ...appState, [id]: { ...current, memo: text } };
      saveState(newState);
  };

  // 특정 카드로 스크롤 이동
  const scrollToCard = (code) => {
      const element = document.getElementById(`card-${code}`);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // 반짝임 효과
          element.classList.add('ring-4', 'ring-rose-200');
          setTimeout(() => element.classList.remove('ring-4', 'ring-rose-200'), 2000);
      }
  };

  const getThemeColor = (team) => {
      const t = team.replace('팀', '').trim();
      if(t === 'A') return 'blue';
      if(t === 'B') return 'emerald';
      if(t === 'C') return 'violet';
      return 'slate';
  };

  if (!isAuthenticated) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  if (loading && rawData.length === 0) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-500 font-medium">데이터 동기화 중...</p>
        </div>
    );
  }

  // --- 1. 메인 리스트 뷰 ---
  if (currentView === 'list') {
      return (
          <div className="min-h-screen bg-slate-50 p-4 pb-20 font-sans">
              <header className="mb-6 pt-2">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">Elysian Ski Tour <span className="text-slate-400 text-sm font-normal">v1.26</span></h1>
                        <div className="flex items-center text-slate-600 font-bold text-lg">
                            <Calendar size={18} className="mr-2 text-blue-600"/>
                            <span>{tourDate.date}</span>
                        </div>
                    </div>
                    <button onClick={loadData} className="p-3 bg-white rounded-full shadow-sm active:scale-95 text-slate-500 border border-slate-200">
                        <RefreshCw size={20} />
                    </button>
                  </div>
              </header>

              <div className="space-y-4">
                  {allTeamsSummary.map((teamData) => {
                      const theme = getThemeColor(teamData.team);
                      const isEmpty = teamData.count === 0;
                      
                      return (
                          <div 
                            key={teamData.team}
                            onClick={() => {
                                if (isEmpty) return;
                                setSelectedTeam(teamData.team);
                                setLocationFilter('전체');
                                setCurrentView('detail');
                            }}
                            className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden transition-all ${isEmpty ? 'opacity-60 grayscale' : 'active:scale-[0.98] cursor-pointer hover:shadow-md'}`}
                          >
                              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-${theme}-50 opacity-60`}></div>
                              <div className="relative z-10">
                                  <div className="flex justify-between items-center mb-4">
                                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${theme}-100 text-${theme}-600 font-black text-xl shadow-inner`}>
                                          {teamData.team}
                                      </div>
                                      <div className="flex-1 ml-4">
                                          <div className="flex justify-between items-end mb-1">
                                              <span className="text-xs text-slate-400 font-bold">탑승률</span>
                                              <span className={`text-2xl font-black text-${theme}-600`}>{isNaN(teamData.progress) ? 0 : teamData.progress}%</span>
                                          </div>
                                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                              <div className={`h-full bg-${theme}-500 rounded-full transition-all duration-500`} style={{ width: `${isNaN(teamData.progress) ? 0 : teamData.progress}%` }}></div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="mb-3">
                                      <div className="text-lg font-bold text-slate-800 truncate">
                                          {teamData.guides || '가이드 배정중'}
                                      </div>
                                  </div>
                                  <div className="mb-4 flex items-start text-slate-600">
                                      <Bus size={15} className="mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                                      <PhoneLinkedText 
                                        text={teamData.busInfo} 
                                        className="text-sm font-bold leading-snug" 
                                      />
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
                                      <div className="text-center border-r border-slate-100">
                                          <span className="block text-[10px] text-slate-400 mb-0.5">총원</span>
                                          <span className={`block text-lg font-black text-${theme}-600`}>{isNaN(teamData.totalPax) ? 0 : teamData.totalPax}</span>
                                      </div>
                                      {Object.entries(teamData.pickupStats).slice(0, 3).map(([place, count]) => (
                                          <div key={place} className="text-center">
                                              <span className="block text-[10px] text-slate-400 mb-0.5 truncate px-1">{place}</span>
                                              <span className="block text-base font-bold text-slate-700">{isNaN(count) ? 0 : count}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // --- 2. 상세 체크리스트 뷰 ---
  const theme = getThemeColor(selectedTeam);
  const stats = teamDetailData.stats;
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-12">
      
      {/* 2-1. 헤더 (고정 X) */}
      <header className="bg-white shadow-sm border-b border-slate-200 z-30 relative">
        <div className="max-w-xl mx-auto">
            {/* Nav Bar & Info */}
            <div className="flex items-start justify-between px-4 py-4 border-b border-slate-100 bg-white">
                <div className="flex items-center flex-1 min-w-0">
                    <button 
                        onClick={() => setCurrentView('list')}
                        className="mr-3 p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors flex-shrink-0"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 truncate mb-1">
                             <h1 className={`text-3xl font-black text-${theme}-600 tracking-tight`}>
                                {selectedTeam}팀
                            </h1>
                             <span className="text-xl font-bold text-slate-800 truncate">
                                {teamDetailData.guides || '미정'}
                             </span>
                        </div>
                        {/* 버스 정보 (배경 제거하고 깔끔하게) */}
                        <div className="flex items-start text-slate-600 mt-1">
                            <Bus size={16} className="mr-2 mt-0.5 flex-shrink-0 text-slate-400" />
                            <PhoneLinkedText 
                                text={teamDetailData.busInfo} 
                                className="text-sm font-bold leading-snug" 
                            />
                        </div>
                    </div>
                </div>
                
                <div className="text-right flex flex-col items-end flex-shrink-0 ml-2">
                     <button onClick={loadData} className="p-2 mb-1 bg-slate-50 rounded-full hover:bg-slate-100 active:scale-95 text-slate-500 border border-slate-200">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
                     </button>
                </div>
            </div>
        </div>
      </header>

      {/* 2-2. 고정 컨트롤 영역 (Sticky) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md">
        <div className="max-w-xl mx-auto">
            
            {/* 1. 옵션 수량 요약 + [확인필요] 박스 */}
            <div className="px-4 py-2 border-b border-slate-100 bg-white">
                <div className="flex space-x-2 overflow-x-auto scrollbar-hide py-1 items-center">
                    <SummaryPill label="셔틀" total={stats.totalItems.shuttle} checked={stats.checkedItems.shuttle} color="slate" />
                    <SummaryPill label="리프트" total={stats.totalItems.lift} checked={stats.checkedItems.lift} color="violet" />
                    <SummaryPill label="무빙" total={stats.totalItems.moving} checked={stats.checkedItems.moving} color="amber" />
                    <SummaryPill label="눈썰매" total={stats.totalItems.sled} checked={stats.checkedItems.sled} color="cyan" />
                    <SummaryPill label="관광L" total={stats.totalItems.sightseeing} checked={stats.checkedItems.sightseeing} color="emerald" />
                    
                    <SummaryPillInfo label="장비" total={stats.totalItems.equip} />
                    <SummaryPillInfo label="의류(E)" total={stats.totalItems.clothE} />
                    <SummaryPillInfo label="의류(S)" total={stats.totalItems.clothS} />

                    {/* 확인 사항 (제일 우측, 클릭시 이동) */}
                    {teamDetailData.notesCodes.length > 0 && (
                        <div className="flex flex-col items-center justify-center min-w-[max-content] px-3 py-1.5 rounded-lg border bg-rose-50 border-rose-100 text-rose-600 ml-2 shadow-sm">
                            <span className="text-[10px] font-medium opacity-80 mb-0.5 whitespace-nowrap flex items-center">
                                <FileText size={10} className="mr-1"/>확인필요
                            </span>
                            <div className="flex gap-1">
                                {teamDetailData.notesCodes.map((code) => (
                                    <button
                                        key={code}
                                        onClick={() => scrollToCard(code)}
                                        className="text-xs font-bold leading-none hover:text-rose-800 hover:underline active:scale-95 transition-transform"
                                    >
                                        {code}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. 픽업 필터 & 진행률 */}
            <div className="px-4 py-3">
                <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-1 mb-2">
                    <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
                        {sortedLocations.map(loc => (
                            <button
                                key={loc}
                                onClick={() => setLocationFilter(loc)}
                                className={`flex-1 min-w-[60px] whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                    locationFilter === loc
                                    ? `bg-${theme}-600 text-white shadow-md`
                                    : 'bg-transparent text-slate-500 hover:bg-white hover:shadow-sm'
                                }`}
                            >
                                {loc}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">현재 탑승률</span>
                    <span className={`text-sm font-black text-${theme}-600`}>{isNaN(teamDetailData.progress) ? 0 : teamDetailData.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full bg-${theme}-500 rounded-full transition-all duration-700 ease-out`} 
                        style={{ width: `${isNaN(teamDetailData.progress) ? 0 : teamDetailData.progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
      </div>

      {/* 2-3. 리스트 영역 */}
      <main className="flex-1 max-w-xl mx-auto w-full px-3 pt-4 pb-8 space-y-3">
        {error ? (
             <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center text-sm border border-red-100">
                <AlertCircle className="mx-auto mb-2" />
                {error}
                <button onClick={loadData} className="block mx-auto mt-2 text-xs underline">재시도</button>
             </div>
        ) : currentList.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
                <ClipboardList size={40} className="mx-auto mb-2 opacity-20"/>
                <p className="text-sm">해당 조건의 인원이 없습니다.</p>
            </div>
        ) : (
            currentList.map(item => (
                <DetailCard 
                    key={item.id} 
                    data={item} 
                    state={appState[item.id] || {}} 
                    onToggleBoarding={() => toggleBoarding(item.id)}
                    onToggleDist={toggleDistribution}
                    onUpdateMemo={(text) => updateMemo(item.id, text)}
                    theme={theme}
                />
            ))
        )}
      </main>
    </div>
  );
}

// --- 하위 컴포넌트 ---
function SummaryPill({ label, total, checked, color }) {
    if (total === 0 || isNaN(total)) return null;
    const colors = {
        slate: 'bg-slate-100 text-slate-600 border-slate-200',
        violet: 'bg-violet-50 text-violet-700 border-violet-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    };
    const remaining = total - (checked || 0);
    const style = colors[color] || colors.slate;

    return (
        <div className={`flex flex-col items-center justify-center min-w-[60px] px-2 py-1.5 rounded-lg border ${style}`}>
            <span className="text-[10px] font-bold opacity-80 mb-0.5 whitespace-nowrap">{label}</span>
            <div className="flex items-baseline">
                <span className="text-sm font-black leading-none">{total}</span>
                {remaining > 0 && remaining < total && (
                    <span className="text-[10px] font-medium ml-1 opacity-60">
                        ({remaining})
                    </span>
                )}
            </div>
        </div>
    );
}

function SummaryPillInfo({ label, total }) {
    if (total === 0 || isNaN(total)) return null;
    return (
        <div className="flex flex-col items-center justify-center min-w-[50px] px-2 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-500">
            <span className="text-[10px] font-bold opacity-70 mb-0.5 whitespace-nowrap">{label}</span>
            <span className="text-sm font-black leading-none">{total}</span>
        </div>
    );
}

function DetailCard({ data, state, onToggleBoarding, onToggleDist, onUpdateMemo, theme }) {
    const isBoarded = state.boarded;
    const memo = state.memo || '';
    const dist = state.distributed || {};
    const [copied, setCopied] = useState(false);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const items = [
        { key: 'lift', label: '리프트', val: data.items.lift, colorClass: 'bg-violet-50 text-violet-700 border-violet-100' },
        { key: 'moving', label: '무빙', val: data.items.moving, colorClass: 'bg-amber-50 text-amber-700 border-amber-100' },
        { key: 'sled', label: '눈썰매', val: data.items.sled, colorClass: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
        { key: 'sightseeing', label: '관광L', val: data.items.sightseeing, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    ];

    const extras = [
        { label: '장비', val: data.items.equip, icon: Snowflake },
        { label: '강습', val: data.items.lesson, icon: Users },
        { label: '의류(E)', val: data.items.clothE, icon: Shirt },
        { label: '의류(S)', val: data.items.clothS, icon: Shirt },
    ].filter(i => i.val > 0);

    // 버튼 스타일 통일 (검회색)
    const btnClass = "flex items-center px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 transition-colors";

    return (
        <div id={`card-${data.code}`} className={`rounded-xl border shadow-sm bg-white overflow-hidden transition-all duration-300 ${
            isBoarded 
            ? 'border-blue-200 bg-blue-50/20' 
            : 'border-slate-200 hover:shadow-md'
        }`}>
            {/* Header */}
            <div className="flex items-center p-3 border-b border-slate-50 bg-white/80">
                <div className={`flex flex-col items-center justify-center w-12 h-12 bg-slate-100 rounded-xl flex-shrink-0 text-${theme}-600 mr-3 shadow-inner`}>
                    <span className="text-xl font-black">{data.code}</span>
                </div>
                
                <div className="min-w-0 flex-1 mr-2">
                    <h3 className="font-bold truncate text-lg leading-tight mb-0.5 text-slate-800">{data.name}</h3>
                    <div className="flex items-center">
                         <div className="flex items-center text-xs font-bold text-slate-500 mr-2">
                             <Users size={12} className="mr-1"/>
                             <span>{isNaN(data.pax) ? 0 : data.pax}명</span>
                         </div>
                    </div>
                </div>

                <div className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold mr-2 ${
                    data.pickup.includes('스키장') ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-white'
                }`}>
                    {data.pickup || '미정'}
                </div>

                <button
                    onClick={onToggleBoarding}
                    className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex-shrink-0 shadow-sm border ${
                        isBoarded
                        ? `bg-${theme}-600 text-white border-${theme}-600`
                        : `bg-white text-slate-500 border-slate-200 hover:border-slate-300`
                    }`}
                >
                    <Check size={14} className={`mr-1.5 ${isBoarded ? 'text-white' : 'text-slate-400'}`} strokeWidth={3}/>
                    {isBoarded ? '탑승완료' : '탑승'}
                </button>
            </div>

            <div className="p-3 bg-white">
                {/* 연락처 및 앱 아이디 (색상 통일) */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {data.contact && (
                        <a href={`tel:${data.contact}`} className={btnClass}>
                            <Phone size={12} className="mr-1.5"/> 전화
                        </a>
                    )}
                    {data.email && (
                        <a href={`mailto:${data.email}`} className={btnClass}>
                            <Mail size={12} className="mr-1.5"/> 메일
                        </a>
                    )}
                    {data.appId && <MessengerLink text={data.appId} />}
                    
                    <button 
                        onClick={() => handleCopy(data.resNo)}
                        className="flex items-center text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded hover:bg-slate-100 transition-colors active:scale-95 ml-auto"
                    >
                        {copied ? <Check size={10} className="mr-1 text-green-500"/> : <Copy size={10} className="mr-1"/>}
                        <span className={`font-mono ${copied ? 'text-green-600' : ''}`}>{copied ? '복사됨' : data.resNo}</span>
                    </button>
                </div>

                {/* 비고 및 메모 */}
                {(data.guideMemo || data.note) && (
                    <div className="mb-3 space-y-2">
                        {data.note && (
                            <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex items-start text-rose-700 text-sm">
                                <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0 text-rose-500"/>
                                <span className="font-bold leading-snug">{data.note}</span>
                            </div>
                        )}
                        {data.guideMemo && (
                            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg flex items-start text-blue-700 text-xs">
                                <div className="font-bold bg-blue-100 text-blue-600 px-1.5 rounded mr-2 flex-shrink-0 text-[10px]">MEMO</div>
                                <span className="font-medium leading-snug">{data.guideMemo}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 체크 버튼 그리드 */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {items.map((item) => {
                        const isDistributed = dist[item.key];
                        const hasValue = item.val > 0;
                        
                        if (!hasValue) {
                            return (
                                <div key={item.key} className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-100 opacity-30 grayscale">
                                    <span className="text-[10px] text-slate-400 font-medium">{item.label}</span>
                                    <span className="text-xs font-bold text-slate-300">-</span>
                                </div>
                            );
                        }

                        return (
                            <button
                                key={item.key}
                                onClick={() => onToggleDist(data.id, item.key)}
                                className={`relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all active:scale-95 ${
                                    isDistributed 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 shadow-inner' 
                                    : `${item.colorClass} shadow-sm hover:brightness-95`
                                }`}
                            >
                                {isDistributed && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 rounded-lg">
                                        <Check size={20} className="text-slate-500 drop-shadow-sm" strokeWidth={3}/>
                                    </div>
                                )}
                                <span className={`text-[10px] font-bold ${isDistributed ? 'opacity-50' : ''}`}>{item.label}</span>
                                <span className={`text-base font-black leading-none mt-0.5 ${isDistributed ? 'opacity-30' : ''}`}>{item.val}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 하단 정보: 기타 항목 + 메모 (메모박스 최소화) */}
                <div className="flex justify-between items-start pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2 items-center h-full pt-1">
                        {extras.map((ex, idx) => (
                            <div key={idx} className="flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                <ex.icon size={11} className="mr-1.5 opacity-50"/>
                                {ex.label}: <b className="ml-1">{ex.val}</b>
                            </div>
                        ))}
                    </div>
                    
                    {/* 메모 입력창 (높이 축소) */}
                    <div className="relative ml-2 flex-shrink-0">
                        <textarea
                            placeholder="메모"
                            value={memo}
                            onChange={(e) => onUpdateMemo(e.target.value)}
                            className="w-32 h-[28px] text-[11px] px-2 py-1 bg-yellow-50/50 border border-yellow-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-yellow-300 focus:bg-yellow-50 placeholder-yellow-300 text-slate-600 leading-tight"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
