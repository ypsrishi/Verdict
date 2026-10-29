from __future__ import annotations

import hashlib, hmac, json, os, re, secrets, threading, time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
DATA_DIR = ROOT / "storage" / "data"
PHOTO_DIR = ROOT / "storage" / "photos"
SESSION_DIR = ROOT / "storage" / "sessions"
STORE_FILE = DATA_DIR / "store.json"
BALLOT_FILE = DATA_DIR / "ballots.json"
SECRET_FILE = DATA_DIR / "secret.key"
PHOTO_INDEX = DATA_DIR / "photos.json"
LOCK = threading.RLock()

DB_KEYS = ["surveys", "parties", "participants", "announcements", "notifications", "adminNotifications", "activity", "links", "applications"]
ALLOWED_PHOTO = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
BREVO_FROM_EMAIL = os.getenv("BREVO_FROM_EMAIL", "thokesehoaap@gmail.com").strip()
BREVO_FROM_NAME = os.getenv("BREVO_FROM_NAME", "Verdict").strip()
BREVO_REPLY_TO = os.getenv("BREVO_REPLY_TO", BREVO_FROM_EMAIL).strip()
OTP_SUBJECT = os.getenv("OTP_SUBJECT", "Your Verdict verification code")

app = FastAPI(title="Verdict API")
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "change-this-local-secret"), max_age=30 * 86400, same_site="lax", https_only=False)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def empty_db():
    d = {"constituencies": {}}
    for k in DB_KEYS:
        d[k] = []
    return d


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def read_store():
    with LOCK:
        d = read_json(STORE_FILE, {})
        d.setdefault("admins", {})
        d.setdefault("institutions", {})
        if "DEMO2026" not in d["institutions"]:
            d["institutions"]["DEMO2026"] = {
                "code": "DEMO2026", "name": "Verdict Demo 2026", "adminIds": [], "created": now_iso(), "db": empty_db()
            }
            write_json(STORE_FILE, d)
        return d


def write_store(s):
    with LOCK:
        write_json(STORE_FILE, s)


def clean_str(s, max_len=120):
    return str(s or "").strip()[:max_len]


def norm_code(c): return clean_str(c, 15).upper()
def code_ok(c): return bool(re.fullmatch(r"[A-Z0-9-]{4,15}", c))

def valid_email(e):
    e = str(e or "").strip().lower()
    return len(e) <= 190 and bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", e))


def recompute_shares(db):
    totals = {}
    for p in db.get("participants", []):
        c = p.get("constId", "")
        totals[c] = totals.get(c, 0) + int(p.get("votes", 0) or 0)
    for p in db.get("participants", []):
        t = totals.get(p.get("constId", ""), 0)
        p["share"] = round((int(p.get("votes", 0) or 0) / t) * 100) if t else 0


def public_admin(a): return {"id": a["id"], "name": a["name"], "email": a["email"]}
def inst_public(i): return {"code": i["code"], "name": i["name"]}


def find_admin(store, email):
    for aid, a in store.get("admins", {}).items():
        if a.get("email", "").lower() == email.lower(): return aid
    return None


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return "pbkdf2$200000$" + salt.hex() + "$" + digest.hex()


def verify_password(password, encoded):
    try:
        _, rounds, salt_hex, digest_hex = encoded.split("$", 3)
        got = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)).hex()
        return hmac.compare_digest(got, digest_hex)
    except Exception:
        return False


def by_id(items): return {str(x["id"]): x for x in items if isinstance(x, dict) and "id" in x}
def same(a, b): return a == b

def delta(server_val, client_val, base_val):
    return max(0, int(server_val or 0) + (int(client_val or 0) - int(base_val or 0)))


def merge_list(base, client, server, can_add=False, can_delete=False, edit=None, on_add=None):
    bi, ci, si = by_id(base), by_id(client), by_id(server)
    server_only = {i: x for i, x in si.items() if i not in bi and i not in ci}
    if can_delete:
        for i in list(bi):
            if i not in ci: si.pop(i, None)
    for i, item in ci.items():
        if i not in bi:
            if not can_add: continue
            if on_add:
                item = on_add(dict(item))
                if item is None: continue
            si[i] = item
        elif not same(bi[i], item) and i in si and edit:
            res = edit(dict(si[i]), dict(item), dict(bi[i]))
            if res is not None: si[i] = res
    out = []
    for i in server_only:
        if i in si: out.append(si[i])
    for i in ci:
        if i in si: out.append(si[i])
    for i, x in si.items():
        if x not in out: out.append(x)
    return out


