# Prompt หลัก: รวมระบบหลายระบบเข้าด้วยกันด้วย Docker Compose + Nginx

## วัตถุประสงค์หลัก
รวมระบบหลายระบบ (8 ระบบ) ที่ทำงานแยกกันบน port ต่างๆ ให้เข้าถึงได้ผ่าน port เดียว (3000) โดยใช้ Nginx Reverse Proxy และ Docker Compose

## สถานการณ์ปัจจุบัน
- มี 8 ระบบทำงานแยกกัน แต่ละระบบมี Docker Compose แยกกัน
- ผู้ใช้เข้าผ่าน `ipserver:PORT` (เช่น ipserver:3012, ipserver:3015)
- มี Portal System ที่เป็น webapp แสดงปุ่มลิงก์ไปยังระบบอื่นๆ
- ทุกระบบใช้ Database MySQL เดียวกัน
- ปัญหา: Too many connections, browser connection limit

## สิ่งที่ต้องการ
- **URL แบบใหม่**: `ipserver:3000/portal/manufacturing/production-planning`
- **Port เดียว**: 3000 (Nginx เท่านั้นที่ expose)
- **Path-based routing**: แต่ละระบบมี path ของตัวเอง
- **Phase 1**: รวม Portal + Production Planning ก่อน
- **Phase ถัดไป**: เพิ่มระบบอื่นๆ ทีละระบบ

---

## ขั้นตอนการทำงาน (2 ขั้นตอน)

### ⚠️ สำคัญ: ต้องทำตามลำดับ!

### Step 1: Build Docker Images (ใช้ Prompt ชุดที่ 2)
**ก่อนอื่นต้อง build Docker Images ของแต่ละระบบก่อน**

📄 **ใช้ไฟล์**: `PROMPT_2_BUILD_DOCKER_IMAGES.md`

**สิ่งที่ต้องทำ**:
1. สร้าง Dockerfile สำหรับ Frontend และ Backend ของแต่ละระบบ
2. Build images:
   - `portal-frontend:latest` (port 3015)
   - `portal-backend:latest` (port 3105)
   - `production-planning-frontend:latest` (port 3011)
   - `production-planning-backend:latest` (port 3101)
3. สร้าง .dockerignore files
4. สร้าง build scripts
5. สร้าง documentation

**Output ที่ต้องการ**:
- Dockerfile สำหรับแต่ละ image
- .dockerignore files
- Build scripts
- Documentation

**รูปแบบการตอบ**:
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

---

### Step 2: สร้าง Docker Compose + Nginx (ใช้ Prompt ชุดที่ 1)
**หลังจาก build images เสร็จแล้ว ถึงจะสร้าง Docker Compose**

📄 **ใช้ไฟล์**: `PROMPT_1_DOCKER_COMPOSE_NGINX.md`

**สิ่งที่ต้องทำ**:
1. สร้าง `docker-compose.main.yml` ที่รวม Portal + Production Planning
2. สร้าง `nginx.conf` สำหรับ reverse proxy และ routing
3. ตั้งค่า environment variables (.env.example)
4. สร้าง README.md

**ข้อกำหนดสำคัญ**:
- ใช้ Docker Images ที่ build แล้ว (ไม่ build จาก source)
- Nginx เท่านั้นที่ expose port 3000
- Services อื่นๆ ใช้ internal ports เท่านั้น
- ทุก service อยู่ใน network เดียวกัน
- รองรับการเพิ่มระบบใหม่ในอนาคต

**Output ที่ต้องการ**:
- `docker-compose.main.yml`
- `nginx.conf`
- `.env.example`
- `README.md`

---

## Phase 1: Portal + Production Planning

### ข้อมูลระบบ:

#### 1. Portal System
- **URL เดิม**: `ipserver:3015`
- **URL ใหม่**: `ipserver:3000/portal`
- **Docker Image**: `portal-frontend:latest` (port 3015 internal)
- **Backend Image**: `portal-backend:latest` (port 3105 internal) - ถ้ามี

#### 2. Production Planning System
- **URL เดิม**: `ipserver:3012`
- **URL ใหม่**: `ipserver:3000/portal/manufacturing/production-planning`
- **Frontend Image**: `production-planning-frontend:latest` (port 3011 internal)
- **Backend Image**: `production-planning-backend:latest` (port 3101 internal)
- **Database**: MySQL (shared)

---

## สรุปสิ่งที่ต้องทำ

### ✅ Step 1: Build Images (ทำก่อน)
1. อ่าน `PROMPT_2_BUILD_DOCKER_IMAGES.md`
2. สร้าง Dockerfile สำหรับแต่ละระบบ
3. Build images ทั้งหมด
4. ทดสอบ images

