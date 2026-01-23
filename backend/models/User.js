const { pool } = require('../config/database');

class User {
  // Get all users
  static async getAll() {
    try {
      const query = `
        SELECT 
          id,
          id_code,
          name
        FROM users
        WHERE id_code NOT IN ('EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'EMP006', 'EMP007', 'EMP008', 'EMP009')
          AND (is_active = 1 OR is_active IS NULL)
        ORDER BY name
      `;
      
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }
  }

  // Get user by ID
  static async getById(id) {
    try {
      const query = `
        SELECT 
          id,
          id_code,
          name
        FROM users
        WHERE id = ?
      `;
      
      const [rows] = await pool.execute(query, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`Error fetching user: ${error.message}`);
    }
  }

  // Get user by ID code
  static async getByIdCode(idCode) {
    try {
      const query = `
        SELECT 
          id,
          id_code,
          name
        FROM users
        WHERE id_code = ?
      `;
      
      const [rows] = await pool.execute(query, [idCode]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`Error fetching user by ID code: ${error.message}`);
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const { id_code, name } = userData;
      
      const query = `
        INSERT INTO users (id_code, name)
        VALUES (?, ?)
      `;
      
      const [result] = await pool.execute(query, [id_code, name]);
      
      return { id: result.insertId, ...userData };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('ID code already exists');
      }
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Update user
  static async update(id, userData) {
    try {
      const { id_code, name } = userData;
      
      const query = `
        UPDATE users 
        SET id_code = ?, name = ?
        WHERE id = ?
      `;
      
      const [result] = await pool.execute(query, [id_code, name, id]);
      
      return result.affectedRows > 0 ? { id, ...userData } : null;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('ID code already exists');
      }
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Delete user
  static async delete(id) {
    try {
      const query = 'DELETE FROM users WHERE id = ?';
      const [result] = await pool.execute(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // Get user work plans
  static async getUserWorkPlans(userId, date = null) {
    try {
      let query = `
        SELECT 
          wp.id,
          wp.production_date,
          wp.job_code,
          wp.job_name,
          wp.start_time,
          wp.end_time,
          ff.is_finished
        FROM work_plans wp
        JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
        LEFT JOIN finished_flags ff ON wp.id = ff.work_plan_id
        WHERE wpo.user_id = ?
      `;
      
      const params = [userId];
      
      if (date) {
        query += ' AND wp.production_date = ?';
        params.push(date);
      }
      
      query += ' ORDER BY wp.production_date DESC, wp.start_time ASC';
      
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching user work plans: ${error.message}`);
    }
  }

  // Get user work plans by ID code
  static async getUserWorkPlansByIdCode(idCode, date = null) {
    try {
      let query = `
        SELECT 
          wp.id,
          wp.production_date,
          wp.job_code,
          wp.job_name,
          wp.start_time,
          wp.end_time,
          ff.is_finished
        FROM work_plans wp
        JOIN work_plan_operators wpo ON wp.id = wpo.work_plan_id
        LEFT JOIN finished_flags ff ON wp.id = ff.work_plan_id
        WHERE wpo.id_code = ?
      `;
      
      const params = [idCode];
      
      if (date) {
        query += ' AND wp.production_date = ?';
        params.push(date);
      }
      
      query += ' ORDER BY wp.production_date DESC, wp.start_time ASC';
      
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error fetching user work plans by ID code: ${error.message}`);
    }
  }

  // Check if user exists
  static async exists(id) {
    try {
      const query = 'SELECT COUNT(*) as count FROM users WHERE id = ?';
      const [rows] = await pool.execute(query, [id]);
      
      return rows[0].count > 0;
    } catch (error) {
      throw new Error(`Error checking user existence: ${error.message}`);
    }
  }

  // Check if ID code exists
  static async idCodeExists(idCode, excludeId = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users WHERE id_code = ?';
      const params = [idCode];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const [rows] = await pool.execute(query, params);
      
      return rows[0].count > 0;
    } catch (error) {
      throw new Error(`Error checking ID code existence: ${error.message}`);
    }
  }
}

module.exports = User; 