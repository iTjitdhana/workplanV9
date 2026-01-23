# Prompt ชุดที่ 2: Build Docker Images สำหรับแต่ละระบบ

## วัตถุประสงค์
สร้าง Docker Images สำหรับแต่ละระบบ เพื่อใช้ใน Production โดย images เหล่านี้จะถูกใช้ใน docker-compose.main.yml

## ข้อมูลทั่วไป:

### แต่ละระบบต้อง Build 2 Images:
1. **Frontend Image** - สำหรับ Next.js/React frontend
2. **Backend Image** - สำหรับ Node.js backend (ถ้ามี)

### Images ที่ต้อง Build:

#### 1. Portal System
- **Frontend Image**: `portal-frontend:latest`
- **Backend Image**: (ถ้ามี) `portal-backend:latest`
- **Port**: Frontend ใช้ port 3015 (internal)

#### 2. Production Planning System
- **Frontend Image**: `production-planning-frontend:latest`
- **Backend Image**: `production-planning-backend:latest`
- **Port**: Frontend ใช้ port 3011 (internal), Backend ใช้ port 3101 (internal)

## ข้อกำหนด Dockerfile:

### Frontend Dockerfile (Next.js):

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3011  # หรือ port ที่ระบบใช้

CMD ["node", "server.js"]
```

### Backend Dockerfile (Node.js):

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 3101  # หรือ port ที่ระบบใช้

CMD ["node", "server.js"]
```

## ขั้นตอนการ Build:

### สำหรับแต่ละระบบ:

#### Step 1: Build Frontend Image
```bash
cd /path/to/system/frontend
docker build -t system-name-frontend:latest -f Dockerfile .
```

#### Step 2: Build Backend Image (ถ้ามี)
```bash
cd /path/to/system/backend
docker build -t system-name-backend:latest -f Dockerfile .
```

#### Step 3: Tag Images (สำหรับ Registry - ถ้ามี)
```bash
docker tag system-name-frontend:latest registry.company.com/system-name-frontend:v1.0.0
docker tag system-name-backend:latest registry.company.com/system-name-backend:v1.0.0
```

#### Step 4: Push to Registry (ถ้ามี)
```bash
docker push registry.company.com/system-name-frontend:v1.0.0
docker push registry.company.com/system-name-backend:v1.0.0
```

#### Step 5: Save Images (ถ้าไม่มี Registry)
```bash
docker save system-name-frontend:latest > system-name-frontend.tar
docker save system-name-backend:latest > system-name-backend.tar
```

## ข้อกำหนดสำหรับแต่ละระบบ:

### 1. Portal System

**Frontend:**
- **Image Name**: `portal-frontend:latest`
- **Port**: 3015 (internal)
- **Build Context**: `/path/to/portal/frontend`
- **Dockerfile**: `frontend/Dockerfile`
- **Environment**: `NODE_ENV=production`

**Backend** (ถ้ามี):
- **Image Name**: `portal-backend:latest`
- **Port**: 3105 (internal)
- **Build Context**: `/path/to/portal/backend`
- **Dockerfile**: `backend/Dockerfile`

### 2. Production Planning System

**Frontend:**
- **Image Name**: `production-planning-frontend:latest`
- **Port**: 3011 (internal)
- **Build Context**: `/path/to/production-planning/frontend`
- **Dockerfile**: `frontend/Dockerfile`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_API_URL=http://production-planning-backend:3101`
- **Base Path**: `/portal/manufacturing/production-planning` (ต้องตั้งค่าใน next.config.mjs)

**Backend:**
- **Image Name**: `production-planning-backend:latest`
- **Port**: 3101 (internal)
- **Build Context**: `/path/to/production-planning/backend`
- **Dockerfile**: `backend/Dockerfile`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `DB_HOST=mysql` (จะใช้ใน docker-compose)
  - `DB_USER`, `DB_PASSWORD`, `DB_NAME` (จะใช้ใน docker-compose)

## ข้อกำหนดเพิ่มเติม:

### 1. Next.js Base Path Configuration:

สำหรับ Production Planning Frontend ต้องตั้งค่า basePath:

```js
// next.config.mjs
const nextConfig = {
  basePath: '/portal/manufacturing/production-planning',
  // ... config อื่นๆ
};
```

### 2. Environment Variables:

