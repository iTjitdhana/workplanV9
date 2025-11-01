# คู่มือ Deploy บน Linux Server

## 1. Clone Repository

```bash
# Clone repository จาก GitHub
git clone https://github.com/iTjitdhana/WorkplanV8Linux.git

# เข้าไปในโฟลเดอร์
cd WorkplanV8Linux

# ตรวจสอบ tag v1.0.0 (ถ้าต้องการ)
git checkout v1.0.0
```

## 2. Copy และตั้งค่า .env files

### Backend .env

```bash
# สร้างไฟล์ .env สำหรับ Backend
cd backend
cp env.example .env
# หรือ
touch .env

# แก้ไข .env ด้วย editor (nano, vi, หรือ vim)
nano .env
```

**เนื้อหาที่ต้องใส่ใน `backend/.env`:**

```env
NODE_ENV=production
PORT=3101

# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
DB_PORT=3306

# CORS Configuration
CORS_ORIGIN=http://your-frontend-url:3011
FRONTEND_URL=http://your-frontend-url:3011

# API Rate Limit
API_RATE_LIMIT=1000

# Public Host (สำหรับแสดงใน logs)
PUBLIC_HOST=your-server-ip-or-domain
```

### Frontend Environment Variables

สำหรับ Frontend ไม่ต้องสร้าง `.env` แยก เพราะจะใช้ environment variables จาก `docker-compose.yml` แต่ถ้าต้องการสร้างก็ได้:

```bash
cd frontend
touch .env.local
```

**เนื้อหาสำหรับ `frontend/.env.local` (ถ้าต้องการ):**

```env
NEXT_PUBLIC_API_URL=http://your-backend-url:3101
BACKEND_URL=http://backend:3101
```

## 3. แก้ไข docker-compose.yml

เปิดไฟล์ `docker-compose.yml` และแก้ไข environment variables:

```bash
nano docker-compose.yml
```

**แก้ไขส่วน environment variables:**

```yaml
services:
  backend:
    environment:
      - DB_HOST=${DB_HOST:-localhost}
      - DB_USER=${DB_USER:-root}
      - DB_PASSWORD=${DB_PASSWORD:-your_password}
      - DB_NAME=${DB_NAME:-your_database}
      - DB_PORT=${DB_PORT:-3306}
```

**หรือ** สร้างไฟล์ `.env` ที่ root ของ project:

```bash
# ที่ root directory
touch .env
nano .env
```

**เนื้อหาสำหรับ root `.env`:**

```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database
DB_PORT=3306
NEXT_PUBLIC_API_URL=http://your-server-ip:3101
BACKEND_URL=http://backend:3101
```

## 4. Build และ Run Docker

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# ดู logs
docker compose logs -f

# ตรวจสอบ status
docker compose ps
```

## 5. ตรวจสอบ Services

```bash
# ตรวจสอบ backend health
curl http://localhost:3101/health

# ตรวจสอบ frontend
curl http://localhost:3011
```

## 6. การ Update

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker compose build --no-cache

# Restart services
docker compose down
docker compose up -d
```

## 7. การแก้ปัญหา

### ถ้า Build ล้มเหลว

```bash
# Clean และ rebuild
docker compose down
docker system prune -f
docker compose build --no-cache
```

### ตรวจสอบ Logs

```bash
# ดู logs ทั้งหมด
docker compose logs

# ดู logs เฉพาะ backend
docker compose logs backend

# ดู logs เฉพาะ frontend
docker compose logs frontend

# ดู logs แบบ real-time
docker compose logs -f
```

### ตรวจสอบ Database Connection

```bash
# เข้าไปใน backend container
docker compose exec backend sh

# ทดสอบ connection (ถ้ามี script)
node test-db-connection.js
```

## 8. Security Checklist

- [ ] เปลี่ยน default passwords ทั้งหมด
- [ ] ตรวจสอบว่า `.env` ไม่ได้ถูก commit ใน git
- [ ] ตั้งค่า firewall สำหรับ ports 3101 และ 3011
- [ ] ใช้ HTTPS (ถ้าเป็น production)
- [ ] ตรวจสอบ database permissions

## 9. Ports ที่ใช้

- **Backend**: `3101`
- **Frontend**: `3011`

## 10. Network

Services เชื่อมต่อกันผ่าน Docker network: `workplan-network`

Backend และ Frontend สามารถสื่อสารกันภายใน network โดยใช้ชื่อ service:
- Backend: `http://backend:3101`
- Frontend: `http://frontend:3011`

