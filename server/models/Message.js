const { query } = require('../config/database');
const User = require('./User');

class Message {
  constructor(data) {
    this.id = data.id;
    this.roomId = data.roomId;
    this.senderId = data.senderId;
    this.content = data.content || '';
    this.type = data.type || 'text';
    this.file = data.file_originalName ? {
      originalName: data.file_originalName,
      fileName: data.file_fileName,
      filePath: data.file_filePath,
      fileSize: data.file_fileSize,
      mimeType: data.file_mimeType
    } : null;
    this.isDeleted = data.isDeleted || false;
    this.createdAt = data.createdAt;
    this.sender = data.sender || null;
  }

  static async create(messageData) {
    const sql = `
      INSERT INTO messages (roomId, senderId, content, type, file_originalName, file_fileName, file_filePath, file_fileSize, file_mimeType, isDeleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `;
    
    // For INSERT, we need to use pool.execute directly to get insertId
    const { pool } = require('../config/database');
    const [result] = await pool.execute(sql, [
      messageData.roomId,
      messageData.senderId,
      messageData.content || '',
      messageData.type || 'text',
      messageData.file?.originalName || null,
      messageData.file?.fileName || null,
      messageData.file?.filePath || null,
      messageData.file?.fileSize || null,
      messageData.file?.mimeType || null
    ]);

    if (!result || !result.insertId) {
      throw new Error('Failed to create message');
    }

    return await this.findById(result.insertId);
  }

  static async findById(id) {
    try {
      const sql = `
        SELECT m.*, 
          u.id as sender_id, u.name as sender_name, u.email as sender_email, 
          u.profileImage as sender_profileImage, u.department as sender_department, 
          u.designation as sender_designation
        FROM messages m
        LEFT JOIN users u ON m.senderId = u.id
        WHERE m.id = ?
      `;
      const rows = await query(sql, [id]);
      if (!rows || !Array.isArray(rows) || rows.length === 0) return null;

      const row = rows[0];
      const message = new Message(row);
      if (row.sender_id) {
        message.sender = {
          _id: row.sender_id,
          id: row.sender_id,
          name: row.sender_name || 'Unknown',
          email: row.sender_email || '',
          profileImage: row.sender_profileImage || '',
          department: row.sender_department || '',
          designation: row.sender_designation || ''
        };
      } else {
        message.sender = null;
      }
      return message;
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  static async findByRoom(roomId, page = 1, limit = 50, includeDeleted = false) {
    try {
      // Ensure roomId is a number
      const roomIdNum = typeof roomId === 'string' ? parseInt(roomId) : Number(roomId);
      
      if (isNaN(roomIdNum)) {
        throw new Error('Invalid room ID');
      }

      const offset = (page - 1) * limit;
      
      // MySQL doesn't support prepared statement parameters for LIMIT and OFFSET
      // So we need to use string interpolation for those, but keep placeholders for roomId
      // Ensure limit and offset are integers to prevent SQL injection
      const limitInt = parseInt(limit, 10);
      const offsetInt = parseInt(offset, 10);
      
      if (isNaN(limitInt) || isNaN(offsetInt) || limitInt < 0 || offsetInt < 0) {
        throw new Error('Invalid limit or offset');
      }
      
      // Build WHERE clause - include deleted messages if requested (for super admin)
      const deletedClause = includeDeleted ? '' : 'AND (m.isDeleted = 0 OR m.isDeleted IS NULL)';
      
      const sql = `
        SELECT m.*, 
          u.id as sender_id, u.name as sender_name, u.email as sender_email, 
          u.profileImage as sender_profileImage, u.department as sender_department, 
          u.designation as sender_designation
        FROM messages m
        LEFT JOIN users u ON m.senderId = u.id
        WHERE m.roomId = ? ${deletedClause}
        ORDER BY m.createdAt DESC
        LIMIT ${limitInt} OFFSET ${offsetInt}
      `;
      
      let rows;
      try {
        rows = await query(sql, [roomIdNum]);
      } catch (queryError) {
        // If table doesn't exist or other SQL error, return empty result
        console.error('Error querying messages:', queryError.message);
        if (queryError.code === 'ER_NO_SUCH_TABLE' || queryError.message.includes("doesn't exist")) {
          console.log('Messages table does not exist yet. Returning empty result.');
          return {
            messages: [],
            total: 0,
            totalPages: 0,
            currentPage: page
          };
        }
        // Re-throw other errors
        throw queryError;
      }
      
      if (!rows || !Array.isArray(rows)) {
        return {
          messages: [],
          total: 0,
          totalPages: 0,
          currentPage: page
        };
      }

      const messages = rows.map(row => {
        const message = new Message(row);
        if (row.sender_id) {
          message.sender = {
            _id: row.sender_id,
            id: row.sender_id,
            name: row.sender_name || 'Unknown',
            email: row.sender_email || '',
            profileImage: row.sender_profileImage || '',
            department: row.sender_department || '',
            designation: row.sender_designation || ''
          };
        } else {
          message.sender = null;
        }
        return message;
      });

      // Get total count
      let total = 0;
      try {
        const countRows = await query(
          'SELECT COUNT(*) as total FROM messages WHERE roomId = ? AND (isDeleted = 0 OR isDeleted IS NULL)',
          [roomIdNum]
        );
        // query returns an array directly
        total = countRows && countRows.length > 0 && countRows[0] ? countRows[0].total : 0;
      } catch (countError) {
        // If table doesn't exist, total is 0
        if (countError.code === 'ER_NO_SUCH_TABLE' || countError.message.includes("doesn't exist")) {
          total = 0;
        } else {
          console.error('Error counting messages:', countError);
          total = 0;
        }
      }

      return {
        messages: messages.reverse(),
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      };
    } catch (error) {
      console.error('Error in findByRoom:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        roomId: roomId,
        page: page,
        limit: limit
      });
      throw error;
    }
  }

  static async findAll(page = 1, limit = 100) {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT m.*, 
        u.id as sender_id, u.name as sender_name, u.email as sender_email, 
        u.profileImage as sender_profileImage, u.department as sender_department, 
        u.designation as sender_designation,
        r.id as room_id, r.name as room_name, r.type as room_type
      FROM messages m
      JOIN users u ON m.senderId = u.id
      JOIN rooms r ON m.roomId = r.id
      WHERE m.isDeleted = FALSE
      ORDER BY m.createdAt DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await query(sql, [limit, offset]);
    if (!rows || !Array.isArray(rows)) {
      return {
        messages: [],
        total: 0,
        totalPages: 0,
        currentPage: page
      };
    }

    const messages = rows.map(row => {
      const message = new Message(row);
      message.sender = {
        _id: row.sender_id,
        id: row.sender_id,
        name: row.sender_name,
        email: row.sender_email,
        profileImage: row.sender_profileImage,
        department: row.sender_department,
        designation: row.sender_designation
      };
      message.room = {
        _id: row.room_id,
        id: row.room_id,
        name: row.room_name,
        type: row.room_type
      };
      return message;
    });

    const countRows = await query('SELECT COUNT(*) as total FROM messages WHERE isDeleted = FALSE');
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    return {
      messages,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  static async count() {
    const rows = await query('SELECT COUNT(*) as total FROM messages WHERE isDeleted = FALSE', []);
    return rows && rows[0] ? rows[0].total : 0;
  }
}

module.exports = Message;
