import { DOMAINS } from '../lib/questions';
import { Icon } from './StudyChrome';

export function SimuladoLobby({ countChoice, setCountChoice, onStart, total }) {
  const specs = [
    ['timer', 'Duração', '100 min', 'Cronômetro regressivo'],
    ['target', 'Aprovação', '700 / 1000', 'Pontuação escalada'],
    ['grid', 'Formato', 'Misto', 'Escolha única e múltipla'],
    ['bulb', 'Correção', 'No final', 'Explicações na revisão'],
  ];
  return (
    <section className="panel sim-lobby">
      <div className="sim-hero">
        <span className="sim-hero-icon"><Icon name="timer" size={28}/></span>
        <div>
          <span className="eyebrow">Modo de exame</span>
          <h2>Simulado AZ-104</h2>
          <p>Questões aleatórias de todos os domínios, sem ver as respostas até o fim, assim como no exame real.</p>
        </div>
      </div>
      <div className="sim-specs">
        {specs.map(([icon, label, value, detail]) => (
          <div key={label}><Icon name={icon} size={18}/><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
        ))}
      </div>
      <ul className="sim-rules">
        <li>As respostas e explicações só são mostradas depois que você terminar.</li>
        <li>Você pode navegar entre as questões, alterar respostas e marcar questões <Icon name="flag" size={14}/> para revisar.</li>
        <li>Respostas erradas não descontam pontos — responda a todas.</li>
        <li>Se você sair do simulado no meio, as respostas serão descartadas.</li>
      </ul>
      <div className="sim-start">
        <label className="field">
          <span>Número de questões</span>
          <span className="select-wrap">
            <select value={countChoice} onChange={e => setCountChoice(e.target.value)}>
              <option value="50">50 questões · formato do exame</option>
              <option value="30">30 questões · simulado rápido</option>
              <option value="65">65 questões · simulado longo</option>
              <option value="all">Todas ({total.toLocaleString('pt-BR')}) · maratona</option>
            </select>
          </span>
        </label>
        <button className="btn btn-primary btn-lg" onClick={onStart}><Icon name="play" size={18}/>Iniciar simulado</button>
      </div>
    </section>
  );
}

export function SimuladoResults({ result, onReview, onReviewWrong, onRestart }) {
  const { score, passed, total, answered, correct, byDomain } = result;
  const pct = Math.round(score / 10);
  return (
    <section className="panel sim-results">
      <div className={`score-ring ${passed ? 'is-pass' : 'is-fail'}`} style={{ '--p': pct }}>
        <div><strong>{score}</strong><span>de 1000</span></div>
      </div>
      <span className={`pill ${passed ? 'pill-success' : 'pill-danger'}`}><Icon name={passed ? 'check' : 'cross'} size={15}/>{passed ? 'Aprovado no simulado' : 'Ainda não — o mínimo é 700'}</span>
      <div className="sim-summary">
        <div><strong>{total}</strong><span>Total</span></div>
        <div><strong>{answered}</strong><span>Respondidas</span></div>
        <div className="is-success"><strong>{correct}</strong><span>Certas</span></div>
        <div className="is-danger"><strong>{total - correct}</strong><span>Erradas</span></div>
      </div>
      <div className="sim-domains">
        <h3>Desempenho por domínio</h3>
        {DOMAINS.map((d, i) => {
          const s = byDomain[i];
          if (!s || !s.total) return null;
          const p = Math.round(s.correct / s.total * 100);
          return (
            <div key={d.key} className="domain-line">
              <div className="domain-row"><span>{d.label}</span><strong>{s.correct}/{s.total}</strong></div>
              <div className="bar" style={{ '--c': p >= 70 ? '#34d399' : p >= 50 ? '#fbbf24' : '#fb7185' }}><span style={{ width: `${p}%` }}/></div>
            </div>
          );
        })}
      </div>
      <div className="sim-actions">
        <button className="btn btn-primary" onClick={onReview}><Icon name="search" size={17}/>Revisar todas</button>
        <button className="btn btn-ghost" onClick={onReviewWrong}><Icon name="alert" size={17}/>Caderno de erros</button>
        <button className="btn btn-ghost" onClick={onRestart}><Icon name="refresh" size={17}/>Novo simulado</button>
      </div>
    </section>
  );
}
