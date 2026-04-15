from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, BinaryIO


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, data: bytes, path: str, content_type: str = "image/jpeg") -> str:
        """Save data and return public URL."""
        ...

    @abstractmethod
    async def delete(self, path: str) -> bool:
        ...

    @abstractmethod
    def get_public_url(self, path: str) -> str:
        ...

    @abstractmethod
    async def exists(self, path: str) -> bool:
        ...
