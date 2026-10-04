// ============================================
// PRIVACY AGENT - CONTENT SCRIPT
// ============================================
//
// Detection runs in two layers, both fully synchronous and 100%
// local — no worker, no offscreen document, no model download,
// no network calls of any kind:
//
//   1. REGEX pass — email, phone, Aadhaar, PAN, IP, API keys,
//      secrets, passwords. Exact pattern matching.
//
//   2. NLP pass — names, locations, organizations. Uses the
//      "compromise" library (loaded as compromise.js, a plain
//      script, before this file — see manifest.json) plus a
//      curated location gazetteer and contextual phrase patterns
//      ("I work at X", "I live in X", "my name is X"), plus a
//      user-editable personal terms list.

console.log("Privacy Agent loaded");


// ============================================
// PRIVACY SETTINGS
// ============================================

let privacySettings = {
    protectEmail: true,
    protectPhone: true,
    protectApiKey: true,
    protectSecret: true,
    protectAadhaar: true,
    protectPan: true,
    protectIp: true,
    protectPassword: true,
    protectNames: true,
    protectLocations: true,
    protectOrganizations: true,
    protectCustomTerms: true,
    customTerms: []
};


// ============================================
// LOAD PRIVACY SETTINGS
// ============================================

try {

    chrome.storage.local.get(
        [
            "protectEmail",
            "protectPhone",
            "protectApiKey",
            "protectSecret",
            "protectAadhaar",
            "protectPan",
            "protectIp",
            "protectPassword",
            "protectNames",
            "protectLocations",
            "protectOrganizations",
            "protectCustomTerms",
            "customTerms"
        ],
        (settings) => {

            if (chrome.runtime.lastError) {

                console.warn(
                    "Privacy Agent: Could not load settings.",
                    chrome.runtime.lastError.message
                );

                return;
            }

            privacySettings = {

                protectEmail:
                    settings.protectEmail !== false,

                protectPhone:
                    settings.protectPhone !== false,

                protectApiKey:
                    settings.protectApiKey !== false,

                protectSecret:
                    settings.protectSecret !== false,

                protectAadhaar:
                    settings.protectAadhaar !== false,

                protectPan:
                    settings.protectPan !== false,

                protectIp:
                    settings.protectIp !== false,

                protectPassword:
                    settings.protectPassword !== false,

                protectNames:
                    settings.protectNames !== false,

                protectLocations:
                    settings.protectLocations !== false,

                protectOrganizations:
                    settings.protectOrganizations !== false,

                protectCustomTerms:
                    settings.protectCustomTerms !== false,

                customTerms:
                    Array.isArray(settings.customTerms) ?
                        settings.customTerms :
                        []
            };

            console.log(
                "Privacy settings loaded."
            );
        }
    );

} catch (error) {

    console.warn(
        "Privacy Agent: Settings error:",
        error
    );
}


// Keep privacySettings.customTerms in sync if the popup changes it
// while this page stays open.
try {

    chrome.storage.onChanged.addListener((changes, areaName) => {

        if (areaName !== "local") {

            return;
        }

        if (changes.customTerms) {

            privacySettings.customTerms =
                Array.isArray(changes.customTerms.newValue) ?
                    changes.customTerms.newValue :
                    [];
        }
    });

} catch (error) {

    // Extension context may be unavailable; non-fatal.
}


// ============================================
// STORAGE
// ============================================

