
(() => {
  try {
  window.genkoBoot.stage('画面と描画機能の準備');
  // Each review edition has its own sample storage. Never migrate real manuscripts here.
  const CELL = 28, GAP = 12, CENTER_GAP = 16, ROWS = 20, COLS = 20, LIBRARY_KEY = 'tategaki-genko-chrome-library-v2';
  const ATTACHED_MARK_CENTER = CELL - 3;
  // The overview never shrinks a sheet below a quarter of its size (221px wide).
  const OVERVIEW_MIN_SCALE = .25;
  // Widest Windows IME candidate list allowed for (the prediction list is about 240px).
  const IME_LIST_WIDTH = 320;
  const FONT_OPTIONS = {
  "mincho": {
    "label": "游明朝",
    "css": "\"Yu Mincho\", \"Hiragino Mincho ProN\", \"Noto Serif CJK JP\", serif"
  },
  "gothic": {
    "label": "游ゴシック",
    "css": "\"Yu Gothic\", \"Hiragino Kaku Gothic ProN\", \"Noto Sans CJK JP\", sans-serif"
  },
  "biz-mincho": {
    "label": "BIZ UD明朝",
    "css": "\"BIZ UDMincho Medium\", \"BIZ UDMincho\", \"Yu Mincho\", serif"
  },
  "kyokasho": {
    "label": "UDデジタル教科書体",
    "css": "\"UD Digi Kyokasho N\", \"Yu Mincho\", serif"
  },
  "shippori-b1": {
    "label": "しっぽり明朝B1",
    "css": "\"Shippori Mincho B1\", \"Yu Mincho\", serif"
  },
  "klee-one": {
    "label": "クレー One",
    "css": "\"Klee One\", \"Yu Mincho\", serif"
  },
  "yomogi": {
    "label": "よもぎ",
    "css": "\"Yomogi\", \"Yu Mincho\", serif"
  }
};
  const normalizeFont = value => Object.prototype.hasOwnProperty.call(FONT_OPTIONS, value) ? value : value === 'biz-gothic' ? 'gothic' : 'mincho';
  let COMMA_FONT = '20px ' + FONT_OPTIONS.mincho.css;
  const commaMeasureContext = document.createElement('canvas').getContext('2d');
  const columnRight = column => column * (CELL + GAP) + (column >= COLS / 2 ? CENTER_GAP : 0);
  const input = document.getElementById('input');
  const pages = document.getElementById('pages');
  const name = document.getElementById('name');
  const fontSelect = document.getElementById('manuscript-font');
  const main = document.getElementById('main');
  const panelSide = document.getElementById('panel-side');
  const projectSelect = document.getElementById('project-select');
  const versionsSelect = document.getElementById('versions');
  const countEl = document.getElementById('count');
  const status = document.getElementById('status');
  const overviewToggle = document.getElementById('overview-toggle');
  const pageIndicator = document.getElementById('page-indicator');
  const initialPixelRatio = window.devicePixelRatio || 1;
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja', { granularity: 'grapheme' }) : null;
  const opening = new Set([... '「『（〔［｛〈《【([{｢']);
  const closing = new Set([... '」』）〕］｝〉》】)]}｣']);
  const unbreakableMarks = new Set(['…', '⋯', '‥', '—', '―']);
  const punctuation = new Set(['。', '、']);
  const westernPunctuation = new Set(['.', ',']);
  const verticalKana = new Set([...'ーｰぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ']);
  const rotatedSymbols = new Set(['=', '＝', '-', '‐', '‑', '−', '－', '―', '—', '～', '〜', '<', '>', '＜', '＞']);
  const verticalForm = new Map([
    ['「', '﹁'], ['」', '﹂'], ['『', '﹃'], ['』', '﹄'],
    ['（', '︵'], ['）', '︶'], ['〔', '︹'], ['〕', '︺'],
    ['［', '﹇'], ['］', '﹈'], ['｛', '︷'], ['｝', '︸'],
    ['〈', '︿'], ['〉', '﹀'], ['《', '︽'], ['》', '︾'],
    ['【', '︻'], ['】', '︼'], ['、', '︑'], ['。', '︒'],
    ['(', '︵'], [')', '︶'], ['[', '﹇'], [']', '﹈'],
    ['{', '︷'], ['}', '︸'], ['｢', '﹁'], ['｣', '﹂']
  ]);
  let stops = [];
  let findMatches = [], activeFindIndex = -1;
  const findQuery = document.getElementById('find-query');
  const findCount = document.getElementById('find-count');
  let library;
  // Filled at build time from scripts/manuscript-samples.cjs (data/literature).
  const SAMPLE_CATALOG = /* build: SAMPLE_CATALOG */[];
  // Unedited samples of earlier editions, recognised so they can be retired.
  // Filled at build time from data/chrome/legacy-samples.json.
  const LEGACY_SAMPLES = /* build: LEGACY_SAMPLES */[];
  // Samples withdrawn from the catalog for 1.0.0: 「去年の木」 and the layout check.
  const WITHDRAWN_SAMPLES = ['aozora-4719', 'check-layout'];
  const WITHDRAWN_TITLES = ['去年の木 — 新美南吉', '確認用：原稿用紙とふりがな', '確認用：句読点・かっこ', '確認用：ふりがな'];
  let sampleMigrationPending = false;
  function sampleProject(example) {
    const project = newProject(example.title, example.text);
    project.rubies = example.rubies.map(item => ({ ...item }));
    project.font = normalizeFont(example.font);
    project.sampleId = example.sampleId; project.sampleProtected = true;
    return project;
  }
  function isOriginalSample(project) {
    return !!project?.sampleProtected && SAMPLE_CATALOG.some(sample => sample.sampleId === project.sampleId);
  }
  function isProtectedProject(project) {
    return isOriginalSample(project) || project?.protected === true;
  }
  // A protected original cannot be edited, so it follows the bundled readings.
  // The read-only guide 「はじめに」 also follows the bundled text, so a new
  // version's instructions reach existing users. Drafts and edited copies keep
  // their own text and readings.
  function refreshOriginalSampleRubies(stored) {
    for (const project of stored.projects) {
      const source = project.sampleProtected && SAMPLE_CATALOG.find(sample => sample.sampleId === project.sampleId);
      if (source?.sampleId === 'guide' && (project.text !== source.text || project.title !== source.title)) {
        project.title = source.title; project.text = source.text;
        project.rubies = source.rubies.map(ruby => ({ ...ruby }));
        sampleMigrationPending = true;
        continue;
      }
      if (!source || project.text !== source.text || JSON.stringify(project.rubies) === JSON.stringify(source.rubies)) continue;
      project.rubies = source.rubies.map(ruby => ({ ...ruby }));
      sampleMigrationPending = true;
    }
    return stored;
  }
  function protectSampleLibrary(stored) {
    if (stored.sampleProtectionVersion >= 1) return refreshOriginalSampleRubies(stored);
    const originals = new Set();
    for (const project of stored.projects) {
      const source = SAMPLE_CATALOG.find(sample => sample.sampleId === project.sampleId);
      if (!source) continue;
      const same = project.title === source.title && project.text === source.text &&
        JSON.stringify(project.rubies || []) === JSON.stringify(source.rubies);
      if (same) project.sampleProtected = true;
      else {
        // An edited sample becomes an ordinary draft, never an overwritten original.
        delete project.sampleId; delete project.sampleProtected;
        originals.add(source.sampleId);
      }
      sampleMigrationPending = true;
    }
    for (const id of originals) {
      if (stored.projects.some(project => project.sampleId === id) || stored.projects.length >= SAFETY.newProjects) continue;
      const original = sampleProject(SAMPLE_CATALOG.find(sample => sample.sampleId === id));
      try { archiveBudget([...stored.projects, original]); } catch { continue; }
      stored.projects.push(original);
    }
    stored.sampleProtectionVersion = 1;
    return stored;
  }
  function updateSampleProtection() {
    const project = activeProject(), original = isOriginalSample(project), locked = isProtectedProject(project);
    input.readOnly = locked; name.readOnly = locked;
    document.getElementById('sample-protection').hidden = !locked;
    document.getElementById('sample-protection').textContent = '保護中（書き換えられません）';
    document.getElementById('copy-sample').hidden = !locked;
    document.getElementById('ruby-open').disabled = locked;
    document.getElementById('restore-version').disabled = locked || !activeProject().history.length;
    const button = document.getElementById('toggle-protection');
    button.hidden = original;
    button.textContent = locked ? '保護を解除' : '保護する';
    button.setAttribute('aria-pressed', String(locked));
    button.title = locked ? 'この原稿を編集できるようにします' : '本文・原稿名・ふりがなの編集を止めます';
  }
  function toggleProjectProtection() {
    if (isOriginalSample(activeProject())) return;
    save();
    const project = activeProject();
    project.protected = project.protected !== true;
    updateSampleProtection(); refreshProjectOptions(); persist();
  }
  function createEditableCopy() {
    const source = activeProject();
    if (!isProtectedProject(source) || !canAddProjects(1)) return;
    const copy = newProject(source.title + '（編集用）', source.text);
    copy.font = source.font;
    copy.rubies = source.rubies.map(ruby => ({ ...ruby }));
    copy.history = copyHistory(source);
    try { archiveBudget([...library.projects, copy]); }
    catch (error) { operationProblem(error.message); return; }
    library.projects.push(copy); library.activeId = copy.id;
    showProject(); persist();
    pages.children[pages.children.length - 1]?.scrollIntoView({ block: 'center' });
    render();
    input.focus({ preventScroll: true });
  }
  function prepareImportDraft() {
    if (!isProtectedProject(activeProject())) return true;
    if (!canAddProjects(1)) return false;
    const project = newProject();
    library.projects.push(project); library.activeId = project.id;
    showProject();
    return true;
  }
  function createSampleLibrary() {
    const projects = SAMPLE_CATALOG.map(sampleProject);
    return { version: 2, sampleCatalogVersion: 5, sampleProtectionVersion: 1, activeId: projects[0].id, panelSide: 'right', panelSideVersion: 1, projects };
  }
  function unchangedLegacySample(project) {
    if (project.history.length || project.driveLink || project.protected === true) return false;
    return LEGACY_SAMPLES.some(example => project.title === example.title && project.text === example.text &&
      normalizeFont(project.font) === normalizeFont(example.font) &&
      JSON.stringify(project.rubies || []) === JSON.stringify(example.rubies || []));
  }
  function curateSampleLibrary(stored) {
    if (stored.sampleCatalogVersion >= 5) return stored;
    if (stored.sampleCatalogVersion >= 1) {
      const previousCatalog = stored.sampleCatalogVersion;
      stored.sampleCatalogVersion = 5;
      // Append only the new work; never replace drafts or switch selection.
      const retired = ['check-punctuation', 'check-ruby'];
      if (!stored.projects.some(project => retired.includes(project.sampleId) || WITHDRAWN_SAMPLES.includes(project.sampleId) ||
        SAMPLE_CATALOG.some(sample => sample.sampleId === project.sampleId))) return stored;
      stored.projects = stored.projects.filter(project => {
        if (!retired.includes(project.sampleId)) return true;
        if (unchangedLegacySample(project)) return false;
        delete project.sampleId; delete project.sampleProtected;
        return true;
      });
      for (const [id, introduced] of [['aozora-92', 2], ['aozora-43754', 3], ['guide', 5]]) {
        if (previousCatalog >= introduced || stored.projects.some(project => project.sampleId === id) || stored.projects.length >= SAFETY.newProjects) continue;
        const candidate = sampleProject(SAMPLE_CATALOG.find(sample => sample.sampleId === id));
        try { archiveBudget([...stored.projects, candidate]); } catch { continue; }
        stored.projects.push(candidate);
        sampleMigrationPending = true;
      }
      stored.projects = orderStandardSamples(stored.projects);
      if (!stored.projects.some(project => project.id === stored.activeId)) {
        stored.activeId = (stored.projects.find(project => project.sampleId === 'check-layout') || stored.projects[0]).id;
      }
      sampleMigrationPending = true;
      return stored;
    }
    // Legacy samples predate sampleId. Recognize their exact title AND complete
    // content; a title-only match must never authorize removal of edited text.
    if (!stored.projects.some(project => LEGACY_SAMPLES.some(example => project.title === example.title))) {
      // Mark this in memory too, so an intentionally imported old sample is not
      // mistaken for pre-update clutter at the following restart.
      stored.sampleCatalogVersion = 5;
      return stored;
    }
    const kept = stored.projects.filter(project => !unchangedLegacySample(project));
    for (const example of SAMPLE_CATALOG) {
      if (kept.some(project => project.sampleId === example.sampleId) || kept.length >= SAFETY.newProjects) continue;
      const candidate = sampleProject(example);
      try { archiveBudget([...kept, candidate]); }
      catch { continue; } // User manuscripts and their histories take priority.
      kept.push(candidate);
    }
    stored.projects = orderStandardSamples(kept);
    stored.sampleCatalogVersion = 5;
    if (!kept.some(project => project.id === stored.activeId)) stored.activeId = kept[0].id;
    sampleMigrationPending = true;
    return stored;
  }
  // The withdrawn samples and the check manuscripts shipped only in pre-release
  // builds, so every copy goes, edited or not. Those builds also kept the panel
  // on the left; 1.0.0 moves it to the right once, saved with the next change.
  function withdrawSamples(stored) {
    if (stored.panelSideVersion !== 1) { stored.panelSide = 'right'; stored.panelSideVersion = 1; }
    const kept = stored.projects.filter(project => !WITHDRAWN_SAMPLES.includes(project.sampleId) && !WITHDRAWN_TITLES.includes(project.title));
    if (kept.length === stored.projects.length) return stored;
    stored.projects = kept.length ? kept : [newProject()];
    if (!stored.projects.some(project => project.id === stored.activeId)) stored.activeId = stored.projects[0].id;
    sampleMigrationPending = true;
    return stored;
  }
  function orderStandardSamples(projects) {
    return [...SAMPLE_CATALOG.flatMap(sample => projects.filter(project => project.sampleId === sample.sampleId)),
      ...projects.filter(project => !SAMPLE_CATALOG.some(sample => sample.sampleId === project.sampleId))];
  }

  // These are provisional resource bounds, not manuscript formatting rules.
  // See test-results/chrome-quality-02.md for the Node/DOM measurements.
  // `projects` only validates stored and imported data, so an existing library of
  // up to 200 still loads and saves; new manuscripts (samples included) stop at
  // `newProjects`. Ruby-heavy prose (e.g. Izumi Kyoka) has about 25 rubies a page,
  // so 100 pages need room for well over 2,000.
  // Automatic history: one version per 30 minutes of writing, 48 per manuscript
  // (a whole day of writing). Older files with up to 50 versions still open.
  const HISTORY_LIMIT = 48, AUTO_VERSION_INTERVAL = 30 * 60 * 1000;
  const SAFETY = Object.freeze({ fileBytes: 10000000, textUnits: 40000, pages: 100,
    projects: 200, newProjects: 30, history: 50, rubies: 5000, archiveUnits: 1000000 });
  let originalStored = null, lastStored = null, storageProtected = false;
  let unsavedChanges = false, libraryRevision = 0, readTicket = 0, pendingRead = null;
  let composing = false, renderBlocked = false;
  let boundedLayout = null;
  const recoveryPanel = document.getElementById('recovery-panel');
  const recoveryMessage = document.getElementById('recovery-message');
  const operationStatus = document.getElementById('operation-status');
  function operationProblem(message) {
    operationStatus.textContent = message;
    operationStatus.hidden = !message;
    if (message) document.getElementById('file-status').textContent = '';
  }
  function storageProblem(message) {
    unsavedChanges = true;
    status.hidden = false;
    status.textContent = message;
    recoveryMessage.textContent = message;
    recoveryPanel.hidden = false;
    document.getElementById('recover-original').hidden = originalStored === null;
  }
  function textWithinBounds(text) {
    if (typeof text !== 'string') throw Error('本文が文字列ではありません。');
    if (text.length > SAFETY.textUnits) throw Error('本文が長すぎます。通常の日本語で約4万字までを目安に、原稿を分けてください。');
    if (!boundedLayout || boundedLayout.text !== text) boundedLayout = { text, result: layout(text) };
    if (boundedLayout.result.pageCount > SAFETY.pages) throw Error('改行・空行を含む紙面が100ページを超えます。原稿を分けてください。');
  }
  function archiveBudget(projects) {
    if (!Array.isArray(projects) || !projects.length || projects.length > SAFETY.projects) throw Error('原稿数は1〜200件にしてください。');
    let total = 0;
    for (const project of projects) {
      if (project?.protected !== undefined && typeof project.protected !== 'boolean') throw Error('保護設定のデータが不正です。');
      if (!project || typeof project.title !== 'string' || typeof project.text !== 'string' ||
          !Array.isArray(project.history) || project.history.length > SAFETY.history) throw Error('原稿または編集履歴のデータが不正です（履歴は50件まで）。');
      for (const version of [project, ...project.history]) {
        if (!version || typeof version.title !== 'string' || typeof version.text !== 'string') throw Error('編集履歴のデータが不正です。');
        for (const key of ['font', 'kind', 'id']) if (version[key] != null && typeof version[key] !== 'string') throw Error('原稿の書体・ID・履歴名が不正です。');
        for (const key of ['at', 'updatedAt', 'lastVersionAt']) if (version[key] != null &&
            (typeof version[key] !== 'number' || !Number.isFinite(version[key]))) throw Error('原稿の日時データが不正です。');
        if (version.title.length > 1000) throw Error('原稿名が長すぎます。');
        total += version.title.length + version.text.length;
        const rubies = version.rubies || [];
        if (!Array.isArray(rubies) || rubies.length > SAFETY.rubies) throw Error('ふりがなの件数が多すぎるか、形式が不正です。');
        for (const ruby of rubies) {
          if (!ruby || typeof ruby.text !== 'string' || ruby.text.length > 200) throw Error('ふりがなのデータが大きすぎるか、形式が不正です。');
          total += ruby.text.length;
        }
        if (total > SAFETY.archiveUnits) throw Error('本文・履歴の合計が大きすぎます。原稿を分けて読み込んでください。');
      }
    }
  }
  function validateArchiveProjects(projects, displayLimit = true) {
    archiveBudget(projects);
    // First count all input, then do the more expensive Unicode/layout work.
    for (const project of projects) for (const version of [project, ...project.history]) {
      if (displayLimit) textWithinBounds(version.text);
      normalizeRubies(version.text, version.rubies || []);
    }
    const ids = projects.filter(p => typeof p.id === 'string' && p.id).map(p => p.id);
    if (new Set(ids).size !== ids.length) throw Error('同じIDの原稿が重複しています。');
    return projects;
  }
  function checkFileSize(file, limit = SAFETY.fileBytes) {
    if (!Number.isFinite(file.size) || file.size < 0 || file.size > limit) throw Error(limit / 1000000 + 'MB以下のファイルを選んでください。');
  }
  function rubyBoundaries(text) {
    // A long text asks the segmenter about each offset instead of splitting it all.
    if (text.length <= 2000 || !segmenter) return new Set([0, text.length, ...segments(text).map(part => part.offset)]);
    const iterator = segmenter.segment(text);
    return { has(offset) { return offset === text.length || iterator.containing(offset)?.index === offset; } };
  }
  function beginRead(file, limit) {
    checkFileSize(file, limit);
    return { ticket: ++readTicket, revision: libraryRevision };
  }
  function checkRead(read) {
    if (read.ticket !== readTicket || read.revision !== libraryRevision) throw Error('読み込み中に原稿を編集・切替したか、別のファイルを選びました。現在の原稿を保護するため読み込みを中止しました。');
  }
  function canAddProjects(count) {
    if (library.projects.length + count <= SAFETY.newProjects) return true;
    operationProblem('原稿は30件までです。必要な原稿をJSONで保存してから、不要な原稿を削除してください。');
    return false;
  }
  function protectOversizedRender(error) {
    renderBlocked = true;
    document.body.classList.add('plain-recovery');
    pages.replaceChildren();
    pageViews.length = 0; plan = null;
    stops = [];
    pageIndicator.textContent = '紙面表示を停止';
    operationProblem(error.message + ' 入力内容は切り捨てていません。本文欄で分割するか、JSONで保存してください。');
  }
  window.addEventListener('beforeunload', event => {
    if (unsavedChanges || composing && input.value !== activeProject()?.text) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('storage', event => {
    if (event.key === LIBRARY_KEY && event.newValue !== lastStored) {
      storageProtected = true;
      storageProblem('別の原稿タブで保存先が変更されました。上書きを停止しています。このタブの原稿をJSONで保存してください。');
    }
  });
  input.addEventListener('compositionstart', () => { composing = true; });
  function finishComposition(event) { composing = false; save(event); }
  input.addEventListener('compositionend', finishComposition);
  input.addEventListener('blur', event => { if (composing) finishComposition(event); });
  function manuscriptInput(event) {
    if (event.isComposing) composing = true;
    else if (composing && event.isComposing === false) composing = false;
    save(event);
  }
  function guardInsertion(event, inserted) {
    if (!event.cancelable || composing || event.isComposing || typeof inserted !== 'string') return;
    const candidate = input.value.slice(0, input.selectionStart) + inserted + input.value.slice(input.selectionEnd);
    try { textWithinBounds(candidate); }
    catch (error) { event.preventDefault(); operationProblem(error.message + ' 現在の原稿は変更していません。'); }
  }
  input.addEventListener('beforeinput', event => {
    if (event.inputType?.startsWith('insert')) guardInsertion(event, event.data ?? (event.inputType === 'insertLineBreak' ? '\n' : null));
  });
  input.addEventListener('paste', event => guardInsertion(event, event.clipboardData?.getData('text/plain')));
  document.getElementById('recover-current').addEventListener('click', () => {
    try { saveBackup(); }
    catch (error) { operationProblem('JSON保存を開始できませんでした。' + error.message); }
  });
  document.getElementById('recover-all').addEventListener('click', () => {
    try { saveLibraryBackup(); }
    catch (error) { operationProblem('全原稿のJSON保存を開始できませんでした。' + error.message); }
  });
  document.getElementById('recover-original').addEventListener('click', () => {
    if (originalStored === null) return;
    try { downloadBlob(new Blob([originalStored], { type: 'application/json;charset=utf-8' }), '保存先の元データ_' + backupStamp() + '.json'); }
    catch (error) { operationProblem('元データの保存を開始できませんでした。' + error.message); }
  });
  document.getElementById('retry-storage').addEventListener('click', () => {
    if (storageProtected) {
      try {
        const now = localStorage.getItem(LIBRARY_KEY);
        if (now !== originalStored) throw Error('保存先が別のタブで変わっています。このタブをJSON保存してから、原稿タブを開き直してください。');
        if (originalStored !== null) downloadBlob(new Blob([originalStored], { type: 'application/json;charset=utf-8' }), '保存先の元データ_' + backupStamp() + '.json');
        saveLibraryBackup();
        if (!confirm('元データと現在の全原稿のJSONを、実際にファイルへ保存できたことを確認してください。保存済みなら「OK」で、ブラウザ内の保存先を現在の原稿に置き換えて記録を再開します。')) return;
        lastStored = now; storageProtected = false;
        persist();
      } catch (error) { operationProblem('記録を再開できませんでした。' + error.message); }
    } else persist();
  });

  let overviewMode = false, returnScrollY = 0;
  // VIEWPORT_LAYOUT_20_START: all sizes here are CSS pixels, without DPR compensation.
  function sheetViewportSize(width, height, panelHidden, paperClientWidth = 0) {
    const stacked = width <= 650;
    const panel = panelHidden || stacked ? 0 : 266;
    const innerWidth = paperClientWidth > 0 ? paperClientWidth - 24 : width - 24 - panel - 26;
    const availableWidth = Math.max(1, innerWidth - 2);
    const availableHeight = Math.max(1, height - 52);
    return { scale: Math.max(.001, Math.min(2, availableWidth / 884, availableHeight / 630)), availableWidth };
  }
  // VIEWPORT_LAYOUT_20_END
  function fitPaper() {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const height = document.documentElement.clientHeight || window.innerHeight;
    const paper = document.getElementById('paper-scroll');
    const { scale } = sheetViewportSize(width, height, library?.panelHidden, paper?.clientWidth || 0);
    document.documentElement.style.setProperty('--paper-scale', String(scale));
    document.documentElement.style.setProperty('--paper-height', (630 * scale + 26) + 'px');
  }

  function updatePageIndicator(range) {
    if (!pages.children.length) return;
    // Reading every page's position would lay out every page; two suffice.
    if (!overviewMode) visiblePage = (range || visiblePages()).center;
    pageIndicator.textContent = `${visiblePage + 1} / ${pages.children.length}`;
  }
  let visiblePage = 0, indicatorQueued = false;
  function updateOverviewLayout() {
    if (!overviewMode) return;
    const n = Math.max(1, pages.children.length), gap = 12;
    const width = Math.max(1, (document.documentElement.clientWidth || window.innerWidth) - 48), height = Math.max(1, window.innerHeight - 124);
    let bestColumns = 1, bestScale = 0;
    for (let columns = 1; columns <= n; columns++) {
      const rows = Math.ceil(n / columns);
      const scale = Math.min(1, (width - (columns - 1) * gap) / (columns * 884),
        (height - (rows - 1) * gap) / (rows * 640));
      if (scale > bestScale) { bestScale = scale; bestColumns = columns; }
    }
    // Smaller than this, the pages of a long manuscript cannot be told apart: the
    // overview keeps this size, fits as many across as the window allows, and scrolls.
    if (bestScale < OVERVIEW_MIN_SCALE) {
      bestScale = OVERVIEW_MIN_SCALE;
      bestColumns = Math.max(1, Math.min(n, Math.floor((width + gap) / (884 * bestScale + gap))));
    }
    document.documentElement.style.setProperty('--overview-cols', String(bestColumns));
    document.documentElement.style.setProperty('--overview-scale', String(Math.max(0.01, bestScale * .96)));
  }
  function setOverview(show, targetPage = null) {
    if (show === overviewMode) return;
    if (show) returnScrollY = window.scrollY;
    const current = show ? visiblePages().center : null;
    overviewMode = show;
    if (show) input.blur();
    document.body.classList.toggle('overview-mode', show);
    for (const button of [overviewToggle]) {
      button.textContent = show ? '戻る' : '一覧';
      button.title = show ? '通常表示へ戻る（Esc）' : '全ページを一覧表示';
      button.setAttribute('aria-label', button.title);
    }
    if (show) {
      buildAllPages(); updateOverviewLayout();
      // A long overview scrolls; it opens at the page being written.
      requestAnimationFrame(() => pages.children[current]?.scrollIntoView({ block: 'center' }));
    }
    else {
      render();
      requestAnimationFrame(() => {
        if (targetPage === null) window.scrollTo(0, returnScrollY);
        else pages.children[targetPage]?.scrollIntoView({ block: 'center' });
      });
    }
  }
  // One keystroke splits the same manuscript several times (layout, ruby checks,
  // the character count), so the last few long texts keep their split. Callers
  // never change the returned array.
  const segments = (cache => value => {
    const cached = cache.get(value);
    if (cached) return cached;
    const result = segmenter ? [...segmenter.segment(value)].map(x => ({ text: x.segment, offset: x.index })) : [...value].map((text, i) => ({ text, offset: i }));
    if (value.length > 200) {
      cache.set(value, result);
      if (cache.size > 4) cache.delete(cache.keys().next().value);
    }
    return result;
  })(new Map());
  // RUBY_MODEL_START: UTF-16 offsets match the textarea selection.
  function normalizeRubies(text, items = []) {
    if (!Array.isArray(items)) throw new Error('ルビのデータが不正です。');
    if (items.length > SAFETY.rubies || items.some(item => typeof item?.text !== 'string' || item.text.length > 200) ||
        items.reduce((sum, item) => sum + item.text.length, 0) > SAFETY.textUnits) throw Error('ふりがなのデータ量が上限を超えます。原稿を分けてください。');
    if (!items.length) return [];
    const boundaries = rubyBoundaries(text);
    const result = items.map(item => {
      if (!item || !Number.isInteger(item.start) || !Number.isInteger(item.end) ||
          item.start < 0 || item.end <= item.start || item.end > text.length ||
          !boundaries.has(item.start) || !boundaries.has(item.end) ||
          typeof item.text !== 'string' || !item.text.trim() || /[\r\n]/u.test(item.text) ||
          /[\r\n]/u.test(text.slice(item.start, item.end)) ||
          segments(text.slice(item.start, item.end)).length > ROWS) throw new Error('ルビの範囲・読みが不正です。');
      return { start: item.start, end: item.end, text: item.text.trim() };
    }).sort((a, b) => a.start - b.start);
    if (result.some((item, i) => i > 0 && result[i - 1].end > item.start)) throw new Error('ルビの範囲が重複しています。');
    return result;
  }
  function rebaseRubies(before, after, rubies) {
    if (before === after) return normalizeRubies(after, rubies);
    let start = 0, oldEnd = before.length, newEnd = after.length;
    while (start < oldEnd && start < newEnd && before[start] === after[start]) start++;
    while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) { oldEnd--; newEnd--; }
    const delta = newEnd - oldEnd;
    const afterBoundaries = rubyBoundaries(after);
    return normalizeRubies(after, rubies.flatMap(item => {
      if (item.end <= start) return [{ ...item }];
      if (item.start >= oldEnd) return [{ ...item, start: item.start + delta, end: item.end + delta }];
      return []; // Editing the base removes its reading rather than assigning it to different text.
    }).filter(item => afterBoundaries.has(item.start) && afterBoundaries.has(item.end)));
  }
  // RUBY_MODEL_END
  // Lays out a run of text from the top of a fresh column.
  function layoutRun(value) {
    let page = 0, column = 0, row = 0, wrapped = false;
    const glyphs = [];
    const positions = [{ offset: 0, page, column, row }];
    const nextColumn = automatic => { column++; row = 0; wrapped = automatic; if (column === COLS) { page++; column = 0; } };
    const moveBeforeGlyph = () => {
      nextColumn(false);
      Object.assign(positions[positions.length - 1], { page, column, row });
    };
    let lastCell = null, previous = '';
    const parts = segments(value);
    // Count each run once, rather than repeatedly scanning a long run ahead.
    const runLengths = new Array(parts.length).fill(1);
    for (let i = parts.length - 2; i >= 0; i--) {
      if (unbreakableMarks.has(parts[i].text) && parts[i].text === parts[i + 1].text) {
        runLengths[i] = runLengths[i + 1] + 1;
      }
    }
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const char = part.text;
      if (char === '\n' || char === '\r\n') {
        if (!wrapped) nextColumn(false);
        wrapped = false;
        lastCell = null;
      } else {
        const westernMark = westernPunctuation.has(char) && /^[A-Za-z]$/u.test(previous);
        // Each closing bracket keeps its own cell. Reserve the preceding base
        // with a following bracket run instead of squeezing them into one cell.
        if (!closing.has(char)) {
          const followingIndex = i + 1;
          const punctuationCell = punctuation.has(parts[followingIndex]?.text) ? 1 : 0;
          let trailing = 0;
          while (closing.has(parts[followingIndex + punctuationCell + trailing]?.text)) trailing++;
          const needed = 1 + punctuationCell + trailing - (punctuationCell && trailing === 1 ? 1 : 0);
          const punctuationPair = punctuation.has(char) && trailing === 1;
          if (trailing > 1 && !punctuationPair && row > 0 && needed <= ROWS && needed > ROWS - row) moveBeforeGlyph();
        }
        if (unbreakableMarks.has(char) && char !== previous && row > 0 && runLengths[i] > ROWS - row) {
          moveBeforeGlyph();
        }
        if (row === ROWS - 1 && opening.has(char)) moveBeforeGlyph();
        const shareWithPrevious = closing.has(char) && punctuation.has(previous) && lastCell && !closing.has(parts[i + 1]?.text);
        const avoidLineHead = row === 0 && wrapped && lastCell && (punctuation.has(char) || westernMark || closing.has(char) && !closing.has(parts[i + 1]?.text));
        if (shareWithPrevious || avoidLineHead) {
          const cornerAttached = !!(avoidLineHead && (closing.has(char) || punctuation.has(char) && closing.has(parts[i + 1]?.text) && !closing.has(parts[i + 2]?.text)) || closing.has(char) && glyphs.at(-1)?.cornerAttached);
          glyphs.push({ text: char, ...lastCell, attached: true, westernMark, start: part.offset, end: part.offset + char.length, ...(cornerAttached ? { cornerAttached: true } : {}) });
        } else {
          lastCell = { page, column, row };
          glyphs.push({ text: char, ...lastCell, attached: false, westernMark, start: part.offset, end: part.offset + char.length });
          wrapped = false;
          row++;
          if (row === ROWS) nextColumn(true);
        }
      }
      previous = char;
      positions.push({ offset: part.offset + part.text.length, page, column, row });
    }
    // The character count shown in the panel: every cell but spaces.
    const characters = glyphs.reduce((sum, item) => sum + (/^\s+$/u.test(item.text) ? 0 : 1), 0);
    return { glyphs, positions, page, column, row, wrapped, characters };
  }
  function finishLayout({ glyphs, positions, page, column, wrapped, characters }) {
    // A cursor just after the last cell does not require an empty manuscript page.
    // Explicit line breaks still retain their intended blank columns/pages.
    const pageCount = Math.max(1, page + 1 - (wrapped && column === 0 ? 1 : 0));
    for (const position of positions) {
      if (position.page >= pageCount) {
        Object.assign(position, { page: pageCount - 1, column: COLS - 1, row: ROWS });
      }
    }
    return { glyphs, positions, pageCount, characters };
  }
  // After a line break the next paragraph starts at the top of a fresh column with
  // nothing carried over, so each paragraph's run is kept and only edited
  // paragraphs are laid out again; the runs are joined by column number. The
  // result is the same as laying out the whole text at once (see the tests).
  const paragraphRuns = new Map();
  function layout(value) {
    if (value.length < 2000 || value.includes('\r')) return finishLayout(layoutRun(value));
    const glyphs = [], positions = [{ offset: 0, page: 0, column: 0, row: 0 }], used = new Map();
    let base = 0, offset = 0, row = 0, wrapped = false, characters = 0;
    value.split('\n').forEach((text, index) => {
      if (index) {
        if (!wrapped) base++;
        row = 0; wrapped = false; offset++;
        positions.push({ offset, page: Math.floor(base / COLS), column: base % COLS, row: 0 });
      }
      const run = used.get(text) || paragraphRuns.get(text) || layoutRun(text);
      used.set(text, run);
      for (const item of run.glyphs) {
        const at = base + item.page * COLS + item.column;
        glyphs.push({ ...item, page: Math.floor(at / COLS), column: at % COLS, start: item.start + offset, end: item.end + offset });
      }
      for (let i = 1; i < run.positions.length; i++) {
        const position = run.positions[i], at = base + position.page * COLS + position.column;
        positions.push({ offset: position.offset + offset, page: Math.floor(at / COLS), column: at % COLS, row: position.row });
      }
      base += run.page * COLS + run.column; row = run.row; wrapped = run.wrapped; characters += run.characters;
      offset += text.length;
    });
    paragraphRuns.clear();
    for (const [text, run] of used) paragraphRuns.set(text, run);
    return finishLayout({ glyphs, positions, page: Math.floor(base / COLS), column: base % COLS, wrapped, characters });
  }
  // Ruby annotates the established body layout; it must never move body cells.
  // A separator is an explicit user-supplied reading boundary, never guessed.
  function readingAnnotations(selection, reading) {
    const parts = String(reading).split(/[|｜]/u).map(part => part.trim());
    if (parts.length === 1) return normalizeRubies(selection.base, [{ start: 0, end: selection.base.length, text: parts[0] }])
      .map(item => ({ ...item, start: item.start + selection.start, end: item.end + selection.start }));
    const bases = segments(selection.base);
    if (parts.length !== bases.length || parts.some(part => !part)) throw new Error('文字ごとに読みを指定してください。例：京都 → きょう｜と（2文字に2つの読み）');
    return normalizeRubies(selection.base, bases.map((base, i) => ({ start: base.offset, end: base.offset + base.text.length, text: parts[i] })))
      .map(item => ({ ...item, start: item.start + selection.start, end: item.end + selection.start }));
  }
  function readingForSelection(selection, annotations) {
    if (!annotations.length || annotations[0].start !== selection.start || annotations.at(-1).end !== selection.end) return '';
    if (annotations.some((item, i) => i > 0 && annotations[i - 1].end !== item.start)) return '';
    if (annotations.length === 1) return annotations[0].text;
    if (annotations.every(item => segments(selection.base.slice(item.start - selection.start, item.end - selection.start)).length === 1)) {
      return annotations.map(item => item.text).join('｜');
    }
    return ''; // Don't silently erase mixed group/character annotation boundaries.
  }
  function buildRubyRuns(value, rubies, glyphs) {
    const indexByStart = new Map(glyphs.map((glyph, index) => [glyph.start, index]));
    const runs = [];
    for (const ruby of rubies) {
      const start = indexByStart.get(ruby.start);
      if (start === undefined) continue;
      const bases = [];
      for (let i = start; i < glyphs.length && glyphs[i].start < ruby.end; i++) bases.push(glyphs[i]);
      if (!bases.length) continue;
      const first = bases[0], last = bases.at(-1);
      const needsSplit = first.page !== last.page || first.column !== last.column;
      const letters = segments(ruby.text);
      const height = needsSplit ? CELL : (last.row - first.row + 1) * CELL;
      runs.push({ page: first.page, column: first.column, row: first.row, height,
        text: ruby.text, size: Math.min(10, height / letters.length),
        baseStart: first.start, baseEnd: last.end, rubyStart: ruby.start, needsSplit,
        base: value.slice(ruby.start, ruby.end) });
    }
    return runs;
  }

  function centerAttachedComma(comma) {
    comma.setAttribute('x', '0');
    comma.setAttribute('y', '0');
    if (commaMeasureContext) {
      commaMeasureContext.font = COMMA_FONT;
      const metrics = alternateInk(comma, parseFloat(COMMA_FONT)) || commaMeasureContext.measureText(comma.textContent);
      if (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight > 0 &&
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent > 0) {
        comma.setAttribute('x', String(ATTACHED_MARK_CENTER + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2));
        comma.setAttribute('y', String(ATTACHED_MARK_CENTER + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2));
        return;
      }
    }
    const bounds = comma.getBBox();
    if (!bounds.width || !bounds.height) return;
    comma.setAttribute('x', String(ATTACHED_MARK_CENTER - bounds.x - bounds.width / 2));
    comma.setAttribute('y', String(ATTACHED_MARK_CENTER - bounds.y - bounds.height / 2));
  }
  function centerAllAttachedCommas(root = pages) {
    for (const comma of root.querySelectorAll('.comma-text')) centerAttachedComma(comma);
  }
  // Some families (BIZ UDMincho, UD Digi Kyokasho, Yomogi) have no U+FE10-FE4F
  // code points, only 'vert' alternates of the ordinary characters. Chrome
  // applies 'vert' only in vertical writing mode, so those marks are drawn
  // vertically: an ordinary cell like the small kana, a shared cell as vertical
  // SVG text placed by the same ink-based insets from this font-file table.
  // Vertical-layout ink boxes per em (left, right from the centre line; top,
  // bottom below the vertical origin), from scripts/measure-vertical-alternates.py.
  const VERTICAL_ALTERNATES = /* build: VERTICAL_ALTERNATES */{};
  const verticalAlternateFamilies = new Map();
  function ownFamilyRendered(font) {
    // A missing family falls back to Yu Mincho; then keep the old code points.
    if (!verticalAlternateFamilies.has(font)) {
      let rendered = false;
      try {
        const ink = css => {
          commaMeasureContext.font = '20px ' + css;
          const m = commaMeasureContext.measureText('永あ');
          return [m.actualBoundingBoxLeft, m.actualBoundingBoxRight, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent].join();
        };
        rendered = !!commaMeasureContext && ink(FONT_OPTIONS[font].css) !== ink('"Yu Mincho", serif');
      } catch { rendered = false; }
      verticalAlternateFamilies.set(font, rendered);
    }
    return verticalAlternateFamilies.get(font);
  }
  function setVerticalMark(element, form) {
    const font = normalizeFont(activeProject()?.font), own = VERTICAL_ALTERNATES[font];
    const char = own && [...verticalForm].find(([key, value]) => value === form && own[key])?.[0];
    if (!char || !ownFamilyRendered(font)) element.textContent = form;
    else if (element.namespaceURI === 'http://www.w3.org/2000/svg') {
      element.textContent = char;
      element.classList.add('vertical-alternate');
      element.dataset.inkEm = own[char].join(' ');
    } else {
      const upright = document.createElement('span');
      upright.className = 'vertical-japanese';
      upright.textContent = char;
      element.textContent = '';
      element.classList.add('vertical-alternate');
      element.append(upright);
    }
    return element;
  }
  function alternateInk(element, size) {
    if (!element.dataset.inkEm) return null;
    // As canvas metrics around the text position, which in vertical SVG text
    // is the glyph's vertical origin on its centre line.
    const [left, right, top, bottom] = element.dataset.inkEm.split(' ').map(value => Number(value) * size);
    return { actualBoundingBoxLeft: -left, actualBoundingBoxRight: right, actualBoundingBoxAscent: -top, actualBoundingBoxDescent: bottom };
  }
  function makeSharedCellText(value, { x, y, width, height, size = 20, rotate = false }) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.classList.add('shared-cell-text');
    setVerticalMark(text, value);
    Object.assign(text.dataset, { centerX: x, centerY: y, maxWidth: width, maxHeight: height, fontSize: size, rotate });
    text.style.fill = 'var(--ink)'; text.style.stroke = 'none';
    return text;
  }
  function positionAllSharedCellText(root = pages) {
    const family = FONT_OPTIONS[normalizeFont(activeProject()?.font)].css;
    for (const text of root.querySelectorAll('.shared-cell-text')) {
      const x = Number(text.dataset.centerX), y = Number(text.dataset.centerY);
      const maxWidth = Number(text.dataset.maxWidth), maxHeight = Number(text.dataset.maxHeight);
      const rotate = text.dataset.rotate === 'true';
      let size = Number(text.dataset.fontSize), metrics;
      // Fit by font size only. Never squeeze a bracket along one axis.
      for (let attempt = 0; attempt < 3; attempt++) {
        text.style.font = `${size}px ${family}`;
        if (commaMeasureContext) {
          commaMeasureContext.font = text.style.font;
          metrics = alternateInk(text, size) || commaMeasureContext.measureText(text.textContent);
        } else {
          const box = text.getBBox();
          metrics = { actualBoundingBoxLeft: -box.x, actualBoundingBoxRight: box.x + box.width,
            actualBoundingBoxAscent: -box.y, actualBoundingBoxDescent: box.y + box.height };
        }
        const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        const ratio = Math.min(1, maxWidth / ((rotate ? inkHeight : inkWidth) || 1),
          maxHeight / ((rotate ? inkWidth : inkHeight) || 1));
        if (ratio >= 1 || attempt === 2) break;
        size *= ratio * .98;
      }
      const fittedInkHeight = rotate ? metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
        : metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const centerY = text.dataset.topInset !== undefined ? Number(text.dataset.topInset) + fittedInkHeight / 2
        : text.dataset.bottomInset === undefined ? y : CELL - Number(text.dataset.bottomInset) - fittedInkHeight / 2;
      const fittedInkWidth = rotate ? metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        : metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      const centerX = text.dataset.rightInset === undefined ? x : CELL - Number(text.dataset.rightInset) - fittedInkWidth / 2;
      text.setAttribute('x', String(centerX + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2));
      text.setAttribute('y', String(centerY + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2));
      if (rotate) text.setAttribute('transform', `rotate(90 ${centerX} ${centerY})`);
      else text.removeAttribute('transform');
    }
  }
  function centerWesternMark(mark) {
    const target = mark.closest('svg').dataset.attached === 'true' ? ATTACHED_MARK_CENTER : null;
    const x = target ?? 23, y = target ?? 6;
    mark.setAttribute('x', '0');
    mark.setAttribute('y', '0');
    if (commaMeasureContext) {
      commaMeasureContext.font = COMMA_FONT;
      const metrics = commaMeasureContext.measureText(mark.textContent);
      if (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight > 0 &&
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent > 0) {
        mark.setAttribute('x', String(x + (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2));
        mark.setAttribute('y', String(y + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2));
        return;
      }
    }
    const bounds = mark.getBBox();
    if (!bounds.width || !bounds.height) return;
    mark.setAttribute('x', String(x - bounds.x - bounds.width / 2));
    mark.setAttribute('y', String(y - bounds.y - bounds.height / 2));
  }
  function centerAllWesternMarks(root = pages) {
    for (const mark of root.querySelectorAll('.western-mark-text')) centerWesternMark(mark);
  }
  function searchRanges(value, query) {
    if (!query) return [];
    const matches = [];
    let from = 0, at;
    while ((at = value.indexOf(query, from)) !== -1) {
      matches.push({ start: at, end: at + query.length });
      from = at + query.length;
    }
    return matches;
  }
  function refreshFindMatches() {
    const previousStart = findMatches[activeFindIndex]?.start;
    findMatches = findQuery.value ? searchRanges(input.value, findQuery.value) : [];
    if (!findMatches.length) activeFindIndex = -1;
    else if (previousStart === undefined) activeFindIndex = 0;
    else {
      const same = findMatches.findIndex(match => match.start === previousStart);
      activeFindIndex = same === -1 ? 0 : same;
    }
    findCount.textContent = findMatches.length ? `${activeFindIndex + 1} / ${findMatches.length}` : '0 / 0';
  }
  // Pages persist between renders. Each render plans what every page shows (one
  // key per page) and rebuilds only pages whose key changed. Only the pages near
  // the screen (NEAR_PAGES either side) hold their content: the browser lays out
  // every attached element on each change, so a far page is an empty sheet until
  // it comes near, when its kept content goes back in. Pages on screen and the
  // caret's page are brought up to date at once, the rest of the window while the
  // browser is idle, so a keystroke costs about the same on page 1 and on page 100.
  // Printing and the overview show every page. Without requestIdleCallback (the
  // test DOM model) every page is shown and up to date at once.
  const NEAR_PAGES = 10;
  const pageViews = [];
  let plan = null, idleTask = null, showAllPages = false;
  function pageShell(index) {
    const page = document.createElement('div');
    page.className = 'page';
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.dataset.page = String(index);
    const rules = [];
    for (let column = 0; column < COLS; column++) {
      const rule = document.createElement('div');
      rule.className = 'column-rule';
      rule.style.right = columnRight(column) + 'px';
      rules.push(rule);
    }
    const footer = document.createElement('div');
    footer.className = 'page-footer';
    const dimensions = document.createElement('span');
    dimensions.textContent = '20×20';
    const number = document.createElement('span');
    number.textContent = String(index + 1);
    footer.append(dimensions, number);
    page.append(sheet, footer);
    return { page, sheet, rules, key: null, nodes: [], shown: false };
  }
  function matchPageCount(count) {
    for (const view of pageViews.splice(count)) view.page.remove();
    while (pageViews.length < count) {
      const view = pageShell(pageViews.length);
      pageViews.push(view);
      pages.append(view.page);
    }
  }
  function invalidatePages() { for (const view of pageViews) view.key = null; }
  // First index at or after each page, for items listed in page order.
  function pageStarts(items, pageCount) {
    const starts = new Array(pageCount + 1);
    let at = 0;
    for (let page = 0; page <= pageCount; page++) {
      while (at < items.length && items[at].page < page) at++;
      starts[page] = at;
    }
    return starts;
  }
  const cellKey = item => item.column * ROWS + item.row;
  function pageOverlays(index) {
    const { glyphs } = plan.result, from = plan.glyphStarts[index], to = plan.glyphStarts[index + 1];
    const selected = new Set(), found = new Map();
    if (plan.selectionStart !== plan.selectionEnd) {
      for (let i = from; i < to; i++) {
        const item = glyphs[i];
        if (item.start < plan.selectionEnd && item.end > plan.selectionStart) selected.add(cellKey(item));
      }
    }
    const matches = plan.findMatches;
    if (matches.length && from < to) {
      let low = 0, high = matches.length;
      while (low < high) { const mid = (low + high) >> 1; if (matches[mid].end <= glyphs[from].start) low = mid + 1; else high = mid; }
      let matchIndex = low;
      for (let i = from; i < to; i++) {
        const item = glyphs[i];
        while (matchIndex < matches.length && matches[matchIndex].end <= item.start) matchIndex++;
        for (let m = matchIndex; m < matches.length && matches[m].start < item.end; m++) {
          if (matches[m].end <= item.start) continue;
          const key = cellKey(item), active = m === plan.activeFindIndex;
          if (!found.has(key) || active) found.set(key, active);
        }
      }
    }
    return { selected, found };
  }
  function pageKey(index) {
    const { glyphs } = plan.result, parts = [plan.font];
    for (let i = plan.glyphStarts[index]; i < plan.glyphStarts[index + 1]; i++) {
      const item = glyphs[i];
      parts.push(item.text, cellKey(item), item.attached ? item.cornerAttached ? 2 : 1 : 0, item.westernMark ? 1 : 0);
    }
    for (let i = plan.rubyStarts[index]; i < plan.rubyStarts[index + 1]; i++) {
      const ruby = plan.rubyRuns[i];
      parts.push('r', cellKey(ruby), ruby.height, ruby.size, ruby.text, ruby.needsSplit ? ruby.base : '');
    }
    const { selected, found } = pageOverlays(index);
    parts.push('s', ...selected, 'f', ...[...found].flat());
    if (plan.caret && plan.caret.page === index) parts.push('c', cellKey(plan.caret));
    return parts.join('\u0001');
  }
  function hidePage(index) {
    const view = pageViews[index];
    if (!view.shown) return;
    view.sheet.replaceChildren();
    view.shown = false;
  }
  function buildPage(index) {
    const view = pageViews[index], key = pageKey(index);
    if (view.key === key) {
      if (!view.shown) { view.sheet.replaceChildren(...view.nodes); view.shown = true; }
      return false;
    }
    const { glyphs } = plan.result, from = plan.glyphStarts[index], to = plan.glyphStarts[index + 1];
    const nodes = [...view.rules];
    const { selected, found } = pageOverlays(index);
    const cell = (className, key) => {
      const highlight = document.createElement('span');
      highlight.className = className;
      highlight.style.right = columnRight(Math.floor(key / ROWS)) + 'px';
      highlight.style.top = (key % ROWS * CELL) + 'px';
      return highlight;
    };
    for (const key of selected) nodes.push(cell('selection-cell', key));
    for (const [key, active] of found) nodes.push(cell(active ? 'find-cell find-active' : 'find-cell', key));
    const sharedBodyCells = new Set();
    for (let i = from; i < to; i++) {
      const item = glyphs[i];
      if (!item.attached && !punctuation.has(item.text) && !closing.has(item.text)) sharedBodyCells.add(cellKey(item));
    }
    for (let i = from; i < to; i++) {
      const item = glyphs[i];
      // One renderer and one set of sizes for shared marks at every row.
      // The body character always keeps its ordinary renderer and position.
      if (item.attached && (punctuation.has(item.text) || closing.has(item.text))) {
        // A punctuation-only final cell is still an ordinary cell. Only marks
        // forced into a body character's cell need the line-end placement.
        const sharesBody = sharedBodyCells.has(cellKey(item));
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('attached-mark');
        if (item.cornerAttached) svg.classList.add('corner-mark');
        svg.setAttribute('viewBox', '0 0 28 28');
        svg.style.right = columnRight(item.column) + 'px';
        svg.style.top = (item.row * CELL) + 'px';
        if (item.text === '。') {
          // Use the same font glyph as an ordinary punctuation cell. A drawn
          // circle with an independent stroke makes this period look heavier.
          const period = makeSharedCellText(verticalForm.get(item.text) || item.text, {
            x: ATTACHED_MARK_CENTER, y: ATTACHED_MARK_CENTER, width: CELL, height: CELL, size: 20
          });
          period.classList.add('shared-period-text');
          period.dataset.rightInset = 1;
          if (sharesBody) period.dataset.bottomInset = 1;
          else period.dataset.topInset = 1;
          svg.append(period);
        } else if (item.text === '、') {
          const comma = document.createElementNS(svg.namespaceURI, 'text');
          comma.classList.add('comma-text');
          comma.style.font = COMMA_FONT;
          setVerticalMark(comma, verticalForm.get('、'));
          svg.append(comma);
        } else {
          const bracket = makeSharedCellText(verticalForm.get(item.text) || item.text, {
            x: 8, y: 8, width: 14, height: 14, size: 20
          });
          bracket.classList.add('attached-bracket-text');
          // A key sharing a period's cell stays at the top left, including the
          // final row. A key with its own cell keeps the font's ordinary glyph.
          if (sharesBody) bracket.dataset.bottomInset = 1;
          svg.append(bracket);
        }
        nodes.push(svg);
        continue;
      }
      if (item.westernMark) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('attached-mark');
        svg.setAttribute('viewBox', '0 0 28 28');
        svg.dataset.attached = String(item.attached);
        svg.style.right = columnRight(item.column) + 'px';
        svg.style.top = (item.row * CELL) + 'px';
        const mark = document.createElementNS(svg.namespaceURI, 'text');
        mark.classList.add('western-mark-text');
        mark.style.font = COMMA_FONT;
        mark.textContent = item.text;
        svg.append(mark);
        nodes.push(svg);
        continue;
      }
      const glyph = document.createElement('span');
      glyph.className = 'glyph';
      if (punctuation.has(item.text)) glyph.classList.add('punctuation');
      if (opening.has(item.text) || closing.has(item.text)) glyph.classList.add('bracket');
      if (item.attached) glyph.classList.add('attached');
      if (item.text === '…' || item.text === '⋯') {
        const dots = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        dots.classList.add('vertical-ellipsis');
        dots.setAttribute('viewBox', '0 0 28 28');
        dots.setAttribute('aria-hidden', 'true');
        for (const y of [7, 14, 21]) {
          const dot = document.createElementNS(dots.namespaceURI, 'circle');
          dot.setAttribute('cx', '14'); dot.setAttribute('cy', String(y)); dot.setAttribute('r', '1.5');
          dots.append(dot);
        }
        glyph.append(dots);
      } else if (verticalKana.has(item.text) || rotatedSymbols.has(item.text)) {
        const stroke = document.createElement('span');
        stroke.className = verticalKana.has(item.text) ? 'vertical-japanese' : 'rotated-symbol';
        stroke.textContent = item.text === 'ｰ' ? 'ー' : item.text;
        glyph.append(stroke);
      } else setVerticalMark(glyph, verticalForm.get(item.text) || item.text);
      if (item.attached) {
        glyph.style.width = (CELL / 2) + 'px';
        glyph.style.height = (CELL / 2) + 'px';
        glyph.style.right = (columnRight(item.column) + CELL / 2) + 'px';
        glyph.style.top = (item.row * CELL + CELL / 2) + 'px';
      } else {
        glyph.style.right = columnRight(item.column) + 'px';
        glyph.style.top = (item.row * CELL) + 'px';
      }
      nodes.push(glyph);
    }
    for (let i = plan.rubyStarts[index]; i < plan.rubyStarts[index + 1]; i++) {
      const ruby = plan.rubyRuns[i];
      if (ruby.needsSplit) {
        const marker = document.createElement('span');
        marker.className = 'ruby-run ruby-warning';
        marker.textContent = '※';
        marker.title = ruby.base + '（' + ruby.text + '）：読みの区切りを指定してください';
        marker.style.right = (columnRight(ruby.column) - 11) + 'px';
        marker.style.top = (ruby.row * CELL) + 'px';
        nodes.push(marker);
        continue;
      }
      const run = document.createElement('span');
      run.className = 'ruby-run';
      run.setAttribute('aria-label', ruby.text);
      run.style.right = (columnRight(ruby.column) - 11) + 'px';
      run.style.top = (ruby.row * CELL) + 'px';
      run.style.height = ruby.height + 'px';
      const letters = segments(ruby.text);
      letters.forEach((letter, i) => {
        const span = document.createElement('span');
        span.className = 'ruby-letter';
        span.textContent = letter.text;
        span.style.fontSize = ruby.size + 'px';
        span.style.height = ruby.size + 'px';
        span.style.top = ((i + .5) * ruby.height / letters.length - ruby.size / 2) + 'px';
        run.append(span);
      });
      nodes.push(run);
    }
    if (plan.caret && plan.caret.page === index) {
      const caret = document.createElement('span');
      caret.className = 'cursor';
      caret.style.right = (columnRight(plan.caret.column) + 3) + 'px';
      caret.style.top = (plan.caret.row * CELL + 1) + 'px';
      nodes.push(caret);
    }
    view.sheet.replaceChildren(...nodes);
    centerAllAttachedCommas(view.sheet);
    positionAllSharedCellText(view.sheet);
    centerAllWesternMarks(view.sheet);
    Object.assign(view, { key, nodes, shown: true });
    return true;
  }
  // Pages on screen, from the first page's position and the page pitch.
  function visiblePages() {
    const count = pageViews.length;
    if (!count) return { first: 0, last: -1, center: 0 };
    const top = pageViews[0].page.getBoundingClientRect().top;
    const pitch = count > 1 ? pageViews[1].page.getBoundingClientRect().top - top : 0;
    if (!(pitch > 0)) return { first: 0, last: count - 1, center: 0 };
    const clamp = value => Math.max(0, Math.min(count - 1, Math.floor(value)));
    return { first: clamp(-top / pitch), last: clamp((window.innerHeight - top) / pitch), center: clamp((window.innerHeight / 2 - top) / pitch) };
  }
  // Shows every page, up to date: for printing and the overview.
  function buildAllPages() {
    if (idleTask !== null) { window.cancelIdleCallback?.(idleTask); idleTask = null; }
    if (plan) for (let i = 0; i < pageViews.length; i++) buildPage(i);
  }
  function scheduleIdlePages(order) {
    if (idleTask !== null) window.cancelIdleCallback(idleTask);
    let next = 0;
    const work = deadline => {
      idleTask = null;
      while (next < order.length && (deadline.didTimeout || deadline.timeRemaining() > 2)) buildPage(order[next++]);
      if (next < order.length) idleTask = window.requestIdleCallback(work, { timeout: 200 });
    };
    if (order.length) idleTask = window.requestIdleCallback(work, { timeout: 200 });
  }
  function bringPagesUpToDate(range) {
    if (!plan) return;
    if (typeof window.requestIdleCallback !== 'function' || overviewMode || showAllPages) { buildAllPages(); return; }
    const { first, last, center } = range || visiblePages(), caretPage = plan.caret?.page;
    const from = Math.max(0, first - NEAR_PAGES), to = Math.min(pageViews.length - 1, last + NEAR_PAGES);
    for (let i = 0; i < pageViews.length; i++) if ((i < from || i > to) && i !== caretPage) hidePage(i);
    for (let i = first; i <= last; i++) buildPage(i);
    if (caretPage !== undefined) buildPage(caretPage);
    const rest = [];
    for (let i = from; i <= to; i++) if (i < first || i > last) rest.push(i);
    scheduleIdlePages(rest.sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b));
  }
  function render() {
    try { textWithinBounds(input.value); }
    catch (error) { protectOversizedRender(error); return; }
    if (renderBlocked) { renderBlocked = false; document.body.classList.remove('plain-recovery'); operationProblem(''); }
    const selectedFont = FONT_OPTIONS[normalizeFont(activeProject()?.font)];
    // Setting the font again, even unchanged, makes the browser restyle every page.
    if (pages.style.getPropertyValue?.('--manuscript-font') !== selectedFont.css) pages.style.setProperty('--manuscript-font', selectedFont.css);
    COMMA_FONT = '20px ' + selectedFont.css;
    const title = name.value.trim() || '縦書き原稿用紙';
    if (document.title !== title) document.title = title;
    const currentRubies = composing ? rebaseRubies(activeProject().text, input.value, activeProject().rubies || []) : normalizeRubies(input.value, activeProject()?.rubies || []);
    const result = boundedLayout.result;
    stops = result.positions;
    refreshFindMatches();
    const rubyRuns = buildRubyRuns(input.value, currentRubies, result.glyphs);
    const unresolved = rubyRuns.filter(ruby => ruby.needsSplit);
    const rubyStatus = document.getElementById('ruby-status');
    if (unresolved.length) {
      rubyStatus.dataset.splitWarning = 'true';
      rubyStatus.textContent = unresolved.slice(0, 3).map(ruby => '「' + ruby.base + '」（' + ruby.text + '）').join('、') +
        (unresolved.length > 3 ? ' ほか' : '') + 'は列をまたぎます。本文を選び、文字ごとの読みを「きょう｜と」のように指定してください。※の位置の読みは未表示です。';
    } else if (rubyStatus.dataset.splitWarning === 'true') {
      delete rubyStatus.dataset.splitWarning;
      rubyStatus.textContent = '本文を選択して、ふりがなを変更できます。';
    }
    const selectionStart = input.selectionStart, selectionEnd = input.selectionEnd;
    const offset = input.selectionDirection === 'backward' ? selectionStart : selectionEnd;
    let at = stops[0];
    for (const stop of stops) { if (stop.offset > offset) break; at = stop; }
    plan = { result, rubyRuns, font: selectedFont.css, text: input.value, direction: input.selectionDirection, selectionStart, selectionEnd, findMatches, activeFindIndex,
      caret: document.activeElement === input && selectionStart === selectionEnd ? at : null,
      glyphStarts: pageStarts(result.glyphs, result.pageCount), rubyStarts: pageStarts(rubyRuns, result.pageCount) };
    matchPageCount(result.pageCount);
    // Read positions before changing any page: a page's size never depends on its content.
    const range = visiblePages(), sheetRect = pageViews[at.page].sheet.getBoundingClientRect();
    bringPagesUpToDate(range);
    updateOverviewLayout();
    updatePageIndicator(range);
    const displayScale = sheetRect.width / 804;
    if (!composing) {
      // Windows IME opens its candidate list below the caret, its frame starting
      // left of it by a fixed amount at any paper scale. At +32 px the frame still
      // hid the column's right rule in the user's screen; +36 leaves it visible.
      // The list then covers columns already written, not the text being composed.
      // Where the list has no room on the right (the first columns near the edge of
      // the window, or the ためし書き frame), Windows pushes it back over the column,
      // so it opens on the left instead, over the columns still to be written.
      const columnRightX = sheetRect.right - columnRight(at.column) * displayScale;
      const columnLeftX = columnRightX - CELL * displayScale;
      const roomOnRight = columnRightX + 2 + IME_LIST_WIDTH <= innerWidth;
      input.style.left = (roomOnRight || columnLeftX < IME_LIST_WIDTH ? columnRightX + 36 : columnLeftX - IME_LIST_WIDTH) + 'px';
      input.style.top = (sheetRect.top + at.row * CELL * displayScale) + 'px';
    }
    countEl.textContent = result.characters.toLocaleString('ja-JP');
  }
  const newId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const newProject = (title = '', text = '') => ({ id: newId(), title, text, font: 'mincho', rubies: [], history: [], updatedAt: Date.now(), lastVersionAt: text ? 0 : Date.now() });
  const activeProject = () => library.projects.find(project => project.id === library.activeId);
  function addVersion(project, kind) {
    if (!project.text && !project.title) return;
    project.history.push({ id: newId(), at: Date.now(), kind, title: project.title, text: project.text, font: normalizeFont(project.font), rubies: normalizeRubies(project.text, project.rubies || []) });
    if (project.history.length > HISTORY_LIMIT) project.history.splice(0, project.history.length - HISTORY_LIMIT);
    project.lastVersionAt = Date.now();
  }
  function refreshProjectOptions() {
    projectSelect.replaceChildren(...library.projects.map(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = (project.title.trim() || '無題') + (isProtectedProject(project) ? '（保護）' : '');
      return option;
    }));
    projectSelect.value = library.activeId;
  }
  function refreshVersions() {
    const history = activeProject().history;
    document.getElementById('restore-version').disabled = isProtectedProject(activeProject()) || !history.length;
    if (!history.length) {
      versionsSelect.replaceChildren(new Option('まだ履歴はありません', ''));
      return;
    }
    versionsSelect.replaceChildren(...[...history].reverse().map(version =>
      new Option(new Date(version.at).toLocaleString('ja-JP') + ' · ' + (version.kind === '復元前' ? '戻す前の原稿' : version.kind), version.id)));
  }
  // New writing comes before old versions: when the library would outgrow the
  // storage budget, the oldest history versions (of any manuscript) are dropped
  // first, so saving never stops while history remains. Current text is never cut.
  function trimHistoryToBudget(projects) {
    const size = version => version.title.length + version.text.length + (version.rubies || []).reduce((sum, ruby) => sum + ruby.text.length, 0);
    let total = projects.reduce((sum, project) => sum + size(project) + project.history.reduce((all, version) => all + size(version), 0), 0);
    let trimmed = false;
    while (total > SAFETY.archiveUnits) {
      let oldest = null;
      for (const project of projects) if (project.history.length && (!oldest || project.history[0].at < oldest.history[0].at)) oldest = project;
      if (!oldest) break;
      total -= size(oldest.history.shift());
      trimmed = true;
    }
    return trimmed;
  }
  function persist() {
    libraryRevision++;
    library.panelSide = panelSide.value;
    try {
      if (storageProtected) throw Error('元の保存先の保護中');
      if (localStorage.getItem(LIBRARY_KEY) !== lastStored) {
        storageProtected = true; throw Error('別のタブで保存先が変更されました');
      }
      if (trimHistoryToBudget(library.projects)) refreshVersions();
      archiveBudget(library.projects);
      const serialized = JSON.stringify(library);
      localStorage.setItem(LIBRARY_KEY, serialized);
      lastStored = serialized;
      unsavedChanges = false;
      status.hidden = true; status.textContent = ''; recoveryPanel.hidden = true;
    } catch (error) {
      storageProblem(storageProtected
        ? '元の保存先を保護するため上書きを停止しています。このタブの原稿をJSONで保存してください。'
        : 'ブラウザ内に記録できていません。画面の原稿は保持しています。閉じる前にJSONで保存してください。 ' + error.message);
    }
    refreshDriveStatus();
  }
  const rubyUndoStates = new Map();
  function save(event) {
    if (isProtectedProject(activeProject())) {
      composing = false; input.value = activeProject().text; name.value = activeProject().title; persist(); render(); return;
    }
    if (composing && !event) composing = false;
    if (composing) { render(); return; }
    const project = activeProject();
    if (project) {
      const changedText = project.text !== input.value;
      if (changedText && project.text && Date.now() - project.lastVersionAt >= AUTO_VERSION_INTERVAL) {
        addVersion(project, '自動');
        refreshVersions();
      }
      const changedTitle = project.title !== name.value;
      if (changedText) {
        const cache = rubyUndoStates.get(project.id) || new Map();
        cache.set(project.text, normalizeRubies(project.text, project.rubies || []));
        const oldCount = (project.rubies || []).length;
        project.rubies = /^history(Undo|Redo)$/u.test(event?.inputType || '') && cache.has(input.value)
          ? normalizeRubies(input.value, cache.get(input.value))
          : rebaseRubies(project.text, input.value, project.rubies || []);
        if (project.rubies.length < oldCount) document.getElementById('ruby-status').textContent = '本文を変更した範囲のふりがなを外しました。';
        while (cache.size > 50) cache.delete(cache.keys().next().value);
        rubyUndoStates.set(project.id, cache);
      }
      project.title = name.value;
      project.text = input.value;
      project.updatedAt = Date.now();
      if (changedTitle) refreshProjectOptions();
      persist();
    }
    if (!composing) render();
  }
  function showProject() {
    const project = activeProject();
    document.getElementById('file-status').textContent = '';
    document.getElementById('ruby-status').textContent = '';
    delete document.getElementById('ruby-status').dataset.splitWarning;
    name.value = project.title;
    fontSelect.value = normalizeFont(project.font);
    input.value = project.text;
    if (project.text !== input.value) {
      project.rubies = rebaseRubies(project.text, input.value, project.rubies || []);
      project.text = input.value;
    }
    input.setSelectionRange(input.value.length, input.value.length);
    refreshProjectOptions();
    refreshVersions();
    updateSampleProtection();
    render();
    refreshDriveStatus();
  }
  function loadLibrary() {
    try {
      originalStored = localStorage.getItem(LIBRARY_KEY);
      lastStored = originalStored;
      if (originalStored !== null) {
        if (originalStored.length > SAFETY.fileBytes) throw Error('保存データが大きすぎます');
        const stored = JSON.parse(originalStored);
        if (!stored || ![1, 2].includes(stored.version)) throw Error('保存形式が不正です');
        validateArchiveProjects(stored.projects, false);
        if (stored.projects.some(p => typeof p.id !== 'string' || !p.id)) throw Error('保存IDが不正です');
        for (const project of stored.projects) {
          project.font = normalizeFont(project.font);
          project.rubies = normalizeRubies(project.text, project.rubies || []);
          for (const version of project.history) {
            version.font = normalizeFont(version.font);
            version.rubies = normalizeRubies(version.text, version.rubies || []);
          }
        }
        if (!stored.projects.some(p => p.id === stored.activeId)) stored.activeId = stored.projects[0].id;
        stored.version = 2; return withdrawSamples(protectSampleLibrary(curateSampleLibrary(stored)));
      }
    } catch (error) {
      storageProtected = true;
      storageProblem('保存データを読み込めませんでした。元の保存先は上書きしません。' + error.message + ' 現在の原稿と、取得できた元データをJSONで保存してください。');
    }
    return createSampleLibrary();
  }
  function offsetAtPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    const sheet = element && element.closest('.sheet');
    if (!sheet) return null;
    const box = sheet.getBoundingClientRect();
    const displayScale = box.width / 804;
    const fromRight = (box.right - x) / displayScale;
    let column = 0;
    for (let i = 1; i < COLS; i++) {
      if (Math.abs(fromRight - columnRight(i) - CELL / 2) < Math.abs(fromRight - columnRight(column) - CELL / 2)) column = i;
    }
    const localY = (y - box.top) / displayScale;
    const row = Math.max(0, Math.min(ROWS - 1, Math.floor(localY / CELL)));
    const lowerHalf = localY % CELL >= CELL / 2;
    const target = Number(sheet.dataset.page) * COLS * ROWS + column * ROWS + row + (lowerHalf ? .75 : 0);
    let closest = stops[0], distance = Infinity;
    for (const stop of stops) {
      const ordinal = stop.page * COLS * ROWS + stop.column * ROWS + stop.row;
      const gap = Math.abs(ordinal - target);
      if (gap < distance) { distance = gap; closest = stop; }
    }
    return closest.offset;
  }
  window.genkoBoot.stage('操作ボタンの準備');
  let dragAnchor = null;
  pages.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    if (overviewMode) {
      const page = event.target.closest('.page');
      if (page) {
        event.preventDefault();
        setOverview(false, [...pages.children].indexOf(page));
      }
      return;
    }
    const offset = offsetAtPoint(event.clientX, event.clientY);
    if (offset === null) return;
    event.preventDefault();
    const anchor = event.shiftKey ? (input.selectionDirection === 'backward' ? input.selectionEnd : input.selectionStart) : offset;
    dragAnchor = anchor;
    input.style.left = event.clientX + 'px';
    input.style.top = event.clientY + 'px';
    input.focus({ preventScroll: true });
    input.setSelectionRange(Math.min(anchor, offset), Math.max(anchor, offset), offset < anchor ? 'backward' : 'forward');
    render();
  });
  document.addEventListener('mousemove', event => {
    if (dragAnchor === null) return;
    const offset = offsetAtPoint(event.clientX, event.clientY);
    if (offset === null) return;
    input.setSelectionRange(Math.min(dragAnchor, offset), Math.max(dragAnchor, offset),
      offset < dragAnchor ? 'backward' : 'forward');
    render();
  });
  document.addEventListener('mouseup', () => { dragAnchor = null; });
  input.addEventListener('input', manuscriptInput);
  input.addEventListener('keydown', event => {
    if (renderBlocked) return;
    if (composing || event.isComposing || event.keyCode === 229 || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowLeft';
    const focus = input.selectionStart === input.selectionEnd ? input.selectionStart
      : input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd;
    let index = 0;
    while (index + 1 < stops.length && stops[index + 1].offset <= focus) index++;
    const here = stops[index];
    let target = here;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      let next = index + step;
      while (next >= 0 && next < stops.length &&
        stops[next].page === here.page && stops[next].column === here.column && stops[next].row === here.row) next += step;
      const candidate = stops[next];
      if (candidate) target = candidate;
    } else {
      let page = here.page;
      let column = here.column + (event.key === 'ArrowLeft' ? 1 : -1);
      if (column === COLS) { page++; column = 0; }
      if (column < 0) { page--; column = COLS - 1; }
      const candidates = stops.filter(stop => stop.page === page && stop.column === column);
      if (candidates.length) target = candidates.reduce((best, stop) =>
        Math.abs(stop.row - here.row) < Math.abs(best.row - here.row) ? stop : best);
    }
    if (event.shiftKey) {
      const anchor = input.selectionStart === input.selectionEnd ? focus
        : input.selectionDirection === 'backward' ? input.selectionEnd : input.selectionStart;
      input.setSelectionRange(Math.min(anchor, target.offset), Math.max(anchor, target.offset),
        target.offset < anchor ? 'backward' : 'forward');
    } else if (input.selectionStart !== input.selectionEnd) {
      const edge = forward ? input.selectionEnd : input.selectionStart;
      input.setSelectionRange(edge, edge);
    } else input.setSelectionRange(target.offset, target.offset);
    render();
  });
  // A key's input event has already rendered; key-up only matters when the key
  // moved the selection without changing the text (Home, End, Shift+arrows...).
  input.addEventListener('keyup', () => {
    if (plan && plan.text === input.value && plan.selectionStart === input.selectionStart && plan.selectionEnd === input.selectionEnd &&
        plan.direction === input.selectionDirection) return;
    render();
  });
  input.addEventListener('click', render);
  input.addEventListener('blur', render);
  document.addEventListener('mousedown', event => {
    if (!event.target.closest('.sheet') && event.target !== input) input.blur();
  });
  name.addEventListener('input', save);
  fontSelect.addEventListener('change', () => {
    save();
    const project = activeProject(), selected = normalizeFont(fontSelect.value);
    if (normalizeFont(project.font) === selected) return;
    addVersion(project, 'フォント変更前');
    project.font = selected; project.updatedAt = Date.now();
    driveMessage = null;
    persist(); refreshVersions(); render();
  });
  const rubyDialog = document.getElementById('ruby-dialog');
  const rubyReading = document.getElementById('ruby-reading');
  let pendingRubySelection = null;
  function openRubyEditor() {
    if (isProtectedProject(activeProject())) return;
    save();
    const existing = activeProject().rubies || [];
    let start = input.selectionStart, end = input.selectionEnd;
    const atCaret = existing.find(item => item.start <= start && item.end > start);
    if (start === end && atCaret) { start = atCaret.start; end = atCaret.end; }
    const base = input.value.slice(start, end);
    if (!base) { document.getElementById('ruby-status').textContent = '読みを付ける本文をドラッグで選択してください。'; input.focus({ preventScroll: true }); return; }
    if (/[\r\n]/u.test(base) || segments(base).length > ROWS) {
      document.getElementById('ruby-status').textContent = '改行を含まない20字以内の範囲を選択してください。'; return;
    }
    const overlaps = existing.filter(item => item.start < end && item.end > start);
    pendingRubySelection = { start, end, base };
    document.getElementById('ruby-base').textContent = base;
    rubyReading.value = readingForSelection(pendingRubySelection, overlaps);
    document.getElementById('ruby-apply').textContent = rubyReading.value ? '変更する' : '付ける';
    document.getElementById('ruby-remove').disabled = overlaps.length === 0;
    document.getElementById('ruby-error').textContent = '';
    rubyDialog.showModal(); rubyReading.focus();
  }
  document.getElementById('ruby-open').addEventListener('mousedown', event => event.preventDefault());
  document.getElementById('ruby-open').addEventListener('click', openRubyEditor);
  function commitRuby(remove = false) {
    if (isProtectedProject(activeProject())) return;
    const selection = pendingRubySelection;
    if (!selection || input.value.slice(selection.start, selection.end) !== selection.base) return;
    const project = activeProject();
    try {
      const next = (project.rubies || []).filter(item => item.end <= selection.start || item.start >= selection.end);
      if (!remove) next.push(...readingAnnotations(selection, rubyReading.value));
      const normalized = normalizeRubies(project.text, next);
      addVersion(project, remove ? 'ルビ削除前' : 'ルビ変更前');
      project.rubies = normalized;
      project.updatedAt = Date.now();
      persist(); refreshVersions(); rubyDialog.close();
      input.focus({ preventScroll: true }); input.setSelectionRange(selection.start, selection.end); render();
      if (document.getElementById('ruby-status').dataset.splitWarning !== 'true') document.getElementById('ruby-status').textContent = remove ? 'ふりがなを外しました。' : 'ふりがなを反映しました。';
    } catch (error) { document.getElementById('ruby-error').textContent = error.message; }
  }
  document.getElementById('ruby-form').addEventListener('submit', event => { event.preventDefault(); commitRuby(); });
  document.getElementById('ruby-remove').addEventListener('click', () => commitRuby(true));
  document.getElementById('ruby-cancel').addEventListener('click', () => rubyDialog.close());
  function applyPanelSide() {
    const onRight = panelSide.value === 'right';
    main.classList.toggle('panel-right', onRight);
    document.body.classList.toggle('panel-on-right', onRight);
  }
  document.getElementById('flip-panel').addEventListener('click', () => {
    panelSide.value = panelSide.value === 'left' ? 'right' : 'left';
    applyPanelSide();
    save();
  });
  document.getElementById('hide-panel').addEventListener('click', () => {
    library.panelHidden = true;
    document.body.classList.add('panel-hidden');
    fitPaper();
    persist();
    render();
  });
  document.getElementById('show-panel').addEventListener('click', () => {
    library.panelHidden = false;
    document.body.classList.remove('panel-hidden');
    fitPaper();
    persist();
    render();
  });
  overviewToggle.addEventListener('click', () => setOverview(!overviewMode));
  function jumpToPage(index) {
    if (overviewMode) setOverview(false, index);
    else pages.children[index]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  document.getElementById('first-page').addEventListener('click', () => jumpToPage(0));
  document.getElementById('last-page').addEventListener('click', () => jumpToPage(pages.children.length - 1));
  function scrollToFindMatch() {
    const match = findMatches[activeFindIndex];
    if (!match || !plan) return;
    const glyph = plan.result.glyphs.find(item => item.end > match.start);
    if (!glyph) return;
    buildPage(glyph.page);
    showFindPage(glyph.page);
  }
  // The search box is always in the side panel. Searching never moves the paper
  // unless the match to show is off screen, and then only as far as needed.
  function showFindPage(index) {
    const page = pages.children[Math.max(0, Math.min(index, pages.children.length - 1))];
    if (!page) return;
    const box = page.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight) return;
    page.scrollIntoView({ block: 'nearest' });
  }
  const matchPage = match => plan?.result.glyphs.find(item => item.end > match.start)?.page ?? 0;
  function openFind() {
    if (library.panelHidden) document.getElementById('show-panel').click();
    findQuery.focus({ preventScroll: true });
    findQuery.select();
  }
  function clearFind() {
    findQuery.value = '';
    render();
  }
  function moveFind(direction) {
    if (!findMatches.length) return;
    if (overviewMode) setOverview(false);
    activeFindIndex = (activeFindIndex + direction + findMatches.length) % findMatches.length;
    render();
    scrollToFindMatch();
  }
  document.getElementById('find-close').addEventListener('click', () => { clearFind(); findQuery.focus({ preventScroll: true }); });
  document.getElementById('find-prev').addEventListener('click', () => moveFind(-1));
  document.getElementById('find-next').addEventListener('click', () => moveFind(1));
  // Typing a query marks every match and makes the first one on or after the page
  // in view the current one, so the paper stays where it is when it can.
  findQuery.addEventListener('input', () => {
    activeFindIndex = -1;
    render();
    if (!findMatches.length || !plan) return;
    const boxes = [...pages.children].map(page => page.getBoundingClientRect());
    const whole = boxes.findIndex(box => box.top >= 0 && box.bottom <= window.innerHeight);
    const inView = whole >= 0 ? whole : Math.max(0, boxes.findIndex(box => box.bottom > 0));
    const next = findMatches.findIndex(match => matchPage(match) >= inView);
    if (next > 0) { activeFindIndex = next; render(); }
    scrollToFindMatch();
  });
  findQuery.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      clearFind(); input.focus({ preventScroll: true });
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    moveFind(event.shiftKey ? -1 : 1);
  });
  window.addEventListener('scroll', () => {
    if (indicatorQueued) return;
    indicatorQueued = true;
    requestAnimationFrame(() => { indicatorQueued = false; if (plan && !overviewMode && !renderBlocked) bringPagesUpToDate(); updatePageIndicator(); });
  }, { passive: true });
  window.addEventListener('resize', () => { fitPaper(); render(); });
  const printPages = document.getElementById('print-pages');
  function buildPrintPages() {
    showAllPages = true;
    buildAllPages();
    printPages.style.setProperty('--manuscript-font', FONT_OPTIONS[normalizeFont(activeProject().font)].css);
    printPages.replaceChildren(...[...pages.children].map(page => {
      const frame = document.createElement('div');
      frame.className = 'print-page';
      frame.append(page.cloneNode(true));
      return frame;
    }));
  }
  let printRequestPending = false;
  function requestManuscriptPrint() {
    if (printRequestPending) return;
    printRequestPending = true;
    const start = () => {
      try {
        if (renderBlocked) throw Error('紙面表示が停止しているため印刷できません。');
        if (overviewMode) setOverview(false);
        centerAllAttachedCommas(); positionAllSharedCellText(); centerAllWesternMarks();
        buildPrintPages();
        window.print();
      } catch (error) { operationProblem('印刷を開始できませんでした。' + error.message); }
      finally { printRequestPending = false; }
    };
    if (document.fonts?.ready) document.fonts.ready.then(start, () => { printRequestPending = false; operationProblem('書体を読み込めませんでした。'); });
    else start();
  }
  window.addEventListener('afterprint', () => { printPages.replaceChildren(); showAllPages = false; bringPagesUpToDate(); });
  window.addEventListener('beforeprint', () => { if (overviewMode) setOverview(false); centerAllAttachedCommas(); positionAllSharedCellText(); centerAllWesternMarks(); });
  window.addEventListener('beforeprint', buildPrintPages);
  projectSelect.addEventListener('change', () => {
    library.activeId = projectSelect.value;
    showProject();
    persist();
  });
  document.getElementById('new-project').addEventListener('click', () => {
    if (!canAddProjects(1)) return;
    const project = newProject();
    library.projects.push(project);
    library.activeId = project.id;
    showProject();
    persist();
    name.focus();
  });
  const noticesDialog = document.getElementById('notices-dialog');
  document.getElementById('notices-open').addEventListener('click', () => noticesDialog.showModal());
  document.getElementById('notices-close').addEventListener('click', () => noticesDialog.close());
  // A click outside the box (on the backdrop, which targets the dialog itself) closes it.
  noticesDialog.addEventListener('click', event => { if (event.target === noticesDialog) noticesDialog.close(); });
  const deleteDialog = document.getElementById('delete-dialog');
  let deleteTargetId = null;
  document.getElementById('delete-project').addEventListener('click', () => {
    save();
    const project = activeProject();
    deleteTargetId = project.id;
    document.getElementById('delete-project-name').textContent = '「' + (project.title.trim() || '無題') + '」';
    deleteDialog.showModal();
    document.getElementById('cancel-delete').focus({ preventScroll: true });
  });
  document.getElementById('cancel-delete').addEventListener('click', () => {
    deleteTargetId = null;
    deleteDialog.close();
  });
  deleteDialog.addEventListener('cancel', () => { deleteTargetId = null; });
  deleteDialog.addEventListener('close', () => { deleteTargetId = null; });
  document.getElementById('confirm-delete').addEventListener('click', () => {
    if (!deleteDialog.open || !deleteTargetId) return;
    const index = library.projects.findIndex(project => project.id === deleteTargetId);
    if (index < 0) { deleteTargetId = null; deleteDialog.close(); return; }
    const wasActive = library.activeId === deleteTargetId;
    library.projects.splice(index, 1);
    if (!library.projects.length) library.projects.push(newProject());
    if (wasActive) library.activeId = library.projects[Math.min(index, library.projects.length - 1)].id;
    deleteTargetId = null;
    deleteDialog.close();
    showProject();
    persist();
  });
  document.getElementById('checkpoint').addEventListener('click', () => {
    save();
    addVersion(activeProject(), '手動');
    persist();
    refreshVersions();
  });
  document.getElementById('toggle-protection').addEventListener('click', toggleProjectProtection);
  document.getElementById('copy-sample').addEventListener('click', createEditableCopy);
  document.getElementById('restore-version').addEventListener('click', () => {
    if (isProtectedProject(activeProject())) return;
    const project = activeProject();
    const version = project.history.find(item => item.id === versionsSelect.value);
    if (!version) return;
    addVersion(project, '復元前');
    project.title = version.title;
    project.text = version.text;
    project.font = normalizeFont(version.font);
    project.rubies = normalizeRubies(version.text, version.rubies || []);
    project.updatedAt = Date.now();
    showProject();
    persist();
  });
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const backupStamp = () => {
    const date = new Date();
    const two = n => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate()) +
      '_' + two(date.getHours()) + '-' + two(date.getMinutes()) + '-' + two(date.getSeconds());
  };
  function saveBackup() {
    save();
    const project = activeProject();
    const data = { format: 'tategaki-manuscript', version: 2, savedAt: Date.now(), recovery: 'plain-text', project: manuscriptSnapshot(project) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, safeFilename(project.title.trim() || '無題') + '_' + backupStamp() + '.json');
    return true;
  }
  function saveLibraryBackup() {
    save();
    const data = { ...library, recovery: 'plain-text', projects: library.projects.map(manuscriptSnapshot) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, '全原稿_' + backupStamp() + '.json');
    document.getElementById('file-status').textContent = '全原稿のJSON保存を開始しました。';
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (composing || event.isComposing || event.keyCode === 229 || document.querySelector('dialog[open]')) return;
      if (overviewMode) { event.preventDefault(); setOverview(false); return; }
    }
    if ((event.ctrlKey || event.metaKey) && ['s', 'f'].includes(event.key.toLowerCase()) && document.querySelector('dialog[open]')) {
      event.preventDefault(); return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      openFind();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveSelectedFile();
    }
  });
  function parseArchive(data) {
    const single = data && (data.format === 'tategaki-manuscript' && [1, 2].includes(data.version) || data.format === 'tategaki-drive-manuscript' && data.version === 2);
    if (single) return validateArchiveProjects([data.project], data.recovery !== 'plain-text');
    if (data && [1, 2].includes(data.version)) return validateArchiveProjects(data.projects, data.recovery !== 'plain-text');
    throw Error('このアプリの原稿JSONではありません。');
  }
  function copyHistory(source) {
    return source.history.filter(v => v && typeof v.title === 'string' && typeof v.text === 'string')
      .slice(-HISTORY_LIMIT).map(v => ({ id: newId(), at: Number(v.at) || Date.now(), kind: String(v.kind || '以前の版'), title: v.title, text: v.text, font: normalizeFont(v.font), rubies: normalizeRubies(v.text, v.rubies || []) }));
  }
  function restoreProject(source, allowOversize = false) {
    validateArchiveProjects([source], !allowOversize);
    if (!library.projects.some(p => p.id === source.id) && !canAddProjects(1)) return;
    save();
    const current = activeProject();
    let project = library.projects.find(p => typeof source.id === 'string' && p.id === source.id);
    if (isProtectedProject(project)) project = null;
    if (!project && !canAddProjects(1)) return;
    if (project && (project.title !== source.title || project.text !== source.text || normalizeFont(project.font) !== normalizeFont(source.font) || JSON.stringify(project.rubies || []) !== JSON.stringify(source.rubies || []))) {
      if (!confirm(`同じ原稿「${project.title.trim() || '無題'}」があります。JSONの内容を開きますか？ 現在の版は編集履歴に残します。`)) return;
      addVersion(project, '読込前');
    }
    if (!project) {
      if (!isProtectedProject(current) && !current.title && !current.text && !current.history.length) project = current;
      else { project = newProject(); library.projects.push(project); }
      if (typeof source.id === 'string' && source.id && !library.projects.some(p => p !== project && p.id === source.id)) project.id = source.id;
    }
    const oldHistory = project.history;
    project.title = source.title;
    project.text = source.text;
    project.font = normalizeFont(source.font);
    project.rubies = normalizeRubies(source.text, source.rubies || []);
    const mergedHistory = new Map([...copyHistory(source), ...oldHistory].map(v => [JSON.stringify([v.at, v.title, v.text, normalizeFont(v.font), v.rubies || [], v.kind]), v]));
    project.history = [...mergedHistory.values()].sort((a, b) => a.at - b.at).slice(-HISTORY_LIMIT);
    project.updatedAt = Date.now();
    project.lastVersionAt = Date.now();
    if (source.protected === true) project.protected = true; else delete project.protected;
    library.activeId = project.id;
    showProject();
    persist();
    document.getElementById('file-status').textContent = '原稿（JSON）を開きました。';
    window.scrollTo(0, 0);
  }
  let pendingSources = [];
  const jsonPicker = document.getElementById('json-picker');
  const jsonSelect = document.getElementById('json-project-select');
  async function openJsonFile(file) {
    try {
      const read = beginRead(file);
      const data = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      checkRead(read);
      const sources = parseArchive(data);
      read.allowOversize = data.recovery === 'plain-text';
      if (sources.length === 1) {
        jsonPicker.hidden = true;
        restoreProject(sources[0], read.allowOversize);
        pendingSources = []; pendingRead = null;
      } else {
        pendingSources = sources; pendingRead = read;
        jsonSelect.replaceChildren(new Option('開く原稿を選んでください', ''), ...sources.map((p, i) => new Option(p.title.trim() || '無題', String(i))));
        jsonSelect.value = '';
        jsonPicker.hidden = false;
      }
    } catch (error) { operationProblem('原稿を開けませんでした。' + error.message); }
  }
  document.getElementById('import-backup').addEventListener('change', event => {
    const file = event.target.files[0]; event.target.value = '';
    if (file) return openJsonFile(file);
  });
  document.getElementById('open-json-project').addEventListener('click', () => {
    if (jsonSelect.value === '') { jsonSelect.focus(); return; }
    try { checkRead(pendingRead); }
    catch (error) { operationProblem(error.message); return; }
    const source = pendingSources[Number(jsonSelect.value)];
    if (!source) return;
    restoreProject(source, pendingRead.allowOversize);
    pendingSources = [];
    jsonPicker.hidden = true;
  });
  document.getElementById('cancel-json-project').addEventListener('click', () => {
    pendingSources = [];
    jsonPicker.hidden = true;
  });
  function downloadTitle() {
    const title = name.value.trim();
    if (!title) { alert('原稿名を入力してください。'); name.focus(); return null; }
    return title;
  }
  const safeFilename = title => title.replace(/[\\/:*?"<>|]/g, '_');
  function saveText() {
    const title = downloadTitle();
    if (!title) return;
    const filename = safeFilename(title) + '.txt';
    const body = input.value.replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
    const blob = new Blob(['\uFEFF', body], { type: 'text/plain;charset=utf-8' });
    if (blob.size > 2000000) { alert('ファイルが2MBを超えています。'); return; }
    downloadBlob(blob, filename);
    return true;
  }
  let saveFeedbackEpoch = 0;
  function clearSaveFeedback() {
    saveFeedbackEpoch++;
    for (const format of ['json', 'txt', 'pdf']) document.getElementById('save-' + format).classList.remove('save-started');
    document.getElementById('save-feedback').textContent = '';
  }
  function signalSaveStart(format) {
    const button = document.getElementById('save-' + format), epoch = saveFeedbackEpoch;
    button.classList.add('save-started');
    document.getElementById('save-feedback').textContent = ({ json: 'JSON', txt: 'TXT' }[format]) + 'のダウンロードを開始しました。';
    setTimeout(() => { if (epoch === saveFeedbackEpoch) clearSaveFeedback(); }, 1200);
  }
  function saveSelectedFile(format = 'json') {
    clearSaveFeedback();
    document.getElementById('file-status').textContent = '';
    try {
    save();
    if (format === 'pdf') {
      if (renderBlocked) { operationProblem('紙面表示が停止しているため印刷できません。JSONで保存するか、本文を分けてください。'); return; }
      requestManuscriptPrint(); return;
    }
    const saveFile = { json: saveBackup, txt: saveText }[format];
    if (saveFile?.()) signalSaveStart(format);
    } catch (error) { operationProblem('ファイル保存を開始できませんでした。' + error.message); }
  }
  for (const format of ['json', 'txt', 'pdf']) {
    document.getElementById('save-' + format).addEventListener('click', () => saveSelectedFile(format));
  }

  document.getElementById('open-file').addEventListener('click', () => document.getElementById('import-file').click());

  async function openTextFile(file) {
    try {
      const read = beginRead(file);
      const text = (await file.text()).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      checkRead(read);
      textWithinBounds(text);
      if (!prepareImportDraft()) return;
      if (input.value && !confirm('現在の原稿を読み込んだテキストで置き換えますか？ 現在の版は履歴に残します。')) return;
      addVersion(activeProject(), '読込前');
      activeProject().text = text; activeProject().rubies = [];
      input.value = text; input.setSelectionRange(text.length, text.length);
      save(); refreshVersions(); operationProblem('');
      document.getElementById('file-status').textContent = 'テキストを開きました。';
    } catch (error) { operationProblem('テキストを開けませんでした。' + error.message); }
  }
  document.getElementById('import').addEventListener('change', event => {
    const file = event.target.files[0]; event.target.value = '';
    if (file) return openTextFile(file);
  });
  document.getElementById('import-file').addEventListener('change', event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file) return;
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension === 'json') return openJsonFile(file);
    if (extension === 'txt') return openTextFile(file);
    alert('原稿（.json）・テキスト（.txt）を選んでください。');
  });
  // Only the Apps Script host provides this bridge. Local HTML never claims a cloud save.
  window.genkoBoot.stage('保存機能の確認');
  const driveAvailable = !!window.google?.script?.run;
  document.getElementById('drive-actions').hidden = !driveAvailable;
  const driveStatus = document.getElementById('drive-status');
  const driveDialog = document.getElementById('drive-dialog');
  const driveFiles = document.getElementById('drive-files');
  const driveListStatus = document.getElementById('drive-list-status');
  let driveBusy = false, driveNextPage = '', driveMessage = null;
  function manuscriptSnapshot(project) {
    return {
      id: project.id, title: project.title, text: project.text, font: normalizeFont(project.font),
      rubies: normalizeRubies(project.text, project.rubies || []),
      history: project.history.slice(-HISTORY_LIMIT).map(item => ({ id: item.id, at: item.at, kind: item.kind,
        title: item.title, text: item.text, font: normalizeFont(item.font), rubies: normalizeRubies(item.text, item.rubies || []) })),
      updatedAt: project.updatedAt, lastVersionAt: project.lastVersionAt, ...(project.protected === true ? { protected: true } : {})
    };
  }
  function manuscriptFingerprint(project) {
    const snapshot = manuscriptSnapshot(project);
    // Local timestamps change when focus is saved, even without a content change.
    return JSON.stringify([snapshot.title, snapshot.text, snapshot.font, snapshot.rubies, snapshot.history]);
  }
  function refreshDriveStatus() {
    for (const id of ['drive-save', 'drive-save-as', 'drive-open', 'drive-refresh']) {
      document.getElementById(id).disabled = !driveAvailable || driveBusy;
    }
    document.getElementById('drive-load').disabled = driveBusy || !driveFiles.value;
    document.getElementById('drive-more').disabled = driveBusy;
    driveFiles.disabled = driveBusy;
    if (!driveAvailable) return;
    const project = activeProject();
    if (!project) return;
    const binding = project.driveLink;
    let text;
    if (driveBusy) text = 'Google Driveと通信中です…';
    else if (driveMessage?.projectId === project.id) text = driveMessage.text;
    else if (!binding) text = 'この原稿はまだDriveに保存していません。';
    else text = binding.fingerprint === manuscriptFingerprint(project)
      ? 'Driveに保存済み · ' + new Date(binding.savedAt).toLocaleString('ja-JP')
      : 'Driveに未保存の変更があります。';
    driveStatus.textContent = text;
    driveStatus.dataset.error = String(!driveBusy && driveMessage?.projectId === project.id && driveMessage.error === true);
  }
  function driveCall(method, argument) {
    return new Promise((resolve, reject) => {
      if (!driveAvailable) return reject(new Error('Googleドキュメント版で利用できます。'));
      const runner = window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      if (method === 'save') runner.genkoDriveSave(argument);
      else if (method === 'list') runner.genkoDriveList(argument);
      else if (method === 'open') runner.genkoDriveOpen(argument);
      else reject(new Error('未対応の操作です。'));
    });
  }
  function driveError(error) { return error?.message || String(error || '通信に失敗しました。'); }
  async function saveToDrive(asCopy = false) {
    if (driveBusy || !driveAvailable) return;
    save();
    const project = activeProject(), projectId = project.id;
    const snapshot = manuscriptSnapshot(project), fingerprint = manuscriptFingerprint(project);
    const binding = asCopy ? null : project.driveLink;
    const request = { project: snapshot };
    if (binding) Object.assign(request, { fileId: binding.id, revision: binding.revision, fileVersion: binding.version });
    driveBusy = true; driveMessage = null; refreshDriveStatus();
    try {
      const result = await driveCall('save', request);
      if (!result?.file?.id || !result.file.version || !result.revision) throw new Error('保存結果を確認できませんでした。Driveの一覧を確認してください。');
      // The user can keep editing or switch projects during the request.
      const original = library.projects.find(item => item.id === projectId);
      if (original) original.driveLink = { id: result.file.id, version: result.file.version, revision: result.revision,
        savedAt: Date.now(), fingerprint };
      persist();
    } catch (error) {
      driveMessage = { projectId, error: true, text: 'Driveに保存できませんでした。' + driveError(error) };
    } finally { driveBusy = false; refreshDriveStatus(); }
  }
  async function listDriveFiles(append = false) {
    if (driveBusy || !driveAvailable) return;
    driveBusy = true; driveMessage = null;
    if (!append) { driveFiles.replaceChildren(); driveNextPage = ''; }
    driveListStatus.textContent = '原稿の一覧を読み込み中です…'; driveListStatus.dataset.error = 'false';
    refreshDriveStatus();
    try {
      const result = await driveCall('list', append ? driveNextPage : '');
      if (!Array.isArray(result?.files)) throw new Error('一覧の内容を確認できませんでした。');
      for (const file of result.files) {
        if (!file?.id || [...driveFiles.options].some(option => option.value === file.id)) continue;
        const modified = file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('ja-JP') : '';
        driveFiles.add(new Option(file.name + (modified ? ' · ' + modified : ''), file.id));
      }
      driveNextPage = result.nextPageToken || '';
      if (!driveFiles.value && driveFiles.options.length) driveFiles.selectedIndex = 0;
      driveListStatus.textContent = driveFiles.options.length ? driveFiles.options.length + '件の原稿' : '保存済みの原稿はありません。';
    } catch (error) {
      driveListStatus.textContent = driveError(error); driveListStatus.dataset.error = 'true';
    } finally {
      document.getElementById('drive-more').hidden = !driveNextPage;
      driveBusy = false; refreshDriveStatus();
    }
  }
  async function openFromDrive() {
    if (driveBusy || !driveFiles.value) return;
    const fileId = driveFiles.value;
    driveBusy = true; driveMessage = null; refreshDriveStatus();
    driveListStatus.textContent = '原稿を読み込み中です…'; driveListStatus.dataset.error = 'false';
    try {
      const result = await driveCall('open', fileId);
      const source = result?.project;
      if (result?.file?.id !== fileId || !result.file.version || !result.revision ||
          typeof source?.title !== 'string' || typeof source.text !== 'string' || !Array.isArray(source.history)) {
        throw new Error('原稿の内容を確認できませんでした。');
      }
      const rubies = normalizeRubies(source.text, source.rubies || []);
      const history = copyHistory(source);
      save(); // Keep the current manuscript, including edits made while waiting.
      const project = newProject(source.title, source.text);
      Object.assign(project, { rubies, history, font: normalizeFont(source.font), lastVersionAt: Number(source.lastVersionAt) || Date.now() });
      project.driveLink = { id: fileId, version: result.file.version, revision: result.revision,
        savedAt: Date.now(), fingerprint: manuscriptFingerprint(project) };
      library.projects.push(project); library.activeId = project.id;
      persist(); showProject(); driveDialog.close(); window.scrollTo(0, 0);
    } catch (error) {
      driveListStatus.textContent = '開けませんでした。' + driveError(error); driveListStatus.dataset.error = 'true';
    } finally { driveBusy = false; refreshDriveStatus(); }
  }
  document.getElementById('drive-save').addEventListener('click', () => saveToDrive());
  document.getElementById('drive-save-as').addEventListener('click', () => saveToDrive(true));
  document.getElementById('drive-open').addEventListener('click', () => {
    save(); driveDialog.showModal(); listDriveFiles();
  });
  document.getElementById('drive-refresh').addEventListener('click', () => listDriveFiles());
  document.getElementById('drive-more').addEventListener('click', () => listDriveFiles(true));
  document.getElementById('drive-load').addEventListener('click', openFromDrive);
  document.getElementById('drive-cancel').addEventListener('click', () => { if (!driveBusy) driveDialog.close(); });
  driveDialog.addEventListener('cancel', event => { if (driveBusy) event.preventDefault(); });
  driveFiles.addEventListener('change', refreshDriveStatus);
  for (const element of [input, name]) element.addEventListener('input', () => { driveMessage = null; refreshDriveStatus(); });
  window.genkoBoot.stage('保存データと見本の読み込み');
  if (typeof ResizeObserver === 'function') {
    let observedWidth = 0, queued = false;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width || 0;
      if (Math.abs(width - observedWidth) < .5 || queued) return;
      observedWidth = width; queued = true;
      requestAnimationFrame(() => { queued = false; fitPaper(); render(); });
    });
    observer.observe(document.getElementById('paper-scroll'));
  }

  library = loadLibrary();
  panelSide.value = library.panelSide === 'left' ? 'left' : 'right';
  applyPanelSide();
  document.body.classList.toggle('panel-hidden', library.panelHidden === true);
  fitPaper();
  window.genkoBoot.stage('原稿一覧と用紙の描画');
  showProject();
  if (sampleMigrationPending) {
    persist();
  }
  window.genkoBoot.ready();
  document.fonts?.addEventListener?.('loadingdone', () => { verticalAlternateFamilies.clear(); invalidatePages(); render(); });
  document.fonts?.ready.then(() => { centerAllAttachedCommas(); positionAllSharedCellText(); });
  } catch (error) { window.genkoBoot.fail(error); }
})();
