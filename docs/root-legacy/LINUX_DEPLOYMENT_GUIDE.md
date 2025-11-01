# 🐧 คู่มือการ Deploy ระบบ WorkplanV6 บน Linux Server

**วันที่:** 23 กันยายน 2567  
**เวอร์ชัน:** 6.0  
**ระบบ:** WorkplanV6 Production Tracking System

---

## 📋 ข้อกำหนดเบื้องต้น

### Server Requirements
- **OS**: Ubuntu 20.04+ หรือ Debian 10+
- **RAM**: อย่างน้อย 4GB
- **Storage**: อย่างน้อย 20GB
- **Network**: เชื่อมต่อกับ Database Server (192.168.0.94)

### Software Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.25+

---

## 🚀 ขั้นตอนการ Deploy

### 1. **เตรียม Server**

```bash
# อัปเดทระบบ
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Git
sudo apt install -y git curl wget

# ติดตั้ง Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# ติดตั้ง Docker Compose Plugin
sudo apt install -y docker-compose-plugin

# Logout และ login ใหม่
exit
# SSH เข้าใหม่
ssh itjitdhana@192.168.0.96
```

### 2. **Clone Repository**

```bash
# สร้างโฟลเดอร์โปรเจค
sudo mkdir -p /opt/workplanv6
sudo chown itjitdhana:itjitdhana /opt/workplanv6
cd /opt/workplanv6

# Clone โปรเจค
git clone https://github.com/iTjitdhana/WorkplanV6linux.git .

# ตรวจสอบไฟล์
ls -la
```

### 3. **สร้างไฟล์ Environment**

#### Backend Environment
```bash
# สร้างไฟล์ .env สำหรับ backend
cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=3101
DB_HOST=192.168.0.94
DB_USER=jitdhana
DB_PASSWORD=iT12345$
DB_NAME=esp_tracker
DB_PORT=3306
LOGS_DB_HOST=192.168.0.93
LOGS_DB_USER=it.jitdhana
LOGS_DB_PASSWORD=iT12345$
LOGS_DB_NAME=esp_tracker
LOGS_DB_PORT=3306
JWT_SECRET=workplan_jwt_secret_2024_production_key_v6
SESSION_SECRET=workplan_session_secret_2024_production_key_v6
CORS_ORIGIN=http://192.168.0.96:3012
EOF
```

#### Frontend Environment
```bash
# สร้างไฟล์ .env.local สำหรับ frontend
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://backend:3101
BACKEND_URL=http://backend:3101
EOF
```

### 4. **Deploy ด้วย Docker Compose**

```bash
# ใช้ไฟล์ docker-compose.linux.yml
docker compose -f docker-compose.linux.yml up --build -d

# ตรวจสอบสถานะ
docker compose -f docker-compose.linux.yml ps
```

### 5. **ทดสอบระบบ**

```bash
# ทดสอบ Backend API
curl http://192.168.0.96:3102/health

# ทดสอบ Frontend
curl -I http://192.168.0.96:3012

# ทดสอบหน้า Tracker
curl -I http://192.168.0.96:3012/tracker
```

---

## 🔧 การจัดการระบบ

### การตรวจสอบสถานะ
```bash
# ดูสถานะ containers
docker compose -f docker-compose.linux.yml ps

# ดู logs
docker compose -f docker-compose.linux.yml logs -f

# ดู logs เฉพาะ service
docker compose -f docker-compose.linux.yml logs -f frontend
docker compose -f docker-compose.linux.yml logs -f backend
```

### การรีสตาร์ทระบบ
```bash
# รีสตาร์ททั้งระบบ
docker compose -f docker-compose.linux.yml restart

# รีสตาร์ทเฉพาะ service
docker compose -f docker-compose.linux.yml restart frontend
docker compose -f docker-compose.linux.yml restart backend
```

### การอัปเดทระบบ
```bash
# ดึงโค้ดล่าสุด
git pull origin main

# Build และรันใหม่
docker compose -f docker-compose.linux.yml up --build -d
```

### การหยุดระบบ
```bash
# หยุดระบบ
docker compose -f docker-compose.linux.yml down

# หยุดและลบ volumes
docker compose -f docker-compose.linux.yml down -v
```

---

## 🐛 การแก้ไขปัญหา

### ใช้สคริปต์วินิจฉัย
```bash
# รันสคริปต์ทดสอบ
node test-tracker-issue.js

# รันสคริปต์แก้ไขปัญหา
chmod +x fix-tracker-linux.sh
./fix-tracker-linux.sh
```

### ปัญหาที่พบบ่อย

