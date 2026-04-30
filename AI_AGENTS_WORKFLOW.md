# CadenceWave — AI Agents Workflow

## Visión General

La aplicación cuenta con **6 agentes/servicios de AI** organizados bajo un **Agent Core** central, usando DeepSeek (primario) u OpenAI (fallback) como modelos base.

```
                    ┌─────────────────────────────┐
                    │        AGENT CORE           │
                    │  (Orquestador Central)       │
                    │  • Matriz de decisión        │
                    │  • Interpretación score+     │
                    │    urgency+sentiment         │
                    │  • Planificación de acciones │
                    │  • Memoria (decision log)    │
                    │  • Coordinación de agentes   │
                    └──────────┬──────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
   ┌───────────────┐  ┌────────────────┐  ┌──────────────────┐
   │  Admin Alert  │  │ Calendar Agent │  │   BAO Chatbot    │
   │  (emailSvc)   │  │  booking links │  │  (conversacional)│
   └───────────────┘  └────────────────┘  └──────────────────┘
           ▲
  ┌────────┴────────┐
  │  Tone Analysis  │  ← paralelo
  │  Lead Scoring   │  ← paralelo
  └─────────────────┘
```

---

## Pipeline 1 — Formulario de Contacto (Automático)

```mermaid
flowchart TD
    V([👤 Visitante]) -->|Llena formulario| F[POST /api/contact]
    F --> VAL{Validación}
    VAL -->|Falla| ERR[❌ 400 Error]
    VAL -->|OK| DB[(💾 MongoDB\nContacto guardado)]
    DB --> RES[✅ 201 Respuesta al visitante]

    DB --> PA[🔀 Parallel Async]

    PA --> A2[🔍 AGENTE 2\nTone Analysis]
    PA --> A3[📊 AGENTE 3\nLead Scoring]

    A2 -->|DeepSeek API| T1[Analiza:\nSentimiento\nEmoción\nToxicidad\nIdioma\nKeywords]
    T1 -->|Falla| T2[OpenAI fallback]
    T2 -->|Falla| T3[Keyword fallback]
    T1 & T2 & T3 --> T4[(💾 Guarda\ntoneAnalysis)]

    A3 -->|DeepSeek API| L1[Califica:\nScore 0-100\nhot/warm/cold\nSpam detection\nExtrae empresa\nteléfono, budget]
    L1 -->|Falla| L2[OpenAI fallback]
    L2 -->|Falla| L3[Keyword fallback]
    L1 & L2 & L3 --> L4[(💾 Guarda\nleadAnalysis)]

    L4 --> SPAM{¿Es Spam?}
    SPAM -->|Sí| DROP[🚫 Descartado]
    SPAM -->|No| WE[📧 Welcome Email\nauto-enviado al visitante]
```

---

## Pipeline 2 — Admin Panel: Outreach Email (Manual)

```mermaid
flowchart TD
    ADM([👔 Admin]) -->|Selecciona lead\nen dashboard| EP[POST /api/admin/leads/:id/send-email]
    EP --> LC[(🔍 Lee lead\nde MongoDB)]
    LC --> CHECK{¿Email\nya enviado?}
    CHECK -->|Sí| SKIP[⚠️ 400 Ya enviado]
    CHECK -->|No| A4[✉️ AGENTE 4\nEmail Generation]

    A4 --> EA[Lee:\nnombre, mensaje\nleadAnalysis\nidioma detectado]
    EA -->|DeepSeek API| EG[Genera:\nSubject personalizado\nbodyText\nbodyHTML]
    EG -->|Falla| ET[📄 Template fallback]
    EG & ET --> SEND[📬 Nodemailer\nenvía email]
    SEND --> UPD[(💾 emailStatus.sent = true\nsentAt, subject, messageId)]
    UPD --> OK[✅ Confirmación al admin]
```

---

## Pipeline 3 — BAO Chatbot (Tiempo Real)

