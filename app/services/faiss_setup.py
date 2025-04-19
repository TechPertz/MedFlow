import faiss
import os
import json
import numpy as np
import openai
from app.utils.config import settings

# Initialize global variables
medical_faiss = None
clinical_trial_faiss = None
clinical_trials_data = []
medical_data = []
medical_chunks = []
clinical_trial_chunks = []

def get_embedding(text):
    """Generate embedding using OpenAI API."""
    openai.api_key = settings.OPENAI_KEY
    response = openai.embeddings.create(
        input=text,
        model="text-embedding-ada-002"
    )
    return response.data[0].embedding

def get_example_medical_docs():
    """Get example medical documents."""
    return [
        {"content": "Diabetes is a chronic condition characterized by high blood sugar levels. Symptoms include frequent urination, increased thirst, unexplained weight loss, fatigue, blurred vision, and slow-healing sores."},
        {"content": "Hypertension, or high blood pressure, is a condition where the force of blood against artery walls is too high. It often has no symptoms but can lead to serious health issues like heart disease and stroke."},
        {"content": "Asthma is a chronic respiratory condition that affects the airways in the lungs, causing them to narrow and produce excess mucus, making breathing difficult."},
        {"content": "Heart disease includes various conditions that affect the heart's structure and function, including coronary artery disease, heart attacks, and heart failure."},
        {"content": "Arthritis is inflammation of one or more joints, causing pain, stiffness, and reduced range of motion that typically worsens with age."}
    ]

def get_example_clinical_trials():
    """Get example clinical trial data."""
    return [
        {
            "title": "Effects of Insulin Dosage on Diabetes Management",
            "condition": "Type 2 Diabetes",
            "intervention": "Insulin Therapy",
            "eligibility": "Adults aged 30-65 with Type 2 Diabetes"
        },
        {
            "title": "Evaluation of New Antihypertensive Medication",
            "condition": "Hypertension",
            "intervention": "Novel Calcium Channel Blocker",
            "eligibility": "Adults with blood pressure >140/90 mmHg"
        },
        {
            "title": "Bronchodilator Efficacy Study",
            "condition": "Asthma",
            "intervention": "Long-acting Bronchodilator",
            "eligibility": "Patients aged 18-70 with moderate to severe asthma"
        }
    ]

def create_chunks_from_text(text, chunk_size=200, overlap=50):
    """Split text into overlapping chunks for better retrieval."""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end > len(text):
            end = len(text)
        
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
        
        if start >= len(text):
            break
    
    return chunks

def prepare_medical_chunks():
    """Create chunks from medical data for better retrieval."""
    global medical_chunks, medical_data
    
    medical_chunks = []
    
    for i, doc in enumerate(medical_data):
        content = doc["content"]
        # Split the content into chunks
        doc_chunks = create_chunks_from_text(content)
        
        # Store each chunk with reference to the original document
        for j, chunk in enumerate(doc_chunks):
            medical_chunks.append({
                "text": chunk,
                "doc_id": i,
                "chunk_id": j,
                "source": "medical_data"
            })
    
    return medical_chunks

def prepare_clinical_trial_chunks():
    """Create chunks from clinical trials for better retrieval."""
    global clinical_trial_chunks, clinical_trials_data
    
    clinical_trial_chunks = []
    
    for i, trial in enumerate(clinical_trials_data):
        # Create multiple chunks for different aspects of the trial
        title_chunk = f"Title: {trial['title']}"
        condition_chunk = f"Condition: {trial['condition']}"
        intervention_chunk = f"Intervention: {trial['intervention']}"
        eligibility_chunk = f"Eligibility: {trial['eligibility']}"
        full_chunk = f"Title: {trial['title']}. Condition: {trial['condition']}. This trial studies {trial['intervention']} for patients with {trial['condition']}. Eligibility criteria: {trial['eligibility']}"
        
        # Add each chunk with reference to original trial
        chunks = [
            {"text": title_chunk, "aspect": "title"},
            {"text": condition_chunk, "aspect": "condition"},
            {"text": intervention_chunk, "aspect": "intervention"},
            {"text": eligibility_chunk, "aspect": "eligibility"},
            {"text": full_chunk, "aspect": "full"}
        ]
        
        for j, chunk in enumerate(chunks):
            clinical_trial_chunks.append({
                "text": chunk["text"],
                "aspect": chunk["aspect"],
                "trial_id": i,
                "chunk_id": j,
                "source": "clinical_trial"
            })
    
    return clinical_trial_chunks