def merge_db(inst, client_db, base_db, role, email):
    server = inst["db"]
    out = json.loads(json.dumps(server))
    is_admin = role == "admin"
    for k in DB_KEYS:
        b, c, s = base_db.get(k, []), client_db.get(k, []), server.get(k, [])
        if is_admin:
            def edit(srv, cli, base, key=k):
                if key == "surveys": cli["responses"] = delta(srv.get("responses"), cli.get("responses"), base.get("responses"))
                if key == "participants": cli["votes"] = delta(srv.get("votes"), cli.get("votes"), base.get("votes"))
                return cli
            out[k] = merge_list(b, c, s, True, True, edit)
        elif k == "applications":
            def add(it):
                it["ownerEmail"] = email; it["status"] = "Pending"; it.pop("participantId", None); it.pop("adminNote", None); return it
            def edit_app(srv, cli, base):
                if srv.get("ownerEmail") != email: return None
                cli["status"] = srv.get("status"); cli["ownerEmail"] = email
                cli["participantId"] = srv.get("participantId"); cli["adminNote"] = srv.get("adminNote"); return cli
            out[k] = merge_list(b, c, s, True, False, edit_app, add)
        elif k in ("adminNotifications", "activity", "notifications"):
            out[k] = merge_list(b, c, s, True, False)
    bc, cc, sc = base_db.get("constituencies", {}), client_db.get("constituencies", {}), server.get("constituencies", {})
    if is_admin:
        res = {}
        for sid, lst in sc.items():
            if sid not in bc or sid in cc: res[sid] = lst
        for sid, lst in cc.items():
            res[sid] = merge_list(bc.get(sid, []), lst, sc.get(sid, {}), True, True, lambda s,c,b: c)
        out["constituencies"] = res
    else:
        out["constituencies"] = sc
    recompute_shares(out)
    return out


def view_for(db, role, email):
    if role == "admin": return db
    v = json.loads(json.dumps(db))
    drafts = {s["id"] for s in db.get("surveys", []) if s.get("status") == "Draft"}
    v["surveys"] = [s for s in db.get("surveys", []) if s.get("id") not in drafts]
    v["participants"] = [p for p in db.get("participants", []) if p.get("surveyId") not in drafts and p.get("active", True) is not False]
    v["constituencies"] = {sid: lst for sid, lst in db.get("constituencies", {}).items() if sid not in drafts}
    v["adminNotifications"], v["activity"], v["links"] = [], [], []
    v["applications"] = [a for a in db.get("applications", []) if a.get("ownerEmail") == email]
    v["notifications"] = [n for n in db.get("notifications", []) if not n.get("to") or n.get("to") == email]
    return v


def current_participant(request): return request.session.get("p")
def current_admin(request): return request.session.get("admin_id")

def require_participant(request):
    p = current_participant(request)
    if not p: raise HTTPException(401, "Please sign in first")
    return p


def json_ok(data=None):
    d = {"ok": True}; d.update(data or {}); return JSONResponse(d, headers={"Cache-Control":"no-store"})
def json_fail(status, message, **extra):
    d = {"ok": False, "error": message}; d.update(extra); return JSONResponse(d, status_code=status, headers={"Cache-Control":"no-store"})


async def brevo_send(email, code):
    if not BREVO_API_KEY:
        return False, "Brevo API key is not configured on the server."
    html = f'''<!doctype html><html><body style="margin:0;background:#f4f6fa;font-family:Arial,sans-serif;color:#172033"><div style="max-width:520px;margin:32px auto;padding:28px;background:#fff;border:1px solid #e4e8f0;border-radius:14px"><h2>Verdict email verification</h2><p style="color:#536078">Use the verification code below to continue.</p><div style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;padding:18px 10px;background:#f5f7fb;border-radius:10px">{code}</div><p style="color:#536078">This code expires in 90 seconds. Do not share it with anyone.</p></div></body></html>'''
    payload = {"sender":{"name":BREVO_FROM_NAME,"email":BREVO_FROM_EMAIL},"replyTo":{"email":BREVO_REPLY_TO,"name":BREVO_FROM_NAME},"to":[{"email":email}],"subject":OTP_SUBJECT,"htmlContent":html,"textContent":f"Your Verdict verification code is: {code}\n\nThis code expires in 90 seconds. Do not share it with anyone."}
    try:
        async with httpx.AsyncClient(timeout=15, verify=True) as client:
            r = await client.post(BREVO_API_URL, headers={"accept":"application/json","api-key":BREVO_API_KEY,"content-type":"application/json"}, json=payload)
        if not 200 <= r.status_code < 300:
            try: detail = r.json().get("message", "")
            except Exception: detail = ""
            return False, detail or "Brevo rejected the email request."
        return True, ""
    except Exception as e:
        return False, f"Could not connect to the email service: {e}"


