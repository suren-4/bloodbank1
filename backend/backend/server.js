const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'bloodbank_secret_key';

// Salt rounds for password hashing
const SALT_ROUNDS = 10;

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Suren@2006',
    database: process.env.DB_NAME || 'BLOODBANK'
});

// Function to ensure all required tables exist
function ensureTablesExist() {
    console.log('Checking and creating required tables...');
    
    // Create inventory table if it doesn't exist
    const createInventoryTable = `
        CREATE TABLE IF NOT EXISTS inventory (
            Blood_Type VARCHAR(5) PRIMARY KEY,
            Quantity INT DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `;
    
    db.query(createInventoryTable, (err) => {
        if (err) {
            console.error('Error creating inventory table:', err);
            return;
        }
        
        // Check if inventory has all blood types
        db.query('SELECT COUNT(*) as count FROM inventory', (err, results) => {
            if (err) {
                console.error('Error checking inventory:', err);
                return;
            }
            
            if (results[0].count < 8) {
                // Insert standard blood types if not present
                const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
                
                bloodTypes.forEach(type => {
                    db.query('INSERT IGNORE INTO inventory (Blood_Type, Quantity) VALUES (?, ?)', 
                        [type, Math.floor(Math.random() * 50) + 5], // Random initial quantity
                        (err) => {
                            if (err) console.error(`Error inserting ${type} into inventory:`, err);
                        }
                    );
                });
                
                console.log('Added standard blood types to inventory');
            }
        });
    });
    
    // Create donor table if it doesn't exist
    const createDonorTable = `
        CREATE TABLE IF NOT EXISTS donor (
            Donor_ID INT AUTO_INCREMENT PRIMARY KEY,
            Donor_Name VARCHAR(100) NOT NULL,
            DOB DATE,
            Contact_Number VARCHAR(20),
            Blood_Type VARCHAR(5),
            Last_Donation DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.query(createDonorTable, (err) => {
        if (err) console.error('Error creating donor table:', err);
    });
    
    // Create blood table if it doesn't exist
    const createBloodTable = `
        CREATE TABLE IF NOT EXISTS blood (
            Blood_ID INT AUTO_INCREMENT PRIMARY KEY,
            Blood_Type VARCHAR(5) NOT NULL,
            Donor_ID INT,
            Donation_Date DATE,
            Expiry_Date DATE,
            Status VARCHAR(20) DEFAULT 'Available',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (Donor_ID) REFERENCES donor(Donor_ID) ON DELETE SET NULL
        )
    `;
    
    db.query(createBloodTable, (err) => {
        if (err) console.error('Error creating blood table:', err);
    });
    
    // Create patient table if it doesn't exist
    const createPatientTable = `
        CREATE TABLE IF NOT EXISTS patient (
            Patient_ID INT AUTO_INCREMENT PRIMARY KEY,
            Patient_Name VARCHAR(100) NOT NULL,
            Contact_Number VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.query(createPatientTable, (err) => {
        if (err) console.error('Error creating patient table:', err);
    });
    
    // Create bloodrequest table if it doesn't exist
    const createRequestTable = `
        CREATE TABLE IF NOT EXISTS bloodrequest (
            Request_ID INT AUTO_INCREMENT PRIMARY KEY,
            Blood_Type VARCHAR(5) NOT NULL,
            Patient_ID INT,
            Hospital_Name VARCHAR(100),
            Units INT DEFAULT 1,
            Status VARCHAR(20) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (Patient_ID) REFERENCES patient(Patient_ID) ON DELETE SET NULL
        )
    `;
    
    db.query(createRequestTable, (err) => {
        if (err) console.error('Error creating bloodrequest table:', err);
    });
    
    console.log('Database tables initialized');
}

// Create database if it doesn't exist
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
            
            // Create required tables
            ensureTablesExist();
        });
    });
});

// API Routes

// Get inventory
app.get('/api/inventory', (req, res) => {
    const query = 'SELECT Blood_Type, Quantity FROM inventory';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching inventory:', err);
            res.status(500).json({ error: 'Error fetching inventory' });
            return;
        }
        res.json(results);
    });
});

