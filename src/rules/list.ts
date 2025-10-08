import SimpleMarkdown, { type ParserRule } from '@khanacademy/simple-markdown';
import { extend } from '../utils/extend';

const LIST_BULLET = '(?:[*-]|\\d+\\.)';
const LIST_LOOKBEHIND_R = /(?:^|\n)( *)$/;
const LIST_R = new RegExp(
  '^( *)(' + LIST_BULLET + ') ' +
  '[\\s\\S]+?(?:' +
    '\n{2,}(?! )' +
    '(?!\\1' + LIST_BULLET + ' )\\n*' +
    '|\\s*\\n*$' +
  ')'
);

// same as lodash.escapeRegExp, but tiny
const rx = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const BLOCK_START_R = /^(?:#{1,6}\s|>|\s*```|(?:-{3,}|\*{3,}|_{3,})\s*$)/;

function trimListBlock(block: string, baseIndent: string): string {
  const lines = block.split('\n');
  const bulletR = new RegExp('^' + rx(baseIndent) + '(' + LIST_BULLET + ')\\s');
  const hrR = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;

  let cutAt = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;        // blank lines are allowed
    if (bulletR.test(l)) continue;        // next list item
    if (/^\s/.test(l)) continue;          // indented continuation
    if (BLOCK_START_R.test(l) || hrR.test(l)) { cutAt = i; break; }
    cutAt = i; break;                      // unindented, non-list → stop
  }
  return lines.slice(0, cutAt).join('\n').replace(/\n+$/, '');
}

export const list: ParserRule = extend(
  {
    match: (source, state) => {
      const prev = state.prevCapture ? state.prevCapture[0] : '';
      const lb = LIST_LOOKBEHIND_R.exec(prev);
      const inline = state.prevCapture !== null && state.prevCapture.slice(-1)[0] !== '\n';
      const listContext = (state as any)._list || !inline;
      if (!lb || !listContext) return null;

      const injected = lb[1] ?? '';
      const probe = injected + source;
      const m = LIST_R.exec(probe);
      if (!m) return null;

      const trimmed = trimListBlock(m[0].slice(injected.length), m[1]);
      if (!trimmed) return null;

      const out: RegExpExecArray = Object.assign([], m) as RegExpExecArray;
      out.index = 0;
      out.input = source;
      out[0] = trimmed;

      if (typeof out[1] === 'string') out[1] = out[1].slice(injected.length);

      // swallow one boundary newline unless the next line starts a block
      const rest = source.slice(trimmed.length);
      const hasNL = rest.startsWith('\r\n') || rest.startsWith('\n') || rest.startsWith('\r');
      if (hasNL) {
        const nl = rest.startsWith('\r\n') ? '\r\n' : rest[0];
        const nextLine = rest.slice(nl.length).split('\n', 1)[0] ?? '';
        if (!BLOCK_START_R.test(nextLine)) out[0] += nl;
      }

      return out;
    },
  },
  SimpleMarkdown.defaultRules.list
);
