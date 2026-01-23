# Prompt ชุดที่ 1: สร้าง Docker Compose หลัก + Nginx Reverse Proxy

## วัตถุประสงค์
สร้าง Docker Compose หลัก (`docker-compose.main.yml`) และ Nginx configuration (`nginx.conf`) เพื่อรวมหลายระบบเข้าด้วยกัน โดยใช้ port เดียว (3000) และ route ผ่าน path-based routing

## Phase 1: รวม Portal + Production Planning System

### ข้อมูลระบบ:

#### 1. Portal System
- **URL ที่ต้องการ**: `ipserver:3000/portal`
- **Docker Image**: `portal-frontend:latest` (port 3015 internal)
- **Path**: `/portal`
- **Description**: Portal หลักที่แสดงปุ่มลิงก์ไปยังระบบอื่นๆ

#### 2. Production Planning System
- **URL ที่ต้องการ**: `ipserver:3000/portal/manufacturing/production-planning`
- **Frontend Image**: `production-planning-frontend:latest` (port 3011 internal)
- **Backend Image**: `production-planning-backend:latest` (port 3101 internal)
- **Path**: `/portal/manufacturing/production-planning`
- **Description**: ระบบจัดการแผนการผลิต
- **Database**: MySQL (shared, image: `mysql:8.0`)

### ข้อกำหนด Docker Compose:

1. **Service Names** (ไม่ซ้ำกัน):
   - `nginx` - Reverse proxy
   - `portal-frontend` - Portal frontend
   - `production-planning-frontend` - Production Planning frontend
   - `production-planning-backend` - Production Planning backend
   - `mysql` - Shared MySQL database

2. **Port Mapping**:
   - **Nginx เท่านั้น**: `3000:80` (port เดียวที่ expose)
   - **Services อื่นๆ**: ไม่ expose port (internal only)

3. **Images** (ใช้ images ที่ build แล้ว):
   ```yaml
   portal-frontend:
     image: portal-frontend:latest  # ← ใช้ image
   
   production-planning-frontend:
     image: production-planning-frontend:latest  # ← ใช้ image
   
   production-planning-backend:
     image: production-planning-backend:latest  # ← ใช้ image
   ```

4. **Network**:
   - ทุก service อยู่ใน network เดียวกัน: `portal-network`
   - Driver: `bridge`

5. **Environment Variables**:
   - Production Planning Frontend:
     - `NODE_ENV=production`
     - `NEXT_PUBLIC_API_URL=http://production-planning-backend:3101`
   - Production Planning Backend:
     - `NODE_ENV=production`
     - `DB_HOST=mysql`
     - `DB_USER`, `DB_PASSWORD`, `DB_NAME` (จาก .env file)
   - MySQL:
     - `MYSQL_ROOT_PASSWORD` (จาก .env file)
     - `MYSQL_DATABASE` (จาก .env file)

6. **Dependencies**:
   - Nginx depends_on: portal-frontend, production-planning-frontend
   - Production Planning Frontend depends_on: production-planning-backend
   - Production Planning Backend depends_on: mysql

7. **Volumes**:
   - MySQL data: `mysql_data` (persistent)
   - Nginx config: `./nginx.conf:/etc/nginx/nginx.conf`

### ข้อกำหนด Nginx Configuration:

1. **Routing Rules**:
   ```nginx
   # Portal
   location /portal {
       proxy_pass http://portal-frontend:3015/;
       # ถ้า Portal ต้องการ path /portal ให้ใช้ rewrite
   }

   # Production Planning
   location /portal/manufacturing/production-planning {
       proxy_pass http://production-planning-frontend:3011/;
       rewrite ^/portal/manufacturing/production-planning/(.*) /$1 break;
   }
   ```

2. **Proxy Settings** (ต้องมี):
   - `proxy_http_version 1.1`
   - `proxy_set_header Host $host`
   - `proxy_set_header X-Real-IP $remote_addr`
   - `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`
   - `proxy_set_header X-Forwarded-Proto $scheme`
   - `proxy_set_header Upgrade $http_upgrade` (สำหรับ WebSocket)
   - `proxy_set_header Connection 'upgrade'`
   - `proxy_cache_bypass $http_upgrade`

