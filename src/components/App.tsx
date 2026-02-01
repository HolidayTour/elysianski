import React, { useState, useEffect, useMemo } from 'react';
import { Check, Users, RefreshCw, AlertCircle, Phone, MessageCircle, Bus, Snowflake, ArrowUpRight, Mountain, ClipboardList, Mail, MapPin, Shirt, ChevronLeft, Calendar, ExternalLink } from 'lucide-react';

// *** 구글 시트 CSV 주소 ***
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQxi-VFW9RLmKHtGDqcmUIyZcbLhMFuXrClqF1xL3QdTz945zC5TNrEuYQFOqNjgfTU1KoFttAZeHe/pub?output=csv";

// --- 데이터 컬럼 매핑 (업데이트된 시트 구조 반영) ---
// A:팀, B:가이드, C:버스정보, D:순번, E:행사명...
const COLS = {
  TEAM: 0,       // A: 팀구분
  GUIDE: 1,      // B: 가이드 이름
  BUS_INFO: 2,   // C: 버스 정보 (New Location)
  CODE: 3,       // D: 순번 (Moved)
  EVENT: 4,      // E: 행사명
  RES_NO: 5,     // F: 예약번호
  NAME: 6,       // G: 예약자명
  CONTACT: 7,    // H: 연락처
  APP_ID: 8,     // I: 앱ID
  EMAIL: 9,      // J: 이메일
  LANG: 10,      // K: 언어
  PAX: 11,       // L: 인원
  PICKUP: 12,    // M: 픽업
  SHUTTLE: 13,   // N: 셔틀
  SLED: 14,      // O: 눈썰매
  SIGHTSEEING: 15, // P: 관광L
  MOVING: 16,    // Q: 무빙
  LIFT: 17,      // R: 리프트
  EQUIP: 18,     // S: 장비
  LESSON: 19,    // T: 강습
  CLOTH_E: 20,   // U: 의류(ELY)
  CLOTH_S: 21,   // V: 의류(스키장)
  NOTE: 22       // W: 비고 (Note)
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
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '').trim();
  if (!str) return 0;
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 0 : parsed;
};

// --- 컴포넌트: 전화번호 링크 ---
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
                className="text-blue-600 underline hover:text-blue-800"
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

