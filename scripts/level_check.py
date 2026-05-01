import json
import sys

LEVEL_THRESHOLDS = [
    (1, 0),
    (2, 50),
    (3, 200),
    (4, 550),
    (5, 1300),
    (6, 2850),
    (7, 6000),
    (8, 12350),
    (9, 25100),
    (10, 50650),
]

def get_level_info(xp):
    """Determine current level and next level info based on XP."""
    current_level = 1
    next_threshold = 50
    
    for level, threshold in LEVEL_THRESHOLDS:
        if xp >= threshold:
            current_level = level
            # Find next level threshold
            next_idx = LEVEL_THRESHOLDS.index((level, threshold)) + 1
            if next_idx < len(LEVEL_THRESHOLDS):
                next_threshold = LEVEL_THRESHOLDS[next_idx][1]
            else:
                next_threshold = None  # Max level
        else:
            break
    
    return {
        'current_level': current_level,
        'current_xp': xp,
        'next_threshold': next_threshold,
        'xp_to_next': next_threshold - xp if next_threshold else 0,
        'max_level': current_level >= 10
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python level_check.py <current_xp>", file=sys.stderr)
        sys.exit(1)
    
    try:
        xp = int(sys.argv[1])
        info = get_level_info(xp)
        print(json.dumps(info, ensure_ascii=False, indent=2))
    except ValueError:
        print(json.dumps({'error': 'Invalid XP value'}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
