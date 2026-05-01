import os
import firebase_admin
from firebase_admin import credentials, auth
from dotenv import load_dotenv

load_dotenv()

# Resolve the service account path relative to the backend/ root directory
# (this file lives in backend/services/, so go up one level)
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_KEY_FILE = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "")
_SERVICE_ACCOUNT_PATH = os.path.join(_BACKEND_DIR, _KEY_FILE)

_firebase_app: firebase_admin.App | None = None


def _get_app() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is None:
        cred = credentials.Certificate(_SERVICE_ACCOUNT_PATH)
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def verify_id_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token issued by the frontend.
    Returns the decoded token payload (includes 'uid', 'email', etc.).
    Raises firebase_admin.auth.InvalidIdTokenError on failure.
    """
    _get_app()
    return auth.verify_id_token(id_token)
