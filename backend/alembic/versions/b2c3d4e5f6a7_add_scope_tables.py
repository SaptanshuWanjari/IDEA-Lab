"""add scope tables and scope columns (pilot single-bank backfill)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'banks',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'legal_entities',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('bank_id', sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(['bank_id'], ['banks.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_legal_entities_bank_id'), 'legal_entities', ['bank_id'], unique=False)
    op.create_table(
        'department_memberships',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('department_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bank_id', sa.String(length=100), nullable=True),
        sa.Column('legal_entity_id', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_department_memberships_user_id'), 'department_memberships', ['user_id'], unique=False)

    # Pilot deploy backfills existing rows to Legacy Demo Bank/Entity, then
    # tightens these columns to non-null. Columns stay nullable here for
    # backfill compat; new rows must always set bank_id/legal_entity_id.
    op.execute(
        "INSERT INTO banks (id, name) VALUES ('legacy-demo-bank', 'Legacy Demo Bank') "
        "ON CONFLICT (id) DO NOTHING"
    )
    op.execute(
        "INSERT INTO legal_entities (id, name, bank_id) VALUES "
        "('legacy-entity', 'Legacy Entity', 'legacy-demo-bank') "
        "ON CONFLICT (id) DO NOTHING"
    )
    for table in ('regulations', 'maps', 'evidence', 'audit_log'):
        op.add_column(table, sa.Column('bank_id', sa.String(length=100), nullable=True))
        op.add_column(table, sa.Column('legal_entity_id', sa.String(length=100), nullable=True))
        op.create_index(op.f(f'ix_{table}_bank_id'), table, ['bank_id'], unique=False)
        op.create_index(op.f(f'ix_{table}_legal_entity_id'), table, ['legal_entity_id'], unique=False)
        op.execute(
            f"UPDATE {table} SET bank_id = 'legacy-demo-bank' WHERE bank_id IS NULL"
        )
        op.execute(
            f"UPDATE {table} SET legal_entity_id = 'legacy-entity' WHERE legal_entity_id IS NULL"
        )
    op.add_column('audit_log', sa.Column('correlation_id', sa.String(length=100), nullable=True))
    op.add_column('audit_log', sa.Column('before', sa.JSON(), nullable=True))
    op.add_column('audit_log', sa.Column('after', sa.JSON(), nullable=True))
    op.create_index(op.f('ix_audit_log_correlation_id'), 'audit_log', ['correlation_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_audit_log_correlation_id'), table_name='audit_log')
    op.drop_column('audit_log', 'after')
    op.drop_column('audit_log', 'before')
    op.drop_column('audit_log', 'correlation_id')
    for table in ('regulations', 'maps', 'evidence', 'audit_log'):
        op.drop_index(op.f(f'ix_{table}_legal_entity_id'), table_name=table)
        op.drop_index(op.f(f'ix_{table}_bank_id'), table_name=table)
        op.drop_column(table, 'legal_entity_id')
        op.drop_column(table, 'bank_id')
    op.drop_index(op.f('ix_department_memberships_user_id'), table_name='department_memberships')
    op.drop_table('department_memberships')
    op.drop_index(op.f('ix_legal_entities_bank_id'), table_name='legal_entities')
    op.drop_table('legal_entities')
    op.drop_table('banks')
