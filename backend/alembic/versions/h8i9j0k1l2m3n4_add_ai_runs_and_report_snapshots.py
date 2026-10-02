"""add ai_runs and report_snapshots (Task 10: AI provenance + immutable reports)

Revision ID: h8i9j0k1l2m3n4
Revises: g7h8i9j0k1l2
Create Date: 2026-10-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h8i9j0k1l2m3n4'
down_revision: Union[str, Sequence[str], None] = 'g7h8i9j0k1l2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'ai_runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('stage', sa.String(length=50), nullable=False),
        sa.Column('model_id', sa.String(length=200), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('prompt_version', sa.String(length=100), nullable=False),
        sa.Column('retrieval_manifest', sa.JSON(), nullable=False),
        sa.Column('input_hash', sa.String(length=64), nullable=False),
        sa.Column('output_hash', sa.String(length=64), nullable=False),
        sa.Column('validator_result', sa.JSON(), nullable=True),
        sa.Column('reviewer_outcome', sa.String(length=50), nullable=True),
        sa.Column('correlation_id', sa.String(length=100), nullable=True),
        sa.Column('regulation_version_id', sa.String(length=100), nullable=True),
        sa.Column('bank_id', sa.String(length=100), nullable=True),
        sa.Column('legal_entity_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_ai_runs_stage'), 'ai_runs', ['stage'], unique=False)
    op.create_index(op.f('ix_ai_runs_correlation_id'), 'ai_runs', ['correlation_id'], unique=False)
    op.create_index(op.f('ix_ai_runs_regulation_version_id'), 'ai_runs', ['regulation_version_id'], unique=False)
    op.create_index(op.f('ix_ai_runs_bank_id'), 'ai_runs', ['bank_id'], unique=False)
    op.create_index(op.f('ix_ai_runs_legal_entity_id'), 'ai_runs', ['legal_entity_id'], unique=False)

    op.create_table(
        'report_snapshots',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('regulation_version_id', sa.String(length=100), nullable=False),
        sa.Column('plan_id', sa.String(length=36), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('data_cutoff', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('bank_id', sa.String(length=100), nullable=True),
        sa.Column('legal_entity_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_report_snapshots_regulation_version_id'), 'report_snapshots', ['regulation_version_id'], unique=False)
    op.create_index(op.f('ix_report_snapshots_plan_id'), 'report_snapshots', ['plan_id'], unique=False)
    op.create_index(op.f('ix_report_snapshots_bank_id'), 'report_snapshots', ['bank_id'], unique=False)
    op.create_index(op.f('ix_report_snapshots_legal_entity_id'), 'report_snapshots', ['legal_entity_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_report_snapshots_legal_entity_id'), table_name='report_snapshots')
    op.drop_index(op.f('ix_report_snapshots_bank_id'), table_name='report_snapshots')
    op.drop_index(op.f('ix_report_snapshots_plan_id'), table_name='report_snapshots')
    op.drop_index(op.f('ix_report_snapshots_regulation_version_id'), table_name='report_snapshots')
    op.drop_table('report_snapshots')
    op.drop_index(op.f('ix_ai_runs_legal_entity_id'), table_name='ai_runs')
    op.drop_index(op.f('ix_ai_runs_bank_id'), table_name='ai_runs')
    op.drop_index(op.f('ix_ai_runs_regulation_version_id'), table_name='ai_runs')
    op.drop_index(op.f('ix_ai_runs_correlation_id'), table_name='ai_runs')
    op.drop_index(op.f('ix_ai_runs_stage'), table_name='ai_runs')
    op.drop_table('ai_runs')
