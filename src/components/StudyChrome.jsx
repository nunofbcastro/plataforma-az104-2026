import { useEffect, useId, useRef, useState } from 'react';
import { formatTime } from '../lib/questions';

const paths = {
  home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  book: <><path d="M12 5C8 2 4 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/></>,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>,
  timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></>,
  chart: <path d="M5 20v-6M12 20V4M19 20V9"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  cross: <path d="m6 6 12 12M18 6 6 18"/>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>,
  alert: <><path d="m10.3 4-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
  flag: <><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
  search: <><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></>,
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  arrowLeft: <path d="M20 12H4m6-6-6 6 6 6"/>,
  play: <path d="M8 4.5v15a.5.5 0 0 0 .8.4l11-7.5a.5.5 0 0 0 0-.8l-11-7.5a.5.5 0 0 0-.8.4Z"/>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>,
  moon: <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>,
  filter: <path d="M3 4h18l-7 8v7l-4 2v-9Z"/>,
  bulb: <path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/>,
  refresh: <><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  zoom: <><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5M10.5 7.5v6M7.5 10.5h6"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></>,
};

export function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.file}</svg>;
}

export function AzureMark({ className = 'azure-mark' }) {
  // Unique gradient ids: a hidden copy (e.g. in the collapsed sidebar) must not break visible ones.
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} width="42" height="42" viewBox="0 0 96 96" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}a`} x1="58" y1="10" x2="20" y2="86" gradientUnits="userSpaceOnUse"><stop stopColor="#5ec4ff"/><stop offset="1" stopColor="#0a6cff"/></linearGradient>
        <linearGradient id={`${id}b`} x1="62" y1="30" x2="84" y2="86" gradientUnits="userSpaceOnUse"><stop stopColor="#3aa0ff"/><stop offset="1" stopColor="#0050d8"/></linearGradient>
      </defs>
      <path d="M33 12h26L27 84H6a3 3 0 0 1-2.7-4.2Z" fill={`url(#${id}a)`}/>
      <path d="M62 12 92.6 79.6A3 3 0 0 1 89.9 84H40l14-22h18L50 22Z" fill={`url(#${id}b)`}/>
    </svg>
  );
}

export const MODES = [
  { value: 'treino', icon: 'book', label: 'Treino', short: 'Treino' },
  { value: 'simulado', icon: 'timer', label: 'Simulado', short: 'Simulado' },
  { value: 'erros', icon: 'alert', label: 'Caderno de erros', short: 'Erros' },
  { value: 'favoritas', icon: 'star', label: 'Favoritas', short: 'Favoritas' },
];

export function Sidebar({ mode, requestModeSwitch, openStats, openSettings, stats, favoritesCount }) {
  const progress = stats.total ? Math.round(stats.answered / stats.total * 100) : 0;
  return (
    <aside className="sidebar">
      <button className="brand" type="button" onClick={() => requestModeSwitch('treino')} aria-label="AZ-104 2026 — ir para o treino">
        <AzureMark/>
        <span className="brand-text"><strong>AZ-104 <em>2026</em></strong><small>Microsoft Azure Administrator</small></span>
      </button>
      <nav className="side-nav" aria-label="Navegação principal">
        {MODES.map(item => (
          <button key={item.value} className={`side-link ${mode === item.value ? 'is-active' : ''}`} onClick={() => requestModeSwitch(item.value)} aria-current={mode === item.value ? 'page' : undefined} title={item.label}>
            <Icon name={item.icon}/>
            <span>{item.label}</span>
            {item.value === 'erros' && stats.incorrect > 0 && <b className="side-badge is-danger">{stats.incorrect}</b>}
            {item.value === 'favoritas' && favoritesCount > 0 && <b className="side-badge">{favoritesCount}</b>}
          </button>
        ))}
        <button className="side-link" onClick={openStats} title="Estatísticas"><Icon name="chart"/><span>Estatísticas</span></button>
        <button className="side-link" onClick={openSettings} title="Definições"><Icon name="settings"/><span>Definições</span></button>
      </nav>
      <div className="side-promo">
        <div className="side-promo-art" aria-hidden="true"><span className="cloud c1"/><span className="cloud c2"/><span className="cloud c3"/><AzureMark className="side-promo-mark"/></div>
        <h2>O teu sucesso<br/>começa aqui</h2>
        <p>Pratica todos os dias e acompanha a evolução em cada domínio do exame.</p>
        <div className="side-progress">
          <div><span>O teu percurso</span><strong>{progress}%</strong></div>
          <div className="bar"><span style={{ width: `${progress}%` }}/></div>
          <small>{stats.answered.toLocaleString('pt-PT')} de {stats.total.toLocaleString('pt-PT')} questões</small>
        </div>
        <button className="btn btn-primary btn-block" onClick={() => requestModeSwitch('treino')}>Continuar a evoluir <Icon name="arrowRight" size={16}/></button>
      </div>
      <p className="side-foot"><i/>Progresso guardado neste dispositivo</p>
    </aside>
  );
}