- **Build Time**: ใช้สำหรับ build process
- **Runtime**: ใช้สำหรับรัน application (ตั้งค่าใน docker-compose)

### 3. Multi-stage Build:

- ใช้ multi-stage build เพื่อลดขนาด image
- Stage 1: Install dependencies
- Stage 2: Build application
- Stage 3: Production image (เฉพาะไฟล์ที่จำเป็น)

### 4. Image Optimization:

- ใช้ `.dockerignore` เพื่อไม่ copy ไฟล์ที่ไม่จำเป็น
- ใช้ Alpine Linux เพื่อลดขนาด image
- ลบ cache และ temporary files หลัง build

## Output ที่ต้องการ:

### สำหรับแต่ละระบบ:

1. **Dockerfile** (Frontend):
   - Multi-stage build
   - Optimized สำหรับ production
   - รองรับ Next.js basePath

2. **Dockerfile** (Backend):
   - Production-ready
   - Security best practices

3. **.dockerignore**:
   - Exclude node_modules, .git, etc.

4. **Build Script** (optional):
   ```bash
   # build-images.sh
   docker build -t system-name-frontend:latest ./frontend
   docker build -t system-name-backend:latest ./backend
   ```

5. **Documentation**:
   - วิธี build images
   - วิธี tag และ push images
   - วิธี save/load images

## Checklist สำหรับแต่ละระบบ:

- [ ] Dockerfile สำหรับ Frontend
- [ ] Dockerfile สำหรับ Backend (ถ้ามี)
- [ ] .dockerignore file
- [ ] Build images สำเร็จ
- [ ] Test images (docker run)
- [ ] Tag images (ถ้ามี registry)
- [ ] Push/Save images
- [ ] Documentation

## ตัวอย่าง Build Commands:

### Portal System:
```bash
# Frontend
cd /path/to/portal/frontend
docker build -t portal-frontend:latest .

# Backend (ถ้ามี)
cd /path/to/portal/backend
docker build -t portal-backend:latest .
```

### Production Planning System:
```bash
# Frontend
cd /path/to/production-planning/frontend
docker build -t production-planning-frontend:latest .

# Backend
cd /path/to/production-planning/backend
docker build -t production-planning-backend:latest .
```

## หมายเหตุ:

- Images ที่ build แล้วจะถูกใช้ใน docker-compose.main.yml
- ต้อง build images ก่อนสร้าง docker-compose.main.yml
- Images ควรมี tag version (เช่น v1.0.0) สำหรับ production
- ควรมี build script เพื่อความสะดวก

---

## รูปแบบการตอบที่ต้องการ:

### สรุปผลลัพธ์ (ให้แสดงตอนเริ่มต้น):

```
Images ที่จะถูกสร้าง:
- portal-frontend:latest (port 3015)
- portal-backend:latest (port 3105)
- production-planning-frontend:latest (port 3011)
- production-planning-backend:latest (port 3101)

ข้อกำหนดที่ทำครบ:
- Multi-stage build สำหรับ Frontend images
- Production-only dependencies สำหรับ Backend images
- Base path configuration สำหรับ Production Planning Frontend
- .dockerignore files เพื่อลดขนาด image
- Build scripts สำหรับความสะดวก
- Documentation ครบถ้วน
```

### จากนั้นแสดงรายละเอียด:
1. Dockerfile สำหรับแต่ละ image
2. .dockerignore files
3. Build scripts
4. Documentation

---

## คำแนะนำสำหรับ AI:

1. **เริ่มต้นด้วยสรุปผลลัพธ์** - แสดง Images ที่จะถูกสร้างและข้อกำหนดที่ทำครบ
2. สร้าง Dockerfile ที่เหมาะสมสำหรับแต่ละระบบ (Frontend และ Backend)
3. ใช้ multi-stage build เพื่อลดขนาด image
4. ตั้งค่า environment variables ที่จำเป็น
5. สร้าง .dockerignore เพื่อไม่ copy ไฟล์ที่ไม่จำเป็น
6. สำหรับ Next.js: ตั้งค่า basePath ใน next.config.mjs
7. สร้าง build script เพื่อความสะดวก
8. สร้าง documentation วิธี build และ deploy images
9. **ระบุ port ที่ถูกต้องสำหรับแต่ละ image** (3015, 3105, 3011, 3101)