// Register donor
app.post('/api/donors', (req, res) => {
    console.log('Received donor registration request:', req.body);
    const { name, dob, contact, bloodType } = req.body;
    
    // Get JWT token if present to link with user account
    const authHeader = req.headers.authorization;
    let userId = null;
    let userEmail = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            // Verify token and extract user ID
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
            console.log(`User ${userId} is logged in and registering as donor`);
        } catch (error) {
            console.log('Invalid token, proceeding without linking to user account');
        }
    }
    
    // Validate input
    if (!name || !dob || !contact || !bloodType) {
        console.error('Missing required fields:', { name, dob, contact, bloodType });
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Insert donor
    const query = 'INSERT INTO donor (Donor_Name, DOB, Contact_Number, Blood_Type) VALUES (?, ?, ?, ?)';
    db.query(query, [name, dob, contact, bloodType], (err, result) => {
        if (err) {
            console.error('Error registering donor:', err);
            return res.status(500).json({ 
                error: 'Error registering donor', 
                details: err.message,
                code: err.code
            });
        }

        console.log('Donor inserted successfully with ID:', result.insertId);
        const donorId = result.insertId;
        
        // Link donor to user account if user is logged in
        if (userId) {
            db.query('UPDATE users SET donor_id = ? WHERE user_id = ?', [donorId, userId], (err) => {
                if (err) {
                    console.error('Error linking donor to user account:', err);
                    // Continue with registration even if linking fails
                }
                console.log(`Linked donor ${donorId} to user ${userId}`);
            });
        }
        
        // Insert blood record with current date as Donation_Date
        const bloodQuery = 'INSERT INTO blood (Blood_Type, Donor_ID, Donation_Date) VALUES (?, ?, NOW())';
        db.query(bloodQuery, [bloodType, donorId], (err) => {
            if (err) {
                console.error('Error adding blood record:', err);
                return res.status(500).json({ 
                    error: 'Error adding blood record',
                    details: err.message 
                });
            }

            console.log('Blood record added successfully');
            
            // Update inventory
            const updateQuery = 'UPDATE inventory SET Quantity = Quantity + 1 WHERE Blood_Type = ?';
            db.query(updateQuery, [bloodType], (err) => {
                if (err) {
                    console.error('Error updating inventory:', err);
                    return res.status(500).json({ 
                        error: 'Error updating inventory',
                        details: err.message
                    });
                }
                
                console.log('Inventory updated successfully');
                res.status(200).json({ 
                    message: 'Donor registered successfully',
                    donorId: donorId,
                    linkedToUser: userId ? true : false
                });
            });
        });
    });
});

