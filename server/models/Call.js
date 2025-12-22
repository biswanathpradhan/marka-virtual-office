const { query } = require('../config/database');
const User = require('./User');

class Call {
  constructor(data) {
    this.id = data.id;
    this.roomId = data.roomId;
    this.type = data.type || 'video';
    this.status = data.status || 'active';
    this.recording = {
      isRecording: data.recording_isRecording || false,
      recordingPath: data.recording_recordingPath || null,
      startedAt: data.recording_startedAt || null,
      endedAt: data.recording_endedAt || null
    };
    this.startedAt = data.startedAt;
    this.endedAt = data.endedAt;
    this.duration = data.duration;
    this.participants = data.participants || [];
  }

  static async create(callData) {
    const sql = `
      INSERT INTO calls (roomId, type, status)
      VALUES (?, ?, ?)
    `;
    
    // For INSERT, we need to use pool.execute directly to get insertId
    const { pool } = require('../config/database');
    const [result] = await pool.execute(sql, [
      callData.roomId,
      callData.type || 'video',
      callData.status || 'active'
    ]);

    if (!result || !result.insertId) {
      throw new Error('Failed to create call');
    }

    const call = await this.findById(result.insertId);
    
    // Add initial participant if provided
    if (callData.participants && callData.participants.length > 0) {
      for (const participant of callData.participants) {
        await call.addParticipant(participant.user, participant);
      }
    }

    return call;
  }

  static async findById(id) {
    const sql = `SELECT * FROM calls WHERE id = ?`;
    const rows = await query(sql, [id]);
    if (!rows || !Array.isArray(rows) || rows.length === 0) return null;

    const call = new Call(rows[0]);
    await call.loadParticipants();
    return call;
  }

  async loadParticipants() {
    const sql = `
      SELECT cp.*, u.id as user_id, u.name as user_name, u.profileImage as user_profileImage
      FROM call_participants cp
      JOIN users u ON cp.userId = u.id
      WHERE cp.callId = ? AND cp.leftAt IS NULL
    `;
    const rows = await query(sql, [this.id]);
    if (!rows || !Array.isArray(rows)) {
      this.participants = [];
      return;
    }
    this.participants = rows.map(row => ({
      user: {
        _id: row.user_id,
        id: row.user_id,
        name: row.user_name,
        profileImage: row.user_profileImage
      },
      joinedAt: row.joinedAt,
      leftAt: row.leftAt,
      isVideoEnabled: row.isVideoEnabled,
      isAudioEnabled: row.isAudioEnabled
    }));
  }

  async addParticipant(userId, participantData = {}) {
    const sql = `
      INSERT INTO call_participants (callId, userId, isVideoEnabled, isAudioEnabled)
      VALUES (?, ?, ?, ?)
    `;
    await query(sql, [
      this.id,
      userId,
      participantData.isVideoEnabled !== undefined ? participantData.isVideoEnabled : true,
      participantData.isAudioEnabled !== undefined ? participantData.isAudioEnabled : true
    ]);
    await this.loadParticipants();
  }

  async removeParticipant(userId) {
    const sql = `
      UPDATE call_participants 
      SET leftAt = NOW() 
      WHERE callId = ? AND userId = ? AND leftAt IS NULL
    `;
    await query(sql, [this.id, userId]);
    await this.loadParticipants();
  }

  async update(updateData) {
    const fields = [];
    const values = [];

    if (updateData.status !== undefined) {
      fields.push('status = ?');
      values.push(updateData.status);
    }
    if (updateData.endedAt !== undefined) {
      fields.push('endedAt = ?');
      values.push(updateData.endedAt);
    }
    if (updateData.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updateData.duration);
    }
    if (updateData.recording) {
      if (updateData.recording.isRecording !== undefined) {
        fields.push('recording_isRecording = ?');
        values.push(updateData.recording.isRecording);
      }
      if (updateData.recording.recordingPath !== undefined) {
        fields.push('recording_recordingPath = ?');
        values.push(updateData.recording.recordingPath);
      }
      if (updateData.recording.startedAt !== undefined) {
        fields.push('recording_startedAt = ?');
        values.push(updateData.recording.startedAt);
      }
      if (updateData.recording.endedAt !== undefined) {
        fields.push('recording_endedAt = ?');
        values.push(updateData.recording.endedAt);
      }
    }

    if (fields.length === 0) return this;

    values.push(this.id);
    const sql = `UPDATE calls SET ${fields.join(', ')} WHERE id = ?`;
    await query(sql, values);

    return await Call.findById(this.id);
  }

  async end() {
    const endedAt = new Date();
    const duration = Math.floor((endedAt - this.startedAt) / 1000);
    return await this.update({
      status: 'ended',
      endedAt,
      duration
    });
  }

  static async count() {
    const rows = await query('SELECT COUNT(*) as total FROM calls', []);
    return rows && rows[0] ? rows[0].total : 0;
  }
}

module.exports = Call;
