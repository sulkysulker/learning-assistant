from typing import Annotated

from config.db import get_db
from controllers.documentController import delete_document, get_document_detail, get_document_file_response, list_documents, upload_document
from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile
from middleware.auth import get_current_user, get_user_from_token
from models.user import User
from schemas.document import DocumentDeleteResponse, DocumentDetailResponse, DocumentItemResponse, DocumentsListResponse
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


@router.get("/{document_id}", response_model=DocumentDetailResponse, status_code=status.HTTP_200_OK)
def get_document(document_id: str, db: db_dependency, current_user: current_user_dependency):
	return get_document_detail(db, current_user, document_id)


@router.get("/{document_id}/file", status_code=status.HTTP_200_OK)
def get_document_file(
	document_id: str,
	db: db_dependency,
	authorization: str | None = Header(default=None),
	token: str | None = Query(default=None),
):
	resolved_token = token
	if not resolved_token and authorization and authorization.lower().startswith("bearer "):
		resolved_token = authorization[7:]

	if not resolved_token:
		raise HTTPException(status_code=401, detail="Could not validate credentials")

	resolved_user = get_user_from_token(db, resolved_token)
	if not resolved_user:
		raise HTTPException(status_code=401, detail="Could not validate credentials")

	return get_document_file_response(db, resolved_user, document_id)


@router.delete("/{document_id}", response_model=DocumentDeleteResponse, status_code=status.HTTP_200_OK)
def remove_document(document_id: str, db: db_dependency, current_user: current_user_dependency):
	return delete_document(db, current_user, document_id)
