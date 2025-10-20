/**
 * ทดสอบว่าอ่านค่า Environment Variables ได้ถูกต้องหรือไม่
 * รันด้วย: node test-env-variables.js
 */

// โหลด .env.development
require('dotenv').config({ path: './.env.development' });

console.log('========================================');
console.log('📋 Environment Variables Test');
console.log('========================================\n');

console.log('🔵 OLD Database (esp_tracker):');
console.log('   DB_HOST     =', process.env.DB_HOST || 'NOT SET');
console.log('   DB_USER     =', process.env.DB_USER || 'NOT SET');
console.log('   DB_PASSWORD =', process.env.DB_PASSWORD ? '***' : 'NOT SET');
console.log('   DB_NAME     =', process.env.DB_NAME || 'NOT SET');
console.log('   DB_PORT     =', process.env.DB_PORT || 'NOT SET');

console.log('\n🆕 NEW Database (manufacturing_system):');
console.log('   NEW_HOST     =', process.env.NEW_HOST || 'NOT SET');
console.log('   NEW_USER     =', process.env.NEW_USER || 'NOT SET');
console.log('   NEW_PASSWORD =', process.env.NEW_PASSWORD ? '***' : 'NOT SET');
console.log('   NEW_NAME     =', process.env.NEW_NAME || 'NOT SET');
console.log('   NEW_PORT     =', process.env.NEW_PORT || 'NOT SET');

console.log('\n========================================');
console.log('✅ Test Complete');
console.log('========================================\n');

// ตรวจสอบว่าค่าถูกต้องหรือไม่
const checks = [];

if (process.env.NEW_HOST === '192.168.0.96') {
  console.log('✅ NEW_HOST is correct (192.168.0.96)');
} else if (process.env.NEW_HOST) {
  console.log(`⚠️  NEW_HOST = ${process.env.NEW_HOST} (Expected: 192.168.0.96)`);
} else {
  console.log('❌ NEW_HOST is NOT SET in .env.development');
  console.log('   Please add: NEW_HOST=192.168.0.96');
}

if (process.env.NEW_NAME === 'manufacturing_system') {
  console.log('✅ NEW_NAME is correct (manufacturing_system)');
} else {
  console.log('❌ NEW_NAME is incorrect or not set');
}

console.log('');

