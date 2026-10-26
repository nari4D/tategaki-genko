
(function () {
  var status = document.getElementById('startup-status');
  var phase = 'メイン処理の開始前', finished = false, failed = false;
  function fail(error) {
    failed = true;
    status.hidden = false;
    if (typeof window.parent.genkoHostFail === "function") window.parent.genkoHostFail(String(error && error.message || error));
    status.setAttribute('role', 'alert');
    status.textContent = 'Chrome試作版：原稿用紙の処理が停止しました。\n段階：' + phase +
      '\nエラー：' + String(error && error.message || error || '詳細を取得できませんでした').slice(0, 1000) +
      '\nこの表示をそのままお知らせください。原稿データの削除は不要です。';
  }
  window.genkoBoot = {
    stage: function (value) { phase = value; if (typeof window.parent.genkoHostStage === "function") window.parent.genkoHostStage(value); },
    fail: fail,
    ready: function () { finished = true; if (!failed) { status.hidden = true; if (typeof window.parent.genkoHostReady === "function") window.parent.genkoHostReady(); } }
  };
  window.addEventListener('error', function (event) {
    if (event.message || event.error) fail(event.error || event.message);
  });
  window.addEventListener('unhandledrejection', function (event) { fail(event.reason); });
  setTimeout(function () {
    if (!finished && !failed) status.textContent = 'Chrome試作版：起動が完了していません。\n段階：' + phase +
      '\nこの表示をそのままお知らせください。';
  }, 8000);
})();