// Get donors
app.get('/api/donors', (req, res) => {
    const query = `
        SELECT d.Donor_ID, d.Donor_Name, d.Blood_Type
        FROM donor d
        ORDER BY d.Donor_ID DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching donors:', err);
            return res.status(500).json({ error: 'Error fetching donors' });
        }
        
        console.log(`Fetched ${results.length} donors`);
        res.json(results);
    });
});

// Submit blood request
app.post('/api/requests', (req, res) => {
    console.log('Received blood request:', req.body);
    const { patientName, hospitalName, bloodType, units } = req.body;
    
    // Get JWT token if present to link with user account
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            // Verify token and extract user ID
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
            console.log(`User ${userId} is logged in and submitting a blood request`);
        } catch (error) {
            console.log('Invalid token, proceeding without linking to user account');
        }
    }
    
    // Validate required fields
    if (!patientName || !hospitalName || !bloodType || !units) {
        return res.status(400).json({ error: 'Missing required fields. Patient name, hospital name, blood type, and units are required.' });
    }
    
    // Insert patient record
    const patientQuery = 'INSERT INTO patient (Patient_Name, Contact_Number) VALUES (?, ?)';
    db.query(patientQuery, [patientName, ''], (err, result) => {
        if (err) {
            console.error('Error adding patient:', err);
            res.status(500).json({ error: 'Error adding patient', details: err.message });
            return;
        }

        const patientId = result.insertId;
        
        // Link patient to user account if user is logged in
        if (userId) {
            db.query('UPDATE users SET patient_id = ? WHERE user_id = ?', [patientId, userId], (err) => {
                if (err) {
                    console.error('Error linking patient to user account:', err);
                    // Continue with request even if linking fails
                }
                console.log(`Linked patient ${patientId} to user ${userId}`);
            });
        }

        // Insert blood request with "Pending" status
        const requestQuery = 'INSERT INTO bloodrequest (Blood_Type, Patient_ID, Hospital_Name, Units, status) VALUES (?, ?, ?, ?, ?)';
        db.query(requestQuery, [bloodType, patientId, hospitalName, units, 'Pending'], (err, requestResult) => {
            if (err) {
                console.error('Error adding blood request:', err);
                res.status(500).json({ error: 'Error adding blood request', details: err.message });
                return;
            }
            
            console.log('Blood request created successfully with ID:', requestResult.insertId);
            res.json({ 
                message: 'Blood request submitted successfully and waiting for admin approval',
                requestId: requestResult.insertId,
                linkedToUser: userId ? true : false
            });
        });
    });
});

// Get all blood requests
app.get('/api/requests', (req, res) => {
    console.log('GET /api/requests called');
    
    // Simplified query to match the exact field names in the database
    const query = `
        SELECT 
            br.Request_ID as id,
            p.Patient_Name as patientName,
            br.Blood_Type as bloodType,
            br.Units as units,
            br.Hospital_Name as hospitalName,
            br.status as status,
            br.created_at as date
        FROM bloodrequest br
        JOIN patient p ON br.Patient_ID = p.Patient_ID
        ORDER BY br.created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching blood requests:', err);
            res.status(500).json({ error: 'Error fetching blood requests', details: err.message });
            return;
        }
        
        // Format the results to ensure all required fields are present
        const formattedResults = results.map(req => ({
            id: req.id,
            patientName: req.patientName || 'Unknown',
            bloodType: req.bloodType,
            units: req.units || 1,
            hospitalName: req.hospitalName,
            status: req.status || 'Pending',
            date: req.date
        }));
        
        console.log(`Fetched ${results.length} blood requests:`, formattedResults);
        res.json(formattedResults);
    });
});

// Get donor statistics
app.get('/api/stats/donors', (req, res) => {
    console.log('Fetching donor statistics');
    
    // Create a promise for each query
    const donorCountPromise = new Promise((resolve, reject) => {
        db.query('SELECT COUNT(*) as count FROM donor', (err, results) => {
            if (err) {
                console.error('Error counting donors:', err);
                reject(err);
            } else {
                resolve(results[0].count);
            }
        });
    });
    
    const donationCountPromise = new Promise((resolve, reject) => {
        db.query('SELECT COUNT(*) as count FROM blood WHERE Donation_Date IS NOT NULL', (err, results) => {
            if (err) {
                console.error('Error counting donations:', err);
                reject(err);
            } else {
                resolve(results[0].count);
            }
        });
    });
    
    // Wait for all queries to complete
    Promise.all([donorCountPromise, donationCountPromise])
        .then(([totalDonors, totalDonations]) => {
            res.json({
                totalDonors,
                totalDonations
            });
        })
        .catch(error => {
            console.error('Error fetching donor statistics:', error);
            res.status(500).json({ error: 'Error fetching donor statistics' });
        });
});

// Recent Activity Endpoint
app.get('/api/activity/recent', (req, res) => {
    // If database is connected, query for recent activities
    if (db.state === 'connected') {
        // Use the blood_activity view we created
        const query = `
            SELECT * FROM blood_activity
            ORDER BY timestamp DESC
            LIMIT 10
        `;
        
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching recent activities:', err);
                // Fall back to sample data if there's an error
                return res.json(getSampleActivityData());
            }
            
            // If no results from view yet, return sample data
            if (results.length === 0) {
                return res.json(getSampleActivityData());
            }
            
            res.json(results);
        });
    } else {
        // Return sample data if database is not connected
        res.json(getSampleActivityData());
    }
});

