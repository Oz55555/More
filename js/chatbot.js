(function () {
  'use strict';

  const CHAT_HISTORY_KEY = 'bao_chat_history';
  let history = [];
  let isOpen = false;
  let isTyping = false;

  function init() {
    injectStyles();
    injectHTML();
    bindEvents();
    const saved = sessionStorage.getItem(CHAT_HISTORY_KEY);
    if (saved) {
      try {
        history = JSON.parse(saved);
        history.forEach(m => appendMessage(m.role === 'user' ? 'user' : 'bot', m.content, false));
      } catch (_) { history = []; }
    }
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #bao-bubble{position:fixed;bottom:24px;right:24px;z-index:9999;cursor:pointer;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#00539B,#1e3a8a);box-shadow:0 4px 16px rgba(0,83,155,.4);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}
      #bao-bubble:hover{transform:scale(1.08);box-shadow:0 6px 22px rgba(0,83,155,.5)}
      #bao-bubble svg{width:26px;height:26px;fill:#fff}
      #bao-badge{position:absolute;top:-2px;right:-2px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
      #bao-window{position:fixed;bottom:92px;right:24px;z-index:9998;width:340px;max-height:520px;border-radius:16px;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);transition:opacity .2s,transform .2s}
      #bao-window.open{opacity:1;pointer-events:all;transform:translateY(0) scale(1)}
      #bao-header{background:linear-gradient(135deg,#00539B,#1e3a8a);padding:14px 16px;display:flex;align-items:center;gap:10px}
      #bao-header img{width:32px;height:32px;border-radius:50%;background:#fff;padding:3px}
      #bao-header-info{flex:1}
      #bao-header-info strong{display:block;color:#fff;font-size:14px}
      #bao-header-info span{font-size:11px;color:rgba(255,255,255,.75)}
      #bao-close{color:rgba(255,255,255,.7);background:none;border:none;font-size:20px;cursor:pointer;line-height:1;padding:0}
      #bao-close:hover{color:#fff}
      #bao-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:200px;max-height:320px}
      .bao-msg{max-width:82%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.5;word-break:break-word}
      .bao-msg.bot{background:#f1f5f9;color:#1f2937;align-self:flex-start;border-bottom-left-radius:4px}
      .bao-msg.user{background:#00539B;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
      .bao-typing{display:flex;gap:4px;align-items:center;padding:10px 14px}
      .bao-typing span{width:7px;height:7px;background:#94a3b8;border-radius:50%;animation:bao-bounce .9s infinite}
      .bao-typing span:nth-child(2){animation-delay:.15s}
      .bao-typing span:nth-child(3){animation-delay:.3s}
      @keyframes bao-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
      #bao-input-row{display:flex;align-items:center;padding:10px 12px;border-top:1px solid #e5e7eb;gap:8px}
      #bao-input{flex:1;border:1px solid #e5e7eb;border-radius:20px;padding:8px 14px;font-size:13.5px;outline:none;resize:none;font-family:inherit;max-height:80px;overflow-y:auto}
      #bao-input:focus{border-color:#00539B}
      #bao-send{background:#00539B;border:none;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .2s}
      #bao-send:hover{background:#1e3a8a}
      #bao-send svg{width:16px;height:16px;fill:#fff}
      @media(max-width:400px){#bao-window{width:calc(100vw - 32px);right:16px}}
    `;
    document.head.appendChild(style);
  }

  function injectHTML() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="bao-bubble" role="button" aria-label="Chat with BAO" title="Chat with BAO AI">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37C8.42 21.5 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.66 0-3.22-.46-4.56-1.26l-.32-.19-3.35.93.93-3.35-.19-.32C3.46 15.22 3 13.66 3 12 3 7.03 7.03 3 12 3s9 4.03 9 9-4.03 9-9 9zm4.5-6.5c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.28 3.79.6.26 1.07.41 1.43.52.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28z"/></svg>
        <div id="bao-badge">1</div>
      </div>
      <div id="bao-window" role="dialog" aria-label="BAO Chat">
        <div id="bao-header">
          <img src="/images/cw.png" alt="BAO" />
          <div id="bao-header-info">
            <strong>BAO</strong>
            <span>CadenceWave AI · Online</span>
          </div>
          <button id="bao-close" aria-label="Close chat">&#10005;</button>
        </div>
        <div id="bao-messages"></div>
        <div id="bao-input-row">
          <textarea id="bao-input" rows="1" placeholder="Ask BAO anything…" aria-label="Message"></textarea>
          <button id="bao-send" aria-label="Send">
            <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  }

  function bindEvents() {
    document.getElementById('bao-bubble').addEventListener('click', toggleChat);
    document.getElementById('bao-close').addEventListener('click', closeChat);
    document.getElementById('bao-send').addEventListener('click', sendMessage);
    document.getElementById('bao-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

  function openChat() {
    isOpen = true;
    document.getElementById('bao-window').classList.add('open');
    document.getElementById('bao-badge').style.display = 'none';
    document.getElementById('bao-input').focus();
    if (history.length === 0) {
      setTimeout(() => appendMessage('bot', '👋 Hola! Soy **BAO**, el asistente IA de CadenceWave. ¿En qué puedo ayudarte hoy?\n\n_Hi! I\'m BAO, CadenceWave\'s AI. How can I help you today?_'), 400);
    }
  }

  function closeChat() {
    isOpen = false;
    document.getElementById('bao-window').classList.remove('open');
  }

  function appendMessage(role, text, save = true) {
    const container = document.getElementById('bao-messages');
    const div = document.createElement('div');
    div.className = `bao-msg ${role}`;
    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>').replace(/\n/g, '<br>');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (save) {
      history.push({ role: role === 'user' ? 'user' : 'assistant', content: text });
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    }
  }

  function showTyping() {
    const container = document.getElementById('bao-messages');
    const div = document.createElement('div');
    div.id = 'bao-typing-indicator';
    div.className = 'bao-msg bot bao-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('bao-typing-indicator');
    if (el) el.remove();
  }

  async function sendMessage() {
    if (isTyping) return;
    const input = document.getElementById('bao-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';

    appendMessage('user', text);
    isTyping = true;
    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-8) })
      });
      const data = await res.json();
      hideTyping();
      appendMessage('bot', data.reply || 'Sorry, I had trouble responding. Please try again.');
    } catch (_) {
      hideTyping();
      appendMessage('bot', 'Connection issue. Please visit cadencewave.io or try again.');
    } finally {
      isTyping = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
