"""add evidence assessments and content-backed evidence columns

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-10-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'g7h8i9j0k1l2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'evidence_assessments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('evidence_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('map_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('checklist', sa.JSON(), nullable=True),
        sa.Column('decision', sa.String(length=20), nullable=False),
        sa.Column('assessor_id', sa.String(length=100), nullable=True),
        sa.Column('submitter_id', sa.String(length=100), nullable=True),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.Column('bank_id', sa.String(length=100), nullable=True),
        sa.Column('legal_entity_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ),
        sa.ForeignKeyConstraint(['map_id'], ['maps.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_evidence_assessments_evidence_id'), 'evidence_assessments', ['evidence_id'], unique=False)
    op.create_index(op.f('ix_evidence_assessments_map_id'), 'evidence_assessments', ['map_id'], unique=False)
    op.create_index(op.f('ix_evidence_assessments_decision'), 'evidence_assessments', ['decision'], unique=False)
    op.create_index(op.f('ix_evidence_assessments_assessor_id'), 'evidence_assessments', ['assessor_id'], unique=False)
    op.create_index(op.f('ix_evidence_assessments_bank_id'), 'evidence_assessments', ['bank_id'], unique=False)
    op.create_index(op.f('ix_evidence_assessments_legal_entity_id'), 'evidence_assessments', ['legal_entity_id'], unique=False)

    op.add_column('evidence', sa.Column('content_text', sa.Text(), nullable=True))
    op.add_column('evidence', sa.Column('content_checksum', sa.String(length=128), nullable=True))
    op.add_column('evidence', sa.Column('source_system', sa.String(length=100), nullable=True))
    op.add_column('evidence', sa.Column('evidence_period', sa.String(length=100), nullable=True))
    op.add_column('evidence', sa.Column('assessment_decision', sa.String(length=20), nullable=True))
    op.create_index(op.f('ix_evidence_assessment_decision'), 'evidence', ['assessment_decision'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_evidence_assessment_decision'), table_name='evidence')
    op.drop_column('evidence', 'assessment_decision')
    op.drop_column('evidence', 'evidence_period')
    op.drop_column('evidence', 'source_system')
    op.drop_column('evidence', 'content_checksum')
    op.drop_column('evidence', 'content_text')
    op.drop_index(op.f('ix_evidence_assessments_legal_entity_id'), table_name='evidence_assessments')
    op.drop_index(op.f('ix_evidence_assessments_bank_id'), table_name='evidence_assessments')
    op.drop_index(op.f('ix_evidence_assessments_assessor_id'), table_name='evidence_assessments')
    op.drop_index(op.f('ix_evidence_assessments_decision'), table_name='evidence_assessments')
    op.drop_index(op.f('ix_evidence_assessments_map_id'), table_name='evidence_assessments')
    op.drop_index(op.f('ix_evidence_assessments_evidence_id'), table_name='evidence_assessments')
    op.drop_table('evidence_assessments')
