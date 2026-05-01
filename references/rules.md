# Life Gamify — Complete Rules Reference

## Level System

Experience is cumulative and never resets.

| Level | Cumulative XP Required | Level-Up Reward Points |
|:---:|:---:|:---:|
| 1 | 0 | — |
| 2 | 50 | 20 |
| 3 | 200 | 60 |
| 4 | 550 | 140 |
| 5 | 1,300 | 300 |
| 6 | 2,850 | 620 |
| 7 | 6,000 | 1,260 |
| 8 | 12,350 | 2,540 |
| 9 | 25,100 | 5,100 |
| 10 | 50,650 | 10,220 |

Formula: `Level-Up Reward = (XP difference from previous level) / 5 × 2`

## Task Scoring Guidelines

Score by difficulty × importance. User confirms or overrides.

| Category | Examples | Suggested Score |
|:---|:---|:---:|
| Micro daily | Drink water, make bed, log weight | 5–10 |
| Daily routine | Exercise, read, clean | 20–40 |
| Short project | Finish article, fix bug, haircut | 50–100 |
| Medium project | Course module, side project | 100–300 |
| Major milestone | Launch product, certification | 500–1000 |
| Epic quest | Career change, major life event | 1000–5000 |

## Body Metrics Settlement Rules

### Weekly Weight Settlement
Compare current 7-day average vs previous 7-day average.

| Change | XP | Points | Verdict |
|:---|:---:|:---:|:---|
| ↓ 0.6–1.0 kg | +40 | +40 | Fast but acceptable |
| ↓ 0.3–0.6 kg | +30 | +30 | Ideal zone |
| ±0.3 kg | +10 | +10 | Stable |
| ↑ ≥0.3 kg | -20 | -20 | Warning |

### Weekly Body Fat Settlement

| Change | XP | Points | Verdict |
|:---|:---:|:---:|:---|
| ↓ ≥0.3% | +20 | +20 | Good direction |
| ↑ ≥0.3% | -20 | -20 | Needs attention |
| <0.3% | 0 | 0 | Noise |

### Daily Check-in
- Each day with complete weight + body fat record: +5 XP / +5 points

### Streak Bonus
- 7 consecutive calendar days with records: +35 XP / +35 points
- 14 consecutive days: +70 XP / +70 points
- 30 consecutive days: +150 XP / +150 points

## Calculation Formulas

### 7-Day Moving Average
```
avg = sum(last 7 valid entries) / count(last 7 valid entries)
```

### Weekly Delta
```
delta = current_7day_avg - previous_7day_avg
```

### Consecutive Day Streak
Count backwards from latest date. Calendar day gap > 1 day breaks streak.

## Data Format

### body-metrics.md
```markdown
# Body Metrics Log

## YYYY-MM-DD
- HH:MM TZ 体重：XX.X kg；体脂：XX.X%
- (optional second measurement same day)
```

### life-game.md — Task Status
```markdown
| Task | Score | Status |
|:---|:---:|:---:|
| Task name | 30 | ⬜ |
| Task name | 30 | [YYYY-MM-DD] |
```

### life-game.md — XP History
```markdown
### YYYY-MM-DD
- ✅ Task name +30 XP / +30 points
- Current total XP: XXX
```

## Minimum Intake Safety
- Male: ≥1500 kcal/day
- Female: ≥1200 kcal/day
- Absolute minimum: BMR × 1.2
