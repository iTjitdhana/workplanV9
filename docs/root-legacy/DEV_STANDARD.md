# 🧭 DEV STANDARD – WorkPlan V6

## 📌 ภาพรวม
โครงการนี้ยึดมาตรฐานการพัฒนาตาม **DEV_STANDARD_SPEC.md** เพื่อความสม่ำเสมอ, ปลอดภัย, และสามารถ rollback ได้ทุกเวอร์ชัน

---

## 🔐 1. Environment Variables

### ✅ หลักการสำคัญ
- **ห้าม hardcode** ค่า URL, Secret, Password, API Key ในโค้ด
- ทุกค่าต้องมาจาก `.env` เท่านั้น
- แยกไฟล์ `.env.development` และ `.env.production` 
- Commit เฉพาะ `.env.example`

### 📁 โครงสร้างไฟล์
```
backend/
  ├─ .env.development     # Development config (Git ignored)
  ├─ .env.production      # Production config (Git ignored)
  └─ .env.example         # Template (Committed)

frontend/
  ├─ .env.development     # Development config (Git ignored)
  ├─ .env.production      # Production config (Git ignored)
  └─ .env.example         # Template (Committed)
```

### 🔧 การใช้งาน

**Backend (Node.js)**
```javascript
// server.js โหลด .env ตาม NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';
require('dotenv').config({ path: `./${envFile}` });

// ใช้งาน
const dbHost = process.env.DB_HOST;
const apiPort = process.env.PORT || 3101;
```

**Frontend (Next.js)**
```typescript
// ใช้ NEXT_PUBLIC_* prefix
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## 🐳 2. Docker Deployment

### ✅ Network Mode
- ใช้ **bridge network** เป็นค่าเริ่มต้น (ไม่ใช้ host mode)
- แยก service isolation เพื่อความปลอดภัย

### 📝 Docker Compose Structure
```yaml
services:
  backend:
    build: ./backend
    env_file:
      - ./backend/.env.production  # โหลดจากไฟล์
    ports:
      - "${API_PORT:-3102}:3102"   # ใช้ env variable
    networks:
      - workplan-network
      
  frontend:
    build: ./frontend
    env_file:
      - ./frontend/.env.production
    ports:
      - "${WEB_PORT:-3012}:3012"
    networks:
      - workplan-network

networks:
  workplan-network:
    driver: bridge
```

---

## 🗄️ 3. Database Configuration

### ✅ Connection Pool
```javascript
// backend/config/database.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectionLimit: 25,
  waitForConnections: true,
});
```

### 🔒 Security Best Practices
- ห้ามใช้ root account สำหรับ application
- กำหนดสิทธิ์ DB เฉพาะที่จำเป็น (SELECT, INSERT, UPDATE, DELETE)
- ใช้ SSL/TLS สำหรับการเชื่อมต่อข้ามเครื่อง
- Firewall: อนุญาตเฉพาะ IP ที่จำเป็น

---

## 📌 4. Git Workflow

### ✅ Branch Strategy
- `main` → Production ready
- `develop` → Integration branch
- `feature/<name>` → ฟีเจอร์ใหม่
- `fix/<name>` → แก้บั๊ก

### 🏷️ Version Tagging
```bash
# Tag เวอร์ชันใหม่
git add .
git commit -m "feat: เพิ่มระบบจัดการผู้ใช้"
git tag v1.4.0
git push && git push --tags

# Rollback
git checkout v1.3.1
docker compose up -d --build
```

### 📝 Commit Message Format
```
feat: เพิ่มฟีเจอร์ใหม่
fix: แก้ไขบั๊ก
chore: ปรับ config/dependency
docs: อัพเดทเอกสาร
refactor: ปรับโครงสร้างโค้ด
```

---

## 🔒 5. Security Standards

### ✅ Password Hashing
- ใช้ **bcrypt** หรือ **argon2** เท่านั้น
- ห้ามใช้ `crypto.createHash()` สำหรับ password

### 🛡️ API Security
- JWT_SECRET ต้องยาวอย่างน้อย 32 characters
- ห้าม CORS = `*` ใน production
- เปิด HTTPS ใน production เสมอ
- มี rate limiting ป้องกัน brute force
- Validate input ด้วย Joi หรือ Zod

### 🔐 Environment Secrets
```bash
# สร้าง JWT Secret ที่แข็งแรง
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🚀 6. Deployment Process

