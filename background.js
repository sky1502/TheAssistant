try {
  importScripts('env.js');
} catch (err) {
  console.warn('env.js not loaded in background:', err);
}

const HF_API_BASE_URL = (typeof ENV_CONFIG !== 'undefined' && ENV_CONFIG.hfApiBaseUrl) ||
  'https://router.huggingface.co/novita/v3/openai/chat/completions';
const HF_MODEL_ID = (typeof ENV_CONFIG !== 'undefined' && ENV_CONFIG.hfModelId) ||
  'meta-llama/llama-3.2-3b-instruct';
const GMAIL_SUBJECT_PREFIX = (typeof ENV_CONFIG !== 'undefined' && ENV_CONFIG.gmailSubjectPrefix) ||
  'Page Headlines from';

async function getGoogleToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, token => {
      if (chrome.runtime.lastError || !token) {
        return reject(chrome.runtime.lastError);
      }
      resolve(token);
    });
  });
}

async function sendHeadlinesEmail(headlines, toAddress) {
  const token = await getGoogleToken();
  const hostname = new URL(headlines.pageUrl).hostname;
  const subject = `${GMAIL_SUBJECT_PREFIX} ${hostname}`;
  const bodyText = headlines.items.join("\n\n");
  const raw = [
    `To: ${toAddress}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    bodyText
  ].join("\r\n");

  const encoded = btoa(raw)
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const resp = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encoded })
    }
  );
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

async function chatWithLlama(prompt) {
  const { hfApiKey } = await chrome.storage.local.get('hfApiKey');
  if (!hfApiKey) throw new Error('HuggingFace token not set');

  const response = await fetch(
    HF_API_BASE_URL,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: HF_MODEL_ID,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    }
  );


  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HF API error: ${err}`);
  }

  const json = await response.json();

  const assistantReply = json.choices?.[0]?.message?.content;
  return assistantReply;
} 

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EMAIL_HEADLINES') {
    sendHeadlinesEmail(msg.headlines, msg.to)
      .then(res => sendResponse({ success: true, info: res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (msg.type === 'ASK_CHATGPT') {
    chatWithLlama(msg.prompt)
      .then(answer => sendResponse({ success: true, answer }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
