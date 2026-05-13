# MERN Monorepo Scaffold for Rent Breaker MS

## Overview
This repository serves as a full MERN monorepo scaffold following the Software Requirements Specification (SRS) for the Rent Breaker Machine Management System.

## Tech Stack
- MongoDB
- Express.js
- React.js (Vite)
- Node.js
- Tailwind CSS

## Roles
- **Admin**: Full access
- **Staff/Operator**: Assign machines, update rentals
- **Customer**: View available machines, request rentals

## Key Features (SRS-aligned)
- JWT auth + bcrypt password hashing
- Role-based access control
- Machines: add/update/delete + status (Available/Rented/Maintenance)
- Customers: add/update + unique required CNIC
- Rentals: customer request creates **Pending** rental; staff/admin activates and completes
- Billing: auto total rent calculation + advance payment + remaining balance
- Maintenance records
- Reports: daily/monthly revenue, utilization, customer history

## Repo Structure (monorepo)
- `backend/` Express API
- `frontend/` React UI
- `ai-service/` FastAPI + scikit-learn AI microservice

## Local Development
### 1) Install
```bash
npm install
```

### 2) Configure env
Copy the example env files and fill values.

Backend env (example):
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`
- `AI_SERVICE_URL` (default: `http://localhost:8000`)

Frontend env (example):
- `VITE_API_URL`

### 3) Run
```bash
npm run dev
```

## Notes
- No payment gateway (out of scope)
- Single location only (future enhancement: multi-location)

## AI Features Added (Phase 1)
- Recommendation API via Python FastAPI microservice (`POST /recommendations/machines`)
- Backend bridge endpoint (`POST /api/ai/recommendations/machines`) consumed by customer request flow
- Explainable recommendation text (uptime, maintenance cost, and price context)
- Data model extensions for utilization, uptime, maintenance cost, usage hours, and machine warehouse/location
- Audit-ready event logging (`AuditEvent`) + customer behavior events (`CustomerBehaviorEvent`)

## Run AI Service
```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker Compose (Backend + AI + MongoDB)
Set a strong `JWT_SECRET` in your shell, then run:
```bash
export JWT_SECRET=your_strong_secret
docker compose up --build
```