@app.post("/api/auth")
async def auth(request: Request):
    data = await request.json()
    action = data.get("action", "")
    if action in ("request_otp", "resend_otp"):
        if action == "request_otp":
            email = str(data.get("email", "")).strip().lower()
            if not valid_email(email): return json_fail(400, "Enter a valid email address.")
        else:
            state = request.session.get("email_otp", {})
            email = state.get("email", "")
            if not valid_email(email): return json_fail(400, "Your email verification session has expired. Please enter your email again.")
            left = 30 - (int(time.time()) - int(state.get("sentAt", 0)))
            if left > 0: return json_fail(429, "Please wait before requesting another code.", retryAfter=left)
        code = f"{secrets.randbelow(900000)+100000:06d}"
        ok, err = await brevo_send(email, code)
        if not ok: return json_fail(503, err)
        request.session["email_otp"] = {"email": email, "hash": hashlib.sha256(code.encode()).hexdigest(), "expiresAt": int(time.time())+90, "sentAt": int(time.time()), "attemptsLeft": 5}
        return json_ok({"email":email,"expiresInMs":90000,"resendCooldownMs":30000})
    if action == "verify_otp":
        s = request.session.get("email_otp")
        if not s: return json_fail(400, "Your verification session has expired. Please enter your email again.", code="NO_SESSION")
        if int(time.time()) > int(s.get("expiresAt", 0)):
            request.session.pop("email_otp", None); return json_fail(400, "This code has expired.", code="EXPIRED")
        if int(s.get("attemptsLeft", 0)) <= 0: return json_fail(429, "Too many incorrect attempts. Request a new code.", code="LOCKED")
        code = re.sub(r"\D", "", str(data.get("code", "")))
        good = len(code) == 6 and hmac.compare_digest(hashlib.sha256(code.encode()).hexdigest(), s.get("hash", ""))
        if not good:
            s["attemptsLeft"] = int(s.get("attemptsLeft", 0)) - 1
            request.session["email_otp"] = s
            return json_fail(400, "Incorrect verification code.", code="INCORRECT", attemptsLeft=s["attemptsLeft"])
        email = s["email"]
        request.session.pop("email_otp", None)
        request.session["email_verified"] = email
        return json_ok({"email":email,"token":"email-session-"+secrets.token_hex(12)})
    return json_fail(400, "Unknown authentication action.")


