import { useEffect, useRef } from 'react';

const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  book: <><path d="M12 5C8 2 4 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/></>,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>,
  chart: <><path d="M5 20v-6M12 20V4M19 20V9"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  cross: <path d="m6 6 12 12M18 6 6 18"/>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>,
  alert: <><path d="m10.3 4-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
  settings: <><path d="m9 4 1-2h4l1 2 2 1 2-.2 2 3-1.2 2v3l1.2 2-2 3-2-.2-2 1-1 2h-4l-1-2-2-1-2 .2-2-3 1.2-2v-3L3 8l2-3 2 .2Z"/><circle cx="12" cy="11.5" r="3"/></>,
  search: <><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  play: <path d="m8 4 12 8-12 8Z"/>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>,
  moon: <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>,
  filter: <path d="M3 4h18l-7 8v7l-4 2v-9Z"/>,
  bulb: <><path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/></>,
};

export function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.file}</svg>;
}

export function AzureMark() {
  return <svg className="azure-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M18 5 4 35h12L29 5Z" fill="#14B8FF"/><path d="m30 8 14 30a4 4 0 0 1-4 5H17l6-10h9L24 16Z" fill="#0879F5"/></svg>;
}

export function StudyHeader({ theme, setTheme, lang, setLang, searchTerm, setSearchTerm, isSimRunning, simSecondsLeft, requestModeSwitch }) {
  const inputRef = useRef(null);
  useEffect(() => {
    const focusSearch = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  return <header className="app-header">
    <button className="app-brand" type="button" aria-label="Voltar ao treino" onClick={() => requestModeSwitch('treino')}><AzureMark/><span><strong>AZ-104 <small>2026</small></strong><span>Azure Administrator</span></span></button>
    <div className="header-search-panel">
      <div className="header-heading"><h1>Plataforma <span>AZ-104 2026</span></h1><p>Microsoft Azure Administrator</p></div>
      <label className="header-search-box"><Icon name="search" size={19}/><input ref={inputRef} type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar questões ou conceitos…" aria-label="Pesquisar questões ou conceitos"/><kbd>Ctrl K</kbd></label>
    </div>
    <div className="header-actions">
      {isSimRunning && <span className="exam-timer">{Math.floor(simSecondsLeft / 60).toString().padStart(2, '0')}:{(simSecondsLeft % 60).toString().padStart(2, '0')}</span>}
      <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title="Alternar tema"><Icon name={theme === 'dark' ? 'sun' : 'moon'}/></button>
      <button className="language-button" onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')} aria-label="Alternar idioma">{lang === 'pt' ? 'PT' : 'EN'}<span>⌄</span></button>
      <span className="profile-avatar" aria-label="Perfil local">U</span>
    </div>
  </header>;
}

export function StudySidebar({ mode, requestModeSwitch, setShowStatsModal, setShowSettingsModal, stats }) {
  const progress = stats.total ? Math.round(stats.answered / stats.total * 100) : 0;
  const items = [
    ['treino', 'book', 'Treino'], ['simulado', 'file', 'Simulado'], ['erros', 'alert', 'Caderno de erros'], ['favoritas', 'star', 'Favoritas'],
  ];
  return <aside className="app-sidebar">
    <div className="nav-section-label">ÁREA DE ESTUDO</div>
    <nav aria-label="Navegação principal">
      {items.map(([value, icon, label]) => <button key={value} className={`nav-item ${mode === value ? 'is-active' : ''}`} onClick={() => requestModeSwitch(value)} aria-current={mode === value ? 'page' : undefined} title={label}><Icon name={icon}/><span>{label}</span>{value === 'erros' && stats.incorrect > 0 && <small>{stats.incorrect}</small>}</button>)}
      <button className="nav-item" onClick={() => setShowStatsModal(true)} title="Estatísticas"><Icon name="chart"/><span>Estatísticas</span></button>
    </nav>
    <div className="sidebar-study-card"><div className="study-card-emblem"><AzureMark/></div><span className="study-card-label">UM PASSO DE CADA VEZ</span><h2>A tua certificação<br/>começa aqui.</h2><p>Constrói confiança com cada questão que resolves.</p><div className="sidebar-progress-label"><span>O teu percurso</span><strong>{progress}%</strong></div><div className="sidebar-progress-track"><span style={{width:`${progress}%`}}/></div><small>{stats.answered} de {stats.total} questões exploradas</small></div>
    <div className="sidebar-bottom"><button className="nav-item" onClick={() => setShowSettingsModal(true)} title="Definições"><Icon name="settings"/><span>Definições</span></button><span className="local-save-indicator"><i/>Progresso guardado neste dispositivo</span></div>
  </aside>;
}

export function StudyStats({ stats }) {
  const entries = [
    ['file', 'blue', stats.total.toLocaleString('pt-PT'), 'Questões disponíveis', 'Todo o banco de estudo'],
    ['check', 'teal', stats.answered, 'Respondidas', `${stats.total ? Math.round(stats.answered / stats.total * 100) : 0}% do teu percurso`],
    ['chart', 'green', stats.correct, 'Respostas certas', 'Conhecimento consolidado'],
    ['cross', 'red', stats.incorrect, 'Para rever', 'Oportunidades de aprender'],
    ['target', 'violet', `${stats.percent}%`, 'Aproveitamento', stats.answered ? 'Nas questões respondidas' : 'Responde para começar'],
  ];
  return <section className="stats-grid" aria-label="Resumo do estudo">{entries.map(([icon,color,value,label,detail]) => <div className={`metric-card metric-${color}`} key={label}><span className="metric-icon"><Icon name={icon} size={22}/></span><div><strong>{value}</strong><span>{label}</span><small>{detail}</small></div></div>)}</section>;
}