```mermaid
flowchart TD
    V([👤 Visitante]) -->|Escribe mensaje| CHAT[POST /api/chat]
    CHAT --> HIS[Lee historial\nde conversación]
    HIS --> KEY{¿API Key\ndisponible?}
    KEY -->|No| FB[💬 Respuesta fallback\nestática]
    KEY -->|Sí| A1[🤖 AGENTE 1\nBAO Chatbot]

    A1 --> SP[System Prompt:\nBAO = CadenceWave AI\nAgile consultancy\nDetecta idioma\n120 palabras max]
    SP -->|DeepSeek API| R1[Respuesta generada]
    SP -->|Si no hay DeepSeek| R2[OpenAI GPT-4o-mini]
    R1 & R2 --> RES[💬 Respuesta al visitante]
```

---

## Vista Completa — Todos los Agentes

```mermaid
flowchart LR
    subgraph TRIGGERS["⚡ Triggers"]
        T1([Formulario\ncontacto])
        T2([Admin\ndashboard])
        T3([Chat\nvisitante])
    end

    subgraph AGENTS["🤖 AI Agents"]
        A1[BAO Chatbot\nConversacional]
        A2[Tone Analysis\nSentimiento/Emoción]
        A3[Lead Scoring\nCalificación 0-100]
        A4[Email Writer\nOutreach personalizado]
    end

    subgraph MODELS["🧠 Modelos AI"]
        DS[DeepSeek\ndeepseek-chat]
        OA[OpenAI\nGPT-4o-mini / GPT-3.5]
        KW[Keyword\nFallback local]
    end

    subgraph OUTPUTS["📤 Outputs"]
        O1[Respuesta chat]
        O2[toneAnalysis en DB]
        O3[leadAnalysis en DB]
        O4[Email enviado]
        O5[Welcome Email]
    end

    T1 --> A2 & A3
    T2 --> A4
    T3 --> A1

    A1 --> DS --> O1
    A2 --> DS -->|fallback| OA -->|fallback| KW --> O2
    A3 --> DS -->|fallback| OA -->|fallback| KW --> O3
    A3 -->|si no spam| O5
    A4 --> DS -->|fallback| OA --> O4
```

---

## Tabla de Agentes

| Agente | Trigger | Modelo primario | Fallback 1 | Fallback 2 | Output |
|--------|---------|-----------------|------------|------------|--------|
| **BAO Chatbot** | Mensaje en chat | DeepSeek | GPT-4o-mini | Texto estático | Respuesta conversacional |
| **Tone Analysis** | Contacto recibido | DeepSeek | GPT-3.5-turbo | Keywords locales | `toneAnalysis` en MongoDB |
| **Lead Scoring** | Contacto recibido | DeepSeek | GPT-4o-mini | Keywords locales | `leadAnalysis` en MongoDB |
| **Email Writer** | Admin lo activa | DeepSeek | GPT-4o-mini | Template HTML | Email enviado vía Nodemailer |

---

---

## Pipeline 4 — Agent Core (Orquestador Post-Análisis)

```mermaid
flowchart TD
    BOTH([✅ Tone + Lead\nanálisis completos]) --> AC[🧠 AGENT CORE\nprocessContact]

    AC --> DM{Matriz de Decisión\nscore + urgency + sentiment}

    DM -->|score ≥70\n+ urgency=high| IM[IMMEDIATE_RESPONSE\nprioridad 10]
    DM -->|score ≥70| PR[PRIORITY_RESPONSE\nprioridad 8]
    DM -->|score 40-69\n+ urgency=high| NU[NURTURE_URGENT\nprioridad 6]
    DM -->|score 40-69| NR[NURTURE\nprioridad 4]
    DM -->|score 20-39\n+ sentiment=negative| CR[CARE_RESPONSE\nprioridad 3]
    DM -->|score <20\no spam| LP[LOW_PRIORITY / DISCARD\nprioridad 0-1]

    IM & PR --> ALERT[📧 Admin Alert\nEmail inmediato\ncon score, urgency,\nbooking link, dashboard]
    IM & PR & NU & NR & CR --> BOOK[📅 Booking Link\nGenerado con UTM\nvía CalendarAgent]

    ALERT --> ADMIN([👔 Admin notificado])
    BOOK --> LOG[(💾 Decision Log\nMemoria del agente)]
```

