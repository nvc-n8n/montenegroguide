"""S3-compatible storage backend (production).

Requires: boto3
Install with: pip install boto3

This is a placeholder ready for production use.
Switch STORAGE_BACKEND=s3 in .env to activate.
"""

from app.storage.base import StorageBackend
from app.config import settings


class S3Storage(StorageBackend):
    def __init__(self):
        try:
            import boto3
        except ImportError:
            raise ImportError("boto3 required for S3 storage. pip install boto3")

        self.bucket = settings.s3_bucket
        self.client = boto3.client(
            "s3",
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            endpoint_url=settings.s3_endpoint_url or None,
        )

    async def save(self, data: bytes, path: str, content_type: str = "image/jpeg") -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=path,
            Body=data,
            ContentType=content_type,
        )
        return self.get_public_url(path)

    async def delete(self, path: str) -> bool:
        self.client.delete_object(Bucket=self.bucket, Key=path)
        return True

    def get_public_url(self, path: str) -> str:
        if settings.s3_endpoint_url:
            return f"{settings.s3_endpoint_url}/{self.bucket}/{path}"
        return f"https://{self.bucket}.s3.{settings.s3_region}.amazonaws.com/{path}"

    async def exists(self, path: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=path)
            return True
        except Exception:
            return False
