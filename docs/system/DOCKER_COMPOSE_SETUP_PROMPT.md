# Prompt สำหรับสร้าง Docker Compose หลัก + Nginx Reverse Proxy

> **หมายเหตุ**: Prompt นี้ถูกแยกเป็น 2 ชุดแล้ว:
> - **Prompt ชุดที่ 1**: `PROMPT_1_DOCKER_COMPOSE_NGINX.md` - สำหรับสร้าง docker-compose.main.yml + nginx.conf
> - **Prompt ชุดที่ 2**: `PROMPT_2_BUILD_DOCKER_IMAGES.md` - สำหรับ build Docker images ของแต่ละระบบ
>
> กรุณาใช้ Prompt ชุดที่ 1 และ 2 แทนไฟล์นี้

---

## วัตถุประสงค์
สร้าง Docker Compose หลักและ Nginx configuration เพื่อรวมหลายระบบเข้าด้วยกัน โดยใช้ port เดียว (3000) และ route ผ่าน path-based routing

## Phase 1: รวม Portal + Production Planning System

### ข้อมูลระบบปัจจุบัน:

#### 1. Portal System (Port 3015 เดิม)
- **URL ที่ต้องการ**: `ipserver:3000/portal`
- **Frontend Port**: 3015 (internal)
- **Backend Port**: (ถ้ามี)
- **Path**: `/portal`
- **Description**: Portal หลักที่แสดงปุ่มลิงก์ไปยังระบบอื่นๆ

#### 2. Production Planning System (Port 3012 เดิม)
- **URL ที่ต้องการ**: `ipserver:3000/portal/manufacturing/production-planning`
- **Frontend Port**: 3011 (internal container port)
- **Backend Port**: 3101 (internal container port)
- **Path**: `/portal/manufacturing/production-planning`
- **Description**: ระบบจัดการแผนการผลิต
- **Database**: MySQL (shared)
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL=http://production-planning-backend:3101`
  - `DB_HOST=mysql`
  - `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### ข้อมูลโครงสร้างโปรเจกต์:
```
project-root/
├── portal/
│   ├── frontend/
│   │   └── Dockerfile
│   └── backend/ (ถ้ามี)
│       └── Dockerfile
│
├── manufacturing/
│   └── production-planning/
│       ├── frontend/
│       │   ├── Dockerfile
│       │   └── next.config.mjs
│       └── backend/
│           ├── Dockerfile
│           └── .env.example
│
└── docker-compose.main.yml (ไฟล์ที่จะสร้าง)
```

### ข้อกำหนด:

#### Docker Compose Requirements:
1. **Service Names**: ตั้งชื่อให้ไม่ซ้ำกัน
   - `portal-frontend`, `portal-backend` (ถ้ามี)
   - `production-planning-frontend`, `production-planning-backend`
   - `nginx` (reverse proxy)
   - `mysql` (shared database)

2. **Port Mapping**:
   - Nginx: `3000:80` (port เดียวที่ expose)
   - Services อื่นๆ: **ไม่ expose port** (internal only)

3. **Network**:
   - ทุก service ต้องอยู่ใน network เดียวกัน (`portal-network`)
   - ใช้ bridge driver

4. **Dependencies**:
   - Nginx depends_on: portal-frontend, production-planning-frontend
   - Production Planning depends_on: mysql, production-planning-backend

5. **Environment Variables**:
   - ใช้ `.env` file สำหรับ sensitive data
   - Database credentials: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

6. **Volumes** (ถ้าจำเป็น):
   - MySQL data persistence
   - Nginx config

#### Nginx Configuration Requirements:

1. **Routing Rules**:
   ```nginx
   # Portal
   location /portal {
       proxy_pass http://portal-frontend:3015/;
       # rewrite ถ้าจำเป็น
   }

   # Production Planning
   location /portal/manufacturing/production-planning {
       proxy_pass http://production-planning-frontend:3011/;
       rewrite ^/portal/manufacturing/production-planning/(.*) /$1 break;
   }
   ```

2. **Proxy Settings**:
   - `proxy_http_version 1.1`
   - `proxy_set_header` สำหรับ Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto
   - `proxy_set_header Upgrade $http_upgrade` (สำหรับ WebSocket)
   - `proxy_set_header Connection 'upgrade'`

3. **Health Checks**:
   - `/health` endpoint สำหรับ backend

4. **Static Files**:
   - Cache static assets (js, css, images)
   - `expires 1y` สำหรับ static files

5. **Error Handling**:
   - Error pages สำหรับ 404, 500, 502, 503, 504

#### Next.js Configuration (สำหรับ Production Planning):

1. **Base Path**:
   ```js
   // next.config.mjs
   basePath: '/portal/manufacturing/production-planning'
   ```

2. **API Routes**:
   - Frontend API routes ต้องรองรับ basePath
   - Backend API calls ต้องใช้ internal service name

### ข้อกำหนดเพิ่มเติม:

1. **รองรับการเพิ่มระบบในอนาคต**:
   - โครงสร้างต้องง่ายต่อการเพิ่มระบบใหม่
   - Service naming convention ที่ชัดเจน
   - Nginx config ที่ง่ายต่อการเพิ่ม location block

2. **Health Checks**:
   - ทุก service ควรมี healthcheck
   - Nginx ควรมี health check endpoint

3. **Logging**:
   - Access logs และ error logs
   - Log rotation

4. **Performance**:
   - Gzip compression
   - Static file caching
   - Keep-alive connections

### Output ที่ต้องการ:

1. **docker-compose.main.yml**:
   - รวม Portal + Production Planning
   - Nginx service
   - MySQL service (shared)
   - Network configuration
   - Volume configuration

2. **nginx.conf**:
   - Reverse proxy configuration
   - Routing rules สำหรับ Portal และ Production Planning
   - Proxy settings
   - Caching configuration
   - Error handling

3. **next.config.mjs** (สำหรับ Production Planning):
   - Base path configuration
   - API rewrites (ถ้าจำเป็น)

4. **README.md** (ถ้าจำเป็น):
   - คำแนะนำการใช้งาน
   - วิธีเพิ่มระบบใหม่
   - Troubleshooting

### ตัวอย่างโครงสร้างที่ต้องการ:

```yaml
version: '3.8'

