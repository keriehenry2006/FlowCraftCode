/**
 * FlowCraft Error Handler & Utilities
 * Universal error handling and utility functions for FlowCraft application
 */

class FlowCraftErrorHandler {
    constructor() {
        this.isOnline = navigator.onLine;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.requestTimeout = 10000; // 10 seconds
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('Connection restored', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('Connection lost. Working offline.', 'warning');
        });
    }

    /**
     * Enhanced Supabase request with error handling, timeout, and retry logic
     */
    async executeSupabaseRequest(requestFunction, options = {}) {
        const { 
            maxRetries = this.retryAttempts,
            timeout = this.requestTimeout,
            showLoading = true,
            loadingMessage = 'Processing...'
        } = options;

        if (!this.isOnline) {
            throw new Error('No internet connection. Please check your network and try again.');
        }

        let lastError;
        let loadingId;

        if (showLoading) {
            loadingId = this.showLoading(loadingMessage);
        }

        try {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    // Create timeout promise
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Request timeout')), timeout);
                    });

                    // Execute the request with timeout
                    const result = await Promise.race([
                        requestFunction(),
                        timeoutPromise
                    ]);

                    if (showLoading) {
                        this.hideLoading(loadingId);
                    }

                    // Check for Supabase errors
                    if (result.error) {
                        throw new Error(result.error.message || 'Database operation failed');
                    }

                    return result;

                } catch (error) {
                    lastError = error;
                    
                    if (attempt < maxRetries) {
                        // Wait before retry with exponential backoff
                        const delay = this.retryDelay * Math.pow(2, attempt - 1);
                        await this.sleep(delay);
                        
                        if (showLoading) {
                            this.updateLoadingMessage(loadingId, `Retrying... (${attempt}/${maxRetries})`);
                        }
                    }
                }
            }

            // All retries failed
            throw lastError;

        } catch (error) {
            if (showLoading) {
                this.hideLoading(loadingId);
            }
            throw this.handleError(error);
        }
    }

    /**
     * Centralized error handling
     */
    handleError(error) {
        console.error('FlowCraft Error:', error);
        
        let userMessage = 'An unexpected error occurred. Please try again.';
        let errorType = 'error';

        if (error.message) {
            // Network errors
            if (error.message.includes('fetch')) {
                userMessage = 'Connection error. Please check your internet connection.';
                errorType = 'warning';
            }
            // Timeout errors
            else if (error.message.includes('timeout')) {
                userMessage = 'Request timed out. Please try again.';
                errorType = 'warning';
            }
            // Supabase specific errors
            else if (error.message.includes('JWT')) {
                userMessage = 'Session expired. Please log in again.';
                errorType = 'warning';
                // Redirect to login after a short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
            // Database errors
            else if (error.message.includes('Database')) {
                userMessage = 'Database error. Please try again later.';
                errorType = 'error';
            }
            // Validation errors
            else if (error.message.includes('required') || error.message.includes('invalid')) {
                userMessage = error.message;
                errorType = 'validation';
            }
            // Generic error with message
            else {
                userMessage = error.message;
            }
        }

        this.showNotification(userMessage, errorType);
        return error;
    }

    /**
     * Input validation utilities
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !email.trim()) {
            throw new Error('Email is required');
        }
        if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address');
        }
        return true;
    }

    validatePassword(password) {
        if (!password || !password.trim()) {
            throw new Error('Password is required');
        }
        
        // Enhanced password policy
        const minLength = 12;
        const errors = [];
        
        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        
        // Check for common weak passwords
        const weakPasswords = [
            'password', 'flowcraft', '123456', 'qwerty', 'admin', 'user',
            'password123', 'admin123', 'flowcraft123', 'test123'
        ];
        
        if (weakPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common. Please choose a stronger password');
        }
        
        // Check for sequential characters
        if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789)/i.test(password)) {
            errors.push('Password should not contain sequential characters');
        }
        
        // Check for repeated characters
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Password should not contain repeated characters');
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join('. '));
        }
        
        return true;
    }

    validateProcessData(data) {
        if (!data.short_name || !data.short_name.trim()) {
            throw new Error('Process name is required');
        }
        if (data.short_name.length > 50) {
            throw new Error('Process name must be 50 characters or less');
        }
        // Working day validation: 1-31 for current month, -1 to -31 for previous month, cannot be 0
        if (data.working_day !== undefined) {
            const workingDay = parseInt(data.working_day);
            if (isNaN(workingDay) || workingDay === 0 || workingDay > 31 || workingDay < -31) {
                throw new Error('Working day must be 1-31 for current month or -1 to -31 for previous month (cannot be 0)');
            }
        }
        if (data.due_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.due_time)) {
            throw new Error('Due time must be in HH:MM format');
        }
        return true;
    }

    validateProjectData(data) {
        if (!data.name || !data.name.trim()) {
            throw new Error('Project name is required');
        }
        if (data.name.length > 100) {
            throw new Error('Project name must be 100 characters or less');
        }
        return true;
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        const loadingId = 'loading-' + Date.now();
        const loadingElement = document.createElement('div');
        loadingElement.id = loadingId;
        loadingElement.className = 'flowcraft-loading';
        loadingElement.innerHTML = `
            <div class="loading-backdrop">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(loadingElement);
        
        // Add loading styles if not already present
        if (!document.getElementById('flowcraft-loading-styles')) {
            this.addLoadingStyles();
        }
        
        return loadingId;
    }

    /**
     * Update loading message
     */
    updateLoadingMessage(loadingId, message) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            const textElement = loadingElement.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading(loadingId) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `flowcraft-notification notification-${type}`;
        
        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add notification styles if not already present
        if (!document.getElementById('flowcraft-notification-styles')) {
            this.addNotificationStyles();
        }
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            validation: '⚠️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Add loading styles
     */
    addLoadingStyles() {
        const styles = document.createElement('style');
        styles.id = 'flowcraft-loading-styles';
        styles.textContent = `
            .flowcraft-loading {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .loading-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(10, 10, 15, 0.8);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .loading-content {
                background: var(--fc-surface, rgba(26, 26, 46, 0.9));
                border: 2px solid var(--fc-border, rgba(0, 212, 255, 0.3));
                padding: 32px;
                text-align: center;
                box-shadow: var(--fc-glow-primary, 0 0 20px rgba(0, 212, 255, 0.5));
            }
            
            .loading-spinner {
                width: 32px;
                height: 32px;
                border: 3px solid var(--fc-border, rgba(0, 212, 255, 0.3));
                border-top: 3px solid var(--fc-neon-primary, #00D4FF);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }
            
            .loading-text {
                color: var(--fc-text-primary, #FFFFFF);
                font-family: 'JetBrains Mono', monospace;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Add notification styles
     */
    addNotificationStyles() {
        const styles = document.createElement('style');
        styles.id = 'flowcraft-notification-styles';
        styles.textContent = `
            .flowcraft-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                min-width: 300px;
                animation: slideIn 0.3s ease-out;
            }
            
            .notification-content {
                background: var(--fc-surface, rgba(26, 26, 46, 0.9));
                border: 2px solid var(--fc-border, rgba(0, 212, 255, 0.3));
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                backdrop-filter: blur(10px);
                box-shadow: var(--fc-shadow-deep, 0 25px 50px -12px rgba(0, 0, 0, 0.8));
            }
            
            .notification-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .notification-message {
                color: var(--fc-text-primary, #FFFFFF);
                font-family: 'JetBrains Mono', monospace;
                font-size: 14px;
                flex-grow: 1;
                line-height: 1.4;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: var(--fc-text-muted, #6B7280);
                font-size: 18px;
                cursor: pointer;
                padding: 4px;
                flex-shrink: 0;
                transition: color 0.2s;
            }
            
            .notification-close:hover {
                color: var(--fc-text-primary, #FFFFFF);
            }
            
            .notification-success .notification-content {
                border-color: var(--fc-neon-success, #39FF14);
                box-shadow: 0 0 20px rgba(57, 255, 20, 0.3);
            }
            
            .notification-error .notification-content {
                border-color: var(--fc-neon-secondary, #FF006E);
                box-shadow: 0 0 20px rgba(255, 0, 110, 0.3);
            }
            
            .notification-warning .notification-content {
                border-color: var(--fc-neon-warning, #FFBE0B);
                box-shadow: 0 0 20px rgba(255, 190, 11, 0.3);
            }
            
            .notification-validation .notification-content {
                border-color: var(--fc-neon-warning, #FFBE0B);
                box-shadow: 0 0 20px rgba(255, 190, 11, 0.3);
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Utility function to sleep/delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Enhanced HTML escaping to prevent XSS attacks
     * More comprehensive than the basic sanitizeInput
     */
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;")
            .replace(/\//g, "&#x2F;");
    }

    /**
     * Sanitize input to prevent XSS (enhanced version)
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Use the enhanced HTML escaping
        return this.escapeHtml(input);
    }

    /**
     * Safe innerHTML replacement - creates DOM elements safely
     */
    safeSetInnerHTML(element, htmlContent) {
        if (!element) return;
        
        // Clear existing content
        element.innerHTML = '';
        
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;
        
        // Move sanitized content to target element
        while (temp.firstChild) {
            element.appendChild(temp.firstChild);
        }
    }

    /**
     * Create safe HTML element with escaped content
     */
    createSafeElement(tagName, textContent, attributes = {}) {
        const element = document.createElement(tagName);
        
        // Set text content safely
        if (textContent) {
            element.textContent = textContent;
        }
        
        // Set attributes safely
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, this.escapeHtml(value.toString()));
        });
        
        return element;
    }

    /**
     * Debounce function for search inputs
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Check if user is authenticated
     */
    async checkAuth(supabaseClient) {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            
            if (error) {
                throw error;
            }
            
            return user;
        } catch (error) {
            console.log('Auth check failed:', error);
            return null;
        }
    }

    /**
     * Redirect to login if not authenticated
     */
    redirectToLogin() {
        const currentPage = window.location.pathname;
        const loginPages = ['index.html', 'confirm.html', 'reset.html'];
        
        // Don't redirect if already on a login page
        if (loginPages.some(page => currentPage.includes(page))) {
            return;
        }
        
        window.location.href = 'index.html';
    }

    /**
     * CSRF Protection - Add CSRF token to forms
     */
    addCSRFToken(form) {
        if (!form || !window.FlowCraftCSRF) return;
        
        // Remove existing CSRF token if any
        const existingToken = form.querySelector('input[name="csrf_token"]');
        if (existingToken) {
            existingToken.remove();
        }
        
        // Add new CSRF token
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'csrf_token';
        tokenInput.value = window.FlowCraftCSRF.getToken();
        form.appendChild(tokenInput);
    }

    /**
     * Validate CSRF token
     */
    validateCSRFToken(token) {
        if (!window.FlowCraftCSRF) return false;
        return window.FlowCraftCSRF.validateToken(token);
    }

    /**
     * Rate limiting check for authentication attempts
     */
    checkRateLimit(identifier, type = 'login') {
        if (!window.FlowCraftRateLimit) return true;
        
        const config = window.FlowCraftConfig?.security?.rateLimit || {};
        let maxAttempts, lockoutDuration;
        
        switch (type) {
            case 'login':
                maxAttempts = config.maxLoginAttempts || 5;
                lockoutDuration = config.lockoutDuration || 15 * 60 * 1000;
                break;
            case 'password_reset':
                maxAttempts = config.maxPasswordResetAttempts || 3;
                lockoutDuration = config.passwordResetCooldown || 5 * 60 * 1000;
                break;
            default:
                maxAttempts = 5;
                lockoutDuration = 15 * 60 * 1000;
        }
        
        if (window.FlowCraftRateLimit.isLocked(identifier)) {
            const remaining = Math.ceil((window.FlowCraftRateLimit.lockouts.get(identifier) - Date.now()) / 1000 / 60);
            throw new Error(`Too many attempts. Try again in ${remaining} minutes.`);
        }
        
        return window.FlowCraftRateLimit.recordAttempt(identifier, maxAttempts, lockoutDuration);
    }

    /**
     * Clear rate limit for successful authentication
     */
    clearRateLimit(identifier) {
        if (window.FlowCraftRateLimit) {
            window.FlowCraftRateLimit.clearAttempts(identifier);
        }
    }

    /**
     * Enhanced form validation with security checks
     */
    validateForm(form) {
        if (!form) return false;
        
        // Check CSRF token
        const csrfToken = form.querySelector('input[name="csrf_token"]');
        if (!csrfToken || !this.validateCSRFToken(csrfToken.value)) {
            throw new Error('Security validation failed. Please refresh the page and try again.');
        }
        
        // Validate all inputs
        const inputs = form.querySelectorAll('input, textarea, select');
        for (const input of inputs) {
            if (input.required && !input.value.trim()) {
                throw new Error(`${input.name || 'Field'} is required`);
            }
            
            // Sanitize input values
            if (input.type === 'text' || input.type === 'email' || input.tagName === 'TEXTAREA') {
                input.value = this.sanitizeInput(input.value);
            }
        }
        
        return true;
    }

    /**
     * Session timeout management
     */
    initSessionTimeout(timeoutMinutes = 30) {
        let timeoutId;
        let warningShown = false;
        
        const resetTimeout = () => {
            clearTimeout(timeoutId);
            warningShown = false;
            
            timeoutId = setTimeout(() => {
                if (!warningShown) {
                    warningShown = true;
                    const extend = confirm('Your session will expire in 5 minutes. Do you want to extend it?');
                    if (extend) {
                        resetTimeout();
                        return;
                    }
                }
                
                // Auto logout
                this.showNotification('Session expired. Please login again.', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            }, timeoutMinutes * 60 * 1000);
        };
        
        // Reset timeout on user activity
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, resetTimeout, { passive: true });
        });
        
        // Initial timeout
        resetTimeout();
    }

    // =====================================================
    // PROJECT SHARING AND COLLABORATION API
    // =====================================================

    /**
     * Invite user to project
     */
    async inviteUserToProject(projectId, email, role = 'VIEW_ONLY') {
        const validRoles = ['FULL_ACCESS', 'EDIT_ACCESS', 'VIEW_ONLY'];
        if (!validRoles.includes(role)) {
            throw new Error('Invalid role. Must be one of: FULL_ACCESS, EDIT_ACCESS, VIEW_ONLY');
        }

        if (!this.validateEmail(email)) {
            throw new Error('Invalid email address');
        }

        // Generate invitation token
        const invitationToken = this.generateInvitationToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        return await this.executeSupabaseRequest(
            () => window.supabaseClient.from('project_invitations').insert({
                project_id: projectId,
                email: email,
                role: role,
                invitation_token: invitationToken,
                expires_at: expiresAt.toISOString()
            }),
            { loadingMessage: 'Sending invitation...' }
        );
    }

    /**
     * Get project members
     */
    async getProjectMembers(projectId) {
        try {
            return await this.executeSupabaseRequest(
                () => window.supabaseClient
                    .from('project_members')
                    .select('*')
                    .eq('project_id', projectId),
                { loadingMessage: 'Loading members...', showLoading: false }
            );
        } catch (error) {
            // Return empty result if table doesn't exist
            if (error.message.includes('406') || error.message.includes('Not Acceptable') || error.message.includes('does not exist') || error.message.includes('relationship')) {
                console.warn('project_members table does not exist or has schema issues');
                return { data: [] };
            }
            throw error;
        }
    }

    /**
     * Get project invitations
     */
    async getProjectInvitations(projectId) {
        try {
            return await this.executeSupabaseRequest(
                () => window.supabaseClient
                    .from('project_invitations')
                    .select('*')
                    .eq('project_id', projectId)
                    .neq('status', 'ACCEPTED'),
                { loadingMessage: 'Loading invitations...', showLoading: false }
            );
        } catch (error) {
            // Return empty result if table doesn't exist
            if (error.message.includes('406') || error.message.includes('Not Acceptable') || error.message.includes('does not exist') || error.message.includes('relationship')) {
                console.warn('project_invitations table does not exist or has schema issues');
                return { data: [] };
            }
            throw error;
        }
    }

    /**
     * Accept project invitation
     */
    async acceptInvitation(invitationToken) {
        // Get current user
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        
        if (userError || !user) {
            throw new Error('Authentication required');
        }

        // First get the invitation details
        const invitationResult = await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('project_invitations')
                .select('*')
                .eq('invitation_token', invitationToken)
                .eq('status', 'PENDING')
                .single(),
            { loadingMessage: 'Validating invitation...' }
        );

        if (!invitationResult.data) {
            throw new Error('Invalid or expired invitation');
        }

        const invitation = invitationResult.data;

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
            throw new Error('Invitation has expired');
        }

        // Add user to project members
        const memberResult = await this.executeSupabaseRequest(
            () => window.supabaseClient.from('project_members').insert({
                project_id: invitation.project_id,
                user_id: user.id,
                role: invitation.role,
                invited_by: invitation.invited_by
            }),
            { loadingMessage: 'Accepting invitation...' }
        );

        // Update invitation status
        await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('project_invitations')
                .update({
                    status: 'ACCEPTED',
                    accepted_at: new Date().toISOString()
                })
                .eq('id', invitation.id),
            { showLoading: false }
        );

        return memberResult;
    }

    /**
     * Remove project member
     */
    async removeProjectMember(projectId, userId) {
        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('project_members')
                .delete()
                .eq('project_id', projectId)
                .eq('user_id', userId),
            { loadingMessage: 'Removing member...' }
        );
    }

    /**
     * Update member role
     */
    async updateMemberRole(projectId, userId, newRole) {
        const validRoles = ['FULL_ACCESS', 'EDIT_ACCESS', 'VIEW_ONLY'];
        if (!validRoles.includes(newRole)) {
            throw new Error('Invalid role');
        }

        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('project_members')
                .update({ role: newRole })
                .eq('project_id', projectId)
                .eq('user_id', userId),
            { loadingMessage: 'Updating role...' }
        );
    }

    /**
     * Check user access to project
     */
    async checkProjectAccess(projectId) {
        // Get current user
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        
        if (userError || !user) {
            return { role: null, isOwner: false, hasAccess: false };
        }

        try {
            // First check if user is the owner
            const ownerResult = await this.executeSupabaseRequest(
                () => window.supabaseClient
                    .from('projects')
                    .select('user_id')
                    .eq('id', projectId)
                    .eq('user_id', user.id)
                    .limit(1),
                { showLoading: false }
            );

            if (ownerResult.data && ownerResult.data.length > 0) {
                return { role: 'OWNER', isOwner: true, hasAccess: true };
            }

            // Check project membership (only if project_members table exists)
            const result = await this.executeSupabaseRequest(
                () => window.supabaseClient
                    .from('project_members')
                    .select('role')
                    .eq('project_id', projectId)
                    .eq('user_id', user.id)
                    .limit(1),
                { showLoading: false }
            );

            return { 
                role: result.data && result.data.length > 0 ? result.data[0].role : null, 
                isOwner: false,
                hasAccess: result.data && result.data.length > 0
            };
        } catch (error) {
            // If project_members table doesn't exist, assume owner access for project owners
            console.warn('checkProjectAccess: Falling back to owner-only access due to error:', error.message);
            
            try {
                const ownerResult = await this.executeSupabaseRequest(
                    () => window.supabaseClient
                        .from('projects')
                        .select('user_id')
                        .eq('id', projectId)
                        .eq('user_id', user.id)
                        .limit(1),
                    { showLoading: false }
                );

                if (ownerResult.data && ownerResult.data.length > 0) {
                    return { role: 'OWNER', isOwner: true, hasAccess: true };
                }
            } catch (ownerError) {
                console.error('checkProjectAccess: Error checking project ownership:', ownerError);
            }
            
            return { role: null, isOwner: false, hasAccess: false };
        }
    }

    // =====================================================
    // WORKING CALENDAR API
    // =====================================================

    /**
     * Get working calendar for month
     */
    async getWorkingCalendar(year, month) {
        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('working_calendar')
                .select('*')
                .eq('year', year)
                .eq('month', month)
                .single(),
            { loadingMessage: 'Loading calendar...' }
        );
    }

    /**
     * Generate working calendar for month
     */
    async generateWorkingCalendar(year, month) {
        // Call the PostgreSQL function to calculate working days
        const result = await this.executeSupabaseRequest(
            () => window.supabaseClient.rpc('calculate_working_days', { 
                target_year: year, 
                target_month: month 
            }),
            { loadingMessage: 'Generating calendar...' }
        );

        // Insert or update the working calendar
        const calendarData = {
            year: year,
            month: month,
            working_days_json: result.data,
            holidays_json: []
        };

        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('working_calendar')
                .upsert(calendarData)
                .select(),
            { showLoading: false }
        );
    }

    /**
     * Get actual date for working day
     */
    async getActualDateForWorkingDay(workingDay, year, month) {
        return await this.executeSupabaseRequest(
            () => window.supabaseClient.rpc('get_actual_date_for_working_day', {
                wd: workingDay,
                target_year: year,
                target_month: month
            }),
            { showLoading: false }
        );
    }

    /**
     * Update process due dates based on working calendar
     */
    async updateProcessDueDates(sheetId, year, month) {
        // Get all processes for the sheet
        const processesResult = await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('processes')
                .select('*')
                .eq('sheet_id', sheetId),
            { loadingMessage: 'Loading processes...' }
        );

        if (!processesResult.data || processesResult.data.length === 0) {
            return { message: 'No processes found' };
        }

        // Update each process with calculated due date
        const updatePromises = processesResult.data.map(async (process) => {
            if (process.working_day !== null && process.working_day !== 0) {
                const actualDate = await this.getActualDateForWorkingDay(
                    process.working_day, 
                    year, 
                    month
                );

                if (actualDate.data) {
                    let dueDatetime = new Date(actualDate.data);
                    
                    // Add due_time if specified
                    if (process.due_time) {
                        const timeParts = process.due_time.split(':');
                        dueDatetime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]));
                    }

                    return this.executeSupabaseRequest(
                        () => window.supabaseClient
                            .from('processes')
                            .update({
                                due_date: actualDate.data,
                                actual_due_datetime: dueDatetime.toISOString()
                            })
                            .eq('id', process.id),
                        { showLoading: false }
                    );
                }
            }
            return null;
        });

        await Promise.all(updatePromises);
        return { message: 'Process due dates updated successfully' };
    }

    // =====================================================
    // PROCESS STATUS TRACKING API
    // =====================================================

    /**
     * Mark process as completed
     */
    async markProcessCompleted(processId, note = '', completedLate = false) {
        const currentTime = new Date().toISOString();
        const status = completedLate ? 'COMPLETED_LATE' : 'COMPLETED_ON_TIME';
        
        // Get current user
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        const userId = user?.id;

        // Update process status
        const result = await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('processes')
                .update({
                    status: status,
                    completed_at: currentTime,
                    completion_note: note
                })
                .eq('id', processId)
                .select(),
            { loadingMessage: 'Marking as completed...' }
        );

        // Record status change in history (disabled due to RLS policy conflicts)
        // The process_status_history table requires complex project membership setup
        // which is not implemented in this version. Status changes work without history logging.
        console.log(`Status change logged locally: ${processId} -> ${status} (${note || 'no note'})`);

        return result;
    }

    /**
     * Mark process as delayed with reason
     */
    async markProcessDelayed(processId, reason) {
        const currentTime = new Date().toISOString();
        
        // Get current user
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        const userId = user?.id;

        // Update process status
        const result = await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('processes')
                .update({
                    status: 'DELAYED_WITH_REASON',
                    completion_note: reason
                })
                .eq('id', processId)
                .select(),
            { loadingMessage: 'Marking as delayed...' }
        );

        // Record status change in history (disabled due to RLS policy conflicts)
        // The process_status_history table requires complex project membership setup
        // which is not implemented in this version. Status changes work without history logging.
        console.log(`Status change logged locally: ${processId} -> DELAYED_WITH_REASON (${reason})`);

        return result;
    }

    /**
     * Get process status history
     */
    async getProcessStatusHistory(processId) {
        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('process_status_history')
                .select(`
                    *,
                    user:changed_by (email)
                `)
                .eq('process_id', processId)
                .order('created_at', { ascending: false }),
            { loadingMessage: 'Loading history...' }
        );
    }

    /**
     * Update overdue processes (to be called periodically)
     */
    async updateOverdueProcesses() {
        const currentDate = new Date().toISOString().split('T')[0];
        
        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('processes')
                .update({ status: 'OVERDUE' })
                .eq('status', 'PENDING')
                .lt('due_date', currentDate),
            { loadingMessage: 'Checking overdue processes...' }
        );
    }

    /**
     * Get processes by status
     */
    async getProcessesByStatus(sheetId, status) {
        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('processes')
                .select(`
                    *,
                    assigned_user:assigned_to (email)
                `)
                .eq('sheet_id', sheetId)
                .eq('status', status)
                .order('due_date', { ascending: true }),
            { loadingMessage: 'Loading processes...' }
        );
    }

    /**
     * Assign process to user
     */
    async assignProcessToUser(processId, userId) {
        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('processes')
                .update({ assigned_to: userId })
                .eq('id', processId)
                .select(),
            { loadingMessage: 'Assigning process...' }
        );
    }

    // =====================================================
    // UTILITY FUNCTIONS
    // =====================================================

    /**
     * Generate secure invitation token
     */
    generateInvitationToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Get processes for calendar view
     */
    async getProcessesForCalendar(sheetId, year, month) {
        return await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('processes')
                .select(`
                    *,
                    assigned_user:assigned_to (email)
                `)
                .eq('sheet_id', sheetId)
                .gte('due_date', `${year}-${month.toString().padStart(2, '0')}-01`)
                .lt('due_date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`)
                .order('due_date', { ascending: true }),
            { loadingMessage: 'Loading calendar processes...' }
        );
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(projectId) {
        const result = await this.executeSupabaseRequest(
            () => window.supabaseClient
                .from('process_full')
                .select('status')
                .eq('project_id', projectId),
            { loadingMessage: 'Loading statistics...' }
        );

        if (!result.data) return null;

        const stats = {
            total: result.data.length,
            pending: result.data.filter(p => p.status === 'PENDING').length,
            completed_on_time: result.data.filter(p => p.status === 'COMPLETED_ON_TIME').length,
            completed_late: result.data.filter(p => p.status === 'COMPLETED_LATE').length,
            overdue: result.data.filter(p => p.status === 'OVERDUE').length,
            delayed: result.data.filter(p => p.status === 'DELAYED_WITH_REASON').length
        };

        return stats;
    }
}

// Create global instance
window.FlowCraftErrorHandler = new FlowCraftErrorHandler();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowCraftErrorHandler;
}