/**
 * Script สำหรับวิเคราะห์งานที่ทำบ่อยเพื่อใช้เป็น Template
 * ดึงข้อมูลงานที่ทำมากกว่า 3 ครั้ง พร้อมข้อมูลที่เกี่ยวข้อง
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// โหลด environment variables จาก backend/.env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../backend/.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

async function analyzeFrequentJobs() {
  let connection;
  
  try {
    // สร้าง connection จาก environment variables หรือใช้ค่า default
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'jitdhana',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'esp_tracker',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4'
    });

    console.log('🔍 กำลังวิเคราะห์งานที่ทำบ่อย...\n');

    // Query 1: ดึงงานที่ทำบ่อย (มากกว่า 3 ครั้ง) พร้อมข้อมูลสรุป
    const frequentJobsQuery = `
      SELECT 
        wp.job_code,
        wp.job_name,
        COUNT(*) as frequency,
        MIN(wp.production_date) as first_date,
        MAX(wp.production_date) as last_date,
        -- เวลาที่ใช้บ่อยที่สุด
        (
          SELECT CONCAT(start_time, '-', end_time)
          FROM work_plans wp2
          WHERE wp2.job_code = wp.job_code 
            AND wp2.start_time IS NOT NULL 
            AND wp2.end_time IS NOT NULL
          GROUP BY CONCAT(start_time, '-', end_time)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as most_common_time,
        -- ห้องผลิตที่ใช้บ่อยที่สุด
        (
          SELECT pr.room_code
          FROM work_plans wp2
          JOIN production_rooms pr ON wp2.production_room_id = pr.id
          WHERE wp2.job_code = wp.job_code 
            AND wp2.production_room_id IS NOT NULL
          GROUP BY pr.room_code
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as most_common_room,
        -- เครื่องจักรที่ใช้บ่อยที่สุด
        (
          SELECT m.machine_code
          FROM work_plans wp2
          JOIN machines m ON wp2.machine_id = m.id
          WHERE wp2.job_code = wp.job_code 
            AND wp2.machine_id IS NOT NULL
          GROUP BY m.machine_code
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as most_common_machine
      FROM work_plans wp
      WHERE wp.job_code IS NOT NULL 
        AND wp.job_code != ''
        AND wp.job_code != 'NEW'
        AND wp.job_name IS NOT NULL
        AND wp.job_name != ''
      GROUP BY wp.job_code, wp.job_name
      HAVING COUNT(*) >= 3
      ORDER BY frequency DESC
      LIMIT 50
    `;

    const [frequentJobs] = await connection.execute(frequentJobsQuery);
    
    console.log(`📊 พบงานที่ทำบ่อย ${frequentJobs.length} งาน (ทำมากกว่า 3 ครั้ง)\n`);
    console.log('='.repeat(100));
    
    // Query 2: ดึงข้อมูลรายละเอียดสำหรับแต่ละงาน (งานล่าสุด)
    for (let i = 0; i < Math.min(frequentJobs.length, 20); i++) {
      const job = frequentJobs[i];
      
      const detailQuery = `
        SELECT 
          wp.id,
          wp.production_date,
          wp.start_time,
          wp.end_time,
          wp.notes,
          pr.room_code,
          pr.room_name,
          m.machine_code,
          m.machine_name,
          GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') as operators
        FROM work_plans wp
        LEFT JOIN production_rooms pr ON wp.production_room_id = pr.id
        LEFT JOIN machines m ON wp.machine_id = m.id
        LEFT JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
        LEFT JOIN users u ON wpo.user_id = u.id
        WHERE wp.job_code = ?
        GROUP BY wp.id, wp.production_date, wp.start_time, wp.end_time, wp.notes, pr.room_code, pr.room_name, m.machine_code, m.machine_name
        ORDER BY wp.production_date DESC, wp.id DESC
        LIMIT 3
      `;
      
      const [details] = await connection.execute(detailQuery, [job.job_code]);
      
      console.log(`\n${i + 1}. ${job.job_name} (${job.job_code})`);
      console.log(`   📈 ทำทั้งหมด: ${job.frequency} ครั้ง`);
      console.log(`   📅 ครั้งแรก: ${job.first_date} | ครั้งล่าสุด: ${job.last_date}`);
      
      if (job.most_common_time) {
        console.log(`   ⏰ เวลาที่ใช้บ่อย: ${job.most_common_time}`);
      }
      if (job.most_common_room) {
        console.log(`   🏭 ห้องผลิตที่ใช้บ่อย: ${job.most_common_room}`);
      }
      if (job.most_common_machine) {
        console.log(`   🔧 เครื่องจักรที่ใช้บ่อย: ${job.most_common_machine}`);
      }
      
      if (details.length > 0) {
        console.log(`   📋 ตัวอย่างงานล่าสุด:`);
        details.forEach((detail, idx) => {
          console.log(`      ${idx + 1}. วันที่ ${detail.production_date}`);
          if (detail.start_time && detail.end_time) {
            console.log(`         เวลา: ${detail.start_time} - ${detail.end_time}`);
          }
          if (detail.room_name) {
            console.log(`         ห้อง: ${detail.room_name} (${detail.room_code})`);
          }
          if (detail.machine_name) {
            console.log(`         เครื่อง: ${detail.machine_name} (${detail.machine_code})`);
          }
          if (detail.operators) {
            console.log(`         ผู้ปฏิบัติงาน: ${detail.operators}`);
          }
          if (detail.notes) {
            console.log(`         หมายเหตุ: ${detail.notes.substring(0, 50)}${detail.notes.length > 50 ? '...' : ''}`);
          }
        });
      }
      
      console.log('-'.repeat(100));
    }

    // Query 3: สรุปสถิติ
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT job_code) as total_unique_jobs,
        COUNT(*) as total_work_plans,
        SUM(CASE WHEN COUNT(*) >= 10 THEN 1 ELSE 0 END) as jobs_10plus,
        SUM(CASE WHEN COUNT(*) >= 5 AND COUNT(*) < 10 THEN 1 ELSE 0 END) as jobs_5to9,
        SUM(CASE WHEN COUNT(*) >= 3 AND COUNT(*) < 5 THEN 1 ELSE 0 END) as jobs_3to4
      FROM (
        SELECT job_code, COUNT(*) as cnt
        FROM work_plans
        WHERE job_code IS NOT NULL AND job_code != '' AND job_code != 'NEW'
        GROUP BY job_code
      ) as job_counts
    `;
    
    const [stats] = await connection.execute(statsQuery);
    
    console.log('\n\n📊 สรุปสถิติ:');
    console.log(`   งานทั้งหมด: ${stats[0].total_unique_jobs} งาน`);
    console.log(`   งานที่ทำมากกว่า 10 ครั้ง: ${stats[0].jobs_10plus} งาน`);
    console.log(`   งานที่ทำ 5-9 ครั้ง: ${stats[0].jobs_5to9} งาน`);
    console.log(`   งานที่ทำ 3-4 ครั้ง: ${stats[0].jobs_3to4} งาน`);

    // Query 4: Top 10 งานที่ทำบ่อยที่สุด
    console.log('\n\n🏆 Top 10 งานที่ทำบ่อยที่สุด:');
    frequentJobs.slice(0, 10).forEach((job, idx) => {
      console.log(`   ${idx + 1}. ${job.job_name} (${job.job_code}) - ${job.frequency} ครั้ง`);
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// รัน script
if (require.main === module) {
  analyzeFrequentJobs()
    .then(() => {
      console.log('\n✅ วิเคราะห์เสร็จสิ้น');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { analyzeFrequentJobs };
