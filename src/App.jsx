import React, { useState, useEffect, useMemo, useRef } from 'react';
import authoredQuestions from './data/authored-questions.json';
import './index.css';

function App() {
  const [questionBank, setQuestionBank] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/questions.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar o banco de perguntas.');
        return response.json();
      })
      .then(setQuestionBank)
      .catch((error) => {
        if (error.name !== 'AbortError') setDataError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDataLoading(false);
      });
    return () => controller.abort();
  }, []);
  const allQuestions = [...questionBank, ...authoredQuestions];
  const sourceCounts = useMemo(() => allQuestions.reduce((counts, question) => {
    counts[question.origem] = (counts[question.origem] || 0) + 1;
    return counts;
  }, {}), [allQuestions]);
  const domainOptions = [
    ['Manage Azure identities and governance', 'Identidades e governação · 20–25%'],
    ['Implement and manage storage', 'Armazenamento · 15–20%'],
    ['Deploy and manage Azure compute resources', 'Computação · 20–25%'],
    ['Implement and manage virtual networking', 'Redes virtuais · 15–20%'],
    ['Monitor and maintain Azure resources', 'Monitorização e recuperação · 10–15%']
  ];
  const domainAliases = [
    ['manage azure identities', 'gerenciar identidades', 'identidades e governança'],
    ['implement and manage storage', 'implementar e gerenciar armazenamento'],
    ['deploy and manage azure compute', 'implantar e gerenciar recursos de computação'],
    ['implement and manage virtual networking', 'implementar e gerenciar redes virtuais'],
    ['monitor and maintain azure resources', 'monitorar e manter recursos do azure']
  ];

  // Theme & Language
  const [theme, setTheme] = useState(() => localStorage.getItem('az104_theme') || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('az104_lang') || 'pt');

  // Modes: 'treino' | 'simulado' | 'erros' | 'favoritas'
  const [mode, setMode] = useState('treino');

  // Filters
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  // User Answers & Favorites
  const [userAnswers, setUserAnswers] = useState(() => {
    try {
      const s = localStorage.getItem('az104_user_answers');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const s = localStorage.getItem('az104_favorites');
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Simulado State
  const [simState, setSimState] = useState('idle'); // 'idle' | 'running' | 'finished' | 'reviewing'
  const [simQuestions, setSimQuestions] = useState([]);
  const [simAnswers, setSimAnswers] = useState({});
  const [simSecondsLeft, setSimSecondsLeft] = useState(100 * 60);
  const [simCountChoice, setSimCountChoice] = useState('65');
  const [simScore, setSimScore] = useState(0);
  const [simPassed, setSimPassed] = useState(false);
  const [simAnsweredCount, setSimAnsweredCount] = useState(0);
  const [simCorrectCount, setSimCorrectCount] = useState(0);

  // Modals
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [pendingModeSwitch, setPendingModeSwitch] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Explanation toggle for current question
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  // Timer Ref
  const timerRef = useRef(null);

  // Save Theme & Lang
  useEffect(() => {
    localStorage.setItem('az104_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('az104_lang', lang);
  }, [lang]);

  // Save Answers
  useEffect(() => {
    try {
      localStorage.setItem('az104_user_answers', JSON.stringify(userAnswers));
    } catch (e) {
      console.warn(e);
    }
  }, [userAnswers]);

  // Save Favorites
  useEffect(() => {
    try {
      localStorage.setItem('az104_favorites', JSON.stringify(Array.from(favorites)));
    } catch (e) {
      console.warn(e);
    }
  }, [favorites]);

  // Show Toast
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Beforeunload warning if simulado is running
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (mode === 'simulado' && simState === 'running') {
        e.preventDefault();
        e.returnValue = 'Você tem um simulado em andamento! Se sair agora, seu progresso do exame será perdido.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode, simState]);

  // Simulado Timer
  useEffect(() => {
    if (mode === 'simulado' && simState === 'running') {
      timerRef.current = setInterval(() => {
        setSimSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            finishSimulado(simAnswers, simQuestions);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, simState, simAnswers, simQuestions]);

  // Filter Questions
  const filteredQuestions = useMemo(() => {
    let list = allQuestions;

    if (mode === 'erros') {
      list = list.filter((q) => {
        const a = userAnswers[q.id];
        return a && a.isCorrect === false;
      });
    } else if (mode === 'favoritas') {
      list = list.filter((q) => favorites.has(q.id));
    } else if (mode === 'simulado') {
      if (simState === 'running' || simState === 'reviewing') {
        return simQuestions;
      }
    }

    if (mode !== 'simulado' || simState === 'reviewing') {
      if (selectedDomain !== 'all') {
        const domainIndex = domainOptions.findIndex(([value]) => value === selectedDomain);
        const aliases = domainAliases[domainIndex] || [selectedDomain.toLowerCase()];
        list = list.filter((q) => aliases.some((alias) => (q.dominio || '').toLowerCase().includes(alias)));
      }
      if (selectedSource !== 'all') {
        list = list.filter((q) => q.origem === selectedSource);
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        list = list.filter((q) => {
          const pt = (q.pergunta || '').toLowerCase();
          const en = (q.pergunta_en || '').toLowerCase();
          const exp = (q.explicacao || '').toLowerCase();
          const qid = (q.id || '').toLowerCase();
          return pt.includes(term) || en.includes(term) || exp.includes(term) || qid.includes(term);
        });
      }
    }

    return list;
  }, [allQuestions, mode, userAnswers, favorites, simState, simQuestions, selectedDomain, selectedSource, searchTerm]);

  // Clamp current index
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(Math.max(0, filteredQuestions.length - 1));
    }
  }, [filteredQuestions.length, currentIndex]);

  // Overall Stats
  const stats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    let incorrect = 0;
    for (const q of allQuestions) {
      const a = userAnswers[q.id];
      if (a) {
        answered++;
        if (a.isCorrect) correct++;
        else incorrect++;
      }
    }
    const percent = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return { total: allQuestions.length, answered, correct, incorrect, percent };
  }, [allQuestions, userAnswers]);

  // Mode Switch with Exit Protection
  const requestModeSwitch = (targetMode) => {
    if (mode === 'simulado' && simState === 'running' && targetMode !== 'simulado') {
      setPendingModeSwitch(targetMode);
      setShowExitConfirmModal(true);
      return;
    }
    setMode(targetMode);
    setCurrentIndex(0);
    setIsExplanationOpen(false);
  };

  const confirmExitSimulado = () => {
    setShowExitConfirmModal(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSimState('idle');
    setSimAnswers({});
    if (pendingModeSwitch) {
      setMode(pendingModeSwitch);
      setCurrentIndex(0);
      setPendingModeSwitch(null);
    }
  };

  // Simulado Start
  const startSimulado = () => {
    let pool = [...allQuestions];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    let count = pool.length;
    if (simCountChoice === '65') count = Math.min(65, pool.length);
    else if (simCountChoice === '50') count = Math.min(50, pool.length);
    else if (simCountChoice === '30') count = Math.min(30, pool.length);

    const chosen = pool.slice(0, count);
    setSimQuestions(chosen);
    setSimAnswers({});
    setSimSecondsLeft(100 * 60);
    setSimState('running');
    setCurrentIndex(0);
    setIsExplanationOpen(false);
  };

  // Simulado Finish
  const finishSimulado = (answersToScore = simAnswers, questionsToScore = simQuestions) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSimState('finished');

    const total = questionsToScore.length;
    let answered = 0;
    let correct = 0;

    const newUA = { ...userAnswers };

    questionsToScore.forEach((q) => {
      const userSel = answersToScore[q.id];
      if (userSel && userSel.length > 0) {
        answered++;
        const isRight = isAnswerCorrect(userSel, q.opcao_correta);
        if (isRight) correct++;
        newUA[q.id] = { selected: userSel, isCorrect: isRight };
      } else {
        newUA[q.id] = { selected: [], isCorrect: false };
      }
    });

    setUserAnswers(newUA);
    const scoreVal = total > 0 ? Math.round((correct / total) * 1000) : 0;
    setSimScore(scoreVal);
    setSimPassed(scoreVal >= 700);
    setSimAnsweredCount(answered);
    setSimCorrectCount(correct);
  };

  // Answer Compare
  const isAnswerCorrect = (userArr, correctArr) => {
    if (!userArr || !correctArr) return false;
    if (userArr.length !== correctArr.length) return false;
    const s1 = [...userArr].sort();
    const s2 = [...correctArr].sort();
    return s1.every((v, i) => v.toUpperCase() === s2[i].toUpperCase());
  };

  // Option Click
  const handleSelectOption = (q, letter) => {
    const isMulti = q.opcao_correta.length > 1;

    if (mode === 'simulado' && simState === 'running') {
      let cur = simAnswers[q.id] ? [...simAnswers[q.id]] : [];
      if (isMulti) {
        if (cur.includes(letter)) cur = cur.filter((l) => l !== letter);
        else cur.push(letter);
      } else {
        cur = [letter];
      }
      setSimAnswers({ ...simAnswers, [q.id]: cur });
      return;
    }

    if (mode === 'simulado' && simState === 'reviewing') return;

    // Treino / Erros / Favoritas
    let cur = userAnswers[q.id] ? [...userAnswers[q.id].selected] : [];
    if (isMulti) {
      if (cur.includes(letter)) cur = cur.filter((l) => l !== letter);
      else cur.push(letter);
      setUserAnswers({
        ...userAnswers,
        [q.id]: { selected: cur, isCorrect: isAnswerCorrect(cur, q.opcao_correta) }
      });
    } else {
      cur = [letter];
      const correct = isAnswerCorrect(cur, q.opcao_correta);
      setUserAnswers({
        ...userAnswers,
        [q.id]: { selected: cur, isCorrect: correct }
      });
      setIsExplanationOpen(true);
    }
  };

  // Toggle Favorite
  const toggleFavorite = (qid) => {
    const next = new Set(favorites);
    if (next.has(qid)) {
      next.delete(qid);
      triggerToast('Questão removida das favoritas.');
    } else {
      next.add(qid);
      triggerToast('⭐ Questão adicionada às favoritas!');
    }
    setFavorites(next);
  };

  const currentQ = filteredQuestions[currentIndex];
  const isSimRunning = mode === 'simulado' && simState === 'running';
  const isSimReviewing = mode === 'simulado' && simState === 'reviewing';

  // Answer record for current question
  const currentAnswerRecord = isSimRunning ? simAnswers[currentQ?.id] : userAnswers[currentQ?.id];
  const currentSelectedLetters = isSimRunning
    ? currentAnswerRecord || []
    : currentAnswerRecord
    ? currentAnswerRecord.selected
    : [];

  const shouldRevealGabarito =
    (!isSimRunning && currentSelectedLetters.length > 0) || isSimReviewing || isExplanationOpen;

  // Format Code and Markdown
  const renderFormattedText = (txt) => {
    if (!txt) return null;
    const parts = txt.split(/(<a\s+[^>]+>.*?<\/a>|`[^`]+`|\n)/g);
    return parts.map((part, i) => {
      if (part === '\n') return <br key={i} />;
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800 text-fuchsia-400 font-mono text-xs border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  if (dataLoading) return <div className="min-h-screen bg-[#0b0f19] text-slate-200 flex items-center justify-center">A carregar o banco de questões…</div>;
  if (dataError) return <div className="min-h-screen bg-[#0b0f19] text-slate-200 flex flex-col gap-3 items-center justify-center p-6 text-center"><strong>Não foi possível carregar as questões.</strong><span className="text-sm text-slate-400">Verifique a ligação à Internet e tente novamente.</span><button className="rounded-lg bg-indigo-600 px-4 py-2" onClick={() => window.location.reload()}>Tentar de novo</button></div>;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col font-sans transition-colors duration-200 relative`}>
      {/* Ambient background glow */}
      <div className="fixed top-0 right-0 w-[45vw] h-[45vw] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-[10vw] w-[40vw] h-[40vw] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* TOP HEADER */}
      <header className="app-header sticky top-0 z-40 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => requestModeSwitch('treino')}>
          <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 96 96" fill="none">
            <path d="M57.6 12L31.2 57.6H12L38.4 12H57.6Z" fill="#0078D4" />
            <path d="M57.6 12H38.4L64.8 57.6H84L57.6 12Z" fill="#50E6FF" />
            <path d="M84 57.6L60 84H40.8L64.8 57.6H84Z" fill="#0078D4" />
            <path d="M31.2 57.6L12 84H52.8L40.8 57.6H31.2Z" fill="#002050" />
          </svg>
          <div className="flex flex-col">
            <span className="font-extrabold text-white text-base tracking-tight leading-none">AZ-104</span>
            <span className="text-xs text-slate-400 font-medium mt-1">Microsoft Azure Administrator</span>
          </div>
        </div>

        {/* Center Mode Pills */}
        <div className="flex items-center bg-[#131b2e] border border-slate-800/80 rounded-full p-1 gap-1">
          <button
            onClick={() => requestModeSwitch('treino')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mode === 'treino'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🎓</span>
            <span>Modo Treino</span>
          </button>

          <button
            onClick={() => requestModeSwitch('simulado')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mode === 'simulado'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📋</span>
            <span>Simulado</span>
          </button>

          <button
            onClick={() => requestModeSwitch('erros')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mode === 'erros'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>❌</span>
            <span>Caderno de Erros</span>
            {stats.incorrect > 0 && (
              <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {stats.incorrect}
              </span>
            )}
          </button>

          <button
            onClick={() => requestModeSwitch('favoritas')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mode === 'favoritas'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⭐</span>
            <span>Favoritas</span>
            {favorites.size > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {favorites.size}
              </span>
            )}
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Simulado Timer Tag */}
          {isSimRunning && (
            <div className="font-mono font-bold text-xs bg-rose-950/60 text-rose-400 border border-rose-600/60 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse">
              <span>⏱️</span>
              <span>
                {Math.floor(simSecondsLeft / 60).toString().padStart(2, '0')}:
                {(simSecondsLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Theme Slider */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-14 h-7 rounded-full bg-[#131b2e] border border-slate-800 p-0.5 flex items-center relative cursor-pointer"
            title="Alternar tema"
          >
            <div className="w-full flex justify-between px-1.5 text-[10px] text-slate-400 pointer-events-none">
              <span>☀️</span>
              <span>🌙</span>
            </div>
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] text-slate-900 font-bold transition-transform duration-200 ${
                theme === 'light' ? 'translate-x-7' : 'translate-x-0'
              }`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </div>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
            className="bg-[#131b2e] border border-slate-800/80 hover:border-slate-700 text-slate-300 rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <span>{lang === 'pt' ? '🇵🇹' : '🇺🇸'}</span>
            <span>{lang === 'pt' ? 'Português (PT)' : 'English (EN)'}</span>
            <span className="text-[10px] text-slate-400">⌵</span>
          </button>

          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-md shadow-indigo-600/40 border border-indigo-400/30" aria-label="Perfil">U</div>
        </div>
      </header>

      {/* BODY LAYOUT */}
      <div className="app-shell flex flex-1 z-10">
        {/* Navegação redundante mantida no DOM para acessibilidade; a navegação principal está no cabeçalho. */}
        <aside className="app-sidebar w-44 bg-[#0d121f] border-r border-slate-800/80 p-3 flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={() => requestModeSwitch('treino')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'treino'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <span>🗂️</span>
            <span>Questões</span>
          </button>

          <button
            onClick={() => setShowStatsModal(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors"
          >
            <span>📊</span>
            <span>Estatísticas</span>
          </button>

          <button
            onClick={() => requestModeSwitch('erros')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'erros'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <span>📑</span>
            <span>Meus cadernos</span>
          </button>

          <button
            onClick={() => requestModeSwitch('favoritas')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'favoritas'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <span>⭐</span>
            <span>Favoritas</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors mt-auto"
          >
            <span>⚙️</span>
            <span>Configurações</span>
          </button>
        </aside>

        {/* MAIN WORKSPACE */}
        <main className="app-main flex-1 p-6 flex flex-col gap-5 max-w-[1550px] mx-auto w-full">
          {/* TOP 5 METRIC CARDS ROW */}
          <section className="stats-grid grid grid-cols-5 gap-3.5">
            {/* Card 1: Total */}
            <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-400 flex items-center justify-center text-lg flex-shrink-0">
                📖
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-white leading-tight">{stats.total}</span>
                <span className="text-[11px] text-slate-400 font-medium">Questões no banco</span>
              </div>
            </div>

            {/* Card 2: Respondidas */}
            <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-lg flex-shrink-0">
                ✓
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-white leading-tight">{stats.answered}</span>
                <span className="text-[11px] text-slate-400 font-medium">Respondidas</span>
              </div>
            </div>

            {/* Card 3: Acertos */}
            <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-400 flex items-center justify-center text-lg flex-shrink-0">
                📊
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-white leading-tight">{stats.correct}</span>
                <span className="text-[11px] text-slate-400 font-medium">Acertos</span>
              </div>
            </div>

            {/* Card 4: Erros */}
            <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center text-lg flex-shrink-0">
                ✕
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-white leading-tight">{stats.incorrect}</span>
                <span className="text-[11px] text-slate-400 font-medium">Erros</span>
              </div>
            </div>

            {/* Card 5: Aproveitamento */}
            <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg flex-shrink-0">
                🎯
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-white leading-tight">{stats.percent}%</span>
                <span className="text-[11px] text-slate-400 font-medium">Aproveitamento</span>
              </div>
            </div>
          </section>

          {/* LOWER WORKSPACE GRID (Left: Filters & Grid, Right: Question Area) */}
          <section className="study-layout grid grid-cols-[290px_1fr] gap-5 items-start">
            {/* LEFT COLUMN: FILTERS & QUESTION NAVIGATOR */}
            <div className="filters-column flex flex-col gap-4">
              {/* Card 1: Filtros de Estudo */}
              <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center gap-2 font-bold text-sm text-white mb-3">
                  <span className="text-purple-400">⚡</span>
                  <span>Filtros de Estudo</span>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 pointer-events-none">🔍</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por termo (ex: VM, NSG, Azure AD...)"
                    className="w-full bg-[#0d121f] border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Domain Select */}
                <div className="mb-3">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
                    <span>🌐</span>
                    <span>Domínio Oficial</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                      className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer pr-8"
                    >
                      <option value="all">Todos os domínios</option>
                      {domainOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 pointer-events-none">⌵</span>
                  </div>
                </div>

                {/* Source Select */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
                    <span>📄</span>
                    <span>Fonte das Questões</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSource}
                      onChange={(e) => setSelectedSource(e.target.value)}
                      className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer pr-8"
                    >
                      <option value="all">Todas as fontes ({allQuestions.length})</option>
                      {Object.entries(sourceCounts).sort(([a], [b]) => a.localeCompare(b)).map(([source, count]) => (
                        <option key={source} value={source}>{source} ({count})</option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 pointer-events-none">⌵</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Navegador de Questões */}
              <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                    <span>:::</span>
                    <span>Navegador de Questões</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {filteredQuestions.length} questões
                  </span>
                </div>

                {/* 7-Column Grid */}
                <div className="question-grid grid grid-cols-7 gap-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredQuestions.map((q, idx) => {
                    const isActive = idx === currentIndex;
                    const isFav = favorites.has(q.id);

                    let itemStyle = 'bg-[#0d121f] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white';

                    if (isSimRunning) {
                      if (simAnswers[q.id]) {
                        itemStyle = 'bg-indigo-950/40 border-indigo-500/60 text-indigo-300';
                      }
                    } else {
                      const ans = userAnswers[q.id];
                      if (ans) {
                        if (ans.isCorrect) itemStyle = 'bg-emerald-950/20 border-emerald-500 text-emerald-400';
                        else itemStyle = 'bg-rose-950/20 border-rose-500 text-rose-400';
                      }
                    }

                    if (isActive) {
                      itemStyle = 'bg-indigo-600 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30';
                    }

                    return (
                      <button
                        key={q.id || idx}
                        onClick={() => {
                          if (mode === 'simulado' && simState === 'idle') return;
                          setCurrentIndex(idx);
                          setIsExplanationOpen(false);
                        }}
                        className={`aspect-square rounded-lg border text-xs font-semibold flex items-center justify-center transition-all relative ${itemStyle}`}
                        title={`Questão ${idx + 1} (${q.id})`}
                      >
                        {idx + 1}
                        {isFav && (
                          <span className="absolute top-0.5 right-1 text-[8px] text-amber-400 leading-none">★</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            {/* Progresso por domínio — calculado a partir de respostas reais */}
            <div className="domain-progress-panel">
              <div className="domain-progress-heading"><span>▥</span> Progresso por tema</div>
              {domainOptions.map(([domain, label], domainIndex) => {
                const aliases = domainAliases[domainIndex] || [];
                const questions = allQuestions.filter(q => aliases.some(alias => (q.dominio || '').toLowerCase().includes(alias)));
                const completed = questions.filter(q => userAnswers[q.id]).length;
                const percentage = questions.length ? Math.round(completed / questions.length * 100) : 0;
                return (
                  <div className="domain-progress-item" key={domain}>
                    <div><span>{label.split(' · ')[0]}</span><strong>{percentage}%</strong></div>
                    <div className="domain-progress-track"><div style={{ width: `${percentage}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="study-quick-actions">
            <button onClick={() => requestModeSwitch('treino')} className="quick-primary">▶ <span>Continuar treino</span></button>
            <button onClick={() => requestModeSwitch('simulado')} className="quick-secondary">▤ <span>Iniciar simulado</span></button>
          </div>

          {/* RIGHT COLUMN: SIMULADO LOBBY OR QUESTION CARD */}
            <div className="flex flex-col">
              {/* 1. SIMULADO LOBBY (when simState === 'idle') */}
              {mode === 'simulado' && simState === 'idle' && (
                <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-8 flex flex-col gap-6 animate-fadeIn">
                  <div className="flex items-center gap-4 pb-5 border-b border-slate-800/80">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-2xl text-white shadow-lg shadow-indigo-600/40">
                      📋
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-xl font-extrabold text-white">Simulado Oficial do Exame AZ-104</h2>
                      <p className="text-xs text-slate-400 mt-1">Microsoft Azure Administrator • Ambiente Real de Certificação</p>
                    </div>
                  </div>

                  {/* 4 Info Spec Cards */}
                  <div className="grid grid-cols-4 gap-3.5">
                    <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duração</span>
                      <span className="text-base font-extrabold text-white">100 min</span>
                      <span className="text-[10px] text-slate-400">Com alerta de tempo</span>
                    </div>

                    <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nota de Corte</span>
                      <span className="text-base font-extrabold text-white">700 / 1000</span>
                      <span className="text-[10px] text-slate-400">70% para aprovação</span>
                    </div>

                    <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Formato</span>
                      <span className="text-base font-extrabold text-white">Oficial</span>
                      <span className="text-[10px] text-slate-400">Múltipla escolha e seleção</span>
                    </div>

                    <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Revisão</span>
                      <span className="text-base font-extrabold text-white">No Final</span>
                      <span className="text-[10px] text-slate-400">Gabarito e erros liberados</span>
                    </div>
                  </div>

                  {/* Rules Box */}
                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 font-bold text-xs text-indigo-300 mb-2.5">
                      <span>📌</span>
                      <span>Regras e Orientações para a Prova:</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                      <li>As respostas corretas e as justificativas <strong>NÃO</strong> serão exibidas durante o teste.</li>
                      <li>Você pode navegar livremente entre as questões pelo Navegador e alterar qualquer resposta antes de finalizar.</li>
                      <li>Questões marcadas com estrela (⭐) ficam sinalizadas para você revisitar facilmente.</li>
                      <li>Não há penalidade para respostas erradas (chute livre). Responda todas as questões!</li>
                      <li>Ao clicar em <strong>"Começar Simulado"</strong>, o cronômetro regressivo de 100 minutos será iniciado.</li>
                      <li>Se você tentar sair da página ou trocar de modo durante o exame, um modal de segurança será exibido para proteger suas respostas.</li>
                    </ul>
                  </div>

                  {/* Config & Start Button */}
                  <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-white">Quantidade de Questões:</label>
                      <select
                        value={simCountChoice}
                        onChange={(e) => setSimCountChoice(e.target.value)}
                        className="bg-[#131b2e] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-semibold outline-none cursor-pointer"
                      >
                        <option value="65">65 Questões (Padrão Oficial do Exame)</option>
                        <option value="50">50 Questões (Simulado Médio)</option>
                        <option value="30">30 Questões (Simulado Rápido)</option>
                        <option value="all">Todas as Questões do Banco (Maratona)</option>
                      </select>
                    </div>

                    <button
                      onClick={startSimulado}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-7 py-3 rounded-full shadow-lg shadow-indigo-600/40 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <span>🚀</span>
                      <span>Começar Simulado Agora</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. SIMULADO RESULTS (when simState === 'finished') */}
              {mode === 'simulado' && simState === 'finished' && (
                <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center text-center gap-6 animate-fadeIn">
                  <div
                    className={`px-5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 ${
                      simPassed
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/60'
                        : 'bg-rose-950/40 text-rose-400 border border-rose-500/60'
                    }`}
                  >
                    <span>{simPassed ? '🎉' : '❌'}</span>
                    <span>{simPassed ? 'APROVADO NO SIMULADO!' : 'NÃO APROVADO (Abaixo de 700)'}</span>
                  </div>

                  <div>
                    <div className={`text-5xl font-black tracking-tight leading-none ${simPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {simScore}
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      de 1000 pontos (Nota de Corte da Microsoft: 700)
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3.5 w-full max-w-xl">
                    <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3 flex flex-col">
                      <span className="text-lg font-bold text-white">{simQuestions.length}</span>
                      <span className="text-[10px] text-slate-400">Total</span>
                    </div>

                    <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3 flex flex-col">
                      <span className="text-lg font-bold text-blue-400">{simAnsweredCount}</span>
                      <span className="text-[10px] text-slate-400">Respondidas</span>
                    </div>

                    <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3 flex flex-col">
                      <span className="text-lg font-bold text-emerald-400">{simCorrectCount}</span>
                      <span className="text-[10px] text-slate-400">Acertos</span>
                    </div>

                    <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3 flex flex-col">
                      <span className="text-lg font-bold text-rose-400">{simQuestions.length - simCorrectCount}</span>
                      <span className="text-[10px] text-slate-400">Erros</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    <button
                      onClick={() => requestModeSwitch('erros')}
                      className="border border-rose-500/60 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>❌</span>
                      <span>Revisar Questões Erradas</span>
                    </button>

                    <button
                      onClick={() => {
                        setSimState('reviewing');
                        setCurrentIndex(0);
                        setIsExplanationOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
                    >
                      <span>🔍</span>
                      <span>Revisar Todas as Questões</span>
                    </button>

                    <button
                      onClick={() => {
                        setSimState('idle');
                        setSimAnswers({});
                      }}
                      className="border border-slate-800 bg-[#0d121f] text-slate-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>🔄</span>
                      <span>Fazer Novo Simulado</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. MAIN QUESTION CARD (when in treino/erros/favoritas or active/reviewing simulado) */}
              {(mode !== 'simulado' || simState === 'running' || simState === 'reviewing') && (
                <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-7 flex flex-col min-h-[560px] animate-fadeIn">
                  {currentQ ? (
                    <>
                      {/* Question Top Header Bar */}
                      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/40">
                            {currentIndex + 1}
                          </div>
                          <span className="font-extrabold text-white text-base">
                            Questão {currentIndex + 1} de {filteredQuestions.length}
                          </span>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-blue-950/80 text-blue-400 border border-blue-800/60 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                              {currentQ.id}
                            </span>
                            <span className="bg-slate-800/80 text-slate-300 border border-slate-700 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                              {currentQ.origem}
                            </span>
                            <span className="bg-amber-950/60 text-amber-400 border border-amber-800/60 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                              {currentQ.tipo}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFavorite(currentQ.id)}
                            className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center transition-colors cursor-pointer ${
                              favorites.has(currentQ.id)
                                ? 'bg-amber-950/40 border-amber-500/60 text-amber-400'
                                : 'bg-[#0d121f] border-slate-800 text-slate-400 hover:text-amber-400'
                            }`}
                            title="Marcar como favorita"
                          >
                            ★
                          </button>

                          <button
                            onClick={() => setShowReportModal(true)}
                            className="bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 hover:bg-indigo-900/40 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>🚩</span>
                            <span>Reportar</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Statement */}
                      <div className="question-statement text-[14.5px] leading-relaxed text-slate-200 mb-6">
                        {renderFormattedText(lang === 'en' && currentQ.pergunta_en ? currentQ.pergunta_en : currentQ.pergunta)}
                      </div>

                      {/* Architecture Diagrams Box */}
                      {currentQ.assets && currentQ.assets.length > 0 && (
                        <div className="answer-options flex flex-col gap-3 mb-6">
                          {currentQ.assets.map((assetPath, aIdx) => (
                            <div
                              key={aIdx}
                              onClick={() => setZoomedImage(assetPath)}
                              className="bg-[#0d121f] border border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-3 text-center cursor-zoom-in transition-all group"
                            >
                              <img
                                src={assetPath}
                                alt={`Diagrama ${aIdx + 1}`}
                                className="max-w-full max-h-[460px] mx-auto rounded-lg group-hover:scale-[1.01] transition-transform"
                                loading="lazy"
                              />
                              <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                                <span>🔍</span>
                                <span>Clique no diagrama para ampliar em tela cheia</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Options Stack */}
                      <div className="flex flex-col gap-3 mb-6">
                        {currentQ.opcoes.map((opt) => {
                          const isSelected = currentSelectedLetters.includes(opt.letra);
                          const isCorrectOpt = currentQ.opcao_correta.includes(opt.letra);

                          let rowClasses = 'bg-[#0d121f] border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60 text-slate-200';
                          let letterCircleClasses = 'bg-slate-800 text-slate-300';

                          if (isSelected && isSimRunning) {
                            rowClasses = 'bg-indigo-950/20 border-indigo-500/60 text-white';
                            letterCircleClasses = 'bg-indigo-600 text-white';
                          }

                          if (shouldRevealGabarito) {
                            if (isCorrectOpt) {
                              rowClasses = 'bg-emerald-950/20 border-emerald-500 text-white shadow-sm shadow-emerald-500/20';
                              letterCircleClasses = 'bg-emerald-500 text-emerald-950 font-black';
                            } else if (isSelected && !isCorrectOpt) {
                              rowClasses = 'bg-rose-950/20 border-rose-500 text-white shadow-sm shadow-rose-500/20';
                              letterCircleClasses = 'bg-rose-500 text-white font-black';
                            }
                          }

                          return (
                            <button
                              key={opt.letra}
                              type="button"
                              data-option-row="true"
                              onClick={() => handleSelectOption(currentQ, opt.letra)}
                              disabled={isSimReviewing}
                              aria-pressed={isSelected}
                              className={`w-full text-left border rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all disabled:cursor-default ${rowClasses}`}
                            >
                              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${letterCircleClasses}`}>
                                {opt.letra}
                              </div>
                              <div className="text-sm font-medium leading-relaxed flex-1">
                                {renderFormattedText(lang === 'en' && opt.texto_en ? opt.texto_en : opt.texto)}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Card */}
                      {isExplanationOpen && (
                        <div className="bg-gradient-to-b from-[#131b2e] to-[#0d121f] border-l-4 border-indigo-500 border border-slate-800 rounded-xl p-5 mb-6 animate-fadeIn">
                          <div className="flex items-center gap-2 font-bold text-sm text-indigo-400 mb-2">
                            <span>💡</span>
                            <span>Resolução & Justificativa Detalhada</span>
                          </div>
                          <div className="text-xs md:text-[13px] leading-relaxed text-slate-300">
                            {renderFormattedText(currentQ.explicacao || 'Ainda não existe uma explicação para esta questão. Consulte a documentação indicada na fonte e reporte-a para revisão.')}
                          </div>
                        </div>
                      )}

                      {/* Question Card Bottom Footer */}
                      <div className="mt-auto pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                        <button
                          onClick={() => {
                            if (currentIndex > 0) {
                              setCurrentIndex(currentIndex - 1);
                              setIsExplanationOpen(false);
                            }
                          }}
                          disabled={currentIndex === 0}
                          className="border border-slate-800 bg-[#0d121f] text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        >
                          <span>←</span>
                          <span>Questão Anterior</span>
                        </button>

                        <button
                          onClick={() => setIsExplanationOpen(!isExplanationOpen)}
                          className="text-slate-300 hover:text-white px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <span>💡</span>
                          <span>{isExplanationOpen ? 'Ocultar explicação' : currentQ.opcao_correta.length > 1 ? 'Corrigir e ver explicação' : 'Ver explicação'}</span>
                        </button>

                        <div className="flex items-center gap-2.5">
                          {isSimRunning && (
                            <button
                              onClick={() => {
                                const remaining = simQuestions.length - Object.keys(simAnswers).length;
                                if (remaining > 0) {
                                  if (!window.confirm(`Você ainda possui ${remaining} questões sem responder.\nDeseja realmente finalizar o simulado?`)) return;
                                }
                                finishSimulado();
                              }}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                            >
                              Finalizar Simulado
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (currentIndex < filteredQuestions.length - 1) {
                                setCurrentIndex(currentIndex + 1);
                                setIsExplanationOpen(false);
                              }
                            }}
                            disabled={currentIndex === filteredQuestions.length - 1}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          >
                            <span>Próxima Questão</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                      <span className="text-3xl">🔍</span>
                      <h3 className="text-base font-bold text-white">Nenhuma questão encontrada</h3>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Nenhuma questão corresponde aos filtros ou termo de busca aplicados. Tente selecionar "Todos os domínios" ou limpar o campo de busca.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* ========================================================
          MODALS (NO JAVASCRIPT ALERTS!)
      ======================================================== */}

      {/* 1. STATS MODAL */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 max-w-lg w-full flex flex-col gap-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                <span>📊</span>
                <span>Estatísticas Detalhadas de Estudo</span>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3 flex flex-col">
                <span className="text-xs text-slate-400">Total no Banco</span>
                <span className="text-xl font-bold text-white">{stats.total} questões</span>
              </div>
              <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3 flex flex-col">
                <span className="text-xs text-slate-400">Respondidas</span>
                <span className="text-xl font-bold text-blue-400">{stats.answered}</span>
              </div>
              <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3 flex flex-col">
                <span className="text-xs text-slate-400">Acertos</span>
                <span className="text-xl font-bold text-emerald-400">{stats.correct}</span>
              </div>
              <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3 flex flex-col">
                <span className="text-xs text-slate-400">Erros</span>
                <span className="text-xl font-bold text-rose-400">{stats.incorrect}</span>
              </div>
            </div>

            <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Taxa Geral de Aproveitamento:</span>
                <span className="text-indigo-400 font-bold">{stats.percent}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${stats.percent}%` }} />
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Meta recomendada para o exame AZ-104: 85% ou mais para aprovação garantida.
              </span>
            </div>

            <button
              onClick={() => setShowStatsModal(false)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              Fechar Estatísticas
            </button>
          </div>
        </div>
      )}

      {/* 2. REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                <span>🚩</span>
                <span>Reportar Questão {currentQ?.id}</span>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">Motivo do apontamento:</label>
              <select className="w-full bg-[#0d121f] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none">
                <option>Gabarito oficial discordante</option>
                <option>Erro na tradução em Português</option>
                <option>Diagrama ou imagem faltando</option>
                <option>Texto truncado ou formatado incorretamente</option>
                <option>Outro motivo</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">Observações adicionais (opcional):</label>
              <textarea
                rows={3}
                placeholder="Descreva o que identificou nesta questão..."
                className="w-full bg-[#0d121f] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="border border-slate-800 bg-[#0d121f] text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  triggerToast(`Feedback para a questão ${currentQ?.id} enviado com sucesso!`);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md shadow-indigo-600/30"
              >
                Enviar Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SETTINGS & RESET MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                <span>⚙️</span>
                <span>Configurações da Plataforma</span>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Idioma do Exame</span>
                <span className="text-[10px] text-slate-400">Alterne entre Português e Inglês</span>
              </div>
              <button
                onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
                className="bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                {lang === 'pt' ? '🇵🇹 PT' : '🇺🇸 EN'}
              </button>
            </div>

            <div className="bg-[#0d121f] border border-rose-900/40 rounded-xl p-3.5 flex flex-col gap-2">
              <span className="text-xs font-bold text-rose-400">Zerar Histórico de Respostas</span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Limpa todas as respostas registradas de acertos e erros, permitindo recomeçar do zero. Suas questões favoritas (⭐) serão preservadas.
              </p>
              <button
                onClick={() => {
                  setUserAnswers({});
                  setShowSettingsModal(false);
                  triggerToast('Histórico de respostas zerado com sucesso!');
                }}
                className="bg-rose-600/20 border border-rose-500/50 hover:bg-rose-600/30 text-rose-300 font-bold text-xs py-2 rounded-lg transition-colors mt-1"
              >
                Confirmar e Zerar Respostas
              </button>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors mt-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* 4. EXIT CONFIRMATION MODAL */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2e] border border-rose-500/60 rounded-2xl p-6 max-w-md w-full flex flex-col items-center text-center gap-4 shadow-2xl animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-rose-950/40 border border-rose-500 text-rose-400 flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-extrabold text-white">Simulado em Andamento!</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mt-1">
                Você está com uma prova em andamento e o tempo está correndo. Se sair agora, o simulado será cancelado e suas respostas serão perdidas.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Continuar Simulado
              </button>

              <button
                onClick={confirmExitSimulado}
                className="flex-1 bg-transparent hover:bg-rose-950/20 text-rose-400 border border-rose-500/60 font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                Sair e Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. IMAGE ZOOM MODAL */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-5 right-6 text-white text-3xl font-light hover:text-slate-300 transition-colors"
          >
            &times;
          </button>
          <img
            src={zoomedImage}
            alt="Imagem Ampliada"
            className="max-w-[94vw] max-h-[90vh] object-contain rounded-xl bg-white p-2 shadow-2xl"
          />
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-indigo-500/40 text-slate-100 text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl shadow-indigo-600/30 flex items-center gap-2 animate-fadeIn">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
