# CSMS - Cheta Students Management System

Bridging the gap between training and placements, **CSMS** is a feature-rich, web-based Student Management System designed to help students track worksheets, submit code challenges, monitor mock placement drives, and log real-time check-in attendance, while providing administrators with powerful monitoring and evaluation tools.

---

## 👥 Team Members & Contributions

| Name | Roll No. | Role | Contribution |
| :--- | :--- | :--- | :--- |
| **B. Chethan** | 23691A0532 | FrontEnd Developer | Implemented the complete React client-side application, built dashboards for both students and admins, designed responsive components (Attendance tracker, Grades, Chat, Leaves, Leaderboard, Tasks), and implemented client-side state/routing. |
| **Nichitha Sree** | 23691A03340 | Testing + Documentation | Drafted documentation and user guides, defined test cases for REST APIs and user-flow verification, identified frontend UI bugs, and validated features like leaf approval and mock results. |
| **S. Aftab Ali** | 23691A0505 | Backend Developer + Deployment | Developed the Django REST framework backend, managed DB models (SQLite and MongoDB integration), created helper utilities (`auth_utils.py`), prepared database seeding (`seed.py`), and handled deployment configurations on Netlify and Vercel. |

---

## 🚀 Key Features

### 👨‍🎓 Student Features
- **Interactive Dashboard**: Keep track of overall progress, attendance metrics, and grade trends.
- **Tasks & Worksheets**: View and submit assignments (GitHub URL, document uploads, or written text).
- **LeetCode Integration**: Compete in coding challenges and sync scores dynamically.
- **Leaderboard**: See class rankings based on tasks and LeetCode performance.
- **Attendance & Leaves**: Check in/out daily and submit leave requests for approval.
- **Mock Placement Drive Prep**: Browse practice materials, view past placement results, and monitor placement rounds.
- **Peer Chat**: Real-time communication with classmates and instructors.

### 👩‍💼 Admin Features
- **Student Allocation**: Manage batches and approve/reject batch enrollment requests.
- **Task Management**: Create tasks, set deadlines, and assign grading weights.
- **Auto & Manual Grading**: Grade task submissions, review documents, and provide feedback.
- **Mock Drive Results**: Upload and update placement drive performance.
- **Leaves & Attendance Management**: Approve or reject leave requests and review student attendance.
- **User Administration**: View, add, or modify user roles and profile details.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS / Custom CSS, Lucide React Icons
- **Backend**: Django REST Framework (Python), Django Channels (WebSocket)
- **Database**: SQLite (Relational) & MongoDB (NoSQL) integration
- **Deployment**: Netlify (Frontend) & Vercel (Backend)

---

## ⚙️ Project Setup

### Backend (Django)
1. Navigate to the `backend/` directory.
2. Set up a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations:
   ```bash
   python manage.py migrate
   ```
5. Seed database:
   ```bash
   python seed.py
   ```
6. Start the server:
   ```bash
   python manage.py runserver
   ```

### Frontend (React + Vite)
1. Navigate to the `frontend/` directory.
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
