# 🏏 Cricinfo a cricket Web Application

A full-stack web application that showcases structured cricket data including rankings, player stats, team information, and match schedules. The system supports secure user authentication, automated email notifications, and a MySQL-backed REST API for dynamic data rendering.

---

## 📌 Features

- 📊 **Dedicated Pages**: For teams, players, and series with detailed statistics and filters
- 🏆 **Rankings Across Formats**: Supports Test, ODI, and T20 player and team rankings
- 📅 **Match Schedule Viewer**: Users can explore match schedules by series or tournaments
- 🔐 **User Authentication**:
  - Manual login/signup system
  - Google OAuth Sign-In
- 📧 **Email Workflows**:
  - Login confirmation
  - Subscription/payment confirmation
- 🧾 **REST API Endpoints**:
  - Rankings, players by team, series/tournaments, match schedule, etc.

---

## 🧱 Tech Stack

| Layer         | Technology                                    |
|---------------|-----------------------------------------------|
| **Frontend**  | HTML, CSS, JavaScript                         |
| **Backend**   | Node.js, Express                              |
| **Database**  | MySQL (normalized schema, manually curated)   |
| **Email**     | Nodemailer (Gmail SMTP)                       |
| **Auth**      | Google OAuth + Manual Login                   |

---

## 🛠️ Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/sairamswaroopteja/cricket_database.git
cd cricket_database
```
### 2. Folder Structure
cricket_database/
│
├── client/             # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── rankings.html
│   └── ... (other pages)
│
├── server/             # Backend code (Node.js + Express)
│   ├── server.js
│   ├── .env
│   ├── package.json
│   └── ...

### 3. Install Backend Dependencies
cd server
npm install



##  Homepage
![Screenshot 2025-07-01 093541](https://github.com/user-attachments/assets/ec727d5f-3d82-484f-9785-f6897ce4b233)

## Series_page
![Screenshot 2025-07-01 093605](https://github.com/user-attachments/assets/f2d754f3-ad73-441d-a1ac-1e884f304295)

## Matches_Schedule
![Screenshot 2025-07-01 093656](https://github.com/user-attachments/assets/e6dfbfd1-edd1-49c6-bea2-10fb718a4d88)
![Screenshot 2025-07-01 093736](https://github.com/user-attachments/assets/bcece807-f39c-4d5e-9ae9-ad8a2820d052)

## Teams_and_their_squads
![Screenshot 2025-07-01 093807](https://github.com/user-attachments/assets/f486f645-0471-4bbe-aa59-cdd210d48f08)
![Screenshot 2025-07-01 093853](https://github.com/user-attachments/assets/a08f48ff-bc8d-48a3-b615-d1045b6af7bb)

## Player_and_Team_rankings
![Screenshot 2025-07-01 093951](https://github.com/user-attachments/assets/93b2c695-198f-4739-8f68-b9d32493fef4)
![Screenshot 2025-07-01 094032](https://github.com/user-attachments/assets/230d5ba4-4411-4e9c-84e3-b1283d6af234)

## login_and_signup_options_and_confirmation
![Screenshot 2025-07-01 094050](https://github.com/user-attachments/assets/8afb2862-d2ff-44f9-a776-7a1a001158a4)
![Screenshot 2025-07-01 094111](https://github.com/user-attachments/assets/dd2f277c-c4dd-4faf-b679-38451aca7828)
![Screenshot 2025-07-01 094407](https://github.com/user-attachments/assets/07d36ffc-ad34-4e9b-82f9-94ddbea26c22)

## Profile_and_subscription_plans
![Screenshot 2025-07-01 094128](https://github.com/user-attachments/assets/a1a5590e-9a36-4e5f-a525-736742d3598f)
![Screenshot 2025-07-01 094150](https://github.com/user-attachments/assets/ec67d806-0927-414f-8923-8e4461a35106)

## Payment_details_and_confirmation
![Screenshot 2025-07-01 094221](https://github.com/user-attachments/assets/5b6d144d-536c-4f96-a12f-5c5e43f602a6)
![Screenshot 2025-07-01 094426](https://github.com/user-attachments/assets/f25a1917-a272-4071-8406-c175345e9be0)



