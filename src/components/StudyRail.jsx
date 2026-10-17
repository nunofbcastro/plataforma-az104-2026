import { useEffect, useRef } from 'react';
import { DOMAINS } from '../lib/questions';
import { Icon } from './StudyChrome';

function Select({ label, value, onChange, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="select-wrap">
        <select value={value} onChange={e => onChange(e.target.value)}>{children}</select>
      </span>
    </label>
  );
}

export function QuestionNavigator({ questions, currentIndex, onJump, userAnswers, isSimRunning, simAnswers, simFlags, favorites, disabled }) {
  const gridRef = useRef(null);
  useEffect(() => {
    const active = gridRef.current?.querySelector('[aria-current="step"]');
    if (active && gridRef.current) {
      const grid = gridRef.current;
      const top = active.offsetTop - grid.offsetTop;
      if (top < grid.scrollTop || top > grid.scrollTop + grid.clientHeight - active.offsetHeight) {
        grid.scrollTo({ top: top - grid.clientHeight / 2, behavior: 'smooth' });
      }
    }
  }, [currentIndex, questions.length]);

  return (
    <section className="panel navigator">
      <div className="panel-head">
        <h3><Icon name="star" size={18}/>Navegação de questões</h3>
        <span className="muted-sm">{questions.length.toLocaleString('pt-PT')}</span>
      </div>
      <div className="legend">
        <span><i className="dot-current"/>Atual</span>
        {isSimRunning ? <><span><i className="dot-answered"/>Respondida</span><span><i className="dot-flag"/>Para rever</span></> : <><span><i className="dot-correct"/>Correta</span><span><i className="dot-wrong"/>Incorreta</span></>}
        <span><i/>Não respondida</span>
      </div>
      {questions.length === 0 ? <p className="muted-sm empty-nav">Sem questões para mostrar.</p> : (
        <div className="q-grid" ref={gridRef}>
          {questions.map((q, idx) => {
            let state = '';
            if (isSimRunning) {
              if (simAnswers[q.id]?.length) state = 'is-answered';
            } else {
              const answer = userAnswers[q.id];
              if (answer) state = answer.isCorrect ? 'is-correct' : 'is-wrong';
            }
            const flagged = isSimRunning && simFlags.has(q.id);
            return (
              <button key={q.id} type="button" disabled={disabled} onClick={() => onJump(idx)} className={`q-cell ${state} ${idx === currentIndex ? 'is-current' : ''} ${flagged ? 'is-flagged' : ''}`} aria-current={idx === currentIndex ? 'step' : undefined} aria-label={`Questão ${idx + 1}${state === 'is-correct' ? ', correta' : state === 'is-wrong' ? ', incorreta' : state === 'is-answered' ? ', respondida' : ''}`}>
                {idx + 1}
                {favorites.has(q.id) && !isSimRunning && <i className="fav-dot" aria-hidden="true"/>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function FiltersPanel({ filters, setFilter, clearFilters, sourceCounts, total, locked }) {
  const active = filters.domain !== 'all' || filters.source !== 'all' || filters.type !== 'all' || filters.status !== 'all';
  return (
    <section className="panel filters">
      <div className="panel-head">
        <h3><Icon name="filter" size={18}/>Filtros</h3>
        {active && <button className="link-btn" onClick={clearFilters}>Limpar filtros</button>}
      </div>
      {locked ? <p className="muted-sm">Os filtros ficam bloqueados durante o simulado.</p> : (
        <div className="filters-grid">
          <Select label="Domínio" value={filters.domain} onChange={v => setFilter('domain', v)}>
            <option value="all">Todos os domínios</option>
            {DOMAINS.map((d, i) => <option key={d.key} value={String(i)}>{i + 1}. {d.short} · {d.weight}</option>)}
          </Select>
          <Select label="Estado" value={filters.status} onChange={v => setFilter('status', v)}>
            <option value="all">Todas</option>
            <option value="new">Não respondidas</option>
            <option value="correct">Corretas</option>
            <option value="wrong">Incorretas</option>
          </Select>
          <Select label="Tipo de questão" value={filters.type} onChange={v => setFilter('type', v)}>
            <option value="all">Todos os tipos</option>
            <option value="single">Escolha única</option>
            <option value="multi">Seleção múltipla</option>
            <option value="code">Com código / comandos</option>
          </Select>
          <Select label="Fonte" value={filters.source} onChange={v => setFilter('source', v)}>
            <option value="all">Todas as fontes ({total.toLocaleString('pt-PT')})</option>
            {Object.entries(sourceCounts).sort(([a], [b]) => a.localeCompare(b)).map(([source, count]) => <option key={source} value={source}>{source} ({count})</option>)}
          </Select>
        </div>
      )}
    </section>
  );
}

export function DomainProgress({ domainStats, onPick }) {
  return (
    <section className="panel domains">
      <div className="panel-head"><h3><Icon name="chart" size={18}/>Progresso por tema</h3></div>
      <ul>
        {DOMAINS.map((domain, i) => {
          const s = domainStats[i];
          return (
            <li key={domain.key}>
              <button type="button" onClick={() => onPick(String(i))} title={`Filtrar: ${domain.label}`}>
                <div className="domain-row"><span>{i + 1}. {domain.label}</span><strong>{s.progress}%</strong></div>
                <div className="bar" style={{ '--c': domain.color }}><span style={{ width: `${s.progress}%` }}/></div>
                <small>{s.answered}/{s.total} respondidas{s.answered ? ` · ${s.accuracy}% certas` : ''}</small>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function QuickActions({ requestModeSwitch, mode }) {
  return (
    <div className="quick-actions">
      <button className={`quick quick-primary ${mode === 'treino' ? 'is-current' : ''}`} onClick={() => requestModeSwitch('treino')}>
        <span className="quick-icon"><Icon name="play" size={18}/></span>
        <span><strong>Continuar treino</strong><small>Retomar de onde parei</small></span>
      </button>
      <button className={`quick ${mode === 'simulado' ? 'is-current' : ''}`} onClick={() => requestModeSwitch('simulado')}>
        <span className="quick-icon"><Icon name="file" size={18}/></span>
        <span><strong>Iniciar simulado</strong><small>Modo de exame</small></span>
      </button>
    </div>
  );
}
