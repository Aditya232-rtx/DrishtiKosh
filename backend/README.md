# DrishtiKosh Backend

## Setup

1.  **Install Dependencies**:
    ```bash
    cd backend
    python3.11 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

2.  **Environment Variables**:
    Copy `.env.example` to `.env` and fill in your Vertex AI credentials.

3.  **Database**:
    Ensure Postgres 17 is running and `drishtikosh_db` exists with `vector` extension.

4.  **Row Level Security (RLS)**:
    Run the following SQL commands to secure user data:
    ```sql
    -- Connect to drishtikosh_db
    \c drishtikosh_db

    -- Enable RLS
    ALTER TABLE accessibility_profiles ENABLE ROW LEVEL SECURITY;

    -- Create Policy (Example: mapping app user_id to specific logic)
    -- This assumes you have a way to set the current user in the DB session, e.g.
    -- set_config('app.current_user_id', '123', false);
    
    CREATE POLICY user_access_policy ON accessibility_profiles
    FOR ALL
    TO public
    USING (user_id = current_setting('app.current_user_id', true)::integer);
    ```

5.  **Run Server**:
    ```bash
    uvicorn app.main:app --reload
    ```

## Open-Notebook

The Open-Notebook service is located in `services/open-notebook`. Refer to its `README.md` for specific startup instructions (usually requires Node.js and Python).
