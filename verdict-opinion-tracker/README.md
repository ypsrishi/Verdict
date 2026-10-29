# Verdict Opinion Tracker — Python Backend

This build uses **Python FastAPI** instead of PHP. Face authentication and browser location authentication have been removed.

## Local setup

1. Install Python 3.11+.
2. Open a terminal in this folder.
3. Create a virtual environment:

```text
python -m venv .venv
```

4. Activate it on Windows CMD:

```text
.venv\Scripts\activate
```

5. Install dependencies:

```text
pip install -r requirements.txt
```

6. Copy `.env.example` to `.env`.
7. Put your Brevo API key in `.env`:

```text
BREVO_API_KEY=YOUR_REAL_BREVO_API_KEY
```

Do **not** put the key in HTML/JavaScript and do **not** commit `.env` to GitHub.

8. Start the backend + frontend:

```text
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

9. Open:

```text
http://127.0.0.1:8000
```

## Email OTP

The browser calls `/api/auth`. The Python backend generates the OTP and sends it through Brevo's transactional email API. The API key is read only from the server-side `.env` file.

Sender defaults:

- `thokesehoaap@gmail.com`
- `Verdict`

## Institution demo

The built-in demo institution is:

```text
DEMO2026
Verdict Demo 2026
```

## Authentication flow

```text
Email + Institution Code
        ↓
Brevo Email OTP
        ↓
OTP Verification
        ↓
Verification Complete
        ↓
Home
```

Face authentication and browser location authentication are not part of this build.