function saveDetectionStats(detected) {

    try {

        chrome.storage.local.get(
            [
                "email",
                "phone",
                "apiKey",
                "secret",
                "aadhaar",
                "pan",
                "ip",
                "password",
                "name",
                "location",
                "organization",
                "custom"
            ],
            (oldStats) => {

                if (chrome.runtime.lastError) {

                    console.warn(
                        "Privacy Agent: Statistics error.",
                        chrome.runtime.lastError.message
                    );

                    return;
                }

                const newStats = {

                    email:
                        (oldStats.email || 0) +
                        (detected.email || 0),

                    phone:
                        (oldStats.phone || 0) +
                        (detected.phone || 0),

                    apiKey:
                        (oldStats.apiKey || 0) +
                        (detected.apiKey || 0),

                    secret:
                        (oldStats.secret || 0) +
                        (detected.secret || 0),

                    aadhaar:
                        (oldStats.aadhaar || 0) +
                        (detected.aadhaar || 0),

                    pan:
                        (oldStats.pan || 0) +
                        (detected.pan || 0),

                    ip:
                        (oldStats.ip || 0) +
                        (detected.ip || 0),

                    password:
                        (oldStats.password || 0) +
                        (detected.password || 0),

                    name:
                        (oldStats.name || 0) +
                        (detected.name || 0),

                    location:
                        (oldStats.location || 0) +
                        (detected.location || 0),

                    organization:
                        (oldStats.organization || 0) +
                        (detected.organization || 0),

                    custom:
                        (oldStats.custom || 0) +
                        (detected.custom || 0)
                };


                chrome.storage.local.set(
                    newStats,
                    () => {

                        if (chrome.runtime.lastError) {

                            console.warn(
                                "Privacy Agent: Could not save statistics.",
                                chrome.runtime.lastError.message
                            );
                        }
                    }
                );
            }
        );

    } catch (error) {

        console.warn(
            "Privacy Agent: Extension context unavailable " +
            "(stats not saved, but redaction still worked)."
        );
    }
}


// ============================================
// SANITIZE TEXT (REGEX PASS)
// ============================================

function sanitizeText(text, settings) {

    let sanitized = text;

    const detected = {

        email: 0,
        phone: 0,
        apiKey: 0,
        secret: 0,
        aadhaar: 0,
        pan: 0,
        ip: 0,
        password: 0
    };


    // ========================================
    // EMAIL
    // ========================================

    if (settings.protectEmail) {

        sanitized = sanitized.replace(

            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,

            () => {

                detected.email++;

                return "[EMAIL]";
            }
        );
    }


    // ========================================
    // INDIAN PHONE NUMBER
    // ========================================

    if (settings.protectPhone) {

        sanitized = sanitized.replace(

            /(?<!\d)(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g,

            () => {

                detected.phone++;

                return "[PHONE]";
            }
        );
    }


    // ========================================
    // OPENAI STYLE API KEY
    // ========================================

    if (settings.protectApiKey) {

        sanitized = sanitized.replace(

            /\bsk-[A-Za-z0-9_-]{10,}\b/g,

            () => {

                detected.apiKey++;

                return "[API_KEY]";
            }
        );
    }


    // ========================================
    // GENERIC API KEY
    // ========================================

    if (settings.protectApiKey) {

        sanitized = sanitized.replace(

            /\bapi[_-]?key\s*[:=]\s*[^\s,;]+/gi,

            () => {

                detected.apiKey++;

                return "API_KEY: [API_KEY]";
            }
        );
    }


    // ========================================
    // SECRET KEY
    // ========================================

    if (settings.protectSecret) {

        sanitized = sanitized.replace(

            /\bsecret[_-]?key\s*[:=]\s*[^\s,;]+/gi,

            () => {

                detected.secret++;

                return "SECRET_KEY: [SECRET]";
            }
        );
    }


    // ========================================
    // AADHAAR NUMBER (India)
    // ========================================

    if (settings.protectAadhaar) {

        sanitized = sanitized.replace(

            /\b\d{4}[\s-]\d{4}[\s-]\d{4}\b/g,

            () => {

                detected.aadhaar++;

                return "[AADHAAR]";
            }
        );
    }


    // ========================================
    // PAN NUMBER (India)
    // ========================================

    if (settings.protectPan) {

        sanitized = sanitized.replace(

            /\b[A-Za-z]{5}[0-9]{4}[A-Za-z]\b/g,

            () => {

                detected.pan++;

                return "[PAN]";
            }
        );
    }


    // ========================================
    // IP ADDRESS
    // ========================================

    if (settings.protectIp) {

        sanitized = sanitized.replace(

            /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,

            () => {

                detected.ip++;

                return "[IP_ADDRESS]";
            }
        );
    }


    // ========================================
    // PASSWORD
    // ========================================

    if (settings.protectPassword) {

        sanitized = sanitized.replace(

            /\b(?:password|pwd|pass)\s*(?:is|:|=)\s*[^\s,;.]+/gi,

            () => {

                detected.password++;

                return "password: [PASSWORD]";
            }
        );
    }


    // ========================================
    // RETURN RESULT
    // ========================================

    return {

        text: sanitized,

        detected: detected
    };
}


// ============================================
// LOCATION GAZETTEER
// ============================================
//
// Plain word-list lookup, independent of phrasing entirely.
// Catches cases like "My city is Pune." that neither compromise's
// built-in place detection nor the contextual patterns below catch,
// since there's no trigger phrase and Pune isn't always in a
// general-purpose English NLP lexicon.

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
    "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Puducherry", "Chandigarh", "Andaman and Nicobar Islands",
    "Dadra and Nagar Haveli", "Lakshadweep"
];

