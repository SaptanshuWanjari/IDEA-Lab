"""add jobs and regulation_versions tables

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'jobs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('kind', sa.String(length=100), nullable=False),
        sa.Column('source_version_id', sa.String(length=100), nullable=True),
        sa.Column('idempotency_key', sa.String(length=300), nullable=False),
        sa.Column('content_hash', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('model_version', sa.String(length=100), nullable=True),
        sa.Column('prompt_version', sa.String(length=100), nullable=True),
        sa.Column('error_category', sa.String(length=100), nullable=True),
        sa.Column('correlation_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key'),
    )
    op.create_index(op.f('ix_jobs_kind'), 'jobs', ['kind'], unique=False)
    op.create_index(op.f('ix_jobs_source_version_id'), 'jobs', ['source_version_id'], unique=False)
    op.create_index(op.f('ix_jobs_idempotency_key'), 'jobs', ['idempotency_key'], unique=True)
    op.create_index(op.f('ix_jobs_status'), 'jobs', ['status'], unique=False)
    op.create_index(op.f('ix_jobs_correlation_id'), 'jobs', ['correlation_id'], unique=False)

    op.create_table(
        'regulation_versions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('regulation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('content_hash', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft'),
        sa.Column('bank_id', sa.String(length=100), nullable=True),
        sa.Column('legal_entity_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['regulation_id'], ['regulations.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_regulation_versions_regulation_id'), 'regulation_versions', ['regulation_id'], unique=False)
    op.create_index(op.f('ix_regulation_versions_content_hash'), 'regulation_versions', ['content_hash'], unique=False)
    op.create_index(op.f('ix_regulation_versions_bank_id'), 'regulation_versions', ['bank_id'], unique=False)
    op.create_index(op.f('ix_regulation_versions_legal_entity_id'), 'regulation_versions', ['legal_entity_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_regulation_versions_legal_entity_id'), table_name='regulation_versions')
    op.drop_index(op.f('ix_regulation_versions_bank_id'), table_name='regulation_versions')
    op.drop_index(op.f('ix_regulation_versions_content_hash'), table_name='regulation_versions')
    op.drop_index(op.f('ix_regulation_versions_regulation_id'), table_name='regulation_versions')
    op.drop_table('regulation_versions')
    op.drop_index(op.f('ix_jobs_correlation_id'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_status'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_idempotency_key'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_source_version_id'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_kind'), table_name='jobs')
    op.drop_table('jobs')
