from fastapi import APIRouter, HTTPException, Depends, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.models.user import User, LearningPreference
from app.core.jwt import verify_token, create_access_token
from passlib.context import CryptContext
import uuid
from datetime import datetime

router = APIRouter()
security = HTTPBearer()

# Use bcrypt directly (avoiding passlib compatibility issues)
import bcrypt

# Pydantic Models
class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    field_of_interest: str | None = None
    learning_preference: str | None = None  # "blind", "deaf", "adhd"

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    field_of_interest: str | None = None
    learning_preference: str | None = None
    created_at: str  # Return as ISO string for JSON compatibility
    token: str | None = None  # JWT token (optional, only in signup/login)

    class Config:
        from_attributes = True

# Helper Functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    # Bcrypt expects bytes, returns bytes
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

@router.post("/signup", response_model=UserResponse)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.username == request.username) | (User.email == request.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    new_user = User(
        id=uuid.uuid4(),
        username=request.username,
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        field_of_interest=request.field_of_interest,
        learning_preference=request.learning_preference,
        is_active=True,
        is_verified=False,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate JWT token
    from app.core.jwt import create_access_token
    access_token = create_access_token(
        data={"sub": str(new_user.id), "username": new_user.username}
    )
    
    # Return properly serialized response with token
    return {
        "id": str(new_user.id),
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "field_of_interest": new_user.field_of_interest,
        "learning_preference": new_user.learning_preference,
        "created_at": new_user.created_at.isoformat() if new_user.created_at else datetime.utcnow().isoformat(),
        "token": access_token  # Include JWT token
    }

@router.post("/login", response_model=UserResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == request.username) | (User.email == request.username)
    ).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password with proper error handling
    try:
        password_bytes = request.password.encode('utf-8')
        stored_hash = user.hashed_password.encode('utf-8') if isinstance(user.hashed_password, str) else user.hashed_password
        
        if not bcrypt.checkpw(password_bytes, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        # Re-raise our own HTTPException
        raise
    except Exception as e:
        # Catch any bcrypt/encoding errors and return 401 instead of 500
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate JWT token
    access_token = create_access_token(
        data={"sub": str(user.id)}
    )
    
    # Return properly serialized response with token
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "field_of_interest": user.field_of_interest,
        "learning_preference": user.learning_preference,
        "created_at": user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat(),
        "token": access_token  # Include JWT token
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user(user_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    Get current user details with JWT validation
    """
    # Validate JWT token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Verify the user_id from token matches the requested user_id
    token_user_id = payload.get("sub")
    if token_user_id != user_id:
        raise HTTPException(status_code=403, detail="Token user_id mismatch")
    
    try:
        user_uuid = uuid.UUID(user_id)
        user = db.query(User).filter(User.id == user_uuid).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "field_of_interest": user.field_of_interest,
            "learning_preference": user.learning_preference,
            "created_at": user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat()
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
