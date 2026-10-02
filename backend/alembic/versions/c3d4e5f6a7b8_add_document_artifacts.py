"""add document_artifacts quarantine custody table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-10-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'document_artifacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('object_key', sa.Text(), nullable=False),
        sa.Column('display_name', sa.String(length=500), nullable=False),
        sa.Column('detected_mime', sa.String(length=200), nullable=True),
        sa.Column('sha256', sa.String(length=64), nullable=False),
        sa.Column('state', sa.String(length=50), nullable=False),
        sa.Column('scan_result', sa.String(length=50), nullable=True),
        sa.Column('bank_id', sa.String(length=100), nullable=True),
        sa.Column('legal_entity_id', sa.String(length=100), nullable=True),
        sa.Column('classification', sa.String(length=100), nullable=True),
        sa.Column('retention_until', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('object_key'),
    )
    op.create_index(op.f('ix_document_artifacts_object_key'), 'document_artifacts', ['object_key'], unique=True)
    op.create_index(op.f('ix_document_artifacts_sha256'), 'document_artifacts', ['sha256'], unique=False)
    op.create_index(op.f('ix_document_artifacts_state'), 'document_artifacts', ['state'], unique=False)
    op.create_index(op.f('ix_document_artifacts_bank_id'), 'document_artifacts', ['bank_id'], unique=False)
    op.create_index(op.f('ix_document_artifacts_legal_entity_id'), 'document_artifacts', ['legal_entity_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_document_artifacts_legal_entity_id'), table_name='document_artifacts')
    op.drop_index(op.f('ix_document_artifacts_bank_id'), table_name='document_artifacts')
    op.drop_index(op.f('ix_document_artifacts_state'), table_name='document_artifacts')
    op.drop_index(op.f('ix_document_artifacts_sha256'), table_name='document_artifacts')
    op.drop_index(op.f('ix_document_artifacts_object_key'), table_name='document_artifacts')
    op.drop_table('document_artifacts')
