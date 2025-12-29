import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Radar, Doughnut } from 'react-chartjs-2';
import { 
  BookOpen, Calculator, Languages, FlaskConical, Star, Trophy, 
  Save, MessageSquare, CheckCircle, Share2, Settings, 
  Printer, X, Info, BarChart3, ChevronDown, Download, AlertCircle, Layout, Crown, PartyPopper, CheckCircle2, Gift, Dices, RotateCw, Edit3, PieChart, Clock
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler);

// 아이콘 매핑 도우미
const IconRenderer = ({ iconName, className, size }) => {
  const icons = {
    Calculator: <Calculator className={className} size={size} />,
    Languages: <Languages className={className} size={size} />,
    BookOpen: <BookOpen className={className} size={size} />,
    FlaskConical: <FlaskConical className={className} size={size} />
  };
  return icons[iconName] || <BookOpen className={className} size={size} />;
};

// ==========================================
// ⚙️ 규림이의 기본 학습 템플릿 (수학, 영어 우선 배치)
// ==========================================
const DEFAULT_STRUCTURE = [
  {
    id: "cat_math",
    label: "수학",
    color: "#3b82f6",
    icon: "Calculator",
    items: [
      { id: "m1", name: "개념원리 3-1 (매일 90분)", total: 63 }, 
      { id: "m2", name: "쎈 수학 1-2 (매일 60분)", total: 42 },
      { id: "m3", name: "쎈 중학 연산 (매일 10분)", total: 7 },
      { id: "m4", name: "이번 주 복습+보충 (토,일 100분)", total: 20 }
    ]
  },
  {
    id: "cat_english",
    label: "영어",
    color: "#22c55e",
    icon: "Languages",
    items: [
      { id: "e1", name: "잠수네 영어책읽기 (매일 40분)", total: 28 },
      { id: "e2", name: "잠수네 집중듣기 (매일 40분)", total: 28 },
      { id: "e3", name: "잠수네 흘려듣기 (매일 20분)", total: 14 },
      { id: "e4", name: "그래머홀릭 (월-금 30분)", total: 15 },
      { id: "e5", name: "천일문 (월,수,금,일 30분)", total: 12 },
      { id: "e6", name: "워드마스터 (화,목,금 30분)", total: 9 },
      { id: "e7", name: "화상영어 (월,화 30분)", total: 6 }
    ]
  },
  {
    id: "cat_korean",
    label: "국어",
    color: "#a855f7",
    icon: "BookOpen",
    items: [
      { id: "k1", name: "빠작 첫문법 (매일 30분)", total: 21 },
      { id: "k2", name: "한글책 읽기 (평일 30분, 주말 90분)", total: 33 },
      { id: "k3", name: "빠작 비문학 (월,수 30분)", total: 6 },
      { id: "k4", name: "빠작 한자 어휘 (화,목 30분)", total: 6 }
    ]
  },
  {
    id: "cat_general",
    label: "사회/과학",
    color: "#f97316",
    icon: "FlaskConical",
    items: [
      { id: "s1", name: "중등 과학 (월,수 30분)", total: 6 },
      { id: "s2", name: "중등 사회 독서 (화,목 30분)", total: 6 }
    ]
  }
];

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
};

const START_DATE = new Date('2025-12-29');
const generateWeeks = () => {
  const weeks = [];
  let runner = new Date(START_DATE);
  for (let i = 1; i <= 12; i++) {
    const monday = new Date(runner);
    const sunday = new Date(runner);
    sunday.setDate(runner.getDate() + 6);
    weeks.push({ id: `W${i}`, label: `${formatDate(monday)} ~ ${formatDate(sunday)}` });
    runner.setDate(runner.getDate() + 7);
  }
  return weeks;
};

// Firebase 초기화
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'gyurim-growth-weekly-v9';

