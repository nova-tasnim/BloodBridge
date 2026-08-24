# BloodBridge

**AI-Powered Smart Blood Donation & Emergency Response Platform**

BloodBridge is a full-stack blood donation and emergency response platform designed to connect **donors, patients, hospitals, blood banks, and administrators** through intelligent donor matching, real-time request coordination, blood inventory management, campaign organization, notifications, and an AI-powered health assistant.

The platform aims to reduce the time and complexity involved in finding compatible blood during emergencies while maintaining donor eligibility, donation history, institutional verification, and request fulfillment in one integrated system.

> Developed as an individual project for **CSE470: Software Engineering** using the **MVC architecture**.

---

## Overview

BloodBridge goes beyond a traditional blood donor directory.

When a blood request is created, the platform can identify suitable donors based on:

* Blood-group compatibility
* Geographic proximity
* Current donor eligibility
* Donor availability
* Donation recency
* Request urgency

The system then supports the complete workflow from donor matching and response handling to request fulfillment and donation verification.

BloodBridge also includes a **RAG-powered AI Health Assistant**, blood-bank inventory tracking, blood donation campaigns, multilingual support, email and in-app notifications, achievement badges, donor leaderboards, and an administrative analytics dashboard.

A Patient may also register as a blood donor without changing their primary account role. This is handled through an embedded donor profile and a unified donor identity system.

---

## Tech Stack

| Layer                | Technology                  |
| -------------------- | --------------------------- |
| Frontend             | React + Vite                |
| Backend              | Node.js + Express.js        |
| Database             | MongoDB Atlas + Mongoose    |
| AI Integration       | Google Gemini API           |
| RAG / Vector Search  | MongoDB Atlas Vector Search |
| Maps                 | Leaflet                     |
| Authentication       | JWT                         |
| Email Notifications  | Nodemailer + Gmail SMTP     |
| Internationalization | i18next                     |
| Architecture         | MVC                         |

---

## Key Features

BloodBridge contains **20 core features** developed according to the project SRS.

### 1. Blood Request Creation

Patients, Hospitals, and Admins can create blood requests containing:

* Required blood group
* Required units
* Urgency level
* Hospital information
* Geographic location
* Emergency/SOS status

Requests are automatically associated with the authenticated user.

---

### 2. Smart Donor Matching & Blood Type Compatibility

The matching system evaluates donors based on:

* Blood-group compatibility
* Geographic distance
* Current eligibility
* Availability
* Donation recency

A dedicated compatibility engine determines valid donor and recipient blood-group relationships.

---

### 3. Emergency Request Prioritization Queue

Active blood requests are ranked dynamically using:

* Urgency
* Waiting time
* SOS priority

Critical emergency requests receive the highest priority.

---

### 4. Request Lifecycle & Donor Response Management

Blood requests follow a controlled lifecycle:

```text
Pending
   ↓
Matched
   ↓
Accepted
   ↓
Fulfilled
```

Matched native Donors and Patient-donors can accept or decline requests.

Hospitals, Blood Banks, and Admins can perform authorized operational actions where applicable.

---

### 5. Emergency SOS Requests

Users can create emergency requests through an SOS workflow.

SOS requests:

* Receive critical urgency
* Are prioritized in the queue
* Can trigger donor matching
* Can generate notifications and email alerts

---

### 6. Donor Eligibility & Donor Registration

BloodBridge uses a rule-based donor eligibility engine considering:

* Age
* Weight
* Gender-specific donation interval
* Last approved donation date
* Health conditions / health flags

Two donor identities are supported:

```text
Native Donor
role = "Donor"

Patient-donor
role = "Patient"
donorProfile = {...}
```

A Patient who registers as a donor **remains a Patient** and gains donor capability through `donorProfile`.

Patient signup information such as blood group, date of birth, gender, and weight is reused during donor registration instead of being unnecessarily entered again.

---

### 7. Donor Availability Toggle

Native Donors and Patient-donors can control whether they are currently available for matching.

