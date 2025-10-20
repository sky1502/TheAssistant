// content_script.js
function getHeadlines() {
  const els = document.querySelectorAll("h1, h2, h3");
  return Array.from(els).map(e => e.innerText.trim()).filter(t => t);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'COPY_HEADLINES') {
    sendResponse({ headlines: getHeadlines() });
  }
});
