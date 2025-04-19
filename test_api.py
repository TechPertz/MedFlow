import requests
import json

# Base URL for your FastAPI application
BASE_URL = "http://localhost:8000"

def build_indices():
    """Build FAISS indices to ensure they're ready for testing"""
    response = requests.post(f"{BASE_URL}/indices/rebuild")
    if response.status_code == 200:
        print("Indices built successfully")
        return True
    else:
        print(f"Error building indices: {response.text}")
        return False

def test_medical_analysis(query, include_history=True):
    """Test the medical analysis endpoint with the provided query"""
    
    # Prepare the request data
    data = {
        "symptoms": query,
        "history": "Type 2 diabetes diagnosed 2 years ago" if include_history else ""
    }
    
    # Make the POST request
    response = requests.post(
        f"{BASE_URL}/analyze",
        json=data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\n=== Query: {query} ===")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\nAnswer:")
        print(result["answer"])
        
        # Print clinical trials if any
        if result.get("clinical_trials"):
            print(f"\nFound {len(result['clinical_trials'])} clinical trials:")
            for i, trial in enumerate(result["clinical_trials"], 1):
                print(f"{i}. {trial['title']} - {trial['condition']}")
                print(f"   Intervention: {trial['intervention']}")
                print(f"   Eligibility: {trial['eligibility']}")
                if "score" in trial:
                    print(f"   Relevance score: {trial['score']:.2f}")
                print()
        else:
            print("\nNo clinical trials returned")
    else:
        print(f"Error: {response.text}")
    
    return response

if __name__ == "__main__":
    # Ensure indices are built first
    if not build_indices():
        print("Failed to build indices. Tests may fail.")
    
    # Test 1: Query without mentioning clinical trials
    query_no_trials = "I have symptoms of high blood sugar, frequent urination, and constant thirst"
    test_medical_analysis(query_no_trials)
    
    # Test 2: Same query but explicitly asking for clinical trials
    query_with_trials = "I have symptoms of high blood sugar, frequent urination, and constant thirst. Are there any clinical trials available for this condition?"
    test_medical_analysis(query_with_trials)