export default function App() {
  const [user, setUser] = useState(null);
  const [allWeeksData, setAllWeeksData] = useState({});
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editStructure, setEditStructure] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningReward, setWinningReward] = useState(null);
  
  const weeksList = useMemo(() => generateWeeks(), []);
  const [activeWeek, setActiveWeek] = useState(weeksList[0]?.id || "W1");

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const progressColRef = collection(db, 'artifacts', appId, 'public', 'data', 'weeklyProgress');
    const unsubProgress = onSnapshot(progressColRef, (snapshot) => {
      const dataMap = {};
      snapshot.forEach(doc => { dataMap[doc.id] = doc.data(); });
      setAllWeeksData(dataMap);
    });
    return () => unsubProgress();
  }, [user]);

  const currentWeekData = useMemo(() => {
    return allWeeksData[activeWeek] || { 
      progress: {}, 
      structure: DEFAULT_STRUCTURE,
      rewards: ["치킨 먹기", "게임 1시간", "좋아하는 책 사기"] 
    };
  }, [allWeeksData, activeWeek]);

  const activeStructure = currentWeekData.structure || DEFAULT_STRUCTURE;
  const currentRewards = useMemo(() => (currentWeekData.rewards || ["보상 1", "보상 2", "보상 3"]).slice(0, 3), [currentWeekData.rewards]);

  useEffect(() => {
    if (showSettings) setEditStructure(JSON.parse(JSON.stringify(activeStructure)));
  }, [showSettings, activeStructure]);

  const getWeekStats = (weekId) => {
    const data = allWeeksData[weekId] || { progress: {}, structure: DEFAULT_STRUCTURE };
    const struct = data.structure || DEFAULT_STRUCTURE;
    let filled = 0, total = 0;
    struct.forEach(cat => {
      cat.items.forEach(item => {
        filled += (data.progress?.[item.id] || 0);
        total += item.total;
      });
    });
    return { percent: total > 0 ? Math.round((filled / total) * 100) : 0, minutes: filled * 10 };
  };

  const currentStats = useMemo(() => getWeekStats(activeWeek), [activeWeek, allWeeksData]);

  const categoryStats = useMemo(() => {
    return activeStructure.map(cat => {
      let filled = 0, total = 0;
      cat.items.forEach(item => {
        filled += (currentWeekData.progress?.[item.id] || 0);
        total += item.total;
      });
      return { id: cat.id, label: cat.label, color: cat.color, percent: total > 0 ? Math.round((filled / total) * 100) : 0, minutes: filled * 10 };
    });
  }, [activeStructure, currentWeekData]);

  const handleToggleBlock = async (itemId, index) => {
    if (!user || isPrintMode) return;
    const progressMap = { ...(currentWeekData.progress || {}) };
    const currentVal = progressMap[itemId] || 0;
    const newVal = (index + 1 === currentVal) ? index : index + 1;
    progressMap[itemId] = newVal;
    const weekDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'weeklyProgress', activeWeek);
    await setDoc(weekDocRef, { ...currentWeekData, progress: progressMap }, { merge: true });
  };

  const handleRewardChange = async (index, value) => {
    const newRewards = [...currentRewards];
    newRewards[index] = value;
    const weekDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'weeklyProgress', activeWeek);
    await setDoc(weekDocRef, { ...currentWeekData, rewards: newRewards }, { merge: true });
  };

  const spinReward = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinningReward(null);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * currentRewards.length);
      setWinningReward(currentRewards[randomIndex]);
      setIsSpinning(false);
    }, 2000);
  };

  const saveWeeklySettings = async () => {
    if (!user) return;
    const weekDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'weeklyProgress', activeWeek);
    await setDoc(weekDocRef, { ...currentWeekData, structure: editStructure }, { merge: true });
    setShowSettings(false);
  };

  const radarData = {
    labels: categoryStats.map(c => c.label),
    datasets: [{
      label: '성취도(%)',
      data: categoryStats.map(c => c.percent),
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3b82f6',
      pointBackgroundColor: '#3b82f6',
    }]
  };

  const doughnutData = {
    labels: categoryStats.map(c => c.label),
    datasets: [{
      data: categoryStats.map(c => c.minutes),
      backgroundColor: categoryStats.map(c => c.color),
      hoverOffset: 10,
      borderWidth: 0
    }]
  };

  const isAllCompleted = categoryStats.every(c => c.percent === 100);
  const completedCategories = categoryStats.filter(c => c.percent === 100);

  return (
    <div className={`min-h-screen ${isPrintMode ? 'bg-white' : 'bg-[#fcfcfc] p-4 md:p-8'} font-sans text-slate-900`}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; margin: 0 !important; }
          .card { border: 2px solid #eee !important; break-inside: avoid; border-radius: 15px !important; margin-bottom: 20px !important; padding: 20px !important; }
          body { background: white !important; }
          .block-container { gap: 4px !important; }
          .block-item { width: 32px !important; height: 40px !important; border: 1.5px solid #eee !important; font-size: 11px !important; }
          .quad-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 15px !important; }
        }
        @keyframes stamp-bounce {
          0% { transform: scale(3); opacity: 0; }
          70% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .stamp-animation { animation: stamp-bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes roulette-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-anim { animation: roulette-spin 0.2s linear infinite; }
      `}</style>

      <div className="max-w-[1400px] mx-auto space-y-8">
        <header className={`${isPrintMode ? 'border-b-4 border-slate-900 pb-6 mb-8' : 'bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100'} flex flex-col items-center gap-6`}>
          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
            <div className="flex items-center gap-3">
              <Star className="text-yellow-400 fill-yellow-400" size={28} />
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight whitespace-nowrap">규림이의 성장 게이지</h1>
            </div>
            <div className="flex gap-3 no-print">
              <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-50 border border-slate-200 text-slate-400 rounded-2xl hover:text-blue-600 transition-all shadow-sm"><Settings size={22} /></button>
              <button onClick={() => { setIsPrintMode(true); setTimeout(() => { window.print(); setIsPrintMode(false); }, 500); }} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-sm"><Printer size={18} /> A4 출력</button>
            </div>
          </div>

          <div className="w-full flex flex-col xl:flex-row items-center justify-between gap-8 bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 shadow-inner">
            <div className="flex flex-col items-center xl:items-start gap-3 flex-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">주차 선택 및 날짜 범위</span>
              <div className="relative w-full max-w-lg">
                <select value={activeWeek} onChange={(e) => setActiveWeek(e.target.value)} className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 pr-12 font-black text-blue-600 appearance-none focus:ring-4 focus:ring-blue-500/20 shadow-md text-xl cursor-pointer">
                  {weeksList.map(w => {
                    const stats = getWeekStats(w.id);
                    return <option key={w.id} value={w.id}>{w.label} ({stats.percent}%)</option>;
                  })}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={24} />
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 flex-1">
              <div className="text-center group">
                <div className="flex items-center justify-center gap-2 mb-1"><Trophy className="text-amber-500" size={16} /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">주간 성취도</span></div>
                <div className="text-5xl font-black text-slate-900 tracking-tighter group-hover:scale-105 transition-transform">{currentStats.percent}<span className="text-2xl text-blue-600 ml-1">%</span></div>
              </div>
              <div className="w-px h-12 bg-slate-200 hidden md:block" />
              <div className="text-center group">
                <div className="flex items-center justify-center gap-2 mb-1"><Clock className="text-indigo-500" size={16} /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">총 학습 시간</span></div>
                <div className="text-5xl font-black text-slate-900 tracking-tighter group-hover:scale-105 transition-transform">{Math.floor(currentStats.minutes / 60)}<span className="text-2xl text-indigo-600 ml-1">h</span> {currentStats.minutes % 60}<span className="text-2xl text-indigo-600 ml-1">m</span></div>
              </div>
            </div>
          </div>
        </header>

        {completedCategories.length > 0 && !isPrintMode && (
          <section className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border-2 border-amber-400/50 no-print animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center justify-between gap-6 px-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-400 rounded-2xl"><Crown size={32} className="text-slate-900" /></div>
                <div><h2 className="text-xl font-black text-amber-400 mb-0.5 italic">Hall of Fame</h2><p className="text-white text-sm font-bold opacity-80">규림아, 네 노력이 결실을 맺었어! 정말 자랑스러워 ✨</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {completedCategories.map(cat => (
                  <div key={cat.id} className="px-5 py-2 bg-slate-800 border border-amber-400/30 rounded-xl flex items-center gap-2"><PartyPopper size={18} className="text-amber-400" /><span className="text-base font-black text-amber-400">{cat.label} 100% 완강!</span></div>
                ))}
              </div>
            </div>
          </section>
        )}

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8 quad-grid print-full">
          {activeStructure.map((cat) => (
            <section key={cat.id} className="card bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col hover:border-slate-200 transition-all">
              <div className="flex items-center justify-between mb-8 border-b-2 border-slate-50 pb-6">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl text-white shadow-lg" style={{ backgroundColor: cat.color }}><IconRenderer iconName={cat.icon} size={28} /></div>
                  <h2 className="text-3xl font-black text-slate-800">{cat.label}</h2>
                </div>
                <div className="text-right"><span className="text-sm font-black" style={{ color: cat.color }}>{categoryStats.find(s => s.id === cat.id)?.percent}% 완료</span></div>
              </div>
              <div className="space-y-10 flex-1">
                {cat.items.map(item => {
                  const filled = currentWeekData.progress?.[item.id] || 0;
                  const isCompleted = filled >= item.total && item.total > 0;
                  return (
                    <div key={item.id} className="group">
                      <div className="flex justify-between items-center mb-4 px-1">
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-black transition-all ${isCompleted ? 'text-blue-600' : 'text-slate-700'}`}>{item.name}</span>
                          {isCompleted && (
                            <div className="stamp-animation bg-blue-100 text-blue-600 px-3 py-1 rounded-xl flex items-center gap-1 border border-blue-200 shadow-sm"><CheckCircle2 size={14} className="fill-blue-600 text-white" /><span className="text-[10px] font-black uppercase">Complete</span></div>
                          )}
                        </div>
                        <span className="text-xs font-black font-mono text-slate-300">{filled * 10} / {item.total * 10}m</span>
                      </div>
                      <div className="flex flex-wrap gap-2 block-container">
                        {Array.from({ length: item.total }).map((_, i) => (
                          <button key={i} onClick={() => handleToggleBlock(item.id, i)} className={`block-item w-8 h-10 rounded-lg transition-all flex flex-col items-center justify-center border-2 ${i < filled ? 'border-transparent shadow-sm scale-105 brightness-110' : 'bg-slate-50 border-slate-100 text-slate-200'}`} style={{ backgroundColor: i < filled ? cat.color : undefined }}>
                            <span className={`text-[11px] font-black mb-0.5 ${i < filled ? 'text-white/60' : 'text-slate-300'}`}>{i + 1}</span>
                            {i < filled && <CheckCircle size={12} className="text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </main>

        {!isPrintMode && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print pt-8">
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3"><BarChart3 size={20} className="text-blue-500" /> 영역별 성취 게이지</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                {categoryStats.map(stat => (
                  <div key={stat.id} className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-black"><span className="text-slate-700">{stat.label}</span><span style={{ color: stat.color }}>{stat.percent}%</span></div>
                    <div className="w-full h-5 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100"><div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${stat.percent}%`, backgroundColor: stat.color }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3"><Trophy size={18} className="text-blue-500" /> 주간 학습 균형</h3>
              <div className="h-72 flex items-center justify-center">
                <Radar data={radarData} options={{ scales: { r: { min: 0, max: 100, ticks: { display: false }, pointLabels: { font: { size: 18, weight: '900' }, color: '#475569' }, grid: { color: '#f1f5f9' }, angleLines: { color: '#f1f5f9' } } }, plugins: { legend: { display: false } } }} />
              </div>
            </div>
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3"><PieChart size={18} className="text-blue-500" /> 과목별 시간 비중</h3>
              <div className="h-72 flex items-center justify-center">
                <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom', labels: { font: { size: 14, weight: 'bold' }, padding: 20 } } }, cutout: '60%' }} />
              </div>
            </div>
          </div>
        )}

        {!isPrintMode && (
          <div className="pt-8 no-print">
            {isAllCompleted ? (
              <section className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[3rem] p-10 shadow-2xl text-white border-4 border-white/20 animate-in zoom-in duration-700">
                <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
                  <div className="mb-6"><div className="p-4 bg-white/20 rounded-full mb-4 animate-bounce inline-block"><Gift size={56} className="text-yellow-300" /></div><h2 className="text-5xl font-black mb-2 tracking-tight italic">Ultimate Weekly Reward!</h2><p className="text-blue-100 text-xl font-bold">규림아, 모든 목표를 달성했어! 이제 보상을 뽑을 자격이 생겼어! 🎰</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full items-center">
                    <div className="space-y-4 text-left">
                      <h3 className="text-sm font-black uppercase tracking-widest text-blue-200 mb-4 flex items-center gap-2"><Edit3 size={16} /> 보상 후보 3가지 적기</h3>
                      {currentRewards.map((reward, idx) => (
                        <div key={idx} className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black">{idx + 1}</span><input type="text" value={reward} onChange={(e) => handleRewardChange(idx, e.target.value)} placeholder={`보상 ${idx + 1}`} className="flex-1 bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-yellow-400 outline-none placeholder:text-white/30" /></div>
                      ))}
                    </div>
                    <div className="flex flex-col items-center justify-center p-10 bg-white/5 rounded-[3rem] border border-white/10 relative">
                      <div className={`mb-10 p-8 rounded-full bg-white/10 border-4 border-white/20 ${isSpinning ? 'spin-anim' : ''}`}><Dices size={80} className="text-yellow-300" /></div>
                      <button onClick={spinReward} disabled={isSpinning} className="flex items-center gap-4 px-12 py-6 bg-yellow-400 text-slate-900 rounded-3xl font-black text-2xl shadow-xl hover:bg-white transition-all active:scale-95 disabled:opacity-50"><RotateCw size={28} className={isSpinning ? 'animate-spin' : ''} />{isSpinning ? "추첨 중..." : "보상 룰렛 돌리기!"}</button>
                      {winningReward && !isSpinning && (
                        <div className="mt-10 animate-in zoom-in-50 duration-500 text-center"><p className="text-yellow-300 text-sm font-black uppercase tracking-widest mb-3">축하해! 당첨 결과는? 🎊</p><div className="bg-white text-slate-900 px-10 py-5 rounded-2xl shadow-2xl scale-110"><span className="text-3xl font-black tracking-tight">"{winningReward}"</span></div></div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <div className="bg-slate-100 rounded-[3rem] p-12 border-2 border-dashed border-slate-200 text-center"><Info size={40} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-bold text-lg">모든 영역(4과목)을 100% 달성하면<br/><span className="text-indigo-500 font-black text-2xl tracking-tight">🎁 시크릿 보상 룰렛</span>이 잠금 해제됩니다!</p></div>
            )}
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[4rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div><h2 className="text-3xl font-black text-slate-800 tracking-tight">학습 목표 편집</h2><p className="text-base text-blue-600 font-black mt-2 uppercase tracking-wider">Target: {weeksList.find(w=>w.id===activeWeek)?.label}</p></div>
                <button onClick={() => setShowSettings(false)} className="p-5 hover:bg-white rounded-3xl transition-all shadow-sm"><X size={32} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-10">
                {editStructure.map((cat, catIdx) => (
                  <div key={cat.id} className="space-y-6 p-10 border-4 border-slate-50 rounded-[3rem] bg-slate-50/50">
                    <div className="flex items-center gap-5"><div className="w-14 h-14 rounded-2xl shadow-inner" style={{ backgroundColor: cat.color }} /><input className="flex-1 bg-white border-none rounded-2xl px-6 py-4 font-black text-slate-800 text-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" value={cat.label} onChange={(e) => { const newStruct = [...editStructure]; newStruct[catIdx].label = e.target.value; setEditStructure(newStruct); }} /></div>
                    <div className="space-y-4">
                      {cat.items.map((item, itemIdx) => (
                        <div key={item.id} className="flex gap-4 items-center"><input className="flex-1 bg-white border-none rounded-xl px-5 py-3.5 text-base font-bold shadow-sm focus:ring-1 focus:ring-blue-500 outline-none" value={item.name} onChange={(e) => { const newStruct = [...editStructure]; newStruct[catIdx].items[itemIdx].name = e.target.value; setEditStructure(newStruct); }} /><div className="flex items-center gap-2"><input type="number" className="w-24 bg-white border-none rounded-xl px-4 py-3 text-base font-black text-center shadow-sm" value={item.total} onChange={(e) => { const newStruct = [...editStructure]; newStruct[catIdx].items[itemIdx].total = parseInt(e.target.value) || 0; setEditStructure(newStruct); }} /><span className="text-sm font-black text-slate-400">칸</span></div></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-12 bg-slate-50 border-t border-slate-100"><button onClick={saveWeeklySettings} className="w-full py-7 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl shadow-xl hover:bg-black transition-all active:scale-95">이 주차 목표 저장하기</button></div>
            </div>
          </div>
        )}

        <footer className="py-20 text-center no-print">
          <div className="flex items-center justify-center gap-4 mb-4"><div className="w-12 h-px bg-slate-200" /><Share2 className="text-slate-300" size={20} /><div className="w-12 h-px bg-slate-200" /></div>
          <p className="text-slate-300 text-sm font-black tracking-[0.3em] uppercase">© 2026 KYURIM GROWTH MASTER • PRODUCED BY MATE</p>
        </footer>
      </div>
    </div>
  );
}