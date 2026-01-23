const targetDate = process.argv[2] || '2025-11-17';

const { pool } = require('../backend/config/database');

async function run() {
  try {
    const sql = `
      SELECT 
        id,
        DATE_FORMAT(production_date, '%Y-%m-%d') AS production_date,
        job_code,
        job_name,
        job_type,
        workflow_status,
        status_id,
        is_printed
      FROM work_plans
      WHERE DATE(production_date) = ?
      ORDER BY id
    `;
    const [rows] = await pool.query(sql, [targetDate]);
    console.log('📋 work_plans');
    console.table(rows);

    const regularDrafts = rows.filter(
      (row) =>
        row.job_type === 'regular' &&
        String(row.workflow_status || '').toLowerCase() === 'draft'
    );

    console.log(`\nRegular draft count on ${targetDate}:`, regularDrafts.length);
    if (regularDrafts.length > 0) {
      console.table(regularDrafts);
    }

    const draftSql = `
      SELECT 
        id,
        DATE_FORMAT(production_date, '%Y-%m-%d') AS production_date,
        job_code,
        job_name,
        workflow_status_id,
        workflow_status
      FROM work_plan_drafts
      WHERE DATE(production_date) = ?
      ORDER BY id
    `;

    const [draftRows] = await pool.query(draftSql, [targetDate]);
    console.log('\n📝 work_plan_drafts');
    console.table(draftRows);
  } catch (error) {
    console.error('Error querying work_plans:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();

