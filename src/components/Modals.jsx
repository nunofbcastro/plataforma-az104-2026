import { useEffect, useRef, useState } from 'react';
import { DOMAINS } from '../lib/questions';
import { Icon } from './StudyChrome';

export function Modal({ title, icon, onClose, children, tone, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => Array.from(ref.current?.querySelectorAll('button:not([disabled]), a[href], input, select, textarea') || []);
    focusables()[0]?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
  }, []);
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`modal modal-${size} ${tone ? `modal-${tone}` : ''}`}>
        <header className="modal-head">
          <h2>{icon && <span className="modal-icon"><Icon name={icon} size={18}/></span>}{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="close" size={18}/></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function StatsModal({ stats, domainStats, onClose }) {
  return (
    <Modal title="Estatísticas de estudo" icon="chart" onClose={onClose}>
      <div className="mini-stats">
        <div><span>Total no banco</span><strong>{stats.total.toLocaleString('pt-PT')}</strong></div>
        <div><span>Respondidas</span><strong className="c-blue">{stats.answered}</strong></div>
        <div><span>Certas</span><strong className="c-green">{stats.correct}</strong></div>
        <div><span>Erradas</span><strong className="c-red">{stats.incorrect}</strong></div>
      </div>
      <div className="meter">
        <div className="domain-row"><span>Taxa de acerto global</span><strong>{stats.percent}%</strong></div>
        <div className="bar" style={{ '--c': 'linear-gradient(90deg,#3b9bff,#34d399)' }}><span style={{ width: `${stats.percent}%` }}/></div>
      </div>
      <h3 className="modal-sub">Por domínio do exame</h3>
      <div className="domain-table">
        {DOMAINS.map((d, i) => {
          const s = domainStats[i];
          return (
            <div key={d.key}>
              <span className="swatch" style={{ background: d.color }}/>
              <span className="dt-label">{d.label}<small>Peso no exame: {d.weight}</small></span>
              <span className="dt-num">{s.answered}/{s.total}</span>
              <span className={`dt-acc ${!s.answered ? '' : s.accuracy >= 70 ? 'c-green' : s.accuracy >= 50 ? 'c-amber' : 'c-red'}`}>{s.answered ? `${s.accuracy}%` : '—'}</span>
            </div>
          );
        })}
      </div>
      <p className="muted-sm">Procura manter pelo menos 70% de acerto em todos os domínios antes de marcar o exame.</p>
    </Modal>
  );
}

export function ReportModal({ question, onClose }) {
  const [reason, setReason] = useState('Resposta correta discordante');
  const [notes, setNotes] = useState('');
  const issueUrl = `https://github.com/nunofbcastro/plataforma-az104-2026/issues/new?${new URLSearchParams({
    title: `Questão ${question.id}: ${reason}`,
    body: `**Questão:** ${question.id} (${question.origem})\n**Motivo:** ${reason}\n\n${notes}`,
  })}`;
  return (
    <Modal title={`Reportar questão #${question.id}`} icon="alert" onClose={onClose} size="sm">
      <label className="field">
        <span>Motivo</span>
        <span className="select-wrap">
          <select value={reason} onChange={e => setReason(e.target.value)}>
            <option>Resposta correta discordante</option>
            <option>Erro de tradução</option>
            <option>Imagem em falta</option>
            <option>Texto truncado ou mal formatado</option>
            <option>Outro motivo</option>
          </select>
        </span>
      </label>
      <label className="field">
        <span>Detalhes (opcional)</span>
        <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descreve o problema que encontraste…"/>
      </label>
      <p className="muted-sm">O reporte é aberto como issue no GitHub do projeto (precisa de conta GitHub).</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <a className="btn btn-primary" href={issueUrl} target="_blank" rel="noreferrer noopener" onClick={onClose}>Abrir reporte<Icon name="external" size={15}/></a>
      </div>
    </Modal>
  );
}

export function SettingsModal({ lang, setLang, theme, setTheme, onResetAnswers, onClose }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Modal title="Definições" icon="settings" onClose={onClose} size="sm">
      <div className="setting-row">
        <div><strong>Idioma das questões</strong><span>Português ou inglês (original do exame)</span></div>
        <div className="segmented">
          <button className={lang === 'pt' ? 'is-on' : ''} onClick={() => setLang('pt')}>PT</button>
          <button className={lang === 'en' ? 'is-on' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      </div>
      <div className="setting-row">
        <div><strong>Tema</strong><span>Escuro ou claro</span></div>
        <div className="segmented">
          <button className={theme === 'dark' ? 'is-on' : ''} onClick={() => setTheme('dark')}><Icon name="moon" size={15}/></button>
          <button className={theme === 'light' ? 'is-on' : ''} onClick={() => setTheme('light')}><Icon name="sun" size={15}/></button>
        </div>
      </div>
      <div className="danger-zone">
        <strong>Repor histórico de respostas</strong>
        <span>Apaga todas as respostas guardadas neste dispositivo. As favoritas mantêm-se.</span>
        {confirmReset ? (
          <div className="modal-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(false)}>Cancelar</button>
            <button className="btn btn-danger btn-sm" onClick={onResetAnswers}>Sim, apagar respostas</button>
          </div>
        ) : <button className="btn btn-danger-ghost btn-sm" onClick={() => setConfirmReset(true)}>Repor respostas…</button>}
      </div>
    </Modal>
  );
}

export function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onClose, tone = 'danger' }) {
  return (
    <Modal title={title} icon="alert" onClose={onClose} size="sm" tone={tone}>
      <p className="confirm-text">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>{cancelLabel}</button>
        <button className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function ImageModal({ src, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="modal-backdrop image-backdrop" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={onClose}>
      <button className="icon-btn image-close" onClick={onClose} aria-label="Fechar imagem"><Icon name="close"/></button>
      <img src={src} alt="Imagem ampliada da questão"/>
    </div>
  );
}
