const mongoose = require('mongoose');
const schema = new mongoose.Schema({ userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}, ticketId:{type:mongoose.Schema.Types.ObjectId,ref:'Ticket'}, title:{type:String,required:true}, message:{type:String,required:true}, type:{type:String,default:'info'}, read:{type:Boolean,default:false} },{timestamps:true});
module.exports=mongoose.model('Notification',schema);
