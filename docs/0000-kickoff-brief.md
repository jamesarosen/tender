# Kickoff Brief: Emotionally-Intelligent Task Management System

## The Problem Space

### Core Insight

Procrastination and task avoidance are fundamentally problems of **emotional regulation**, not time management. Research shows that 88% of people procrastinate because they feel overwhelmed. The prefrontal cortex (planning) loses to the limbic system (emotions) when tasks trigger anxiety, frustration, or self-doubt.

Dr. Tim Pychyl of Carleton University defines procrastination as "a mechanism of emotional avoidance" — we postpone tasks that trigger anxiety, boredom, frustration, or feelings of incompetence.

### Key Research Findings

#### English/Academic Research

- **Procrastination as emotional regulation failure**: A 2025 study in the British Journal of Psychology found that procrastination is linked to low attentional control and poor emotion regulation skills. Improving emotion regulation decreases procrastinatory behaviors.
- **Cognitive load theory**: Humans can hold only 7±2 items in working memory. Poor task prioritization leads to cognitive overload, where the brain's capacity is overwhelmed by the sheer volume of tasks.
- **Self-Determination Theory (SDT)**: Lasting motivation arises when three psychological needs are met: autonomy, competence, and relatedness.
- **The "smaller tasks trap"**: Research shows people willingly avoid tasks associated with more effort or time, even when those tasks are more important.
- **Behavior change app archetypes** (JMIR, 2025): Five main types identified — structured progress monitor, self-improvement guide, productivity adventure, emotional wellness coach, and social focus companion.

#### French Perspectives

- **Charge mentale** (mental load): 60% of French workers report excessive mental burden. The concept distinguishes cognitive load (complex thinking, decisions) from emotional load (interactions, relationships).
- **Procrastination prevalence**: 95% of workers procrastinate occasionally; 20% chronically. 68% of chronic procrastinators have low tolerance for emotional discomfort.
- **Systemic approach**: France emphasizes organizational factors — workload regulation, autonomy, mission clarity, recognition, and management quality as levers for preventing psychological troubles.
- **Right to disconnect**: Enshrined in French law since 2017, recognizing the need for boundaries.

#### Japanese Concepts

- **Kaizen (改善)**: Continuous improvement through small, incremental changes. Significant results from cumulative effect of many small improvements. Progress over perfection.
- **Ikigai (生きがい)**: "Reason for being" — the intersection of passion, ability, world's needs, and value. What inspires you to get up every morning.
- **Hansei (反省)**: Deep self-reflection. Acknowledging and processing mistakes to prevent recurrence. Even successful projects warrant reflection on what could be better.
- **Wabi-sabi (侘寂)**: Finding beauty in imperfection and impermanence. Accepting that all things are incomplete. Reduces perfectionist thinking.
- **Gaman (我慢)**: Patience, perseverance, tolerance. Enduring difficulty with self-control and dignity. Emotional maturity.
- **Job Crafting**: Workers proactively shaping their work experience by modifying tasks, relationships, and cognitive framing.

### What Existing Tools Get Wrong

| Problem                      | Impact                                      |
| ---------------------------- | ------------------------------------------- |
| Show everything at once      | Overwhelm and decision paralysis            |
| No emotional awareness       | Can't help when users are stuck             |
| High maintenance burden      | The system becomes another source of stress |
| Rigid structures             | Force users into unnatural workflows        |
| Focus on tasks, not outcomes | Busy work without meaning                   |

---

## Vision

### Architecture

- **Local-first**: SQLite database on user's filesystem
- **Own your data**: No lock-in, portable, exportable
- **TUI first**: Terminal-based interface, scriptable and fast
- **Future**: Cloud sync, mobile web app, native mobile app
- **Tech stack**: TypeScript

### Core UX Principles

1. **Single focus suggestion** with day-level context
2. **Warm coach personality** — supportive, curious, non-judgmental
3. **Quick capture** — adding tasks must be frictionless
4. **Low maintenance** — system should largely manage itself
5. **Unified life view** with optional context/location filtering

### Emotional Intelligence Features

- Proactively ask how user feels about upcoming tasks
- Celebrate and reflect on completed tasks (lightly)
- Gentle inquiry when tasks linger: "Is this too big? Unpleasant? Blocked?"
- Learn user patterns over time
- Emotions are data for understanding friction, not for judgment

### Productivity Model

- **Outcomes-focused**: Define what you want to achieve; system suggests tasks
- **Balanced approach**: Warm up with easier task, but don't do all easy stuff first. Leave energy for a hard one.
- **Portfolio philosophy**: Blend of kaizen (progress) + wabi-sabi (acceptance) + self-compassion + accountability

### Inspirations

- **Complice**: Daily intentions, outcomes focus, meaningful progress
- **Focusmate**: Accountability, presence, body doubling concept

---

## Task Taxonomy

A starting framework for understanding different kinds of tasks. This taxonomy is a lens, not a law — it will be refined per-user as Tender learns individual patterns.

### Task Types

| Type                       | Example                                       | Friction Pattern                                    | Tender's Role                                           |
| -------------------------- | --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| **Maintenance**            | Clean dishwasher, drain water heater          | Forgetting, low urgency, sometimes needs prep/tools | Track cadence, reduce ambient anxiety, store prep notes |
| **Goal-driven**            | Ship feature, finish report                   | Too big, unclear next step                          | Break down, suggest next action                         |
| **Emotionally vulnerable** | Write thank-you notes, difficult conversation | Productive procrastination, emotional exposure      | Gentle inquiry, notice avoidance patterns               |

### Key Insight: Productive Procrastination

