# Docker Deployment Guide

## ระบบ Requirements

- Docker Engine >= 20.10
- Docker Compose V2 (ใช้คำสั่ง `docker compose` ไม่ใช่ `docker-compose`)
- Node.js 18+ (สำหรับ Build บน Linux)

## Services

ระบบนี้ประกอบด้วย 2 services:
- **backend**: Node.js/Express API (Port 3101)
- **frontend**: Next.js 15 (Port 3011)

**หมายเหตุ**: MySQL และ Nginx ไม่ได้รวมอยู่ใน Docker compose (ใช้ external services)

## การ Build และ Deploy

### 1. Build Images

```bash
# Build ทั้ง Backend และ Frontend
docker compose build

# หรือ Build แยก
docker compose build backend
docker compose build frontend
```

### 2. เริ่ม Services

```bash
# Start services
docker compose up -d

# ดู logs
docker compose logs -f

# ดู logs เฉพาะ service
docker compose logs -f backend
docker compose logs -f frontend
```

### 3. ตรวจสอบ Status

```bash
# ดู status
docker compose ps

# ตรวจสอบ health
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### 4. Stop Services

```bash
# Stop services
docker compose down

# Stop และลบ volumes (ถ้ามี)
docker compose down -v
```

## Environment Variables

### Backend (.env ใน backend/)

```env
NODE_ENV=production
PORT=3101
DB_HOST=<your-mysql-host>
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_NAME=<your-db-name>
DB_PORT=3306
CORS_ORIGIN=http://localhost:3011
```

### Frontend (Environment variables ใน docker-compose.yml)

```env
NEXT_PUBLIC_API_URL=http://<your-backend-host>:3101
BACKEND_URL=http://backend:3101
```

## การแก้ปัญหา

### ถ้า Build ล้มเหลว

```bash
# Build แบบไม่ใช้ cache
docker compose build --no-cache

# Build backend ใหม่
docker compose build --no-cache backend
docker compose build --no-cache frontend
```

### ตรวจสอบ Logs

```bash
# ดู logs แบบ real-time
docker compose logs -f

# ดู logs เฉพาะ error
docker compose logs | grep -i error
```

### ตรวจสอบ Health

```bash
# ตรวจสอบ backend health
curl http://localhost:3101/health

# ตรวจสอบ frontend
curl http://localhost:3011
```

## Production Deployment บน Linux

1. Copy `.env` files ไปยัง server
2. Build images: `docker compose build`
3. Start services: `docker compose up -d`
4. ตรวจสอบ: `docker compose ps`

## Ports

- Backend: `3101`
- Frontend: `3011`

## Network

Services เชื่อมต่อกันผ่าน network: `workplan-network`

