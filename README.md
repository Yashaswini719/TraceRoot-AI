# TraceRoot AI — AI-Powered Root Cause Analysis Platform

An AI-assisted Root Cause Analysis (RCA) platform designed for pharmaceutical API manufacturing. TraceRoot AI helps investigators transform incident information into structured investigations, evidence-backed root cause hypotheses, and actionable Corrective and Preventive Actions (CAPA).

## Overview

Investigating manufacturing incidents requires reviewing information from multiple sources, identifying contributing factors, collecting supporting evidence, and defining corrective actions.

TraceRoot AI streamlines this process through an AI-assisted investigation workflow. It uses Large Language Models (LLMs) to extract incident information, support structured RCA methods, identify missing evidence, and recommend CAPA.

**The core principle:** AI assists the investigator; it does not make final quality decisions. Root causes and CAPA recommendations remain subject to human review and approval.

## Key Features

### 1. Incident Information Intake
- Upload PDF and TXT documents.
- Paste incident reports, emails, or other investigation information.
- Extract relevant incident details using AI.
- Automatically populate structured RCA form fields.
- Allow investigators to review and edit extracted information.

### 2. Structured RCA
- Supports the 5 Whys methodology.
- Supports Fishbone analysis across six categories:
  - Man
  - Machine
  - Material
  - Method
  - Measurement
  - Environment
- Generates potential root causes and contributing factors.
- Identifies supporting evidence, contradicting evidence, and missing information.

### 3. Evidence Management
- Add and manage investigation evidence.
- Record evidence descriptions, observations, expected values, and source references.
- Track evidence status and reviewer information.
- Associate evidence with the investigation process.

### 4. AI-Assisted Investigation
- Uses Groq-powered LLM calls through LangGraph workflows.
- Generates structured investigation insights.
- Provides an AI Copilot chat experience.
- Uses available incident and investigation context to support follow-up questions.

### 5. CAPA Management
- Generate corrective and preventive action recommendations.
- Include action descriptions, rationale, priority, department, and owner role.
- Track due dates and implementation status.
- Record completion evidence and effectiveness criteria.
- Track effectiveness results separately from action completion.

### 6. Human Review and Quality Oversight
- Review, confirm, or reject proposed root causes.
- Add reviewer comments.
- Record QA reviewer information.
- Support QA approval and investigation lifecycle tracking.
- Keep AI-generated conclusions distinguishable from human-confirmed decisions.

## Investigation Workflow

1. **Incident Intake** — Upload a document or provide incident information.
2. **AI Extraction** — Extract relevant fields and populate the investigation form.
3. **Investigation Review** — Review and correct the extracted information.
4. **RCA Analysis** — Perform 5 Whys and Fishbone analysis.
5. **Root Cause Identification** — Review potential causes and contributing factors.
6. **Evidence Management** — Add supporting evidence and identify information gaps.
7. **CAPA Planning** — Define corrective and preventive actions.
8. **Implementation and Effectiveness** — Track actions and evaluate effectiveness.
9. **QA Review** — Record reviewer comments and approval.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| State Management | Redux Toolkit |
| Backend | Python, FastAPI |
| AI Orchestration | LangGraph |
| LLM Integration | Groq |
| Database | MySQL |
| Database ORM | SQLAlchemy |
| Data Validation | Pydantic |

## Architecture

```text
                    INVESTIGATOR
                         |
                         v
                REACT FRONTEND
                         |
                  REDUX TOOLKIT
                         |
                         v
                  FASTAPI BACKEND
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
    DOCUMENT         LANGGRAPH       INVESTIGATION
    EXTRACTION       WORKFLOWS        API SERVICES
          |              |
          v              v
     STRUCTURED       GROQ LLM
      INCIDENT        INTEGRATION
       DATA               |
                          v
                 RCA AND CAPA OUTPUTS
                          |
                          v
                  HUMAN REVIEW / QA
                          |
                          v
                       MYSQL
```

## Project Structure

The project is organized into separate frontend and backend applications.

```text
rca-module/
|
|-- backend/
|   |-- app/
|   |-- main.py
|   |-- schemas.py
|   |-- models.py
|   |-- graph.py
|   |-- analysis.py
|   |-- chat_graph.py
|   |-- migrate_db.py
|   |-- verify_full.py
|   |-- verify_fixes.py
|   |
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- redux/
|   |   |-- ...
|   |-- package.json
|
|-- README.md
```

*Note: This is a high-level structure. Refer to the source directories for the complete file organization.*

## Database Design

The application uses MySQL for persistent storage.

Core tables include:

- **investigations** — Stores incident information, RCA results, CAPA data, lifecycle stage, and QA review information.
- **evidence_items** — Stores evidence descriptions, observations, source references, evidence status, and reviewer details.
- **conversations** — Stores investigation-related AI conversation data.

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js and npm
- MySQL Server
- Groq API key
