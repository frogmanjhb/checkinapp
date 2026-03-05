/**
 * Password validation and input sanitisation.
 */
class SecurityUtils {
    static validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const errors = [];
        if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
        if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
        if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
        if (!hasNumbers) errors.push('Password must contain at least one number');
        return {
            isValid: errors.length === 0,
            errors,
            strength: this.calculateStrength(password, hasUpperCase, hasLowerCase, hasNumbers)
        };
    }

    static calculateStrength(password, hasUpper, hasLower, hasNumber) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (hasUpper) score++;
        if (hasLower) score++;
        if (hasNumber) score++;
        if (score <= 2) return 'Weak';
        if (score <= 4) return 'Medium';
        return 'Strong';
    }

    static sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    }
}

export { SecurityUtils };
