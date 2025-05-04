// API endpoints
const API_BASE_URL = 'http://localhost:3000/api';

// Utility functions
// Enhanced date formatting function - handles both simple dates and timestamps
const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput; // Return original if invalid
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (date.toDateString() === now.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // For dates more than a day old but less than a week
    const dayDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (dayDiff < 7 && dayDiff > 1) {
        return `${dayDiff} days ago`;
    }
    
    // Default format
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
};

// Dashboard functionality
const updateDashboardStats = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        const stats = await response.json();
        
        document.querySelectorAll('.stat-number').forEach(element => {
            const statType = element.parentElement.querySelector('h3').textContent.toLowerCase();
            element.textContent = stats[statType] || 0;
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
    }
};

// Load all blood requests for admin dashboard
const loadAllBloodRequests = async () => {
    try {
        console.log(`Fetching all blood requests from ${API_BASE_URL}/requests`);
        const response = await fetch(`${API_BASE_URL}/requests`);
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const requests = await response.json();
        
        const tbody = document.querySelector('#recentRequestsTable');
        if (tbody) {
            if (requests.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center">No blood requests found</td></tr>`;
            } else {
                tbody.innerHTML = requests.map(request => `
                    <tr>
                        <td>${request.id}</td>
                        <td>${request.patientName}</td>
                        <td>${request.bloodType}</td>
                        <td>${request.units}</td>
                        <td>${request.hospitalName}</td>
                        <td><span class="badge ${getBadgeClass(request.status)}">${request.status}</span></td>
                        <td>${formatDate(request.date)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading blood requests:', error);
        const tbody = document.querySelector('#recentRequestsTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">Error loading blood requests</td></tr>`;
        }
    }
};

// Load pending blood requests for admin approval
const loadPendingBloodRequests = async () => {
    try {
        console.log(`Fetching pending blood requests from ${API_BASE_URL}/requests`);
        const response = await fetch(`${API_BASE_URL}/requests`);
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const allRequests = await response.json();
        const pendingRequests = allRequests.filter(req => req.status === 'Pending');
        
        const tbody = document.querySelector('#pendingRequestsTable');
        if (tbody) {
            if (pendingRequests.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center">No pending blood requests</td></tr>`;
            } else {
                tbody.innerHTML = pendingRequests.map(request => `
                    <tr>
                        <td>${request.id}</td>
                        <td>${request.patientName}</td>
                        <td>${request.bloodType}</td>
                        <td>${request.units}</td>
                        <td>${request.hospitalName}</td>
                        <td>${formatDate(request.date)}</td>
                        <td class="action-buttons">
                            <button class="btn-approve" onclick="handleRequestAction(${request.id}, 'approve')">Approve</button>
                            <button class="btn-reject" onclick="handleRequestAction(${request.id}, 'reject')">Reject</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading pending blood requests:', error);
        const tbody = document.querySelector('#pendingRequestsTable');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">Error loading pending requests</td></tr>`;
        }
    }
};

// Handle blood request approval or rejection
const handleRequestAction = async (requestId, action) => {
    try {
        const response = await fetch(`${API_BASE_URL}/requests/${requestId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
            // Reload requests and update stats
            loadPendingBloodRequests();
            loadAllBloodRequests();
            updateDashboardStats();
        } else {
            throw new Error(result.error || 'Failed to process request');
        }
    } catch (error) {
        console.error(`Error ${action}ing request:`, error);
        showNotification(error.message || `Failed to ${action} request`, 'error');
    }
};

// Get badges based on status
const getBadgeClass = (status) => {
    switch (status.toLowerCase()) {
        case 'approved':
        case 'completed':
            return 'completed';
        case 'pending':
        case 'processing':
            return 'processing';
        case 'rejected':
            return 'rejected';
        case 'urgent':
            return 'urgent';
        default:
            return 'info';
    }
};

// Load donation camps
const loadCamps = async () => {
    try {
        console.log('Loading donation camps from API');
        const response = await fetch(`${API_BASE_URL}/camps`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const camps = await response.json();
        console.log('Camps data from API:', camps);
        
        // Update camps table if it exists
        const campsTable = document.getElementById('campsTable');
        if (campsTable) {
            campsTable.innerHTML = '';
            
            if (camps.length === 0) {
                campsTable.innerHTML = '<tr><td colspan="7" class="text-center">No donation camps scheduled</td></tr>';
                return;
            }
            
            camps.forEach(camp => {
                // Format date
                const campDate = new Date(camp.date);
                const formattedDate = campDate.toLocaleDateString();
                
                // Determine status
                const today = new Date();
                const campDay = new Date(camp.date);
                let status = camp.status || 'Upcoming';
                let statusClass = 'processing';
                
                if (campDay < today) {
                    status = 'Completed';
                    statusClass = 'completed';
                } else if (Math.abs(campDay - today) / (1000 * 60 * 60 * 24) < 3) {
                    status = 'Upcoming Soon';
                    statusClass = 'urgent';
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${camp.id || camp.Camp_ID}</td>
                    <td>${camp.location}</td>
                    <td>${formattedDate}</td>
                    <td>${camp.time || 'N/A'}</td>
                    <td>${camp.capacity || 'Not specified'}</td>
                    <td><span class="badge ${statusClass}">${status}</span></td>
                    <td>
                        <button class="btn-icon edit" onclick="editCamp(${camp.id || camp.Camp_ID})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete" onclick="deleteCamp(${camp.id || camp.Camp_ID})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                campsTable.appendChild(row);
            });
        }
        
        // Update camps grid if it exists (for the public camps page)
        const campsGrid = document.querySelector('.camps-grid');
        if (campsGrid) {
            campsGrid.innerHTML = '';
            
            if (camps.length === 0) {
                campsGrid.innerHTML = '<div class="empty-message">No donation camps scheduled at this time.</div>';
                return;
            }
            
            camps.forEach(camp => {
                const campDate = new Date(camp.date);
                const formattedDate = campDate.toLocaleDateString();
                
                const campCard = document.createElement('div');
                campCard.className = 'camp-card';
                campCard.innerHTML = `
                    <div class="camp-header">
                        <h3>${camp.location}</h3>
                        <div class="camp-date">
                            <i class="fas fa-calendar-alt"></i> ${formattedDate}
                        </div>
                    </div>
                    <div class="camp-details">
                        <p><i class="fas fa-clock"></i> ${camp.time || 'Time not specified'}</p>
                        <p><i class="fas fa-users"></i> Expected donors: ${camp.capacity || 'Not specified'}</p>
                        <p>${camp.description || 'No additional details available'}</p>
                    </div>
                `;
                campsGrid.appendChild(campCard);
            });
        }
    } catch (error) {
        console.error('Error loading camps:', error);
        
        // Handle error for table view
        const campsTable = document.getElementById('campsTable');
        if (campsTable) {
            campsTable.innerHTML = '<tr><td colspan="7" class="text-center">Error loading donation camps</td></tr>';
        }
        
        // Handle error for grid view
        const campsGrid = document.querySelector('.camps-grid');
        if (campsGrid) {
            campsGrid.innerHTML = '<div class="error-message">Failed to load donation camps. Please try again later.</div>';
        }
    }
};

// Export these functions to window to avoid duplicate declarations
window.loadAllBloodRequests = loadAllBloodRequests;
window.loadPendingBloodRequests = loadPendingBloodRequests;
window.handleRequestAction = handleRequestAction;
window.loadCamps = loadCamps;

// Helper function to format time since a date
const formatTimeSince = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
        return dateString; // Return original string if not a valid date
    }
    
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 7) {
        return date.toLocaleDateString();
    } else if (days > 0) {
        return days === 1 ? 'Yesterday' : days + ' days ago';
    } else if (hours > 0) {
        return hours + ' hours ago';
    } else if (minutes > 0) {
        return minutes + ' minutes ago';
    } else {
        return 'Just now';
    }
};

// Export formatTimeSince to window
window.formatTimeSince = formatTimeSince;

// Donor registration
const handleDonorRegistration = async (event) => {
    event.preventDefault();
    
    // Show loading indicator or disable button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';
    
    const formData = {
        name: document.getElementById('donorName').value,
        dob: document.getElementById('dob').value,
        contact: document.getElementById('contact').value,
        bloodType: document.getElementById('bloodType').value
    };

    // Validate form data
    if (!formData.name || !formData.dob || !formData.contact || !formData.bloodType) {
        showNotification('All fields are required', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        return;
    }

    console.log('Submitting donor data:', formData);

    try {
        const response = await fetch(`${API_BASE_URL}/donors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('Registration success:', data);
            showNotification('Donor registered successfully!');
            event.target.reset();
            loadDonors();
        } else {
            console.error('Registration error:', data);
            const errorMsg = data.details ? `Error: ${data.error} - ${data.details}` : `Error: ${data.error}`;
            showNotification(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error registering donor:', error);
        showNotification('Failed to register donor. Please try again.', 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
};

// Load donors
const loadDonors = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/donors`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const donors = await response.json();
        console.log('Loaded donors:', donors);
        
        const tbody = document.querySelector('#donorsTable tbody');
        if (tbody) {
            if (donors.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No donors registered yet</td></tr>';
                return;
            }
            
            tbody.innerHTML = donors.map(donor => `
                <tr>
                    <td>${donor.Donor_ID}</td>
                    <td>${donor.Donor_Name}</td>
                    <td>${donor.Blood_Type}</td>
                    <td>${donor.Contact_Number}</td>
                    <td>${donor.Last_Donation ? formatDate(donor.Last_Donation) : 'No donation yet'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading donors:', error);
        const tbody = document.querySelector('#donorsTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading donors</td></tr>';
        }
    }
};

// Blood request handling
const handleBloodRequest = async (event) => {
    event.preventDefault();
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    const formData = {
        patientName: document.getElementById('patientName').value,
        hospitalName: document.getElementById('hospitalName').value,
        bloodType: document.getElementById('requestBloodType').value,
        units: parseInt(document.getElementById('units').value)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showNotification('Blood request submitted successfully! Waiting for admin approval.');
            event.target.reset();
            loadBloodRequests();
        } else {
            // Try to get the detailed error message from the response
            const errorData = await response.json().catch(() => ({}));
            if (errorData.error) {
                throw new Error(errorData.error);
            } else {
                throw new Error('Failed to submit blood request');
            }
        }
    } catch (error) {
        console.error('Error submitting blood request:', error);
        showNotification(error.message || 'Failed to submit blood request', 'error');
    } finally {
        // Reset button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
};

// Load blood requests
const loadBloodRequests = async () => {
    try {
        console.log(`Fetching blood requests from ${API_BASE_URL}/requests`);
        const response = await fetch(`${API_BASE_URL}/requests`);
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const requests = await response.json();
        
        const tbody = document.querySelector('#requestsTable tbody');
        if (tbody) {
            if (requests.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center">No blood requests found</td></tr>`;
            } else {
                tbody.innerHTML = requests.map(request => `
                    <tr>
                        <td>${request.id}</td>
                        <td>${request.patientName}</td>
                        <td>${request.bloodType}</td>
                        <td>${request.units}</td>
                        <td>${request.hospitalName}</td>
                        <td><span class="badge ${getBadgeClass(request.status)}">${request.status}</span></td>
                        <td>${formatDate(request.date)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading blood requests:', error);
        const tbody = document.querySelector('#requestsTable tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">Error loading blood requests</td></tr>`;
        }
    }
};

// Load inventory
const loadInventory = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory`);
        const inventory = await response.json();
        
        // Update inventory cards
        Object.entries(inventory).forEach(([bloodType, data]) => {
            const card = document.querySelector(`.inventory-card[data-type="${bloodType}"]`);
            if (card) {
                card.querySelector('.quantity').textContent = `${data.units} units`;
                card.querySelector('.status').textContent = data.status;
            }
        });

        // Update inventory table
        const tbody = document.querySelector('#inventoryTable tbody');
        if (tbody) {
            tbody.innerHTML = Object.entries(inventory).map(([bloodType, data]) => `
                <tr>
                    <td>${bloodType}</td>
                    <td>${data.units}</td>
                    <td>${formatDate(data.lastUpdated)}</td>
                    <td>${data.status}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
};

// Donation camp handling
const handleCampRegistration = async (event) => {
    event.preventDefault();
    
    const formData = {
        location: document.getElementById('campLocation').value,
        date: document.getElementById('campDate').value,
        time: document.getElementById('campTime').value,
        capacity: parseInt(document.getElementById('campCapacity').value),
        description: document.getElementById('campDescription').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/camps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showNotification('Camp registered successfully!');
            event.target.reset();
            loadCamps();
        } else {
            throw new Error('Failed to register camp');
        }
    } catch (error) {
        console.error('Error registering camp:', error);
        showNotification('Failed to register camp', 'error');
    }
};

// Load recent activity
const loadRecentActivity = async () => {
    const activityTableBody = document.getElementById('activityTableBody');
    const regularTable = document.querySelector('#activityTable tbody');
    
    try {
        // Try loading to either table that exists
        const tableToUse = activityTableBody || regularTable;
        if (!tableToUse) return;
        
        // Show loading spinner
        tableToUse.innerHTML = `
            <tr class="activity-loading">
                <td colspan="4">
                    <div class="loading-spinner"></div>
                </td>
            </tr>
        `;
        
        // Fetch data from API
        const response = await fetch(`${API_BASE_URL}/activity/recent`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch activity data');
        }
        
        const activities = await response.json();
        
        // Clear loading spinner
        tableToUse.innerHTML = '';
        
        // If no activities, show empty message
        if (activities.length === 0) {
            tableToUse.innerHTML = `
                <tr>
                    <td colspan="4" class="activity-empty">No recent activities</td>
                </tr>
            `;
            return;
        }
        
        // Process and display activities
        activities.forEach(activity => {
            const date = formatDate(activity.timestamp || activity.date);
            
            // Determine badge class based on status
            let badgeClass = 'info';
            if (activity.status && activity.status.toLowerCase().includes('complete')) badgeClass = 'success';
            if (activity.status && activity.status.toLowerCase().includes('processing')) badgeClass = 'warning';
            if (activity.status && (activity.status.toLowerCase().includes('urgent') || 
                activity.status.toLowerCase().includes('failed'))) badgeClass = 'danger';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="activity-date">${date}</td>
                <td class="activity-type">${activity.type}</td>
                <td class="activity-details">${activity.details}</td>
                <td class="activity-status">
                    <span class="badge ${badgeClass}">${activity.status || 'Unknown'}</span>
                </td>
            `;
            
            tableToUse.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading recent activity:', error);
        const tableToUse = activityTableBody || regularTable;
        if (tableToUse) {
            tableToUse.innerHTML = `
                <tr>
                    <td colspan="4" class="activity-empty">Error loading activities. Please try again later.</td>
                </tr>
            `;
            
            // For demo purposes, show sample data when API fails
            setTimeout(() => {
                if (typeof showSampleActivityData === 'function') {
                    showSampleActivityData();
                }
            }, 1000);
        }
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dashboard
    updateDashboardStats();
    loadRecentActivity();

    // Initialize donors page
    const donorForm = document.getElementById('donorForm');
    if (donorForm) {
        donorForm.addEventListener('submit', handleDonorRegistration);
        loadDonors();
    }

    // Initialize requests page
    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
        requestForm.addEventListener('submit', handleBloodRequest);
        loadBloodRequests();
    }

    // Initialize inventory page
    loadInventory();

    // Initialize camps page
    const campForm = document.getElementById('campForm');
    if (campForm) {
        campForm.addEventListener('submit', handleCampRegistration);
        loadCamps();
    }
    
    // Set up auto-refresh for activity data
    setInterval(loadRecentActivity, 60000);
});

// Add smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Helper function to show sample data when API fails (for demo purposes)
function showSampleActivityData() {
    const activityTableBody = document.getElementById('activityTableBody');
    
    const sampleActivities = [
        {
            date: 'Today, 10:30 AM',
            type: 'Blood Donation',
            details: 'John Smith donated O+ blood',
            status: 'Completed',
            badgeClass: 'success'
        },
        {
            date: 'Today, 11:45 AM',
            type: 'Blood Request',
            details: 'City Hospital requested 3 units of A-',
            status: 'Processing',
            badgeClass: 'warning'
        },
        {
            date: 'Yesterday, 2:15 PM',
            type: 'New Donor',
            details: 'Maria Garcia registered as a donor',
            status: 'Registered',
            badgeClass: 'success'
        },
        {
            date: 'Yesterday, 4:30 PM',
            type: 'Inventory Update',
            details: 'B+ blood stock increased by 5 units',
            status: 'Completed',
            badgeClass: 'success'
        }
    ];
    
    activityTableBody.innerHTML = '';
    
    sampleActivities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="activity-date">${activity.date}</td>
            <td class="activity-type">${activity.type}</td>
            <td class="activity-details">${activity.details}</td>
            <td class="activity-status">
                <span class="badge ${activity.badgeClass}">${activity.status}</span>
            </td>
        `;
        
        activityTableBody.appendChild(row);
    });
}

// Enhanced Profile Section Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Profile tabs functionality
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileContents = document.querySelectorAll('.profile-content');
    
    if (profileTabs.length > 0) {
        profileTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                profileTabs.forEach(t => t.classList.remove('active'));
                profileContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to current tab
                tab.classList.add('active');
                
                // Show corresponding content
                const tabName = tab.getAttribute('data-profile-tab');
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });
    }
    
    // Update profile header with user information
    const updateProfileHeader = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            const userTypeBadge = document.getElementById('profileUserTypeBadge');
            const profileHeaderName = document.getElementById('profileHeaderName');
            const profileHeaderEmail = document.getElementById('profileHeaderEmail');
            const profileBloodBadge = document.getElementById('profileBloodBadge');
            
            if (profileHeaderName) profileHeaderName.textContent = user.fullName || user.username;
            if (profileHeaderEmail) profileHeaderEmail.textContent = user.email || '';
            if (profileBloodBadge) profileBloodBadge.textContent = user.bloodType || 'Unknown';
            
            // Set badge icon based on user type
            if (userTypeBadge) {
                let badgeIcon = 'fa-user';
                let badgeColor = '#4CAF50'; // Default green
                
                switch (user.userType) {
                    case 'donor':
                        badgeIcon = 'fa-tint';
                        badgeColor = '#2196F3'; // Blue
                        break;
                    case 'patient':
                        badgeIcon = 'fa-procedures';
                        badgeColor = '#FFC107'; // Yellow
                        break;
                    case 'both':
                        badgeIcon = 'fa-heart';
                        badgeColor = '#9C27B0'; // Purple
                        break;
                    case 'admin':
                        badgeIcon = 'fa-user-shield';
                        badgeColor = '#F44336'; // Red
                        break;
                }
                
                userTypeBadge.innerHTML = `<i class="fas ${badgeIcon}"></i>`;
                userTypeBadge.style.backgroundColor = badgeColor;
            }
        }
    };
    
    // Handle profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const contactNumber = document.getElementById('profileContact').value;
            const bloodType = document.getElementById('profileBloodType').value;
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/users/profile`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        contactNumber,
                        bloodType
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    
                    // Update local storage
                    const user = JSON.parse(localStorage.getItem('user'));
                    user.contactNumber = contactNumber;
                    user.bloodType = bloodType;
                    localStorage.setItem('user', JSON.stringify(user));
                    
                    // Update profile header
                    updateProfileHeader();
                    
                    showNotification('Profile updated successfully!');
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to update profile');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                showNotification(error.message || 'Failed to update profile', 'error');
            }
        });
    }
    
    // Handle password change form
    const securityForm = document.getElementById('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate passwords
            if (!currentPassword || !newPassword || !confirmPassword) {
                showNotification('All fields are required', 'error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showNotification('New passwords do not match', 'error');
                return;
            }
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/users/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                });
                
                if (response.ok) {
                    // Clear form
                    securityForm.reset();
                    showNotification('Password changed successfully!');
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to change password');
                }
            } catch (error) {
                console.error('Error changing password:', error);
                showNotification(error.message || 'Failed to change password', 'error');
            }
        });
    }
    
    // Handle preferences form
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailNotifications = document.getElementById('emailNotifications').checked;
            const campReminders = document.getElementById('campReminders').checked;
            const privacySettings = document.getElementById('privacySettings').checked;
            
            try {
                // In a real application, this would be sent to the server
                // For now, just show a success notification
                showNotification('Preferences saved successfully!');
            } catch (error) {
                console.error('Error saving preferences:', error);
                showNotification('Failed to save preferences', 'error');
            }
        });
    }
    
    // Initialize profile header on page load if user is logged in
    if (localStorage.getItem('user')) {
        updateProfileHeader();
    }
});