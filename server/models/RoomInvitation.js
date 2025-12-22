const { query } = require('../config/database');

class RoomInvitation {
  constructor(data) {
    this.id = data.id;
    this.roomId = data.roomId;
    this.userId = data.userId;
    this.invitedBy = data.invitedBy;
    this.status = data.status || 'pending';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async create(invitationData) {
    const sql = `
      INSERT INTO room_invitations (roomId, userId, invitedBy, status)
      VALUES (?, ?, ?, ?)
    `;
    
    const { pool } = require('../config/database');
    const [result] = await pool.execute(sql, [
      invitationData.roomId,
      invitationData.userId,
      invitationData.invitedBy,
      invitationData.status || 'pending'
    ]);

    if (!result || !result.insertId) {
      throw new Error('Failed to create room invitation');
    }

    return await this.findById(result.insertId);
  }

  static async findById(id) {
    const sql = `SELECT * FROM room_invitations WHERE id = ?`;
    const rows = await query(sql, [id]);
    
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return new RoomInvitation(rows[0]);
  }

  static async findByUser(userId) {
    const sql = `
      SELECT ri.*, r.name as roomName, r.description, r.type
      FROM room_invitations ri
      JOIN rooms r ON ri.roomId = r.id
      WHERE ri.userId = ? AND ri.status = 'pending'
      ORDER BY ri.createdAt DESC
    `;
    const rows = await query(sql, [userId]);
    
    if (!rows || !Array.isArray(rows)) {
      return [];
    }

    return rows.map(row => new RoomInvitation(row));
  }

  static async findByRoom(roomId) {
    const sql = `SELECT * FROM room_invitations WHERE roomId = ?`;
    const rows = await query(sql, [roomId]);
    
    if (!rows || !Array.isArray(rows)) {
      return [];
    }

    return rows.map(row => new RoomInvitation(row));
  }

  static async findInvitation(roomId, userId) {
    const sql = `SELECT * FROM room_invitations WHERE roomId = ? AND userId = ?`;
    const rows = await query(sql, [roomId, userId]);
    
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return new RoomInvitation(rows[0]);
  }

  async update(updateData) {
    const fields = [];
    const values = [];

    if (updateData.status !== undefined) {
      fields.push('status = ?');
      values.push(updateData.status);
    }

    if (fields.length === 0) {
      return this;
    }

    values.push(this.id);
    const sql = `UPDATE room_invitations SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await query(sql, values);
    return await RoomInvitation.findById(this.id);
  }

  async delete() {
    const sql = `DELETE FROM room_invitations WHERE id = ?`;
    await query(sql, [this.id]);
  }
}

module.exports = RoomInvitation;