Availability is protected by ownership rules so users cannot arbitrarily modify another donor's status.

---

### 8. Donation History & Admin Approval Workflow

BloodBridge supports:

* Donor self-submitted donations
* Patient-donor self-submitted donations
* Hospital/Blood Bank/Admin submissions for donors
* Regular donations
* Campaign donations
* Request-linked donations

Every new donation starts as:

```text
Pending
```

Only an Admin can approve or reject it.

```text
Submission
   ↓
Pending
   ↓
Admin Review
   ├── Approved
   └── Rejected
```

Only **approved donations** update:

* Total donation count
* Last donation date
* Donor eligibility
* Campaign collected units
* Campaign registration donation status
* Request fulfilled units
* Related donor statistics

Pending and rejected donations do not affect official statistics.

---

### 9. Next Eligible Donation Reminder System

The reminder system uses the same centralized eligibility engine as the rest of the application.

It calculates:

* Next eligible donation date
* Days since last approved donation
* Required waiting interval
* Eligibility reasons

Both native Donors and Patient-donors are supported.

---

### 10. Achievement Badges & Donor Leaderboard

BloodBridge includes milestone-based donor achievements.

Examples include:

* First Donation
* Bronze Donor
* Silver Donor
* Gold Donor

Leaderboard statistics are calculated from **approved donation records only**.

The leaderboard supports both:

* Native Donors
* Patient-donors

It displays donation count, units donated, lives-saved estimate, and earned badges.

---

### 11. Donor Search & Filtering

Users can search the donor directory using:

* Blood group
* Location
* Availability
* Pagination

Both native Donors and Patient-donors appear through the unified donor identity system.

---

### 12. Blood Inventory Management

Blood Banks can manage their own blood inventory.

Supported operations include:

* Add stock
* Update stock
* Issue/consume units
* Delete inventory entries
* Track expiry dates
* Configure low-stock thresholds
* View inventory alerts

Hospitals have **read-only inventory visibility**, while Admins can perform authorized global management operations.

Expired or inactive blood batches cannot be issued.

---

### 13. Request History & Fulfillment Reporting

BloodBridge provides reporting for:

* Total requests
* Active requests
* Fulfilled requests
* Requests created during the current month
* Fulfillment rate
* Blood-group distribution
* Request history

Admin and live platform statistics use shared definitions to avoid inconsistent analytics.

---

### 14. Blood Donation Campaigns

Hospitals, Blood Banks, and Admins can organize blood donation campaigns.

Campaigns support:

* Location
* Venue
* Date and time
* Target units
* Priority blood groups
* Registration
* Attendance
* Donation tracking

The authenticated creator automatically becomes the campaign organizer.

Hospitals and Blood Banks can manage only campaigns they created, while Admin can manage all campaigns.

Native Donors and Patient-donors can register for campaigns.

Campaign donations are submitted through the donation workflow and only affect campaign statistics after Admin approval.

---

### 15. Feedback & Rating System

Users can provide feedback for eligible completed activities.

Supported feedback includes:

* Fulfilled blood requests
* Approved donations
* Ratings
* Written comments

Feedback identity is tied to the authenticated user.

Duplicate feedback submissions are prevented.

Admins can:

* View feedback
* Moderate feedback
* Delete inappropriate feedback

Admins cannot submit arbitrary reviews themselves.

---

### 16. AI Health Assistant

BloodBridge includes a **RAG-powered conversational health assistant**.

The assistant uses:

* Google Gemini
* MongoDB Atlas Vector Search
* A blood donation knowledge base
* Blood-type compatibility logic
* The donor eligibility engine

It can answer questions about:

* Donation preparation
* Eligibility
* Recovery
* Blood-type compatibility
* Donation procedures
* Frequently asked blood donation questions

Plain Patients can use the assistant for general guidance.

Native Donors and Patient-donors can additionally receive live personalized eligibility information.

The assistant does not rely solely on model-generated assumptions; it integrates with real BloodBridge application logic.

---

### 17. Multi-Channel Notifications

BloodBridge provides both:

