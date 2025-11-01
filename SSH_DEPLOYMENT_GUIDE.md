# 🔐 คู่มือ Deploy ด้วย SSH บน Linux Server

## สารบัญ
1. [การเชื่อมต่อด้วย SSH](#การเชื่อมต่อด้วย-ssh)
2. [Clone Repository](#clone-repository)
3. [Setup Environment Variables](#setup-environment-variables)
4. [Build และ Deploy](#build-และ-deploy)
5. [การจัดการผ่าน SSH](#การจัดการผ่าน-ssh)

---

## การเชื่อมต่อด้วย SSH

### วิธีที่ 1: ใช้ SSH Key (แนะนำ - ปลอดภัยกว่า)

```bash
# จากเครื่อง Windows/Mac/Linux ของคุณ
ssh -i /path/to/your/private_key.pem username@server_ip

# ตัวอย่าง
ssh -i ~/.ssh/my_key.pem ubuntu@192.168.0.94
```

### วิธีที่ 2: ใช้ Password

```bash
ssh username@server_ip

# ตัวอย่าง
ssh root@192.168.0.94
# หรือ
ssh ubuntu@192.168.0.94
```

### วิธีที่ 3: ใช้ SSH Config (สะดวก)

สร้างไฟล์ `~/.ssh/config`:

```bash
# บนเครื่องของคุณ (Windows/Mac/Linux)
nano ~/.ssh/config
```

**เนื้อหา:**

```
Host workplan-server
    HostName 192.168.0.94
    User ubuntu
    IdentityFile ~/.ssh/my_key.pem
    Port 22
```

**ใช้งาน:**

```bash
ssh workplan-server
```

---

## Clone Repository

### วิธีที่ 1: Clone บน Server โดยตรง (แนะนำ)

**ขั้นตอน:**

1. **เชื่อมต่อ SSH เข้า server**
   ```bash
   ssh username@server_ip
   ```

2. **Clone repository**
   ```bash
   # สร้าง directory สำหรับ project (ถ้ายังไม่มี)
   mkdir -p ~/projects
   cd ~/projects
   
   # Clone repository
   git clone https://github.com/iTjitdhana/WorkplanV8Linux.git
   cd WorkplanV8Linux
   
   # ตรวจสอบ version (ถ้าต้องการ)
   git checkout v1.0.0
   ```

### วิธีที่ 2: Clone ผ่าน SSH (ถ้า Repository เป็น Private)

```bash
# ใช้ SSH URL แทน HTTPS
git clone git@github.com:iTjitdhana/WorkplanV8Linux.git
```

**หมายเหตุ:** ต้อง setup SSH key บน server ก่อน (ดูด้านล่าง)

### วิธีที่ 3: Clone จากเครื่องอื่น แล้ว Upload ไป Server

```bash
# บนเครื่องของคุณ
git clone https://github.com/iTjitdhana/WorkplanV8Linux.git
cd WorkplanV8Linux

# สร้าง archive
tar -czf workplan.tar.gz --exclude='.git' --exclude='node_modules' .

# Upload ไป server ด้วย SCP
scp workplan.tar.gz username@server_ip:~/projects/

# SSH เข้า server
ssh username@server_ip

# บน server: Extract
cd ~/projects
tar -xzf workplan.tar.gz
cd WorkplanV8Linux
```

---

## Setup Environment Variables

### วิธีที่ 1: ใช้ SSH แก้ไขไฟล์ .env โดยตรง

```bash
# SSH เข้า server
ssh username@server_ip

# เข้าไปใน project directory
cd ~/projects/WorkplanV8Linux

# Setup backend .env
cd backend
cp env.example .env
nano .env  # หรือ vi .env

# Setup root .env
cd ..
nano .env
```

### วิธีที่ 2: ใช้ Setup Script

```bash
# SSH เข้า server
ssh username@server_ip

cd ~/projects/WorkplanV8Linux

# ให้สิทธิ์ execute
chmod +x setup-env.sh

# รัน script
./setup-env.sh
```

### วิธีที่ 3: Copy .env จากเครื่องอื่น

```bash
# บนเครื่องของคุณ - สร้าง .env files แล้ว upload
scp backend/.env username@server_ip:~/projects/WorkplanV8Linux/backend/
scp .env username@server_ip:~/projects/WorkplanV8Linux/
```

---

## Build และ Deploy

### วิธีที่ 1: ทำบน Server โดยตรง (แนะนำ)

```bash
# SSH เข้า server
ssh username@server_ip

cd ~/projects/WorkplanV8Linux

# Build images
docker compose build

# Start services
docker compose up -d

# ดู logs
docker compose logs -f
```

### วิธีที่ 2: รันคำสั่งผ่าน SSH (ไม่ต้อง login)

```bash
# จากเครื่องของคุณ - Build บน server
ssh username@server_ip "cd ~/projects/WorkplanV8Linux && docker compose build"

# Start services
ssh username@server_ip "cd ~/projects/WorkplanV8Linux && docker compose up -d"

# ดู logs
ssh username@server_ip "cd ~/projects/WorkplanV8Linux && docker compose logs -f"
```

### วิธีที่ 3: ใช้ SSH Script

สร้างไฟล์ `deploy.sh` บนเครื่องของคุณ:

```bash
#!/bin/bash

SERVER="username@server_ip"
PROJECT_DIR="~/projects/WorkplanV8Linux"

echo "🚀 Deploying to server..."

ssh $SERVER << 'ENDSSH'
    cd ~/projects/WorkplanV8Linux
    echo "📦 Pulling latest code..."
    git pull origin main
    
    echo "🔨 Building Docker images..."
    docker compose build
    
    echo "🔄 Restarting services..."
    docker compose down
    docker compose up -d
    
    echo "✅ Deployment complete!"
    docker compose ps
ENDSSH
```

**ใช้งาน:**

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## การจัดการผ่าน SSH

### ดู Logs

```bash
# SSH เข้า server แล้ว
ssh username@server_ip

cd ~/projects/WorkplanV8Linux

# ดู logs ทั้งหมด
docker compose logs -f

# ดู logs เฉพาะ backend
docker compose logs -f backend

# ดู logs เฉพาะ frontend
docker compose logs -f frontend
```

### ตรวจสอบ Status

```bash
ssh username@server_ip "cd ~/projects/WorkplanV8Linux && docker compose ps"
```

### Restart Services

```bash
ssh username@server_ip "cd ~/projects/WorkplanV8Linux && docker compose restart"
```

### Update Code

```bash
ssh username@server_ip << 'ENDSSH'
    cd ~/projects/WorkplanV8Linux
    git pull origin main
    docker compose down
    docker compose build --no-cache
    docker compose up -d
ENDSSH
```

### ตรวจสอบ Health

```bash
# Backend health check
ssh username@server_ip "curl http://localhost:3101/health"

# Frontend check
ssh username@server_ip "curl http://localhost:3011"
```

---

## Setup SSH Key สำหรับ GitHub (ถ้าต้องการ)

### 1. สร้าง SSH Key บน Server

```bash
# SSH เข้า server
ssh username@server_ip

# สร้าง SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# หรือใช้ RSA
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub
# หรือ
cat ~/.ssh/id_rsa.pub
```

### 2. เพิ่ม SSH Key ใน GitHub

1. ไปที่ GitHub → Settings → SSH and GPG keys
2. คลิก "New SSH key"
3. วาง public key ที่ copy ไว้
4. Save

### 3. ทดสอบ

```bash
# บน server
ssh -T git@github.com
```

---

## Tips และ Best Practices

### 1. ใช้ SSH Config

สร้าง `~/.ssh/config` เพื่อให้จำ server ได้:

```
Host workplan
    HostName 192.168.0.94
    User ubuntu
    IdentityFile ~/.ssh/workplan_key
    Port 22
```

**ใช้งาน:**

```bash
ssh workplan
```

### 2. ใช้ tmux หรือ screen สำหรับ Session ยาว

```bash
# ติดตั้ง tmux (ถ้ายังไม่มี)
sudo apt-get install tmux  # Ubuntu/Debian
sudo yum install tmux       # CentOS/RHEL

# สร้าง session
tmux new -s workplan

# ภายใน tmux - run docker compose logs
docker compose logs -f

# Detach: Ctrl+B แล้วกด D
# Reattach: tmux attach -t workplan
```

### 3. ใช้ SSH Tunnel สำหรับ Database (ถ้าต้องการ)

```bash
# จากเครื่องของคุณ - สร้าง tunnel
ssh -L 3306:localhost:3306 username@server_ip

# ตอนนี้สามารถเชื่อมต่อ MySQL ผ่าน localhost:3306
```

### 4. Auto-deploy Script

สร้าง `auto-deploy.sh`:

```bash
#!/bin/bash

SERVER="workplan-server"
PROJECT_DIR="~/projects/WorkplanV8Linux"

echo "🔄 Auto-deploying..."

ssh $SERVER << ENDSSH
    set -e
    cd $PROJECT_DIR
    
    echo "📥 Pulling code..."
    git fetch origin
    git checkout main
    git pull origin main
    
    echo "🔨 Building..."
    docker compose build
    
    echo "🔄 Restarting..."
    docker compose down
    docker compose up -d
    
    echo "✅ Done!"
    sleep 2
    docker compose ps
ENDSSH
```

---

## Troubleshooting

### SSH Connection Failed

```bash
# ตรวจสอบว่า server เปิด port 22
telnet server_ip 22

# ตรวจสอบ SSH service
ssh username@server_ip "sudo systemctl status ssh"
```

### Permission Denied

```bash
# ตรวจสอบ permissions ของ key
chmod 600 ~/.ssh/your_key
chmod 644 ~/.ssh/your_key.pub
```

### Docker Permission Denied

```bash
# เพิ่ม user เข้า docker group
ssh username@server_ip "sudo usermod -aG docker $USER"
# ออกจาก SSH แล้ว login ใหม่
```

---

## สรุปคำสั่งที่ใช้บ่อย

```bash
# เชื่อมต่อ
ssh username@server_ip

# Clone
git clone https://github.com/iTjitdhana/WorkplanV8Linux.git

# Setup
cd WorkplanV8Linux
chmod +x setup-env.sh
./setup-env.sh

# Deploy
docker compose build
docker compose up -d

# ดู logs
docker compose logs -f

# Update
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
```

