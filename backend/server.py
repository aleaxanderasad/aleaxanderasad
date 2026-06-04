from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="NeoType Dojo API")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRES_MIN = 60 * 24 * 7  # 7 days for typing app

# ---------------- Models ----------------
class RegisterPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)
    name: str = Field(min_length=1, max_length=40)

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar: str
    xp: int
    level: int
    streak: int
    best_wpm: float
    total_sessions: int
    role: str

class SessionPayload(BaseModel):
    mode: str  # "lesson" | "quote" | "boss"
    item_id: Optional[str] = None
    item_title: Optional[str] = None
    wpm: float
    accuracy: float
    duration_seconds: float
    characters_typed: int
    errors: int
    won: Optional[bool] = None  # boss mode only

# ---------------- Helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRES_MIN),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def user_to_out(u: dict) -> UserOut:
    return UserOut(
        id=u["id"],
        email=u["email"],
        name=u["name"],
        avatar=u.get("avatar", ""),
        xp=u.get("xp", 0),
        level=u.get("level", 1),
        streak=u.get("streak", 0),
        best_wpm=float(u.get("best_wpm", 0)),
        total_sessions=int(u.get("total_sessions", 0)),
        role=u.get("role", "user"),
    )

def xp_for_level(level: int) -> int:
    # XP needed to reach next level (cumulative)
    return 100 * level * level

def compute_level(xp: int) -> int:
    lvl = 1
    while xp >= xp_for_level(lvl):
        lvl += 1
    return lvl

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=ACCESS_TOKEN_EXPIRES_MIN * 60, path="/",
    )

