/**
 * Script สำหรับทดสอบ API ดึงข้อมูลงานที่ทำบ่อย
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3102';
const ENDPOINT = '/api/work-plans/frequent-jobs';

function testAPI() {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}${ENDPOINT}?minFrequency=3&limit=20`;
    
    console.log('🔍 Testing API:', url);
    console.log('');
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.success) {
            console.log('✅ API Response Success!');
            console.log('');
            console.log('📊 Statistics:');
            if (json.data.statistics) {
              const stats = json.data.statistics;
              console.log(`   งานทั้งหมด: ${stats.total_unique_jobs} งาน`);
              console.log(`   งานที่ทำมากกว่า 10 ครั้ง: ${stats.jobs_10plus} งาน`);
              console.log(`   งานที่ทำ 5-9 ครั้ง: ${stats.jobs_5to9} งาน`);
              console.log(`   งานที่ทำ 3-4 ครั้ง: ${stats.jobs_3to4} งาน`);
              console.log(`   งานทั้งหมด (รวม): ${stats.total_work_plans} งาน`);
            }
            console.log('');
            console.log(`📋 พบงานที่ทำบ่อย ${json.data.jobs.length} งาน\n`);
            
            // แสดง Top 10
            console.log('🏆 Top 10 งานที่ทำบ่อยที่สุด:');
            json.data.jobs.slice(0, 10).forEach((job, idx) => {
              console.log(`   ${idx + 1}. ${job.job_name} (${job.job_code})`);
              console.log(`      ทำทั้งหมด: ${job.frequency} ครั้ง`);
              console.log(`      ครั้งแรก: ${job.first_date} | ครั้งล่าสุด: ${job.last_date}`);
              if (job.most_common_time) {
                console.log(`      เวลาที่ใช้บ่อย: ${job.most_common_time}`);
              }
              if (job.most_common_room) {
                console.log(`      ห้องผลิต: ${job.most_common_room}`);
              }
              if (job.most_common_machine) {
                console.log(`      เครื่องจักร: ${job.most_common_machine}`);
              }
              console.log('');
            });
            
            resolve(json);
          } else {
            console.error('❌ API Error:', json.message);
            reject(new Error(json.message));
          }
        } catch (error) {
          console.error('❌ Parse Error:', error.message);
          console.error('Response:', data.substring(0, 500));
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      console.error('');
      console.error('💡 ตรวจสอบว่า:');
      console.error('   1. Backend server ทำงานอยู่ที่', API_URL);
      console.error('   2. Database connection ทำงานปกติ');
      console.error('   3. API endpoint ถูกต้อง:', ENDPOINT);
      reject(error);
    });
  });
}

// รัน test
if (require.main === module) {
  testAPI()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testAPI };
