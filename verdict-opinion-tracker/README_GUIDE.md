# Verdict — Python Backend Guide

## Architecture

```text
Browser (HTML/CSS/JS)
        ↓
Python FastAPI
        ├── Email OTP → Brevo
        ├── User/admin sessions
        ├── Institution + application data
        ├── Anonymous voting
        ├── Activity logging
        └── Photo upload
```

## API endpoints

- `POST /api/auth` — request/resend/verify email OTP
- `POST /api/store` — accounts, institution code, sessions and application data
- `POST /api/ballot` — anonymous voting
- `POST /api/activity` — anonymous activity logs
- `GET/POST /api/photos` — profile/candidate/party photos

## Brevo key location

Create `.env` beside `app.py`:

```text
BREVO_API_KEY=YOUR_REAL_BREVO_API_KEY
BREVO_FROM_EMAIL=thokesehoaap@gmail.com
BREVO_FROM_NAME=Verdict
BREVO_REPLY_TO=thokesehoaap@gmail.com
```

`.env` is ignored by Git via `.gitignore`.

## Local run

```text
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`.

## Authentication flow

```text
Email → Institution Code → OTP → Verification Complete → Home
```

Face authentication and browser location authentication were deliberately removed from this version.
