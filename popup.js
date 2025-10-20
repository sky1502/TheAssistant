const EMAIL_RECIPIENT = (typeof ENV_CONFIG !== 'undefined' && ENV_CONFIG.defaultEmailRecipient) || '';
const DEFAULT_HF_API_KEY = (typeof ENV_CONFIG !== 'undefined' && ENV_CONFIG.defaultHfApiKey) || '';

function sendMessage(msg) {
  return new Promise(res => chrome.runtime.sendMessage(msg, r => res(r)));
}

document.getElementById('email').addEventListener('click', async () => {
  if (!EMAIL_RECIPIENT) return alert('Default email recipient is not configured.');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'COPY_HEADLINES' }, async resp => {
    if (!resp) return alert('No headlines found on this page.');
    const result = await sendMessage({
      type: 'EMAIL_HEADLINES',
      headlines: { items: resp.headlines, pageUrl: tab.url },
      to: EMAIL_RECIPIENT
    });
    alert(result.success
      ? 'Email sent!'
      : 'Error sending email: ' + result.error
    );
  });
});

document.getElementById('saveKey').addEventListener('click', async () => {
  const key = document.getElementById('apikey').value.trim();
  if (!key) return alert('Enter a key');
  await chrome.storage.local.set({ hfApiKey: key });
  alert('HuggingFace token saved!');
});

window.addEventListener('DOMContentLoaded', async () => {
  const { hfApiKey } = await chrome.storage.local.get('hfApiKey');
  const keyInput = document.getElementById('apikey');
  if (hfApiKey) {
    keyInput.value = hfApiKey;
    return;
  }
  if (DEFAULT_HF_API_KEY) {
    keyInput.value = DEFAULT_HF_API_KEY;
    await chrome.storage.local.set({ hfApiKey: DEFAULT_HF_API_KEY });
  }
});

document.getElementById('ask').addEventListener('click', async () => {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) return;
  const out = document.getElementById('output');
  out.textContent = '…thinking…';
  const result = await sendMessage({ type: 'ASK_CHATGPT', prompt });
  out.textContent = result.success ? result.answer : 'Error: ' + result.error;
});
