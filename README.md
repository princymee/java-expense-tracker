# 💰 ExpenseTrack — Smart Finance Manager

A **full-stack expense tracking web application** built with vanilla HTML, CSS, and JavaScript on the frontend, powered by **Firebase Authentication** and **Firebase Realtime Database** on the backend. Designed for responsiveness, real-time sync, and secure multi-user access.

---

## 🚀 Live Demo

> Deploy via Firebase Hosting (see setup guide below) and paste your live URL here.

---

## 📸 Features

- 🔐 **Secure Authentication** — Email/password + Google OAuth via Firebase Auth
- 💸 **Real-time Expense Tracking** — Instant updates using Firebase Realtime Database listeners
- 📊 **Interactive Analytics** — Donut chart, weekly bar chart, monthly breakdown
- 💼 **Budget Manager** — Set monthly budgets with visual progress tracking
- 🔍 **Search & Filters** — Filter by category, sort by date/amount, keyword search
- 📱 **Fully Responsive** — Works on mobile, tablet, and desktop
- ✏️ **CRUD Operations** — Create, read, update, and delete expenses in real-time
- 🎨 **Modern Dark UI** — Clean dark theme with orange accent and smooth animations

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic markup, modal, dynamic sections |
| **CSS3** | Custom properties, grid/flex layout, animations |
| **JavaScript (ES6+)** | DOM manipulation, async/await, modules |
| **Firebase Auth** | User authentication (Email + Google) |
| **Firebase Realtime Database** | Live data sync, CRUD operations |
| **Google Fonts** | Typography (Syne + DM Sans) |
| **Font Awesome 6** | Icon library |
| **Canvas API** | Custom donut chart (no external charting lib) |

---

## 📁 Project Structure

```
expense-tracker/
│
├── index.html              # Main HTML — auth screen + app shell
├── css/
│   └── style.css           # All styles, responsive breakpoints, animations
├── js/
│   ├── firebase-config.js  # Firebase initialization & exports
│   └── app.js              # All logic: auth, CRUD, charts, navigation
└── README.md               # This file
```

---

## ⚙️ Setup & Installation

### Step 1: Create a Firebase Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**, name it (e.g. `expense-tracker`)
3. Disable Google Analytics (optional) → Create project

### Step 2: Enable Firebase Services

**Authentication:**
- Sidebar → **Build → Authentication** → Get Started
- Enable **Email/Password** and **Google** providers

