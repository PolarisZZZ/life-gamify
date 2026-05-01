import re
import statistics
import json
import sys
from datetime import date, timedelta

def parse_body_metrics(filepath):
    """Parse body-metrics.md and return list of (date, weight, body_fat) tuples."""
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    records = []
    current_date = None
    
    for line in lines:
        # Match date header: ## YYYY-MM-DD
        date_match = re.match(r'## (\d{4}-\d{2}-\d{2})', line)
        if date_match:
            current_date = date_match.group(1)
            continue
        
        # Match weight/body fat line: 体重：XX.X kg；体脂：XX.X%
        metric_match = re.search(r'体重：([0-9.]+) kg；体脂：([0-9.]+)%', line)
        if metric_match and current_date:
            weight = float(metric_match.group(1))
            body_fat = float(metric_match.group(2))
            records.append((current_date, weight, body_fat))
    
    return records

def deduplicate_by_date(records):
    """Keep first entry per date."""
    by_date = {}
    for d, w, b in records:
        if d not in by_date:
            by_date[d] = (w, b)
    return sorted((d, w, b) for d, (w, b) in by_date.items())

def calculate_7day_averages(items):
    """Calculate 7-day averages for weight and body fat."""
    if len(items) < 7:
        return None, None
    
    last7 = items[-7:]
    weights = [x[1] for x in last7]
    fats = [x[2] for x in last7]
    
    return {
        'dates': [x[0] for x in last7],
        'weight_avg': round(statistics.mean(weights), 2),
        'fat_avg': round(statistics.mean(fats), 2),
        'count': len(last7)
    }

def calculate_previous_7day_averages(items):
    """Calculate previous 7-day window averages."""
    if len(items) < 14:
        return None, None
    
    prev7 = items[-14:-7]
    weights = [x[1] for x in prev7]
    fats = [x[2] for x in prev7]
    
    return {
        'dates': [x[0] for x in prev7],
        'weight_avg': round(statistics.mean(weights), 2),
        'fat_avg': round(statistics.mean(fats), 2),
        'count': len(prev7)
    }

def calculate_streak(items):
    """Calculate consecutive day streak ending at latest date."""
    all_dates = [date.fromisoformat(d) for d, _, _ in items]
    if not all_dates:
        return 0
    
    streak = 1
    for i in range(len(all_dates) - 1, 0, -1):
        if all_dates[i] - all_dates[i-1] == timedelta(days=1):
            streak += 1
        else:
            break
    return streak

def determine_weight_reward(delta_kg):
    """Determine XP/points reward based on weight change."""
    if delta_kg <= -0.6 and delta_kg > -1.0:
        return 40, 40, "Fast but acceptable"
    elif delta_kg <= -0.3:
        return 30, 30, "Ideal zone"
    elif abs(delta_kg) <= 0.3:
        return 10, 10, "Stable"
    elif delta_kg >= 0.3:
        return -20, -20, "Warning"
    return 0, 0, "No change"

def determine_fat_reward(delta_pct):
    """Determine XP/points reward based on body fat change."""
    if delta_pct <= -0.3:
        return 20, 20, "Good direction"
    elif delta_pct >= 0.3:
        return -20, -20, "Needs attention"
    return 0, 0, "Noise"

def main():
    if len(sys.argv) < 2:
        print("Usage: python calculate_weekly.py <body-metrics.md path>", file=sys.stderr)
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    try:
        records = parse_body_metrics(filepath)
        items = deduplicate_by_date(records)
        
        result = {
            'total_records': len(items),
            'latest': items[-1] if items else None,
            'streak': calculate_streak(items)
        }
        
        current = calculate_7day_averages(items)
        previous = calculate_previous_7day_averages(items)
        
        if current:
            result['current_7day'] = current
        
        if previous:
            result['previous_7day'] = previous
            
            weight_delta = round(current['weight_avg'] - previous['weight_avg'], 2)
            fat_delta = round(current['fat_avg'] - previous['fat_avg'], 2)
            
            weight_xp, weight_pts, weight_verdict = determine_weight_reward(weight_delta)
            fat_xp, fat_pts, fat_verdict = determine_fat_reward(fat_delta)
            
            result['weight_delta'] = weight_delta
            result['fat_delta'] = fat_delta
            result['weight_settlement'] = {
                'xp': weight_xp,
                'points': weight_pts,
                'verdict': weight_verdict
            }
            result['fat_settlement'] = {
                'xp': fat_xp,
                'points': fat_pts,
                'verdict': fat_verdict
            }
            result['daily_checkins'] = current['count'] * 5  # 5 XP per day
            
            # Streak bonus
            streak = result['streak']
            streak_bonus = 0
            if streak >= 30:
                streak_bonus = 150
            elif streak >= 14:
                streak_bonus = 70
            elif streak >= 7:
                streak_bonus = 35
            
            result['streak_bonus'] = streak_bonus
            result['total_weekly_xp'] = weight_xp + fat_xp + result['daily_checkins'] + streak_bonus
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
