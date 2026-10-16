# 🛒 PickFresh Mobile App
### Omnichannel Fresh Grocery Pre-Ordering & Wholesale Replenishment Ecosystem
**Sri Lanka Institute of Information Technology (SLIIT)**  
**Faculty of Computing — Year 3 Semester 2**  
**Module:** IT3060 — Human Computer Interaction (HCI) | Milestone 03  
**Group ID:** KND_HCI_G10  

---

## 👥 Group Members & Individual Module Contributions

| Student ID | Member Name | GitHub Username | Assigned Module & Key Features |
| :--- | :--- | :--- | :--- |
| **IT23197732** | **H.R Majeed** *(Leader)* | [@hashnirehana3107](https://github.com/hashnirehana3107) | **Product Inventory & Store Management**<br>• Real-time stock level monitoring & low-stock alerts<br>• Store profile, operating hours & banner promotions<br>• Core cross-cutting architecture, Auth Context & Navigation |
| **IT23718180** | **W.G.A.D Bandara** | [@Akesha1234](https://github.com/Akesha1234) | **Customer Shopping Experience**<br>• Dynamic store & category product catalog with quick search<br>• Smart produce replacement preferences on checkout<br>• Interactive Cart & Express Pickup slot reservation |
| **IT23747654** | **M.W.T.D.D Abeykoon** | [@damsara-abeykoon](https://github.com/damsara-abeykoon) | **Order Pickup & Fulfillment**<br>• Express QR Code generation & customer collection pass<br>• Shop Owner pickup verification scanner modal<br>• Real-time order progress timeline (Pending → Ready → Collected) |
| **IT23718326** | **G.G.A.E Gamaarachchi** | [@Achala-Git](https://github.com/Achala-Git) | **Supplier Replenishment & Logistics**<br>• B2B Wholesale product catalog management (CRUD)<br>• Automated store restock purchase order (PO) handling<br>• Live delivery & dispatch tracking with vehicle/driver telemetry |

---

## 🌟 Project Overview & HCI Focus

**PickFresh** is an intelligent mobile platform engineered to eliminate retail checkout congestion and minimize fresh food wastage. Built with **React Native (Expo)** and powered by a **Node.js/Express** backend with **MongoDB Atlas**, PickFresh connects three primary user roles:
1. **Shoppers (Customers):** Browse real-time inventory from local neighborhood grocers, customize smart replacement alternatives for fresh items, select 15-minute pickup slots, and pick up groceries without waiting in cashier queues.
2. **Shop Owners (Grocers):** Manage dynamic pricing, receive customer pickup pre-orders, scan customer QR codes for express verification, and monitor stock depletion with automated replenishment thresholds.
3. **Wholesale Suppliers:** Supply wholesale produce, manage replenishment purchase orders (POs), monitor fulfillment, and update real-time driver/vehicle dispatch telemetries.

### Key HCI Design Principles Applied:
- **Nielsen’s 10 Usability Heuristics:** Real-time visibility of system status (status chips, order badges, pulse indicators), match between system and real world (grocery metaphors, barcode/QR flows), error prevention (confirmation modals, deletion cascades), and minimalist design.
- **Fitts’s Law & Thumb-Zone Optimization:** Bottom navigation bars, large touch targets (minimum 48x48dp), easily reachable action sheets, and modal bottom drawers for mobile one-handed usage.
- **Cross-Platform Micro-Interactions:** Subtle haptic feedback, fluid animated transitions, and color-coded stock status badges (`IN STOCK`, `LOW STOCK`, `OUT OF STOCK`).

---

## 🛠️ Technology Stack

- **Mobile Application (Frontend):**
  - **Framework:** React Native (Expo SDK 54)
  - **Navigation:** Component-based stateful router + Tab Navigation
  - **Icons:** `lucide-react-native`
  - **Authentication:** JWT Token Storage (`@react-native-async-storage/async-storage`) + Google OAuth (`expo-auth-session`, `expo-web-browser`)
  - **Platform Targets:** Android (APK / Expo Go), iOS (Expo Go), and Web preview

- **Backend (REST API):**
  - **Runtime:** Node.js (v18+)
  - **Framework:** Express.js
  - **Database:** MongoDB Atlas (Cloud Cluster via Mongoose ODM)
  - **Authentication & Security:** JSON Web Tokens (JWT), Bcrypt password hashing, CORS

---

## 📁 Repository Structure

```text
PickFresh/
├── mobile/                               # React Native (Expo) Mobile Application
│   ├── App.js                            # Application Root & Role-based Routing
│   ├── app.json                          # Expo configuration & deep linking schemes
│   ├── package.json                      # Mobile dependencies
│   ├── assets/                           # Product icons, logos, illustrations
│   └── src/
│       ├── components/                   # Shared UI modals, headers, alert dialogs
│       ├── context/                      # AuthContext (Role switching, JWT session)
│       ├── pages/
│       │   ├── auth/                     # Login & Multi-role Registration
│       │   ├── customer_shopping/        # Customer Module (Bandara W.G.A.D)
│       │   ├── order_pickup/             # Order Pickup Module (Abeykoon M.W.T.D.D)
│       │   ├── supplier_replenishment/   # Supplier Module (Gamaarachchi G.G.A.E)
│       │   └── product_inventory/        # Inventory Module (Majeed H.R)
│       └── utils/                        # Google Auth helpers & API endpoints
│
├── backend/                              # Node.js + Express REST API
│   ├── server.js                         # Server entry point
│   ├── package.json                      # Backend dependencies
│   ├── .env.example                      # Environment variables template
│   ├── config/                           # MongoDB connection handler
│   ├── controllers/                      # Auth & user management controllers
│   ├── models/                           # User, Product, Order, Cart schemas
│   ├── customer_shopping/                # Shopping API routes & controllers
│   ├── order_pickup/                     # Order Pickup API routes & controllers
│   ├── supplier_replenishment/           # Supplier Replenishment routes & controllers
│   └── product_inventory/                # Product Inventory routes & controllers
│
├── .gitignore                            # Comprehensive git ignore rules
└── README.md                             # Academic project documentation
```

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [Git](https://git-scm.com/)
- Smartphone with **Expo Go** app installed ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/hashnirehana3107/PickFresh.git
cd PickFresh
```

---

### Step 2: Set Up & Start Backend Server
1. Navigate into `backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Create a `.env` file based on `.env.example`:
     ```env
     PORT=5000
     MONGODB_URI=your_mongodb_atlas_connection_string
     JWT_SECRET=pickfresh_hci_milestone03_secret_key_2026
     NODE_ENV=development
     ```
4. Start the backend:
   ```bash
   npm start
   ```
   *The backend REST API will start at `http://localhost:5000/api` with live MongoDB Atlas connection.*

---

### Step 3: Set Up & Start React Native Mobile App
1. Open a new terminal and navigate to `mobile`:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Expo development server with tunnel (for physical phone testing anywhere):
   ```bash
   npx expo start --tunnel
   ```
4. **Run on your smartphone:**
   - Scan the QR code in the terminal using the **Expo Go** app on Android or the **Camera** app on iOS.
5. **Run in Web browser (Mobile Viewport):**
   - Press `w` in the terminal to launch the web preview.
   - Press `F12` and click the Device Toggle icon (`Ctrl+Shift+M`) to preview in an iPhone or Pixel frame.

---

## 🔒 Security & Privacy Notice
All sensitive database credentials, API tokens, and temporary artifacts are strictly kept out of version control via `.gitignore`. A `.env.example` file is provided for straightforward local reproduction.

---

## 📄 License
This project is developed for educational purposes under the **SLIIT Faculty of Computing** academic curriculum. All rights reserved by the project authors.
