const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: 'Suren@2006',
    database: process.env.DB_NAME || 'BLOODBANK'
});

// SQL query to create users table
const createUsersTable = `
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donor(Donor_ID) ON DELETE SET NULL,
  FOREIGN KEY (patient_id) REFERENCES patient(Patient_ID) ON DELETE SET NULL
)`;

// Connect and execute query
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
    
    // Create users table
    db.query(createUsersTable, (err, result) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Users table created successfully');
        }
        
        // Close connection
        db.end();
    });
}); 