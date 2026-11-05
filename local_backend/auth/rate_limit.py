"""Single shared slowapi Limiter instance — must be the same object the app
registers as app.state.limiter and every rate-limited route decorates with."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