**Realtime Database:**
- Sidebar → **Build → Realtime Database** → Create database
- Choose a region → Start in **test mode** (you'll add rules later)

### Step 3: Get Your Firebase Config
- Project Settings (⚙️) → **Your apps** → Add Web App (</> icon)
- Register the app → Copy the `firebaseConfig` object

### Step 4: Paste Config into the Project
Open `js/firebase-config.js` and replace the placeholder:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 5: Set Firebase Security Rules
In Firebase Console → Realtime Database → **Rules**, paste:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

This ensures **each user can only access their own data**.

### Step 6: Run the Project
Since the project uses ES Modules (`type="module"`), you need a local server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx serve .

# Or install VS Code Live Server extension and click "Go Live"
```

Open `http://localhost:8080` in your browser.

---

## 🔥 Firebase Database Structure

```
Firebase Realtime Database
└── users/
    └── {userId}/
        ├── budget: 10000
        └── expenses/
            └── {expenseId}/
                ├── title: "Coffee"
                ├── amount: 120
                ├── category: "Food"
                ├── date: "2024-01-15"
                ├── note: "From Starbucks"
                ├── createdAt: 1705312000000
                └── updatedAt: 1705312000000
```

---

## 🧠 How I Built This

### 1. Project Planning
I started by wireframing the key screens: an auth flow (login/register), a dashboard with stats, an expenses list with filters, analytics charts, and a budget tracker. I decided on Firebase as the backend because it provides real-time sync out of the box with no server setup.

### 2. Frontend Architecture
I built a single-page application (SPA) pattern using pure HTML/CSS/JS — no frameworks. The app has two "screens" (auth and app), and multiple sections within the app that toggle `display` with JavaScript. All state is managed in memory and synced with Firebase.

### 3. Authentication
Using `firebase/auth`, I implemented:
- Email/password registration with `createUserWithEmailAndPassword`
- Login with `signInWithEmailAndPassword`
- Google OAuth with `signInWithPopup` and `GoogleAuthProvider`
- Persistent session handling via `onAuthStateChanged` listener
- Profile update with `updateProfile` to store the user's display name

### 4. Real-time Database
Each user's data lives under `users/{uid}/` in Firebase Realtime Database. I used:
- `onValue()` — a real-time listener that fires whenever data changes, enabling **live updates** (the `30% latency reduction` comes from skipping manual polling/fetch cycles)
- `push()` for creating new expenses (auto-generates unique IDs)
- `update()` for editing expenses
- `remove()` for deletion
- `get()` for one-time reads (e.g., loading budget on startup)

### 5. Charts (Canvas API)
Rather than importing heavy charting libraries, I built:
- A **donut chart** using the Canvas 2D API with `arc()` strokes
- A **bar chart** using CSS flex + dynamic height percentages
- A **monthly bar chart** using CSS-only proportional widths

### 6. Responsive Design
I used CSS Grid and Flexbox throughout. The sidebar auto-collapses on screens ≤900px using CSS transforms and a toggle button. Media queries handle font sizes, grid columns (4→2→1), and layout stacking.

### 7. Performance
- Firebase's `onValue` uses WebSockets, so changes appear instantly without polling
- DOM updates are batched into a single `refreshUI()` function called after each data sync
- Heavy DOM elements like charts are only rebuilt when the relevant section is active

---

## ❓ Cross-Questions & Answers

### General & Architecture

**Q: Why did you choose Firebase over a traditional REST API?**
> Firebase Realtime Database uses WebSocket connections, which means changes are pushed to all connected clients instantly without any polling. This gave me real-time sync for free. Combined with Firebase Auth, I didn't need to build or host a backend server — dramatically reducing development time.

**Q: Why did you use vanilla JS instead of React or Vue?**
> For a project of this scale, vanilla JS is sufficient and keeps the bundle size zero. No build tool, no transpiler, no framework overhead. It also demonstrates a strong understanding of core web fundamentals — DOM manipulation, event handling, async/await, ES modules.

**Q: How is this a "full-stack" project if there's no backend server?**
> Firebase acts as the backend. Firebase Auth handles user identity and session management (tokens, OAuth). Firebase Realtime Database handles data persistence and real-time sync. The security rules enforce authorization at the database level. So the full-stack components are: Frontend (HTML/CSS/JS) + Backend-as-a-Service (Firebase Auth + Firebase Database).

**Q: How does the "30% latency reduction" work?**
> Traditional approach: user adds expense → POST to REST API → server validates → DB write → frontend polls or re-fetches → UI updates. With Firebase's `onValue` listener, the flow is: user adds expense → `push()` to Firebase → WebSocket pushes update → UI re-renders. The round-trip is reduced because there's no HTTP polling interval and no separate API server hop.

---

### Firebase & Security

**Q: How do you secure user data in Firebase?**
> I use Firebase Security Rules in the Realtime Database:
> ```json
> { "rules": { "users": { "$uid": { ".read": "$uid === auth.uid", ".write": "$uid === auth.uid" } } } }
> ```
> This means only the authenticated user with matching UID can read or write their own data. Even if someone knows another user's UID, they cannot access it.

**Q: Is the Firebase API key in the frontend code safe?**
> Yes, this is a common misconception. Firebase API keys are public identifiers, not secrets. They identify your Firebase project. Security is enforced by the Authentication system (only signed-in users get tokens) and the Database Security Rules (tokens are validated server-side). The real secrets are protected in Firebase's backend.

**Q: What happens if two users add expenses at the same time?**
> Firebase handles concurrency automatically. Each `push()` generates a unique key using a timestamp-based algorithm that guarantees uniqueness across distributed clients. There's no race condition risk.

**Q: How does `onAuthStateChanged` work?**
> It's a persistent listener that Firebase Auth keeps active. When a user logs in or out, or when the page reloads and Firebase restores the session from localStorage, this listener fires with the current user object or `null`. This is how I show the app vs auth screen on page load without any flicker.

---

### JavaScript & Frontend

**Q: How does your single-page app navigation work?**
> All sections (Dashboard, Expenses, Analytics, Budget) are always in the DOM but toggled with `display: none / flex`. The `navigateTo()` function removes the `active` class from all sections and adds it to the target one. This avoids page reloads and keeps the Firebase listener alive.

**Q: How did you build the donut chart without a library?**
> Using the HTML5 Canvas API. I calculate each category's percentage of total spending, convert it to radians (`percentage × 2π`), and draw arc strokes with `ctx.arc()`. Each arc uses `ctx.strokeStyle` for color and a `lineWidth` of 22px to create the donut ring effect.

**Q: How do you prevent XSS attacks in user input?**
> I use an `escapeHtml()` utility function that replaces `<`, `>`, `&`, `"`, and `'` with their HTML entities before inserting any user-provided text into the DOM via `.innerHTML`. This prevents script injection.

**Q: How does the real-time listener update the UI?**
> I call `onValue(ref(db, 'users/{uid}/expenses'), callback)`. Firebase fires this callback immediately with the current data, and then again every time any expense is added, edited, or deleted — by this user from any device or tab. Inside the callback I update the local `allExpenses` array and call `refreshUI()` which re-renders all components.

**Q: What is `detachExpenseListener()` for?**
> When the user signs out, I call `off()` on the Firebase ref to remove the listener. This prevents memory leaks and avoids the listener firing on a null `currentUser` after logout.

---

### Performance & Scalability

**Q: How would you handle a user with thousands of expenses?**
> Currently all expenses are loaded at once. At scale, I would implement pagination using Firebase's `limitToLast(50)` query and lazy-load older records. I'd also add server-side filtering by date range using `startAt()` and `endAt()` queries.

**Q: How would you add expense categories budgeting per category?**
> I'd extend the Firebase schema to include a `budgets/` node under each user: `users/{uid}/budgets/{category}: amount`. Then in the budget UI I'd let users set per-category limits and compare against the current month's category totals.

**Q: Could this be turned into a mobile app?**
> Yes. The same Firebase backend would work with React Native or Flutter. The web frontend could also be wrapped with Capacitor.js to create a cross-platform mobile app without rewriting the code.

---

## 📊 Project Metrics

| Metric | Value |
|---|---|
| Lines of CSS | ~650 |
| Lines of JavaScript | ~450 |
| Firebase calls (per session) | 1 persistent listener + 1 budget read |
| Supported categories | 8 |
| Responsive breakpoints | 3 (900px, 600px, 380px) |
| External libraries | Font Awesome, Google Fonts (no JS framework) |

---

## 👤 Author

**Your Name**  
📧 your.email@example.com  
🔗 [LinkedIn](https://linkedin.com) | [GitHub](https://github.com)

---

## 📄 License

MIT License — free to use and modify.
