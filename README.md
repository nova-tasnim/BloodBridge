# BloodBridge

**AI-Powered Smart Blood Donation & Emergency Response Platform**

BloodBridge bridges the gap between blood donors, patients, hospitals, and blood banks by combining intelligent donor matching, real-time emergency coordination, and an AI-powered health assistant — reducing the time it takes to find compatible blood during emergencies.

Built as an individual project for CSE470: Software Engineering.

---

## Overview

BloodBridge goes beyond a simple donor directory. When a blood request is created, the platform automatically identifies the most suitable donors based on blood type compatibility, geographic proximity, donation eligibility, and availability — then coordinates the response in real time. A RAG-powered AI assistant guides users through eligibility checks, answers donation-related questions, and delivers personalized reminders.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| AI Integration | OpenAI API (RAG-powered assistant) |
| Architecture | MVC |

## Key Features

- **Smart Donor Matching** — scores and ranks eligible donors by compatibility, distance, and availability
- **Emergency SOS Requests** — one-tap urgent blood request submission
- **Request Lifecycle Tracking** — pending → matched → accepted → fulfilled
- **Donor Eligibility Engine** — rule-based eligibility checks (age, weight, last donation date)
- **Inventory Management** — blood bank stock tracking with low-stock alerts
- **AI Health Assistant** — RAG-powered conversational guidance on eligibility, FAQs, and reminders
- **Role-Based Dashboards** — tailored views for Donors, Patients, Hospitals, Blood Banks, and Admins

*(20 features total across 4 development sprints — see [SRS documentation](./docs) for the complete list.)*

## Project Structure
BloodBridge/
├── client/ # React frontend
├── server/ # Express backend (MVC)
│ ├── models/
│ ├── controllers/
│ ├── routes/
│ └── config/
├── docs/ # SRS document, class diagrams
└── README.md
## User Roles

| Role | Capabilities |
|---|---|
| Donor | Manage availability, track donation history, respond to match requests |
| Patient | Create blood requests, track status, receive AI-assisted guidance |
| Hospital | Create/coordinate requests, manage cases |
| Blood Bank | Manage inventory, approve donor responses |
| Admin | Verify accounts, monitor platform analytics |

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account

### Installation

```bash
# Clone the repository
git clone https://github.com/nova-tasnim/BloodBridge.git
cd BloodBridge

# Set up the backend
cd server
npm install

# Set up the frontend
cd ../client
npm install
```

### Environment Variables

Create a `.env` file inside `server/` with:
MONGO_URI=your_mongodb_connection_string
PORT=5000
### Running the app

```bash
# Terminal 1 — backend
cd server
node app.js

# Terminal 2 — frontend
cd client
npm run dev
```

Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.

## Development Plan

| Sprint | Focus |
|---|---|
| Sprint 1 | Setup, MVC scaffolding, class diagram, SRS |
| Sprint 2 | Donor & request foundations |
| Sprint 3 | Matching & request lifecycle |
| Sprint 4 | Engagement & institutional features |
| Sprint 5 | AI assistant, notifications, admin |

## Documentation

- [Software Requirements Specification](./docs)
- [Class Diagram](./docs)

## Author

— CSE470 Software Engineering