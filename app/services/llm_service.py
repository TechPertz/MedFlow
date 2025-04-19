import openai
import re
from app.services.faiss_setup import (
    medical_faiss, clinical_trial_faiss, clinical_trials_data, 
    get_indices_status, build_indices, search_medical_knowledge, search_clinical_trials
)
from app.utils.config import settings

def ensure_indices_built():
    """Ensure that indices are built before trying to use them."""
    status = get_indices_status()
    if not status["medical_index_built"] or not status["clinical_trials_index_built"]:
        print("Indices not built or not fully initialized. Attempting to build...")
        return build_indices()
    return status

def check_for_clinical_trial_request(query: str) -> bool:
    """Check if the query is explicitly asking for clinical trials."""
    # Simple keyword matching for clinical trial requests
    trial_keywords = [
        'clinical trial', 'clinical trials', 'trials', 'trial', 'study', 'studies',
        'research study', 'research trial', 'participating', 'participate in', 
        'enroll in', 'treatment option', 'experimental treatment'
    ]
    
    # Check for keyword matches
    query_lower = query.lower()
    for keyword in trial_keywords:
        if keyword in query_lower:
            return True
    
    # If query mentions medical conditions, there's an implicit need for trials
    medical_terms = extract_medical_terms(query)
    if medical_terms and any(term in query_lower for term in ['treatment', 'medication', 'therapy', 'options']):
        return True
    
    # Not explicitly asking for clinical trials
    return False

def extract_condition_from_query(query: str) -> str:
    """Extract the main medical condition from the query."""
    # Common medical conditions to look for
    conditions = [
        'diabetes', 'hypertension', 'blood pressure', 'cancer', 'arthritis',
        'asthma', 'heart disease', 'obesity', 'depression', 'anxiety',
        'alzheimer', 'parkinson', 'stroke', 'copd', 'allergies'
    ]
    
    # Check for condition matches
    query_lower = query.lower()
    for condition in conditions:
        if condition in query_lower:
            # Get some context around the condition
            start = max(0, query_lower.find(condition) - 10)
            end = min(len(query_lower), query_lower.find(condition) + len(condition) + 10)
            return query_lower[start:end]
    
    # No specific condition found, use the whole query
    return query

def extract_medical_terms(query: str) -> list:
    """Extract potential medical condition terms from the query."""
    # Common medical condition keywords
    condition_patterns = [
        r'diabetes', r'hypertension', r'blood pressure', r'cancer', r'arthritis',
        r'asthma', r'heart disease', r'obesity', r'depression', r'anxiety',
        r'alzheimer', r'parkinson', r'stroke', r'copd', r'allergies',
        r'pain', r'infection', r'disease', r'disorder', r'syndrome'
    ]
    
    # Extract words around the conditions
    extracted_terms = []
    for pattern in condition_patterns:
        match = re.search(pattern, query.lower())
        if match:
            # Get words around the match (context window)
            start = max(0, match.start() - 20)
            end = min(len(query), match.end() + 20)
            context = query[start:end].strip()
            extracted_terms.append(context)
    
    # If we found specific terms, return them, otherwise return empty list
    return extracted_terms

def expand_query_with_medical_terms(query: str) -> str:
    """Expand the search query with extracted medical terms for better search."""
    terms = extract_medical_terms(query)
    if not terms:
        return query
    
    # Create an expanded query that emphasizes medical terms
    expanded_query = query + " " + " ".join(terms)
    return expanded_query

def find_clinical_trials(query: str, max_trials: int = 3):
    """Search for relevant clinical trials based on the query."""
    # First check if there are any medical terms in the query
    conditions = extract_medical_terms(query)
    expanded_query = expand_query_with_medical_terms(query)
    
    # Perform the search with expanded query for better results
    trials = search_clinical_trials(expanded_query, k=max_trials*2)
    
    # If no direct matches, try searching with just the medical terms
    if not trials and conditions:
        condition_query = " ".join(conditions)
        print(f"No direct matches, trying with condition terms: {condition_query}")
        trials = search_clinical_trials(condition_query, k=max_trials)
    
    # If still no results, try a broader search
    if not trials:
        # Extract any condition-like words
        words = re.findall(r'\b\w+\b', query.lower())
        medical_words = [w for w in words if len(w) > 3]  # Filter short words
        if medical_words:
            broader_query = " ".join(medical_words)
            print(f"Trying broader search with: {broader_query}")
            trials = search_clinical_trials(broader_query, k=max_trials)
    
    return trials[:max_trials]

