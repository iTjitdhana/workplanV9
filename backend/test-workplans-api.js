/**
 * ทดสอบ API work-plans โดยตรง
 * รันพร้อม backend: npm run dev (terminal อื่น)
 * แล้วรันไฟล์นี้: node test-workplans-api.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3101';

async function testAPIs() {
  console.log('========================================');
  console.log('🧪 ทดสอบ Work Plans APIs');
  console.log('========================================\n');
  
  try {
    // Test 1: GET /api/work-plans (ไม่มี date)
    console.log('1️⃣ Testing: GET /api/work-plans (all plans)');
    try {
      const res1 = await axios.get(`${API_URL}/api/work-plans`);
      console.log('   ✅ Status:', res1.status);
      console.log('   📊 Found:', res1.data.length || res1.data.data?.length || 0, 'work plans');
      if (res1.data.length > 0 || res1.data.data?.length > 0) {
        const data = res1.data.data || res1.data;
        console.log('   📋 ตัวอย่าง:', data[0]);
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.status || err.message);
    }
    
    // Test 2: GET /api/work-plans?date=2025-10-20
    console.log('\n2️⃣ Testing: GET /api/work-plans?date=2025-10-20');
    try {
      const res2 = await axios.get(`${API_URL}/api/work-plans?date=2025-10-20`);
      console.log('   ✅ Status:', res2.status);
      console.log('   📊 Found:', res2.data.length || res2.data.data?.length || 0, 'work plans');
      if (res2.data.length > 0 || res2.data.data?.length > 0) {
        const data = res2.data.data || res2.data;
        console.log('   📋 รายการ:');
        data.slice(0, 5).forEach((plan, i) => {
          console.log(`      ${i+1}. ${plan.job_code} - ${plan.job_name}`);
        });
      } else {
        console.log('   ⚠️  ไม่พบ work plans');
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.status || err.message);
      if (err.response?.data) {
        console.log('   Response:', err.response.data);
      }
    }
    
    // Test 3: GET /api/work-plans/drafts
    console.log('\n3️⃣ Testing: GET /api/work-plans/drafts');
    try {
      const res3 = await axios.get(`${API_URL}/api/work-plans/drafts`);
      console.log('   ✅ Status:', res3.status);
      console.log('   📝 Found:', res3.data.length || res3.data.data?.length || 0, 'drafts');
      if (res3.data.length > 0 || res3.data.data?.length > 0) {
        const data = res3.data.data || res3.data;
        console.log('   📋 รายการ:');
        data.slice(0, 5).forEach((draft, i) => {
          console.log(`      ${i+1}. ${draft.job_code} - ${draft.job_name}`);
        });
      }
    } catch (err) {
      console.log('   ❌ Error:', err.response?.status || err.message);
    }
    
    // Test 4: Health Check
    console.log('\n4️⃣ Testing: GET /health');
    try {
      const res4 = await axios.get(`${API_URL}/health`);
      console.log('   ✅ Status:', res4.data.status);
      console.log('   📊 Database:', res4.data.database);
      console.log('   🌍 Environment:', res4.data.environment);
    } catch (err) {
      console.log('   ❌ Error:', err.message);
    }
    
    console.log('\n========================================');
    console.log('✅ การทดสอบเสร็จสิ้น');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  }
}

// Check if backend is running
console.log('⚠️  กรุณาเปิด Backend ก่อน: npm run dev\n');
setTimeout(() => {
  testAPIs();
}, 1000);

