import asyncio
from database import engine, Base
from sqlalchemy import text


async def reset():
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        print("[RESET] Schema public recréé")
        await conn.run_sync(Base.metadata.create_all)
        print("[RESET] Toutes les tables recréées")


if __name__ == "__main__":
    asyncio.run(reset())
