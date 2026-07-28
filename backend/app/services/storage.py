from io import BytesIO
from typing import Optional

from minio import Minio

from app.config import settings


class StorageService:
    def __init__(self):
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self.ensure_buckets()

    def ensure_buckets(self):
        for bucket in ["regulations", "evidence"]:
            if not self.client.bucket_exists(bucket):
                self.client.make_bucket(bucket)

    def upload(self, bucket: str, object_name: str, data: bytes, content_type: str) -> str:
        self.client.put_object(
            bucket,
            object_name,
            BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return f"{bucket}/{object_name}"

    def presigned_url(self, bucket: str, object_name: str, expires: int = 3600) -> str:
        return self.client.presigned_get_object(bucket, object_name, expires=expires)

    def get_object(self, bucket: str, object_name: str) -> Optional[BytesIO]:
        return self.client.get_object(bucket, object_name)
