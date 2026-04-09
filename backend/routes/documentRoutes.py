from typing import Annotated

from config.db import get_db
from controllers.documentController import delete_document, list_documents, upload_document
from fastapi import APIRouter, Depends, File, UploadFile
from middleware.auth import get_current_user
from models.user import User
from schemas.document import DocumentDeleteResponse, DocumentItemResponse, DocumentsListResponse
from sqlalchemy.orm import Session
from starlette import status


db_dependency = Annotated[Session, Depends(get_db)]
current_user_dependency = Annotated[User, Depends(get_current_user)]


router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=DocumentsListResponse, status_code=status.HTTP_200_OK)
def get_documents(db: db_dependency, current_user: current_user_dependency):
	return list_documents(db, current_user)


@router.post("/upload", response_model=DocumentItemResponse, status_code=status.HTTP_201_CREATED)
def upload_document_file(
	db: db_dependency,
	current_user: current_user_dependency,
	file: UploadFile = File(...),
):
	return upload_document(db, current_user, file)


@router.delete("/{document_id}", response_model=DocumentDeleteResponse, status_code=status.HTTP_200_OK)
def remove_document(document_id: str, db: db_dependency, current_user: current_user_dependency):
	return delete_document(db, current_user, document_id)
