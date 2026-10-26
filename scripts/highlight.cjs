// Syntax colouring for the source pages, done at build time so the site loads no
// scripts. Classes: c comment, s string, k keyword, n number, t tag or at-rule,
// a attribute, property or JSON key. Returns one HTML string per source line.
const esc = text => text.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

const jsKeywords = 'const|let|var|function|return|if|else|for|while|do|of|in|new|class|extends|this|throw|try|catch|finally|switch|case|break|continue|default|typeof|instanceof|await|async|yield|null|undefined|true|false|delete|void|import|export|from';
const rules = {
  js: [
    ['c', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
    ['s', /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\[\s\S]|[^`\\])*`/y],
    ['k', new RegExp(`(?:${jsKeywords})(?![\\w$])`, 'y')],
    ['', /[A-Za-z_$][\w$]*/y],
    ['n', /0x[\da-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?/y]
  ],
  css: [
    ['c', /\/\*[\s\S]*?\*\//y],
    ['s', /'[^'\n]*'|"[^"\n]*"/y],
    ['t', /@[\w-]+/y],
    ['a', /(?<=[{;]\s*)-*[a-zA-Z][\w-]*(?=\s*:)/y],
    ['', /-*[A-Za-z_][\w-]*/y],
    ['n', /#[\da-fA-F]{3,8}\b|\d*\.?\d+(?:px|em|rem|mm|vh|vw|svh|deg|ms|s|fr|%)?/y]
  ],
  html: [
    ['c', /<!--[\s\S]*?-->/y],
    ['t', /<\/?[\w-]+|\/?>/y],
    ['s', /"[^"]*"|'[^']*'/y],
    ['a', /[\w:-]+(?==)/y]
  ],
  json: [
    ['a', /"(?:\\.|[^"\\])*"(?=\s*:)/y],
    ['s', /"(?:\\.|[^"\\])*"/y],
    ['k', /(?:true|false|null)\b/y],
    ['n', /-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/y]
  ]
};
const languageOf = file => ({ '.js': 'js', '.cjs': 'js', '.css': 'css', '.html': 'html', '.json': 'json' })[file.match(/\.\w+$/)?.[0]];

function highlight(text, file) {
  const list = rules[languageOf(file)] || [], tokens = [];
  let plain = '';
  const flush = () => { if (plain) tokens.push(['', plain]); plain = ''; };
  for (let at = 0; at < text.length;) {
    let hit = null;
    for (const [cls, re] of list) {
      re.lastIndex = at;
      const m = re.exec(text);
      if (m && m[0]) { hit = [cls, m[0]]; break; }
    }
    if (!hit) { plain += text[at++]; continue; }
    if (hit[0]) { flush(); tokens.push(hit); } else plain += hit[1];
    at += hit[1].length;
  }
  flush();
  // Split tokens at line breaks so every line is closed HTML on its own.
  const lines = [''];
  for (const [cls, value] of tokens) value.split('\n').forEach((part, i) => {
    if (i) lines.push('');
    if (part) lines[lines.length - 1] += cls ? `<span class="${cls}">${esc(part)}</span>` : esc(part);
  });
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

module.exports = { highlight, languageOf };
