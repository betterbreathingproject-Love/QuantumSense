// aiProvider.js - Pluggable AI provider abstraction (ChatGPT default)
// Usage:
// - setProvider('chatgpt') to use ChatGPT
// - setChatGPTApiKey('sk-...') to store API key in localStorage
// - getAIProvider() returns the current provider instance

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4-turbo';

export function setProvider(name) {
  try { localStorage.setItem('ai_provider', name); } catch (_) {}
}

export function getProviderName() {
  try { return localStorage.getItem('ai_provider') || 'chatgpt'; } catch (_) { return 'chatgpt'; }
}

export function setChatGPTApiKey(key) {
  try { localStorage.setItem('chatgpt_api_key', key); } catch (_) {}
}

export function getChatGPTApiKey() {
  try { return localStorage.getItem('chatgpt_api_key') || (window.CHATGPT_API_KEY || ''); } catch (_) { return ''; }
}

export function setChatGPTConfig({ baseUrl, model } = {}) {
  try {
    if (baseUrl) localStorage.setItem('chatgpt_base_url', baseUrl);
    if (model) localStorage.setItem('chatgpt_model', model);
  } catch (_) {}
}

export function getChatGPTConfig() {
  try {
    return {
      baseUrl: localStorage.getItem('chatgpt_base_url') || DEFAULT_BASE_URL,
      model: localStorage.getItem('chatgpt_model') || DEFAULT_MODEL,
    };
  } catch (_) {
    return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL };
  }
}

// Optional: project/organization headers for project-scoped keys (sk-proj-...)
export function setOpenAIProject(projectId) {
  try { localStorage.setItem('openai_project', projectId); } catch (_) {}
}

export function getOpenAIProject() {
  try { return localStorage.getItem('openai_project') || (window.OPENAI_PROJECT || ''); } catch (_) { return ''; }
}

export function setOpenAIOrg(orgId) {
  try { localStorage.setItem('openai_org', orgId); } catch (_) {}
}

export function getOpenAIOrg() {
  try { return localStorage.getItem('openai_org') || (window.OPENAI_ORG || ''); } catch (_) { return ''; }
}

class ChatGPTProvider {
  constructor({ apiKey, baseUrl, model } = {}) {
    const cfg = getChatGPTConfig();
    this.apiKey = apiKey || getChatGPTApiKey();
    this.baseUrl = baseUrl || cfg.baseUrl || DEFAULT_BASE_URL;
    this.model = model || cfg.model || DEFAULT_MODEL;
    this.history = [];
  }

  setApiKey(key) {
    this.apiKey = key;
    setChatGPTApiKey(key);
  }

  setModel(model) {
    this.model = model;
    setChatGPTConfig({ model });
  }

  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl;
    setChatGPTConfig({ baseUrl });
  }

  async getResponse(prompt) {
    if (!this.apiKey) throw new Error('ChatGPT API key missing');
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: 'You are QuantumSense Coach. Provide concise, actionable, compassionate guidance based on the provided player data, game performance, coherence practice, and journal moods. Focus on personalized feedback and next steps.' },
        { role: 'user', content: prompt }
      ]
    };
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    const projectId = getOpenAIProject();
    const orgId = getOpenAIOrg();
    if (projectId) headers['OpenAI-Project'] = projectId;
    if (orgId) headers['OpenAI-Organization'] = orgId;
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`ChatGPT request failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return content;
  }

  async getResponseWithHistory(prompt) {
    if (!this.apiKey) throw new Error('ChatGPT API key missing');
    const messages = [
      { role: 'system', content: 'You are QuantumSense Coach. Provide concise, actionable, compassionate guidance.' },
      ...this.history,
      { role: 'user', content: prompt }
    ];
    const body = { model: this.model, messages };
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    const projectId = getOpenAIProject();
    const orgId = getOpenAIOrg();
    if (projectId) headers['OpenAI-Project'] = projectId;
    if (orgId) headers['OpenAI-Organization'] = orgId;
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`ChatGPT request failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    // Keep compact history to avoid runaway context
    this.history.push({ role: 'user', content: prompt });
    this.history.push({ role: 'assistant', content });
    if (this.history.length > 10) this.history.splice(0, this.history.length - 10);
    return content;
  }
}

export function getAIProvider() {
  const name = getProviderName();
  if (name === 'chatgpt') {
    return new ChatGPTProvider();
  }
  // Fallback to chatgpt if unknown
  return new ChatGPTProvider();
}

export default { setProvider, getProviderName, getAIProvider, setChatGPTApiKey, getChatGPTApiKey, setChatGPTConfig, getChatGPTConfig, setOpenAIProject, getOpenAIProject, setOpenAIOrg, getOpenAIOrg };