#### In-App Notifications

* Notification bell
* Unread count
* Mark as read
* Mark all as read
* Matched donor notifications
* Request response notifications
* Fulfillment notifications
* SOS notifications

#### Email Notifications

Email delivery is implemented using:

```text
Nodemailer
+
Gmail SMTP
```

Notifications are delivered to relevant users rather than being indiscriminately broadcast.

---

### 18. Nearby Blood Request Map

BloodBridge includes an interactive Leaflet map for viewing nearby active blood requests.

Features include:

* Request markers
* Geographic filtering
* Urgency indicators
* MongoDB geospatial queries
* `2dsphere` indexing

---

### 19. Admin Dashboard & Platform Analytics

The Admin dashboard provides:

* Donor statistics
* Patient statistics
* Hospital statistics
* Blood Bank statistics
* Request statistics
* Fulfillment rate
* Donor retention
* Institution verification
* User management
* Donation approval/rejection
* Feedback moderation
* Platform analytics

Donor statistics correctly include:

```text
Native Donors
+
Patient-donors
```

Admins are also protected from accidentally deactivating their own administrative account.

---

### 20. Multi-Language Support

BloodBridge supports:

* English
* Bangla

Translations are not limited to static JSON files.

The final translation architecture is:

```text
Admin Translation Panel
        ↓
Translation API
        ↓
MongoDB
        ↓
Runtime Translation Resources
        ↓
i18next
```

The JSON translation files are used as initial seed resources.

Admins can manage translations through the application UI.

The AI Health Assistant can also respond using the selected language.

---

## User Roles

| Role                | Main Capabilities                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Donor**           | Manage availability, respond to matched requests, log donations, view donation history, join campaigns, earn badges                          |
| **Patient**         | Create blood requests, track requests, use the AI assistant, search donors, optionally register as a donor                                   |
| **Patient + Donor** | Retains Patient role while gaining donor availability, matching, donation, campaign, eligibility, badge, and leaderboard capabilities        |
| **Hospital**        | Create and coordinate requests, manage owned campaigns, view donor information where authorized, view Blood Bank inventory                   |
| **Blood Bank**      | Manage own inventory, coordinate requests, manage owned campaigns, record donor-related operations                                           |
| **Admin**           | Verify institutions, approve/reject donations, manage users, moderate feedback, manage translations, manage campaigns, and monitor analytics |

---

## Donor Identity Architecture

One of the core architectural decisions in BloodBridge is the unified donor capability system.

```text
Native Donor
User
├── role = "Donor"
└── donor information stored on donor discriminator


Patient-donor
User
├── role = "Patient"
└── donorProfile
    └── donor information
```

Both donor types receive a public donor identifier:

```text
DON-XXXXXX
```

Application logic uses the underlying:

```text
User._id
```

for database relationships.

The shared `donorIdentityService.js` provides donor-capability functions such as:

```text
hasDonorCapability()
resolveDonor()
normalizeDonor()
getDonorProfile()
setAvailability()
registerDonationAggregate()
```

This prevents features from incorrectly depending only on:

```js
role === 'Donor'
```

---

## Project Structure

```text
BloodBridge/
│
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── api/                # Frontend API resources
│   │   ├── components/         # Shared UI components
│   │   ├── context/            # Authentication context
│   │   ├── locales/            # English/Bangla seed translations
│   │   ├── pages/              # Application pages
│   │   └── utils/              # Frontend utilities
│   │
│   └── package.json
│
├── server/                     # Express backend
│   ├── config/                 # Configuration and constants
│   ├── controllers/            # MVC controllers
│   ├── data/                   # Knowledge base / seed data
│   ├── middleware/             # Auth and error middleware
│   ├── models/                 # Mongoose database models
│   ├── routes/                 # Express routes
│   ├── scripts/                # Seed / utility scripts
│   ├── services/               # Business logic
│   ├── utils/                  # Backend utilities
│   ├── app.js
│   └── package.json
│
├── docs/                       # SRS, diagrams and documentation
│
└── README.md
```

