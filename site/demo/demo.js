// ためし書き on the product site: the extension's own editor, run as a web page.
// Nothing is kept: the editor's browser storage is replaced by memory, so the
// manuscript disappears when the page is closed or reloaded, and nothing is sent
// anywhere (the page's Content-Security-Policy also forbids connections).
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

  // Open on a blank manuscript, ready to type, instead of the read-only guide.
  var ready = window.genkoBoot.ready;
  window.genkoBoot.ready = function () {
    ready();
    setTimeout(function () {
      document.getElementById('new-project').click();
      var name = document.getElementById('name');
      name.value = 'ためし書き';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('input').focus({ preventScroll: true });
    }, 0);
  };
})();
