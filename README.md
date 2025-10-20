# The Assistant – Chrome Extension

The Assistant is an MV3 Chrome extension that lets you grab the current tab’s headlines, email them to yourself via Gmail, and chat with a LLaMA model served through HuggingFace – all from the browser toolbar.

---

## Features
- Collects `<h1>`, `<h2>`, and `<h3>` text from the active page with a single click.
- Sends the captured headlines to Gmail using OAuth tokens obtained through `chrome.identity`.
- Provides a prompt box to query the HuggingFace Router (LLaMA 3.2 instruct model by default) and displays the reply in the popup.
- Stores user secrets (HuggingFace token, optional recipient overrides) using `chrome.storage.local`.
- Ships with an environment config (`env.js`) so you can customize default recipients, model IDs, and API hosts without touching the core code.

---

## Repo Layout
| Path | Purpose |
| --- | --- |
| `manifest.json` | Chrome extension manifest (MV3) – permissions, OAuth client, scripts. |
| `background.js` | Service worker handling Gmail sends and HuggingFace requests. |
| `content_script.js` | Extracts headings from the current tab on demand. |
| `popup.html`, `popup.js` | Toolbar UI for emailing headlines, chatting with LLaMA, and saving tokens. |
| `env.js` | Environment-style config with defaults for email, models, and API URLs. |
| `Keys` / `client_secret_*.json` | Example secrets (do **not** ship these – rotate and replace with your own). |

---

## Prerequisites
- Google Chrome (or Chromium-based browser) with extension developer mode enabled.
- Google Cloud project with the Gmail API enabled.
- HuggingFace account and API token with access to the chosen model.

---

## 1. Configure `env.js`
Update `env.js` with values appropriate for your environment:

```js
const ENV_CONFIG = {
  defaultEmailRecipient: 'your.email@example.com',
  defaultHfApiKey: '', // optional development key
  hfApiBaseUrl: 'https://router.huggingface.co/novita/v3/openai/chat/completions',
  hfModelId: 'meta-llama/llama-3.2-3b-instruct',
  gmailSubjectPrefix: 'Page Headlines from'
};
```

**Recommendations**
- Keep `defaultHfApiKey` empty in shared code; enter the real key through the popup at runtime.
- Add `env.js` to your `.gitignore` (and provide `env.template.js`) if you plan to distribute or collaborate.

---

## 2. Create Your Chrome OAuth Client
Chrome extensions require a dedicated OAuth client tied to the extension ID.

1. Load the unpacked extension once (next section) and note the extension ID from `chrome://extensions`.
2. In Google Cloud Console:
   1. Create or select a project.
   2. Set up the OAuth consent screen (External or Internal).
   3. Add the Gmail scope: `https://www.googleapis.com/auth/gmail.send`.
   4. Enable the Gmail API (`APIs & Services → Library → Gmail API → Enable`).
   5. Create OAuth credentials (`APIs & Services → Credentials → Create Credentials → OAuth client ID → Chrome App`) and paste your extension ID.
3. Replace the `oauth2.client_id` in `manifest.json` with the new client ID.
4. Reload the extension to pick up the manifest change.

When testing, add your Google account as a test user on the OAuth consent screen to avoid verification warnings.

---

## 3. Load the Extension
1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on (top-right corner).
3. Click **Load unpacked** and select the project directory.
4. After loading, hit **Reload** on the card whenever you change source files.

---

## 4. Use the Toolbar Popup
1. Click the extension icon to open the popup.
2. In **Settings**, paste your HuggingFace API token (unless `env.js` already supplied one) and click **Save Key**.
3. To email headlines:
   - Stay on the page you want to summarize.
   - Click **Email Headlines**.
   - The first time, Chrome will launch a Google sign-in window; accept the Gmail `send` scope.
   - If successful, the email is sent via `gmail.users.messages.send`.
4. To chat with LLaMA:
   - Enter a prompt in **Get Prompting**.
   - Click **Ask Your LLM**.
   - The popup shows the HuggingFace router response, or an error if the API request fails.

---

## Environment Variables vs. Manifest Fields
- Keep secrets, default recipients, model IDs, and API endpoints in `env.js`. These can change per install and aren’t enforced by Chrome.
- The manifest should contain only static extension metadata: name, version, permissions, host permissions, and the OAuth client ID. Chrome reads it at load time and will ignore dynamic substitutions.
- Never commit real API keys or OAuth client secrets; rotate any keys already in the repo and replace them with placeholders.

---

## Troubleshooting
- **OAuth errors / bad client ID**  
  Clear cached tokens via the background console (`chrome://extensions → The Assistant → service worker`) and re-run `chrome.identity.getAuthToken`, or remove cached tokens with `chrome.identity.removeCachedAuthToken`. Ensure the manifest’s client ID matches the one in Google Cloud.

- **HuggingFace 401 / 400 errors**  
  Confirm the saved token is valid and has access to the requested model. Adjust `hfApiBaseUrl` and `hfModelId` in `env.js` to match the endpoint you’re allowed to use.

- **Emails sent but popup shows error**  
  The Gmail API may accept the send request even if the response handling throws. Inspect Chrome’s background console to see the exact error payload; adjust error handling or subject configuration accordingly.

---

## License