def process_medical_query(query: str):
    """Process a medical query using FAISS indices for knowledge retrieval."""
    # First, ensure indices are built
    status = ensure_indices_built()
    
    # Check if indices are properly built
    if medical_faiss is None or "error" in status:
        return {
            "answer": "Sorry, the medical knowledge base could not be initialized. Please try rebuilding the indices using the /indices/build endpoint.",
            "clinical_trials": None
        }
    
    try:
        # Check if this is a request for clinical trials
        print("\n=== CHECKING FOR CLINICAL TRIAL REQUEST ===")
        print("Original query:", query)
        
        # Expand query with medical terms for better search
        expanded_query = expand_query_with_medical_terms(query)
        print(f"Expanded query: {expanded_query}")
        
        # Check for explicit clinical trial request
        is_requesting_trials = check_for_clinical_trial_request(query)
        print(f"Is requesting trials: {is_requesting_trials}")
        
        # Always check for clinical trials that match query (but only return if requested)
        clinical_trials = find_clinical_trials(expanded_query)
        print(f"Found {len(clinical_trials)} relevant clinical trials")
        
        # Fetch relevant medical knowledge with expanded query for better results
        medical_context = search_medical_knowledge(expanded_query, k=4)
        print(f"Retrieved {len(medical_context)} relevant medical documents")
        
        # Construct prompt with medical knowledge and clinical trials if applicable
        prompt = construct_prompt(query, medical_context, clinical_trials if is_requesting_trials else None)
        
        # Get answer from OpenAI
        openai.api_key = settings.OPENAI_KEY
        completion = openai.chat.completions.create(
            model="gpt-4.1-2025-04-14",
            temperature=0,
            messages=[
                {"role": "system", "content": "You are a helpful medical assistant. "
                 "Provide accurate, informative responses to medical queries based on the provided context."},
                {"role": "user", "content": prompt}
            ]
        )
        
        answer = completion.choices[0].message.content.strip()
        
        response = {
            "answer": answer,
            "clinical_trials": clinical_trials if is_requesting_trials else None
        }
        return response
    except Exception as e:
        error_msg = f"Error processing query: {str(e)}"
        print(error_msg)
        return {
            "answer": f"An error occurred while processing your query: {str(e)}",
            "clinical_trials": None
        }

def construct_prompt(query, medical_context, clinical_trials=None):
    """Construct a prompt for the OpenAI API with available context."""
    prompt = f"Question: {query}\n\n"
    
    # Add medical knowledge context
    if medical_context:
        prompt += "Relevant medical information:\n"
        for i, doc in enumerate(medical_context, 1):
            prompt += f"{i}. {doc['content']}\n"
        prompt += "\n"
    
    # Add clinical trials if available
    if clinical_trials:
        prompt += "Relevant clinical trials:\n"
        for i, trial in enumerate(clinical_trials, 1):
            prompt += f"{i}. Title: {trial['title']}\n"
            prompt += f"   Condition: {trial['condition']}\n"
            prompt += f"   Intervention: {trial['intervention']}\n"
            prompt += f"   Eligibility: {trial['eligibility']}\n"
            if 'score' in trial:
                prompt += f"   Relevance Score: {trial['score']:.2f}\n"
            prompt += "\n"
    
    # Add final instruction
    prompt += "\nPlease provide a helpful and informative answer to the question based on the provided information. "
    if clinical_trials:
        prompt += "Include relevant information about the clinical trials if appropriate for the question."
    
    return prompt