#### 1. **Database Connection Failed**
```bash
# ตรวจสอบ MySQL server
sudo systemctl status mysql

# ทดสอบการเชื่อมต่อ
mysql -h 192.168.0.94 -u jitdhana -p esp_tracker -e "SELECT 1;"

# ตรวจสอบ user permissions
mysql -h 192.168.0.94 -u root -p -e "
GRANT ALL PRIVILEGES ON esp_tracker.* TO 'jitdhana'@'%' IDENTIFIED BY 'iT12345$';
FLUSH PRIVILEGES;
"
```

#### 2. **Port Already in Use**
```bash
# ตรวจสอบ port ที่ใช้งาน
netstat -tlnp | grep -E ":(3012|3102)"

# หยุด process ที่ใช้ port
sudo kill -9 $(sudo lsof -t -i:3012)
sudo kill -9 $(sudo lsof -t -i:3102)
```

#### 3. **Docker Build Failed**
```bash
# ลบ images เก่า
docker system prune -a

# Build ใหม่
docker compose -f docker-compose.linux.yml build --no-cache
```

#### 4. **Frontend Build Failed**
```bash
# ลบ node_modules และ build cache
rm -rf frontend/node_modules frontend/.next

# Build ใหม่
docker compose -f docker-compose.linux.yml up --build -d
```

---

## 📊 URLs สำหรับการเข้าถึง

### Production URLs
- **Frontend**: http://192.168.0.96:3012
- **Tracker**: http://192.168.0.96:3012/tracker
- **Backend API**: http://192.168.0.96:3102
- **Health Check**: http://192.168.0.96:3102/health

### Development URLs (ถ้าใช้)
- **Frontend**: http://192.168.0.96:3011
- **Backend API**: http://192.168.0.96:3101

---

## 🔒 Security Considerations

### Firewall Configuration
```bash
# เปิด port ที่จำเป็น
sudo ufw allow 3012
sudo ufw allow 3102
sudo ufw allow 22
sudo ufw enable
```

### SSL/HTTPS (ถ้าต้องการ)
```bash
# ติดตั้ง Certbot
sudo apt install -y certbot

# สร้าง SSL certificate
sudo certbot certonly --standalone -d your-domain.com
```

---

## 📈 Monitoring และ Maintenance

### การตรวจสอบ Performance
```bash
# ดูการใช้ resources
docker stats

# ดู disk usage
df -h
docker system df
```

### การ Backup
```bash
# Backup database
mysqldump -h 192.168.0.94 -u jitdhana -p esp_tracker > backup_$(date +%Y%m%d).sql

# Backup Docker volumes
docker run --rm -v workplanv6_data:/data -v $(pwd):/backup alpine tar czf /backup/data_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### การ Cleanup
```bash
# ลบ unused images และ containers
docker system prune -a

# ลบ logs เก่า
sudo journalctl --vacuum-time=7d
```

---

## 📞 Support และ Troubleshooting

### Log Files
- **Docker Logs**: `docker compose -f docker-compose.linux.yml logs`
- **System Logs**: `/var/log/syslog`
- **Application Logs**: ใน Docker containers

### การติดต่อ Support
- **แผนกเทคโนโลยีสารสนเทศ**
- **บริษัท จิตต์ธนา จำกัด (สำนักงานใหญ่)**

### คำสั่งที่มีประโยชน์
```bash
# ดูสถานะระบบ
docker compose -f docker-compose.linux.yml ps

# ดู logs แบบ real-time
docker compose -f docker-compose.linux.yml logs -f

# เข้าไปใน container
docker compose -f docker-compose.linux.yml exec frontend sh
docker compose -f docker-compose.linux.yml exec backend sh

# รีสตาร์ทระบบ
docker compose -f docker-compose.linux.yml restart

# อัปเดทระบบ
git pull origin main && docker compose -f docker-compose.linux.yml up --build -d
```

---

## 🎉 สรุป

ระบบ WorkplanV6 ได้ถูก deploy บน Linux Server เรียบร้อยแล้ว!

### ✅ สิ่งที่ทำเสร็จแล้ว:
- ✅ Docker containers build สำเร็จ
- ✅ Docker Compose configuration ถูกต้อง
- ✅ Database connection ทำงานได้
- ✅ Frontend และ Backend ทำงานได้ปกติ
- ✅ สคริปต์วินิจฉัยและแก้ไขปัญหาพร้อมใช้งาน

### 🌐 การเข้าถึงระบบ:
- **Frontend**: http://192.168.0.96:3012
- **Tracker**: http://192.168.0.96:3012/tracker
- **Backend API**: http://192.168.0.96:3102

### 📋 การบำรุงรักษา:
- ตรวจสอบ logs เป็นประจำ
- อัปเดทระบบเมื่อมีเวอร์ชันใหม่
- Backup ข้อมูลเป็นประจำ
- Monitor performance และ resources

---

**อัปเดทล่าสุด:** 23 กันยายน 2567  
**เวอร์ชัน:** 6.0  
**สถานะ:** Production Ready ✅
