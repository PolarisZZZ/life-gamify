---
name: life-gamify
description: "Gamified personal growth and task management system with XP leveling, task scoring, body metrics tracking, and weekly settlements. Use when: (1) user wants to gamify their life/tasks with levels and experience points, (2) user wants to track body weight/body fat with trend analysis and 7-day moving averages, (3) user wants task management with difficulty-based scoring and completion rewards, (4) user wants weekly health/body metric settlements with rewards/penalties, (5) user mentions 'Life Game', 'level up', 'experience points', 'task scoring', 'body metrics tracking', or any gamified productivity/health system."
---

# Life Gamify

Gamified personal growth system. Turns daily tasks, body metrics, and habits into a role-playing game with levels, experience points, and reward currency.

## Core Concepts

- **Level (LV)**: Cumulative experience tiers. XP never resets on level up.
- **Experience (XP)**: Earned by completing tasks, daily check-ins, and weekly settlements.
- **Reward Points**: Spendable currency earned alongside XP. Used for self-defined rewards.
- **Tasks**: Scored by difficulty/importance. Completed → XP + Points.
- **Body Metrics**: Weight/body fat tracked with 7-day moving averages. Weekly settlements apply rewards/penalties.
- **Streaks**: Consecutive daily check-ins grant bonus XP.

## Workflow

### 1. Initialize System

When user first starts or asks to set up:

1. Create `life-game.md` with:
   - Current level, XP, reward points
   - Level threshold table (LV 1→10)
   - Task list with scores and statuses
   - XP history log
   - Body metrics rules (7-day average, weekly settlement)
2. Create `body-metrics.md` for weight/body fat records
3. Ask user for: height, baseline weight/body fat, target weight/body fat

### 2. Add / Complete Tasks

When user adds or completes a task:

1. Score the task (user confirms or overrides):
   - Daily micro-tasks: 5–30 points
   - Short projects: 50–200 points
   - Major milestones: 500–1000+ points
2. On completion: add XP and reward points
3. Update task status: `⬜` → `[YYYY-MM-DD]`
4. Log entry in XP history
5. Check for level up (XP ≥ threshold)

### 3. Record Body Metrics

When user reports weight/body fat:

1. Append to `body-metrics.md` with timestamp
2. Calculate vs previous day (optional comment)
3. Run weekly settlement if 7+ days of data exist

### 4. Weekly Settlement (Automated or On-Demand)

When triggered (weekly or user asks):

1. Read last 7 valid entries from `body-metrics.md`
2. Read previous 7 entries for comparison window
3. Calculate 7-day averages for weight and body fat
4. Compare windows, apply rules:

**Weight (7-day avg vs previous 7-day avg):**
| Change | XP / Points |
|--------|-------------|
| ↓ 0.6–1.0 kg | +40 / +40 |
| ↓ 0.3–0.6 kg | +30 / +30 |
| ±0.3 kg | +10 / +10 |
| ↑ ≥0.3 kg | -20 / -20 |

**Body Fat (7-day avg vs previous 7-day avg):**
| Change | XP / Points |
|--------|-------------|
| ↓ ≥0.3% | +20 / +20 |
| ↑ ≥0.3% | -20 / -20 |

**Daily Check-in:**
- Each day with complete record: +5 XP / +5 points

**Streak Bonus:**
- 7 consecutive days: +35 XP / +35 points

5. Log all settlements in XP history
6. Update current totals in `life-game.md`

### 5. Generate Reports

When user asks for status or at scheduled intervals:

1. Read `life-game.md` and `body-metrics.md`
2. Output:
   - Current level, XP, points
   - Active tasks (incomplete)
   - Recent completions
   - Body metrics: latest, 7-day avg, trend, vs last week
   - Next level progress bar

## File Structure

```
workspace/
├── life-game.md          # Main system state
├── body-metrics.md       # Weight/body fat log
└── health/               # Optional: health-coach integration
    ├── profile.md
    ├── goals.md
    └── logs/
```

## Scripts

Use scripts for deterministic calculations:

- `scripts/calculate_weekly.py`: Parse body-metrics.md, compute 7-day averages, deltas, streaks
- `scripts/level_check.py`: Check if current XP meets next level threshold

## References

- `references/rules.md`: Complete scoring tables, level thresholds, settlement formulas
- `references/examples.md`: Sample task lists, XP logs, report formats

## Integration

If `health-coach` skill is installed:
- Delegate meal analysis and detailed nutrition to health-coach
- Life-gamify handles the gamification layer (XP, points, levels, settlements)
- Both skills read/write `body-metrics.md` as shared data source