def normalize_vectors(vectors):
    """Normalize vectors to prepare for cosine similarity search."""
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / norms

def build_medical_faiss():
    """Build FAISS index for medical knowledge."""
    global medical_data, medical_chunks
    
    # Path to your medical data file - adjust as needed
    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'medical_knowledge.json')
    
    # Check if data file exists, otherwise use example data
    if os.path.exists(data_path):
        try:
            with open(data_path, 'r') as f:
                medical_data = json.load(f)
            print(f"Loaded {len(medical_data)} medical documents")
        except Exception as e:
            print(f"Error loading medical data: {e}")
            # Fallback to example data
            medical_data = get_example_medical_docs()
            print("Using example medical data instead")
    else:
        # Use example data if file doesn't exist
        print(f"Warning: Medical data file not found at {data_path}")
        medical_data = get_example_medical_docs()
        print("Using example medical data")
    
    # Create chunks from medical data
    medical_chunks = prepare_medical_chunks()
    print(f"Created {len(medical_chunks)} chunks from medical data")
    
    # Generate embeddings for chunks
    embeddings = []
    for chunk in medical_chunks:
        embedding = get_embedding(chunk["text"])
        embeddings.append(embedding)
    
    # Normalize vectors for cosine similarity
    embeddings_np = np.array(embeddings).astype('float32')
    normalized_embeddings = normalize_vectors(embeddings_np)
    
    # Create FAISS index
    dimension = len(embeddings[0])
    # Use IndexFlatIP for cosine similarity (inner product on normalized vectors)
    index = faiss.IndexFlatIP(dimension)
    index.add(normalized_embeddings)
    
    print(f"Built medical FAISS index with {len(medical_chunks)} chunks")
    return index

def build_clinical_trial_faiss():
    """Build FAISS index for clinical trials."""
    global clinical_trials_data, clinical_trial_chunks
    
    # Path to your clinical trials data file - adjust as needed
    data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'clinical_trials.json')
    
    # Check if data file exists, otherwise use example data
    if os.path.exists(data_path):
        try:
            with open(data_path, 'r') as f:
                clinical_trials_data = json.load(f)
            print(f"Loaded {len(clinical_trials_data)} clinical trials")
        except Exception as e:
            print(f"Error loading clinical trials data: {e}")
            # Fallback to example data
            clinical_trials_data = get_example_clinical_trials()
            print("Using example clinical trials data instead")
    else:
        # Use example data if file doesn't exist
        print(f"Warning: Clinical trials data file not found at {data_path}")
        clinical_trials_data = get_example_clinical_trials()
        print("Using example clinical trials data")
    
    # Create chunks from clinical trials
    clinical_trial_chunks = prepare_clinical_trial_chunks()
    print(f"Created {len(clinical_trial_chunks)} chunks from clinical trials")
    
    # Generate embeddings for chunks
    embeddings = []
    for chunk in clinical_trial_chunks:
        embedding = get_embedding(chunk["text"])
        embeddings.append(embedding)
    
    # Normalize vectors for cosine similarity
    embeddings_np = np.array(embeddings).astype('float32')
    normalized_embeddings = normalize_vectors(embeddings_np)
    
    # Create FAISS index
    dimension = len(embeddings[0])
    # Use IndexFlatIP for cosine similarity (inner product on normalized vectors)
    index = faiss.IndexFlatIP(dimension)
    index.add(normalized_embeddings)
    
    print(f"Built clinical trials FAISS index with {len(clinical_trial_chunks)} chunks")
    return index

