import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DOMAINS, buildQuestionBank, isAnswerCorrect, readStorage, shuffle, writeStorage } from './lib/questions';
import { BottomNav, Icon, Sidebar, StatsRow, Topbar } from './components/StudyChrome';
import { DomainProgress, FiltersPanel, QuestionNavigator, QuickActions } from './components/StudyRail';
import { EmptyState, QuestionCard } from './components/QuestionCard';
import { SimuladoLobby, SimuladoResults } from './components/Simulado';
import { ConfirmModal, ImageModal, ReportModal, SettingsModal, StatsModal } from './components/Modals';

const SIM_SECONDS = 100 * 60;
const DEFAULT_FILTERS = { domain: 'all', source: 'all', type: 'all', status: 'all' };

function readRaw(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function App() {
  const [questionBank, setQuestionBank] = useState([]);
  const [dataState, setDataState] = useState('loading');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/questions.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Não foi possível carregar o banco de perguntas.');
        return response.json();
      })
      .then(data => { setQuestionBank(data); setDataState('ready'); })
      .catch(error => { if (error.name !== 'AbortError') setDataState('error'); });
    return () => controller.abort();
  }, []);
  const allQuestions = useMemo(() => buildQuestionBank(questionBank), [questionBank]);
  const sourceCounts = useMemo(() => allQuestions.reduce((counts, q) => {
    counts[q.origem] = (counts[q.origem] || 0) + 1;
    return counts;
  }, {}), [allQuestions]);

  const [theme, setTheme] = useState(() => readRaw('az104_theme', 'dark'));
  const [lang, setLang] = useState(() => readRaw('az104_lang', 'pt'));
  const [mode, setMode] = useState('treino');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(() => readStorage('az104_user_answers', {}));
  const [favorites, setFavorites] = useState(() => new Set(readStorage('az104_favorites', []).map(String)));
  const [drafts, setDrafts] = useState({});
  const [explanationOpen, setExplanationOpen] = useState(false);
  // Questions answered in this view stay visible even if they no longer match (e.g. a fixed error).
  const [stickyIds, setStickyIds] = useState(() => new Set());
  const [railOpen, setRailOpen] = useState(false);

  const [simState, setSimState] = useState('idle'); // idle | running | finished | reviewing
  const [simQuestions, setSimQuestions] = useState([]);
  const [simAnswers, setSimAnswers] = useState({});
  const [simFlags, setSimFlags] = useState(() => new Set());
  const [simSecondsLeft, setSimSecondsLeft] = useState(SIM_SECONDS);
  const [simCountChoice, setSimCountChoice] = useState('50');
  const [simResult, setSimResult] = useState(null);

  const [modal, setModal] = useState(null); // stats | report | settings | exit | finish
  const [pendingMode, setPendingMode] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const isSimRunning = mode === 'simulado' && simState === 'running';
  const isSimReviewing = mode === 'simulado' && simState === 'reviewing';

  useEffect(() => {
    try { localStorage.setItem('az104_theme', theme); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#060d1a' : '#f3f7fc');
  }, [theme]);
  useEffect(() => { try { localStorage.setItem('az104_lang', lang); } catch { /* ignore */ } }, [lang]);
  useEffect(() => writeStorage('az104_user_answers', userAnswers), [userAnswers]);
  useEffect(() => writeStorage('az104_favorites', Array.from(favorites)), [favorites]);

  const showToast = useCallback(message => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (!isSimRunning) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isSimRunning]);

  useEffect(() => {
    if (!isSimRunning) return undefined;
    const timer = setInterval(() => setSimSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [isSimRunning]);

  const filteredQuestions = useMemo(() => {
    if (mode === 'simulado') return simState === 'running' || simState === 'reviewing' ? simQuestions : [];
    let list = allQuestions;
    if (mode === 'erros') list = list.filter(q => stickyIds.has(q.id) || userAnswers[q.id]?.isCorrect === false);
    if (mode === 'favoritas') list = list.filter(q => stickyIds.has(q.id) || favorites.has(q.id));
    if (filters.domain !== 'all') list = list.filter(q => q.domainIndex === Number(filters.domain));
    if (filters.source !== 'all') list = list.filter(q => q.origem === filters.source);
    if (filters.type === 'code') list = list.filter(q => q.hasCode);
    else if (filters.type !== 'all') list = list.filter(q => (q.opcao_correta.length > 1) === (filters.type === 'multi'));
    if (filters.status !== 'all') {
      list = list.filter(q => {
        if (stickyIds.has(q.id)) return true;
        const answer = userAnswers[q.id];
        if (filters.status === 'new') return !answer;
        return answer && answer.isCorrect === (filters.status === 'correct');
      });
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(q => [q.pergunta, q.pergunta_en, q.explicacao, q.id, q.tema].some(text => String(text || '').toLowerCase().includes(term)));
    }
    return list;
  }, [allQuestions, mode, simState, simQuestions, stickyIds, userAnswers, favorites, filters, searchTerm]);

  useEffect(() => {
    if (currentIndex > 0 && currentIndex >= filteredQuestions.length) setCurrentIndex(Math.max(0, filteredQuestions.length - 1));
  }, [filteredQuestions.length, currentIndex]);

  const stats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    for (const q of allQuestions) {
      const answer = userAnswers[q.id];
      if (answer) { answered++; if (answer.isCorrect) correct++; }
    }
    return { total: allQuestions.length, answered, correct, incorrect: answered - correct, percent: answered ? Math.round(correct / answered * 100) : 0 };
  }, [allQuestions, userAnswers]);

  const domainStats = useMemo(() => DOMAINS.map((_, i) => {
    const questions = allQuestions.filter(q => q.domainIndex === i);
    const answers = questions.map(q => userAnswers[q.id]).filter(Boolean);
    const correct = answers.filter(a => a.isCorrect).length;
    return {
      total: questions.length,
      answered: answers.length,
      progress: questions.length ? Math.round(answers.length / questions.length * 100) : 0,
      accuracy: answers.length ? Math.round(correct / answers.length * 100) : 0,
    };
  }), [allQuestions, userAnswers]);

  const resetView = () => {
    setCurrentIndex(0);
    setExplanationOpen(false);
    setStickyIds(new Set());
  };

  const switchMode = target => {
    setMode(target);
    resetView();
    setRailOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requestModeSwitch = target => {
    if (isSimRunning && target !== 'simulado') {
      setPendingMode(target);
      setModal('exit');
      return;
    }
    switchMode(target);
  };

  const confirmExitSimulado = () => {
    setModal(null);
    setSimState('idle');
    setSimAnswers({});
    setSimFlags(new Set());
    if (pendingMode) switchMode(pendingMode);
    setPendingMode(null);
  };

  const setFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    resetView();
  };
  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchTerm('');
    resetView();
  };
  const updateSearch = value => {
    setSearchTerm(value);
    setCurrentIndex(0);
    setExplanationOpen(false);
  };

  const startSimulado = () => {
    const pool = shuffle(allQuestions);
    const count = simCountChoice === 'all' ? pool.length : Math.min(Number(simCountChoice), pool.length);
    setSimQuestions(pool.slice(0, count));
    setSimAnswers({});
    setSimFlags(new Set());
    setSimSecondsLeft(SIM_SECONDS);
    setSimResult(null);
    setSimState('running');
    resetView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finishSimulado = () => {
    setModal(null);
    const byDomain = DOMAINS.map(() => ({ total: 0, correct: 0 }));
    let answered = 0;
    let correct = 0;
    const nextAnswers = { ...userAnswers };
    simQuestions.forEach(q => {
      const selected = simAnswers[q.id] || [];
      const right = selected.length > 0 && isAnswerCorrect(selected, q.opcao_correta);
      if (selected.length) answered++;
      if (right) correct++;
      if (byDomain[q.domainIndex]) {
        byDomain[q.domainIndex].total++;
        if (right) byDomain[q.domainIndex].correct++;
      }
      nextAnswers[q.id] = { selected, isCorrect: right };
    });
    setUserAnswers(nextAnswers);
    const total = simQuestions.length;
    const score = total ? Math.round(correct / total * 1000) : 0;
    setSimResult({ score, passed: score >= 700, total, answered, correct, byDomain });
    setSimState('finished');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isSimRunning && simSecondsLeft === 0) {
      finishSimulado();
      showToast('O tempo acabou. O simulado foi enviado.');
    }
  }, [isSimRunning, simSecondsLeft]);

  const currentQ = filteredQuestions[currentIndex];
  const record = currentQ ? userAnswers[currentQ.id] : undefined;
  const isMulti = currentQ ? currentQ.opcao_correta.length > 1 : false;
  const selected = !currentQ ? [] : isSimRunning ? simAnswers[currentQ.id] || [] : record ? record.selected : drafts[currentQ.id] || [];
  const revealed = !!currentQ && (isSimReviewing || (!isSimRunning && (!!record || explanationOpen)));

  const recordAnswer = (q, letters) => {
    const correct = isAnswerCorrect(letters, q.opcao_correta);
    setUserAnswers(prev => ({ ...prev, [q.id]: { selected: letters, isCorrect: correct } }));
    setStickyIds(prev => new Set(prev).add(q.id));
    setExplanationOpen(true);
  };

  const handleSelect = letter => {
    const q = currentQ;
    if (!q || revealed) return;
    const toggle = list => list.includes(letter) ? list.filter(l => l !== letter) : [...list, letter].sort();
    if (isSimRunning) {
      setSimAnswers(prev => ({ ...prev, [q.id]: isMulti ? toggle(prev[q.id] || []) : [letter] }));
      return;
    }
    if (isMulti) setDrafts(prev => ({ ...prev, [q.id]: toggle(prev[q.id] || []) }));
    else recordAnswer(q, [letter]);
  };

  const handleVerify = () => currentQ && selected.length && recordAnswer(currentQ, selected);

  const handleRetry = () => {
    if (!currentQ) return;
    setUserAnswers(prev => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
    setDrafts(prev => ({ ...prev, [currentQ.id]: [] }));
    setExplanationOpen(false);
  };

  const goTo = index => {
    if (index < 0 || index >= filteredQuestions.length) return;
    setCurrentIndex(index);
    setExplanationOpen(isSimReviewing);
    setRailOpen(false);
    document.querySelector('.question-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleFavorite = id => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      showToast(next.has(id) ? 'Adicionada às favoritas.' : 'Removida das favoritas.');
      return next;
    });
    if (mode === 'favoritas') setStickyIds(prev => new Set(prev).add(id));
  };

  const toggleFlag = id => setSimFlags(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const keyState = useRef({});
  keyState.current = { currentQ, currentIndex, handleSelect, goTo, revealed, isSimRunning, modal, zoomedImage, railOpen };
  useEffect(() => {
    const onKey = event => {
      const s = keyState.current;
      if (s.modal || s.zoomedImage || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'Escape' && s.railOpen) { setRailOpen(false); return; }
      if (!s.currentQ) return;
      const key = event.key.toUpperCase();
      if (event.key === 'ArrowRight') { event.preventDefault(); s.goTo(s.currentIndex + 1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); s.goTo(s.currentIndex - 1); }
      else if (key === 'E' && !s.isSimRunning) setExplanationOpen(open => !open);
      else if (/^[A-F]$/.test(key) && s.currentQ.opcoes.some(o => o.letra === key)) s.handleSelect(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pickDomain = value => {
    if (isSimRunning) return;
    if (mode === 'simulado') setMode('treino');
    setFilter('domain', value);
    setRailOpen(false);
  };

  if (dataState === 'loading') {
    return <div className="boot"><span className="spinner"/>Carregando o banco de questões…</div>;
  }
  if (dataState === 'error') {
    return (
      <div className="boot">
        <strong>Não foi possível carregar as questões.</strong>
        <span>Verifique sua conexão com a Internet e tente novamente.</span>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Tentar novamente</button>
      </div>
    );
  }

  const modeTitle = {
    treino: `Modo treino · ${filteredQuestions.length.toLocaleString('pt-BR')} questões`,
    simulado: isSimRunning ? `Simulado em andamento · ${Object.keys(simAnswers).filter(k => simAnswers[k].length).length}/${simQuestions.length} respondidas` : 'Modo simulado',
    erros: `Caderno de erros · ${filteredQuestions.length} para revisar`,
    favoritas: `Favoritas · ${filteredQuestions.length} questões`,
  }[mode];

  const showQuestion = mode !== 'simulado' || isSimRunning || isSimReviewing;
  const unanswered = simQuestions.filter(q => !(simAnswers[q.id]?.length)).length;

  return (
    <div className="app">
      <div className="backdrop" aria-hidden="true"/>
      <Sidebar mode={mode} requestModeSwitch={requestModeSwitch} openStats={() => setModal('stats')} openSettings={() => setModal('settings')} stats={stats} favoritesCount={favorites.size}/>
      <div className="main-col">
        <Topbar theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} searchTerm={searchTerm} setSearchTerm={updateSearch} isSimRunning={isSimRunning} simSecondsLeft={simSecondsLeft} openSettings={() => setModal('settings')} requestModeSwitch={requestModeSwitch} title={modeTitle}/>
        <main className="content">
          <StatsRow stats={stats}/>
          <div className="workspace">
            <div className="primary">
              {mode === 'simulado' && simState === 'idle' && <SimuladoLobby countChoice={simCountChoice} setCountChoice={setSimCountChoice} onStart={startSimulado} total={allQuestions.length}/>}
              {mode === 'simulado' && simState === 'finished' && simResult && (
                <SimuladoResults
                  result={simResult}
                  onReview={() => { setSimState('reviewing'); setCurrentIndex(0); setExplanationOpen(true); }}
                  onReviewWrong={() => requestModeSwitch('erros')}
                  onRestart={() => { setSimState('idle'); setSimAnswers({}); }}
                />
              )}
              {isSimReviewing && (
                <div className="review-bar">
                  <span><Icon name="search" size={16}/>Revisando o simulado · {simResult?.score ?? 0}/1000</span>
                  <button className="link-btn" onClick={() => setSimState('finished')}>Voltar ao resultado</button>
                </div>
              )}
              {showQuestion && (currentQ ? (
                <QuestionCard
                  question={currentQ}
                  index={currentIndex}
                  total={filteredQuestions.length}
                  lang={lang}
                  selected={selected}
                  revealed={revealed}
                  isCorrect={record ? record.isCorrect : null}
                  locked={revealed}
                  isMulti={isMulti}
                  isSimRunning={isSimRunning}
                  isSimReviewing={isSimReviewing}
                  isFavorite={favorites.has(currentQ.id)}
                  isFlagged={simFlags.has(currentQ.id)}
                  explanationOpen={explanationOpen && !isSimRunning}
                  onSelect={handleSelect}
                  onVerify={handleVerify}
                  onRetry={handleRetry}
                  onToggleExplanation={() => setExplanationOpen(open => !open)}
                  onPrev={() => goTo(currentIndex - 1)}
                  onNext={() => goTo(currentIndex + 1)}
                  onToggleFavorite={() => toggleFavorite(currentQ.id)}
                  onToggleFlag={() => toggleFlag(currentQ.id)}
                  onReport={() => setModal('report')}
                  onZoom={setZoomedImage}
                  onFinish={() => setModal('finish')}
                  onOpenNavigator={() => setRailOpen(true)}
                />
              ) : <EmptyState mode={mode} onClear={() => mode === 'treino' ? clearFilters() : requestModeSwitch('treino')}/>)}
            </div>

            <aside className={`rail ${railOpen ? 'is-open' : ''}`} aria-label="Navegação, filtros e progresso">
              <div className="rail-head">
                <strong>Questões e filtros</strong>
                <button className="icon-btn" onClick={() => setRailOpen(false)} aria-label="Fechar painel"><Icon name="close"/></button>
              </div>
              <QuickActions requestModeSwitch={requestModeSwitch} mode={mode}/>
              {filteredQuestions.length > 0 && (
                <QuestionNavigator
                  questions={filteredQuestions}
                  currentIndex={currentIndex}
                  onJump={goTo}
                  userAnswers={userAnswers}
                  isSimRunning={isSimRunning}
                  simAnswers={simAnswers}
                  simFlags={simFlags}
                  favorites={favorites}
                />
              )}
              {mode !== 'simulado' && <FiltersPanel filters={filters} setFilter={setFilter} clearFilters={clearFilters} sourceCounts={sourceCounts} total={allQuestions.length}/>}
              <DomainProgress domainStats={domainStats} onPick={pickDomain}/>
            </aside>
            <div className={`rail-scrim ${railOpen ? 'is-open' : ''}`} onClick={() => setRailOpen(false)} aria-hidden="true"/>
          </div>
          <footer className="site-foot">
            <span>Plataforma de estudo independente, não afiliada à Microsoft. Conteúdo alinhado com o <a href="https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-104" target="_blank" rel="noreferrer noopener">guia de estudo AZ-104</a>.</span>
          </footer>
        </main>
      </div>
      <BottomNav mode={mode} requestModeSwitch={requestModeSwitch} openStats={() => setModal('stats')} stats={stats}/>

      {modal === 'stats' && <StatsModal stats={stats} domainStats={domainStats} onClose={() => setModal(null)}/>}
      {modal === 'report' && currentQ && <ReportModal question={currentQ} onClose={() => setModal(null)}/>}
      {modal === 'settings' && (
        <SettingsModal lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onClose={() => setModal(null)}
          onResetAnswers={() => { setUserAnswers({}); setDrafts({}); setModal(null); showToast('Histórico de respostas apagado.'); }}/>
      )}
      {modal === 'exit' && (
        <ConfirmModal title="Sair do simulado?" message="O simulado ainda está em andamento. Se você sair agora, as respostas deste simulado serão descartadas."
          cancelLabel="Continuar simulado" confirmLabel="Sair e descartar" onConfirm={confirmExitSimulado} onClose={() => { setModal(null); setPendingMode(null); }}/>
      )}
      {modal === 'finish' && (
        <ConfirmModal title="Finalizar o simulado?" tone={unanswered ? 'danger' : 'primary'}
          message={unanswered ? `Você ainda tem ${unanswered} ${unanswered === 1 ? 'questão' : 'questões'} sem resposta. Questões sem resposta contam como erradas.` : 'Você respondeu a todas as questões. Deseja enviar e ver o resultado?'}
          cancelLabel="Voltar" confirmLabel="Finalizar e ver resultado" onConfirm={finishSimulado} onClose={() => setModal(null)}/>
      )}
      {zoomedImage && <ImageModal src={zoomedImage} onClose={() => setZoomedImage(null)}/>}
      {toast && <div className="toast" role="status"><Icon name="check" size={16}/>{toast}</div>}
    </div>
  );
}

export default App;
