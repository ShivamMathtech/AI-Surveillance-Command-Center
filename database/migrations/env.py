from alembic import context
from backend.app.database.session import engine
from backend.app.models.entities import Base

with engine.connect() as connection:
    context.configure(
        connection=connection, target_metadata=Base.metadata, compare_type=True
    )
    with context.begin_transaction():
        context.run_migrations()
