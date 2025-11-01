# 🚀 Quick Start Guide - Deploy บน Linux Server

## 🔍 หา Username และ Server IP

**Username** = ชื่อ user สำหรับ login (เช่น `root`, `ubuntu`, `admin`)  
**Server IP** = IP address ของ server (เช่น `192.168.0.94`, `54.123.45.67`)

> 📖 **ดูคู่มือเพิ่มเติม:** [HOW_TO_FIND_SSH_DETAILS.md](./HOW_TO_FIND_SSH_DETAILS.md)

### วิธีหา:
- **Username:** ลอง `root`, `ubuntu`, `admin` หรือดูจากผู้ที่ setup server
- **Server IP:** ดูจาก Cloud Provider Dashboard หรือใช้ `ifconfig`/`ipconfig`

### ตัวอย่าง:
```bash
# ตัวอย่าง 1: Local Network
ssh root@192.168.0.94

# ตัวอย่าง 2: AWS EC2
ssh ubuntu@54.123.45.67

# ตัวอย่าง 3: มี SSH Key
ssh -i ~/.ssh/key.pem ubuntu@192.168.0.94
```

## ขั้นตอนที่ 1: Clone Repository

**1. SSH เข้า server:**
```bash
ssh username@server_ip
# เช่น: ssh root@192.168.0.94
```

**2. Clone repository:**

**วิธีที่ 1: ใช้ HTTPS (แนะนำสำหรับเริ่มต้น)**
```bash
git clone https://github.com/iTjitdhana/WorkplanV8Linux.git
```

**วิธีที่ 2: ใช้ SSH (ถ้ามี SSH key setup แล้ว - ไม่ต้องใส่ password)**
```bash
# ทดสอบ SSH connection ก่อน
ssh -T git@github.com
# ควรเห็น: Hi iTjitdhana! You've successfully authenticated...

# Clone ด้วย SSH
git clone git@github.com:iTjitdhana/WorkplanV8Linux.git
```

> 📖 **ดูคู่มือ SSH Key:** [GITHUB_SSH_KEY_GUIDE.md](./GITHUB_SSH_KEY_GUIDE.md)

**3. เข้าไปในโฟลเดอร์:**
```bash
cd WorkplanV8Linux

# ตรวจสอบ version (ถ้าต้องการ)
git checkout v1.0.0
```

## ขั้นตอนที่ 2: Setup Environment Variables

### วิธีที่ 1: ใช้ Setup Script (แนะนำ)

```bash
# ให้สิทธิ์ execute
chmod +x setup-env.sh

# รัน script
./setup-env.sh
```

Script จะช่วยสร้าง `.env` files และถามให้แก้ไข

### วิธีที่ 2: สร้างเอง

#### Backend .env

```bash
cd backend

# Copy จาก template
cp env.example .env

# แก้ไข
nano .env
```

**เนื้อหาที่ต้องแก้ไข:**

```env
NODE_ENV=production
PORT=3101
DB_HOST=your_mysql_host          # เช่น localhost หรือ 192.168.0.94
DB_USER=your_db_user             # เช่น root หรือ jitdhana
DB_PASSWORD=your_db_password     # password ของ database
DB_NAME=your_database_name       # เช่น esp_tracker หรือ MNF_database
DB_PORT=3306

CORS_ORIGIN=http://your_server_ip:3011
FRONTEND_URL=http://your_server_ip:3011
PUBLIC_HOST=your_server_ip_or_domain
```

#### Root .env (สำหรับ docker-compose)

```bash
# กลับไปที่ root directory
cd ..

# สร้างไฟล์
nano .env
```

**เนื้อหา:**

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
DB_PORT=3306

# Frontend API URL
NEXT_PUBLIC_API_URL=http://your_server_ip:3101
BACKEND_URL=http://backend:3101
```

## ขั้นตอนที่ 3: Build และ Run

```bash
# Build Docker images
docker compose build

# Start services
docker compose up -d

# ดู logs (ตรวจสอบว่า services ทำงาน)
docker compose logs -f
```

## ขั้นตอนที่ 4: ตรวจสอบ

### ตรวจสอบ Status

```bash
docker compose ps
```

ควรเห็น:
- `workplan-backend` - running (port 3101)
- `workplan-frontend` - running (port 3011)

### ตรวจสอบ Health

```bash
# Backend health check
curl http://localhost:3101/health

# Frontend
curl http://localhost:3011
```

### เปิดเว็บเบราว์เซอร์

เปิดเว็บเบราว์เซอร์และไปที่:
- Frontend: `http://your_server_ip:3011`
- Backend API: `http://your_server_ip:3101/api`

## คำสั่งที่ใช้งานบ่อย

```bash
# ดู logs
docker compose logs -f

# ดู logs เฉพาะ backend
docker compose logs -f backend

# ดู logs เฉพาะ frontend
docker compose logs -f frontend

# Stop services
docker compose down

# Start services
docker compose up -d

# Restart services
docker compose restart

# Rebuild และ restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

## ⚠️ หมายเหตุสำคัญ

1. **Database**: ต้องมี MySQL server ที่ทำงานอยู่แล้ว
2. **Ports**: ตรวจสอบว่า ports 3101 และ 3011 ไม่ถูกใช้งาน
3. **Firewall**: เปิด ports 3101 และ 3011 ใน firewall (ถ้าต้องการเข้าจากภายนอก)
4. **.env files**: **ห้าม commit** `.env` files เข้า git

## 🔧 แก้ปัญหา

### ถ้า Build ล้มเหลว

```bash
# Clean และ rebuild
docker compose down
docker system prune -f
docker compose build --no-cache
```

### ถ้า Database ไม่เชื่อมต่อ

1. ตรวจสอบว่า MySQL ทำงานอยู่
2. ตรวจสอบ `DB_HOST`, `DB_USER`, `DB_PASSWORD` ใน `.env`
3. ตรวจสอบว่า MySQL อนุญาตการเชื่อมต่อจาก Docker network

### ถ้า Services ไม่เริ่ม

```bash
# ดู logs เพื่อหาข้อผิดพลาด
docker compose logs

# ตรวจสอบว่า ports ไม่ซ้ำ
netstat -tulpn | grep -E '3101|3011'
```

## 📚 เอกสารเพิ่มเติม

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - คู่มือ Deploy แบบละเอียด
- [README_DOCKER.md](./README_DOCKER.md) - คู่มือ Docker