const INDIAN_CITIES = [
    "Mumbai", "Delhi", "Bengaluru", "Bangalore", "Hyderabad",
    "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
    "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal",
    "Visakhapatnam", "Vadodara", "Patna", "Ghaziabad", "Ludhiana",
    "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan",
    "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
    "Navi Mumbai", "Allahabad", "Prayagraj", "Ranchi", "Howrah",
    "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur",
    "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur",
    "Hubli", "Mysuru", "Mysore", "Tiruchirappalli", "Bareilly",
    "Aligarh", "Tiruppur", "Moradabad", "Jalandhar", "Bhubaneswar",
    "Salem", "Warangal", "Guntur", "Bhiwandi", "Saharanpur",
    "Gorakhpur", "Bikaner", "Amravati", "Noida", "Gurugram",
    "Gurgaon", "Jamshedpur", "Bhilai", "Cuttack", "Firozabad",
    "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Durgapur",
    "Asansol", "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola",
    "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri", "Jhansi",
    "Ulhasnagar", "Jammu", "Mangalore", "Mangaluru", "Erode",
    "Belgaum", "Tirunelveli", "Malegaon", "Gaya", "Udaipur",
    "Shimla", "Panaji", "Imphal", "Aizawl", "Kohima", "Itanagar",
    "Gangtok", "Agartala", "Shillong"
];

const WORLD_LOCATIONS = [
    "United States", "United Kingdom", "Canada", "Australia",
    "Germany", "France", "Japan", "China", "Singapore",
    "United Arab Emirates", "Dubai", "London", "New York",
    "San Francisco", "Toronto", "Sydney", "Tokyo", "Paris",
    "Berlin", "Abu Dhabi", "Hong Kong", "Dublin", "Amsterdam"
];

const LOCATION_GAZETTEER =
    [...new Set([
        ...INDIAN_STATES,
        ...INDIAN_CITIES,
        ...WORLD_LOCATIONS
    ])];


// ============================================
// NLP HELPERS
// ============================================

