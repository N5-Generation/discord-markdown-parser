import SimpleMarkdown, { type ParserRule } from '@khanacademy/simple-markdown';
import { extend } from '../utils/extend';

// Only allow "*", "-" or "1." as bullets (no "+")
const LIST_BULLET = '(?:[*-]|\\d+\\.)';
const LIST_LOOKBEHIND_R = /(?:^|\n)( *)$/;

const LIST_R = new RegExp(
  '^( *)(' +
    LIST_BULLET +
    ') ' +
    '[\\s\\S]+?(?:\n{2,}(?! )' +
    '(?!\\1' +
    LIST_BULLET +
    ' )\\n*' +
    '|\\s*\n*$)'
);

export const list: ParserRule = extend(
  {
    match: (source, state) => {
      const prev = state.prevCapture == null ? '' : state.prevCapture[0];
      const lb = LIST_LOOKBEHIND_R.exec(prev);

      const isInlineContext = state.prevCapture !== null && state.prevCapture.slice(-1)[0] !== '\n';
      const isListBlock = (state as any)._list || !isInlineContext;

      if (!lb || !isListBlock) return null;

      const injectedIndent = lb[1] ?? '';
      const testSource = injectedIndent + source;
      const m = LIST_R.exec(testSource);
      if (!m) return null;

      // normalize match back to original source
      const full = m[0].slice(injectedIndent.length);
      const out: RegExpExecArray = Object.assign([], m) as RegExpExecArray;
      out.index = 0;
      out.input = source;
      out[0] = full;
      if (typeof out[1] === 'string') {
        out[1] = out[1].slice(injectedIndent.length);
      }
      return out;
    },
  },
  SimpleMarkdown.defaultRules.list
);
