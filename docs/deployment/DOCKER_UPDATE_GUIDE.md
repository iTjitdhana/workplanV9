# คู่มือการอัปเดท Docker Deployment

## 📋 ภาพรวม
เมื่อคุณแก้ไขไฟล์หรือพัฒนาในเครื่องหนึ่ง และต้องการให้ Docker ในอีกเครื่องอัปเดทเป็นเวอร์ชั่นที่แก้ไขแล้ว

## 🔄 วิธีที่ 1: ใช้ Git Repository (แนะนำ)

### ขั้นตอน:
1. **ในเครื่องที่แก้ไขโค้ด:**
   ```bash
   git add .
   git commit -m "แก้ไขปัญหา draft delete"
   git push origin main
   ```

2. **ในเครื่องที่รัน Docker:**
   ```bash
   git pull origin main
   docker compose -f infra/docker-compose.yml build
   docker compose -f infra/docker-compose.yml up -d
   ```

### ข้อดี:
- ✅ ง่ายและปลอดภัย
- ✅ มีประวัติการเปลี่ยนแปลง
- ✅ รองรับการ rollback

## 🔄 วิธีที่ 2: ใช้ Docker Registry

### ขั้นตอน:
1. **ในเครื่องที่แก้ไขโค้ด:**
   ```bash
   docker build -t workplan-app:latest .
   docker tag workplan-app:latest your-registry.com/workplan-app:latest
   docker push your-registry.com/workplan-app:latest
   ```

2. **ในเครื่องที่รัน Docker:**
   ```bash
   docker pull your-registry.com/workplan-app:latest
   docker compose -f infra/docker-compose.yml up -d
   ```

### ข้อดี:
- ✅ เหมาะสำหรับ production
- ✅ รองรับการ deploy หลายเครื่อง
- ✅ มี version control

## 🔄 วิธีที่ 3: ใช้ Volume Mounting (Development)

### ขั้นตอน:
1. **แก้ไข infra/docker-compose.yml:**
   ```yaml
   services:
     frontend:
       volumes:
         - ./frontend:/app
         - /app/node_modules
     
     backend:
       volumes:
         - ./backend:/app
         - /app/node_modules
   ```

2. **รัน Docker:**
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

### ข้อดี:
- ✅ โค้ดอัปเดทอัตโนมัติ
- ✅ เหมาะสำหรับ development
- ✅ ไม่ต้อง rebuild image

## 🔄 วิธีที่ 4: ใช้ rsync หรือ scp

### ขั้นตอน:
1. **Copy ไฟล์ที่แก้ไข:**
   ```bash
   scp frontend/app/api/work-plans/drafts/[id]/route.ts user@docker-machine:/path/to/project/
   ```

2. **Restart Container:**
   ```bash
   docker compose -f infra/docker-compose.yml restart
   ```

### ข้อดี:
- ✅ เร็วสำหรับไฟล์เดียว
- ✅ ไม่ต้องใช้ Git
- ✅ เหมาะสำหรับการแก้ไขเล็กน้อย

## 🛠️ ไฟล์ที่สร้าง

### 1. Script อัตโนมัติ
- `update-docker-deployment.bat` - Script สำหรับอัปเดท Docker

### 2. Docker Compose สำหรับ Development
- `docker-compose-dev.yml` - ไฟล์ docker-compose ที่รองรับ volume mounting

## 📋 การใช้งาน Script

### รัน Script:
```bash
.\u005cupdate-docker-deployment.bat
```

### เลือกวิธี:
1. **Git Pull + Rebuild** - สำหรับการอัปเดทผ่าน Git
2. **Docker Registry Pull** - สำหรับการอัปเดทผ่าน Registry
3. **Volume Mounting** - สำหรับ development
4. **Manual File Copy** - สำหรับไฟล์เดียว

## 🔍 การตรวจสอบ

### 1. ตรวจสอบ Containers:
```bash
docker compose -f infra/docker-compose.yml ps
```

### 2. ตรวจสอบ Logs:
```bash
docker compose -f infra/docker-compose.yml logs frontend
docker compose -f infra/docker-compose.yml logs backend
```

### 3. ตรวจสอบเว็บไซต์:
- Frontend: http://localhost:3011
- Backend: http://localhost:3101

## ⚠️ ข้อควรระวัง

### 1. Database Migration
- ตรวจสอบว่าการเปลี่ยนแปลงไม่กระทบ database schema
- Backup ข้อมูลก่อนอัปเดท

### 2. Environment Variables
- ตรวจสอบ environment variables ใน infra/docker-compose.yml
- ปรับ IP address ให้ตรงกับเครื่อง

### 3. Port Conflicts
- ตรวจสอบว่า ports ไม่ถูกใช้งานโดยโปรแกรมอื่น
- ปรับ ports ใน infra/docker-compose.yml ถ้าจำเป็น

## 🚀 Best Practices

### 1. ใช้ Git สำหรับ Version Control
- Commit บ่อยๆ
- ใช้ meaningful commit messages
- สร้าง branches สำหรับ features ใหม่

### 2. ใช้ Docker Registry สำหรับ Production
- Tag images ด้วย version numbers
- ใช้ multi-stage builds
- Scan images สำหรับ security vulnerabilities

### 3. ใช้ Volume Mounting สำหรับ Development
- Mount source code
- Exclude node_modules และ build files
- ใช้ .dockerignore

### 4. Monitoring และ Logging
- ใช้ health checks
- Monitor resource usage
- Centralize logging
