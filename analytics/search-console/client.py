import os

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

SITE = "https://pairbo.app/"
KEY = os.environ.get(
    "PAIRBO_GSC_KEY",
    os.path.expanduser("~/.config/analytics-mcp/pairbo-ga4-reader.json"),
)


def session() -> AuthorizedSession:
    creds = service_account.Credentials.from_service_account_file(
        KEY, scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    return AuthorizedSession(creds)
