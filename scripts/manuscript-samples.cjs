const additionalLiterary = require('../data/literature/kumo-no-ito.json');
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
  ['間抜', 'ま｜ぬ'], ['犍陀多', 'かん｜だ｜た']]);
function splitReadings(marked) {
  return marked.replace(/\[\[([^|]+)\|([^\]]+)\]\]/gu, (whole, base, reading) => {
    const split = characterReadings.get(base);
    if (!split) return whole;
    if (split.replaceAll('｜', '') !== reading) throw Error('Sample reading changed: ' + base);
    return `[[${base}|${split}]]`;
  });
}

const previousSamples = [
  { sampleId: additionalLiterary.id, title: '蜘蛛の糸 — 芥川龍之介', font: 'mincho',
    ...unmark('　　' + additionalLiterary.title + '\n' + '　'.repeat(14) + additionalLiterary.author + '\n' + splitReadings(additionalLiterary.markedBody)) },
  { sampleId: chumon.id, title: '注文の多い料理店 — 宮沢賢治', font: 'mincho',
    ...unmark('　　' + chumon.title + '\n' + '　'.repeat(14) + chumon.author + '\n' + splitReadings(chumon.markedBody)) }
];
const literatureOrder = [chumon.id, additionalLiterary.id];
const samples = [
  { sampleId: 'guide', title: 'はじめに', font: 'mincho', ...unmark(require('../data/guide.cjs')) },
  ...literatureOrder.map(id => previousSamples.find(sample => sample.sampleId === id))
];

// What the in-app sources dialog lists: the colophon Aozora Bunko asks reusers
// to keep, the library card, and what this app changed.
const notice = [
  '見本の作品', '',
  chumon.title + '／' + chumon.author,
  '底本：「' + chumon.baseBook + '」' + chumon.publisher, chumon.baseEdition,
  '入力：' + chumon.inputBy, '校正：' + chumon.proofreadBy.join('、'), '2005年1月26日作成',
  chumon.originNotice, '図書カード：' + chumon.cardUrl,
  '変更：看板の字下げを全角空白に置き換え、題名と著者名の2行を加えました。', '',
  additionalLiterary.title + '／' + additionalLiterary.author,
  '底本：「' + additionalLiterary.baseBook + '」' + additionalLiterary.publisher, additionalLiterary.baseEdition,
  '入力：' + additionalLiterary.inputBy, '校正：' + additionalLiterary.proofreadBy.join('、'), '1997年11月10日公開、2011年1月28日修正',
  additionalLiterary.originNotice, '図書カード：' + additionalLiterary.cardUrl,
  '変更：章見出しと末尾の日付の字下げを全角空白に、外字1字を「犍」に置き換え、題名と著者名の2行を加えました。', ''
].join('\n');

module.exports = { samples, additionalLiterary, chumon, notice, unmark };
