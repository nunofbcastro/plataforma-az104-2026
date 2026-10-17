import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { extractJsonBlocks, isCommandOnly, technicalTokens } from '../src/lib/technical-content.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['public/data/questions.json', 'src/data/authored-questions.json'];
for (const name of await readdir(resolve(root, 'src/data/authored'))) {
  if (name.endsWith('.json')) files.push(`src/data/authored/${name}`);
}

const errors = [];
let questionCount = 0;
let commandCount = 0;
let jsonCount = 0;
const ids = new Set();
for (const file of files) {
  const questions = JSON.parse((await readFile(resolve(root, file), 'utf8')).replace(/^\uFEFF/, ''));
  for (const question of questions) {
    questionCount++;
    const id = String(question.id);
    if (ids.has(id)) errors.push(`${id}: identificador repetido`);
    ids.add(id);
    const pairs = [
      ['pergunta', question.pergunta, question.pergunta_en],
      ...question.opcoes.map(option => [`opção ${option.letra}`, option.texto, option.texto_en]),
    ];
    for (const [field, pt, en] of pairs) {
      if (!en) continue;
      if (field !== 'pergunta' && isCommandOnly(en)) {
        commandCount++;
        if (String(pt).trim() !== en.trim()) errors.push(`${id} / ${field}: sintaxe diferente do comando original`);
      }
      for (const token of technicalTokens(en)) {
        if (!String(pt || '').toLowerCase().includes(token.toLowerCase())) {
          errors.push(`${id} / ${field}: token técnico ausente ou traduzido: ${token}`);
        }
      }
      const originals = extractJsonBlocks(en);
      if (!originals.length) continue;
      const translated = extractJsonBlocks(pt);
      if (originals.length !== translated.length) {
        errors.push(`${id} / ${field}: quantidade de blocos JSON diferente do original`);
        continue;
      }
      originals.forEach((block, i) => {
        jsonCount++;
        try {
          const expected = JSON.parse(block.text);
          const actual = JSON.parse(translated[i].text);
          if (JSON.stringify(expected) !== JSON.stringify(actual)) errors.push(`${id} / ${field}: propriedades ou valores JSON foram traduzidos`);
        } catch {
          if (block.text !== translated[i].text) errors.push(`${id} / ${field}: bloco de código diferente do original`);
        }
      });
    }
    const letters = new Set(question.opcoes.map(option => option.letra));
    if (!question.opcao_correta?.length || question.opcao_correta.some(letter => !letters.has(letter))) {
      errors.push(`${id}: resposta aponta para uma opção inexistente`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problemas em ${questionCount} questões.`);
  process.exitCode = 1;
} else {
  console.log(`${questionCount} questões verificadas: ${commandCount} opções técnicas e ${jsonCount} blocos JSON preservados. IDs e referências de resposta válidos.`);
}
