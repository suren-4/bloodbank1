// Authentication and Redirection Handler

// List of pages that require authentication
const PROTECTED_PAGES = [
    'donors.html',
    'requests.html',
    'inventory.html',
    'camps.html',
    'user-dashboard.html'
];

// List of pages that should redirect to specific pages after login
const PAGE_REDIRECTS = {
    'donors.html': 'donors',
    'requests.html': 'requests', 
    'inventory.html': 'inventory',
    'camps.html': 'camps'
};

// Check if current page requires authentication
function checkPageProtection() {
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop();
    
    // Skip check for login pages
    if (currentPage === 'user-login.html' || currentPage === 'admin-login.html') {
        return;
    }
    
    // Check if this is a protected page
    const isProtected = PROTECTED_PAGES.includes(currentPage);
    
    if (isProtected) {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));
        
        // If not logged in, redirect to login page
        if (!token || !user) {
            // Store the intended destination
            if (PAGE_REDIRECTS[currentPage]) {
                localStorage.setItem('loginRedirect', PAGE_REDIRECTS[currentPage]);
            }
            
            // Redirect to login page
            window.location.href = 'user-login.html';
        }
    }
}

// Handle nav link clicks for protected pages
function setupProtectedNavLinks() {
    document.querySelectorAll('.nav-links a, .hero-buttons a, .action-card').forEach(link => {
        link.addEventListener('click', function(e) {
            // Get target page from href
            const href = this.getAttribute('href');
            
            // Skip for non-HTML links or anchor links
            if (!href || href.startsWith('#') || !href.endsWith('.html')) {
                return;
            }
            
            // Check if target is a protected page
            const targetPage = href.split('/').pop();
            const isProtected = PROTECTED_PAGES.includes(targetPage);
            
            if (isProtected) {
                // Check if user is logged in
                const token = localStorage.getItem('token');
                const user = JSON.parse(localStorage.getItem('user'));
                
                if (!token || !user) {
                    e.preventDefault();
                    
                    // Store the intended destination
                    if (PAGE_REDIRECTS[targetPage]) {
                        localStorage.setItem('loginRedirect', PAGE_REDIRECTS[targetPage]);
                    }
                    
                    // Redirect to login page
                    window.location.href = 'user-login.html';
                }
            }
        });
    });
}

// Handle redirect after successful login
function handleLoginRedirect() {
    // Check if we're on the login success page (user dashboard)
    if (window.location.pathname.endsWith('user-dashboard.html')) {
        const redirectTarget = localStorage.getItem('loginRedirect');
        
        if (redirectTarget) {
            // Clear the stored redirect
            localStorage.removeItem('loginRedirect');
            
            // Handle specific redirects based on target
            const targetLinks = document.querySelectorAll(`.user-menu a[data-tab="${redirectTarget}"]`);
            if (targetLinks.length > 0) {
                // Click the appropriate tab
                targetLinks[0].click();
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if current page requires auth
    checkPageProtection();
    
    // Set up protection for nav links
    setupProtectedNavLinks();
    
    // Handle redirect after login
    handleLoginRedirect();
}); 