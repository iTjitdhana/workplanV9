/**
 * ทดสอบการเชื่อมต่อ Database ใหม่ (manufacturing_system)
 * รันด้วย: node test-new-db-connection.js
 */

const { newPool, testNewConnection, testAllConnections } = require('./config/database');

async function main() {
  console.log('🚀 Starting Database Connection Test...\n');
  
  try {
    // ทดสอบ Database ใหม่
    await testNewConnection();
    
    // ตัวอย่างการใช้งาน Query
    console.log('\n📊 Testing Queries...\n');
    
    // 1. ทดสอบดึงข้อมูล users
    try {
      const [users] = await newPool.query('SELECT COUNT(*) as count FROM users');
      console.log('✅ Users table:', users[0].count, 'records');
    } catch (err) {
      console.log('⚠️  Users table:', err.message);
    }
    
    // 2. ทดสอบดึงข้อมูล products
    try {
      const [products] = await newPool.query('SELECT COUNT(*) as count FROM products');
      console.log('✅ Products table:', products[0].count, 'records');
    } catch (err) {
      console.log('⚠️  Products table:', err.message);
    }
    
    // 3. ทดสอบดึงข้อมูล process_templates
    try {
      const [templates] = await newPool.query('SELECT COUNT(*) as count FROM process_templates');
      console.log('✅ Process Templates:', templates[0].count, 'records');
    } catch (err) {
      console.log('⚠️  Process Templates:', err.message);
    }
    
    // 4. ทดสอบดึงข้อมูล work_plans
    try {
      const [plans] = await newPool.query('SELECT COUNT(*) as count FROM work_plans');
      console.log('✅ Work Plans:', plans[0].count, 'records');
    } catch (err) {
      console.log('⚠️  Work Plans:', err.message);
    }
    
    // 5. แสดง Tables ทั้งหมด
    console.log('\n📋 All Tables in manufacturing_system:\n');
    const [tables] = await newPool.query('SHOW TABLES');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });
    
    console.log('\n✅ All tests completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    // ปิด connection
    await newPool.end();
    console.log('🔌 Connection closed.\n');
  }
}

// Run tests
main().catch(console.error);

