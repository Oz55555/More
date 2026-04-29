(function () {
  'use strict';

  const CHAT_HISTORY_KEY = 'bao_chat_history';
  let history = [];
  let isOpen = false;
  let isTyping = false;

  // BAO — Friendly robot face for customer service
  const BAO_FACE = `<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Antenna ball + stem -->
    <circle cx="22" cy="4"  r="3"   fill="white"/>
    <rect   x="20"  y="6"   width="4" height="6" rx="2" fill="white"/>
    <!-- Head (rounded rect) -->
    <rect x="6"  y="11" width="32" height="27" rx="9" fill="white"/>
    <!-- Ear bumps -->
    <circle cx="4"  cy="25" r="4" fill="white"/>
    <circle cx="40" cy="25" r="4" fill="white"/>
    <!-- Left eye -->
    <circle cx="15" cy="22" r="4" fill="#0a2770"/>
    <circle cx="14" cy="21" r="1.2" fill="white" opacity="0.7"/>
    <!-- Right eye -->
    <circle cx="29" cy="22" r="4" fill="#0a2770"/>
    <circle cx="28" cy="21" r="1.2" fill="white" opacity="0.7"/>
    <!-- Neutral mouth (slight curve, minimal) -->
    <path d="M16 31 Q22 33.5 28 31" stroke="#0a2770" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </svg>`;

  const ROBOT_SVG       = BAO_FACE;
  const ROBOT_SVG_SMALL = BAO_FACE;

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
      #bao-bubble {
        position:fixed; bottom:28px; right:28px; z-index:9999; cursor:pointer;
        width:60px; height:60px; border-radius:50%;
        background:linear-gradient(145deg,#0066cc,#1e3a8a);
        box-shadow:0 6px 24px rgba(0,83,155,.45), 0 2px 8px rgba(0,0,0,.2);
        display:flex; align-items:center; justify-content:center;
        transition:transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
        animation: bao-pulse 3s ease-in-out infinite;
      }
      @keyframes bao-pulse {
        0%,100%{ box-shadow:0 6px 24px rgba(0,83,155,.45),0 0 0 0 rgba(0,102,204,.4); }
        50%{ box-shadow:0 6px 24px rgba(0,83,155,.45),0 0 0 10px rgba(0,102,204,0); }
      }
      #bao-bubble:hover { transform:scale(1.12); box-shadow:0 10px 30px rgba(0,83,155,.55); animation:none; }
      #bao-bubble svg { width:34px; height:34px; color:white; }
      #bao-badge {
        position:absolute; top:-3px; right:-3px; background:#ef4444; color:#fff;
        font-size:10px; font-weight:800; border-radius:50%; width:20px; height:20px;
        display:flex; align-items:center; justify-content:center; border:2.5px solid #fff;
        box-shadow:0 2px 6px rgba(239,68,68,.5);
        animation: bao-badge-bounce .6s ease-in-out infinite alternate;
      }
      @keyframes bao-badge-bounce { from{transform:scale(1)} to{transform:scale(1.15)} }

      #bao-window {
        position:fixed; bottom:102px; right:28px; z-index:9998; width:360px;
        border-radius:20px; background:#fff;
        box-shadow:0 20px 60px rgba(0,0,0,.18), 0 4px 20px rgba(0,83,155,.12);
        display:flex; flex-direction:column; overflow:hidden;
        opacity:0; pointer-events:none;
        transform:translateY(16px) scale(.95);
        transition:opacity .3s cubic-bezier(.34,1.56,.64,1), transform .3s cubic-bezier(.34,1.56,.64,1);
      }
      #bao-window.open { opacity:1; pointer-events:all; transform:translateY(0) scale(1); }

      #bao-header {
        background:linear-gradient(135deg,#0057a8 0%,#1e3a8a 100%);
        padding:16px 18px; display:flex; align-items:center; gap:12px;
        position:relative; overflow:hidden;
      }
      #bao-header::before {
        content:''; position:absolute; top:-20px; right:-20px; width:100px; height:100px;
        background:rgba(255,255,255,.06); border-radius:50%;
      }
      #bao-header::after {
        content:''; position:absolute; bottom:-30px; right:40px; width:80px; height:80px;
        background:rgba(255,255,255,.04); border-radius:50%;
      }
      #bao-avatar {
        width:42px; height:42px; border-radius:50%;
        background:rgba(255,255,255,.15); backdrop-filter:blur(4px);
        border:2px solid rgba(255,255,255,.3);
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      #bao-avatar svg { width:28px; height:28px; }
      #bao-header-info { flex:1; }
      #bao-header-info strong { display:block; color:#fff; font-size:15px; font-weight:700; letter-spacing:.3px; }
      #bao-header-info span { font-size:11.5px; color:rgba(255,255,255,.8); display:flex; align-items:center; gap:5px; }
      .bao-online-dot {
        width:7px; height:7px; border-radius:50%; background:#22c55e;
        box-shadow:0 0 0 2px rgba(34,197,94,.3);
        animation:bao-blink 2s ease-in-out infinite;
      }
      @keyframes bao-blink { 0%,100%{opacity:1} 50%{opacity:.5} }
      #bao-close {
        color:rgba(255,255,255,.7); background:rgba(255,255,255,.1); border:none;
        width:28px; height:28px; border-radius:50%; font-size:14px; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        transition:background .2s, color .2s; flex-shrink:0; z-index:1;
      }
      #bao-close:hover { background:rgba(255,255,255,.25); color:#fff; }

      #bao-messages {
        flex:1; overflow-y:auto; padding:18px 16px;
        display:flex; flex-direction:column; gap:12px;
        min-height:220px; max-height:340px;
        background:linear-gradient(180deg,#f8faff 0%,#fff 100%);
        scrollbar-width:thin; scrollbar-color:#e2e8f0 transparent;
      }
      #bao-messages::-webkit-scrollbar { width:4px; }
      #bao-messages::-webkit-scrollbar-track { background:transparent; }
      #bao-messages::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:2px; }

      .bao-row { display:flex; align-items:flex-end; gap:8px; }
      .bao-row.user { flex-direction:row-reverse; }
      .bao-row-avatar {
        width:28px; height:28px; border-radius:50%; flex-shrink:0;
        background:linear-gradient(135deg,#0057a8,#1e3a8a);
        display:flex; align-items:center; justify-content:center;
      }
      .bao-row-avatar svg { width:18px; height:18px; }
      .bao-row.user .bao-row-avatar { background:linear-gradient(135deg,#64748b,#475569); }
      .bao-row.user .bao-row-avatar-icon { font-size:14px; }

      .bao-msg {
        max-width:76%; padding:10px 14px; font-size:13.5px; line-height:1.6;
        word-break:break-word; position:relative;
        animation:bao-msg-in .25s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes bao-msg-in { from{opacity:0;transform:translateY(8px) scale(.96)} to{opacity:1;transform:none} }
      .bao-msg.bot {
        background:#fff; color:#1e293b;
        border-radius:18px 18px 18px 4px;
        box-shadow:0 2px 12px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05);
      }
      .bao-msg.user {
        background:linear-gradient(135deg,#0057a8,#1e3a8a); color:#fff;
        border-radius:18px 18px 4px 18px;
        box-shadow:0 4px 14px rgba(0,87,168,.3);
      }

      .bao-typing-row { display:flex; align-items:flex-end; gap:8px; }
      .bao-typing-bubble {
        background:#fff; border-radius:18px 18px 18px 4px;
        box-shadow:0 2px 12px rgba(0,0,0,.08);
        padding:12px 16px; display:flex; gap:5px; align-items:center;
      }
      .bao-typing-bubble span {
        width:8px; height:8px; background:#94a3b8; border-radius:50%;
        animation:bao-bounce .9s ease-in-out infinite;
      }
      .bao-typing-bubble span:nth-child(2){animation-delay:.18s}
      .bao-typing-bubble span:nth-child(3){animation-delay:.36s}
      @keyframes bao-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}

      #bao-input-area {
        padding:12px 14px; border-top:1px solid #f1f5f9;
        background:#fff;
      }
      #bao-input-row {
        display:flex; align-items:flex-end; gap:10px;
        background:#f8faff; border:1.5px solid #e2e8f0;
        border-radius:16px; padding:8px 8px 8px 14px;
        transition:border-color .2s, box-shadow .2s;
      }
      #bao-input-row:focus-within {
        border-color:#0057a8; box-shadow:0 0 0 3px rgba(0,87,168,.1);
      }
      #bao-input {
        flex:1; border:none; background:transparent; font-size:13.5px;
        outline:none; resize:none; font-family:inherit; max-height:80px;
        overflow-y:auto; color:#1e293b; line-height:1.5;
      }
      #bao-input::placeholder { color:#94a3b8; }
      #bao-send {
        background:linear-gradient(135deg,#0057a8,#1e3a8a); border:none;
        border-radius:12px; width:36px; height:36px; min-width:36px;
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; transition:transform .2s, box-shadow .2s;
        box-shadow:0 3px 10px rgba(0,87,168,.35);
      }
      #bao-send:hover { transform:scale(1.08); box-shadow:0 5px 14px rgba(0,87,168,.45); }
      #bao-send:active { transform:scale(.95); }
      #bao-send svg { width:16px; height:16px; fill:#fff; }

      #bao-powered {
        text-align:center; font-size:10.5px; color:#cbd5e1;
        padding:6px 0 10px; letter-spacing:.3px;
      }

      @media(max-width:420px){
        #bao-window{width:calc(100vw - 24px);right:12px;}
        #bao-bubble{bottom:20px;right:16px;}
      }
    `;
    document.head.appendChild(style);
  }

  function injectHTML() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="bao-bubble" role="button" aria-label="Chat with BAO AI" title="Chat with BAO">
        ${ROBOT_SVG}
        <div id="bao-badge">1</div>
      </div>
      <div id="bao-window" role="dialog" aria-label="BAO AI Chat">
        <div id="bao-header">
          <div id="bao-avatar">${ROBOT_SVG_SMALL}</div>
          <div id="bao-header-info">
            <strong>BAO</strong>
            <span><span class="bao-online-dot"></span>CadenceWave AI &nbsp;·&nbsp; En línea</span>
          </div>
          <button id="bao-close" aria-label="Cerrar chat">✕</button>
        </div>
        <div id="bao-messages"></div>
        <div id="bao-input-area">
          <div id="bao-input-row">
            <textarea id="bao-input" rows="1" placeholder="Escribe tu mensaje…" aria-label="Mensaje"></textarea>
            <button id="bao-send" aria-label="Enviar">
              <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
        <div id="bao-powered">Powered by BAO AI · CadenceWave</div>
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
    document.getElementById('bao-input').addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });
  }

  function toggleChat() { isOpen ? closeChat() : openChat(); }

  function openChat() {
    isOpen = true;
    document.getElementById('bao-window').classList.add('open');
    document.getElementById('bao-badge').style.display = 'none';
    document.getElementById('bao-bubble').style.animation = 'none';
    setTimeout(() => document.getElementById('bao-input').focus(), 300);
    if (history.length === 0) {
      setTimeout(() => appendMessage('bot', '👋 ¡Hola! Soy **BAO**, el asistente IA de CadenceWave.\n¿En qué puedo ayudarte hoy?\n\n_Hi! I\'m BAO. How can I help you today?_'), 500);
    }
  }

  function closeChat() {
    isOpen = false;
    document.getElementById('bao-window').classList.remove('open');
  }

  function appendMessage(role, text, save = true) {
    const container = document.getElementById('bao-messages');
    const row = document.createElement('div');
    row.className = `bao-row ${role}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'bao-row-avatar';
    if (role === 'bot') {
      avatarDiv.innerHTML = ROBOT_SVG_SMALL;
    } else {
      avatarDiv.innerHTML = '<span class="bao-row-avatar-icon">👤</span>';
    }

    const bubble = document.createElement('div');
    bubble.className = `bao-msg ${role}`;
    bubble.innerHTML = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    if (role === 'bot') {
      row.appendChild(avatarDiv);
      row.appendChild(bubble);
    } else {
      row.appendChild(bubble);
      row.appendChild(avatarDiv);
    }

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;

    if (save) {
      history.push({ role: role === 'user' ? 'user' : 'assistant', content: text });
      sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    }
  }

  function showTyping() {
    const container = document.getElementById('bao-messages');
    const row = document.createElement('div');
    row.id = 'bao-typing-indicator';
    row.className = 'bao-typing-row';
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'bao-row-avatar';
    avatarDiv.innerHTML = ROBOT_SVG_SMALL;
    const bubble = document.createElement('div');
    bubble.className = 'bao-typing-bubble';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    row.appendChild(avatarDiv);
    row.appendChild(bubble);
    container.appendChild(row);
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
      appendMessage('bot', data.reply || 'Lo siento, tuve un problema. Por favor intenta de nuevo.');
    } catch (_) {
      hideTyping();
      appendMessage('bot', 'Problema de conexión. Visita cadencewave.io o intenta de nuevo.');
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
