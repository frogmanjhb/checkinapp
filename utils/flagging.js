/**
 * Journal Entry Flagging System
 * Automatically scans journal entries for concerning words/phrases
 * and creates flag records with severity levels.
 */

// Load flag keywords from JSON
let flagKeywords = null;

async function loadFlagKeywords() {
    if (flagKeywords) return flagKeywords;
    
    try {
        const response = await fetch('data/flagKeywords.json');
        flagKeywords = await response.json();
        return flagKeywords;
    } catch (error) {
        console.error('Failed to load flag keywords:', error);
        // Return empty structure if file not found
        return { red: {}, amber: {}, yellow: {} };
    }
}

/**
 * Normalize text for matching
 * - lowercase
 * - trim
 * - replace apostrophes to handle cant/dont variants
 * - collapse whitespace
 * - remove most punctuation but keep spaces
 */
function normalise(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .toLowerCase()
        .trim()
        .replace(/'/g, '')  // Remove apostrophes (can't -> cant, don't -> dont)
        .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
        .replace(/\s+/g, ' ')  // Collapse multiple spaces to single space
        .trim();
}

/**
 * Check if text should be ignored based on ignore contexts
 * Returns true if any ignore context is found (e.g., "hurt my leg" in game context)
 */
async function shouldIgnoreContext(text, normalized) {
    const keywords = await loadFlagKeywords();
    const ignoreContexts = keywords.context_rules?.ignore_contexts || [];
    
    for (const ignorePhrase of ignoreContexts) {
        const normalizedIgnore = normalise(ignorePhrase);
        if (normalized.includes(normalizedIgnore)) {
            // If ignore context is present, skip flagging for this entry
            return true;
        }
    }
    return false;
}

/**
 * Check if phrase requires self-reference (e.g., "hurt myself" requires "myself")
 * Returns true if self-reference is not required OR if it's present
 */
async function requiresSelfReference(phrase, normalized) {
    const keywords = await loadFlagKeywords();
    const selfRefRequired = keywords.context_rules?.self_reference_required || [];
    const normalizedPhrase = normalise(phrase);
    
    // Check if this phrase contains words that require "myself"
    let needsSelfRef = false;
    for (const selfRefWord of selfRefRequired) {
        if (normalizedPhrase.includes(selfRefWord)) {
            needsSelfRef = true;
            break;
        }
    }
    
    // If self-reference is needed, check if it's present in the text
    if (needsSelfRef) {
        // Check for "myself" or first-person pronouns near the phrase
        const selfRefRegex = /\b(myself|i|me|my)\b/i;
        return selfRefRegex.test(normalized);
    }
    
    // No self-reference requirement - allow the match
    return true;
}

/**
 * Check if phrase requires intent indicator (e.g., "want to", "going to")
 * Some phrases are only concerning when combined with intent indicators
 * For now, we'll allow all matches but this can be enhanced for proximity checking
 */
async function requiresIntentPhrase(phrase, normalized) {
    // Most phrases already contain intent indicators (e.g., "want to die")
    // For phrases without explicit intent, we'll still flag them for safety
    // This can be enhanced later to check for intent phrases in proximity
    return true;
}

/**
 * Detect matches in normalized text
 * Returns matches grouped by severity: { red: [], amber: [], yellow: [] }
 */
async function detectMatches(text) {
    const keywords = await loadFlagKeywords();
    const normalized = normalise(text);
    const matches = { red: [], amber: [], yellow: [] };
    
    // Check ignore contexts first - if text should be ignored, return empty matches
    if (shouldIgnoreContext(text, normalized)) {
        return matches;
    }
    
    // Check each severity level
    for (const severity of ['red', 'amber', 'yellow']) {
        if (!keywords[severity]) continue;
        
        // Check each category in this severity
        for (const [category, phrases] of Object.entries(keywords[severity])) {
            for (const phrase of phrases) {
                const normalizedPhrase = normalise(phrase);
                let isMatch = false;
                
                // Multi-word phrases: use includes() on normalized text
                if (normalizedPhrase.includes(' ')) {
                    if (normalized.includes(normalizedPhrase)) {
                        isMatch = true;
                    }
                } else {
                    // Single words: use word boundary regex
                    const escapedPhrase = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'i');
                    if (regex.test(normalized)) {
                        isMatch = true;
                    }
                }
                
                // If match found, check context rules
                if (isMatch) {
                    // Check if self-reference is required (for phrases like "hurt myself")
                    const hasSelfRef = await requiresSelfReference(phrase, normalized);
                    // Check if intent phrase is required (for phrases that need "want to", etc.)
                    const hasIntent = await requiresIntentPhrase(phrase, normalized);
                    
                    // Only add match if context requirements are met
                    if (hasSelfRef && hasIntent) {
                        matches[severity].push(phrase);
                    }
                }
            }
        }
    }
    
    return matches;
}

/**
 * Compute severity based on matches
 * Returns: "red" | "amber" | "yellow" | "none"
 */
