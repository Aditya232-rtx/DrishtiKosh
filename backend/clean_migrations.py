import os
import glob

def clean_migrations():
    directory = r"d:\Projects\Hacknova\DrishtiKosh\backend\alembic\versions"
    files = glob.glob(os.path.join(directory, "*.py"))
    
    print(f"Found {len(files)} migration files.")
    for f in files:
        try:
            os.remove(f)
            print(f"Deleted {f}")
        except Exception as e:
            print(f"Error deleting {f}: {e}")

if __name__ == "__main__":
    clean_migrations()
