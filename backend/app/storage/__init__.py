from app.config import settings
from app.storage.base import StorageBackend


def get_storage() -> StorageBackend:
    if settings.storage_backend == "s3":
        from app.storage.s3 import S3Storage
        return S3Storage()
    else:
        from app.storage.local import LocalStorage
        return LocalStorage()
