import { useState } from 'react';
import { DOMAINS } from '../lib/questions';
import { Icon } from './StudyChrome';
import { isCommandOnly } from '../lib/technical-content';

const URL_PATTERN = /(https?:\/\/[^\s)]+)/g;

export function RichText({ text }) {
  if (!text) return null;
  const value = String(text);
  if (isCommandOnly(value) && !value.includes('\n')) return <code className="technical-command">{value}</code>;
  return value.split(/(```[\w-]*\n[\s\S]*?```)/g).map((segment, blockIndex) => {
    if (segment.startsWith('```')) {
      const content = segment.slice(segment.indexOf('\n') + 1, -3).replace(/\n$/, '');
      return <pre className="code-block" key={blockIndex}><code>{content}</code></pre>;
    }
    return <span key={blockIndex}>{segment.split(/(`[^`]+`|\n)/g).map((part, i) => {
    if (part === '\n') return <br key={i}/>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>;
    return part.split(URL_PATTERN).map((chunk, j) => {
      if (/^https?:\/\//.test(chunk)) {
        const clean = chunk.replace(/[.,;]+$/, '');
        return <a key={`${i}-${j}`} href={clean} target="_blank" rel="noreferrer noopener">{clean.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}{clean.length > 68 ? '…' : ''}<Icon name="external" size={12}/></a>;
      }
      return chunk;
    });
    })}</span>;
  });
}

const IMAGE_MARKER = /\[(?:Imagem|Image)\]/;

function Figure({ src, label, onZoom }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="q-asset is-broken" role="img" aria-label={label}><Icon name="alert" size={16}/>Não foi possível carregar a imagem.</div>;
  return (
    <button type="button" className="q-asset" onClick={() => onZoom(src)} aria-label={`Ampliar ${label}`}>
      <img src={src} alt={label} decoding="async" onError={() => setFailed(true)}/>
      <span><Icon name="zoom" size={14}/>Toca para ampliar</span>
    </button>
  );
}

// Places each image where the text has an "[Imagem]" marker; images without a marker go at the end.
function TextWithImages({ text, images, label, onZoom }) {
  const parts = String(text || '').split(IMAGE_MARKER);
  const figure = i => <Figure key={`img-${images[i]}`} src={images[i]} label={`${label} ${i + 1}`} onZoom={onZoom}/>;
  return (
    <>
      {parts.map((part, i) => (
        <span key={`part-${i}`}>
          <RichText text={part.replace(/^\n+|\n+$/g, '')}/>
          {i < parts.length - 1 && images[i] && figure(i)}
        </span>
      ))}
      {images.slice(Math.max(0, parts.length - 1)).map((_, k) => figure(parts.length - 1 + k))}
    </>
  );
}

export function QuestionCard({
  question, index, total, lang, selected, revealed, isCorrect, locked, isMulti, isSimRunning, isSimReviewing,
  isFavorite, isFlagged, explanationOpen, onSelect, onVerify, onRetry, onToggleExplanation, onPrev, onNext,
  onToggleFavorite, onToggleFlag, onReport, onZoom, onFinish, onOpenNavigator,
}) {
  const domain = DOMAINS[question.domainIndex];
  const correctCount = question.opcao_correta.length;
  const statement = lang === 'en' && question.pergunta_en ? question.pergunta_en : question.pergunta;
  const progress = total ? ((index + 1) / total) * 100 : 0;
  const questionImages = question.assets.filter(src => !/_explicacao_/.test(src));
  const explanationImages = question.assets.filter(src => /_explicacao_/.test(src));

  return (
    <article className="panel question-card" aria-labelledby="question-title">
      <div className="q-progress" aria-hidden="true"><span style={{ width: `${progress}%` }}/></div>
      <header className="q-head">
        <div className="q-title">
          <span className="q-icon"><Icon name="file" size={18}/></span>
          <h2 id="question-title">Pergunta <strong>{index + 1}</strong> <span>de {total.toLocaleString('pt-PT')}</span></h2>
        </div>
        <div className="q-tags">
          {domain && <span className="tag tag-domain" style={{ '--c': domain.color }}>Domínio {question.domainIndex + 1}<em>{domain.short}</em></span>}
          {question.tema && <span className="tag">{question.tema}</span>}
          {question.dificuldade && <span className={`tag tag-level level-${question.dificuldade.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}`}><i/><i/><i/>{question.dificuldade}</span>}
          {isMulti && <span className="tag tag-multi">Escolhe {correctCount}</span>}
        </div>
        <div className="q-tools">
          <button className="icon-btn nav-toggle" onClick={onOpenNavigator} aria-label="Abrir navegação e filtros"><Icon name="grid" size={19}/></button>
          {isSimRunning && <button className={`icon-btn ${isFlagged ? 'is-flagged' : ''}`} onClick={onToggleFlag} aria-pressed={isFlagged} aria-label="Marcar para rever" title="Marcar para rever"><Icon name="flag" size={19}/></button>}
          <button className={`icon-btn ${isFavorite ? 'is-fav' : ''}`} onClick={onToggleFavorite} aria-pressed={isFavorite} aria-label={isFavorite ? 'Remover das favoritas' : 'Adicionar às favoritas'} title="Favorita"><Icon name="star" size={19}/></button>
          <button className="icon-btn" onClick={onReport} aria-label="Reportar problema nesta questão" title="Reportar"><Icon name="alert" size={19}/></button>
        </div>
      </header>

      <div className="q-meta-line"><span>{question.origem}</span><span>#{question.id}</span></div>

      <div className="q-statement"><TextWithImages text={statement} images={questionImages} label="Imagem da questão" onZoom={onZoom}/></div>

      {isMulti && !revealed && <p className="q-hint"><Icon name="check" size={15}/>Seleciona {correctCount} respostas{isSimRunning ? '' : ' e carrega em “Verificar resposta”'}.</p>}

      <div className="options" role={isMulti ? 'group' : 'radiogroup'} aria-label="Opções de resposta">
        {question.opcoes.map(option => {
          const isSelected = selected.includes(option.letra);
          const isRight = question.opcao_correta.includes(option.letra);
          let state = isSelected ? 'is-selected' : '';
          if (revealed) {
            if (isRight) state = isSelected ? 'is-correct' : 'is-correct is-missed';
            else if (isSelected) state = 'is-wrong';
            else state = 'is-dim';
          }
          return (
            <button
              key={option.letra}
              type="button"
              className={`option ${state} ${isMulti ? 'is-multi' : ''}`}
              onClick={() => onSelect(option.letra)}
              disabled={locked}
              role={isMulti ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
            >
              <span className="option-letter">{option.letra}</span>
              <span className="option-text"><RichText text={lang === 'en' && option.texto_en ? option.texto_en : option.texto}/></span>
              <span className="option-mark" aria-hidden="true">
                {revealed && isRight && <Icon name="check" size={16}/>}
                {revealed && !isRight && isSelected && <Icon name="cross" size={16}/>}
                {!revealed && isSelected && <Icon name="check" size={16}/>}
              </span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className={`result-banner ${isCorrect === null ? 'is-neutral' : isCorrect ? 'is-correct' : 'is-wrong'}`} role="status">
          <span className="result-icon"><Icon name={isCorrect === null ? 'bulb' : isCorrect ? 'check' : 'cross'} size={20}/></span>
          <div>
            <strong>{isCorrect === null ? 'Resposta revelada' : isSimReviewing && !selected.length ? 'Não respondida' : isCorrect ? 'Resposta correta!' : 'Resposta incorreta'}</strong>
            <span>Resposta certa: {question.opcao_correta.join(', ')}</span>
          </div>
          {!isSimReviewing && <button className="btn btn-ghost btn-sm" onClick={onRetry}><Icon name="refresh" size={15}/>Repetir</button>}
        </div>
      )}

      {explanationOpen && (
        <section className="explanation" aria-label="Explicação">
          <h3><span><Icon name="bulb" size={18}/></span>Explicação</h3>
          <div><TextWithImages text={question.explicacao || 'Ainda não existe uma explicação para esta questão.'} images={explanationImages} label="Imagem da explicação" onZoom={onZoom}/></div>
        </section>
      )}

      <footer className="q-foot">
        <button className="btn btn-ghost" onClick={onPrev} disabled={index === 0}><Icon name="arrowLeft" size={17}/><span>Anterior</span></button>
        <div className="q-foot-center">
          {!isSimRunning && isMulti && !revealed && <button className="btn btn-success" onClick={onVerify} disabled={!selected.length}><Icon name="check" size={17}/><span>Verificar resposta</span></button>}
          {!isSimRunning && (revealed || !isMulti) && <button className="btn btn-ghost" onClick={onToggleExplanation}><Icon name="bulb" size={17}/><span>{explanationOpen ? 'Ocultar explicação' : 'Ver explicação'}</span></button>}
          {isSimRunning && <button className="btn btn-danger" onClick={onFinish}><Icon name="flag" size={17}/><span>Terminar</span></button>}
          <button className={`btn btn-ghost fav-inline ${isFavorite ? 'is-fav' : ''}`} onClick={onToggleFavorite}><Icon name="star" size={17}/><span>{isFavorite ? 'Nas favoritas' : 'Adicionar às favoritas'}</span></button>
        </div>
        <button className="btn btn-primary" onClick={onNext} disabled={index >= total - 1}><span>Próxima<span className="hide-xs"> questão</span></span><Icon name="arrowRight" size={17}/></button>
      </footer>
      <p className="kbd-hint">Atalhos: <kbd>A</kbd>–<kbd>F</kbd> responder · <kbd>←</kbd> <kbd>→</kbd> navegar · <kbd>E</kbd> explicação</p>
    </article>
  );
}

export function EmptyState({ mode, onClear }) {
  const copy = {
    erros: ['Sem erros para rever', 'Ainda não erraste nenhuma questão. Continua a treinar e as que errares aparecem aqui.'],
    favoritas: ['Ainda não tens favoritas', 'Marca questões com a estrela para as reveres mais tarde.'],
  }[mode] || ['Nenhuma questão encontrada', 'Nenhuma questão corresponde aos filtros ou à pesquisa.'];
  return (
    <div className="panel empty">
      <span className="empty-icon"><Icon name={mode === 'favoritas' ? 'star' : mode === 'erros' ? 'check' : 'search'} size={28}/></span>
      <h2>{copy[0]}</h2>
      <p>{copy[1]}</p>
      <button className="btn btn-primary" onClick={onClear}>{mode === 'treino' ? 'Limpar filtros' : 'Ir para o treino'}</button>
    </div>
  );
}
