#!/bin/bash

# Script สำหรับ Setup .env files บน Linux Server

echo "🚀 WorkplanV8Linux - Environment Setup Script"
echo "================================================"
echo ""

# สีสำหรับ output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ตรวจสอบว่าอยู่ใน directory ที่ถูกต้อง
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: ไม่พบ docker-compose.yml${NC}"
    echo "กรุณารัน script นี้ที่ root directory ของ project"
    exit 1
fi

echo -e "${YELLOW}📝 ขั้นตอนที่ 1: Setup Backend .env${NC}"
echo ""

# ตรวจสอบว่า backend/env.example มีอยู่หรือไม่
if [ ! -f "backend/env.example" ]; then
    echo -e "${YELLOW}⚠️  ไม่พบ backend/env.example สร้างไฟล์ .env ใหม่${NC}"
    touch backend/.env
else
    # Copy จาก env.example ถ้ายังไม่มี .env
    if [ ! -f "backend/.env" ]; then
        cp backend/env.example backend/.env
        echo -e "${GREEN}✅ สร้าง backend/.env จาก env.example${NC}"
    else
        echo -e "${YELLOW}⚠️  backend/.env มีอยู่แล้ว ไม่ได้สร้างใหม่${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📝 ขั้นตอนที่ 2: แก้ไข Backend .env${NC}"
echo ""
echo "กรุณาแก้ไข backend/.env ด้วยคำสั่ง:"
echo -e "${GREEN}nano backend/.env${NC}"
echo "หรือ"
echo -e "${GREEN}vi backend/.env${NC}"
echo ""
read -p "กด Enter เมื่อแก้ไขเสร็จแล้ว..."

echo ""
echo -e "${YELLOW}📝 ขั้นตอนที่ 3: Setup Root .env (สำหรับ docker-compose)${NC}"
echo ""

# สร้าง root .env ถ้ายังไม่มี
if [ ! -f ".env" ]; then
    echo "# Docker Compose Environment Variables" > .env
    echo "" >> .env
    echo "# Database Configuration" >> .env
    echo "DB_HOST=localhost" >> .env
    echo "DB_USER=root" >> .env
    echo "DB_PASSWORD=your_password" >> .env
    echo "DB_NAME=your_database" >> .env
    echo "DB_PORT=3306" >> .env
    echo "" >> .env
    echo "# Frontend Configuration" >> .env
    echo "NEXT_PUBLIC_API_URL=http://localhost:3101" >> .env
    echo "BACKEND_URL=http://backend:3101" >> .env
    echo -e "${GREEN}✅ สร้าง .env ใหม่${NC}"
else
    echo -e "${YELLOW}⚠️  .env มีอยู่แล้ว ไม่ได้สร้างใหม่${NC}"
fi

echo ""
echo -e "${YELLOW}📝 ขั้นตอนที่ 4: แก้ไข Root .env${NC}"
echo ""
echo "กรุณาแก้ไข .env ด้วยคำสั่ง:"
echo -e "${GREEN}nano .env${NC}"
echo "หรือ"
echo -e "${GREEN}vi .env${NC}"
echo ""
read -p "กด Enter เมื่อแก้ไขเสร็จแล้ว..."

echo ""
echo -e "${GREEN}✅ Setup เสร็จสิ้น!${NC}"
echo ""
echo "ขั้นตอนต่อไป:"
echo "1. ตรวจสอบ .env files ที่แก้ไขแล้ว"
echo "2. Run: ${GREEN}docker compose build${NC}"
echo "3. Run: ${GREEN}docker compose up -d${NC}"
echo "4. ตรวจสอบ logs: ${GREEN}docker compose logs -f${NC}"
echo ""