---

## Pipeline 5 — Calendar Agent (Scheduling)

```mermaid
flowchart TD
    A([Trigger]) -->|AgentCore\nou admin| GL[CalendarAgent\ngenerateLink]
    GL --> URL[URL personalizada\ncon name, email, UTMs]
    URL --> CH{Canal}
    CH -->|Email admin alert| AE[📧 Incluida en alerta]
    CH -->|BAO chatbot| BC[💬 BAO la comparte\ncuando detecta intento]
    CH -->|Admin manual| AM[🔗 /api/admin/leads/:id/booking-link]
    CH -->|Click del lead| TR[/api/booking/redirect\ntrack + redirect]
    TR --> CL[(📊 Click tracking\nen memoria)]
```

---

## Matriz de Decisión del Agent Core

| Score | Urgency | Sentiment | Acción | Pasos ejecutados |
|-------|---------|-----------|--------|-----------------|
| ≥70 | high | any | `IMMEDIATE_RESPONSE` (P:10) | Admin alert + Booking link |
| ≥70 | med/low | any | `PRIORITY_RESPONSE` (P:8) | Admin alert + Booking link |
| 40-69 | high | any | `NURTURE_URGENT` (P:6) | Booking link |
| 40-69 | med/low | any | `NURTURE` (P:4) | Booking link |
| 20-39 | any | negative | `CARE_RESPONSE` (P:3) | Booking link |
| <20 | any | any | `LOW_PRIORITY` (P:1) | Ninguno |
| any | any | any | `DISCARD` (P:0) | Ninguno (spam) |

---

## Tabla de Agentes (Actualizada)

| # | Agente | Trigger | Modelo / Tech | Output |
|---|--------|---------|---------------|--------|
| 1 | **BAO Chatbot** | Mensaje en chat | DeepSeek / GPT-4o-mini | Respuesta conversacional + booking link |
| 2 | **Tone Analysis** | Formulario enviado | DeepSeek / GPT-3.5 / Keywords | `toneAnalysis` en MongoDB |
| 3 | **Lead Scoring** | Formulario enviado | DeepSeek / GPT-4o-mini / Keywords | `leadAnalysis` en MongoDB |
| 4 | **Email Writer** | Admin lo activa | DeepSeek / GPT-4o-mini / Template | Email AI personalizado vía Resend |
| 5 | **Agent Core** | Después de análisis | Lógica determinista | Admin alert + booking link + decision log |
| 6 | **Calendar Agent** | AgentCore / Admin / BAO | URL generation + tracking | Booking links personalizados + click stats |

---

## Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `BOOKING_URL` | URL de Calendly / Cal.com | `https://calendly.com/tu-usuario` |
| `ADMIN_EMAIL` | Email del admin para alertas HOT | `admin@cadencewave.io` |
| `BOOKING_DURATION` | Duración de la llamada (min) | `30` |
| `ADMIN_URL` | URL del dashboard admin | `https://cadencewave.io/admin` |

---

## Notas de Arquitectura

- **Agentes 2 y 3** corren en **paralelo** (`Promise.all`) — el AgentCore espera a ambos antes de actuar
- **Cadena de fallback** garantiza respuesta incluso sin API keys
- **Decision log** (últimas 100 decisiones) accesible via `GET /api/admin/agent-core/log`
- **Booking redirect** trackea clicks via `GET /api/booking/redirect?email=X&source=Y`
- **Cache de emails** (`Map`) evita regenerar el mismo email para el mismo lead
- **Token tracking** en Tone Analysis registra uso y costo en tiempo real
- Todos los agentes detectan el **idioma del usuario** y responden en consecuencia (ES/EN)