---

## MVC Architecture

BloodBridge follows the required **Model-View-Controller architecture**.

### Model

Mongoose models define and manage MongoDB data.

Examples:

```text
User
BloodRequest
DonationRecord
Campaign
CampaignRegistration
Inventory
Reminder
Badge
Feedback
Notification
Translation
KnowledgeChunk
```

### View

React pages and components form the user interface.

```text
client/src/pages/
client/src/components/
```

### Controller

Express controllers receive HTTP requests, validate authorization, invoke business services, and return responses.

```text
server/controllers/
```

Business logic that is shared between controllers is separated into:

```text
server/services/
```

---

## Getting Started

### Prerequisites

Make sure the following are installed or available:

* Node.js 18+
* npm
* MongoDB Atlas account
* Google Gemini API key
* Gmail account / App Password for email notifications

---

## Installation

Clone the repository:

```bash
git clone https://github.com/nova-tasnim/BloodBridge.git
cd BloodBridge
```

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../client
npm install
```

---

## Environment Variables

Create a `.env` file inside:

```text
server/
```

Example:

```env
# Server
PORT=5000

# MongoDB
MONGO_URI=your_mongodb_atlas_connection_string

# Authentication
JWT_SECRET=your_jwt_secret

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Email / Gmail SMTP
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

If Admin credentials or other environment-specific configuration are defined in the project, configure those values locally as well.

> Never commit your real `.env` file, passwords, API keys, JWT secrets, or MongoDB credentials to GitHub.

---

## Running the Application

Open two terminals.

### Terminal 1 — Backend

```bash
cd server
node app.js
```

The backend runs on:

```text
http://localhost:5000
```

### Terminal 2 — Frontend

```bash
cd client
npm run dev
```

The frontend normally runs on:

```text
http://localhost:5173
```

Open the frontend URL in your browser.

---

## Development Plan

| Sprint   | Focus                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| Sprint 1 | Project setup, MVC architecture, SRS, class diagram                                       |
| Sprint 2 | User roles, donor architecture, blood requests                                            |
| Sprint 3 | Donor matching, compatibility, lifecycle management                                       |
| Sprint 4 | Donations, campaigns, inventory, reminders, engagement features                           |
| Sprint 5 | AI assistant, notifications, translations, analytics, authorization and final integration |

---

## Important Workflow: Donation Approval

BloodBridge uses an Admin-controlled donation verification workflow.

```text
Donor / Patient-donor / Institution
submits donation
        ↓
DonationRecord
status = pending
        ↓
Admin review
        ↓
   ┌──────────────┐
   │              │
Approved        Rejected
   │
   ↓
Official aggregates updated
```

Only approved donations affect official donor statistics.

This keeps:

* Donor eligibility
* Donation history
* Campaign statistics
* Request fulfillment
* Badges
* Leaderboards
* Reminder calculations
* Analytics

consistent with the same verified donation state.

---

## Security & Authorization Highlights

BloodBridge includes authorization beyond basic role checking.

Examples include:

* JWT authentication
* Role-based authorization
* Donor-capability authorization
* Resource ownership validation
* Hospital/Blood Bank Admin verification
* Campaign ownership enforcement
* Inventory ownership protection
* Request timeline privacy
* Donation approval authorization
* Feedback moderation permissions
* Admin account safety checks

---

## Documentation

Project documentation is available inside:

```text
docs/
```

Including:

* Software Requirements Specification
* Class diagrams
* Design documentation
* Project-related diagrams

---

## Feature Documentation

The complete feature breakdown contains all **20 core features**, including their frontend, backend, and database implementations.

See the project documentation for the detailed implementation mapping.

---

## Academic Context

BloodBridge was developed as an individual project for:

**CSE470 — Software Engineering**

The application follows the project requirement of using the **MVC architectural pattern**, with frontend, backend, and database implementation across the system's major features.

---

## Author

**GROUP 7**

CSE470 — Software Engineering

---

## License

This project was developed for academic purposes.