### ✅ Step 2: สร้าง Docker Compose + Nginx (ทำหลัง)
1. อ่าน `PROMPT_1_DOCKER_COMPOSE_NGINX.md`
2. สร้าง `docker-compose.main.yml`
3. สร้าง `nginx.conf`
4. ตั้งค่า environment variables
5. Deploy และทดสอบ

---

## คำแนะนำสำหรับ AI

### เมื่อผู้ใช้ส่ง Prompt นี้มา:

1. **ถามผู้ใช้ก่อน**: "ตอนนี้อยู่ขั้นตอนไหน?"
   - ถ้ายังไม่ได้ build images → ใช้ Prompt ชุดที่ 2 ก่อน
   - ถ้า build images เสร็จแล้ว → ใช้ Prompt ชุดที่ 1

2. **ถ้าผู้ใช้บอกว่า "เริ่มต้น" หรือ "ทำทั้งหมด"**:
   - เริ่มจาก Step 1 (Build Images) ก่อน
   - หลังจาก Step 1 เสร็จ → ทำ Step 2 (Docker Compose + Nginx)

3. **ถ้าผู้ใช้บอกว่า "ทำ Step 1" หรือ "Build Images"**:
   - อ่าน `PROMPT_2_BUILD_DOCKER_IMAGES.md`
   - สร้าง Dockerfile, .dockerignore, build scripts
   - แสดงสรุปผลลัพธ์ตามรูปแบบที่กำหนด

4. **ถ้าผู้ใช้บอกว่า "ทำ Step 2" หรือ "สร้าง Docker Compose"**:
   - อ่าน `PROMPT_1_DOCKER_COMPOSE_NGINX.md`
   - สร้าง docker-compose.main.yml และ nginx.conf
   - ใช้ images ที่ build แล้ว (ไม่ build จาก source)

---

## Checklist ทั้งหมด

### Step 1: Build Images
- [ ] Dockerfile สำหรับ portal-frontend
- [ ] Dockerfile สำหรับ portal-backend (ถ้ามี)
- [ ] Dockerfile สำหรับ production-planning-frontend
- [ ] Dockerfile สำหรับ production-planning-backend
- [ ] .dockerignore files
- [ ] Build scripts
- [ ] Documentation
- [ ] Build images สำเร็จ
- [ ] ทดสอบ images

### Step 2: Docker Compose + Nginx
- [ ] docker-compose.main.yml
- [ ] nginx.conf
- [ ] .env.example
- [ ] README.md
- [ ] ทดสอบ routing
- [ ] ทดสอบการเข้าถึงระบบ

---

## หมายเหตุสำคัญ

1. **ลำดับสำคัญ**: ต้อง build images ก่อน (Step 1) แล้วค่อยสร้าง Docker Compose (Step 2)
2. **Images**: ใช้ images ที่ build แล้ว ไม่ build จาก source ใน docker-compose
3. **Port**: Nginx เท่านั้นที่ expose port 3000, services อื่นๆ ใช้ internal ports
4. **Network**: ทุก service อยู่ใน network เดียวกัน
5. **Database**: MySQL เป็น shared service สำหรับทุกระบบ
6. **Base Path**: Production Planning Frontend ต้องตั้งค่า basePath ใน next.config.mjs
7. **Future**: โครงสร้างต้องรองรับการเพิ่มระบบใหม่ได้ง่าย

---

## ไฟล์ที่เกี่ยวข้อง

- `PROMPT_1_DOCKER_COMPOSE_NGINX.md` - สำหรับสร้าง Docker Compose + Nginx
- `PROMPT_2_BUILD_DOCKER_IMAGES.md` - สำหรับ build Docker Images

---

## ตัวอย่างการใช้งาน

### สถานการณ์ที่ 1: เริ่มต้นใหม่
```
ผู้ใช้: "ใช้ Prompt นี้สร้างระบบให้ฉัน"
AI: "เริ่มจาก Step 1: Build Images ก่อน..."
→ ใช้ Prompt ชุดที่ 2
→ หลังจากเสร็จ → ทำ Step 2
```

### สถานการณ์ที่ 2: Build Images เสร็จแล้ว
```
ผู้ใช้: "ฉัน build images เสร็จแล้ว ต้องการสร้าง Docker Compose"
AI: "ทำ Step 2: สร้าง Docker Compose + Nginx..."
→ ใช้ Prompt ชุดที่ 1
```

### สถานการณ์ที่ 3: ไม่แน่ใจ
```
ผู้ใช้: "ฉันต้องการรวมระบบเข้าด้วยกัน"
AI: "ตอนนี้อยู่ขั้นตอนไหน? Build images แล้วหรือยัง?"
→ ถามเพื่อให้แน่ใจว่าทำขั้นตอนไหนก่อน
```
