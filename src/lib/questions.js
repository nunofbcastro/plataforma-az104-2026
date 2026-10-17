import legacyAuthored from '../data/authored-questions.json';

const authoredModules = import.meta.glob('../data/authored/*.json', { eager: true, import: 'default' });

export const DOMAINS = [
  { key: 'identity', short: 'Identidades e governação', label: 'Gerir identidades e governação', weight: '20–25%', color: '#3b9bff', aliases: ['manage azure identities', 'gerenciar identidades', 'identidades e governança'] },
  { key: 'storage', short: 'Armazenamento', label: 'Implementar e gerir armazenamento', weight: '15–20%', color: '#a78bfa', aliases: ['implement and manage storage', 'implementar e gerenciar armazenamento'] },
  { key: 'compute', short: 'Computação', label: 'Implementar e gerir computação', weight: '20–25%', color: '#2dd4bf', aliases: ['deploy and manage azure compute', 'implantar e gerenciar recursos de computação'] },
  { key: 'network', short: 'Redes virtuais', label: 'Configurar redes virtuais', weight: '15–20%', color: '#fbbf24', aliases: ['implement and manage virtual networking', 'implementar e gerenciar redes virtuais'] },
  { key: 'monitor', short: 'Monitorização e cópias', label: 'Monitorizar e manter recursos', weight: '10–15%', color: '#fb7185', aliases: ['monitor and maintain azure resources', 'monitorar e manter recursos do azure'] },
];

export function domainIndexOf(question) {
  const value = (question.dominio || '').toLowerCase();
  return DOMAINS.findIndex(domain => domain.aliases.some(alias => value.includes(alias)));
}

function normalize(question) {
  const multi = (question.opcao_correta || []).length > 1;
  return {
    ...question,
    id: String(question.id),
    tipo: multi ? 'Seleção Múltipla' : 'Múltipla Escolha',
    assets: question.assets || [],
    domainIndex: domainIndexOf(question),
  };
}

export function buildQuestionBank(imported) {
  const authored = Object.keys(authoredModules).sort().flatMap(key => authoredModules[key]);
  return [...imported, ...legacyAuthored, ...authored].map(normalize);
}

export function isAnswerCorrect(selected, correct) {
  if (!selected || !correct || selected.length !== correct.length) return false;
  const a = [...selected].map(v => v.toUpperCase()).sort();
  const b = [...correct].map(v => v.toUpperCase()).sort();
  return a.every((value, index) => value === b[index]);
}

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
