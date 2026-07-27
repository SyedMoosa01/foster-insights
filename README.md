# Foster Insights

Foster Insights is a full-stack dashboard for analyzing foster-home recruitment, retention, provider engagement, placement activity, and county-level need.

The backend validates CSV files, calculates shared metrics, and sends one normalized analytics model to the frontend.

## Live Application

Frontend:

```text
https://foster-insights.vercel.app
```

Backend:

```text
https://foster-insights-1.onrender.com
```

GitHub Repository:

```text
https://github.com/SyedMoosa01/foster-insights
```

## Features

* Statewide foster-care summary
* County recruitment urgency scoring
* Foster-home retention analysis
* Provider engagement and inactivity tracking
* License expiration monitoring
* Recently lapsed license tracking
* Out-of-county placement analysis
* County and provider detail pages
* CSV upload and validation
* Search, filtering, and sorting
* Responsive dashboard
* Transparent metric definitions
* Future integrations overview

## Recruitment Urgency Score

Each county receives one point for every triggered recruitment event:

* Net loss of foster homes
* High out-of-county placement rate
* At least one license expiring within 30 days
* High share of low-engagement homes
* Recruitment stalled

Recruitment stalled means that the county had foster-home placements during the latest completed six months but added no new foster-home licenses during that period.

Scores range from 0 to 5.

Counties are displayed in descending order by total urgency score.

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* CSS

### Backend

* Python
* FastAPI
* Pandas
* Uvicorn
* Pytest
* Ruff

### Hosting

* Frontend: Vercel
* Backend: Render
* Source control: GitHub

## Architecture

```text
CSV files
   ↓
FastAPI validation and analytics
   ↓
Normalized API response
   ↓
React dashboard
```

Business calculations are handled in the backend. The frontend displays, sorts, searches, filters, and presents the returned data.

## Data

The application uses three CSV datasets:

* Child-level data
* Placement-level data
* Provider-level data

Sample files are stored in:

```text
public/data/
```

The reporting date and analytics thresholds are configured in:

```text
backend/app/config.py
```

Current reporting date:

```text
July 1, 2026
```

## Run Locally

### Requirements

* Node.js 18 or later
* npm
* Python 3.10 or later

## Start the Backend

From the project root, create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Activate it on macOS or Linux:

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

Start the FastAPI backend:

```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```

The backend will run at:

```text
http://localhost:8000
```

Health endpoint:

```text
http://localhost:8000/api/health
```

## Start the Frontend

Open a second terminal in the project root.

Install frontend dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend will run at:

```text
http://localhost:5173
```

Both the frontend and backend must be running at the same time.

## Environment Variables

### Frontend

The frontend uses:

```text
VITE_API_BASE_URL
```

For local development:

```text
VITE_API_BASE_URL=http://localhost:8000
```

Create a `.env.local` file in the project root when a custom API URL is needed.

The deployed Vercel frontend uses:

```text
VITE_API_BASE_URL=https://foster-insights-1.onrender.com
```

### Backend

The backend uses:

```text
FRONTEND_URL
```

For the deployed application:

```text
FRONTEND_URL=https://foster-insights.vercel.app
```

This allows the Vercel frontend to communicate with the Render backend through FastAPI CORS configuration.

## API Endpoints

```text
GET /api/health
GET /api/sample
POST /api/process
```

`GET /api/sample` loads the provided sample datasets.

`POST /api/process` accepts the child, placement, and provider CSV files, validates them, calculates the analytics model, and returns the results to the frontend.

## Testing

### Frontend

```bash
npm run typecheck
npm run lint
npm run build
```

### Backend

Windows PowerShell:

```powershell
$env:PYTHONPATH="backend"
pytest backend/tests
ruff check backend
```

macOS or Linux:

```bash
PYTHONPATH=backend pytest backend/tests
ruff check backend
```

## Deployment

### Frontend Deployment

The frontend is deployed on Vercel.

```text
Framework: Vite
Build command: npm run build
Output directory: dist
Install command: npm install
```

Live frontend:

```text
https://foster-insights.vercel.app
```

### Backend Deployment

The backend is deployed on Render.

Build command:

```text
pip install -r backend/requirements.txt
```

Start command:

```text
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Live backend:

```text
https://foster-insights-1.onrender.com
```

Render environment variables:

```text
PYTHON_VERSION=3.12.8
FRONTEND_URL=https://foster-insights.vercel.app
```

The Render root directory is left blank because the backend reads the sample CSV files from:

```text
public/data/
```

## Privacy and Limitations

* Only anonymous child and provider IDs are displayed
* Recruitment scores are prioritization indicators, not automated decisions
* County mismatches do not measure placement quality or travel distance
* License expiration does not explain why a foster home stopped operating
* Active-day and licensed-day values come from the provider dataset
* Recruitment thresholds are transparent prototype rules
* Production use requires authentication, authorization, auditing, secure file handling, and additional data governance

## Future Integrations

This application was completed within a fast turnaround using the provided CSV datasets.

As discussed in the project email, a database was not implemented because of the time constraint.

A production version could add:

* A secure relational database
* Authentication and role-based access
* Recruitment and application forms
* Optional provider surveys
* Tracking of why foster homes leave or become inactive
* Automated renewal and follow-up reminders
* AI-assisted calling and texting for repetitive outreach
* Staff assignments, notes, due dates, and task tracking
* Monthly county and statewide summaries
* Historical recruitment and retention trends
* Automated data imports
* Audit logs
* Rate limiting
* Monitoring and error tracking
* Caching and pagination
* Background processing
* Automated testing and CI/CD
* Multi-state support

These additions could reduce repetitive manual work and help Foster Insights staff focus on higher-priority recruitment, retention, and provider-support activities.

## Project Status

Foster Insights is a functional full-stack prototype deployed with a React and TypeScript frontend on Vercel and a Python FastAPI backend on Render.