"""convert_user_id_to_uuid

Revision ID: step1_user_uuid
Revises: 
Create Date: 2025-12-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'step1_user_uuid'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Add temp UUID column
    op.add_column('users', sa.Column('id_uuid', postgresql.UUID(), nullable=True))
    
    # Step 2: Populate with UUIDs
    op.execute("UPDATE users SET id_uuid = uuid_generate_v4()")
    
    # Step 3: Drop old constraints
    op.drop_constraint('accessibility_profiles_user_id_fkey', 'accessibility_profiles', type_='foreignkey')
    
    # Step 4: Drop old PK
    op.drop_constraint('users_pkey', 'users', type_='primary')
    
    # Step 5: Drop old id column
    op.drop_column('users', 'id')
    
    # Step 6: Rename id_uuid to id
    op.alter_column('users', 'id_uuid', new_column_name='id', nullable=False)
    
    # Step 7: Create new PK
    op.create_primary_key('users_pkey', 'users', ['id'])
    
    # Step 8: Convert accessibility_profiles.user_id to UUID
    op.add_column('accessibility_profiles', sa.Column('user_id_uuid', postgresql.UUID(), nullable=True))
    op.execute("""
        UPDATE accessibility_profiles ap 
        SET user_id_uuid = u.id 
        FROM users u 
        WHERE ap.user_id::text = (
            SELECT id::text FROM (
                SELECT ROW_NUMBER() OVER (ORDER BY username) as rn, id 
                FROM users
            ) sub WHERE sub.rn = ap.user_id
        )
    """)
    op.drop_column('accessibility_profiles', 'user_id')
    op.alter_column('accessibility_profiles', 'user_id_uuid', new_column_name='user_id')
    
    # Step 9: Recreate FK
    op.create_foreign_key('accessibility_profiles_user_id_fkey', 'accessibility_profiles', 'users', ['user_id'], ['id'])


def downgrade():
    # Reverse the process (optional, can be complex)
    pass
