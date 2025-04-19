from pydantic import BaseModel
from typing import List, Optional

class MedicalQuery(BaseModel):
    symptoms: str
    history: str

class Trial(BaseModel):
    title: str
    condition: str
    intervention: str
    eligibility: str

class MedicalResponse(BaseModel):
    answer: str
    clinical_trials: Optional[List[Trial]] = None