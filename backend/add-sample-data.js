const mysql = require('mysql2/promise'); // Using the promise wrapper

async function main() {
    // Database connection
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: 'Suren@2006',
        database: process.env.DB_NAME || 'BLOODBANK'
    });
    
    console.log('Connected to MySQL database');
    
    try {
        // Get the current username from command line argument, or use default
        const username = process.argv[2] || 'stark';
        console.log(`Adding sample data for user: ${username}`);
        
        // 1. Fetch user details
        const [userResults] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (userResults.length === 0) {
            console.error(`User ${username} not found. Please provide a valid username.`);
            return;
        }
        
        const user = userResults[0];
        console.log(`Found user: ${user.username} (ID: ${user.user_id})`);
        
        // 2. Create donor record if needed
        let donorId = user.donor_id;
        if (!donorId) {
            console.log('No donor_id found, creating a new donor record...');
            
            // Check if donor table has required columns
            const [donorColumns] = await db.query('SHOW COLUMNS FROM donor');
            const donorFieldsList = donorColumns.map(col => col.Field);
            console.log('Donor table columns:', donorFieldsList);
            
            // Prepare insertion data based on available columns
            const donorData = [];
            const donorFields = [];
            const placeholders = [];
            
            // Add fields that are definitely in the donor table
            donorFields.push('Donor_Name');
            donorData.push(user.full_name || username);
            placeholders.push('?');
            
            if (donorFieldsList.includes('Contact_Number')) {
                donorFields.push('Contact_Number');
                donorData.push(user.contact_number || '123-456-7890');
                placeholders.push('?');
            }
            
            if (donorFieldsList.includes('Blood_Type')) {
                donorFields.push('Blood_Type');
                donorData.push(user.blood_type || 'O+');
                placeholders.push('?');
            }
            
            if (donorFieldsList.includes('DOB')) {
                donorFields.push('DOB');
                donorData.push('1990-01-01');
                placeholders.push('?');
            }
            
            if (donorFieldsList.includes('Last_Donation')) {
                donorFields.push('Last_Donation');
                donorData.push(new Date().toISOString().split('T')[0]);
                placeholders.push('?');
            }
            
            const query = `INSERT INTO donor (${donorFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            console.log('Insert query:', query);
            
            const [donorResult] = await db.query(query, donorData);
            
            donorId = donorResult.insertId;
            console.log(`Created donor with ID: ${donorId}`);
            
            // Update user record with donor ID
            await db.query('UPDATE users SET donor_id = ? WHERE user_id = ?', [donorId, user.user_id]);
            console.log(`Updated user record with donor_id: ${donorId}`);
        } else {
            console.log(`Using existing donor ID: ${donorId}`);
        }
        
        // 3. Create patient record if needed
        let patientId = user.patient_id;
        if (!patientId) {
            console.log('No patient_id found, creating a new patient record...');
            
            // Check if patient table has required columns
            const [patientColumns] = await db.query('SHOW COLUMNS FROM patient');
            const patientFieldsList = patientColumns.map(col => col.Field);
            console.log('Patient table columns:', patientFieldsList);
            
            // Prepare insertion data based on available columns
            const patientData = [];
            const patientFields = [];
            const placeholders = [];
            
            // Add fields that are definitely in the patient table
            patientFields.push('Patient_Name');
            patientData.push(user.full_name || username);
            placeholders.push('?');
            
            if (patientColumns.some(col => col.Field === 'Contact_Number')) {
                patientFields.push('Contact_Number');
                patientData.push(user.contact_number || '123-456-7890');
                placeholders.push('?');
            }
            
            const query = `INSERT INTO patient (${patientFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            console.log('Insert query:', query);
            
            const [patientResult] = await db.query(query, patientData);
            
            patientId = patientResult.insertId;
            console.log(`Created patient with ID: ${patientId}`);
            
            // Update user record with patient ID
            await db.query('UPDATE users SET patient_id = ? WHERE user_id = ?', [patientId, user.user_id]);
            console.log(`Updated user record with patient_id: ${patientId}`);
        } else {
            console.log(`Using existing patient ID: ${patientId}`);
        }
        
        // 4. Add sample blood donations
        const donationDates = [
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),  // 30 days ago
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),  // 90 days ago
            new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)  // 180 days ago
        ];
        
        const bloodType = user.blood_type || 'O+';
        
        // Check blood table columns
        const [bloodColumns] = await db.query('SHOW COLUMNS FROM blood');
        const bloodFieldsList = bloodColumns.map(col => col.Field);
        console.log('Blood table columns:', bloodFieldsList);
        
        for (let i = 0; i < donationDates.length; i++) {
            const donationDate = donationDates[i].toISOString().split('T')[0];
            
            // Prepare insertion data based on available columns
            const bloodData = [];
            const bloodFields = [];
            const placeholders = [];
            
            // Add essential fields
            bloodFields.push('Blood_Type', 'Donor_ID');
            bloodData.push(bloodType, donorId);
            placeholders.push('?', '?');
            
            if (bloodColumns.some(col => col.Field === 'Donation_Date')) {
                bloodFields.push('Donation_Date');
                bloodData.push(donationDate);
                placeholders.push('?');
            }
            
            if (bloodColumns.some(col => col.Field === 'Status')) {
                bloodFields.push('Status');
                bloodData.push('Available');
                placeholders.push('?');
            }
            
            const query = `INSERT INTO blood (${bloodFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            console.log('Insert query:', query);
            
            await db.query(query, bloodData);
            
            // Update inventory
            try {
                await db.query('UPDATE inventory SET Quantity = Quantity + 1 WHERE Blood_Type = ?', [bloodType]);
            } catch (e) {
                console.log('Could not update inventory:', e.message);
            }
            
            console.log(`Added blood donation on ${donationDate}`);
        }
        
        // 5. Add sample blood requests
        const requestStatuses = ['Pending', 'Approved', 'Rejected'];
        const requestDates = [
            new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),  // 15 days ago
            new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),  // 45 days ago
            new Date(Date.now() - 75 * 24 * 60 * 60 * 1000)   // 75 days ago
        ];
        
        // Check bloodrequest table columns
        const [requestColumns] = await db.query('SHOW COLUMNS FROM bloodrequest');
        const requestFieldsList = requestColumns.map(col => col.Field);
        console.log('Blood request table columns:', requestFieldsList);
        
        for (let i = 0; i < requestDates.length; i++) {
            // Prepare insertion data based on available columns
            const requestData = [];
            const requestFields = [];
            const placeholders = [];
            
            // Add essential fields
            requestFields.push('Blood_Type', 'Patient_ID');
            requestData.push(bloodType, patientId);
            placeholders.push('?', '?');
            
            if (requestColumns.some(col => col.Field === 'Hospital_Name')) {
                requestFields.push('Hospital_Name');
                requestData.push('City Hospital');
                placeholders.push('?');
            }
            
            if (requestColumns.some(col => col.Field === 'Units')) {
                requestFields.push('Units');
                requestData.push(i + 1);
                placeholders.push('?');
            }
            
            if (requestColumns.some(col => col.Field === 'Status' || col.Field === 'status')) {
                const statusField = requestColumns.some(col => col.Field === 'Status') ? 'Status' : 'status';
                requestFields.push(statusField);
                requestData.push(requestStatuses[i]);
                placeholders.push('?');
            }
            
            const query = `INSERT INTO bloodrequest (${requestFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
            console.log('Insert query:', query);
            
            await db.query(query, requestData);
            
            console.log(`Added blood request with status: ${requestStatuses[i]}`);
        }
        
        console.log('Sample data added successfully!');
    } catch (error) {
        console.error('Error adding sample data:', error);
    } finally {
        await db.end();
        console.log('Database connection closed');
    }
}

main().catch(console.error); 