@app.post("/api/store")
async def store_api(request: Request):
    data = await request.json(); action = data.get("action", "")
    store = read_store()
    def resolve(scope):
        if scope == "admin":
            aid = current_admin(request); a = store.get("admins", {}).get(aid)
            if not a or a.get("instCode") not in store["institutions"]: return None
            return {"role":"admin","admin":a,"code":a["instCode"],"email":None}
        p = current_participant(request)
        if not p or p.get("code") not in store["institutions"]: return None
        return {"role":"participant","admin":None,"code":p["code"],"email":p["email"]}
    if action == "bootstrap":
        who = resolve("admin" if data.get("scope") == "admin" else "participant")
        if not who: return json_ok({"role":None,"admin":None,"inst":None,"db":None})
        inst = store["institutions"][who["code"]]
        return json_ok({"role":who["role"],"admin":public_admin(who["admin"]) if who["admin"] else None,"inst":inst_public(inst),"email":who["email"],"db":view_for(inst["db"],who["role"],who["email"])})
    if action == "admin_register":
        name=clean_str(data.get("name"),80); email=clean_str(data.get("email"),120).lower(); pw=str(data.get("password", "")); org=clean_str(data.get("orgName"),120); code=norm_code(data.get("code"))
        if not name:return json_fail(400,"Enter your name",field="name")
        if not valid_email(email):return json_fail(400,"Enter a valid email address",field="email")
        if len(pw)<8:return json_fail(400,"Password must be at least 8 characters",field="password")
        if not org:return json_fail(400,"Enter your institution or organisation name",field="orgName")
        if not code_ok(code):return json_fail(400,"Code must be 4–15 letters, numbers or hyphens",field="code")
        with LOCK:
            store=read_store()
            if find_admin(store,email) is not None:return json_fail(409,"An account with this email already exists. Sign in instead.",field="email")
            if code in store["institutions"]:return json_fail(409,"This institution code is already taken. Try another one.",field="code")
            aid="adm_"+secrets.token_hex(6); a={"id":aid,"name":name,"email":email,"passHash":hash_password(pw),"instCode":code,"created":now_iso()}
            inst={"code":code,"name":org,"adminIds":[aid],"created":now_iso(),"db":empty_db()}; store["admins"][aid]=a; store["institutions"][code]=inst; write_store(store)
        request.session.clear(); request.session["admin_id"]=aid
        return json_ok({"admin":public_admin(a),"inst":inst_public(inst)})
    if action == "admin_login":
        email=clean_str(data.get("email"),120).lower(); pw=str(data.get("password", "")); aid=find_admin(store,email)
        if aid is None or not verify_password(pw,store["admins"][aid].get("passHash","")): return json_fail(401,"Incorrect email or password")
        request.session.clear(); request.session["admin_id"]=aid; a=store["admins"][aid]
        return json_ok({"admin":public_admin(a),"inst":inst_public(store["institutions"][a["instCode"]])})
    if action == "admin_logout": request.session.pop("admin_id",None); return json_ok()
    if action == "check_code":
        code=norm_code(data.get("code"))
        if not code_ok(code): return json_fail(400,"Use 4–15 letters or numbers, e.g. RIDGEVIEW26")
        if code not in store["institutions"]: return json_fail(404,"No institution found with this code. Check it with your administrator.")
        return json_ok({"inst":inst_public(store["institutions"][code])})
    if action == "join":
        code=norm_code(data.get("code")); email=str(data.get("email","")).strip().lower()
        if code not in store["institutions"]: return json_fail(404,"Institution code not found")
        if not valid_email(email): return json_fail(400,"Invalid email address")
        request.session["p"]={"code":code,"email":email}; return json_ok({"inst":inst_public(store["institutions"][code])})
    if action == "leave": request.session.pop("p",None); return json_ok()
    if action == "save":
        scope="admin" if data.get("scope")=="admin" else "participant"; client=data.get("db"); base=data.get("base") or {}
        if not isinstance(client,dict): return json_fail(400,"Missing data")
        who=resolve(scope)
        if not who:return json_fail(401,"Session expired. Please sign in again.",expired=True)
        with LOCK:
            store=read_store(); inst=store["institutions"][who["code"]]; inst["db"]=merge_db(inst,client,base,who["role"],who["email"]); inst["updated"]=now_iso(); write_store(store)
        return json_ok({"db":view_for(inst["db"],who["role"],who["email"])})
    if action == "update_institution":
        name=clean_str(data.get("name"),120); code=norm_code(data.get("code")); aid=current_admin(request); store=read_store(); a=store.get("admins",{}).get(aid)
        if not a:return json_fail(401,"Session expired. Please sign in again.",expired=True)
        if not name:return json_fail(400,"Enter the institution name")
        if not code_ok(code):return json_fail(400,"Code must be 4–15 letters, numbers or hyphens")
        old=a["instCode"]
        if code!=old and code in store["institutions"]:return json_fail(409,"This institution code is already taken.")
        if code!=old:
            inst=store["institutions"].pop(old); inst["code"]=code; store["institutions"][code]=inst
            for x in inst.get("adminIds",[]):
                if x in store["admins"]:store["admins"][x]["instCode"]=code
        store["institutions"][code]["name"]=name; write_store(store)
        return json_ok({"inst":inst_public(store["institutions"][code])})
    return json_fail(400,"Unknown action")


def secret_key():
    if not SECRET_FILE.exists():
        SECRET_FILE.parent.mkdir(parents=True,exist_ok=True); SECRET_FILE.write_text(secrets.token_hex(32),encoding="utf-8")
    return SECRET_FILE.read_text(encoding="utf-8").strip()

def voter_token(code,survey,email): return hmac.new(secret_key().encode(), f"{code}|{survey}|{email}".encode(), hashlib.sha256).hexdigest()

