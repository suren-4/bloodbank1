const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: 'Suren@2006',
    database: process.env.DB_NAME || 'BLOODBANK'
});

// SQL statements to create tables
const createTables = [
    `CREATE TABLE IF NOT EXISTS blood (
        Blood_ID INT PRIMARY KEY AUTO_INCREMENT,
        Blood_Type VARCHAR(5),
        Cost DECIMAL(10,2),
        Donor_ID INT
    )`,
    `CREATE TABLE IF NOT EXISTS bloodbank (
        BloodBank_ID INT PRIMARY KEY AUTO_INCREMENT,
        Blood_Type VARCHAR(5)
    )`,
    `CREATE TABLE IF NOT EXISTS bloodbankmanager (
        Employee_ID INT PRIMARY KEY AUTO_INCREMENT,
        Name VARCHAR(50),
        Contact_Number VARCHAR(15),
        BloodBank_ID INT,
        FOREIGN KEY (BloodBank_ID) REFERENCES bloodbank(BloodBank_ID)
    )`,
    `CREATE TABLE IF NOT EXISTS bloodrequest (
        Request_ID INT PRIMARY KEY AUTO_INCREMENT,
        Blood_Type VARCHAR(5),
        Patient_ID INT,
        Hospital_Name VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS bloodstorage (
        Storage_ID INT PRIMARY KEY AUTO_INCREMENT,
        Blood_ID INT,
        BloodBank_ID INT,
        FOREIGN KEY (Blood_ID) REFERENCES blood(Blood_ID),
        FOREIGN KEY (BloodBank_ID) REFERENCES bloodbank(BloodBank_ID)
    )`,
    `CREATE TABLE IF NOT EXISTS bloodtest (
        Test_ID INT PRIMARY KEY AUTO_INCREMENT,
        Blood_ID INT,
        Test_Result VARCHAR(20),
        FOREIGN KEY (Blood_ID) REFERENCES blood(Blood_ID)
    )`,
    `CREATE TABLE IF NOT EXISTS delivery (
        Delivery_ID INT PRIMARY KEY AUTO_INCREMENT,
        Order_ID INT,
        Patient_ID INT
    )`,
    `CREATE TABLE IF NOT EXISTS donationcamp (
        Camp_ID INT PRIMARY KEY AUTO_INCREMENT,
        Location VARCHAR(50),
        Date DATE
    )`,
    `CREATE TABLE IF NOT EXISTS donor (
        Donor_ID INT PRIMARY KEY AUTO_INCREMENT,
        Donor_Name VARCHAR(50),
        DOB DATE,
        Contact_Number VARCHAR(15)
    )`,
    `CREATE TABLE IF NOT EXISTS donorcamp (
        Donor_ID INT,
        Camp_ID INT,
        PRIMARY KEY (Donor_ID, Camp_ID),
        FOREIGN KEY (Donor_ID) REFERENCES donor(Donor_ID),
        FOREIGN KEY (Camp_ID) REFERENCES donationcamp(Camp_ID)
    )`,
    `CREATE TABLE IF NOT EXISTS hospital (
        Hospital_Name VARCHAR(100) PRIMARY KEY,
        Address VARCHAR(100),
        Contact_Number VARCHAR(15)
    )`,
    `CREATE TABLE IF NOT EXISTS inventory (
        Inventory_ID INT PRIMARY KEY AUTO_INCREMENT,
        BloodBank_ID INT,
        Blood_Type VARCHAR(5),
        Quantity INT DEFAULT 0,
        FOREIGN KEY (BloodBank_ID) REFERENCES bloodbank(BloodBank_ID)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
        Order_ID INT PRIMARY KEY AUTO_INCREMENT,
        Blood_ID INT,
        Hospital_Name VARCHAR(100),
        FOREIGN KEY (Blood_ID) REFERENCES blood(Blood_ID),
        FOREIGN KEY (Hospital_Name) REFERENCES hospital(Hospital_Name)
    )`,
    `CREATE TABLE IF NOT EXISTS patient (
        Patient_ID INT PRIMARY KEY AUTO_INCREMENT,
        Patient_Name VARCHAR(50),
        Contact_Number VARCHAR(15)
    )`,
    `CREATE TABLE IF NOT EXISTS receptionist (
        Employee_ID INT PRIMARY KEY AUTO_INCREMENT,
        Employee_Name VARCHAR(50),
        Contact_Number VARCHAR(15)
    )`
];

// Initialize database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');

    // Create database if it doesn't exist
    db.query('CREATE DATABASE IF NOT EXISTS BLOODBANK', (err) => {
        if (err) {
            console.error('Error creating database:', err);
            return;
        }
        console.log('Database created or already exists');

        // Use the database
        db.query('USE BLOODBANK', (err) => {
            if (err) {
                console.error('Error using database:', err);
                return;
            }
            console.log('Using BLOODBANK database');

            // Create tables one by one
            let completed = 0;
            createTables.forEach((query, index) => {
                db.query(query, (err) => {
                    if (err) {
                        console.error(`Error creating table ${index + 1}:`, err);
                        return;
                    }
                    completed++;
                    console.log(`Table ${index + 1} created successfully`);
                    
                    if (completed === createTables.length) {
                        console.log('All tables created successfully');
                        process.exit(0);
                    }
                });
            });
        });
    });
});

