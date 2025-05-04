const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: 'Suren@2006',
    database: process.env.DB_NAME || 'BLOODBANK'
});

// Connect to database
db.connect(async (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
    
    try {
        // Check if users table exists
        const [tables] = await db.promise().query("SHOW TABLES LIKE 'users'");
        if (tables.length === 0) {
            console.log('No users table found. Creating table...');
            
            // Create users table
            await db.promise().query(`
                CREATE TABLE IF NOT EXISTS users (
                    user_id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    full_name VARCHAR(100) NOT NULL,
                    user_type ENUM('donor', 'patient', 'both') NOT NULL,
                    contact_number VARCHAR(20),
                    blood_type VARCHAR(5),
                    donor_id INT NULL,
                    patient_id INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Users table created.');
            
            // Create a test user
            const hashedPassword = require('bcrypt').hashSync('password123', 10);
            await db.promise().query(`
                INSERT INTO users (username, password, email, full_name, user_type, blood_type)
                VALUES ('testuser', ?, 'test@example.com', 'Test User', 'both', 'O+')
            `, [hashedPassword]);
            console.log('Created test user: testuser / password123');
        }
        
        // List all users
        const [users] = await db.promise().query('SELECT * FROM users');
        console.log(`Found ${users.length} users:`);
        users.forEach(user => {
            console.log(`- ${user.username} (ID: ${user.user_id}, Type: ${user.user_type})`);
            console.log(`  Donor ID: ${user.donor_id || 'None'}, Patient ID: ${user.patient_id || 'None'}`);
        });
        
        if (users.length === 0) {
            console.log('No users found. Creating a default user...');
            // Create a default user
            const hashedPassword = require('bcrypt').hashSync('password123', 10);
            await db.promise().query(`
                INSERT INTO users (username, password, email, full_name, user_type, blood_type)
                VALUES ('testuser', ?, 'test@example.com', 'Test User', 'both', 'O+')
            `, [hashedPassword]);
            console.log('Created default user: testuser / password123');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        db.end();
    }
}); 