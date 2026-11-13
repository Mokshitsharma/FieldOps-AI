<!-- readme-refresh 2026-11 -->
<div align="center">

# 🧭 FieldOps AI

**A workforce platform for a field team of about 20: attendance, onboarding, payments and performance**

<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /> <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" /> <img src="https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white" alt="MariaDB" /> <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" /> <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /> <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter" />

</div>

## ✨ Highlights

- Flutter mobile app for field staff: GPS attendance, driver and retailer onboarding, call logging, payments
- Next.js admin dashboard: attendance, employees, expenses, salary, targets, live map
- Config-driven points engine with 19 scorable actions and monthly resets
- GPS points are batched and uploaded once a minute, with retries

<!-- body -->
## 🏗️ How it works

| Part | Folder | Stack |
|---|---|---|
| Backend API | `backend/` | TypeScript, Express, Sequelize, MariaDB, Socket.io, JWT access and refresh tokens |
| Admin dashboard | `admin-dashboard/` | Next.js, Tailwind CSS |
| Field staff app | `mobile-app/` | Flutter (Android foreground service for GPS) |

The backend has a 27-entity schema and about 70 REST and Socket.io endpoints. Deployment steps are in
[`DEPLOYMENT.md`](DEPLOYMENT.md).

## 🚀 Run locally

```bash
cd backend && npm install && npm run dev            # API
cd admin-dashboard && npm install && npm run dev    # dashboard
cd mobile-app && flutter pub get && flutter run     # app
```

---

<div align="center"><sub>Built by <a href="https://github.com/Mokshitsharma">Mokshit Sharma</a> · <a href="https://mokshitsharma27.vercel.app/">Portfolio</a> · <a href="https://www.linkedin.com/in/mokshit-sharma-75b5ab305">LinkedIn</a></sub></div>