# ---------------- Auth Endpoints ----------------
@api.post("/auth/register")
async def register(payload: RegisterPayload, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "avatar": f"https://api.dicebear.com/9.x/adventurer/svg?seed={uid}",
        "xp": 0,
        "level": 1,
        "streak": 0,
        "best_wpm": 0,
        "total_sessions": 0,
        "achievements": [],
        "last_practiced": None,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(uid, email)
    set_auth_cookie(response, token)
    return {"user": user_to_out(user_doc).model_dump(), "token": token}

@api.post("/auth/login")
async def login(payload: LoginPayload, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {"user": user_to_out(user).model_dump(), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_to_out(user).model_dump()

# ---------------- Sessions / Stats ----------------
ACHIEVEMENT_RULES = [
    {"id": "first_strike", "name": "First Strike", "desc": "Complete your first session", "icon": "swords"},
    {"id": "wpm_30", "name": "Apprentice", "desc": "Hit 30 WPM", "icon": "zap"},
    {"id": "wpm_60", "name": "Sensei", "desc": "Hit 60 WPM", "icon": "flame"},
    {"id": "wpm_90", "name": "Lightning Hands", "desc": "Hit 90 WPM", "icon": "bolt"},
    {"id": "accuracy_98", "name": "Iron Focus", "desc": "Achieve 98% accuracy", "icon": "target"},
    {"id": "streak_3", "name": "Daily Disciple", "desc": "3 day streak", "icon": "calendar"},
    {"id": "boss_slayer", "name": "Boss Slayer", "desc": "Defeat your first boss", "icon": "skull"},
    {"id": "sessions_10", "name": "Dojo Regular", "desc": "Complete 10 sessions", "icon": "scroll"},
]

def evaluate_achievements(user: dict, session: SessionPayload) -> List[str]:
    earned = set(user.get("achievements", []))
    new = []
    def add(aid):
        if aid not in earned:
            earned.add(aid)
            new.append(aid)
    if user.get("total_sessions", 0) + 1 >= 1:
        add("first_strike")
    if session.wpm >= 30: add("wpm_30")
    if session.wpm >= 60: add("wpm_60")
    if session.wpm >= 90: add("wpm_90")
    if session.accuracy >= 98: add("accuracy_98")
    if user.get("streak", 0) + 1 >= 3 or user.get("streak", 0) >= 3: add("streak_3")
    if session.mode == "boss" and session.won: add("boss_slayer")
    if user.get("total_sessions", 0) + 1 >= 10: add("sessions_10")
    user["achievements"] = list(earned)
    return new

@api.post("/sessions")
async def record_session(payload: SessionPayload, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    xp_gain = int(payload.wpm * (payload.accuracy / 100.0) * (payload.duration_seconds / 60.0) * 10)
    if payload.mode == "boss" and payload.won:
        xp_gain += 200
    if payload.mode == "daily":
        xp_gain = int(xp_gain * 2)  # 2x bonus for daily challenge
    if payload.mode == "race" and payload.won:
        xp_gain += 100
    xp_gain = max(xp_gain, 5)

    # Streak update
    last = user.get("last_practiced")
    streak = user.get("streak", 0)
    today = now.date().isoformat()
    if last:
        last_date = datetime.fromisoformat(last).date()
        diff = (now.date() - last_date).days
        if diff == 0:
            pass
        elif diff == 1:
            streak += 1
        else:
            streak = 1
    else:
        streak = 1

    new_xp = int(user.get("xp", 0)) + xp_gain
    new_level = compute_level(new_xp)
    best_wpm = max(float(user.get("best_wpm", 0)), float(payload.wpm))
    total_sessions = int(user.get("total_sessions", 0)) + 1

    # Evaluate achievements
    session_obj = SessionPayload(**payload.model_dump())
    user_snapshot = {**user, "streak": streak, "total_sessions": user.get("total_sessions", 0)}
    new_achievements = evaluate_achievements(user_snapshot, session_obj)

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "xp": new_xp,
            "level": new_level,
            "streak": streak,
            "best_wpm": best_wpm,
            "total_sessions": total_sessions,
            "last_practiced": now.isoformat(),
            "achievements": user_snapshot["achievements"],
        }},
    )

    session_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "mode": payload.mode,
        "item_id": payload.item_id,
        "item_title": payload.item_title,
        "wpm": payload.wpm,
        "accuracy": payload.accuracy,
        "duration_seconds": payload.duration_seconds,
        "characters_typed": payload.characters_typed,
        "errors": payload.errors,
        "won": payload.won,
        "xp_gain": xp_gain,
        "created_at": now.isoformat(),
    }
    await db.sessions.insert_one(session_doc)

    return {
        "xp_gain": xp_gain,
        "new_xp": new_xp,
        "new_level": new_level,
        "level_up": new_level > user.get("level", 1),
        "streak": streak,
        "best_wpm": best_wpm,
        "new_achievements": new_achievements,
        "achievements_meta": [a for a in ACHIEVEMENT_RULES if a["id"] in new_achievements],
    }

@api.get("/sessions/history")
async def get_history(user: dict = Depends(get_current_user)):
    docs = await db.sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs

@api.get("/stats/me")
async def my_stats(user: dict = Depends(get_current_user)):
    docs = await db.sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(30)
    docs.reverse()
    return {
        "user": user_to_out(user).model_dump(),
        "sessions": docs,
        "achievements_unlocked": user.get("achievements", []),
        "all_achievements": ACHIEVEMENT_RULES,
    }

@api.get("/achievements")
async def all_achievements(user: dict = Depends(get_current_user)):
    return {
        "all": ACHIEVEMENT_RULES,
        "unlocked": user.get("achievements", []),
    }

# ---------------- Leaderboard ----------------
@api.get("/leaderboard")
async def leaderboard(metric: str = "wpm"):
    sort_field = {"wpm": "best_wpm", "xp": "xp", "streak": "streak"}.get(metric, "best_wpm")
    docs = await db.users.find(
        {}, {"_id": 0, "id": 1, "name": 1, "avatar": 1, "xp": 1, "level": 1, "streak": 1, "best_wpm": 1}
    ).sort(sort_field, -1).limit(20).to_list(20)
    return docs