services:
  nginx:
    # Reverse proxy configuration
    ports: ["3000:80"]
    # ...

  portal-frontend:
    # Portal frontend
    # ไม่ expose port

  production-planning-frontend:
    # Production Planning frontend
    # ไม่ expose port
    environment:
      - NEXT_PUBLIC_API_URL=http://production-planning-backend:3101
      - basePath=/portal/manufacturing/production-planning

  production-planning-backend:
    # Production Planning backend
    # ไม่ expose port
    environment:
      - DB_HOST=mysql
      # ...

  mysql:
    # Shared MySQL database
    # ไม่ expose port

networks:
  portal-network:
    driver: bridge

volumes:
  mysql_data:
```

### Checklist:

- [ ] Docker Compose รวม Portal + Production Planning
- [ ] Nginx reverse proxy configuration
- [ ] Service names ไม่ซ้ำกัน
- [ ] Port mapping ถูกต้อง (Nginx เท่านั้นที่ expose)
- [ ] Network configuration
- [ ] Environment variables
- [ ] Health checks
- [ ] Next.js basePath configuration
- [ ] รองรับการเพิ่มระบบใหม่ในอนาคต
- [ ] Documentation

### หมายเหตุ:

- Phase 1 นี้รวมแค่ Portal + Production Planning ก่อน
- ระบบอื่นๆ จะเพิ่มใน Phase ถัดไป
- โครงสร้างต้องรองรับการ scale และเพิ่มระบบใหม่ได้ง่าย
- ใช้ best practices สำหรับ Docker และ Nginx

---

## คำแนะนำสำหรับ AI:

1. สร้าง docker-compose.main.yml ที่รวม Portal และ Production Planning
2. สร้าง nginx.conf ที่ route `/portal` และ `/portal/manufacturing/production-planning`
3. แก้ไข next.config.mjs ของ Production Planning ให้รองรับ basePath
4. ตั้งชื่อ service ให้ชัดเจนและไม่ซ้ำกัน
5. ใช้ internal ports เท่านั้น (ไม่ expose port)
6. ตั้งค่า network ให้ทุก service อยู่ใน network เดียวกัน
7. เพิ่ม comments ในไฟล์เพื่ออธิบายแต่ละส่วน
8. สร้าง documentation สั้นๆ ว่าวิธีเพิ่มระบบใหม่ทำอย่างไร
