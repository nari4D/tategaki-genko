const sangetsuki = require('../data/literature/sangetsuki.json');
const chumon = require('../data/literature/chumon-no-oi-ryoriten.json');

function unmark(marked) {
  let text = '', cursor = 0;
  const rubies = [];
  for (const match of marked.matchAll(/\[\[([^|]+)\|([^\]]+)\]\]/gu)) {
    text += marked.slice(cursor, match.index);
    const start = text.length, base = match[1], readings = match[2].split('｜');
    text += base;
    if (readings.length === 1) rubies.push({ start, end: text.length, text: readings[0] });
    else {
      const parts = [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(base)];
      if (parts.length !== readings.length || readings.some(x => !x)) throw Error('Invalid sample ruby: ' + base);
      parts.forEach((part, i) => rubies.push({ start: start + part.index, end: start + part.index + part.segment.length, text: readings[i] }));
    }
    cursor = match.index + match[0].length;
  }
  return { text: text + marked.slice(cursor), rubies };
}

// These sample words cross a column, where a whole-word reading is not shown.
// Their per-character readings are standard; never split other words by guess.
const characterReadings = new Map([['見舞', 'み｜まい'], ['大歓迎', 'だい｜かん｜げい'], ['支度', 'し｜たく'],
  ['間抜', 'ま｜ぬ'], ['容貌', 'よう｜ぼう'], ['豊頬', 'ほう｜きょう'], ['汝水', 'じょ｜すい']]);
function splitReadings(marked) {
  return marked.replace(/\[\[([^|]+)\|([^\]]+)\]\]/gu, (whole, base, reading) => {
    const split = characterReadings.get(base);
    if (!split) return whole;
    if (split.replaceAll('｜', '') !== reading) throw Error('Sample reading changed: ' + base);
    return `[[${base}|${split}]]`;
  });
}

const previousSamples = [
  { sampleId: sangetsuki.id, title: '山月記 — 中島敦', font: 'mincho',
    ...unmark('　　' + sangetsuki.title + '\n' + '　'.repeat(14) + sangetsuki.author + '\n' + splitReadings(sangetsuki.markedBody)) },
  { sampleId: chumon.id, title: '注文の多い料理店 — 宮沢賢治', font: 'mincho',
    ...unmark('　　' + chumon.title + '\n' + '　'.repeat(14) + chumon.author + '\n' + splitReadings(chumon.markedBody)) }
];
const literatureOrder = [chumon.id, sangetsuki.id];
const samples = [
  { sampleId: 'guide', title: 'はじめに', font: 'mincho', ...unmark(require('../data/guide.cjs')) },
  ...literatureOrder.map(id => previousSamples.find(sample => sample.sampleId === id))
];

// The in-app sources dialog: only where the sample texts come from.
const notice = [
  '見本の作品', '',
  chumon.title + '（' + chumon.author + '）',
  sangetsuki.title + '（' + sangetsuki.author + '）',
  '出典：青空文庫（https://www.aozora.gr.jp/）', ''
].join('\n');

module.exports = { samples, sangetsuki, chumon, notice, unmark };