function escapeForRegExp(text) {

    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


function replaceAllOccurrences(text, search, replacement) {

    if (!search) {

        return text;
    }

    const pattern = new RegExp(
        escapeForRegExp(search),
        "gi"
    );

    return text.replace(pattern, replacement);
}


function containsWholeWord(text, word) {

    if (!word) {

        return false;
    }

    const pattern = new RegExp(
        "\\b" + escapeForRegExp(word) + "\\b",
        "i"
    );

    return pattern.test(text);
}


// Trim stray leading/trailing punctuation off a matched span
// (compromise sometimes includes a trailing period from the
// sentence itself, e.g. "Ajay Sharma." instead of "Ajay Sharma").
function cleanMatch(text) {

    return (text || "")
        .replace(/^[.,;:!?\s]+|[.,;:!?\s]+$/g, "");
}


// Pulls a compromise .match() result's matched spans out as an
// array of plain strings, safely (compromise is loaded globally
// as `nlp` via compromise.js, declared before this file).
function extractSpans(matchResult) {

    try {

        return matchResult
            .json()
            .map((item) => item.text)
            .filter(Boolean);

    } catch (error) {

        return [];
    }
}


// ============================================
// NLP-BASED ENTITY DETECTION
// (names / locations / organizations / custom terms)
// ============================================

function detectNlpEntities(text, settings) {

    const items = [];

    if (!text || typeof nlp !== "function") {

        return items;
    }


    let doc;

    try {

        doc = nlp(text);

    } catch (error) {

        console.warn(
            "Privacy Agent: NLP parse failed.",
            error
        );

        return items;
    }


    // ========================================
    // NAMES
    // ========================================

    if (settings.protectNames) {

        extractSpans(doc.people()).forEach((raw) => {

            items.push({
                text: cleanMatch(raw),
                placeholder: "[NAME]"
            });
        });


        const nameContext =
            doc.match(
                "(my name is|i am|this is|i'm) #ProperNoun+"
            );

        extractSpans(
            nameContext.match("#ProperNoun+")
        ).forEach((raw) => {

            items.push({
                text: cleanMatch(raw),
                placeholder: "[NAME]"
            });
        });
    }


    // ========================================
    // LOCATIONS
    // ========================================

    if (settings.protectLocations) {

        extractSpans(doc.places()).forEach((raw) => {

            items.push({
                text: cleanMatch(raw),
                placeholder: "[LOCATION]"
            });
        });


        const locationContext =
            doc.match(
                "(live|lives|living|lived|based|located) " +
                "(in|at) #ProperNoun+"
            );

        extractSpans(
            locationContext.match("#ProperNoun+")
        ).forEach((raw) => {

            items.push({
                text: cleanMatch(raw),
                placeholder: "[LOCATION]"
            });
        });


        for (const place of LOCATION_GAZETTEER) {

            if (containsWholeWord(text, place)) {

                items.push({
                    text: place,
                    placeholder: "[LOCATION]"
                });
            }
        }
    }


    // ========================================
    // ORGANIZATIONS
    // ========================================

    if (settings.protectOrganizations) {

        extractSpans(doc.organizations()).forEach((raw) => {

            items.push({
                text: cleanMatch(raw),
                placeholder: "[ORGANIZATION]"
            });
        });


        const orgContext =
            doc.match(
                "(work|works|working|worked|employed) " +
                "(at|for|by) #ProperNoun+"
            );

        extractSpans(
            orgContext.match("#ProperNoun+")
        ).forEach((raw) => {

            items.push({
                text: cleanMatch(raw),
                placeholder: "[ORGANIZATION]"
            });
        });
    }


    // ========================================
    // PERSONAL TERMS (user-added)
    // ========================================

    if (settings.protectCustomTerms) {

        for (const term of (settings.customTerms || [])) {

            const cleanTerm =
                (term || "").trim();

            if (
                cleanTerm &&
                containsWholeWord(text, cleanTerm)
            ) {

                items.push({
                    text: cleanTerm,
                    placeholder: "[PERSONAL]"
                });
            }
        }
    }


    // ========================================
    // FILTER JUNK
    // ========================================

    return items.filter(
        (item) => item.text && item.text.length >= 2
    );
}


// ============================================
// COMBINED SANITIZE (regex + NLP, one pass)
// ============================================

function fullSanitize(text, settings) {

    // Run NLP against the ORIGINAL text, not a regex-redacted
    // version — feeding a model/parser text already full of
    // placeholder tokens like [EMAIL] degrades its ability to
    // recognize nearby names/places correctly.
    const nlpItems =
        detectNlpEntities(text, settings);

    const regexResult =
        sanitizeText(text, settings);

    let finalText =
        regexResult.text;


    // Longest match first, so a multi-word entity ("Tata
    // Consultancy Services") is replaced before any shorter
    // entity it contains would be ("Tata").
    const sortedItems =
        [...nlpItems].sort(
            (a, b) => b.text.length - a.text.length
        );

    for (const item of sortedItems) {

        finalText = replaceAllOccurrences(
            finalText,
            item.text,
            item.placeholder
        );
    }


    // Count by placeholders actually present in the final text,
    // not by pre-dedup candidate count — several overlapping NLP
    // candidates (e.g. "Bengaluru, Karnataka" from the built-in
    // place detector AND "Bengaluru" AND "Karnataka" from the
    // gazetteer) often collapse into a single visible replacement,
    // and the stats should reflect what the user actually sees.
    const detected = {

        ...regexResult.detected,

        name:
            (finalText.match(/\[NAME\]/g) || []).length,

        location:
            (finalText.match(/\[LOCATION\]/g) || []).length,

        organization:
            (finalText.match(/\[ORGANIZATION\]/g) || []).length,

        custom:
            (finalText.match(/\[PERSONAL\]/g) || []).length
    };


    return {

        text: finalText,

        detected: detected,

        changed: finalText !== text
    };
}


// ============================================
// INSERT SANITIZED TEXT
// ============================================

function insertSanitizedText(element, text) {


    // ========================================
    // TEXTAREA
    // ========================================

    if (element.tagName === "TEXTAREA") {

        const start =
            element.selectionStart;

        const end =
            element.selectionEnd;

        const currentText =
            element.value;


        const newText =
            currentText.substring(0, start) +
            text +
            currentText.substring(end);


        element.value = newText;


        element.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );


        const cursor =
            start + text.length;


        element.setSelectionRange(
            cursor,
            cursor
        );

        return;
    }


    // ========================================
    // CONTENTEDITABLE
    // ========================================

    if (element.isContentEditable) {

        const selection =
            window.getSelection();


        if (
            !selection ||
            selection.rangeCount === 0
        ) {

            return;
        }


        const range =
            selection.getRangeAt(0);


        range.deleteContents();


        const textNode =
            document.createTextNode(text);


        range.insertNode(textNode);


        range.setStartAfter(textNode);

        range.collapse(true);


        selection.removeAllRanges();

        selection.addRange(range);


        element.dispatchEvent(

            new InputEvent(
                "input",
                {
                    bubbles: true,
                    inputType: "insertText",
                    data: text
                }
            )
        );
    }
}


