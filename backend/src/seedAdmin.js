require('dotenv').config();
const mongoose = require('mongoose'); const bcrypt = require('bcryptjs'); const User = require('./models/User');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = (process.env.ADMIN_EMAIL || 'admin@helpdesk.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin12345!';
  const existing = await User.findOne({ email });
  if (existing) { existing.role = 'admin'; await existing.save(); console.log('Existing account promoted to admin:', email); }
  else { await User.create({ name: 'HelpDesk Admin', email, password: await bcrypt.hash(password, 12), role: 'admin' }); console.log('Admin account created:', email); }
  console.log('Password:', password, '(change after first login)'); await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
