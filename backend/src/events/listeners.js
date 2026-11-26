const events=require('./ticketEvents');
const ActivityLog=require('../models/ActivityLog');
const Notification=require('../models/Notification');
const Ticket=require('../models/Ticket');
const User=require('../models/User');
const realtime=require('../realtime');

// Durable audit trail + in-app notifications from the event stream.
events.on('ticket.activity',async payload=>{
  try{
    await ActivityLog.create(payload);
    const ticket=await Ticket.findById(payload.ticketId).select('createdBy title');
    if(!ticket)return;
    const performedBy=payload.performedBy?.toString();
    const ownerId=ticket.createdBy.toString();
    if(payload.eventType==='TICKET_CREATED'){
      const admins=await User.find({role:'admin'}).select('_id');
      for(const admin of admins){
        const n=await Notification.create({userId:admin._id,ticketId:ticket._id,title:'New support ticket',message:payload.details,type:'ticket_created'});
        realtime.emitUser(admin._id,'notification:new',n);
      }
      return;
    }
    const recipient=performedBy===ownerId?null:ownerId;
    if(recipient){
      const n=await Notification.create({userId:recipient,ticketId:ticket._id,title:'Ticket update',message:payload.details,type:payload.eventType.toLowerCase()});
      realtime.emitUser(recipient,'notification:new',n);
    }else if(performedBy===ownerId){
      const admins=await User.find({role:'admin'}).select('_id');
      for(const admin of admins){
        const n=await Notification.create({userId:admin._id,ticketId:ticket._id,title:'Ticket activity',message:payload.details,type:payload.eventType.toLowerCase()});
        realtime.emitUser(admin._id,'notification:new',n);
      }
    }
  }catch(err){console.error('Ticket event listener:',err.message);}
});
