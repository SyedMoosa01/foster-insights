# Foster Insights

Foster Insights is a full-stack dashboard for analyzing foster-home recruitment, retention, provider engagement, placement activity, and county-level need.

The backend validates CSV files, calculates shared metrics, and sends one normalized analytics model to the frontend.

## Features

* Statewide foster-care summary
* County recruitment urgency scoring
* Foster-home retention analysis
* Provider engagement and inactivity tracking
* License expiration monitoring
* Out-of-county placement analysis
* County and provider detail pages
* CSV upload and validation
* Search and filtering
* Responsive dashboard
* Transparent metric definitions

## Recruitment Urgency Score

Each county receives one point for every active recruitment concern:

* Losing foster homes
* Age-range gap
* High out-of-county placement rate
* Licenses expiring within the selected window
* Low active-use rate
* Increased foster-home placement demand

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

Business calculations are handled in the backend. The frontend displays, sorts, searches, and filters the returned data.

## Data

The application uses three CSV datasets:

* Child-level data
* Placement-level data
* Provider-level data

Sample files are stored in:

```text
public/data/
```

The reporting date is configured in:

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

### Backend

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it.

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS or Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Start the backend:

```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```

API:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

### Frontend

Open another terminal:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Both the frontend and backend must be running.

## Environment Variable

The frontend uses:

```text
VITE_API_BASE_URL=http://localhost:8000
```

Create a `.env.local` file to change the API URL.

## API Endpoints

```text
GET /api/health
GET /api/sample
POST /api/process
```

`POST /api/process` accepts the child, placement, and provider CSV files.

## Testing

Frontend:

```bash
npm run typecheck
npm run lint
npm run build
```

Backend:

```bash
PYTHONPATH=backend pytest backend/tests
ruff check backend
```

## Deployment

The frontend and backend can be deployed separately.

Possible frontend platforms:

* Vercel
* Netlify
* Cloudflare Pages

Possible backend platforms:

* Render
* Railway
* Fly.io
* Google Cloud Run
* Azure App Service
* AWS

Before deployment:

* Set the production `VITE_API_BASE_URL`
* Add the frontend domain to the FastAPI CORS configuration
* Confirm `/api/health` returns a successful response
* Confirm CSV upload and dashboard filters work

## Privacy and Limitations

* Only anonymous child and provider IDs should be displayed
* Recruitment scores are prioritization indicators, not automated decisions
* County mismatches do not measure placement quality or travel distance
* License expiration does not explain why a foster home stopped operating
* Production use requires authentication, authorization, auditing, secure file handling, and additional data governance

## Project Status

Foster Insights is a functional full-stack prototype.

A production version could add:

* A relational database
* Authentication and user roles
* Historical data tracking
* Audit logs
* Scheduled imports
* Automated alerts
* Monitoring
* Additional placement and provider variables
