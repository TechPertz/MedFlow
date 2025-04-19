from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import MedicalQuery, MedicalResponse
from app.services.llm_service import process_medical_query

router = APIRouter()

@router.post("/analyze", response_model=MedicalResponse)
async def medical_analysis(
    query: MedicalQuery,
):
    try:
        full_query = query.symptoms + " " + query.history
        response = process_medical_query(full_query)
        return MedicalResponse(**response)
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")