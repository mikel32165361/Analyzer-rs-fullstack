require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize } = require('./src/config/database');

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Ambil client pertama yang ada
    const [clients] = await sequelize.query("SELECT id, hospital_code FROM client LIMIT 1");
    if (clients.length === 0) {
      console.error('❌ Tidak ada client/rumah sakit di database. Jalankan POST /api/v1/client/register dulu.');
      process.exit(1);
    }
    const clientId = clients[0].id;
    const hospitalCode = clients[0].hospital_code;

    // Ambil atau buat department
    let [depts] = await sequelize.query(`SELECT id FROM departments WHERE rs_id = ${clientId} LIMIT 1`);
    if (depts.length === 0) {
      console.log('⚠️  Tidak ada department, membuat default...');
      await sequelize.query(
        `INSERT INTO departments (name, rs_id, created_at, updated_at) VALUES ('Admin', ${clientId}, NOW(), NOW())`
      );
      [depts] = await sequelize.query(`SELECT id FROM departments WHERE rs_id = ${clientId} LIMIT 1`);
    }
    const deptId = depts[0].id;

    // Cek apakah admin sudah ada
    const [existing] = await sequelize.query("SELECT id FROM users WHERE username = 'admin'");
    if (existing.length > 0) {
      console.log('⚠️  User admin sudah ada!');
      console.log('   Username : admin');
      console.log('   Password : Admin@1234');
      process.exit(0);
    }

    const hashedPassword = bcrypt.hashSync('Admin@1234', 10);
    await sequelize.query(
      `INSERT INTO users (name, username, email, password, rs_id, department_id, hospital_code, created_at, updated_at)
       VALUES ('Administrator', 'admin', 'admin@test.com', '${hashedPassword}', ${clientId}, ${deptId}, '${hospitalCode}', NOW(), NOW())`
    );

    console.log('');
    console.log('✅ User admin berhasil dibuat!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Username  : admin');
    console.log('   Password  : Admin@1234');
    console.log('   Client ID : ' + clientId);
    console.log('   Dept ID   : ' + deptId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
