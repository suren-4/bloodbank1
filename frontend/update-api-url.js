/**
 * Utility script to update API URLs in frontend files after deployment
 * 
 * Usage: 
 * 1. Update the NEW_API_BASE_URL constant below with your production API URL
 * 2. Run: node update-api-url.js
 */

const fs = require('fs');
const path = require('path');

// Set your production API URL here
const NEW_API_BASE_URL = 'https://bloodbank-api.onrender.com/api';
const OLD_API_BASE_URL = 'http://localhost:3000/api';

// List of files to update
const FILES_TO_UPDATE = [
  'user-dashboard.html',
  'donors.html',
  'requests.html',
  'inventory.html',
  'admin-dashboard.html',
  'camps.html',
  'index.html',
  'script.js'
];

console.log(`Starting API URL update process...`);
console.log(`Replacing: ${OLD_API_BASE_URL}`);
console.log(`With: ${NEW_API_BASE_URL}`);

let updatedCount = 0;

// Process each file
FILES_TO_UPDATE.forEach(fileName => {
  const filePath = path.join(__dirname, fileName);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${fileName}`);
    return;
  }
  
  try {
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains the API URL
    if (content.includes(OLD_API_BASE_URL)) {
      // Replace all occurrences
      content = content.split(OLD_API_BASE_URL).join(NEW_API_BASE_URL);
      
      // Write updated content back to file
      fs.writeFileSync(filePath, content, 'utf8');
      
      console.log(`✅ Updated: ${fileName}`);
      updatedCount++;
    } else {
      console.log(`ℹ️ No API URLs found in: ${fileName}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message);
  }
});

console.log(`\nProcess completed.`);
console.log(`Updated ${updatedCount} file(s) out of ${FILES_TO_UPDATE.length}`);
console.log(`Remember to test your application after deployment!`); 