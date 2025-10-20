/**
 * ทดสอบการเชื่อมต่อทั้ง 2 Database พร้อมกัน
 * - esp_tracker (เก่า)
 * - manufacturing_system (ใหม่)
 * 
 * รันด้วย: node test-both-db-connections.js
 */

const { pool, newPool, testAllConnections } = require('./config/database');

async function main() {
  console.log('🚀 Starting Multi-Database Connection Test...\n');
  
  try {
    // ทดสอบทั้ง 2 Database
    await testAllConnections();
    
    // เปรียบเทียบข้อมูล
    console.log('\n📊 Data Comparison:\n');
    
    // 1. Users
    try {
      const [oldUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
      const [newUsers] = await newPool.query('SELECT COUNT(*) as count FROM users');
      console.log('👥 Users:');
      console.log('   Old DB:', oldUsers[0].count, 'records');
      console.log('   New DB:', newUsers[0].count, 'records');
      console.log('   Status:', oldUsers[0].count === newUsers[0].count ? '✅ Same' : '⚠️  Different');
    } catch (err) {
      console.log('⚠️  Users comparison failed:', err.message);
    }
    
    // 2. Machines
    try {
      const [oldMachines] = await pool.query('SELECT COUNT(*) as count FROM machines');
      const [newMachines] = await newPool.query('SELECT COUNT(*) as count FROM machines');
      console.log('\n🔧 Machines:');
      console.log('   Old DB:', oldMachines[0].count, 'records');
      console.log('   New DB:', newMachines[0].count, 'records');
      console.log('   Status:', oldMachines[0].count === newMachines[0].count ? '✅ Same' : '⚠️  Different');
    } catch (err) {
      console.log('⚠️  Machines comparison failed:', err.message);
    }
    
    // 3. Products/FG
    try {
      const [oldFG] = await pool.query('SELECT COUNT(*) as count FROM fg');
      const [newProducts] = await newPool.query('SELECT COUNT(*) as count FROM products');
      console.log('\n📦 Products:');
      console.log('   Old DB (fg):', oldFG[0].count, 'records');
      console.log('   New DB (products):', newProducts[0].count, 'records');
      console.log('   Status:', oldFG[0].count === newProducts[0].count ? '✅ Migrated' : '⚠️  Need Migration');
    } catch (err) {
      console.log('⚠️  Products comparison failed:', err.message);
    }
    
    // 4. Process Templates (ใหม่)
    try {
      const [templates] = await newPool.query('SELECT COUNT(*) as count FROM process_templates');
      console.log('\n📋 Process Templates (New):');
      console.log('   New DB:', templates[0].count, 'records');
      console.log('   Status:', templates[0].count > 0 ? '✅ Has Data' : '⚠️  Empty');
    } catch (err) {
      console.log('⚠️  Process Templates check failed:', err.message);
    }
    
    console.log('\n✅ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    // ปิด connections
    await pool.end();
    await newPool.end();
    console.log('🔌 All connections closed.\n');
  }
}

// Run tests
main().catch(console.error);

