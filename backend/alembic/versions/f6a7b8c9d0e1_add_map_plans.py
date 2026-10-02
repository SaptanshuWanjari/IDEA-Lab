"""add versioned MAP plans and workflow columns

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-10-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'map_plans',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('regulation_version_id', sa.String(length=100), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='DRAFT'),
        sa.Column('bank_id', sa.String(length=100), nullable=True),
        sa.Column('legal_entity_id', sa.String(length=100), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('approved_by', sa.String(length=100), nullable=True),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.Column('owner_department_id', sa.String(length=36), nullable=True),
        sa.Column('due_date_basis', sa.Text(), nullable=True),
        sa.Column('raci_responsible', sa.Text(), nullable=True),
        sa.Column('raci_accountable', sa.Text(), nullable=True),
        sa.Column('raci_consulted', sa.Text(), nullable=True),
        sa.Column('raci_informed', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_map_plans_regulation_version_id'), 'map_plans', ['regulation_version_id'], unique=False)
    op.create_index(op.f('ix_map_plans_status'), 'map_plans', ['status'], unique=False)
    op.create_index(op.f('ix_map_plans_bank_id'), 'map_plans', ['bank_id'], unique=False)
    op.create_index(op.f('ix_map_plans_legal_entity_id'), 'map_plans', ['legal_entity_id'], unique=False)

    op.create_table(
        'map_plan_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('plan_id', sa.String(length=36), nullable=False),
        sa.Column('obligation_id', sa.String(length=36), nullable=False),
        sa.Column('map_id', sa.String(length=36), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_department_id', sa.String(length=36), nullable=True),
        sa.Column('due_date_basis', sa.Text(), nullable=True),
        sa.Column('evidence_requirement', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['map_plans.id'], ),
        sa.ForeignKeyConstraint(['obligation_id'], ['obligations.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_map_plan_items_plan_id'), 'map_plan_items', ['plan_id'], unique=False)
    op.create_index(op.f('ix_map_plan_items_obligation_id'), 'map_plan_items', ['obligation_id'], unique=False)
    op.create_index(op.f('ix_map_plan_items_map_id'), 'map_plan_items', ['map_id'], unique=False)

    op.add_column('maps', sa.Column('map_plan_id', sa.String(length=36), nullable=True))
    op.create_index(op.f('ix_maps_map_plan_id'), 'maps', ['map_plan_id'], unique=False)
    op.create_foreign_key(None, 'maps', 'map_plans', ['map_plan_id'], ['id'])
    op.add_column('maps', sa.Column('submitted_by', sa.String(length=100), nullable=True))
    op.add_column('maps', sa.Column('evidence_requirement_type', sa.String(length=100), nullable=True))
    op.add_column('map_dependencies', sa.Column('dependency_type', sa.String(length=50), nullable=True, server_default='finish_to_start'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('map_dependencies', 'dependency_type')
    op.drop_column('maps', 'evidence_requirement_type')
    op.drop_column('maps', 'submitted_by')
    op.drop_constraint(None, 'maps', type_='foreignkey')
    op.drop_index(op.f('ix_maps_map_plan_id'), table_name='maps')
    op.drop_column('maps', 'map_plan_id')
    op.drop_index(op.f('ix_map_plan_items_map_id'), table_name='map_plan_items')
    op.drop_index(op.f('ix_map_plan_items_obligation_id'), table_name='map_plan_items')
    op.drop_index(op.f('ix_map_plan_items_plan_id'), table_name='map_plan_items')
    op.drop_table('map_plan_items')
    op.drop_index(op.f('ix_map_plans_legal_entity_id'), table_name='map_plans')
    op.drop_index(op.f('ix_map_plans_bank_id'), table_name='map_plans')
    op.drop_index(op.f('ix_map_plans_status'), table_name='map_plans')
    op.drop_index(op.f('ix_map_plans_regulation_version_id'), table_name='map_plans')
    op.drop_table('map_plans')