def build_indices():
    """Build both FAISS indices."""
    global medical_faiss, clinical_trial_faiss
    
    try:
        print("Building medical FAISS index...")
        medical_faiss = build_medical_faiss()
        
        print("Building clinical trials FAISS index...")
        clinical_trial_faiss = build_clinical_trial_faiss()
        
        # Verify indices were built correctly
        if medical_faiss is None or clinical_trial_faiss is None:
            raise ValueError("Failed to build one or more indices")
        
        status = {
            "medical_index": "built successfully" if medical_faiss else "failed",
            "clinical_trials_index": "built successfully" if clinical_trial_faiss else "failed",
            "clinical_trials_count": len(clinical_trials_data)
        }
        
        return status
    except Exception as e:
        print(f"Error building indices: {e}")
        return {"error": str(e)}

def get_indices_status():
    """Check if indices are built."""
    global medical_faiss, clinical_trial_faiss
    return {
        "medical_index_built": medical_faiss is not None,
        "clinical_trials_index_built": clinical_trial_faiss is not None,
        "clinical_trials_count": len(clinical_trials_data)
    }

def search_medical_knowledge(query, k=4):
    """Search medical knowledge index."""
    global medical_faiss, medical_data, medical_chunks
    
    if medical_faiss is None or not medical_chunks:
        return []
    
    # Generate embedding for query
    query_embedding = get_embedding(query)
    query_embedding_np = np.array([query_embedding]).astype('float32')
    
    # Normalize query vector for cosine similarity
    normalized_query = normalize_vectors(query_embedding_np)
    
    # Perform search
    distances, indices = medical_faiss.search(normalized_query, k)
    
    # Get results
    results = []
    seen_doc_ids = set()
    for i, idx in enumerate(indices[0]):
        if idx < len(medical_chunks):
            chunk = medical_chunks[idx]
            doc_id = chunk["doc_id"]
            
            # Avoid duplicate documents in results
            if doc_id not in seen_doc_ids and doc_id < len(medical_data):
                seen_doc_ids.add(doc_id)
                doc = medical_data[doc_id]
                # Add score to help with ranking
                doc["score"] = float(distances[0][i])
                results.append(doc)
    
    # Sort by score (higher is better for inner product/cosine)
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # Return unique documents
    return results

def search_clinical_trials(query, k=6):
    """Search clinical trials index."""
    global clinical_trial_faiss, clinical_trials_data, clinical_trial_chunks
    
    if clinical_trial_faiss is None or not clinical_trial_chunks:
        return []
    
    # Generate embedding for query
    query_embedding = get_embedding(query)
    query_embedding_np = np.array([query_embedding]).astype('float32')
    
    # Normalize query vector for cosine similarity
    normalized_query = normalize_vectors(query_embedding_np)
    
    # Perform search
    distances, indices = clinical_trial_faiss.search(normalized_query, k)
    
    # Get results with scoring
    trial_scores = {}
    for i, idx in enumerate(indices[0]):
        if idx < len(clinical_trial_chunks):
            chunk = clinical_trial_chunks[idx]
            trial_id = chunk["trial_id"]
            
            # Track the best score for each trial
            current_score = float(distances[0][i])
            if trial_id not in trial_scores or current_score > trial_scores[trial_id]:
                trial_scores[trial_id] = current_score
    
    # Get unique trials with their best scores
    results = []
    for trial_id, score in trial_scores.items():
        if trial_id < len(clinical_trials_data):
            trial = clinical_trials_data[trial_id].copy()
            trial["score"] = score
            results.append(trial)
    
    # Sort by score (higher is better for inner product/cosine)
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # Return top 3 trials
    return results[:3]

# Initialize indices at import time to handle existing app behavior
try:
    build_indices()
except Exception as e:
    print(f"Warning: Failed to initialize indices at import time: {e}")
    print("Use the /indices/build endpoint to build indices.")