# ---------------- Content ----------------
LESSONS = [
    # BEGINNER
    {"id": "b1", "level": "beginner", "title": "Home Row Awakening", "description": "Master asdf jkl;", "text": "asdf jkl; asdf jkl; asdf jkl; asdf jkl; ask sad lad fad jak lass; salad falls; a sad lad asks dad;"},
    {"id": "b2", "level": "beginner", "title": "Top Row Trial", "description": "qwerty uiop", "text": "the quick wit quiet typer; we type quietly; quote your power; wire pure rope; quirky outer query;"},
    {"id": "b3", "level": "beginner", "title": "Bottom Row Basics", "description": "zxcv bnm,. ", "text": "zen cat moves calm; brave mage navigates xenon caves; zoom maze; vex banner; calm boxer combo;"},
    {"id": "b4", "level": "beginner", "title": "Full Alphabet Drill", "description": "Pangrams to warm up", "text": "the quick brown fox jumps over the lazy dog; pack my box with five dozen liquor jugs;"},

    # INTERMEDIATE
    {"id": "i1", "level": "intermediate", "title": "Numbers Onslaught", "description": "Digits 0-9", "text": "level 7 unlocked at 12:45 with 3 lives and 9 coins; 2024 rounds; 100 hits in 60 seconds; phase 8 done;"},
    {"id": "i2", "level": "intermediate", "title": "Symbol Storm", "description": "Punctuation & symbols", "text": "if (player.hp > 0) { attack(); } else { revive(); } @ neo-dojo.io #ranked $100% &mode=hard"},
    {"id": "i3", "level": "intermediate", "title": "Capital Combat", "description": "Mixed case practice", "text": "Naruto Shippuden ended on Friday. The Hokage met Sasuke at Konoha Gate while Sakura prepared the medical kit."},
    {"id": "i4", "level": "intermediate", "title": "Speed Endurance", "description": "Long passage", "text": "a typist trains every dawn before the sun touches the mountains the keys click in rhythm like soft rain and the focus sharpens into a blade"},

    # ADVANCED
    {"id": "a1", "level": "advanced", "title": "Code Sigils", "description": "Programming syntax", "text": "const result = items.filter((x) => x.hp > 0).map((x) => ({...x, level: x.level + 1})); console.log(`done: ${result.length}`);"},
    {"id": "a2", "level": "advanced", "title": "Speed Demon", "description": "High speed flow", "text": "Velocity matters but accuracy carves the path. Breathe in. Eyes forward. Let the fingertips remember what the mind forgets."},
    {"id": "a3", "level": "advanced", "title": "Chaos Mode", "description": "Mixed everything", "text": "@dev_001: \"shipped v2.3.1 — fixed 47 bugs, added 12 features, ~98.2% test coverage.\" 🔥 (jk no emoji) push --force ?!"},
    {"id": "a4", "level": "advanced", "title": "Master's Trial", "description": "The final passage", "text": "In the silence before the strike, the swordsman counts every breath; the typist counts every key. Mastery is not speed alone, but the harmony of precision and rhythm flowing as one."},
]

ANIME_QUOTES = [
    {"id": "q1", "anime": "Naruto", "character": "Naruto Uzumaki", "text": "I'm going to be the Hokage. No matter what it takes. Believe it."},
    {"id": "q2", "anime": "One Piece", "character": "Monkey D. Luffy", "text": "If you don't take risks, you can't create a future."},
    {"id": "q3", "anime": "Attack on Titan", "character": "Eren Yeager", "text": "If you win, you live. If you lose, you die. If you don't fight, you can't win."},
    {"id": "q4", "anime": "Bleach", "character": "Ichigo Kurosaki", "text": "We fear that which we cannot see. It's a perfectly natural feeling."},
    {"id": "q5", "anime": "My Hero Academia", "character": "All Might", "text": "Whether you win or lose, looking back and learning from your experience is a part of life."},
    {"id": "q6", "anime": "Demon Slayer", "character": "Tanjiro Kamado", "text": "No matter how many people you may lose, you have no choice but to go on living."},
    {"id": "q7", "anime": "Jujutsu Kaisen", "character": "Satoru Gojo", "text": "Throughout heaven and earth, I alone am the honored one."},
    {"id": "q8", "anime": "Hunter x Hunter", "character": "Killua Zoldyck", "text": "I'm tired of killing. I want to live a normal life with my friend Gon."},
    {"id": "q9", "anime": "Fullmetal Alchemist", "character": "Edward Elric", "text": "A lesson without pain is meaningless. You cannot gain something without sacrificing something else in return."},
    {"id": "q10", "anime": "Death Note", "character": "Light Yagami", "text": "I'll take a potato chip... and eat it!"},
    {"id": "q11", "anime": "Spirited Away", "character": "Haku", "text": "Once you've met someone, you never really forget them. It just takes a while for your memories to return."},
    {"id": "q12", "anime": "Mob Psycho 100", "character": "Reigen Arataka", "text": "You're not special. You're not a special being. But that means you're just like everyone else."},
]

