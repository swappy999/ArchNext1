from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.core.config import settings
from app.models.base import Base

# SQLAlchemy Async Engine
# We use a small local pool with pre_ping to handle Supavisor's aggressive disconnects
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=True,    # Verify connection is alive before using it
    connect_args={
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
        "command_timeout": 30,
        "server_settings": {
            "application_name": "archnext",
            "statement_timeout": "30000"
        }
    }
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def init_db():
    print("Initializing PostgreSQL database connection...")
    try:
        # Create all tables (In production, use Alembic migrations instead)
        async with engine.begin() as conn:
            # await conn.run_sync(Base.metadata.drop_all) # Optional reset
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] PostgreSQL Engine: Active Intelligence Layer connected.")
    except Exception as e:
        print(f"[ERROR] Engine Failure during PostgreSQL startup: {e}")

async def close_db():
    if engine:
        await engine.dispose()
        print("PostgreSQL connection pool closed.")

# FastAPI Dependency for Session Management
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