// --- 컴포넌트: 메신저 링크 ---
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

    if (link) {
        return (
            <a href={link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="flex items-center px-2 py-1.5 bg-yellow-50 text-yellow-800 rounded-md text-xs font-bold border border-yellow-100 hover:bg-yellow-100 transition-colors">
                <MessageCircle size={12} className="mr-1.5"/> 
                <span className="truncate max-w-[100px]">{text}</span>
                <ExternalLink size={10} className="ml-1 opacity-50"/>
            </a>
        );
    }
    return (
        <div className="flex items-center px-2 py-1.5 bg-yellow-50 text-yellow-700 rounded-md text-xs font-bold border border-yellow-100">
            <MessageCircle size={12} className="mr-1.5"/> {text}
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
  
  const [appState, setAppState] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('guide_pro_state_v10');
    if (saved) setAppState(JSON.parse(saved));
    loadData();
  }, []);

  const saveState = (newState) => {
    setAppState(newState);
    localStorage.setItem('guide_pro_state_v10', JSON.stringify(newState));
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error("데이터 로딩 실패");
      const text = await response.text();
      const parsed = parseCSV(text);
      
      // 1. 날짜 및 헤더 정보 파싱 (1행)
      if (parsed.length > 0) {
          const row1 = parsed[0];
          // B열에 날짜가 있다고 가정 (텍스트에 '가이드'가 없어야 함)
          if (row1[1] && !row1[1].includes('가이드') && !row1[1].includes('Guide')) {
             setTourDate({ date: row1[1], type: '' });
          } else {
             setTourDate({ date: '날짜 정보 없음', type: '' });
          }
      }

      // 2. 데이터 필터링
      const dataRows = parsed.filter(row => {
        const teamCol = row[0] ? row[0].trim() : '';
        if (!teamCol) return false;
        // 헤더 텍스트가 포함된 행 제외
        const headers = ['팀구분', 'TEAM', 'Team', '구분', 'Guide', '가이드', 'Code', '순번'];
        if (headers.some(h => teamCol.toUpperCase().includes(h.toUpperCase()))) return false;
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
            busInfo: row[COLS.BUS_INFO], // C열에서 가져옴
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
      setError("데이터를 불러올 수 없습니다. 링크를 확인해주세요.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const availableTeams = useMemo(() => {
    const teams = [...new Set(rawData.map(d => d.team).filter(Boolean))];
    return teams.sort();
  }, [rawData]);

  // 팀 상세 데이터 계산 (버스 정보 포함)
  const teamDetailData = useMemo(() => {
    const filtered = rawData.filter(d => d.team === selectedTeam);
    const guides = [...new Set(filtered.map(d => d.guide).filter(Boolean))];
    
    // 버스 정보: C열에 입력된 값 중 유효한 것 찾기 (팀원 중 한 명이라도 있으면 됨)
    const validBusInfo = filtered.find(d => d.busInfo && d.busInfo.length > 3)?.busInfo || '정보 없음';
    
    const totalRows = filtered.length;
    const boardedRows = filtered.filter(item => appState[item.id]?.boarded).length;
    const progress = totalRows > 0 ? Math.round((boardedRows / totalRows) * 100) : 0;

    const stats = filtered.reduce((acc, curr) => {
      acc.total += curr.pax;
      const place = curr.pickup || '기타';
      acc.pickups[place] = (acc.pickups[place] || 0) + curr.pax;

      acc.shuttle += curr.items.shuttle;
      acc.sled += curr.items.sled;
      acc.sightseeing += curr.items.sightseeing;
      acc.moving += curr.items.moving;
      acc.lift += curr.items.lift;
      acc.equip += curr.items.equip;
      acc.lesson += curr.items.lesson;
      acc.clothE += curr.items.clothE;
      acc.clothS += curr.items.clothS;
      return acc;
    }, {
      total: 0, 
      pickups: {},
      shuttle: 0, sled: 0, sightseeing: 0, moving: 0, lift: 0, 
      equip: 0, lesson: 0, clothE: 0, clothS: 0
    });

    return { list: filtered, guides: guides.join(', '), busInfo: validBusInfo, progress, stats };
  }, [rawData, selectedTeam, appState]);

  // 전체 팀 요약 (메인화면)
  const allTeamsSummary = useMemo(() => {
    return availableTeams.map(team => {
      const teamList = rawData.filter(d => d.team === team);
      const totalPax = teamList.reduce((acc, curr) => acc + curr.pax, 0);
      const guides = [...new Set(teamList.map(d => d.guide).filter(Boolean))].join(', ');
      const validBusInfo = teamList.find(d => d.busInfo && d.busInfo.length > 3)?.busInfo || '정보 없음';
      
      const pickupStats = teamList.reduce((acc, curr) => {
        const place = curr.pickup || '기타';
        acc[place] = (acc[place] || 0) + curr.pax;
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

  const getThemeColor = (team) => {
      const t = team.replace('팀', '').trim();
      if(t === 'A') return 'blue';
      if(t === 'B') return 'emerald';
      if(t === 'C') return 'violet';
      return 'gray';
  };

  if (loading && rawData.length === 0) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">데이터 로딩 중...</p>
        </div>
    );
  }

  // --- 1. 메인 리스트 뷰 ---
  if (currentView === 'list') {
      return (
          <div className="min-h-screen bg-gray-50 p-4 pb-20">
              <header className="mb-6 pt-2">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">엘리시안 스키투어</h1>
                        <div className="flex items-center text-gray-600 font-bold text-lg">
                            <Calendar size={20} className="mr-2 text-blue-600"/>
                            <span>{tourDate.date}</span>
                        </div>
                    </div>
                    <button onClick={loadData} className="p-3 bg-white rounded-full shadow-sm active:scale-95 text-gray-500 border border-gray-200">
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
                            className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden transition-all ${isEmpty ? 'opacity-60' : 'active:scale-[0.98] cursor-pointer hover:shadow-md'}`}
                          >
                              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-${theme}-50 opacity-50`}></div>
                              <div className="relative z-10">
                                  <div className="flex justify-between items-center mb-4">
                                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${theme}-100 text-${theme}-600 font-black text-xl`}>
                                          {teamData.team}
                                      </div>
                                      <div className="flex-1 ml-4">
                                          <div className="flex justify-between items-end mb-1">
                                              <span className="text-xs text-gray-400 font-bold">탑승률</span>
                                              <span className={`text-2xl font-black text-${theme}-600`}>{teamData.progress}%</span>
                                          </div>
                                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                              <div className={`h-full bg-${theme}-500 rounded-full transition-all duration-500`} style={{ width: `${teamData.progress}%` }}></div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="mb-3">
                                      <div className="text-lg font-bold text-gray-900 truncate">
                                          {teamData.guides || '가이드 배정중'}
                                      </div>
                                  </div>
                                  <div className="mb-4 bg-gray-50 rounded-lg p-2.5 flex items-start">
                                      <Bus size={16} className="text-gray-400 mt-0.5 mr-2 flex-shrink-0"/>
                                      <PhoneLinkedText 
                                        text={teamData.busInfo} 
                                        className="text-sm font-bold text-gray-700 break-keep leading-snug" 
                                      />
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 border-t border-gray-100 pt-3">
                                      <div className="text-center border-r border-gray-100">
                                          <span className="block text-[10px] text-gray-400 mb-0.5">총원</span>
                                          <span className={`block text-lg font-black text-${theme}-600`}>{teamData.totalPax}</span>
                                      </div>
                                      {Object.entries(teamData.pickupStats).slice(0, 3).map(([place, count]) => (
                                          <div key={place} className="text-center">
                                              <span className="block text-[10px] text-gray-400 mb-0.5 truncate px-1">{place}</span>
                                              <span className="block text-base font-bold text-gray-700">{count}</span>
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
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-12">
      
      {/* 2-1. 헤더 (고정 X) */}
      <header className="bg-white shadow-sm border-b border-gray-200 z-30">
        <div className="max-w-xl mx-auto">
            
            {/* Nav Bar & Info */}
            <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100 bg-white">
                <div className="flex items-center flex-1 min-w-0">
                    <button 
                        onClick={() => setCurrentView('list')}
                        className="mr-3 p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors flex-shrink-0"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 truncate">
                             <h1 className={`text-3xl font-black text-${theme}-600 tracking-tight`}>
                                {selectedTeam}팀
                            </h1>
                             <span className="text-lg font-bold text-gray-900 truncate">
                                {teamDetailData.guides || '미정'}
                             </span>
                        </div>
                        {/* 버스 정보 (가이드 이름 아래) */}
                        <div className="mt-1 flex items-start text-gray-600">
                            <Bus size={14} className="mr-1.5 mt-0.5 flex-shrink-0" />
                            <PhoneLinkedText 
                                text={teamDetailData.busInfo} 
                                className="text-sm font-bold leading-tight" 
                            />
                        </div>
                    </div>
                </div>
                
                <div className="text-right flex flex-col items-end flex-shrink-0 ml-2">
                     <button onClick={loadData} className="p-2 mb-1 bg-gray-50 rounded-full hover:bg-gray-100 active:scale-95 text-gray-500">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
                     </button>
                </div>
            </div>

            {/* 옵션 수량 요약 (스크롤 가능) */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
                    <SummaryPill label="셔틀" count={teamDetailData.stats.shuttle} color="gray" />
                    <SummaryPill label="눈썰매" count={teamDetailData.stats.sled} color="sky" />
                    <SummaryPill label="관광L" count={teamDetailData.stats.sightseeing} color="green" />
                    <SummaryPill label="무빙" count={teamDetailData.stats.moving} color="orange" />
                    <SummaryPill label="리프트" count={teamDetailData.stats.lift} color="red" />
                    <SummaryPill label="장비" count={teamDetailData.stats.equip} color="slate" />
                    <SummaryPill label="의류(E)" count={teamDetailData.stats.clothE} color="violet" />
                    <SummaryPill label="의류(S)" count={teamDetailData.stats.clothS} color="indigo" />
                </div>
            </div>
        </div>
      </header>

      {/* 2-2. 고정 컨트롤 영역 (Sticky Controls) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3">
            {/* 픽업 장소 필터 (박스 스타일) */}
            <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm mb-3">
                <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
                    {sortedLocations.map(loc => (
                        <button
                            key={loc}
                            onClick={() => setLocationFilter(loc)}
                            className={`flex-1 min-w-[60px] whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                locationFilter === loc
                                ? `bg-${theme}-600 text-white shadow-md`
                                : 'bg-transparent text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {loc}
                        </button>
                    ))}
                </div>
            </div>

            {/* 탑승률 그래프 */}
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">현재 탑승률</span>
                <span className={`text-sm font-black text-${theme}-600`}>{teamDetailData.progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full bg-${theme}-500 rounded-full transition-all duration-500 ease-out`} 
                    style={{ width: `${teamDetailData.progress}%` }}
                ></div>
            </div>
        </div>
      </div>

      {/* 2-3. 리스트 영역 */}
      <main className="flex-1 max-w-xl mx-auto w-full px-3 pt-4 pb-8 space-y-3">
        {error ? (
             <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center text-sm">
                <AlertCircle className="mx-auto mb-2" />
                {error}
                <button onClick={loadData} className="block mx-auto mt-2 text-xs underline">재시도</button>
             </div>
        ) : currentList.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
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
                    theme={theme}
                />
            ))
        )}
      </main>
    </div>
  );
}

// --- 하위 컴포넌트 ---

function SummaryPill({ label, count, color }) {
    if (count === 0) return null;
    const colorClasses = {
        gray: 'bg-gray-100 text-gray-700 border-gray-200',
        sky: 'bg-sky-100 text-sky-700 border-sky-200',
        green: 'bg-green-100 text-green-700 border-green-200',
        orange: 'bg-orange-100 text-orange-700 border-orange-200',
        red: 'bg-red-100 text-red-700 border-red-200',
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
        violet: 'bg-violet-100 text-violet-700 border-violet-200',
        indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    return (
        <div className={`flex flex-col items-center justify-center min-w-[50px] px-2 py-1.5 rounded-lg border bg-white ${colorClasses[color] || colorClasses.gray}`}>
            <span className="text-[9px] font-bold opacity-70 mb-0.5 whitespace-nowrap">{label}</span>
            <span className="text-sm font-black leading-none">{count}</span>
        </div>
    );
}

function DetailCard({ data, state, onToggleBoarding, onToggleDist, theme }) {
    const isBoarded = state.boarded;
    const dist = state.distributed || {};

    // *** 핵심 체크 항목 4가지 (리프트 -> 무빙 -> 눈썰매 -> 관광L) ***
    const items = [
        { key: 'lift', label: '리프트', val: data.items.lift, colorClass: 'bg-red-50 text-red-700 border-red-100' },
        { key: 'moving', label: '무빙', val: data.items.moving, colorClass: 'bg-orange-50 text-orange-700 border-orange-100' },
        { key: 'sled', label: '눈썰매', val: data.items.sled, colorClass: 'bg-sky-50 text-sky-700 border-sky-100' },
        { key: 'sightseeing', label: '관광L', val: data.items.sightseeing, colorClass: 'bg-green-50 text-green-700 border-green-100' },
    ];

    // 그 외 항목 (하단 텍스트 표시)
    const extras = [
        { label: '장비', val: data.items.equip, icon: Snowflake },
        { label: '강습', val: data.items.lesson, icon: Users },
        { label: '의류(E)', val: data.items.clothE, icon: Shirt },
        { label: '의류(S)', val: data.items.clothS, icon: Shirt },
    ].filter(i => i.val > 0);

    return (
        <div className={`rounded-xl border shadow-sm bg-white overflow-hidden transition-all duration-300 ${
            isBoarded ? 'ring-1 ring-blue-500 border-blue-500' : 'border-gray-200'
        }`}>
            {/* 카드 헤더: 순번, 이름, 탑승버튼 */}
            <div className="flex items-center justify-between p-3 border-b border-gray-50 bg-white">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0">
                        <span className="text-sm font-black text-gray-800">{data.code}</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 truncate text-lg leading-tight">{data.name}</h3>
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                             <span className="font-bold text-gray-700 mr-2">{data.pax}명</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onToggleBoarding}
                    className={`flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex-shrink-0 ml-2 shadow-sm ${
                        isBoarded
                        ? `bg-${theme}-600 text-white border border-${theme}-600`
                        : `bg-white text-gray-400 border border-gray-300 hover:border-gray-400`
                    }`}
                >
                    <Check size={14} className={`mr-1.5 ${isBoarded ? 'text-white' : 'text-gray-300'}`} strokeWidth={3}/>
                    {isBoarded ? '탑승완료' : '탑승확인'}
                </button>
            </div>

            <div className="p-3 bg-white">
                {/* 연락처 및 앱 아이디 */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    {data.contact && (
                        <a href={`tel:${data.contact}`} className="flex items-center px-2 py-1.5 bg-green-50 text-green-700 rounded-md text-xs font-bold border border-green-100 hover:bg-green-100 transition-colors">
                            <Phone size={12} className="mr-1.5"/> 전화
                        </a>
                    )}
                    {data.appId && <MessengerLink text={data.appId} />}
                    {data.email && (
                        <a href={`mailto:${data.email}`} className="flex items-center px-2 py-1.5 bg-gray-50 text-gray-600 rounded-md text-xs font-bold border border-gray-200 hover:bg-gray-100 transition-colors">
                            <Mail size={12} className="mr-1.5"/> 메일
                        </a>
                    )}
                </div>
                
                {/* 픽업 장소 */}
                <div className="flex items-center mb-3">
                     <div className="flex items-center bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">
                        <MapPin size={12} className="mr-1 text-gray-500"/>
                        {data.pickup || '미정'}
                     </div>
                     <span className="text-[10px] text-gray-300 ml-auto font-mono">{data.resNo}</span>
                </div>

                {/* 비고 및 메모 */}
                {data.note && (
                    <div className="mb-3 p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-start text-red-600 text-sm animate-pulse-slow">
                        <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0"/>
                        <span className="font-bold leading-snug">{data.note}</span>
                    </div>
                )}

                {/* 체크 버튼 그리드 (4개) */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {items.map((item) => {
                        const isDistributed = dist[item.key];
                        const hasValue = item.val > 0;
                        
                        if (!hasValue) {
                            return (
                                <div key={item.key} className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 border border-gray-100 opacity-20 grayscale">
                                    <span className="text-[9px] text-gray-400">{item.label}</span>
                                    <span className="text-xs font-bold text-gray-300">-</span>
                                </div>
                            );
                        }

                        return (
                            <button
                                key={item.key}
                                onClick={() => onToggleDist(data.id, item.key)}
                                className={`relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all active:scale-95 ${
                                    isDistributed 
                                    ? 'bg-gray-800 border-gray-800 text-white shadow-inner' 
                                    : `${item.colorClass} hover:brightness-95 shadow-sm`
                                }`}
                            >
                                {isDistributed && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                                        <Check size={16} className="text-white drop-shadow-md" strokeWidth={4}/>
                                    </div>
                                )}
                                <span className={`text-[9px] font-bold ${isDistributed ? 'text-gray-300' : ''}`}>{item.label}</span>
                                <span className={`text-base font-black leading-none mt-0.5 ${isDistributed ? 'opacity-20' : ''}`}>{item.val}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 기타 정보 (장비, 의류 등) */}
                {extras.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        {extras.map((ex, idx) => (
                            <div key={idx} className="flex items-center text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                <ex.icon size={12} className="mr-1.5 opacity-50"/>
                                {ex.label}: <b className="ml-1">{ex.val}</b>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
