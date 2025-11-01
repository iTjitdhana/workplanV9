# 🔑 คู่มือจัดการ SSH Key จาก GitHub

## สารบัญ
1. [ดู SSH Public Key ใน GitHub](#ดู-ssh-public-key-ใน-github)
2. [Copy SSH Key ไปใช้บน Server](#copy-ssh-key-ไปใช้บน-server)
3. [Generate SSH Key ใหม่](#generate-ssh-key-ใหม่)
4. [เพิ่ม SSH Key ใน GitHub](#เพิ่ม-ssh-key-ใน-github)
5. [ใช้ SSH Key กับ Git](#ใช้-ssh-key-กับ-git)

---

## ดู SSH Public Key ใน GitHub

### วิธีที่ 1: ดูจาก GitHub Website

1. **เข้า GitHub → Settings → SSH and GPG keys**
2. **คลิกที่ SSH key ที่ต้องการ** (เช่น "Linux Server")
3. **ดูรายละเอียด:**
   - **Title:** ชื่อของ key
   - **Key:** SSH Public Key (จะแสดงบางส่วน)
   - **Type:** ประเภทของ key (SSH, RSA, ED25519)
   - **SHA256 fingerprint:** เช่น `SHA256:5vhUZgh996S9V6tBqVrz3y+GSZ6sP/AaSEUgtH56LLS`

**หมายเหตุ:** GitHub จะแสดงเฉพาะบางส่วนของ key เพื่อความปลอดภัย

---

## Copy SSH Key ไปใช้บน Server

### วิธีที่ 1: ใช้ SSH Key ที่มีอยู่แล้ว (แนะนำ)

ถ้าคุณมี SSH key ที่ใช้กับ GitHub อยู่แล้ว (เช่น "Linux Server"):

#### ขั้นตอนที่ 1: หา Private Key บนเครื่องที่ใช้

```bash
# บนเครื่องของคุณ (Windows/Mac/Linux)
# ดู SSH keys ที่มี
ls -la ~/.ssh/

# ดูชื่อ key ที่น่าจะใช่ (เช่น id_rsa, id_ed25519, Linux_Server)
# หากมีหลาย key ให้ดูวันที่สร้างเพื่อจับคู่กับ "Added on Oct 27, 2025"
```

#### ขั้นตอนที่ 2: Copy Private Key ไปยัง Server

**ถ้า Private Key อยู่บนเครื่อง Windows/Mac:**

```bash
# วิธีที่ 1: ใช้ SCP
scp ~/.ssh/id_rsa username@server_ip:~/.ssh/
scp ~/.ssh/id_rsa.pub username@server_ip:~/.ssh/

# วิธีที่ 2: Copy content แล้ว paste
cat ~/.ssh/id_rsa
# Copy output แล้ว paste ไปสร้างไฟล์บน server
```

**บน Server:**

```bash
# SSH เข้า server
ssh username@server_ip

# สร้าง .ssh directory (ถ้ายังไม่มี)
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# สร้างไฟล์ private key
nano ~/.ssh/id_rsa
# Paste private key แล้ว save (Ctrl+X, Y, Enter)

# สร้างไฟล์ public key
nano ~/.ssh/id_rsa.pub
# Paste public key แล้ว save

# ตั้งค่า permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

---

## Generate SSH Key ใหม่

ถ้าต้องการสร้าง SSH key ใหม่บน Linux Server:

### ขั้นตอนที่ 1: Generate Key บน Server

```bash
# SSH เข้า server
ssh username@server_ip

# Generate SSH key (ED25519 - แนะนำ)
ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/github_linux_server

# หรือใช้ RSA
ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f ~/.ssh/github_linux_server

# เมื่อถาม:
# - Enter file in which to save: กด Enter (ใช้ default)
# - Enter passphrase: กด Enter (ไม่ใส่ password) หรือใส่ password เพื่อความปลอดภัย
```

### ขั้นตอนที่ 2: ดู Public Key

```bash
# ดู Public Key
cat ~/.ssh/github_linux_server.pub

# Copy output ทั้งหมด (จะใช้เพิ่มใน GitHub)
```

**ตัวอย่าง output:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGxxx... your_email@example.com
```

### ขั้นตอนที่ 3: เพิ่ม Public Key ใน GitHub

1. **Copy Public Key** ที่ได้จากขั้นตอนที่ 2
2. **เข้า GitHub → Settings → SSH and GPG keys**
3. **คลิก "New SSH key"**
4. **กรอกข้อมูล:**
   - **Title:** `Linux Server` (หรือชื่อที่ต้องการ)
   - **Key type:** Authentication Key
   - **Key:** Paste Public Key ที่ copy มา
5. **คลิก "Add SSH key"**

---

## เพิ่ม SSH Key ใน GitHub

### ผ่าน GitHub Website:

1. **เข้า GitHub:** https://github.com/settings/keys
2. **คลิก "New SSH key"**
3. **กรอกข้อมูล:**
   - **Title:** ชื่อที่ต้องการ (เช่น "Linux Server", "Production Server")
   - **Key type:** Authentication Key
   - **Key:** วาง Public Key (จาก `~/.ssh/id_rsa.pub` หรือ `~/.ssh/id_ed25519.pub`)
4. **คลิก "Add SSH key"**

### ผ่าน GitHub CLI (gh):

```bash
# ติดตั้ง GitHub CLI (ถ้ายังไม่มี)
# Ubuntu/Debian
sudo apt install gh

# ใช้ gh ในการเพิ่ม key
gh auth login
gh ssh-key add ~/.ssh/id_ed25519.pub --title "Linux Server"
```

---

## ใช้ SSH Key กับ Git

### ขั้นตอนที่ 1: ทดสอบ SSH Connection

```bash
# บน Linux Server
ssh -T git@github.com
```

**ผลลัพธ์ที่ควรเห็น:**
```
Hi iTjitdhana! You've successfully authenticated, but GitHub does not provide shell access.
```

### ขั้นตอนที่ 2: Clone Repository ด้วย SSH

```bash
# ใช้ SSH URL แทน HTTPS
git clone git@github.com:iTjitdhana/WorkplanV8Linux.git

# หรือเปลี่ยน remote URL จาก HTTPS เป็น SSH
cd WorkplanV8Linux
git remote set-url origin git@github.com:iTjitdhana/WorkplanV8Linux.git
```

### ขั้นตอนที่ 3: ตั้งค่า SSH Config (Optional)

```bash
# สร้างหรือแก้ไข ~/.ssh/config
nano ~/.ssh/config
```

**เนื้อหา:**
```
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_linux_server
    IdentitiesOnly yes
```

**ตั้งค่า permissions:**
```bash
chmod 600 ~/.ssh/config
```

---

## วิธี Copy SSH Key ระหว่างเครื่อง

### จากเครื่อง Windows/Mac ไปยัง Server:

#### วิธีที่ 1: ใช้ SCP

```bash
# จากเครื่องของคุณ
scp ~/.ssh/id_rsa username@server_ip:~/.ssh/
scp ~/.ssh/id_rsa.pub username@server_ip:~/.ssh/

# SSH เข้า server แล้วตั้งค่า permissions
ssh username@server_ip
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

#### วิธีที่ 2: Copy Content แล้ว Paste

```bash
# บนเครื่องของคุณ - ดู private key
cat ~/.ssh/id_rsa

# Copy output ทั้งหมด
# แล้ว SSH เข้า server และสร้างไฟล์
ssh username@server_ip

# สร้างไฟล์
nano ~/.ssh/id_rsa
# Paste แล้ว save (Ctrl+X, Y, Enter)
chmod 600 ~/.ssh/id_rsa
```

---

## ตรวจสอบ SSH Key

### ดู SSH Keys ที่มีใน GitHub:

```bash
# ใช้ GitHub CLI
gh auth status
gh ssh-key list

# หรือดูจาก Website
# https://github.com/settings/keys
```

### ดู SSH Keys บน Server:

```bash
# ดู public keys
ls -la ~/.ssh/*.pub

# ดู public key content
cat ~/.ssh/id_ed25519.pub
cat ~/.ssh/id_rsa.pub

# ดู fingerprint (เพื่อ match กับ GitHub)
ssh-keygen -lf ~/.ssh/id_ed25519.pub
ssh-keygen -lf ~/.ssh/id_rsa.pub
```

---

## Troubleshooting

### SSH Connection Failed

```bash
# ทดสอบ connection
ssh -vT git@github.com

# ดู error messages:
# - Permission denied → Key ไม่ถูกต้องหรือไม่มีใน GitHub
# - Could not resolve hostname → Network problem
```

### Key Not Found

```bash
# ตรวจสอบว่า key มีอยู่
ls -la ~/.ssh/

# ตรวจสอบ permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

### Multiple Keys

ถ้ามีหลาย SSH keys:

```bash
# ใช้ SSH config เพื่อเลือก key ที่ต้องการ
nano ~/.ssh/config

# เพิ่ม:
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_linux_server
    IdentitiesOnly yes
```

---

## สรุปคำสั่งที่ใช้บ่อย

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "email@example.com"

# ดู public key
cat ~/.ssh/id_ed25519.pub

# ทดสอบ connection
ssh -T git@github.com

# Clone ด้วย SSH
git clone git@github.com:username/repo.git

# เปลี่ยน remote URL
git remote set-url origin git@github.com:username/repo.git
```

---

## Best Practices

1. **ใช้ ED25519** แทน RSA (ปลอดภัยกว่า)
2. **ใส่ passphrase** สำหรับ production servers
3. **ใช้ SSH Config** เมื่อมีหลาย keys
4. **ไม่ควร share private key** ระหว่าง servers
5. **ลบ SSH key** ที่ไม่ใช้แล้วจาก GitHub

---

## อ้างอิง

- GitHub SSH Documentation: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
- SSH Key Generation: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent

