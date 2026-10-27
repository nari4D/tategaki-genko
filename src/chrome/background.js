// Toolbar click opens our editor directly. No access to other sites is requested.
let opening = null;
let pendingTabId = null;
const editorUrl = chrome.runtime.getURL('editor.html');

async function focusEditor(tabId, windowId) {
  let tab;
  try { tab = await chrome.tabs.update(tabId, { active: true }); }
  catch { return false; } // The editor may have been closed during the lookup.
  try { await chrome.windows.update(tab.windowId ?? windowId, { focused: true }); }
  catch (error) { console.warn('原稿タブは開いています。ウィンドウの切替に失敗しました。', error); }
  return true;
}

async function openEditor() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [editorUrl] });
  for (const context of contexts) {
    if (context.tabId >= 0 && await focusEditor(context.tabId, context.windowId)) return;
  }
  // Keep a just-created tab while its document is still loading. This also
  // prevents a second quick click from opening a second editing copy.
  if (pendingTabId !== null && await focusEditor(pendingTabId)) return;
  const tab = await chrome.tabs.create({ url: editorUrl });
  pendingTabId = tab.id;
}

chrome.tabs.onRemoved.addListener(tabId => {
  if (pendingTabId === tabId) pendingTabId = null;
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (pendingTabId === tabId && (changeInfo.status === 'complete' ||
      changeInfo.url && changeInfo.url !== editorUrl)) pendingTabId = null;
});
chrome.action.onClicked.addListener(() => {
  if (!opening) opening = openEditor().catch(error => {
    console.error('縦書き原稿用紙を開けませんでした。', error);
  }).finally(() => { opening = null; });
  return opening;
});