// Add timestamp columns to relevant tables and ensure name fields are consistent

// For donor table, ensure it has donor_name, created_at, and blood_type fields
const createDonorTable = `
CREATE TABLE IF NOT EXISTS donor (
    Donor_ID INT AUTO_INCREMENT PRIMARY KEY,
    Donor_Name VARCHAR(100) NOT NULL,
    DOB DATE NOT NULL,
    Contact_Number VARCHAR(20) NOT NULL,
    Blood_Type VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

// For blood table, ensure proper relationship with donors
const createBloodTable = `
CREATE TABLE IF NOT EXISTS blood (
    Blood_ID INT AUTO_INCREMENT PRIMARY KEY,
    Blood_Type VARCHAR(5) NOT NULL,
    Donor_ID INT,
    Donation_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Donor_ID) REFERENCES donor(Donor_ID)
)`;

// For patient table, ensure it has patient_name field
const createPatientTable = `
CREATE TABLE IF NOT EXISTS patient (
    Patient_ID INT AUTO_INCREMENT PRIMARY KEY,
    Patient_Name VARCHAR(100) NOT NULL,
    Contact_Number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

// For bloodrequest table, ensure it has status, blood_type, created_at fields
const createBloodRequestTable = `
CREATE TABLE IF NOT EXISTS bloodrequest (
    Request_ID INT AUTO_INCREMENT PRIMARY KEY,
    Blood_Type VARCHAR(5) NOT NULL,
    Units INT DEFAULT 1,
    Patient_ID INT,
    Hospital_Name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Patient_ID) REFERENCES patient(Patient_ID)
)`;

// For inventory table, ensure it has quantity field for each blood type
const createInventoryTable = `
CREATE TABLE IF NOT EXISTS inventory (
    Inventory_ID INT AUTO_INCREMENT PRIMARY KEY,
    Blood_Type VARCHAR(5) NOT NULL UNIQUE,
    Quantity INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

// Add a view to join patient and bloodrequest tables for the activity endpoint
const createActivityView = `
CREATE OR REPLACE VIEW blood_activity AS
SELECT 
    'Blood Donation' as type,
    CONCAT(d.Donor_Name, ' donated ', d.Blood_Type, ' blood') as details,
    'Completed' as status,
    d.created_at as timestamp
FROM donor d
UNION
SELECT 
    'Blood Request' as type,
    CONCAT(p.Patient_Name, ' requested ', br.Blood_Type, ' blood') as details,
    br.status,
    br.created_at as timestamp
FROM bloodrequest br
JOIN patient p ON br.Patient_ID = p.Patient_ID
`;

// Initialize blood types in inventory
const initializeInventory = `
INSERT IGNORE INTO inventory (Blood_Type, Quantity) VALUES
    ('A+', 0),
    ('A-', 0),
    ('B+', 0),
    ('B-', 0),
    ('AB+', 0),
    ('AB-', 0),
    ('O+', 0),
    ('O-', 0)
`;

// Add donation camp table
const createDonationCampTable = `
CREATE TABLE IF NOT EXISTS donationcamp (
    Camp_ID INT AUTO_INCREMENT PRIMARY KEY,
    Location VARCHAR(100) NOT NULL,
    Camp_Date DATE NOT NULL,
    Camp_Time TIME NOT NULL,
    Expected_Donors INT DEFAULT 0,
    Description TEXT,
    Status VARCHAR(20) DEFAULT 'Upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

// Execute database creation and table setup
db.query(createDonorTable, (err) => {
    if (err) console.error('Error creating donor table:', err);
    console.log('Donor table created or already exists');
});

db.query(createBloodTable, (err) => {
    if (err) console.error('Error creating blood table:', err);
    console.log('Blood table created or already exists');
});

db.query(createPatientTable, (err) => {
    if (err) console.error('Error creating patient table:', err);
    console.log('Patient table created or already exists');
});

db.query(createBloodRequestTable, (err) => {
    if (err) console.error('Error creating blood request table:', err);
    console.log('Blood request table created or already exists');
});

db.query(createInventoryTable, (err) => {
    if (err) console.error('Error creating inventory table:', err);
    console.log('Inventory table created or already exists');
    
    // Initialize inventory after creating the table
    db.query(initializeInventory, (err) => {
        if (err) console.error('Error initializing inventory:', err);
        console.log('Inventory initialized');
    });
});

db.query(createActivityView, (err) => {
    if (err) console.error('Error creating activity view:', err);
    console.log('Activity view created or replaced');
});

db.query(createDonationCampTable, (err) => {
    if (err) console.error('Error creating donation camp table:', err);
    console.log('Donation camp table created or already exists');
}); 