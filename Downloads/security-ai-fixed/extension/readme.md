# 🛡 Privacy Agent

**A browser extension that redacts sensitive information from your prompts before they ever reach ChatGPT, Claude, Gemini, Copilot, or any other AI chat tool — entirely on your device.**

No cloud calls. No model downloads at runtime. No backend server. Detection and redaction happen synchronously, in your browser, the moment you paste something into an AI chat box.

---

## Why

AI chat tools are increasingly where people paste logs, customer data, internal docs, and personal details to get help. Most of the time nobody notices that an email, a phone number, an API key, or a government ID slipped into the prompt along with everything else. Privacy Agent sits between your clipboard and the composer box and strips that out automatically, before it's ever sent.

## How it works

Every paste into a supported AI chat site goes through two fully local, synchronous passes before it's allowed into the composer:

1. **Pattern matching (regex)** — catches structured, high-confidence PII: emails, Indian phone numbers, Aadhaar numbers, PAN numbers, IP addresses, API keys, generic secrets, and passwords.
2. **NLP detection** — catches names, locations, and organizations using [`compromise`](https://github.com/spencermountain/compromise), a lightweight pure-JavaScript NLP library, combined with:
   - contextual phrase patterns (`"my name is X"`, `"I work at X"`, `"I live in X"`)
   - a curated gazetteer of Indian states and major cities
   - a user-editable **personal terms list** — add your own name, employer, or city once, and it's always redacted regardless of phrasing

Both passes run before the paste event is allowed through, so the browser's default paste action is blocked and replaced with the sanitized version in one step. Nothing is sent anywhere to make this decision — there's no API call involved in detection at all.

## What gets redacted

| Category | Method | Example |
|---|---|---|
| Email addresses | Regex | `[EMAIL]` |
| Indian phone numbers | Regex | `[PHONE]` |
| Aadhaar numbers | Regex | `[AADHAAR]` |
| PAN numbers | Regex | `[PAN]` |
| IP addresses | Regex | `[IP_ADDRESS]` |
| API keys / secrets | Regex | `[API_KEY]` / `[SECRET]` |
| Passwords | Regex | `[PASSWORD]` |
| Names | NLP | `[NAME]` |
| Locations | NLP + gazetteer | `[LOCATION]` |
| Organizations | NLP | `[ORGANIZATION]` |
| Your own custom terms | Personal terms list | `[PERSONAL]` |

## Supported sites

- ChatGPT (chatgpt.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- Microsoft Copilot (copilot.microsoft.com)
- Perplexity (perplexity.ai)
- Poe (poe.com)
- Grok (grok.com)

## Privacy guarantee

This isn't a marketing claim — it's directly checkable in the source. The entire extension is five files: a manifest, two plain JavaScript files, a popup UI, and one vendored NLP library. There is no `background.js`, no `offscreen.js`, no model worker, and no server. Search the code yourself:

```bash
grep -rn "fetch(\|XMLHttpRequest" extension/*.js
```

You'll find none — the only external dependency is `compromise.js`, a static library shipped inside the extension itself. Detection, redaction, and storage all happen through local browser APIs (`chrome.storage.local`) only.

## Installation (developer mode)

1. Clone this repo.
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `extension/` folder.
5. Open any supported AI chat site and paste something containing an email, phone number, or name to see it in action.

## Using your own personal terms

Click the extension icon to open the popup. Under **My Personal Terms**, add any word or phrase you always want redacted — your name, your employer, your city, a project codename — regardless of how it's phrased in the sentence. This is the most reliable layer for protecting things that are specific to you, since it doesn't depend on the NLP model recognizing anything.

## Project structure

```
extension/
├── manifest.json     # Manifest V3 config — permissions, supported sites
├── content.js        # All detection + redaction logic (regex + NLP)
├── compromise.js      # Vendored compromise.js NLP library
├── popup.html         # Settings and stats UI
└── popup.js            # Popup logic — toggles, personal terms, stats
```

## Known limitations

- Redaction currently runs on **paste only**, not on text typed directly into the composer. This is a deliberate tradeoff — live-typing redaction requires rewriting the composer's full content on every keystroke pause, which risks corrupting text you're actively typing elsewhere in the message. Paste is also the more common real-world leak vector (copied from a document, a log file, or autofill) and was prioritized for reliability.
- NLP detection is rule-based (`compromise`), not a trained neural model, so it will miss some unusual names and organizations a larger model might catch. The personal terms list exists specifically to cover gaps like this for your own recurring, known-sensitive terms.
- The regex patterns for Aadhaar, PAN, and Indian phone numbers are tuned for Indian formats; international equivalents aren't currently covered.

## Contributing

Issues and PRs welcome — particularly around:
- Additional regex patterns for other countries' ID formats
- Expanding the location gazetteer
- Support for additional AI chat sites

## License

[Add your chosen license here — MIT is a common default for a project like this.]
