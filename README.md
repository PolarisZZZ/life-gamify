# Life Gamify

Gamified personal growth system for OpenClaw / AgentSkills. Turns daily tasks, body metrics, and habits into a role-playing game with levels, experience points, and reward currency.

## 中文简介

Life Gamify 是一个把个人任务、身体数据和习惯养成游戏化的 AgentSkill。它用 XP、等级、奖励分数、任务清单和体重/体脂周结算，把日常行动变成可追踪、可反馈、可升级的 Life Game。

## Features

- **XP Leveling System** — Cumulative experience, never resets. 10 levels with escalating thresholds.
- **Task Scoring** — Difficulty-based points. User confirms or overrides.
- **Body Metrics Tracking** — Weight/body fat with 7-day moving averages.
- **Weekly Settlements** — Automated rewards/penalties based on trend direction.
- **Streak Bonuses** — 7/14/30 day consecutive check-in rewards.
- **Reward Points** — Spendable currency for self-defined rewards.
- **Private Web Dashboard** — Optional Node.js dashboard for task completion, task editing, categories, body metrics, and recent XP history.

## Installation

```bash
npx skills add PolarisZZZ/life-gamify@life-gamify
```

Or manually copy the skill files to your agent's skills directory.

## Quick Start

1. Initialize system files:
   ```bash
   cp assets/life-game-template.md ~/your-workspace/life-game.md
   cp assets/body-metrics-template.md ~/your-workspace/body-metrics.md
   ```

2. Fill in your profile (height, baseline metrics, goals).

3. Start adding tasks and recording body metrics. The skill handles XP, levels, and settlements automatically.

## File Structure

```
life-gamify/
├── SKILL.md                    # Core skill instructions
├── scripts/
│   ├── calculate_weekly.py     # 7-day averages, settlements, streaks
│   └── level_check.py          # Level progress calculator
├── references/
│   ├── rules.md                # Complete scoring tables & formulas
│   └── examples.md             # Sample tasks, XP logs, reports
└── assets/
    ├── life-game-template.md             # Initialize life-game.md
    ├── body-metrics-template.md          # Initialize body-metrics.md
    └── life-game-web-template/           # Optional private web dashboard
```

## Core Workflows

### Add / Complete Task
- Score by difficulty (5–5000+ points)
- Complete → +XP / +Reward Points
- Check for level up

### Record Body Metrics
- Append to `body-metrics.md` with timestamp
- Weekly settlement runs automatically when 7+ days exist

### Weekly Settlement
- Compare current 7-day avg vs previous 7-day avg
- Weight: ideal ↓0.3–0.6kg = +30 XP, stable ±0.3kg = +10 XP, ↑≥0.3kg = -20 XP
- Body Fat: ↓≥0.3% = +20 XP, ↑≥0.3% = -20 XP
- Daily check-ins: +5 XP each
- Streak bonuses: 7d=+35, 14d=+70, 30d=+150

## Scoring Reference

| Task Type | Examples | Score |
|:---|:---|:---:|
| Micro daily | Drink water, make bed | 5–10 |
| Daily routine | Exercise, read | 20–40 |
| Short project | Finish article, haircut | 50–100 |
| Medium project | Course module | 100–300 |
| Major milestone | Launch product | 500–1000 |
| Epic quest | Career change | 1000–5000 |

## Level Table

| Level | XP Required | Level-Up Reward |
|:---:|:---:|:---:|
| 2 | 50 | 20 |
| 3 | 200 | 60 |
| 4 | 550 | 140 |
| 5 | 1,300 | 300 |
| 6 | 2,850 | 620 |
| 7 | 6,000 | 1,260 |
| 8 | 12,350 | 2,540 |
| 9 | 25,100 | 5,100 |
| 10 | 50,650 | 10,220 |

## License

MIT
