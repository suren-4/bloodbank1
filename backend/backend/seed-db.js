const mysql = require('mysql2');
const dotenv = require('dotenv');
const { faker } = require('@faker-js/faker');

dotenv.config();

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
        // Generate and insert sample data
        await seedDonors();
        await seedPatients();
        await seedBloodRequests();
        await seedDonationCamps();

        console.log('Database seeded successfully! 🎉');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
});

// Utility to execute queries with promises
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

// Blood type generator
function getRandomBloodType() {
    const types = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const weights = [35, 6, 8, 2, 3, 1, 38, 7]; // Approximate frequency in population
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < types.length; i++) {
        if (random < weights[i]) {
            return types[i];
        }
        random -= weights[i];
    }
    
    return 'O+'; // Default fallback
}

// Seed donors table
async function seedDonors() {
    console.log('Seeding donors...');
    
    // Clear existing data
    await query('TRUNCATE TABLE blood');
    await query('DELETE FROM donor');
    
    // Reset auto-increment
    await query('ALTER TABLE donor AUTO_INCREMENT = 1');
    await query('ALTER TABLE blood AUTO_INCREMENT = 1');
    
    const donorCount = 50;
    
    for (let i = 0; i < donorCount; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const donorName = `${firstName} ${lastName}`;
        const dob = faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0];
        const contactNumber = faker.phone.number('##########');
        const bloodType = getRandomBloodType();
        
        // Insert donor
        const donorResult = await query(
            'INSERT INTO donor (Donor_Name, DOB, Contact_Number, Blood_Type) VALUES (?, ?, ?, ?)',
            [donorName, dob, contactNumber, bloodType]
        );
        
        // Insert blood record
        await query(
            'INSERT INTO blood (Blood_Type, Donor_ID) VALUES (?, ?)',
            [bloodType, donorResult.insertId]
        );
        
        // Update inventory
        await query(
            'UPDATE inventory SET Quantity = Quantity + 1 WHERE Blood_Type = ?',
            [bloodType]
        );
    }
    
    console.log(`✅ Added ${donorCount} donors`);
}

// Seed patients table
async function seedPatients() {
    console.log('Seeding patients...');
    
    // Clear existing data
    await query('DELETE FROM patient');
    
    // Reset auto-increment
    await query('ALTER TABLE patient AUTO_INCREMENT = 1');
    
    const patientCount = 30;
    
    for (let i = 0; i < patientCount; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const patientName = `${firstName} ${lastName}`;
        const contactNumber = faker.phone.number('##########');
        
        // Insert patient
        await query(
            'INSERT INTO patient (Patient_Name, Contact_Number) VALUES (?, ?)',
            [patientName, contactNumber]
        );
    }
    
    console.log(`✅ Added ${patientCount} patients`);
}

// Seed blood requests
async function seedBloodRequests() {
    console.log('Seeding blood requests...');
    
    // Clear existing data
    await query('DELETE FROM bloodrequest');
    
    // Reset auto-increment
    await query('ALTER TABLE bloodrequest AUTO_INCREMENT = 1');
    
    const requestCount = 20;
    const hospitals = [
        'General Hospital',
        'St. Mary Medical Center',
        'Memorial Hospital',
        'University Medical Center',
        'Community Hospital',
        'Children\'s Hospital',
        'Regional Medical Center',
        'Veterans Hospital'
    ];
    
    const statuses = ['Processing', 'Completed', 'Urgent', 'Delivered'];
    
    // Get patients
    const patients = await query('SELECT Patient_ID FROM patient');
    
    if (patients.length === 0) {
        console.log('No patients available for requests. Skipping blood requests.');
        return;
    }
    
    for (let i = 0; i < requestCount; i++) {
        const patientId = patients[Math.floor(Math.random() * patients.length)].Patient_ID;
        const bloodType = getRandomBloodType();
        const units = Math.floor(Math.random() * 3) + 1; // 1-3 units
        const hospitalName = hospitals[Math.floor(Math.random() * hospitals.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Calculate a random date within the last 7 days
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 7));
        
        // Insert blood request with custom created_at timestamp
        await query(
            'INSERT INTO bloodrequest (Blood_Type, Units, Patient_ID, Hospital_Name, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [bloodType, units, patientId, hospitalName, status, date]
        );
    }
    
    console.log(`✅ Added ${requestCount} blood requests`);
}

// Seed donation camps
async function seedDonationCamps() {
    console.log('Seeding donation camps...');
    
    // Clear existing data
    await query('DELETE FROM donationcamp');
    
    // Reset auto-increment
    await query('ALTER TABLE donationcamp AUTO_INCREMENT = 1');
    
    const campCount = 8;
    const locations = [
        'Community Center',
        'University Campus',
        'City Hall',
        'Shopping Mall',
        'Office Park',
        'High School Gymnasium',
        'Public Library',
        'Church Hall'
    ];
    
    const statuses = ['Upcoming', 'Completed', 'In Progress', 'Cancelled'];
    
    for (let i = 0; i < campCount; i++) {
        const location = locations[i % locations.length];
        
        // Generate a future date for upcoming camps (within next 30 days)
        // or a past date for completed camps (within last 30 days)
        const today = new Date();
        let campDate;
        let status;
        
        if (i < campCount / 2) {
            // Upcoming camps
            const daysInFuture = Math.floor(Math.random() * 30) + 1;
            campDate = new Date(today);
            campDate.setDate(today.getDate() + daysInFuture);
            status = 'Upcoming';
        } else {
            // Past camps
            const daysInPast = Math.floor(Math.random() * 30) + 1;
            campDate = new Date(today);
            campDate.setDate(today.getDate() - daysInPast);
            status = 'Completed';
        }
        
        const campTime = `${8 + Math.floor(Math.random() * 10)}:00:00`; // 8 AM to 6 PM
        const expectedDonors = Math.floor(Math.random() * 50) + 20; // 20-70 donors
        const description = `Blood donation camp at ${location}. All blood types needed. Walk-ins welcome.`;
        
        // Insert donation camp
        await query(
            'INSERT INTO donationcamp (Location, Camp_Date, Camp_Time, Expected_Donors, Description, Status) VALUES (?, ?, ?, ?, ?, ?)',
            [location, campDate.toISOString().split('T')[0], campTime, expectedDonors, description, status]
        );
    }
    
    console.log(`✅ Added ${campCount} donation camps`);
} 