3. **Performance**:
   - Gzip compression
   - Static file caching (js, css, images)
   - Keep-alive connections

4. **Health Check**:
   - `/health` endpoint สำหรับ backend services

5. **Error Handling**:
   - Error pages สำหรับ 404, 500, 502, 503, 504

### ข้อกำหนดเพิ่มเติม:

1. **รองรับการเพิ่มระบบในอนาคต**:
   - โครงสร้างต้องง่ายต่อการเพิ่ม location block ใหม่
   - Service naming convention ที่ชัดเจน
   - Comments ในไฟล์เพื่ออธิบายแต่ละส่วน

2. **Best Practices**:
   - ใช้ environment variables จาก .env file
   - Health checks สำหรับทุก service
   - Logging configuration
   - Security headers

### Output ที่ต้องการ:

1. **docker-compose.main.yml**:
   - รวม Portal + Production Planning
   - Nginx service (port 3000)
   - MySQL service (shared)
   - Network configuration
   - Volume configuration
   - Environment variables
   - Dependencies
   - Health checks

2. **nginx.conf**:
   - Reverse proxy configuration
   - Routing rules สำหรับ:
     - `/portal` → Portal
     - `/portal/manufacturing/production-planning` → Production Planning
   - Proxy settings
   - Caching configuration
   - Error handling
   - Performance optimizations

3. **.env.example**:
   - ตัวอย่าง environment variables
   - Database credentials
   - Port configurations

4. **README.md** (สั้นๆ):
   - วิธีใช้งาน
   - วิธีเพิ่มระบบใหม่
   - Troubleshooting

### ตัวอย่างโครงสร้างที่ต้องการ:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "3000:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - portal-frontend
      - production-planning-frontend
    networks:
      - portal-network

  portal-frontend:
    image: portal-frontend:latest
    environment:
      - NODE_ENV=production
    networks:
      - portal-network

  production-planning-frontend:
    image: production-planning-frontend:latest
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://production-planning-backend:3101
    depends_on:
      - production-planning-backend
    networks:
      - portal-network

  production-planning-backend:
    image: production-planning-backend:latest
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    depends_on:
      - mysql
    networks:
      - portal-network

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${MYSQL_DATABASE}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - portal-network

networks:
  portal-network:
    driver: bridge

volumes:
  mysql_data:
```

### Checklist:

- [ ] Docker Compose รวม Portal + Production Planning
- [ ] ใช้ Docker Images (ไม่ build จาก source)
- [ ] Nginx reverse proxy configuration
- [ ] Service names ไม่ซ้ำกัน
- [ ] Port mapping ถูกต้อง (Nginx เท่านั้นที่ expose)
- [ ] Network configuration
- [ ] Environment variables จาก .env
- [ ] Health checks
- [ ] Dependencies ถูกต้อง
- [ ] รองรับการเพิ่มระบบใหม่ในอนาคต
- [ ] Documentation

### หมายเหตุ:

- Phase 1 นี้รวมแค่ Portal + Production Planning ก่อน
- ระบบอื่นๆ จะเพิ่มใน Phase ถัดไป
- โครงสร้างต้องรองรับการ scale และเพิ่มระบบใหม่ได้ง่าย
- ใช้ best practices สำหรับ Docker และ Nginx

---

## คำแนะนำสำหรับ AI:

1. สร้าง `docker-compose.main.yml` ที่รวม Portal และ Production Planning โดยใช้ Docker Images
2. สร้าง `nginx.conf` ที่ route `/portal` และ `/portal/manufacturing/production-planning`
3. ตั้งชื่อ service ให้ชัดเจนและไม่ซ้ำกัน
4. ใช้ internal ports เท่านั้น (ไม่ expose port ยกเว้น Nginx)
5. ตั้งค่า network ให้ทุก service อยู่ใน network เดียวกัน
6. เพิ่ม comments ในไฟล์เพื่ออธิบายแต่ละส่วน
7. สร้าง `.env.example` สำหรับ environment variables
8. สร้าง `README.md` สั้นๆ ว่าวิธีใช้งานและวิธีเพิ่มระบบใหม่