Not all avoidance looks like avoidance. Sometimes we reach for _satisfying_ tasks to avoid _difficult_ ones:

- Maintenance tasks are tangible, completable, and provide real accomplishment feelings
- They can become a "safe" productivity hit that sidesteps emotionally harder work
- You finish the day having cleaned, organized, and fixed things — but the thank-you notes remain unwritten

**Tender should notice this pattern** — when maintenance gets done consistently while emotionally-vulnerable tasks linger, that's signal, not success.

### Maintenance: A Deeper Look

Maintenance tasks have unique properties:

1. **Cadence-based, not deadline-based** — "Every 4 weeks" rather than "by Friday"
2. **Ambient stress when slipping** — Even if not urgent, knowing things are overdue creates cognitive load
3. **Prep barriers** — Some require tools, knowledge, or setup (e.g., draining water heater needs a hose and instructions)
4. **Satisfying when done** — Clear completion, tangible result

Tender's role with maintenance:

- **Track cadence** so you don't have to hold it in your head
- **Surface at the right time** — when due, not before
- **Store prep notes** — reduce the barrier when it's time
- **Don't let it crowd out harder work** — balance, not escape

### The Taxonomy Evolves

What feels "emotionally vulnerable" is personal. Writing thank-you notes might be easy for someone else. The system should learn _your_ patterns:

- Which tasks you consistently defer
- Which you reach for when avoiding others
- What actually moves the needle for you

---

## Design Principles

1. **Less is more** — Aggressive filtering. Default view: 1 suggested task. Expand for day context.

2. **Emotions are data** — Track feelings subtly. Use this to understand friction, not to judge.

3. **Gentle accountability** — Warm inquiry, not guilt. "This has been here a while. What's blocking you?"

4. **Progress over perfection** — Celebrate small wins. Incomplete is okay. Kaizen mindset.

5. **Own your data** — Local-first. Portable. No lock-in.

6. **Learn, don't configure** — Observe patterns. Minimize explicit settings.

7. **Outcomes over outputs** — "What do you want to achieve?" not "What tasks do you have?"

---

## Name

**Tender** — Warm, gentle care. Also "to tend" — like tending a garden. Works as verb: "tender your tasks."

The name captures both meanings:

- **Tender** (adjective): treating yourself and your work with gentleness
- **Tend** (verb): the ongoing care of a garden — goals, maintenance, and the difficult things alike

---

## Research Sources

### English/Academic

- [Procrastination and Emotional Dysregulation (British Journal of Psychology, 2025)](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjop.12793)
- [Behavior Change Apps for Procrastination (JMIR, 2025)](https://www.jmir.org/2025/1/e65214)
- [The Nature of Procrastination: A Meta-Analytic Review (ResearchGate)](https://www.researchgate.net/publication/6598646_The_Nature_of_Procrastination_A_Meta-Analytic_and_Theoretical_Review_of_Quintessential_Self-Regulatory_Failure)
- [First Pancake vs Eat the Frog (Work Brighter)](https://workbrighter.co/first-pancake-productivity-vs-eat-the-frog/)
- [Cognitive Load Theory (MasterClass)](https://www.masterclass.com/articles/ways-to-avoid-cognitive-overload)
- [Self-Determination Theory in App Design (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1071581920300513)
- [Psychology of Task Management: Smaller Tasks Trap (Cambridge)](https://www.cambridge.org/core/journals/judgment-and-decision-making/article/psychology-of-task-management-the-smaller-tasks-trap/71EC8D2356D1313AB5E7D788BBEBAA93)
- [Cognitive Load Management in Task Prioritization (FasterCapital)](https://fastercapital.com/content/Task-Prioritization--Cognitive-Load-Management--Cognitive-Load-Management-in-Task-Prioritization.html)

### French

- [La procrastination : évitement émotionnel (Naosu Thérapie)](https://naosu-therapie.fr/2025/03/01/comprendre-la-procrastination-les-cles-de-levitement-emotionnel/)
- [Charge mentale au travail (2C Forma)](https://2cforma.fr/bien-etre-au-travail-agir-sur-la-charge-mentale/)
- [Procrastination chronique : stratégies scientifiques (Cognisanté)](https://www.cognisante.fr/procrastination-chronique-strategies-scientifiques/)
- [La santé mentale au travail (info.gouv.fr)](https://www.info.gouv.fr/grand-dossier/parlons-sante-mentale/prevenir-les-risques-agir-pour-le-bien-etre-au-travail)
- [Bien-être au travail (INRS)](https://www.inrs.fr/risques/bien-etre-travail/ce-qu-il-faut-retenir.html)

### Japanese

- [Ikigai & Kaizen Concepts (DepositPhotos)](https://blog.depositphotos.com/ikigai-kaizen-and-other-japanese-concepts.html)
- [9 Japanese Productivity Methodologies (Calendar)](https://www.calendar.com/blog/japanese-productivity-methodologies-to-help-you-get-more-done/)
- [10 Japanese Concepts to Live By (Oishya)](https://oishya.com/journal/10-japanese-concepts-to-be-inspired-and-live-by/)
- [Wabi-Sabi Philosophy Teachings (Omar Itani)](https://www.omaritani.com/blog/wabi-sabi-philosophy-teachings)
- [Wabi-Sabi and Productivity (Lark)](https://www.larksuite.com/en_us/topics/productivity-glossary/wabi-sabi)
- [Kaizen (Wikipedia)](https://en.wikipedia.org/wiki/Kaizen)
- [タスク管理と生産性 (DI Square)](https://di-square.co.jp/tech_info/task_control/)
