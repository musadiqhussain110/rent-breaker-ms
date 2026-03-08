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

Frontend env (example):
- `VITE_API_URL`

### 3) Run
```bash
npm run dev
```

## Notes
- No payment gateway (out of scope)
- Single location only (future enhancement: multi-location)