const COMMAND_START = /^(?:(?:az|azcopy|docker|kubectl|dotnet|bicep|pwsh|powershell)\s|(?:Add|Connect|ConvertFrom|ConvertTo|Copy|Disable|Enable|Export|Format|Get|Import|Install|Invoke|Move|New|Out|Register|Remove|Select|Set|Start|Stop|Test|Unregister|Update)-[A-Za-z]|\$[A-Za-z]\w*\s*=|--?[A-Za-z][\w-]*\b)/i;
const PROSE = /\s(?:and|or|only|command|e|ou|é|está|porque)\s/i;

export function isCommandOnly(text) {
  const value = String(text || '').trim();
  return COMMAND_START.test(value) && !PROSE.test(value);
}

// Read outer JSON containers without being confused by braces inside strings.
// Parsing happens separately: translated JSON can be invalid (for example, "nulo").
export function extractJsonBlocks(text) {
  const value = String(text || '');
  const result = [];
  const starts = /^[\t ]*(?:\{|\[(?=\s*(?:[\[{"\]0-9-]|true\b|false\b|null\b)))/gm;
  let match;
  while ((match = starts.exec(value))) {
    const start = match.index + match[0].search(/[\[{]/);
    const stack = [];
    let quoted = false;
    let escaped = false;
    for (let i = start; i < value.length; i++) {
      const char = value[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        const open = stack.pop();
        if ((char === '}' && open !== '{') || (char === ']' && open !== '[')) break;
        if (!stack.length) {
          result.push({ start, end: i + 1, text: value.slice(start, i + 1) });
          starts.lastIndex = i + 1;
          break;
        }
      }
    }
  }
  return result;
}

export function technicalTokens(text) {
  const value = String(text || '');
  const cmdlets = value.match(/\b(?:Add|Connect|ConvertFrom|ConvertTo|Copy|Disable|Enable|Export|Format|Get|Import|Install|Invoke|Move|New|Out|Register|Remove|Select|Set|Start|Stop|Test|Unregister|Update)-[A-Za-z][A-Za-z0-9-]+\b/g) || [];
  const cli = value.match(/\b(?:az(?:\s+[a-z][a-z-]+){2,3}|(?:azcopy|docker|kubectl)\s+[a-z][a-z-]+)\b/g) || [];
  const parameters = value.match(/(?<![\w/])-{1,2}[a-zA-Z][\w-]{2,}\b/g) || [];
  return [...new Set([...cmdlets, ...cli, ...parameters])];
}
