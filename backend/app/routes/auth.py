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

# Rate Limiting
from app.core.ratelimit import limiter
from starlette.requests import Request

# Use bcrypt directly
import bcrypt

# Pydantic Models with Strict Validation
from pydantic import BaseModel, EmailStr, Field, validator
import re

class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=1, max_length=100)
    field_of_interest: str | None = Field(None, max_length=100)
    learning_preference: str | None = None  # Enum check handled by logic or model if we want strict enum

    class Config:
        extra = "forbid"  # Reject unexpected fields

    @validator("email")
    def normalize_email(cls, v):
        return v.lower().strip()

class LoginRequest(BaseModel):
    username: str  # Can be email or username
    password: str

    class Config:
        extra = "forbid"

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    field_of_interest: str | None = None
    learning_preference: str | None = None
    created_at: str
    token: str | None = None

    class Config:
        from_attributes = True

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

@router.post("/signup", response_model=UserResponse)
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest, db: Session = Depends(get_db)): # Body via Dependency injection name mismatch fix needed? 
    # FastAPI handles body automatically if type hints are correct. 
    # But for Limiter, 'request' is required.
    # Note: 'body' arg needs to map to Request Body. 
    
    # Check if user exists
    existing_user = db.query(User).filter(
        (User.username == body.username) | (User.email == body.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    new_user = User(
        id=uuid.uuid4(),
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        field_of_interest=body.field_of_interest,
        learning_preference=body.learning_preference,
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
    
    return {
        "id": str(new_user.id),
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "field_of_interest": new_user.field_of_interest,
        "learning_preference": new_user.learning_preference,
        "created_at": new_user.created_at.isoformat() if new_user.created_at else datetime.utcnow().isoformat(),
        "token": access_token
    }

@router.post("/login", response_model=UserResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    # Find user
    user = db.query(User).filter(
        (User.username == body.username) | (User.email == body.username)
    ).first()
    
    if not user:
        # Use Rate Limit for brute force protection? 10/min is decent.
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    try:
        password_bytes = body.password.encode('utf-8')
        stored_hash = user.hashed_password.encode('utf-8') if isinstance(user.hashed_password, str) else user.hashed_password
        
        if not bcrypt.checkpw(password_bytes, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(
        data={"sub": str(user.id)}
    )
    
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "field_of_interest": user.field_of_interest,
        "learning_preference": user.learning_preference,
        "created_at": user.created_at.isoformat() if user.created_at else datetime.utcnow().isoformat(),
        "token": access_token
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
