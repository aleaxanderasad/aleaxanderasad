"""NeoType Dojo backend tests"""
import os, time, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://anime-type-learn.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN = {"email": "admin@neotype.dojo", "password": "admin123"}
TEST_EMAIL = f"test_{int(time.time())}@neotype.dojo"
TEST_USER = {"email": TEST_EMAIL, "password": "test1234", "name": "TEST_Hero"}

state = {}

# Root
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert "online" in r.json().get("message", "").lower()

# Auth - register
def test_register():
    r = requests.post(f"{API}/auth/register", json=TEST_USER)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "user" in data and "token" in data
    assert data["user"]["email"] == TEST_EMAIL
    state["token"] = data["token"]
    state["user_id"] = data["user"]["id"]

def test_register_duplicate():
    r = requests.post(f"{API}/auth/register", json=TEST_USER)
    assert r.status_code == 400

# Auth - login admin
def test_login_admin():
    r = requests.post(f"{API}/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["email"] == ADMIN["email"]
    assert d["token"]
    state["admin_token"] = d["token"]

def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"})
    assert r.status_code == 401

# Auth - me
def test_me():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/auth/me", headers=h)
    assert r.status_code == 200
    assert r.json()["email"] == TEST_EMAIL

def test_me_no_auth():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401

# Auth - logout
def test_logout():
    r = requests.post(f"{API}/auth/logout")
    assert r.status_code == 200

# Content
def test_lessons():
    r = requests.get(f"{API}/lessons")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 12
    levels = {x["level"] for x in data}
    assert {"beginner", "intermediate", "advanced"}.issubset(levels)

def test_lesson_by_id():
    r = requests.get(f"{API}/lessons/b1")
    assert r.status_code == 200
    assert r.json()["id"] == "b1"

def test_lesson_404():
    r = requests.get(f"{API}/lessons/zzz")
    assert r.status_code == 404

def test_quotes():
    r = requests.get(f"{API}/quotes")
    assert r.status_code == 200
    assert len(r.json()) == 12

def test_bosses():
    r = requests.get(f"{API}/bosses")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 6, f"Expected 6 bosses, got {len(data)}"
    tiers = {b["tier"] for b in data}
    assert {"beginner", "intermediate", "advanced", "master", "legendary", "mythic"}.issubset(tiers)
    ids = {b["id"] for b in data}
    assert {"boss1", "boss2", "boss3", "boss4", "boss5", "boss6"}.issubset(ids)
    # validate boss4 specifics
    boss4 = next(b for b in data if b["id"] == "boss4")
    assert boss4["name"] == "Master Tengu"
    assert boss4["hp"] == 3500
    assert boss4["time_limit"] == 120
    for b in data:
        for k in ("hp", "time_limit", "min_wpm", "min_accuracy"):
            assert k in b

# ---------------- Phase 2: Daily Challenge ----------------
def test_daily_public():
    r = requests.get(f"{API}/daily")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "date" in d and "passage" in d and "title" in d
    assert d["xp_multiplier"] == 2.0
    assert isinstance(d["passage"], str) and len(d["passage"]) > 10
    # date is today UTC
    from datetime import datetime, timezone
    assert d["date"] == datetime.now(timezone.utc).date().isoformat()
    assert "Daily" in d["title"]

def test_daily_status_requires_auth():
    r = requests.get(f"{API}/daily/status")
    assert r.status_code == 401

def test_daily_status_authed():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/daily/status", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "completed_today" in d and "date" in d
    assert isinstance(d["completed_today"], bool)

# ---------------- Phase 2: Race Mode ----------------
def test_race_setup():
    r = requests.get(f"{API}/race")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "passage" in d and "bots" in d
    assert isinstance(d["passage"], str) and len(d["passage"]) > 10
    bots = d["bots"]
    assert len(bots) == 3
    ids = [b["id"] for b in bots]
    assert ids == ["genin", "chunin", "jonin"]
    for b in bots:
        for k in ("id", "name", "wpm", "color", "avatar"):
            assert k in b, f"Bot missing {k}: {b}"
    # WPM tiers
    wpm_map = {b["id"]: b["wpm"] for b in bots}
    assert wpm_map["genin"] == 35
    assert wpm_map["chunin"] == 55
    assert wpm_map["jonin"] == 80

# ---------------- Phase 2: Session modes ----------------
def test_session_daily_2x_xp():
    # Baseline: lesson mode
    h = {"Authorization": f"Bearer {state['token']}"}
    base_payload = {"mode": "lesson", "item_id": "b1", "wpm": 50.0, "accuracy": 100.0,
                    "duration_seconds": 30.0, "characters_typed": 125, "errors": 0}
    r1 = requests.post(f"{API}/sessions", json=base_payload, headers=h)
    assert r1.status_code == 200
    base_xp = r1.json()["xp_gain"]

    daily_payload = {**base_payload, "mode": "daily",
                     "item_id": __import__("datetime").datetime.utcnow().date().isoformat()}
    r2 = requests.post(f"{API}/sessions", json=daily_payload, headers=h)
    assert r2.status_code == 200, r2.text
    daily_xp = r2.json()["xp_gain"]
    # daily should be 2x baseline (allow for streak bonus already established)
    assert daily_xp == base_xp * 2, f"Expected 2x ({base_xp*2}), got {daily_xp}"

def test_session_custom_mode():
    h = {"Authorization": f"Bearer {state['token']}"}
    payload = {"mode": "custom", "item_id": "user_text", "wpm": 40.0, "accuracy": 95.0,
               "duration_seconds": 20.0, "characters_typed": 80, "errors": 4}
    r = requests.post(f"{API}/sessions", json=payload, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    # 40 * 0.95 * (20/60) * 10 = 126.67 -> 126
    assert d["xp_gain"] >= 100 and d["xp_gain"] <= 135

def test_session_race_won_bonus():
    h = {"Authorization": f"Bearer {state['token']}"}
    base = {"mode": "race", "item_id": "race1", "wpm": 50.0, "accuracy": 100.0,
            "duration_seconds": 30.0, "characters_typed": 125, "errors": 0, "won": False}
    r1 = requests.post(f"{API}/sessions", json=base, headers=h)
    assert r1.status_code == 200
    no_win = r1.json()["xp_gain"]

    won = {**base, "won": True}
    r2 = requests.post(f"{API}/sessions", json=won, headers=h)
    assert r2.status_code == 200
    win_xp = r2.json()["xp_gain"]
    assert win_xp == no_win + 100, f"Race-won should add +100, got diff={win_xp - no_win}"

# Sessions
def test_record_session():
    h = {"Authorization": f"Bearer {state['token']}"}
    payload = {"mode": "lesson", "item_id": "b1", "item_title": "Home Row",
               "wpm": 45.0, "accuracy": 95.0, "duration_seconds": 30.0,
               "characters_typed": 100, "errors": 5}
    r = requests.post(f"{API}/sessions", json=payload, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["xp_gain"] > 0
    assert d["new_xp"] > 0
    assert d["streak"] >= 1
    assert d["best_wpm"] >= 45.0
    # achievements may already be earned by prior tests in run order; just verify field exists
    assert isinstance(d["new_achievements"], list)

def test_boss_session_slayer():
    h = {"Authorization": f"Bearer {state['token']}"}
    payload = {"mode": "boss", "item_id": "boss1", "item_title": "Shadow Genin",
               "wpm": 50.0, "accuracy": 92.0, "duration_seconds": 45.0,
               "characters_typed": 200, "errors": 8, "won": True}
    r = requests.post(f"{API}/sessions", json=payload, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "boss_slayer" in d["new_achievements"]

def test_history():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/sessions/history", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 2
    # desc sort
    assert data[0]["created_at"] >= data[1]["created_at"]

def test_stats_me():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/stats/me", headers=h)
    assert r.status_code == 200
    d = r.json()
    assert "user" in d and "sessions" in d
    assert d["user"]["total_sessions"] >= 2
    # asc sort
    s = d["sessions"]
    if len(s) >= 2:
        assert s[0]["created_at"] <= s[-1]["created_at"]

# Leaderboard
@pytest.mark.parametrize("metric", ["wpm", "xp", "streak"])
def test_leaderboard(metric):
    r = requests.get(f"{API}/leaderboard?metric={metric}")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) <= 20

# Achievements
def test_achievements():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/achievements", headers=h)
    assert r.status_code == 200
    d = r.json()
    assert len(d["all"]) == 8
    assert isinstance(d["unlocked"], list)
