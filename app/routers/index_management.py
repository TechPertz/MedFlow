from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.services.faiss_setup import build_indices, get_indices_status, medical_faiss, clinical_trial_faiss

router = APIRouter(
    prefix="/indices",
    tags=["indices"],
)

class IndexStatus(BaseModel):
    medical_index_built: bool
    clinical_trials_index_built: bool
    clinical_trials_count: int

class BuildIndicesResponse(BaseModel):
    medical_index: str
    clinical_trials_index: str
    clinical_trials_count: int
    
@router.post("/build", status_code=200, response_model=BuildIndicesResponse)
async def build_all_indices(force: bool = Query(False, description="Force rebuilding indices even if they already exist")):
    """Build all FAISS indices (medical knowledge and clinical trials)."""
    try:
        # Check if indices are already built and force is not enabled
        if not force:
            status = get_indices_status()
            if status["medical_index_built"] and status["clinical_trials_index_built"]:
                return {
                    "medical_index": "already built, use force=true to rebuild",
                    "clinical_trials_index": "already built, use force=true to rebuild",
                    "clinical_trials_count": status["clinical_trials_count"]
                }
        
        # Build the indices
        status = build_indices()
        
        if "error" in status:
            raise HTTPException(status_code=500, detail=f"Failed to build indices: {status['error']}")
        
        # Validate that indices are properly built
        if medical_faiss is None or clinical_trial_faiss is None:
            raise HTTPException(
                status_code=500, 
                detail="Indices were not properly built despite successful build operation. Check logs for details."
            )
            
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/status", response_model=IndexStatus)
async def get_status():
    """Get the current status of all indices."""
    try:
        status = get_indices_status()
        
        # Double-check actual objects, not just the status flags
        if status["medical_index_built"] and medical_faiss is None:
            status["medical_index_built"] = False
            
        if status["clinical_trials_index_built"] and clinical_trial_faiss is None:
            status["clinical_trials_index_built"] = False
            
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/rebuild", status_code=200, response_model=BuildIndicesResponse)
async def rebuild_indices():
    """Convenience endpoint to force rebuild all indices."""
    return await build_all_indices(force=True) 