function computeSeverity(matches) {
    if (matches.red && matches.red.length > 0) {
        return 'red';
    }
    if (matches.amber && matches.amber.length > 0) {
        return 'amber';
    }
    if (matches.yellow && matches.yellow.length > 0) {
        return 'yellow';
    }
    return 'none';
}

/**
 * Check if yellow "absolutes" appear with amber matches in same entry
 * Special rule: yellow absolutes + amber = treat as amber severity
 */
async function checkAbsolutesWithAmber(text, matches) {
    const keywords = await loadFlagKeywords();
    const normalized = normalise(text);
    
    // Check if yellow "absolutes" are present
    const absolutes = keywords.yellow?.absolutes || [];
    let hasAbsolutes = false;
    
    for (const absolute of absolutes) {
        const regex = new RegExp(`\\b${absolute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(normalized)) {
            hasAbsolutes = true;
            break;
        }
    }
    
    // If absolutes present AND amber matches exist, return amber severity
    if (hasAbsolutes && matches.amber && matches.amber.length > 0) {
        return 'amber';
    }
    
    return null;
}

/**
 * Generate UUID v4
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Create a flag record for a journal entry
 */
async function createFlagRecord(entryText, user, isGhostMode = false) {
    const matches = await detectMatches(entryText);
    
    // Check special rule: absolutes + amber = amber severity
    const absolutesAmberSeverity = await checkAbsolutesWithAmber(entryText, matches);
    
    let severity = computeSeverity(matches);
    
    // Apply special rule if applicable
    if (absolutesAmberSeverity === 'amber' && severity === 'yellow') {
        severity = 'amber';
    }
    
    // Don't create flag if no matches
    if (severity === 'none') {
        return null;
    }
    
    // Extract grade from class (e.g., "5EF" -> "5", "Grade 6" -> "6")
    let grade = '';
    if (user.class) {
        const gradeMatch = user.class.match(/(\d+)/);
        if (gradeMatch) {
            grade = gradeMatch[1];
        }
    }
    
    const flag = {
        id: generateUUID(),
        studentId: user.id,
        studentName: isGhostMode ? null : `${user.first_name} ${user.surname}`,
        ghost: isGhostMode,
        grade: grade,
        house: user.house || '',
        createdAt: new Date().toISOString(),
        entryText: entryText,
        matches: matches,
        severity: severity,
        status: 'new',
        notes: ''
    };
    
    return flag;
}

/**
 * Apply frequency escalation rules
 * Checks rolling window for pattern detection
 */
function applyFrequencyRules(studentId, newSeverity) {
    const flags = loadJson('journalFlags', []);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filter flags for this student in last 7 days
    const recentFlags = flags.filter(flag => {
        if (flag.studentId !== studentId) return false;
        const flagDate = new Date(flag.createdAt);
        return flagDate >= sevenDaysAgo;
    });
    
    const events = loadJson('flagEvents', []);
    
    // Check amber escalation: 3+ amber in last 7 days
    if (newSeverity === 'amber') {
        const amberCount = recentFlags.filter(f => f.severity === 'amber').length;
        if (amberCount >= 3) {
            // Check if event already exists
            const existingEvent = events.find(e => 
                e.studentId === studentId && 
                e.type === 'amberPattern' &&
                new Date(e.createdAt) >= sevenDaysAgo
            );
            
            if (!existingEvent) {
                const event = {
                    id: generateUUID(),
                    studentId: studentId,
                    createdAt: now.toISOString(),
                    type: 'amberPattern',
                    count: amberCount,
                    windowDays: 7
                };
                events.push(event);
                saveJson('flagEvents', events);
            }
        }
    }
    
    // Check yellow escalation: 5+ yellow in last 7 days
    if (newSeverity === 'yellow') {
        const yellowCount = recentFlags.filter(f => f.severity === 'yellow').length;
        if (yellowCount >= 5) {
            // Check if event already exists
            const existingEvent = events.find(e => 
                e.studentId === studentId && 
                e.type === 'yellowPattern' &&
                new Date(e.createdAt) >= sevenDaysAgo
            );
            
            if (!existingEvent) {
                const event = {
                    id: generateUUID(),
                    studentId: studentId,
                    createdAt: now.toISOString(),
                    type: 'yellowPattern',
                    count: yellowCount,
                    windowDays: 7
                };
                events.push(event);
                saveJson('flagEvents', events);
            }
        }
    }
}

/**
 * Process journal entry and create flag if needed
 * Called after journal entry is successfully saved
 */
async function processJournalEntryFlagging(entryText, user, isGhostMode = false) {
    try {
        const flag = await createFlagRecord(entryText, user, isGhostMode);
        
        if (!flag) {
            return null; // No flag needed
        }
        
        // Save flag to localStorage
        const flags = loadJson('journalFlags', []);
        flags.push(flag);
        saveJson('journalFlags', flags);
        
        // Apply frequency escalation rules
        applyFrequencyRules(user.id, flag.severity);
        
        return flag;
    } catch (error) {
        console.error('Error processing journal entry flagging:', error);
        return null;
    }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalise,
        detectMatches,
        computeSeverity,
        applyFrequencyRules,
        createFlagRecord,
        processJournalEntryFlagging,
        loadFlagKeywords
    };
}