@app.post("/api/ballot")
async def ballot_api(request: Request):
    p=require_participant(request); data=await request.json(); code,email=p["code"],p["email"]; store=read_store()
    if code not in store["institutions"]: return json_fail(401,"Session expired",expired=True)
    action=data.get("action",""); inst=store["institutions"]; db=inst[code]["db"]; ballots=read_json(BALLOT_FILE,{})
    ballots.setdefault(code,{"registry":{},"ballots":[]}); ballots[code].setdefault("registry",{}); ballots[code].setdefault("ballots",[])
    if action=="status":
        voted=[]
        for sv in db.get("surveys",[]):
            if voter_token(code,sv.get("id",""),email) in ballots[code]["registry"].get(sv.get("id",""),{}): voted.append(sv.get("id"))
        return json_ok({"voted":voted})
    if action=="cast":
        survey=clean_str(data.get("surveyId"),60); candidate=clean_str(data.get("candidateId"),60); anon=str(data.get("anonId","")).lower()
        if not re.fullmatch(r"[a-f0-9]{32}",anon): return json_fail(400,"Missing anonymous ID. Please sign in again.")
        sv=next((x for x in db.get("surveys",[]) if x.get("id")==survey),None)
        if not sv:return json_fail(404,"Survey not found")
        if sv.get("status")!="Active":return json_fail(409,"This survey is not open for responses")
        ci=next((i for i,x in enumerate(db.get("participants",[])) if x.get("id")==candidate),None)
        if ci is None:return json_fail(409,"That candidate is not available")
        cand=db["participants"][ci]
        if cand.get("surveyId")!=survey or cand.get("active",True) is False:return json_fail(409,"That candidate is not available")
        const_open=any(x.get("id")==cand.get("constId") and x.get("eligible",False) for x in db.get("constituencies",{}).get(survey,[]))
        if not const_open:return json_fail(409,"This constituency is closed for responses")
        tok=voter_token(code,survey,email); ballots[code]["registry"].setdefault(survey,{})
        if tok in ballots[code]["registry"][survey]:return json_fail(409,"You have already responded to this survey",already=True)
        ballots[code]["registry"][survey][tok]=1
        receipt=secrets.token_hex(8); b={"id":receipt,"anonId":anon,"surveyId":survey,"constId":cand.get("constId"),"candidateId":candidate,"day":datetime.now().date().isoformat()}; lst=ballots[code]["ballots"]; import random; lst.insert(secrets.randbelow(len(lst)+1),b)
        sv["responses"]=int(sv.get("responses",0))+1; cand["votes"]=int(cand.get("votes",0))+1; recompute_shares(db); write_json(BALLOT_FILE,ballots); write_store(store)
        return json_ok({"receipt":receipt})
    if action=="receipt":
        r=re.sub(r"[^a-f0-9]","",str(data.get("receipt","")).lower())
        for b in ballots[code]["ballots"]:
            if b.get("id")==r:
                if data.get("anonId")!=b.get("anonId"):return json_fail(403,"This receipt belongs to a different voter")
                return json_ok({"surveyId":b["surveyId"],"candidateId":b["candidateId"],"day":b["day"]})
        return json_fail(404,"Receipt not found")
    return json_fail(400,"Unknown action")