BOSSES = [
    {"id": "boss1", "name": "Shadow Genin", "tier": "beginner", "hp": 800, "time_limit": 60, "min_wpm": 25, "min_accuracy": 85,
     "text": "the apprentice ninja moves fast through the bamboo forest as the moon casts long shadows on every step",
     "avatar": "https://images.pexels.com/photos/7792276/pexels-photo-7792276.jpeg"},
    {"id": "boss2", "name": "Cyber Samurai", "tier": "intermediate", "hp": 1500, "time_limit": 75, "min_wpm": 45, "min_accuracy": 90,
     "text": "in the neon-soaked alleys of neo tokyo, the chrome blade hums as data streams cut deeper than any steel could; only precision survives",
     "avatar": "https://images.pexels.com/photos/7792276/pexels-photo-7792276.jpeg"},
    {"id": "boss3", "name": "The Void Sensei", "tier": "advanced", "hp": 2500, "time_limit": 90, "min_wpm": 70, "min_accuracy": 95,
     "text": "Mastery is silence between keystrokes. The Void Sensei does not strike with force — he strikes with inevitability, each motion an unbroken sentence written across the battlefield.",
     "avatar": "https://images.pexels.com/photos/7792276/pexels-photo-7792276.jpeg"},
    {"id": "boss4", "name": "Master Tengu", "tier": "master", "hp": 3500, "time_limit": 120, "min_wpm": 85, "min_accuracy": 96,
     "text": "The Tengu's wings carve the sky like calligraphy on parchment. To match him you must type as if every key were a feather settling — light, exact, and never trembling.",
     "avatar": "https://images.pexels.com/photos/7792276/pexels-photo-7792276.jpeg"},
    {"id": "boss5", "name": "Demon Lord Akuma", "tier": "legendary", "hp": 5000, "time_limit": 150, "min_wpm": 100, "min_accuracy": 97,
     "text": "Akuma laughs in the void where mortal typists falter. His domain bends keystroke into katana. To win you must abandon hesitation — let the fingers think, let the mind dissolve into pure motion.",
     "avatar": "https://images.pexels.com/photos/7792276/pexels-photo-7792276.jpeg"},
    {"id": "boss6", "name": "Void Empress Reiko", "tier": "mythic", "hp": 7000, "time_limit": 180, "min_wpm": 120, "min_accuracy": 98,
     "text": "She is the silence between universes, the comma in eternity, the period that ends every sentence ever written. Type without rhythm and she will erase you. Type with rhythm and she will become you — both outcomes are her victory.",
     "avatar": "https://images.pexels.com/photos/7792276/pexels-photo-7792276.jpeg"},
]

# Daily challenge passages
DAILY_PASSAGES = [
    "Today the dojo turns its focus to you. Type with rhythm; let each key fall like rain on bamboo.",
    "Before the strike, breath. Before the breath, silence. Before the silence, the discipline to wait for it.",
    "A swordsman trains with a sword. A typist trains with the world. Every keystroke is a battle won quietly.",
    "Speed without precision is noise. Precision without speed is hesitation. Today, choose neither — choose both.",
    "The keyboard does not know who you are. It does not care. It only answers when you ask the right question, the right way.",
    "In the moment between intent and motion lives the entire art. Train that moment, and the rest follows.",
    "You are not racing time. You are dancing with it. Trust the rhythm and time will bow to you.",
    "Every error is a teacher disguised as a mistake. Bow to it, then continue. The dojo demands no apology.",
    "Mastery is not the absence of mistakes. It is the presence of correction so fast no one sees the mistake.",
    "Today's quote, tomorrow's reflex. Repetition is the language fingers speak. Let them recite without thinking.",
    "There are no shortcuts on the keyboard. There are only paths shorter for those who walked them already.",
    "A sensei was once a beginner who refused to stop. That is the only secret. There is no other.",
    "Sit. Breathe. Type. The world will wait. It always has. It always will.",
    "Your keyboard is older than the internet. It remembers every typist who came before you. Type for them too.",
    "The greatest battles are fought in stillness. Open the passage. Begin. Finish. You have already won.",
]