export function Topbar({ theme, setTheme, lang, setLang, searchTerm, setSearchTerm, isSimRunning, simSecondsLeft, openSettings, requestModeSwitch, title }) {
  const inputRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const focusSearch = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  const lowTime = simSecondsLeft <= 600;
  return (
    <header className={`topbar ${searchOpen || searchTerm ? 'search-open' : ''}`}>
      <button className="topbar-brand" type="button" onClick={() => requestModeSwitch('treino')} aria-label="Ir para o treino"><AzureMark/><strong>AZ-104 <em>2026</em></strong></button>
      <div className="topbar-title">
        <h1>Plataforma <span>AZ-104 2026</span></h1>
        <p>{title}</p>
      </div>
      <label className="search">
        <Icon name="search" size={18}/>
        <input ref={inputRef} type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onBlur={() => !searchTerm && setSearchOpen(false)} placeholder="Pesquisar questões, temas ou conceitos…" aria-label="Pesquisar questões, temas ou conceitos"/>
        <kbd>Ctrl K</kbd>
      </label>
      <div className="topbar-actions">
        {isSimRunning && <span className={`exam-timer ${lowTime ? 'is-low' : ''}`} role="timer" aria-label="Tempo restante"><Icon name="timer" size={16}/>{formatTime(simSecondsLeft)}</span>}
        <button className="icon-btn search-toggle" onClick={() => { setSearchOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }} aria-label="Pesquisar"><Icon name="search"/></button>
        <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title="Alternar tema"><Icon name={theme === 'dark' ? 'sun' : 'moon'}/></button>
        <button className="lang-btn" onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')} aria-label={`Idioma das questões: ${lang === 'pt' ? 'Português' : 'Inglês'}`} title="Idioma das questões"><Icon name="globe" size={16}/>{lang === 'pt' ? 'PT' : 'EN'}</button>
        <button className="icon-btn settings-toggle" onClick={openSettings} aria-label="Definições"><Icon name="settings"/></button>
      </div>
    </header>
  );
}

export function BottomNav({ mode, requestModeSwitch, openStats, stats }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {MODES.map(item => (
        <button key={item.value} className={mode === item.value ? 'is-active' : ''} onClick={() => requestModeSwitch(item.value)} aria-current={mode === item.value ? 'page' : undefined}>
          <span className="bn-icon"><Icon name={item.icon} size={21}/>{item.value === 'erros' && stats.incorrect > 0 && <b>{stats.incorrect > 99 ? '99+' : stats.incorrect}</b>}</span>
          <span>{item.short}</span>
        </button>
      ))}
      <button onClick={openStats}><span className="bn-icon"><Icon name="chart" size={21}/></span><span>Progresso</span></button>
    </nav>
  );
}

export function StatsRow({ stats }) {
  const progress = stats.total ? Math.round(stats.answered / stats.total * 100) : 0;
  const errorRate = stats.answered ? 100 - stats.percent : 0;
  const entries = [
    { icon: 'file', tone: 'blue', value: stats.total.toLocaleString('pt-PT'), label: 'Questões', detail: 'no total' },
    { icon: 'check', tone: 'green', value: stats.answered.toLocaleString('pt-PT'), label: 'Respondidas', detail: `${progress}% do total` },
    { icon: 'chart', tone: 'sky', value: stats.correct.toLocaleString('pt-PT'), label: 'Acertos', detail: `${stats.percent}% de sucesso` },
    { icon: 'cross', tone: 'red', value: stats.incorrect.toLocaleString('pt-PT'), label: 'Erros', detail: `${errorRate}% de erro` },
  ];
  return (
    <section className="stats" aria-label="Resumo do estudo">
      {entries.map(entry => (
        <div className={`stat tone-${entry.tone}`} key={entry.label}>
          <span className="stat-icon"><Icon name={entry.icon} size={22}/></span>
          <div><strong>{entry.value}</strong><span>{entry.label}</span><small>{entry.detail}</small></div>
        </div>
      ))}
      <div className="stat tone-violet">
        <span className="stat-ring" style={{ '--p': progress }}><Icon name="target" size={20}/></span>
        <div><strong>{progress}%</strong><span>Progresso</span><small>{stats.answered} de {stats.total.toLocaleString('pt-PT')}</small></div>
      </div>
    </section>
  );
}
