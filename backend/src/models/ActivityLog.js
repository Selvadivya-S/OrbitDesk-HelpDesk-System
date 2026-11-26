const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  eventType: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model('ActivityLog', logSchema);