RACE_PASSAGES = [
    "in the heart of the dojo the disciples gather as the morning bell rings clear across the courtyard and the master raises a single hand to begin",
    "the speed of the wind is matched only by the speed of the will and today the will of every typist sharpens against the whetstone of practice",
    "a thousand keystrokes a minute is not the goal the goal is one keystroke perfect a thousand times in a row repeated without doubt or fear",
]

RACE_BOTS = [
    {"id": "genin", "name": "Genin Bot", "wpm": 35, "color": "#39FF14", "avatar": "https://api.dicebear.com/9.x/adventurer/svg?seed=genin"},
    {"id": "chunin", "name": "Chunin Bot", "wpm": 55, "color": "#00F0FF", "avatar": "https://api.dicebear.com/9.x/adventurer/svg?seed=chunin"},
    {"id": "jonin", "name": "Jonin Bot", "wpm": 80, "color": "#FF003C", "avatar": "https://api.dicebear.com/9.x/adventurer/svg?seed=jonin"},
]

@api.get("/lessons")
async def get_lessons():
    return LESSONS

@api.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str):
    for l in LESSONS:
        if l["id"] == lesson_id:
            return l
    raise HTTPException(404, "Lesson not found")

@api.get("/quotes")
async def get_quotes():
    return ANIME_QUOTES

@api.get("/quotes/{quote_id}")
async def get_quote(quote_id: str):
    for q in ANIME_QUOTES:
        if q["id"] == quote_id:
            return q
    raise HTTPException(404, "Quote not found")

@api.get("/bosses")
async def get_bosses():
    return BOSSES

@api.get("/bosses/{boss_id}")
async def get_boss(boss_id: str):
    for b in BOSSES:
        if b["id"] == boss_id:
            return b
    raise HTTPException(404, "Boss not found")

# ---------------- Daily Challenge ----------------
@api.get("/daily")
async def daily():
    today = datetime.now(timezone.utc).date()
    idx = today.toordinal() % len(DAILY_PASSAGES)
    return {
        "date": today.isoformat(),
        "passage": DAILY_PASSAGES[idx],
        "xp_multiplier": 2.0,
        "title": f"Daily Trial · {today.strftime('%b %d')}",
    }

@api.get("/daily/status")
async def daily_status(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    completed = await db.sessions.find_one({
        "user_id": user["id"],
        "mode": "daily",
        "item_id": today,
    })
    return {"completed_today": completed is not None, "date": today}

# ---------------- Race Mode ----------------
@api.get("/race")
async def race_setup():
    # Pick a deterministic passage per session start (random across requests is fine, but let's rotate by day)
    today_ord = datetime.now(timezone.utc).date().toordinal()
    passage = RACE_PASSAGES[today_ord % len(RACE_PASSAGES)]
    return {
        "passage": passage,
        "bots": RACE_BOTS,
    }

@api.get("/")
async def root():
    return {"message": "NeoType Dojo API online", "status": "ok"}

# ---------------- App setup ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.sessions.create_index("user_id")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@neotype.dojo")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid,
            "email": admin_email,
            "name": "Sensei",
            "password_hash": hash_password(admin_password),
            "avatar": f"https://api.dicebear.com/9.x/adventurer/svg?seed={uid}",
            "xp": 0, "level": 1, "streak": 0, "best_wpm": 0, "total_sessions": 0,
            "achievements": [], "last_practiced": None, "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    logger.info("Startup complete")

@app.on_event("shutdown")
async def shutdown():
    client.close()
