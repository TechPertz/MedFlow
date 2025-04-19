# MedFlow API Documentation

## Overview
MedFlow is a medical AI service that provides analysis of medical queries and can suggest relevant clinical trials when asked.

## Key Features
- Medical analysis based on symptoms and patient history
- Clinical trial suggestions when "clinical trials" is mentioned in the query
- On-demand building of knowledge indices

## API Endpoints

### 1. Medical Analysis
```
POST /analyze
```
Analyzes a medical query and returns a response with potential clinical trial suggestions.

**Request Body:**
```json
{
  "symptoms": "string",
  "history": "string"
}
```

**Response:**
```json
{
  "answer": "string",
  "clinical_trials": [
    {
      "title": "string",
      "condition": "string", 
      "intervention": "string",
      "eligibility": "string"
    }
  ]
}
```

### 2. Index Management

#### Build Indices
```
POST /indices/build
```
Builds the FAISS indices for both medical knowledge and clinical trials.

**Response:**
```json
{
  "medical_index": "built successfully",
  "clinical_trials_index": "built successfully",
  "clinical_trials_count": 42
}
```

#### Check Index Status
```
GET /indices/status
```
Returns the current status of all indices.

**Response:**
```json
{
  "medical_index_built": true,
  "clinical_trials_index_built": true,
  "clinical_trials_count": 42
}
```

## Usage Flow
1. Start the server
2. Call `/indices/build` to build the knowledge indices
3. Check status with `/indices/status` if needed
4. Make medical queries using `/analyze`
5. When asking about clinical trials, include "clinical trials" in your query for automatic suggestions

## Important Notes
- Before using the analysis endpoint, make sure to build the indices first
- The system automatically detects "clinical trials" in queries and includes relevant trial suggestions when available
