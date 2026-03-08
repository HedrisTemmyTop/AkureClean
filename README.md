# AkureClean - Smart Waste Management System

AkureClean is a comprehensive Smart Waste Management System designed to streamline waste collection and management in Akure. The project consists of a mobile application for residents, collectors, and admins, along with a backend server to manage data and transactions.

## 🚀 Project Overview

The system aims to improve urban sanitation by providing:
- **Resident App**: Bill payments, pickup requests, and transaction history.
- **Collector App**: Assignment management, route optimization, and pickup verification.
- **Admin Dashboard**: Assignment creation, user management, and system monitoring.

## 🛠 Tech Stack

### Frontend (Client)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation
- **Styling**: NativeWind / Tailwind CSS
- **State Management**: React Hooks / Context API

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express (Planned)
- **Database**: PostgreSQL / MongoDB (Planned)

## 📁 Project Structure

```bash
AkureClean/
├── client/          # React Native mobile application
│   ├── src/         # Application source code
│   ├── assets/      # Images and static files
│   └── App.tsx      # Main application entry point
├── server/          # Node.js backend server
│   └── .gitkeep     # Placeholder for server files
├── .gitignore       # Root-level git ignore rules
└── README.md        # Project documentation
```

## ⚙️ Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Expo Go app (for mobile testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HedrisTemmyTop/AkureClean.git
   cd AkureClean
   ```

2. **Setup Client**
   ```bash
   cd client
   npm install
   npx expo start
   ```

3. **Setup Server**
   ```bash
   cd ../server
   # npm install (when server is implemented)
   ```

## 🌿 Branching Strategy

- `master`: Production-ready code and stable releases.
- `dev`: Active development branch for new features and bug fixes.
- `production`: Mirrored branch for deployment environments.

## 📄 License

This project is licensed under the MIT License.

---
Developed as a Final Year Project at FUTA.