// Endpoint for admin to approve or reject blood requests
app.patch('/api/requests/:requestId', (req, res) => {
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    
    if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
    }
    
    // Get the request details first
    const getRequestQuery = 'SELECT Blood_Type, Units FROM bloodrequest WHERE Request_ID = ?';
    db.query(getRequestQuery, [requestId], (err, results) => {
        if (err) {
            console.error('Error fetching request details:', err);
            return res.status(500).json({ error: 'Error fetching request details' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Blood request not found' });
        }
        
        const { Blood_Type, Units } = results[0];
        
        if (action === 'approve') {
            // Check if we have enough blood in inventory
            const checkQuery = 'SELECT Quantity FROM inventory WHERE Blood_Type = ?';
            db.query(checkQuery, [Blood_Type], (err, results) => {
                if (err) {
                    console.error('Error checking inventory:', err);
                    return res.status(500).json({ error: 'Error checking inventory' });
                }
                
                if (results.length === 0 || results[0].Quantity < Units) {
                    return res.status(400).json({ error: 'Not enough blood available in inventory' });
                }
                
                // Update request status
                const updateRequestQuery = 'UPDATE bloodrequest SET status = ? WHERE Request_ID = ?';
                db.query(updateRequestQuery, ['Approved', requestId], (err) => {
                    if (err) {
                        console.error('Error updating request status:', err);
                        return res.status(500).json({ error: 'Error updating request status' });
                    }
                    
                    // Update inventory
                    const updateInventoryQuery = 'UPDATE inventory SET Quantity = Quantity - ? WHERE Blood_Type = ?';
                    db.query(updateInventoryQuery, [Units, Blood_Type], (err) => {
                        if (err) {
                            console.error('Error updating inventory:', err);
                            return res.status(500).json({ error: 'Error updating inventory' });
                        }
                        
                        res.json({ message: 'Blood request approved successfully' });
                    });
                });
            });
        } else {
            // Reject the request
            const updateRequestQuery = 'UPDATE bloodrequest SET status = ? WHERE Request_ID = ?';
            db.query(updateRequestQuery, ['Rejected', requestId], (err) => {
                if (err) {
                    console.error('Error updating request status:', err);
                    return res.status(500).json({ error: 'Error updating request status' });
                }
                
                res.json({ message: 'Blood request rejected' });
            });
        }
    });
});

// Dashboard statistics endpoint
app.get('/api/stats', (req, res) => {
    if (db.state === 'connected') {
        // Query for total donors
        const donorQuery = 'SELECT COUNT(*) as total_donors FROM donor';
        // Query for total blood units available
        const inventoryQuery = 'SELECT SUM(Quantity) as available_units FROM inventory';
        // Query for pending requests
        const requestsQuery = "SELECT COUNT(*) as pending_requests FROM bloodrequest WHERE status = 'Pending'";
        // Query for upcoming camps
        const campsQuery = 'SELECT COUNT(*) as upcoming_camps FROM donationcamp WHERE camp_date >= CURDATE()';
        
        // Execute all queries
        Promise.all([
            new Promise((resolve, reject) => {
                db.query(donorQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0].total_donors);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(inventoryQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0].available_units);
                });
            }),
            new Promise((resolve, reject) => {
                db.query(requestsQuery, (err, results) => {
                    if (err) reject(err);
                    else resolve(results[0].pending_requests);
                });
            }),
            new Promise((resolve, reject) => {
                // Check if the donationcamp table exists first
                db.query("SHOW TABLES LIKE 'donationcamp'", (err, tables) => {
                    if (err) reject(err);
                    else if (tables.length === 0) {
                        // If table doesn't exist yet, return 0
                        resolve(0);
                    } else {
                        db.query(campsQuery, (err, results) => {
                            if (err) reject(err);
                            else resolve(results[0].upcoming_camps);
                        });
                    }
                });
            })
        ])
        .then(([totalDonors, availableUnits, pendingRequests, upcomingCamps]) => {
            res.json({
                'total donors': totalDonors || 0,
                'available units': availableUnits || 0,
                'pending requests': pendingRequests || 0,
                'upcoming camps': upcomingCamps || 0
            });
        })
        .catch(error => {
            console.error('Error fetching stats:', error);
            // Return sample data if error
            res.json(getSampleStats());
        });
    } else {
        // Return sample data if database is not connected
        res.json(getSampleStats());
    }
});

