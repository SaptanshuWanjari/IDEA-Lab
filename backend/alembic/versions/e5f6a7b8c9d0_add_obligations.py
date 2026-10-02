"""add obligations ledger table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'obligations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('regulation_version_id', sa.String(length=100), nullable=False),
        sa.Column('clause_id', sa.String(length=50), nullable=False),
        sa.Column('quote', sa.Text(), nullable=False),
        sa.Column('page', sa.Integer(), nullable=True),
        sa.Column('obligation_text', sa.Text(), nullable=False, server_default=''),
        sa.Column('deadline_kind', sa.String(length=20), nullable=True),
        sa.Column('deadline_value', sa.Integer(), nullable=True),
        sa.Column('deadline_unit', sa.String(length=20), nullable=True),
        sa.Column('deadline_anchor', sa.Text(), nullable=True),
        sa.Column('owner_hint', sa.String(length=200), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='DRAFT'),
        sa.Column('bank_id', sa.String(length=100), nullable=True),
        sa.Column('legal_entity_id', sa.String(length=100), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('reviewed_by', sa.String(length=100), nullable=True),
        sa.Column('reviewer_rationale', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_obligations_regulation_version_id'), 'obligations', ['regulation_version_id'], unique=False)
    op.create_index(op.f('ix_obligations_bank_id'), 'obligations', ['bank_id'], unique=False)
    op.create_index(op.f('ix_obligations_legal_entity_id'), 'obligations', ['legal_entity_id'], unique=False)
    op.create_index(op.f('ix_obligations_status'), 'obligations', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_obligations_status'), table_name='obligations')
    op.drop_index(op.f('ix_obligations_legal_entity_id'), table_name='obligations')
    op.drop_index(op.f('ix_obligations_bank_id'), table_name='obligations')
    op.drop_index(op.f('ix_obligations_regulation_version_id'), table_name='obligations')
    op.drop_table('obligations')
