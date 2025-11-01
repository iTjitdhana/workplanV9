# 🔍 วิธีหา Username และ Server IP สำหรับ SSH

## Username คืออะไร?

**Username** คือชื่อ user ที่ใช้ login เข้า Linux server ของคุณ

### Username ที่ใช้บ่อย:

1. **`root`** - Super user (administrator)
2. **`ubuntu`** - User สำหรับ Ubuntu server (default)
3. **`admin`** - Administrator user
4. **`user`** - User ทั่วไป
5. **ชื่อที่คุณสร้างเอง** - เช่น `jitdhana`, `workplan`, `deploy`

### วิธีหา Username:

#### วิธีที่ 1: ถ้าเคย SSH เข้า server แล้ว

```bash
# SSH เข้า server แล้วดู current user
whoami

# หรือดู full name
echo $USER
```

#### วิธีที่ 2: ถ้าใช้ SSH Key

ดูที่ไฟล์ SSH key หรือ SSH config:

```bash
# ดู SSH config (ถ้ามี)
cat ~/.ssh/config

# ดูใน file name ของ key หรือ comment
# เช่น: id_rsa_ubuntu_workplan
#      username อาจจะเป็น: ubuntu หรือ workplan
```

#### วิธีที่ 3: ถ้าใช้ Cloud Provider

**AWS EC2:**
- Default username: `ec2-user` (Amazon Linux)
- Default username: `ubuntu` (Ubuntu)
- Default username: `admin` (Debian)

**DigitalOcean:**
- Default username: `root`

**Linode:**
- Default username: `root`

**Google Cloud:**
- Default username: บางครั้งเป็นชื่อ user ที่สร้าง

---

## Server IP คืออะไร?

**Server IP** คือ IP address หรือ domain name ของ Linux server ที่คุณต้องการเชื่อมต่อ

### วิธีหา Server IP:

#### วิธีที่ 1: ถ้าใช้ Cloud Provider

**AWS EC2:**
1. ไปที่ EC2 Dashboard
2. เลือก Instance
3. ดูที่ "Public IPv4 address" หรือ "Public DNS"

**DigitalOcean:**
1. ไปที่ Droplets
2. เลือก Droplet
3. ดูที่ "IPv4"

**Linode:**
1. ไปที่ Linodes
2. เลือก Linode
3. ดูที่ "IP Addresses"

#### วิธีที่ 2: ถ้าเป็น Server ในเครือข่ายเดียวกัน

**Local Network (192.168.x.x):**
```bash
# บนเครื่อง Windows
ipconfig
# หา IPv4 Address (เช่น 192.168.0.94)

# บนเครื่อง Linux/Mac
ifconfig
# หรือ
ip addr show
```

**จาก Server เอง:**
```bash
# SSH เข้า server แล้วรัน
hostname -I
# หรือ
ip addr show | grep "inet "
# หรือ
curl ifconfig.me  # Public IP
```

#### วิธีที่ 3: ถ้ามี Domain Name

ใช้ domain name แทน IP:
```bash
ssh username@yourdomain.com
ssh username@subdomain.yourdomain.com
```

---

## ตัวอย่าง

### ตัวอย่างที่ 1: AWS EC2

```bash
# Username: ubuntu
# Server IP: 54.123.45.67 (จาก EC2 Dashboard)

ssh ubuntu@54.123.45.67
```

### ตัวอย่างที่ 2: Local Network Server

```bash
# Username: root
# Server IP: 192.168.0.94 (จาก ifconfig หรือ ipconfig)

ssh root@192.168.0.94
```

### ตัวอย่างที่ 3: DigitalOcean

```bash
# Username: root
# Server IP: 164.92.123.45 (จาก Droplets page)

ssh root@164.92.123.45
```

### ตัวอย่างที่ 4: มี Domain Name

```bash
# Username: ubuntu
# Domain: workplan.example.com

ssh ubuntu@workplan.example.com
```

---

## วิธีตรวจสอบว่า Username และ IP ถูกต้อง

### ทดสอบ Connection

```bash
# ทดสอบ ping (ตรวจสอบว่า server เปิดอยู่)
ping server_ip

# ทดสอบ SSH port (22)
telnet server_ip 22
# หรือ
nc -zv server_ip 22
```

### ดู Error Messages

ถ้าใช้ username ผิด:
```
Permission denied (publickey,password).
```

ถ้าใช้ IP ผิด:
```
ssh: Could not resolve hostname server_ip: Name or service not known
```

---

## Checklist ก่อน SSH

- [ ] รู้ Username (root, ubuntu, หรือ user อื่น)
- [ ] รู้ Server IP หรือ Domain Name
- [ ] Server เปิดอยู่และเชื่อมต่อได้ (ping)
- [ ] Port 22 (SSH) เปิดอยู่
- [ ] มี SSH Key หรือ Password สำหรับ login

---

## คำสั่งที่ใช้บ่อย

```bash
# SSH เข้า server
ssh username@server_ip

# SSH พร้อม SSH Key
ssh -i /path/to/key.pem username@server_ip

# SSH พร้อม port อื่น (ถ้าไม่ใช่ 22)
ssh -p 2222 username@server_ip

# ดู current user (หลังจาก login)
whoami

# ดู IP ของ server (หลังจาก login)
hostname -I
```

---

## ถ้ายังหาไม่เจอ

### ถ้าไม่รู้ Username:

1. **ถามคนที่ setup server**
2. **ลอง username ที่ใช้บ่อย:**
   - `root`
   - `ubuntu`
   - `admin`
   - `user`

### ถ้าไม่รู้ Server IP:

1. **ถามคนที่ setup server**
2. **ดูจาก Cloud Provider Dashboard**
3. **ถามคนที่รู้จัก network**
4. **ใช้ domain name แทน (ถ้ามี)**

---

## ตัวอย่างจริง

สมมติว่าคุณมี:
- Server: Ubuntu Server 20.04
- Provider: AWS EC2 หรือ Local Server
- IP: 192.168.0.94 (จากที่คุณเคยใช้งาน)

```bash
# ลอง username ที่เป็นไปได้
ssh root@192.168.0.94
# หรือ
ssh ubuntu@192.168.0.94
# หรือ
ssh admin@192.168.0.94
```

ถ้าลองแล้วได้ ให้จดไว้!

