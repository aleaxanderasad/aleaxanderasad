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
    assert len(data) == 3
    for b in data:
        for k in ("hp", "time_limit", "min_wpm", "min_accuracy"):
            assert k in b

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
    assert "first_strike" in d["new_achievements"]
    assert "wpm_30" in d["new_achievements"]

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
