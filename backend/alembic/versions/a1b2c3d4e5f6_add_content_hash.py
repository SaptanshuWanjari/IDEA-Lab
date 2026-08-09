"""add content_hash to regulations

Revision ID: a1b2c3d4e5f6
Revises: 74e421eec5c0
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '74e421eec5c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('regulations', sa.Column('content_hash', sa.String(length=64), nullable=True))
    op.create_index(op.f('ix_regulations_content_hash'), 'regulations', ['content_hash'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_regulations_content_hash'), table_name='regulations')
    op.drop_column('regulations', 'content_hash')