// ============================================
// SHARED HELPERS
// ============================================

// Elements currently being written to programmatically.
// insertSanitizedText's own synthetic "input" event dispatch is
// guarded by this so nothing else mistakes it for a real edit.
const sanitizingElements = new WeakSet();


// ============================================
// PASTE INTERCEPTOR
// ============================================
//
// Fully synchronous now — regex AND NLP both run before this
// handler returns, so there is no async gap for a race against
// the page's own paste handling, and no dependency on the
// extension's messaging context staying alive.

window.addEventListener(

    "paste",

    function (event) {

        const element =
            event.target;


        if (

            element.tagName !== "TEXTAREA" &&

            !element.isContentEditable

        ) {

            return;
        }


        const pastedText =
            event.clipboardData?.getData(
                "text/plain"
            );


        if (!pastedText) {

            return;
        }


        const result =
            fullSanitize(
                pastedText,
                privacySettings
            );


        if (!result.changed) {

            return;
        }


        console.log(
            "Privacy Agent: Sensitive information detected locally."
        );

        console.log(
            "Detected:",
            result.detected
        );


        event.preventDefault();

        event.stopPropagation();

        event.stopImmediatePropagation();


        saveDetectionStats(
            result.detected
        );


        sanitizingElements.add(element);

        try {

            insertSanitizedText(
                element,
                result.text
            );

        } finally {

            sanitizingElements.delete(element);
        }

    },

    true
);