@app.post("/api/activity")
async def activity_api(request: Request):
    data=await request.json(); action=data.get("action",""); actdir=DATA_DIR/"user-activity"; actdir.mkdir(parents=True,exist_ok=True)
    if action=="log":
        p=require_participant(request); anon=str(data.get("anonId","")).lower();
        if not re.fullmatch(r"[a-f0-9]{32}",anon):return json_fail(400,"Bad id")
        events=data.get("events",[])[:60] if isinstance(data.get("events"),list) else []; lines=[]
        for e in events:
            if not isinstance(e,dict) or e.get("type") not in ["page_view","click","tab_hidden","tab_visible"]:continue
            page=str(e.get("page","/")); page=page if re.fullmatch(r"/[A-Za-z0-9_\-/:]{0,80}",page) else "/"
            if page=="/submit" or page.startswith("/submit/") or page=="/success" or page.startswith("/success/"):continue
            ev={"a":anon,"t":int(e.get("t",time.time()*1000)),"type":e["type"],"page":page}
            if e["type"]=="click":ev["label"]=re.sub(r"\s+"," ",re.sub(r"<[^>]*>","",str(e.get("label","")))).strip()[:60];ev["el"]=re.sub(r"[^a-z0-9_\-]","",str(e.get("el",""))[:24],flags=re.I)
            lines.append(json.dumps(ev,ensure_ascii=False))
        if lines:(actdir/f"{re.sub(r'[^A-Z0-9-]','',p['code'])}.jsonl").open("a",encoding="utf-8").write("\n".join(lines)+"\n")
        return json_ok({"saved":len(lines)})
    aid=current_admin(request); store=read_store(); a=store.get("admins",{}).get(aid)
    if not a:return json_fail(401,"Admin sign-in required",expired=True)
    f=actdir/f"{re.sub(r'[^A-Z0-9-]','',a['instCode'])}.jsonl"; rows=[]
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            try:rows.append(json.loads(line))
            except:pass
    if action=="summary":
        by={}
        for e in rows:
            x=by.setdefault(e["a"],{"anonId":e["a"],"events":0,"clicks":0,"pages":0,"first":e["t"],"last":e["t"],"lastPage":e["page"]});x["events"]+=1;x["clicks"]+=e["type"]=="click";x["pages"]+=e["type"]=="page_view";x["first"]=min(x["first"],e["t"]); 
            if e["t"]>=x["last"]:x["last"]=e["t"];x["lastPage"]=e["page"]
        return json_ok({"users":sorted(by.values(),key=lambda x:x["last"],reverse=True)[:500],"totalEvents":len(rows)})
    if action=="events":
        anon=str(data.get("anonId","")).lower(); mine=sorted([e for e in rows if e.get("a")==anon],key=lambda x:x["t"],reverse=True);return json_ok({"events":mine[:500],"total":len(mine)})
    return json_fail(400,"Unknown action")

@app.api_route("/api/photos", methods=["GET","POST"])
async def photos_api(request: Request, photo: UploadFile|None=File(None), kind: str|None=Form(None), owner: str|None=Form(None), id: str|None=Form(None)):
    if not current_participant(request) and not current_admin(request):return json_fail(401,"Please sign in first")
    action=request.query_params.get("action") or (await request.form()).get("action") if request.method=="POST" else request.query_params.get("action")
    action=action or ""
    PHOTO_DIR.mkdir(parents=True,exist_ok=True); index=read_json(PHOTO_INDEX,[])
    if action=="upload":
        if not photo or kind not in {"profile","candidate","party"}: return json_fail(400,"Invalid photo upload")
        content=await photo.read()
        if len(content)>5*1024*1024:return json_fail(413,"File larger than 5 MB")
        mime=photo.content_type or ""; ext=ALLOWED_PHOTO.get(mime)
        if not ext:return json_fail(415,"Only JPG, PNG or WEBP allowed")
        pid=secrets.token_hex(12); folder=PHOTO_DIR/kind;folder.mkdir(parents=True,exist_ok=True);name=f"{pid}.{ext}";(folder/name).write_bytes(content)
        index.append({"id":pid,"kind":kind,"owner":str(owner or "").lower(),"file":f"{kind}/{name}","mime":mime,"size":len(content),"created":now_iso()});write_json(PHOTO_INDEX,index);return json_ok({"id":pid,"kind":kind})
    if action=="get":
        pid=request.query_params.get("id","")
        for p in index:
            if p.get("id")==pid:
                f=PHOTO_DIR/p["file"]
                if f.exists():return Response(f.read_bytes(),media_type=p.get("mime","application/octet-stream"),headers={"Cache-Control":"private, max-age=3600"})
        return json_fail(404,"Not found")
    if action=="list":
        k=request.query_params.get("kind","");o=request.query_params.get("owner","").lower();return json_ok({"photos":[p for p in index if (not k or p.get("kind")==k) and (not o or p.get("owner")==o)]})
    if action=="delete":
        pid=str(id or ""); found=False
        for p in list(index):
            if p.get("id")==pid:
                try:(PHOTO_DIR/p["file"]).unlink()
                except:pass
                index.remove(p);found=True
        if not found:return json_fail(404,"Not found")
        write_json(PHOTO_INDEX,index);return json_ok()
    return json_fail(400,"Unknown action")


# Static frontend. API routes above take precedence.
@app.get("/", include_in_schema=False)
async def root_page():
    return FileResponse(ROOT / "index.html")

app.mount("/", StaticFiles(directory=ROOT, html=False), name="frontend")
