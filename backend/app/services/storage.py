from google.cloud import storage
from fastapi import UploadFile, HTTPException
from app.core.config import settings
import uuid
import os

class StorageService:
    def __init__(self):
        self.client = None
        self.bucket_name = "drishtikosh-uploads"
        self._initialize_client()

    def _initialize_client(self):
        try:
            if settings.GOOGLE_APPLICATION_CREDENTIALS:
                from google.oauth2 import service_account
                creds = service_account.Credentials.from_service_account_file(settings.GOOGLE_APPLICATION_CREDENTIALS)
                self.client = storage.Client(project=settings.PROJECT_ID, credentials=creds)
                print("✅ Storage Service: Client initialized with credentials.")
            else:
                self.client = storage.Client(project=settings.PROJECT_ID)
                print("✅ Storage Service: Client initialized with default credentials.")
        except Exception as e:
            print(f"❌ Storage Service: Initialization failed: {e}")

    async def upload_file(self, file: UploadFile, user_id: str = "guest") -> str:
        """
        Uploads a file to GCS and returns the gs:// URI.
        Structure: gs://bucket/user_id/uuid_filename
        """
        if not self.client:
            raise HTTPException(status_code=500, detail="Storage service not available")

        try:
            # Generate unique filename
            ext = os.path.splitext(file.filename)[1]
            unique_name = f"{uuid.uuid4()}{ext}"
            blob_path = f"{user_id}/{unique_name}"
            
            bucket = self.client.bucket(self.bucket_name)
            blob = bucket.blob(blob_path)

            # Read and upload
            content = await file.read()
            blob.upload_from_string(content, content_type=file.content_type)
            
            gcs_uri = f"gs://{self.bucket_name}/{blob_path}"
            print(f"✅ Uploaded to GCS: {gcs_uri}")
            
            # Reset file pointer if needed elsewhere (though usually consumed here)
            await file.seek(0)
            
            return gcs_uri

        except Exception as e:
            print(f"❌ GCS Upload Error: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

storage_service = StorageService()
