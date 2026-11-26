const router = require('express').Router();
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const events = require('../events/ticketEvents');
const realtime = require('../realtime');
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect);
const allowed = (ticket, user) => user.role === 'admin' || ticket.createdBy.toString() === user._id.toString();

router.get('/admin/analytics', adminOnly, async (req,res,next)=>{try{const [total,statusRows,priorityRows,categoryRows,trend]=await Promise.all([Ticket.countDocuments(),Ticket.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),Ticket.aggregate([{$group:{_id:'$priority',count:{$sum:1}}}]),Ticket.aggregate([{$group:{_id:'$category',count:{$sum:1}}}]),Ticket.aggregate([{$match:{createdAt:{$gte:new Date(Date.now()-30*24*60*60*1000)}}},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt'}},count:{$sum:1}}},{$sort:{_id:1}}])]);res.json({total,status:statusRows,priority:priorityRows,category:categoryRows,trend});}catch(e){next(e)}});
router.get('/', async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { createdBy: req.user._id };
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.search) query.$or = [{ title: { $regex: req.query.search, $options: 'i' } }, { description: { $regex: req.query.search, $options: 'i' } }];
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10')));
    const [tickets, total] = await Promise.all([Ticket.find(query).populate('createdBy', 'name email').populate('assignedTo', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Ticket.countDocuments(query)]);
    res.json({ tickets, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
});
router.post('/', async (req, res, next) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title?.trim() || !description?.trim()) return res.status(400).json({ message: 'Title and description are required' });
    const ticket = await Ticket.create({ title, description, category, priority, createdBy: req.user._id });
    events.emit('ticket.activity', { ticketId: ticket._id, eventType: 'TICKET_CREATED', performedBy: req.user._id, details: `Ticket created: ${ticket.title}` });
    res.status(201).json({ ticket });
  } catch (e) { next(e); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('createdBy', 'name email').populate('assignedTo', 'name email');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!allowed(ticket, req.user)) return res.status(403).json({ message: 'Not allowed to view this ticket' });
    res.json({ ticket });
  } catch (e) { next(e); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!allowed(ticket, req.user)) return res.status(403).json({ message: 'Not allowed' });
    if (req.user.role !== 'admin' && ticket.status !== 'Open') return res.status(400).json({ message: 'Only open tickets can be edited by users' });
    const fields = ['title', 'description', 'category'];
    if (req.user.role === 'admin') fields.push('priority', 'status');
    fields.forEach(f => { if (req.body[f] !== undefined) ticket[f] = req.body[f]; });
    await ticket.save();
    events.emit('ticket.activity', { ticketId: ticket._id, eventType: 'TICKET_UPDATED', performedBy: req.user._id, details: 'Ticket details updated' });
    res.json({ ticket });
  } catch (e) { next(e); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (req.user.role !== 'admin' && ticket.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not allowed' });
    if (req.user.role !== 'admin' && ticket.status !== 'Open') return res.status(400).json({ message: 'Only open tickets can be deleted' });
    await Promise.all([ticket.deleteOne(), Comment.deleteMany({ ticketId: ticket._id }), ActivityLog.deleteMany({ ticketId: ticket._id })]);
    res.json({ message: 'Ticket deleted' });
  } catch (e) { next(e); }
});
router.patch('/:id/status', adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const old = ticket.status; ticket.status = status; await ticket.save();
    events.emit('ticket.activity', { ticketId: ticket._id, eventType: status === 'Resolved' ? 'TICKET_RESOLVED' : 'STATUS_CHANGED', performedBy: req.user._id, details: `Status changed from ${old} to ${status}` }); realtime.emitTicket(ticket._id,'ticket:updated',{status,priority:ticket.priority});
    res.json({ ticket });
  } catch (e) { next(e); }
});
router.patch('/:id/priority', adminOnly, async (req, res, next) => {
  try {
    if (!['Low', 'Medium', 'High', 'Urgent'].includes(req.body.priority)) return res.status(400).json({ message: 'Invalid priority' });
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { priority: req.body.priority }, { new: true });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    events.emit('ticket.activity', { ticketId: ticket._id, eventType: 'PRIORITY_CHANGED', performedBy: req.user._id, details: `Priority changed to ${ticket.priority}` });
    res.json({ ticket });
  } catch (e) { next(e); }
});
router.get('/:id/comments', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!allowed(ticket, req.user)) return res.status(403).json({ message: 'Not allowed' });
    const comments = await Comment.find({ ticketId: ticket._id }).populate('userId', 'name role').sort({ createdAt: 1 });
    res.json({ comments });
  } catch (e) { next(e); }
});
router.post('/:id/comments', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!allowed(ticket, req.user)) return res.status(403).json({ message: 'Not allowed' });
    const message = req.body.message?.trim();
    if (!message) return res.status(400).json({ message: 'Comment cannot be empty' });
    const comment = await Comment.create({ ticketId: ticket._id, userId: req.user._id, message });
    await comment.populate('userId', 'name role');
    events.emit('ticket.activity', { ticketId: ticket._id, eventType: 'COMMENT_ADDED', performedBy: req.user._id, details: `${req.user.name} added a comment` }); realtime.emitTicket(ticket._id,'comment:new',{comment});
    res.status(201).json({ comment });
  } catch (e) { next(e); }
});
router.get('/:id/activity', async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!allowed(ticket, req.user)) return res.status(403).json({ message: 'Not allowed' });
    const logs = await ActivityLog.find({ ticketId: ticket._id }).populate('performedBy', 'name role').sort({ createdAt: -1 });
    res.json({ logs });
  } catch (e) { next(e); }
});
module.exports = router;