// Helper function for sample activity data
function getSampleActivityData() {
    return [
        {
            type: 'Blood Donation',
            details: 'John Smith donated O+ blood',
            status: 'Completed',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
        },
        {
            type: 'Blood Request',
            details: 'City Hospital requested 3 units of A-',
            status: 'Pending',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
        },
        {
            type: 'New Donor',
            details: 'Maria Garcia registered as a donor',
            status: 'Registered',
            timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() // Yesterday
        },
        {
            type: 'Inventory Update',
            details: 'B+ blood stock increased by 5 units',
            status: 'Completed',
            timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString() // Yesterday
        },
        {
            type: 'Blood Test',
            details: 'Sample #12345 passed all screenings',
            status: 'Completed',
            timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString() // Yesterday
        }
    ];
}

// Helper function for sample stats
function getSampleStats() {
    return {
        'total donors': 1254,
        'available units': 867,
        'pending requests': 42,
        'upcoming camps': 8
    };
}

// Get donation camps
app.get('/api/camps', (req, res) => {
    console.log('GET /api/camps called');
    
    // Check if the donationcamp table exists
    db.query("SHOW TABLES LIKE 'donationcamp'", (err, tables) => {
        if (err) {
            console.error('Error checking donationcamp table:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (tables.length === 0) {
            // If table doesn't exist yet, return empty array
            console.log('Donationcamp table does not exist, returning empty array');
            return res.json([]);
        }
        
        // Check if Camp_Time column exists, and add it if it doesn't
        db.query("SHOW COLUMNS FROM donationcamp LIKE 'Camp_Time'", (err, columns) => {
            if (err) {
                console.error('Error checking for Camp_Time column:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (columns.length === 0) {
                // Add the Camp_Time column if it doesn't exist
                db.query("ALTER TABLE donationcamp ADD COLUMN Camp_Time TIME NOT NULL DEFAULT '00:00:00' AFTER Camp_Date", (err) => {
                    if (err) {
                        console.error('Error adding Camp_Time column:', err);
                        return res.status(500).json({ error: 'Error updating table schema' });
                    }
                    
                    console.log('Added Camp_Time column to donationcamp table');
                    fetchCamps();
                });
            } else {
                fetchCamps();
            }
        });
        
        function fetchCamps() {
            // Query all donation camps
            const query = `
                SELECT 
                    Camp_ID as id,
                    Location as location,
                    Camp_Date as date,
                    Camp_Time as time,
                    Capacity as capacity,
                    Description as description,
                    Status as status,
                    created_at
                FROM donationcamp
                ORDER BY Camp_Date DESC
            `;
            
            db.query(query, (err, results) => {
                if (err) {
                    console.error('Error fetching donation camps:', err);
                    
                    // Check if error is about missing column
                    if (err.code === 'ER_BAD_FIELD_ERROR') {
                        // Try with a simpler query that doesn't use the problematic column
                        const fallbackQuery = `
                            SELECT 
                                Camp_ID as id,
                                Location as location,
                                Camp_Date as date,
                                Camp_Time as time,
                                Description as description,
                                Status as status,
                                created_at
                            FROM donationcamp
                            ORDER BY Camp_Date DESC
                        `;
                        
                        db.query(fallbackQuery, (fallbackErr, fallbackResults) => {
                            if (fallbackErr) {
                                console.error('Error with fallback query:', fallbackErr);
                                return res.status(500).json({ error: 'Database error with fallback query' });
                            }
                            
                            // Map results and add default capacity
                            const camps = fallbackResults.map(camp => ({
                                ...camp,
                                capacity: 0 // Default value when column is missing
                            }));
                            
                            res.json(camps);
                        });
                    } else {
                        return res.status(500).json({ error: 'Database error' });
                    }
                } else {
                    res.json(results);
                }
            });
        }
    });
});

// Register a new donation camp
app.post('/api/camps', (req, res) => {
    console.log('POST /api/camps called with data:', req.body);
    const { location, date, time, capacity, description } = req.body;
    
    // Validate required fields
    if (!location || !date || !time) {
        return res.status(400).json({ error: 'Location, date and time are required' });
    }
    
    // Check if the donationcamp table exists
    db.query("SHOW TABLES LIKE 'donationcamp'", (err, tables) => {
        if (err) {
            console.error('Error checking donationcamp table:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (tables.length === 0) {
            // Create the table if it doesn't exist
            const createTable = `
                CREATE TABLE donationcamp (
                    Camp_ID INT AUTO_INCREMENT PRIMARY KEY,
                    Location VARCHAR(100) NOT NULL,
                    Camp_Date DATE NOT NULL,
                    Camp_Time TIME NOT NULL,
                    Capacity INT DEFAULT 0,
                    Description TEXT,
                    Status VARCHAR(20) DEFAULT 'Upcoming',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            db.query(createTable, (createErr) => {
                if (createErr) {
                    console.error('Error creating donationcamp table:', createErr);
                    return res.status(500).json({ error: 'Error creating donationcamp table' });
                }
                
                insertCamp();
            });
        } else {
            // Check if Capacity column exists, and add it if it doesn't
            db.query("SHOW COLUMNS FROM donationcamp LIKE 'Capacity'", (err, columns) => {
                if (err) {
                    console.error('Error checking Capacity column:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (columns.length === 0) {
                    // Add the Capacity column
                    db.query("ALTER TABLE donationcamp ADD COLUMN Capacity INT DEFAULT 0 AFTER Camp_Time", (alterErr) => {
                        if (alterErr) {
                            console.error('Error adding Capacity column:', alterErr);
                            return res.status(500).json({ error: 'Error updating schema' });
                        }
                        
                        console.log('Added Capacity column to donationcamp table');
                        insertCamp();
                    });
                } else {
                    insertCamp();
                }
            });
        }
        
        function insertCamp() {
            const query = `
                INSERT INTO donationcamp (Location, Camp_Date, Camp_Time, Capacity, Description)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            db.query(query, [location, date, time, capacity || 0, description || ''], (insertErr, result) => {
                if (insertErr) {
                    console.error('Error inserting donation camp:', insertErr);
                    return res.status(500).json({ error: 'Error registering camp' });
                }
                
                console.log(`Camp registered with ID ${result.insertId}`);
                res.status(201).json({
                    id: result.insertId,
                    message: 'Camp registered successfully'
                });
            });
        }
    });
});

// Delete a donation camp
app.delete('/api/camps/:id', (req, res) => {
    const campId = req.params.id;
    console.log(`DELETE /api/camps/${campId} called`);
    
    // Check if the donationcamp table exists
    db.query("SHOW TABLES LIKE 'donationcamp'", (err, tables) => {
        if (err) {
            console.error('Error checking donationcamp table:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (tables.length === 0) {
            return res.status(404).json({ error: 'Donation camp not found' });
        }
        
        // Delete the camp
        const query = 'DELETE FROM donationcamp WHERE Camp_ID = ?';
        db.query(query, [campId], (err, result) => {
            if (err) {
                console.error('Error deleting donation camp:', err);
                return res.status(500).json({ error: 'Error deleting donation camp' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Donation camp not found' });
            }
            
            console.log(`Donation camp ${campId} deleted successfully`);
            res.json({ message: 'Donation camp deleted successfully' });
        });
    });
});

// Function to link user with donor/patient records
function linkUserRecords(userId, userType, email, contactNumber, res = null) {
    console.log(`Attempting to link user ID ${userId} of type ${userType} with existing records`);
    
    // Link with donor record if user is donor or both
    if (userType === 'donor' || userType === 'both') {
        // Try to find a donor with matching contact number or email
        const findDonorQuery = 'SELECT Donor_ID FROM donor WHERE Contact_Number = ? LIMIT 1';
        db.query(findDonorQuery, [contactNumber], (err, results) => {
            if (err) {
                console.error('Error finding donor record:', err);
                return;
            }
            
            if (results.length > 0) {
                const donorId = results[0].Donor_ID;
                console.log(`Found donor record with ID ${donorId}, linking to user ${userId}`);
                
                // Update user with donor ID
                db.query('UPDATE users SET donor_id = ? WHERE user_id = ?', [donorId, userId], (err) => {
                    if (err) {
                        console.error('Error linking donor record:', err);
                    } else {
                        console.log(`Successfully linked donor ID ${donorId} to user ${userId}`);
                        if (res) {
                            // If response object provided, update the response
                            res.locals.donorId = donorId;
                        }
                    }
                });
            } else {
                console.log(`No matching donor record found for user ${userId}`);
            }
        });
    }
    
    // Link with patient record if user is patient or both
    if (userType === 'patient' || userType === 'both') {
        // Try to find a patient with matching contact number
        const findPatientQuery = 'SELECT Patient_ID FROM patient WHERE Contact_Number = ? LIMIT 1';
        db.query(findPatientQuery, [contactNumber], (err, results) => {
            if (err) {
                console.error('Error finding patient record:', err);
                return;
            }
            
            if (results.length > 0) {
                const patientId = results[0].Patient_ID;
                console.log(`Found patient record with ID ${patientId}, linking to user ${userId}`);
                
                // Update user with patient ID
                db.query('UPDATE users SET patient_id = ? WHERE user_id = ?', [patientId, userId], (err) => {
                    if (err) {
                        console.error('Error linking patient record:', err);
                    } else {
                        console.log(`Successfully linked patient ID ${patientId} to user ${userId}`);
                        if (res) {
                            // If response object provided, update the response
                            res.locals.patientId = patientId;
                        }
                    }
                });
            } else {
                console.log(`No matching patient record found for user ${userId}`);
            }
        });
    }
}

// User Registration Endpoint
app.post('/api/users/register', async (req, res) => {
    const { username, password, email, fullName, userType, contactNumber, bloodType } = req.body;
    
    // Validate required fields
    if (!username || !password || !email || !fullName || !userType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        // Check if username or email already exists
        const checkQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';
        db.query(checkQuery, [username, email], async (err, results) => {
            if (err) {
                console.error('Error checking existing user:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            if (results.length > 0) {
                return res.status(409).json({ error: 'Username or email already exists' });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            
            // Insert new user
            const insertQuery = `
                INSERT INTO users (username, password, email, full_name, user_type, contact_number, blood_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.query(
                insertQuery, 
                [username, hashedPassword, email, fullName, userType, contactNumber, bloodType],
                (err, result) => {
                    if (err) {
                        console.error('Error creating user:', err);
                        return res.status(500).json({ error: 'Error creating user', details: err.message });
                    }
                    
                    // Create token
                    const token = jwt.sign(
                        { userId: result.insertId, username, userType },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    
                    // Link user with any existing donor/patient records
                    linkUserRecords(result.insertId, userType, email, contactNumber);

                    res.status(201).json({
                        message: 'User registered successfully',
                        token,
                        user: {
                            id: result.insertId,
                            username,
                            email,
                            fullName,
                            userType
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error in user registration:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// User Login Endpoint
app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    try {
        // Find user by username
        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], async (err, results) => {
            if (err) {
                console.error('Error finding user:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }
            
            const user = results[0];
            
            // Compare passwords
            const passwordMatch = await bcrypt.compare(password, user.password);
            
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }
            
            // If user is not linked with donor/patient records, try to link
            if (!user.donor_id && !user.patient_id) {
                linkUserRecords(user.user_id, user.user_type, user.email, user.contact_number);
            }
            
            // Create token
            const token = jwt.sign(
                { 
                    userId: user.user_id, 
                    username: user.username, 
                    userType: user.user_type,
                    donorId: user.donor_id,
                    patientId: user.patient_id
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.user_id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    userType: user.user_type,
                    donorId: user.donor_id,
                    patientId: user.patient_id
                }
            });
        });
    } catch (error) {
        console.error('Error in user login:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// User Profile Endpoint
app.get('/api/users/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user profile
        const query = 'SELECT user_id, username, email, full_name, user_type, contact_number, blood_type, donor_id, patient_id FROM users WHERE user_id = ?';
        db.query(query, [decoded.userId], (err, results) => {
            if (err) {
                console.error('Error fetching user profile:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = results[0];
            res.json({
                id: user.user_id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                userType: user.user_type,
                contactNumber: user.contact_number,
                bloodType: user.blood_type,
                donorId: user.donor_id,
                patientId: user.patient_id
            });
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// Get User Donations
app.get('/api/users/donations', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user and try to determine donor ID in different ways
        const query = `
            SELECT u.user_id, u.username, u.full_name, u.contact_number, u.blood_type, u.donor_id, d.Donor_ID as matched_donor_id
            FROM users u
            LEFT JOIN donor d ON (u.contact_number = d.Contact_Number OR u.donor_id = d.Donor_ID)
            WHERE u.user_id = ?
            LIMIT 1
        `;
        
        db.query(query, [decoded.userId], (err, results) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = results[0];
            // Use donor_id from user record or the matched donor record
            const donorId = user.donor_id || user.matched_donor_id;
            
            if (!donorId) {
                console.log(`No donor ID found for user ${decoded.userId}, returning empty donations list`);
                return res.json([]);  // User has no donations
            }
            
            // Update user record with linked donor ID if needed
            if (!user.donor_id && user.matched_donor_id) {
                console.log(`Updating user ${decoded.userId} with matched donor ID ${user.matched_donor_id}`);
                db.query('UPDATE users SET donor_id = ? WHERE user_id = ?', [user.matched_donor_id, user.user_id]);
            }
            
            // Get donations
            const donationsQuery = `
                SELECT b.Blood_ID, b.Blood_Type, b.Donation_Date, d.Donor_Name
                FROM blood b
                JOIN donor d ON b.Donor_ID = d.Donor_ID
                WHERE b.Donor_ID = ?
                ORDER BY b.Donation_Date DESC
            `;
            
            db.query(donationsQuery, [donorId], (err, donations) => {
                if (err) {
                    console.error('Error fetching donations:', err);
                    return res.status(500).json({ error: 'Error fetching donations', details: err.message });
                }
                
                console.log(`Found ${donations.length} donations for donor ID ${donorId}`);
                res.json(donations);
            });
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// Get User Blood Requests
app.get('/api/users/requests', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user and try to determine patient ID in different ways
        const query = `
            SELECT u.user_id, u.username, u.full_name, u.contact_number, u.patient_id, p.Patient_ID as matched_patient_id
            FROM users u
            LEFT JOIN patient p ON (u.contact_number = p.Contact_Number OR u.patient_id = p.Patient_ID)
            WHERE u.user_id = ?
            LIMIT 1
        `;
        
        db.query(query, [decoded.userId], (err, results) => {
            if (err) {
                console.error('Error fetching user:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = results[0];
            // Use patient_id from user record or the matched patient record
            const patientId = user.patient_id || user.matched_patient_id;
            
            if (!patientId) {
                console.log(`No patient ID found for user ${decoded.userId}, returning empty requests list`);
                return res.json([]);  // User has no requests
            }
            
            // Update user record with linked patient ID if needed
            if (!user.patient_id && user.matched_patient_id) {
                console.log(`Updating user ${decoded.userId} with matched patient ID ${user.matched_patient_id}`);
                db.query('UPDATE users SET patient_id = ? WHERE user_id = ?', [user.matched_patient_id, user.user_id]);
            }
            
            // Get requests
            const requestsQuery = `
                SELECT 
                    br.Request_ID, 
                    br.Blood_Type, 
                    br.Units, 
                    br.Hospital_Name, 
                    br.status, 
                    br.created_at
                FROM bloodrequest br
                WHERE br.Patient_ID = ?
                ORDER BY br.created_at DESC
            `;
            
            db.query(requestsQuery, [patientId], (err, requests) => {
                if (err) {
                    console.error('Error fetching requests:', err);
                    return res.status(500).json({ error: 'Error fetching requests', details: err.message });
                }
                
                console.log(`Found ${requests.length} requests for patient ID ${patientId}`);
                res.json(requests);
            });
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 