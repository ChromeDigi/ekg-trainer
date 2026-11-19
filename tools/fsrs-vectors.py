# Dev-only: writes tests/fsrs-vectors.json from the reference py-fsrs, so tests can check
# js/fsrs.js against it. Never loaded by the app.
#   python3 -m venv /tmp/v && /tmp/v/bin/pip install fsrs==6.3.3
#   /tmp/v/bin/python tools/fsrs-vectors.py
import json, random
from datetime import datetime, timedelta, timezone
from fsrs import Scheduler, Card, Rating

sched = Scheduler(enable_fuzzing=False)
start = datetime(2026, 1, 5, 21, 0, tzinfo=timezone.utc)
rnd = random.Random(7)

# Hand-picked sequences plus random ones. Gaps are minutes after the previous review.
seqs = [
    [(3, 0), (3, 1), (3, 10), (3, 1440 * 3), (3, 1440 * 9)],
    [(1, 0), (1, 1), (3, 1), (3, 10), (1, 1440 * 2), (3, 10), (4, 1440 * 5)],
    [(4, 0), (4, 1440 * 8), (2, 1440 * 30), (3, 1440 * 2)],
    [(2, 0), (2, 5), (3, 10), (3, 600), (1, 1440), (2, 15), (3, 1440 * 4)],
]
for _ in range(40):
    s = [(rnd.choice([1, 2, 3, 3, 3, 4]), 0)]
    for _ in range(rnd.randint(3, 12)):
        s.append((rnd.choice([1, 2, 3, 3, 3, 4]), rnd.choice([1, 5, 10, 30, 240, 1440, 1440 * 3, 1440 * 10, 1440 * 40])))
    seqs.append(s)

out = []
for seq in seqs:
    card, t, steps = Card(), start, []
    for rating, gap in seq:
        t = t + timedelta(minutes=gap)
        card, _ = sched.review_card(card, Rating(rating), review_datetime=t)
        steps.append({
            "rating": rating, "at": int(t.timestamp() * 1000),
            "s": card.stability, "d": card.difficulty, "state": int(card.state),
            "step": card.step, "due": int(card.due.timestamp() * 1000),
            "r": sched.get_card_retrievability(card, current_datetime=t + timedelta(days=5)),
        })
    out.append(steps)

with open("tests/fsrs-vectors.json", "w") as f:
    json.dump({"source": "py-fsrs 6.3.3, enable_fuzzing=False, defaults", "seqs": out}, f)
print(len(out), "sequences")
