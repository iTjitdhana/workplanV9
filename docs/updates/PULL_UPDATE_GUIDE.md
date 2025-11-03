# 🚀 คู่มือการ Pull และ Update Docker Image

## 📋 **ภาพรวม**
คู่มือการ pull และ update Docker image ในอีกเครื่องหลังจากมีการแก้ไขโค้ด

## 🔄 **ขั้นตอนการทำงาน**

### **1. เครื่องพัฒนา (เครื่องคุณ):**
```bash
# Build และ Push
.\build-and-push.bat
# ใส่ Username: itjitdhana
# ใส่ Image Name: workplnav6.2
# เลือก Registry: 1 (Docker Hub)
```

### **2. เครื่องที่รัน Docker (อีกเครื่อง):**
```bash
# Pull และ Update
.\pull-and-update.bat
```

## 🛠️ **ไฟล์ที่ใช้**

### **1. เครื่องพัฒนา:**
- `build-and-push.bat` - Build และ Push image
- `Dockerfile` - ไฟล์สำหรับ build image

### **2. เครื่องที่รัน Docker:**
- `pull-and-update.bat` - Pull และ Update อัตโนมัติ
- `update-remote-docker.bat` - อัปเดทอัตโนมัติ
- `update-docker-deployment.bat` - อัปเดทแบบเลือกวิธี
- `docker-compose.yml` - ไฟล์ config Docker

## ⚡ **วิธีเร็วที่สุด**

### **1. เครื่องพัฒนา:**
```bash
.\build-and-push.bat
```

### **2. เครื่องที่รัน Docker:**
```bash
.\pull-and-update.bat
```

## 🔍 **การตรวจสอบ**

### **1. ตรวจสอบ Image:**
```bash
# ดู images ที่มี
docker images itjitdhana/workplnav6.2

# ดู details ของ image
docker inspect itjitdhana/workplnav6.2:latest
```

### **2. ตรวจสอบ Containers:**
```bash
# ดูสถานะ containers
docker-compose ps

# ดู logs
docker-compose logs

# ดู logs เฉพาะ service
docker-compose logs frontend
docker-compose logs backend
```

### **3. ตรวจสอบเว็บไซต์:**
```
http://localhost:3011
```

## ⚠️ **ข้อควรระวัง**

### **1. Network:**
- ต้องมี internet connection
- ต้องสามารถเข้าถึง Docker Hub ได้

### **2. Authentication:**
- ไม่ต้อง login สำหรับ pull (public repository)
- ต้อง login สำหรับ push (ในเครื่องพัฒนา)

### **3. Permissions:**
- ต้องมีสิทธิ์ pull จาก repository
- ต้องมีสิทธิ์ push ไปยัง repository (ในเครื่องพัฒนา)

## 🚨 **Troubleshooting**

### **1. Pull Failed:**
```bash
# ตรวจสอบ image name
docker search itjitdhana/workplnav6.2

# ตรวจสอบ network
ping docker.io

# ตรวจสอบ authentication
docker login
```

### **2. Container ไม่ทำงาน:**
```bash
# ดู logs
docker-compose logs

# ดูสถานะ
docker-compose ps

# Restart
docker-compose restart
```

### **3. Port Conflict:**
```bash
# ตรวจสอบ port ที่ใช้
netstat -an | findstr :3011

# เปลี่ยน port ใน infra/docker-compose.yml
```

## 📊 **การจัดการ Versions**

### **1. Pull Specific Version:**
```bash
# Pull version เฉพาะ
docker pull itjitdhana/workplnav6.2:v1.0.0

# Restart ด้วย version เฉพาะ
docker-compose down
docker-compose up -d
```

### **2. Rollback:**
```bash
# Pull version เก่า
docker pull itjitdhana/workplnav6.2:v1.0.0

# Restart ด้วย version เก่า
docker-compose down
docker-compose up -d
```

## 🎯 **สรุป**

### **ขั้นตอนง่ายๆ:**
1. **พัฒนา** → `.\build-and-push.bat`
2. **อัปเดท** → `.\pull-and-update.bat`

### **ข้อมูลสำคัญ:**
- **Registry**: `docker.io`
- **Image**: `itjitdhana/workplnav6.2`
- **Tag**: `latest`

### **เวลาในการอัปเดท:**
- **Pull**: 1-3 นาที
- **Restart**: 30 วินาที - 1 นาที
- **รวม**: ประมาณ 2-5 นาที

## 📋 **คำสั่งที่ใช้บ่อย**

### **1. Pull Image:**
```bash
docker pull itjitdhana/workplnav6.2:latest
```

### **2. Restart Containers:**
```bash
docker-compose down
docker-compose up -d
```

### **3. ตรวจสอบ Status:**
```bash
docker-compose ps
docker-compose logs
```

### **4. Clean Up:**
```bash
docker system prune -a
docker image prune -a
```

## 🚀 **Best Practices**

### **1. Always Pull Latest:**
```bash
# Pull ก่อน restart เสมอ
docker pull itjitdhana/workplnav6.2:latest
docker-compose down
docker-compose up -d
```

### **2. Check Logs:**
```bash
# ตรวจสอบ logs หลัง restart
docker-compose logs --tail=20
```

### **3. Backup Data:**
```bash
# Backup database ก่อน update
docker exec mysql mysqldump -u root -p workplan > backup.sql
```

### **4. Test After Update:**
```bash
# ทดสอบการทำงานหลัง update
curl http://localhost:3011
```
