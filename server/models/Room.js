const { query } = require('../config/database');
const User = require('./User');

class Room {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description || '';
    this.type = data.type || 'office';
    this.createdBy = data.createdBy;
    this.layout = {
      backgroundImage: data.layout_backgroundImage || '',
      width: data.layout_width || 1920,
      height: data.layout_height || 1080
    };
    this.settings = {
      allowRecording: data.settings_allowRecording !== undefined ? data.settings_allowRecording : true,
      maxParticipants: data.settings_maxParticipants || 50
    };
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isDeleted = data.isDeleted !== undefined ? data.isDeleted : false;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.participants = data.participants || [];
  }

  static async create(roomData) {
    const sql = `
      INSERT INTO rooms (name, description, type, createdBy, layout_backgroundImage, layout_width, layout_height)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    // For INSERT, we need to use pool.execute directly to get insertId
    const { pool } = require('../config/database');
    const [result] = await pool.execute(sql, [
      roomData.name,
      roomData.description || '',
      roomData.type || 'office',
      roomData.createdBy,
      roomData.layout?.backgroundImage || '',
      roomData.layout?.width || 1920,
      roomData.layout?.height || 1080
    ]);

    if (!result || !result.insertId) {
      throw new Error('Failed to create room');
    }

    const room = await this.findById(result.insertId);
    
    // Add creator as participant
    if (roomData.createdBy) {
      await room.addParticipant(roomData.createdBy);
    }

    return room;
  }

  static async findById(id) {
    const sql = `SELECT * FROM rooms WHERE id = ?`;
    const rows = await query(sql, [id]);
    if (!rows || !Array.isArray(rows) || rows.length === 0) return null;

    const room = new Room(rows[0]);
    await room.loadParticipants();
    await room.loadCreator();
    return room;
  }

  static async findAll(userId = null, userRole = null) {
    let sql;
    let params = [];
    
    // Super admin can see all rooms (including soft-deleted), regular users only see non-deleted rooms they're invited to or are participants in
    if (userRole === 'superadmin') {
      sql = `SELECT * FROM rooms WHERE isActive = TRUE ORDER BY createdAt DESC`;
    } else if (userId) {
      sql = `
        SELECT DISTINCT r.* 
        FROM rooms r
        LEFT JOIN room_participants rp ON r.id = rp.roomId AND rp.userId = ?
        LEFT JOIN room_invitations ri ON r.id = ri.roomId AND ri.userId = ? AND ri.status = 'accepted'
        WHERE r.isActive = TRUE 
        AND (r.isDeleted = FALSE OR r.isDeleted IS NULL)
        AND (rp.userId IS NOT NULL OR ri.userId IS NOT NULL OR r.createdBy = ?)
        ORDER BY r.createdAt DESC
      `;
      params = [userId, userId, userId];
    } else {
      sql = `SELECT * FROM rooms WHERE isActive = TRUE AND (isDeleted = FALSE OR isDeleted IS NULL) ORDER BY createdAt DESC`;
    }
    
    const rows = await query(sql, params);
    
    if (!rows || !Array.isArray(rows)) {
      return [];
    }
    
    const rooms = await Promise.all(rows.map(async (row) => {
      const room = new Room(row);
      await room.loadParticipants();
      await room.loadCreator();
      return room;
    }));

    return rooms;
  }

  async loadParticipants() {
    const sql = `
      SELECT u.*, rp.joinedAt 
      FROM room_participants rp
      JOIN users u ON rp.userId = u.id
      WHERE rp.roomId = ?
    `;
    const rows = await query(sql, [this.id]);
    if (!rows || !Array.isArray(rows)) {
      this.participants = [];
      return;
    }
    this.participants = rows.map(row => {
      const user = new User(row);
      const userJson = user.toJSON();
      return userJson;
    });
  }

  async loadCreator() {
    if (this.createdBy) {
      const creator = await User.findById(this.createdBy);
      if (creator) {
        this.createdBy = creator.toJSON();
      }
    }
  }

  async addParticipant(userId) {
    const sql = `
      INSERT IGNORE INTO room_participants (roomId, userId)
      VALUES (?, ?)
    `;
    await query(sql, [this.id, userId]);
    await this.loadParticipants();
  }

  async removeParticipant(userId) {
    const sql = `DELETE FROM room_participants WHERE roomId = ? AND userId = ?`;
    await query(sql, [this.id, userId]);
    await this.loadParticipants();
  }

  async update(updateData) {
    const fields = [];
    const values = [];

    if (updateData.name !== undefined) {
      fields.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(updateData.isActive);
    }
    if (updateData.isDeleted !== undefined) {
      fields.push('isDeleted = ?');
      values.push(updateData.isDeleted);
    }
    if (updateData.layout) {
      if (updateData.layout.backgroundImage !== undefined) {
        fields.push('layout_backgroundImage = ?');
        values.push(updateData.layout.backgroundImage);
      }
      if (updateData.layout.width !== undefined) {
        fields.push('layout_width = ?');
        values.push(updateData.layout.width);
      }
      if (updateData.layout.height !== undefined) {
        fields.push('layout_height = ?');
        values.push(updateData.layout.height);
      }
    }

    if (fields.length === 0) return this;

    values.push(this.id);
    const sql = `UPDATE rooms SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await query(sql, values);

    return await Room.findById(this.id);
  }

  async softDelete() {
    return await this.update({ isDeleted: true });
  }

  async hardDelete() {
    const sql = `DELETE FROM rooms WHERE id = ?`;
    await query(sql, [this.id]);
  }

  async save() {
    if (this.id) {
      return await this.update(this);
    } else {
      return await Room.create(this);
    }
  }
}

module.exports = Room;
