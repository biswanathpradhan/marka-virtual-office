const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.profileImage = data.profileImage || '';
    this.department = data.department || '';
    this.designation = data.designation || '';
    this.role = data.role || 'user';
    this.isOnline = data.isOnline || false;
    this.lastSeen = data.lastSeen;
    this.currentRoom = data.currentRoom;
    // Ensure position values are numbers
    const posX = data.position_x !== null && data.position_x !== undefined ? Number(data.position_x) : 0;
    const posY = data.position_y !== null && data.position_y !== undefined ? Number(data.position_y) : 0;
    this.position = {
      x: isNaN(posX) ? 0 : posX,
      y: isNaN(posY) ? 0 : posY
    };
    this.socketId = data.socketId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Convert to JSON (exclude password)
  toJSON() {
    const obj = {
      id: this.id,
      name: this.name,
      email: this.email,
      profileImage: this.profileImage,
      department: this.department,
      designation: this.designation,
      role: this.role,
      isOnline: this.isOnline,
      lastSeen: this.lastSeen,
      currentRoom: this.currentRoom,
      position: this.position,
      socketId: this.socketId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
    return obj;
  }

  // Compare password
  async comparePassword(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Static methods
  static async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const sql = `
      INSERT INTO users (name, email, password, department, designation, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    // For INSERT, we need to use pool.execute directly to get insertId
    const { pool } = require('../config/database');
    const [result] = await pool.execute(sql, [
      userData.name,
      userData.email.toLowerCase(),
      hashedPassword,
      userData.department || '',
      userData.designation || '',
      userData.role || 'user'
    ]);

    if (!result || !result.insertId) {
      throw new Error('Failed to create user');
    }

    return await this.findById(result.insertId);
  }

  static async findById(id) {
    const sql = `SELECT * FROM users WHERE id = ?`;
    const rows = await query(sql, [id]);
    if (!rows || !Array.isArray(rows) || rows.length === 0) return null;
    return new User(rows[0]);
  }

  static async findByEmail(email, includePassword = false) {
    const sql = `SELECT * FROM users WHERE email = ?`;
    const rows = await query(sql, [email.toLowerCase()]);
    if (!rows || !Array.isArray(rows) || rows.length === 0) return null;
    
    const user = new User(rows[0]);
    if (!includePassword) {
      delete user.password;
    }
    return user;
  }

  static async findAll() {
    const sql = `SELECT id, name, email, profileImage, department, designation, role, isOnline, lastSeen, currentRoom, position_x, position_y, createdAt FROM users ORDER BY name`;
    const [rows] = await query(sql);
    return rows.map(row => {
      const user = new User(row);
      delete user.password;
      return user;
    });
  }

  static async findOnline() {
    const sql = `SELECT id, name, email, profileImage, department, designation, isOnline, position_x, position_y FROM users WHERE isOnline = TRUE`;
    const [rows] = await query(sql);
    return rows.map(row => {
      const user = new User(row);
      delete user.password;
      return user;
    });
  }

  async update(updateData) {
    const fields = [];
    const values = [];

    if (updateData.name !== undefined) {
      fields.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.department !== undefined) {
      fields.push('department = ?');
      values.push(updateData.department);
    }
    if (updateData.designation !== undefined) {
      fields.push('designation = ?');
      values.push(updateData.designation);
    }
    if (updateData.profileImage !== undefined) {
      fields.push('profileImage = ?');
      values.push(updateData.profileImage);
    }
    if (updateData.isOnline !== undefined) {
      fields.push('isOnline = ?');
      values.push(updateData.isOnline);
    }
    if (updateData.socketId !== undefined) {
      fields.push('socketId = ?');
      values.push(updateData.socketId);
    }
    if (updateData.currentRoom !== undefined) {
      fields.push('currentRoom = ?');
      values.push(updateData.currentRoom);
    }
    if (updateData.lastSeen !== undefined) {
      fields.push('lastSeen = ?');
      values.push(updateData.lastSeen);
    }
    if (updateData.position) {
      fields.push('position_x = ?');
      fields.push('position_y = ?');
      // Ensure position values are numbers
      const posX = typeof updateData.position.x === 'string' ? parseFloat(updateData.position.x) : Number(updateData.position.x);
      const posY = typeof updateData.position.y === 'string' ? parseFloat(updateData.position.y) : Number(updateData.position.y);
      values.push(isNaN(posX) ? 0 : posX);
      values.push(isNaN(posY) ? 0 : posY);
    }

    if (fields.length === 0) return this;

    values.push(this.id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);

    return await User.findById(this.id);
  }

  async save() {
    if (this.id) {
      return await this.update(this);
    } else {
      return await User.create(this);
    }
  }
}

module.exports = User;
