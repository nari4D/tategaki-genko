// ためし書き on the product site: the extension's own editor, run as a web page.
// Nothing is kept: the editor's browser storage is replaced by memory, so the
// manuscript disappears when the page is closed or reloaded, and nothing is sent
// anywhere (the page's Content-Security-Policy also forbids connections).
// The switcher offers only the blank draft and the read-only guide 「はじめに」;
// new/delete, protecting, saving, opening files, the edit history and the old
// help panel are greyed out. Writing, ruby, fonts and the page tools stay.
// Loaded after startup.js and before editor.js.
(function () {
  var data = new Map();
  var memory = {
    getItem: function (key) { return data.has(String(key)) ? data.get(String(key)) : null; },
    setItem: function (key, value) { data.set(String(key), String(value)); },
    removeItem: function (key) { data.delete(String(key)); },
    clear: function () { data.clear(); },
    key: function (index) { return Array.from(data.keys())[index] || null; },
    get length() { return data.size; }
  };
  Object.defineProperty(window, 'localStorage', { value: memory, configurable: true });

  var LOCKED = '#new-project, #delete-project, .file-controls, .history-controls, .help-controls, #toggle-protection, #copy-sample';
  function lock() {
    var style = document.createElement('style');
    style.textContent = LOCKED + ' { opacity: .4; pointer-events: none; user-select: none; }' +
      '.demo-note { margin: 0 0 10px; padding: 8px 10px; border-radius: 6px; background: #f3e1d8; color: #6b2a1a; font-size: 12px; line-height: 1.6; }';
    document.head.appendChild(style);
    document.querySelectorAll(LOCKED).forEach(function (group) {
      group.setAttribute('aria-disabled', 'true');
      group.title = 'ためし書きでは使えません';
      group.querySelectorAll('button, select, input, summary').forEach(function (control) { control.tabIndex = -1; });
      if (group.matches('button')) group.tabIndex = -1;
      if (group.matches('details')) group.open = false;
    });
    // Clicks, changes and the save/print/open shortcuts never reach a locked control.
    ['click', 'change', 'keydown'].forEach(function (type) {
      document.addEventListener(type, function (event) {
        var shortcut = type === 'keydown' && (event.ctrlKey || event.metaKey) && ['s', 'p', 'o'].indexOf(String(event.key).toLowerCase()) >= 0;
        if (shortcut || (type !== 'keydown' && event.target.closest && event.target.closest(LOCKED))) {
          event.preventDefault(); event.stopImmediatePropagation();
        }
      }, true);
    });
    var note = document.createElement('p');
    note.className = 'demo-note';
    note.textContent = 'ためし書きです。書いたものは保存されず、閉じると消えます。';
    var aside = document.querySelector('aside');
    aside.insertBefore(note, aside.querySelector('label[for="name"]'));
  }

  // The switcher lists only the draft and the guide, however often the editor
  // rebuilds its options.
  function keepDraftAndGuide(draftId) {
    var select = document.getElementById('project-select');
    function prune() {
      Array.from(select.options).forEach(function (option) {
        if (option.value !== draftId && option.textContent.indexOf('はじめに') !== 0) option.remove();
      });
    }
    prune();
    new MutationObserver(prune).observe(select, { childList: true });
  }

  // Open on a blank manuscript, ready to type, instead of the read-only guide.
  var ready = window.genkoBoot.ready;
  window.genkoBoot.ready = function () {
    ready();
    setTimeout(function () {
      document.getElementById('new-project').click();
      var name = document.getElementById('name');
      name.value = 'ためし書き';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      keepDraftAndGuide(document.getElementById('project-select').value);
      lock();
      document.getElementById('input').focus({ preventScroll: true });
    }, 0);
  };
})();
