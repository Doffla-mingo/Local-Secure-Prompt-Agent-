document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadSettings();
        loadStats();
        renderTermList();

        document
            .getElementById("emailToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("phoneToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("apiKeyToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("secretToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("aadhaarToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("panToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("ipToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("passwordToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("namesToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("locationsToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("organizationsToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("customTermsToggle")
            .addEventListener(
                "change",
                saveSettings
            );

        document
            .getElementById("addTerm")
            .addEventListener(
                "click",
                addTerm
            );

        document
            .getElementById("termInput")
            .addEventListener(
                "keydown",
                (event) => {

                    if (event.key === "Enter") {

                        addTerm();
                    }
                }
            );

        document
            .getElementById("reset")
            .addEventListener(
                "click",
                resetStats
            );
    }
);


// ============================================
// LOAD SETTINGS
// ============================================

function loadSettings() {

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
            "protectCustomTerms"
        ],
        (settings) => {

            document.getElementById("emailToggle").checked =
                settings.protectEmail !== false;

            document.getElementById("phoneToggle").checked =
                settings.protectPhone !== false;

            document.getElementById("apiKeyToggle").checked =
                settings.protectApiKey !== false;

            document.getElementById("secretToggle").checked =
                settings.protectSecret !== false;

            document.getElementById("aadhaarToggle").checked =
                settings.protectAadhaar !== false;

            document.getElementById("panToggle").checked =
                settings.protectPan !== false;

            document.getElementById("ipToggle").checked =
                settings.protectIp !== false;

            document.getElementById("passwordToggle").checked =
                settings.protectPassword !== false;

            document.getElementById("namesToggle").checked =
                settings.protectNames !== false;

            document.getElementById("locationsToggle").checked =
                settings.protectLocations !== false;

            document.getElementById("organizationsToggle").checked =
                settings.protectOrganizations !== false;

            document.getElementById("customTermsToggle").checked =
                settings.protectCustomTerms !== false;
        }
    );
}


// ============================================
// SAVE SETTINGS
// ============================================

function saveSettings() {

    chrome.storage.local.set({

        protectEmail:
            document.getElementById("emailToggle").checked,

        protectPhone:
            document.getElementById("phoneToggle").checked,

        protectApiKey:
            document.getElementById("apiKeyToggle").checked,

        protectSecret:
            document.getElementById("secretToggle").checked,

        protectAadhaar:
            document.getElementById("aadhaarToggle").checked,

        protectPan:
            document.getElementById("panToggle").checked,

        protectIp:
            document.getElementById("ipToggle").checked,

        protectPassword:
            document.getElementById("passwordToggle").checked,

        protectNames:
            document.getElementById("namesToggle").checked,

        protectLocations:
            document.getElementById("locationsToggle").checked,

        protectOrganizations:
            document.getElementById("organizationsToggle").checked,

        protectCustomTerms:
            document.getElementById("customTermsToggle").checked
    });
}


// ============================================
// PERSONAL TERMS
// ============================================

function renderTermList() {

    chrome.storage.local.get(
        ["customTerms"],
        (result) => {

            const terms =
                Array.isArray(result.customTerms) ?
                    result.customTerms :
                    [];

            const listEl =
                document.getElementById("termList");

            listEl.innerHTML = "";

            if (terms.length === 0) {

                const empty =
                    document.createElement("div");

                empty.className = "empty-terms";

                empty.textContent =
                    "No personal terms added yet.";

                listEl.appendChild(empty);

                return;
            }

            terms.forEach((term, index) => {

                const row =
                    document.createElement("div");

                row.className = "term-item";


                const label =
                    document.createElement("span");

                label.textContent = term;


                const removeBtn =
                    document.createElement("button");

                removeBtn.textContent = "✕";

                removeBtn.addEventListener(
                    "click",
                    () => removeTerm(index)
                );


                row.appendChild(label);

                row.appendChild(removeBtn);

                listEl.appendChild(row);
            });
        }
    );
}


function addTerm() {

    const input =
        document.getElementById("termInput");

    const value =
        input.value.trim();

    if (!value) {

        return;
    }

    chrome.storage.local.get(
        ["customTerms"],
        (result) => {

            const terms =
                Array.isArray(result.customTerms) ?
                    result.customTerms :
                    [];

            const alreadyExists =
                terms.some(
                    (term) =>
                        term.toLowerCase() ===
                        value.toLowerCase()
                );

            if (alreadyExists) {

                input.value = "";

                return;
            }

            terms.push(value);

            chrome.storage.local.set(
                { customTerms: terms },
                () => {

                    input.value = "";

                    renderTermList();
                }
            );
        }
    );
}


function removeTerm(index) {

    chrome.storage.local.get(
        ["customTerms"],
        (result) => {

            const terms =
                Array.isArray(result.customTerms) ?
                    result.customTerms :
                    [];

            terms.splice(index, 1);

            chrome.storage.local.set(
                { customTerms: terms },
                () => {

                    renderTermList();
                }
            );
        }
    );
}


// ============================================
// LOAD STATISTICS
// ============================================

function loadStats() {

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
        (stats) => {

            document.getElementById("email")
                .textContent =
                stats.email || 0;

            document.getElementById("phone")
                .textContent =
                stats.phone || 0;

            document.getElementById("apiKey")
                .textContent =
                stats.apiKey || 0;

            document.getElementById("secret")
                .textContent =
                stats.secret || 0;

            document.getElementById("aadhaar")
                .textContent =
                stats.aadhaar || 0;

            document.getElementById("pan")
                .textContent =
                stats.pan || 0;

            document.getElementById("ip")
                .textContent =
                stats.ip || 0;

            document.getElementById("password")
                .textContent =
                stats.password || 0;

            document.getElementById("name")
                .textContent =
                stats.name || 0;

            document.getElementById("location")
                .textContent =
                stats.location || 0;

            document.getElementById("organization")
                .textContent =
                stats.organization || 0;

            document.getElementById("custom")
                .textContent =
                stats.custom || 0;
        }
    );
}


// ============================================
// RESET
// ============================================

function resetStats() {

    chrome.storage.local.remove(
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
        () => {

            loadStats();
        }
    );
}
