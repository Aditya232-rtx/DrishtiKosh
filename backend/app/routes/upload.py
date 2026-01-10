from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from app.services.storage import storage_service
from typing import Optional

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("guest")
):
    """
    Universal upload endpoint.
    Uploads file to GCS 'drishtikosh-uploads' bucket.
    Returns the GCS URI.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    try:
        # Sanitize mime type if needed, but client usually sends it
        mime_type = file.content_type
        
        # Upload
        gcs_uri = await storage_service.upload_file(file, user_id)
        
        return {
            "uri": gcs_uri,
            "mime_type": mime_type,
            "name": file.filename
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
