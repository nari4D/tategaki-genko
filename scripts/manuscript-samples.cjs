const literary = require('../data/literature/kyonen-no-ki.json');
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

const body = unmark(literary.markedBody);
if ([...body.text.replaceAll('\n', '')].length !== literary.bodyCharacters) throw Error('Literary sample character count changed');
const previousSamples = [
  { sampleId: literary.id, title: '去年の木 — 新美南吉', font: 'mincho',
    ...unmark('　　' + literary.title + '\n' + '　'.repeat(14) + literary.author + '\n' + literary.markedBody) },
  { sampleId: additionalLiterary.id, title: '蜘蛛の糸 — 芥川龍之介', font: 'mincho',
    ...unmark('　　' + additionalLiterary.title + '\n' + '　'.repeat(14) + additionalLiterary.author + '\n' + splitReadings(additionalLiterary.markedBody)) },
  { sampleId: chumon.id, title: '注文の多い料理店 — 宮沢賢治', font: 'mincho',
    ...unmark('　　' + chumon.title + '\n' + '　'.repeat(14) + chumon.author + '\n' + splitReadings(chumon.markedBody)) },
  { sampleId: 'check-punctuation', title: '確認用：句読点・かっこ', font: 'mincho', ...unmark([
    '「若いころは、京都にも住んでいたそうだよ。」',
    '「あの橋は、ずっとここにあったんだね。」',
    '「手帳には『昔の橋』と書いてあるよ。」',
    '　言葉を探して……私は手帳を閉じた。',
    '　川の向こうへ――新しい橋が伸びていた。',
    '　説明（写真は昭和初期のもの）を読み直した。'
  ].join('\n')) },
  { sampleId: 'check-ruby', title: '確認用：ふりがな', font: 'mincho', ...unmark([
    '　[[湖|みずうみ]]を渡る舟を見ながら、祖父の[[志|こころざし]]を聞いた。',
    '　[[交通安全|こう｜つう｜あん｜ぜん]]への願いを、町の本にまとめる。',
    '　[[温故知新|おん｜こ｜ち｜しん]]という言葉を手帳に書いた。',
    '　[[今日|きょう]]は庭の[[向日葵|ひまわり]]を描いた。',
    '　私たちは古い橋の写真を探すため町から[[京都|きょう｜と]]へ向かった。'
  ].join('\n')) }
];
const retiredSamples = previousSamples.filter(sample => sample.sampleId.startsWith('check-'));
const literatureOrder = [chumon.id, additionalLiterary.id, literary.id];
const samples = [
  { sampleId: 'guide', title: 'はじめに', font: 'mincho', ...unmark(require('../data/guide.cjs')) },
  ...literatureOrder.map(id => previousSamples.find(sample => sample.sampleId === id)),
  { sampleId: 'check-layout', title: '確認用：原稿用紙とふりがな', font: 'mincho', ...unmark(require('../data/manuscript-check.cjs')) }
];

const notice = [
  '標準見本の出典', '', literary.title + '／' + literary.author,
  '図書カード：' + literary.cardUrl, '本文：' + literary.textUrl,
  '底本：「' + literary.baseBook + '」' + literary.publisher,
  literary.baseEdition, '底本の親本：「' + literary.parentBook + '」',
  '入力：' + literary.inputBy, '校正：' + literary.proofreadBy.join('、'),
  '2003年9月29日作成', literary.originNotice, '',
  'このアプリでの変換：' + literary.conversion, '',
  '新美南吉は1943年3月22日没。本作品は日本で著作権保護期間が満了した作品です。',
  '青空文庫の収録ファイルの取り扱い規準：' + literary.reuseUrl,
  '本作品の本文・青空文庫由来のデータに、アプリ独自の外部再配布禁止条件は付しません。',
  '図書カードの書誌データ：青空文庫、CC BY 4.0（https://creativecommons.org/licenses/by/4.0/）。',
  '青空文庫は本アプリの制作・公認に関与していません。', '',
  additionalLiterary.title + '／' + additionalLiterary.author,
  '図書カード：' + additionalLiterary.cardUrl, '本文：' + additionalLiterary.textUrl,
  '底本：「' + additionalLiterary.baseBook + '」' + additionalLiterary.publisher,
  additionalLiterary.baseEdition, '親本：' + additionalLiterary.parentBook,
  '入力：' + additionalLiterary.inputBy, '校正：' + additionalLiterary.proofreadBy.join('、'),
  '1997年11月10日公開、2011年1月28日修正', additionalLiterary.originNotice,
  'このアプリでの変換：' + additionalLiterary.conversion,
  '芥川龍之介は1927年7月24日没。本作品は日本で著作権保護期間が満了した作品です。',
  '青空文庫の収録ファイルの取り扱い規準：' + additionalLiterary.reuseUrl,
  '本作品の本文・青空文庫由来のデータにも、アプリ独自の外部再配布禁止条件は付しません。', '',
  chumon.title + '／' + chumon.author,
  '図書カード：' + chumon.cardUrl, '本文：' + chumon.textUrl,
  '底本：「' + chumon.baseBook + '」' + chumon.publisher, chumon.baseEdition,
  '初出：' + chumon.firstPublished, '入力：' + chumon.inputBy, '校正：' + chumon.proofreadBy.join('、'),
  '2005年1月26日作成', chumon.originNotice,
  'このアプリでの変換：' + chumon.conversion,
  '宮沢賢治は1933年9月21日没。本作品は日本で著作権保護期間が満了した作品です。',
  '青空文庫の収録ファイルの取り扱い規準：' + chumon.reuseUrl,
  '本作品の本文・青空文庫由来のデータにも、アプリ独自の外部再配布禁止条件は付しません。', '',
  '「確認用：原稿用紙とふりがな」は本アプリの表示確認用に作成した文章です。',
  '確認用原稿の文字位置やルビの区切りは検査のための指定であり、文学作品の原文ではありません。', ''
].join('\n');

module.exports = { samples, retiredSamples, literary, additionalLiterary, chumon, body, notice, unmark };
