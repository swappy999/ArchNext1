from fastapi import FastAPI, Request, Response
from app.core.config import settings
from app.core.event_listener import lifespan_with_indexer
from app.api.routes import auth
from app.api.routes import user
from app.api.routes import properties
from app.api.routes import prediction
from app.api.routes import geo
from app.api.routes import map as map_routes
from app.api.routes import blockchain
from app.api.routes import nft
from app.api.routes import marketplace
from app.api.routes import portfolio
from app.api.routes import analytics
from app.api.routes import ai
from app.api.routes import voice
from app.api.routes import auction
from app.api.routes import verification
from app.api.routes import dev
from app.api.ws import router as ws_router

from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler

from app.core.verification.errors.handlers import register_exception_handlers
from app.core.verification.middlewares.verify_middleware import VerifyMiddleware

app = FastAPI(lifespan=lifespan_with_indexer)

# ─── Rate Limiter ────────────────────────────────────────────────────────────
# OWASP: Protects all endpoints against brute-force and DoS attacks.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ─── Exception Handlers ──────────────────────────────────────────────────────
register_exception_handlers(app)


# ─── CORS (tightened) ────────────────────────────────────────────────────────
# OWASP: Only allow specific origins and methods to reduce attack surface.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # SECURITY: no wildcard
    allow_headers=["Authorization", "Content-Type", "Accept"],  # SECURITY: explicit headers
)


# ─── Security Headers Middleware ─────────────────────────────────────────────
# OWASP: Prevent clickjacking, XSS, MIME-sniffing, and info leakage.
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"          # Prevent MIME sniffing
    response.headers["X-Frame-Options"] = "DENY"                    # Prevent clickjacking
    response.headers["X-XSS-Protection"] = "1; mode=block"         # Legacy XSS filter
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # Remove server header to hide implementation details
    if "server" in response.headers:
        del response.headers["server"]
    return response


# ─── Root ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "ArchNext Backend — AI + Blockchain + NFT Marketplace"}

# NOTE: Debug endpoints (/hash-test, /config-test, /cors-test) have been
# removed. They exposed internal configuration and hashing details.
# If needed for development, use FastAPI's /docs interface instead.


# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(user.router, prefix="/users", tags=["Users"])
app.include_router(properties.router, prefix="/properties", tags=["Properties"])
app.include_router(prediction.router, prefix="/prediction", tags=["Prediction"])
app.include_router(geo.router, prefix="/geo", tags=["Geo Intelligence"])
app.include_router(map_routes.router)
app.include_router(blockchain.router)
app.include_router(nft.router)
app.include_router(marketplace.router)
app.include_router(portfolio.router)
app.include_router(analytics.router)
app.include_router(ai.router)
app.include_router(voice.router, prefix="/voice", tags=["Voice"])
app.include_router(auction.router)
app.include_router(verification.router)
app.include_router(dev.router)
app.include_router(ws_router)