### Development
```bash
# ใช้ .env.development
NODE_ENV=development npm run dev

# หรือ Docker
docker compose -f docker-compose.dev.yml up
```

### Production
```bash
# 1. ตั้งค่า .env.production
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production
# แก้ไขค่าให้เหมาะสม

# 2. Build & Deploy
docker compose up -d --build

# 3. ตรวจสอบ
docker compose logs -f
```

---

## 📊 7. Monitoring & Health Check

### ✅ Health Check Endpoint
```javascript
// backend/server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### 📝 Logging
- ใช้ structured logger (แนะนำ: Pino หรือ Winston)
- ทุก request ต้องมี trace ID
- Log level ตาม environment (debug/info/error)

---

## 🔧 8. Port Management

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | 3011/3012 | 3012 |
| Backend API | 3101 | 3102 |
| Database | 3306 | 3306 |

**ใช้ environment variables:**
```bash
# .env
WEB_PORT=3012
API_PORT=3102
```

---

## 📚 9. Project Structure

```
WorkPlanV6/
├── backend/
│   ├── config/          # Database, environment config
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── .env.example
│   ├── .env.development
│   ├── .env.production
│   └── server.js
│
├── frontend/
│   ├── app/             # Next.js pages
│   ├── components/      # Reusable components
│   ├── lib/             # Utilities
│   ├── .env.example
│   ├── .env.development
│   └── .env.production
│
├── docs/                # Documentation
├── scripts/             # Build & utility scripts
├── docker-compose.yml   # Production compose
├── docker-compose.dev.yml
├── .gitignore
├── DEV_STANDARD.md      # This file
└── README.md
```

---

## ✅ Checklist สำหรับ Developer

### ก่อนเริ่มงาน
- [ ] Clone repo และ checkout develop branch
- [ ] คัดลอก `.env.example` → `.env.development`
- [ ] แก้ไขค่า config ให้เหมาะสม
- [ ] รัน `npm install` ทั้ง backend และ frontend
- [ ] Test connection กับ database

### ก่อน Commit
- [ ] ไม่มี hardcode credentials ในโค้ด
- [ ] ทุกค่า config มาจาก `.env`
- [ ] ทำ lint และ format โค้ด
- [ ] Test ให้ผ่านหมด
- [ ] เขียน commit message ตาม convention

### ก่อน Deploy
- [ ] Tag version ใหม่
- [ ] ตรวจสอบ `.env.production` ให้ครบถ้วน
- [ ] Backup database
- [ ] Test บน staging ก่อน (ถ้ามี)
- [ ] แจ้งทีมก่อน deploy production

---

## 🆘 Troubleshooting

### Database Connection Failed
```bash
# ตรวจสอบ MySQL service
mysql -h <DB_HOST> -u <DB_USER> -p

# ตรวจสอบ firewall
telnet <DB_HOST> 3306

# ตรวจสอบ user permissions
GRANT ALL PRIVILEGES ON esp_tracker.* TO 'jitdhana'@'%';
FLUSH PRIVILEGES;
```

### Environment Variables Not Loading
```bash
# ตรวจสอบว่าไฟล์ .env มีอยู่จริง
ls -la backend/.env*

# ตรวจสอบ NODE_ENV
echo $NODE_ENV

# Debug โหลด dotenv
node -r dotenv/config backend/server.js
```

---

## 📖 อ้างอิง
- [DEV_STANDARD_SPEC.md](./dev_standard_spec.md) - มาตรฐานหลักขององค์กร
- [README.md](./README.md) - คู่มือการใช้งานระบบ
- [Docker Documentation](https://docs.docker.com/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**เอกสารนี้ปรับปรุงล่าสุด:** 2025-10-20  
**เวอร์ชัน:** 1.0.0

