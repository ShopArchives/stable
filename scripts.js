
const appVersion = "7.1.1"
const appType = "Stable"

document.getElementById('logo-container').setAttribute('data-tooltip', appType+' '+appVersion);

// Cache
let currentPageCache;
let currentOpenModalId;
let scrollToCache;
let devtoolsOpenCache;
let currentUserData;
let usersXPBalance;
let usersXPEventsCache;
let usersXPInventoryCache;
let XPShopCache;

let discordProfileEffectsCache;
let discordLeakedCategoriesCache;
let discordCollectiblesShopHomeCache;
let discordCollectiblesCategoriesCache;
let discordOrbsCategoriesCache;
let discordMiscellaneousCategoriesCache;


const overridesKey = 'experimentOverrides';
const serverKey = 'serverExperiments';
const currentExperimentOverrides = JSON.parse(localStorage.getItem(overridesKey));

function loadOverrides() {
    try {
        return JSON.parse(localStorage.getItem(overridesKey)) || [];
    } catch {
        return [];
    }
}

function saveOverrides(overrides) {
    localStorage.setItem(overridesKey, JSON.stringify(overrides));
}

function loadServerExperiments() {
    try {
        return JSON.parse(localStorage.getItem(serverKey)) || [];
    } catch {
        return [];
    }
}

// Keep auto: true ones synced with server rollout
function syncOverridesWithServer() {
    const serverExperiments = loadServerExperiments();
    let overrides = loadOverrides();
    let changed = false;

    experiments.forEach(exp => {
        const serverMatch = serverExperiments.find(s => s.codename === exp.codename);
        if (!serverMatch) return;

        const existingIndex = overrides.findIndex(o => o.codename === exp.codename);
        const override = overrides[existingIndex];

        if (!override) {
            // Add new override from server
            overrides.push({
                codename: exp.codename,
                release_config: exp.release_config,
                treatment: serverMatch.rollout,
                auto: true
            });
            changed = true;
        } else if (override.auto === true) {
            // Update treatment if server rollout changed
            if (override.treatment !== serverMatch.rollout) {
                overrides[existingIndex].treatment = serverMatch.rollout;
                changed = true;
            }
        }
    });

    if (changed) saveOverrides(overrides);
}



// Settings Code

if (!localStorage.getItem('settingsStore')) {
    localStorage.setItem('settingsStore', JSON.stringify({}))
}

let settingsStore = JSON.parse(localStorage.getItem('settingsStore'));

// Initialize settings store
function initializeSettings() {
    if (Object.keys(settingsStore).length === 0) {
        // Initialize with default values
        for (let key in settings) {
            settingsStore[key] = settings[key];
        }
    } else {
        // Only add missing keys, don't overwrite existing ones
        for (let key in settings) {
            if (!(key in settingsStore)) {
                settingsStore[key] = settings[key];
            }
        }
    }
    
    localStorage.setItem('settingsStore', JSON.stringify(settingsStore));
}

initializeSettings();

// Function to change a setting
function changeSetting(key, value) {
    if (key in settingsStore) {
        settingsStore[key] = value;
        
        localStorage.setItem('settingsStore', JSON.stringify(settingsStore));
        
        console.log(`Setting '${key}' changed to ${value}`);
    } else {
        console.error(`Setting '${key}' does not exist`);
    }
}





const params = new URLSearchParams(window.location.search);

function setParams(params) {
    const url = new URL(window.location);

    // Clear all existing query parameters
    url.search = '';

    // Set the new query parameters from the provided object
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    // Update the address bar without reloading the page
    history.replaceState(null, '', url);
}

function addParams(params) {
    const url = new URL(window.location);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    history.replaceState(null, '', url);
}

function removeParams(params) {
    const url = new URL(window.location);

    // Convert params to an array if a single key is passed as a string
    if (!Array.isArray(params)) {
        params = [params];
    }

    // Remove each specified key from the URL parameters
    params.forEach(key => url.searchParams.delete(key));

    // Update the URL without reloading the page
    history.replaceState(null, '', url);
}

if (params.get("itemSkuId")) {
    currentOpenModalId = params.get("itemSkuId");
}

if (params.get("scrollTo")) {
    scrollToCache = params.get("scrollTo");
}


async function verifyOrigin() {

    const rawData = await fetch(redneredAPI + endpoints.VERIFY_ORIGIN);

    if (!rawData.ok) {
        triggerSafetyBlock();
    } else {
        const data = await rawData.json();

        // if (data.message != "The official domain for Shop Archives is yapper.shop, any other domain is most likely a scam or copy." || window.location.hostname != 'yapper.shop' && window.location.hostname != 'dev.yapper.shop' && window.location.hostname != 'beta.yapper.shop') {
        //     triggerSafetyBlock();
        //     return
        // }

        const brickWall = document.getElementById('brick-wall');

        // Fetch User data

        const loginToken = params.get("login");

        if (loginToken) {
            const userLogin = await fetch(redneredAPI + endpoints.USER_LOGIN, {
                method: 'POST',
                headers: {
                    "Authorization": loginToken,
                    'Content-Type': 'application/json'
                }
            });

            if (!userLogin.ok) {
                return
            }

            const data = await userLogin.json();

            localStorage.token = data.token
        }

        if (localStorage.token) {
            const userRawData = await fetch(redneredAPI + endpoints.USER, {
                method: "GET",
                headers: {
                    "Authorization": localStorage.token
                }
            });

            if (!userRawData.ok) {
                triggerSessionExpiredBlock();
                return
            }

            const userData = await userRawData.json();

            localStorage.setItem('currentUser', JSON.stringify(userData));

            currentUserData = JSON.parse(localStorage.getItem('currentUser'));
        }

        // Fetch & Sync Server experiments

        if (localStorage.token) {
            const expRawData = await fetch(redneredAPI + endpoints.SERVER_EXPERIMENTS, {
                method: "GET",
                headers: {
                    "Authorization": localStorage.token
                }
            });

            if (!expRawData.ok) {
                triggerSafetyBlock();
                return
            }

            const expData = await expRawData.json();

            localStorage.setItem('serverExperiments', JSON.stringify(expData));

            syncOverridesWithServer();
        } else {
            const expRawData = await fetch(redneredAPI + endpoints.SERVER_EXPERIMENTS, {
                method: "GET"
            });

            if (!expRawData.ok) {
                triggerSafetyBlock();
                return
            }

            const expData = await expRawData.json();

            localStorage.setItem('serverExperiments', JSON.stringify(expData));

            syncOverridesWithServer();
        }

        if (currentExperimentOverrides && currentExperimentOverrides.find(exp => exp.codename === 'xp_system')?.treatment === 1) {
            await fetchAndUpdateXpEvents();
            await fetchAndUpdateXpInventory();
        }

        await loadSite();

        setTimeout(() => {
            brickWall.classList.add('hide');
            setTimeout(() => {
                brickWall.remove();
            }, 200);
        }, 200);
    }
}

verifyOrigin();

async function fetchAndUpdateXpEvents() {
    try {
        url = redneredAPI + endpoints.USER + endpoints.XP_EVENTS;
        apiUrl = new URL(url);
        if (settingsStore.staff_show_unpublished_xp_events === 1) {
            apiUrl.searchParams.append("include-unpublished", "true");
        }

        const xpEventsRaw = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Authorization": localStorage.token
            }
        });

        if (!xpEventsRaw.ok) {
            createNotice(`There was an error fetching ${endpoints.USER + endpoints.XP_EVENTS}`, 4);
        } else {
            const xpEvents = await xpEventsRaw.json();

            usersXPEventsCache = xpEvents;
        }
    } catch {}
}

async function fetchAndUpdateXpInventory() {
    try {
        const xpInventoryRaw = await fetch(redneredAPI + endpoints.USER + endpoints.XP_INVENTORY, {
            method: "GET",
            headers: {
                "Authorization": localStorage.token
            }
        });

        if (!xpInventoryRaw.ok) {
            createNotice(`There was an error fetching ${endpoints.USER + endpoints.XP_INVENTORY}`, 4);
        } else {
            const xpInventory = await xpInventoryRaw.json();

            usersXPInventoryCache = xpInventory;
        }
    } catch {}
}

async function fetchAndUpdateXpShop() {
    try {
        url = redneredAPI + endpoints.XP_SHOP;
        apiUrl = new URL(url);
        if (settingsStore.staff_show_unpublished_xp_shop === 1) {
            apiUrl.searchParams.append("include-unpublished", "true");
        }

        const xpShopRaw = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Authorization": localStorage.token
            }
        });

        if (!xpShopRaw.ok) {
            createNotice(`There was an error fetching ${endpoints.XP_SHOP}`, 4);
        } else {
            const xpShop = await xpShopRaw.json();

            XPShopCache = xpShop;
        }
    } catch {}
}

async function fetchAndUpdateUserInfo() {
    try {
        const userRawData = await fetch(redneredAPI + endpoints.USER, {
            method: "GET",
            headers: {
                "Authorization": localStorage.token
            }
        });

        if (!userRawData.ok) {
        } else {
            const userData = await userRawData.json();

            localStorage.setItem('currentUser', JSON.stringify(userData));

            currentUserData = JSON.parse(localStorage.getItem('currentUser'));
        }
    } catch {}
}


async function loadSite() {

    if (localStorage.sa_theme) {
        document.body.classList.add('theme-' + localStorage.sa_theme);
    } else if (!localStorage.sa_theme) {
        localStorage.sa_theme = "dark";
        document.body.classList.add('theme-dark');
    }

    if (settingsStore.profile_effect_tweaks_fix === 1) {
        document.body.classList.add('profile-effect-bug-fix-thumbnails');
    }

    const pages = [
        {
            id: 0,
            title: "Featured",
            url: "home",
            body: `
                <div class="categories-container" id="categories-container">
                    <div class="category-container">
                        <div class="shop-category-banner-loading"></div>
                        <div class="products-wrapper">
                            <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },
        {
            id: 1,
            title: "Leaks",
            url: "leaks",
            body: `
                <div class="categories-container" id="categories-container">
                    <div class="category-container">
                        <div class="shop-category-banner-loading"></div>
                        <div class="products-wrapper">
                            <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pagination" id="pagination"></div>
            `
        },
        {
            id: 2,
            title: "Shop All",
            url: "catalog",
            body: `
                <div class="categories-container" id="categories-container">
                    <div class="category-container">
                        <div class="shop-category-banner-loading"></div>
                        <div class="products-wrapper">
                            <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pagination" id="pagination"></div>
            `
        },
        {
            id: 3,
            title: "Orbs Exclusives",
            url: "orbs",
            body: `
                <div class="categories-container" id="categories-container">
                    <div class="category-container">
                        <div class="shop-category-banner-loading"></div>
                        <div class="products-wrapper">
                            <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pagination" id="pagination"></div>
            `
        },
        {
            id: 4,
            title: "Potions",
            url: "consumables",
            body: `
            `
        },
        {
            id: 5,
            title: "Miscellaneous",
            url: "miscellaneous",
            body: `
                <div class="categories-container" id="categories-container">
                    <div class="category-container">
                        <div class="shop-category-banner-loading"></div>
                        <div class="products-wrapper">
                            <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                                <div class="shop-category-card-loading">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pagination" id="pagination"></div>
            `
        }
    ];


    if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'xp_system')?.treatment === 1 && currentUserData) {
        let xpBalance = document.createElement("div");

        usersXPBalance = currentUserData.xp_balance;

        xpBalance.classList.add('my-xp-value-container');
        xpBalance.addEventListener("click", () => {
            setModalv3InnerContent('xp_shop');
        });
        xpBalance.classList.add('has-tooltip');
        xpBalance.setAttribute('data-tooltip', 'You have '+usersXPBalance.toLocaleString()+' XP');

        xpBalance.innerHTML = `
            <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="#D9D9D9"/>
            </svg>                            
            <p id="my-xp-balance">${usersXPBalance.toLocaleString()}</p>
        `;
        
        document.querySelector('.topbar-content').appendChild(xpBalance);
    }

    if (currentUserData) {
        const user = currentUserData;
        
        document.getElementById('ubar-displayname').textContent = user.global_name ? user.global_name : user.username;
        document.getElementById('ubar-username').textContent = user.username;
        let userAvatar = 'https://cdn.discordapp.com/avatars/'+user.id+'/'+user.avatar+'.webp?size=128';
        if (user.avatar.includes('a_')) {
            userAvatar = 'https://cdn.discordapp.com/avatars/'+user.id+'/'+user.avatar+'.gif?size=128';
        }

        document.getElementById('ubar-avatar').src = userAvatar;
        document.getElementById('log-in-with-discord-button-ubar').remove();
    } else {
        document.getElementById('ubar-displayname').remove();
        document.getElementById('ubar-username').remove();
        document.getElementById('ubar-avatar').remove();
    }


    async function renderProduct(category, product) {
        const card = document.createElement("div");
        card.classList.add("shop-category-card");
        card.innerHTML = `
            <div data-shop-card-preview-container>
            </div>
            <div class="card-bottom">
                <h3 data-product-card-name data-product-card-name>${product.name}</h3>
                <p class="shop-card-summary" data-product-card-summary>${product.summary}</p>
                <div class="shop-price-container" data-shop-price-container>
                </div>

                <div class="shop-card-var-container" data-shop-card-var-container>
                </div>

                <a class="shop-card-var-title" data-shop-card-var-title></a>
            </div>
            <div class="card-button-container"data-product-card-open-in-shop>
                <button class="card-button" onclick="redirectToLink('https://discord.com/shop#itemSkuId=${product.sku_id}')" title="Open this item in the Discord Shop">Open In Shop</button>
            </div>
            <div class="shop-card-tag-container" data-shop-card-tag-container>
            </div>
        `;

        const cardTag = card.querySelector("[data-shop-card-tag-container]");

        const priceContainer = card.querySelector("[data-shop-price-container]");

        let priceStandard = null;
        let priceOrb = null;

        if (currentUserData?.premium_type === 2 && product.prices) {
            product.prices["4"]?.country_prices?.prices?.forEach(price => {
                if (price.currency === "usd") {
                    priceStandard = price.amount;
                }
                if (price.currency === "discord_orb") {
                    priceOrb = price.amount;
                }
            });
        } else if (product.prices) {
            product.prices["0"]?.country_prices?.prices?.forEach(price => {
                if (price.currency === "usd") {
                    priceStandard = price.amount;
                }
                if (price.currency === "discord_orb") {
                    priceOrb = price.amount;
                }
            });
            priceContainer.classList.add('hide-nitro-icon');
        }

        let orbsExclusive = true;

        if (priceStandard != null) {
            orbsExclusive = false;
            let us_price = document.createElement("div");
    
            us_price.innerHTML = `
                <div class="nitro-icon"></div>
                <a>US$${(priceStandard / 100).toFixed(2)}</a>
            `;
            
            priceContainer.appendChild(us_price);
        }

        if (priceOrb != null) {
            let orb_price = document.createElement("div");
    
            orb_price.innerHTML = `
                <div class="orb-icon"></div>
                <a>${priceOrb}</a>
            `;
            if (priceStandard != null) {
                orb_price.style.marginLeft = `auto`;
            } else {
                orb_price.style.marginLeft = `unset`;
            }
            
            priceContainer.appendChild(orb_price);
        }

        if (!priceStandard && !priceOrb) {
            orbsExclusive = false;
        }

        if (orbsExclusive) {
            createCardTag('ORBS EXCLUSIVES')
        }

        function createCardTag(text, type, toDate) {
            let tag = document.createElement("p");
            tag.classList.add('shop-card-tag');
            tag.textContent = text;
            cardTag.appendChild(tag);
            if (type === 1) {
                function updateTimer() {
                    const now = new Date();
                    const timeDiff = toDate - now;
        
                    if (timeDiff <= 0) {
                        tag.textContent = `OFF SALE`;
                        clearInterval(timerInterval);
                    } else {
                        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / 1000);
                        tag.textContent = `${days} DAYS LEFT IN SHOP`;
                    }
                }
        
                const timerInterval = setInterval(updateTimer, 1000);
                updateTimer();
            } else if (type === 2) {
                function updateTimer() {
                    const now = new Date();
                    const timeDiff = toDate - now;
        
                    if (timeDiff <= 0) {
                        tag.textContent = `EXPIRED`;
                        clearInterval(timerInterval);
                    } else {
                        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / 1000);
                        tag.textContent = `EXPIRES IN ${days}D ${hours}H`;
                    }
                }
        
                const timerInterval = setInterval(updateTimer, 1000);
                updateTimer();
            }
        }

        const unpublishedAt = new Date(product.unpublished_at);
                                
        if (product.unpublished_at && !isNaN(unpublishedAt.getTime())) {
            createCardTag(null, 1, unpublishedAt)
        }

        const expiresAt = new Date(product.expires_at);
                                
        if (product.expires_at && !isNaN(expiresAt.getTime())) {
            createCardTag(null, 2, expiresAt)
        }

        const previewContainer = card.querySelector('[data-shop-card-preview-container]');
        const itemName = card.querySelector('[data-product-card-name]');
        const itemSummary = card.querySelector('[data-product-card-summary]');

        if (product.type === item_types.AVATAR_DECORATION) {
            previewContainer.classList.add('type-0-preview-container-container')
            previewContainer.innerHTML = `
                <div class="type-0-preview-container">
                    <div class="type-0-preview-background"></div>
                    <img class="type-0-preview" loading="lazy" src="https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === 0).asset}.png?size=4096&passthrough=false"></img>
                </div>
            `;

            const decorationPreview = previewContainer.querySelector('.type-0-preview')
            card.addEventListener("mouseenter", () => {
                decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === 0).asset}.png?size=4096&passthrough=true`;
            });
            card.addEventListener("mouseleave", () => {
                decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === 0).asset}.png?size=4096&passthrough=false`;
            });

        } else if (product.type === item_types.PROFILE_EFFECT) {
            previewContainer.classList.add('type-1-preview-container');

            let effectBG = document.createElement("div");

            effectBG.classList.add('type-1-effect-background')
    
            effectBG.innerHTML = `
                <svg width="383" height="764" viewBox="0 0 383 764" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clip-path="url(#clip0_30_2)">
                <rect width="383" height="142" fill="#424549"/>
                <rect y="142" width="383" height="625" fill="#282B30"/>
                <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" fill="#424549"/>
                <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" stroke="#282B30" stroke-width="7"/>
                <path d="M90.5028 121.958C86.8115 120.235 82.9189 119.019 78.9189 118.335C78.3686 119.333 77.8719 120.358 77.429 121.411C73.1739 120.755 68.8383 120.755 64.5699 121.411C64.1269 120.358 63.6303 119.333 63.0799 118.335C59.0799 119.033 55.1739 120.249 51.4826 121.971C44.1537 133.015 42.1671 143.786 43.1604 154.407C47.4557 157.632 52.2611 160.093 57.3618 161.665C58.5162 160.093 59.5363 158.411 60.4088 156.662C58.7443 156.033 57.147 155.254 55.6168 154.338C56.0195 154.038 56.4088 153.737 56.798 153.436C65.7914 157.742 76.2075 157.742 85.2008 153.436C85.5901 153.75 85.9793 154.065 86.382 154.338C84.8518 155.254 83.2411 156.033 81.5766 156.676C82.4491 158.425 83.4693 160.093 84.6236 161.665C89.7377 160.093 94.5431 157.646 98.8384 154.407C100.006 142.091 96.8519 131.43 90.4894 121.958H90.5028ZM61.684 147.873C58.9189 147.873 56.6235 145.317 56.6235 142.173C56.6235 139.03 58.8249 136.446 61.6705 136.446C64.5162 136.446 66.7846 139.03 66.7309 142.173C66.6773 145.317 64.5028 147.873 61.684 147.873ZM80.3417 147.873C77.5632 147.873 75.2947 145.317 75.2947 142.173C75.2947 139.03 77.4961 136.446 80.3417 136.446C83.1874 136.446 85.4424 139.03 85.3887 142.173C85.335 145.317 83.1605 147.873 80.3417 147.873Z" fill="#929292"/>
                <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" fill="#289960"/>
                <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" stroke="#282B30" stroke-width="5"/>
                <rect x="12" y="208" width="359" height="540" rx="9" fill="#1E2124"/>
                <rect x="27" y="222" width="168" height="25" rx="10" fill="#424549"/>
                <rect x="27" y="405" width="106" height="25" rx="10" fill="#424549"/>
                <rect x="120" y="482" width="107" height="29" rx="10" fill="#424549"/>
                <rect x="27" y="476" width="74" height="74" rx="10" fill="#424549"/>
                <rect x="27" y="565" width="329" height="36" rx="4" fill="#282B30"/>
                <rect x="27" y="336" width="316" height="25" rx="10" fill="#424549"/>
                <rect x="27" y="252" width="83" height="15" rx="7.5" fill="#424549"/>
                <rect x="27" y="384" width="186" height="15" rx="7.5" fill="#424549"/>
                <rect x="27" y="453" width="118" height="15" rx="7.5" fill="#424549"/>
                <rect x="120" y="517" width="69" height="18" rx="9" fill="#424549"/>
                <rect x="37" y="647" width="18" height="18" rx="9" fill="#424549"/>
                <rect x="69" y="648" width="106" height="16" rx="8" fill="#424549"/>
                <path d="M333.564 652.993C333.259 652.726 333.243 652.257 333.53 651.97C333.793 651.707 334.217 651.695 334.494 651.945L338.174 655.257C338.615 655.654 338.615 656.346 338.174 656.743L334.494 660.055C334.217 660.305 333.793 660.293 333.53 660.03C333.243 659.743 333.259 659.274 333.564 659.007L336.14 656.753C336.595 656.354 336.595 655.646 336.14 655.247L333.564 652.993Z" fill="#424549"/>
                <path d="M333.564 710.493C333.259 710.226 333.243 709.757 333.53 709.47C333.793 709.207 334.217 709.195 334.494 709.445L338.174 712.757C338.615 713.154 338.615 713.846 338.174 714.243L334.494 717.555C334.217 717.805 333.793 717.793 333.53 717.53C333.243 717.243 333.259 716.774 333.564 716.507L336.14 714.253C336.595 713.854 336.595 713.146 336.14 712.747L333.564 710.493Z" fill="#424549"/>
                <rect x="69" y="706" width="106" height="16" rx="8" fill="#424549"/>
                <rect x="37" y="705" width="18" height="18" rx="9" fill="#424549"/>
                <rect x="27" y="315" width="71" height="15" rx="7.5" fill="#424549"/>
                <rect x="27" y="290" width="329" height="1" rx="0.5" fill="#424549"/>
                </g>
                <defs>
                <clipPath id="clip0_30_2">
                <rect width="383" height="764" rx="21" fill="white"/>
                </clipPath>
                </defs>
                </svg>
            `;
            
            card.appendChild(effectBG);
            
            // Get the product ID from the first item
            const productId = product.items && product.items[0] ? product.items[0].id : null;
            
            if (productId && discordProfileEffectsCache) {
                // Find the profile effect configuration
                const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);
                
                if (profileEffect) {
                    // Set container to full width and auto height
                    previewContainer.style.width = '100%';
                    previewContainer.style.height = '100%';
                    previewContainer.style.aspectRatio = '0.1';
                    
                    // Create and initialize the profile effects card with card-level hover
                    const effectsCard = new ProfileEffectsCard(previewContainer, profileEffect, card);
                    
                    // Store reference for cleanup if needed
                    card._profileEffectsCard = effectsCard;
                } else {
                    // Fallback if profile effect not found
                    previewContainer.innerHTML = ``;
                }
            } else {
                // Fallback if no product ID or cache
                previewContainer.innerHTML = ``;
            }
        } else if (product.type === item_types.NAMEPLATE) {

            previewContainer.classList.add('type-2-preview-container')

            function createDudNameplatePreview(type) {
                let null_nameplate_user = document.createElement("div");
                
                null_nameplate_user.classList.add('nameplate-null-user');
                null_nameplate_user.innerHTML = `
                    <div class="nameplate-null-user-avatar"></div>
                    <div class="nameplate-null-user-name"></div>
                    <div class="nameplate-preview-status-bg"></div>
                    <div class="nameplate-preview-status-color"></div>
                `;
                if (type === 1) {
                    null_nameplate_user.querySelector('.nameplate-null-user-name').classList.add('_1')
                } else {
                    null_nameplate_user.querySelector('.nameplate-null-user-name').classList.add('_2')
                }

                previewContainer.appendChild(null_nameplate_user);
            }

            previewContainer.innerHTML = `
                <div class="nameplate-fade-top"></div>
                <div class="nameplate-fade-bottom"></div>
            `;

            createDudNameplatePreview(1);
            createDudNameplatePreview(2);

            let nameplate_user = document.createElement("div");
                
            nameplate_user.classList.add('nameplate-null-user');
            nameplate_user.classList.add('nameplate-preview');
            nameplate_user.innerHTML = `
                <video disablepictureinpicture muted loop class="nameplate-null-user nameplate-video-preview" style="position: absolute; height: 100%; width: auto; right: 0;"></video>
                <div class="nameplate-user-avatar"></div>
                <p class="nameplate-user-name">Nameplate</p>
            `;

            if (currentUserData) {
                nameplate_user.querySelector('.nameplate-user-name').textContent = currentUserData.global_name ? currentUserData.global_name : currentUserData.username;
                let userAvatar = 'https://cdn.discordapp.com/avatars/'+currentUserData.id+'/'+currentUserData.avatar+'.webp?size=128';
                if (currentUserData.avatar.includes('a_')) {
                    userAvatar = 'https://cdn.discordapp.com/avatars/'+currentUserData.id+'/'+currentUserData.avatar+'.gif?size=128';
                }

                nameplate_user.querySelector('.nameplate-user-avatar').style.backgroundImage = `url(${userAvatar})`;
            }

            const item = product.items[0];
            const paletteName = item.palette;
            const bgcolor = nameplate_palettes[paletteName].darkBackground;

            const videoElement = nameplate_user.querySelector(".nameplate-video-preview");

            videoElement.src = `https://cdn.discordapp.com/assets/collectibles/${item.asset}asset.webm`;

            nameplate_user.style.backgroundImage = `linear-gradient(90deg, #00000000 -30%, ${bgcolor} 200%)`;

            card.addEventListener("mouseenter", () => {
                videoElement.play();
            });
            card.addEventListener("mouseleave", () => {
                videoElement.pause();
            });

            previewContainer.appendChild(nameplate_user);

            createDudNameplatePreview(2);
            createDudNameplatePreview(1);

        } else if (product.type === item_types.BUNDLE) {
            previewContainer.classList.add('type-1000-preview-container')

            if (product.items.find(item => item.type === 0)) {

                let decorationBundleContainer = document.createElement("div");

                decorationBundleContainer.classList.add('type-0-preview-container')
    
                decorationBundleContainer.innerHTML = `
                    <div class="type-0-preview-background"></div>
                    <img class="type-0-preview" loading="lazy" src="https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=false"></img>
                `;
                
                previewContainer.appendChild(decorationBundleContainer);

                const decorationPreview = decorationBundleContainer.querySelector('.type-0-preview')
                card.addEventListener("mouseenter", () => {
                    decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=true`;
                });
                card.addEventListener("mouseleave", () => {
                    decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=false`;
                });
            }
            if (product.items.find(item => item.type === item_types.PROFILE_EFFECT)) {

                let effectBundleContainer = document.createElement("div");

                effectBundleContainer.classList.add('effectBundleContainer');
    
                effectBundleContainer.innerHTML = `
                    <svg width="383" height="764" viewBox="0 0 383 764" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_30_2)">
                    <rect width="383" height="142" fill="#424549"/>
                    <rect y="142" width="383" height="625" fill="#282B30"/>
                    <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" fill="#424549"/>
                    <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" stroke="#282B30" stroke-width="7"/>
                    <path d="M90.5028 121.958C86.8115 120.235 82.9189 119.019 78.9189 118.335C78.3686 119.333 77.8719 120.358 77.429 121.411C73.1739 120.755 68.8383 120.755 64.5699 121.411C64.1269 120.358 63.6303 119.333 63.0799 118.335C59.0799 119.033 55.1739 120.249 51.4826 121.971C44.1537 133.015 42.1671 143.786 43.1604 154.407C47.4557 157.632 52.2611 160.093 57.3618 161.665C58.5162 160.093 59.5363 158.411 60.4088 156.662C58.7443 156.033 57.147 155.254 55.6168 154.338C56.0195 154.038 56.4088 153.737 56.798 153.436C65.7914 157.742 76.2075 157.742 85.2008 153.436C85.5901 153.75 85.9793 154.065 86.382 154.338C84.8518 155.254 83.2411 156.033 81.5766 156.676C82.4491 158.425 83.4693 160.093 84.6236 161.665C89.7377 160.093 94.5431 157.646 98.8384 154.407C100.006 142.091 96.8519 131.43 90.4894 121.958H90.5028ZM61.684 147.873C58.9189 147.873 56.6235 145.317 56.6235 142.173C56.6235 139.03 58.8249 136.446 61.6705 136.446C64.5162 136.446 66.7846 139.03 66.7309 142.173C66.6773 145.317 64.5028 147.873 61.684 147.873ZM80.3417 147.873C77.5632 147.873 75.2947 145.317 75.2947 142.173C75.2947 139.03 77.4961 136.446 80.3417 136.446C83.1874 136.446 85.4424 139.03 85.3887 142.173C85.335 145.317 83.1605 147.873 80.3417 147.873Z" fill="#929292"/>
                    <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" fill="#289960"/>
                    <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" stroke="#282B30" stroke-width="5"/>
                    <rect x="12" y="208" width="359" height="540" rx="9" fill="#1E2124"/>
                    <rect x="27" y="222" width="168" height="25" rx="10" fill="#424549"/>
                    <rect x="27" y="405" width="106" height="25" rx="10" fill="#424549"/>
                    <rect x="120" y="482" width="107" height="29" rx="10" fill="#424549"/>
                    <rect x="27" y="476" width="74" height="74" rx="10" fill="#424549"/>
                    <rect x="27" y="565" width="329" height="36" rx="4" fill="#282B30"/>
                    <rect x="27" y="336" width="316" height="25" rx="10" fill="#424549"/>
                    <rect x="27" y="252" width="83" height="15" rx="7.5" fill="#424549"/>
                    <rect x="27" y="384" width="186" height="15" rx="7.5" fill="#424549"/>
                    <rect x="27" y="453" width="118" height="15" rx="7.5" fill="#424549"/>
                    <rect x="120" y="517" width="69" height="18" rx="9" fill="#424549"/>
                    <rect x="37" y="647" width="18" height="18" rx="9" fill="#424549"/>
                    <rect x="69" y="648" width="106" height="16" rx="8" fill="#424549"/>
                    <path d="M333.564 652.993C333.259 652.726 333.243 652.257 333.53 651.97C333.793 651.707 334.217 651.695 334.494 651.945L338.174 655.257C338.615 655.654 338.615 656.346 338.174 656.743L334.494 660.055C334.217 660.305 333.793 660.293 333.53 660.03C333.243 659.743 333.259 659.274 333.564 659.007L336.14 656.753C336.595 656.354 336.595 655.646 336.14 655.247L333.564 652.993Z" fill="#424549"/>
                    <path d="M333.564 710.493C333.259 710.226 333.243 709.757 333.53 709.47C333.793 709.207 334.217 709.195 334.494 709.445L338.174 712.757C338.615 713.154 338.615 713.846 338.174 714.243L334.494 717.555C334.217 717.805 333.793 717.793 333.53 717.53C333.243 717.243 333.259 716.774 333.564 716.507L336.14 714.253C336.595 713.854 336.595 713.146 336.14 712.747L333.564 710.493Z" fill="#424549"/>
                    <rect x="69" y="706" width="106" height="16" rx="8" fill="#424549"/>
                    <rect x="37" y="705" width="18" height="18" rx="9" fill="#424549"/>
                    <rect x="27" y="315" width="71" height="15" rx="7.5" fill="#424549"/>
                    <rect x="27" y="290" width="329" height="1" rx="0.5" fill="#424549"/>
                    </g>
                    <defs>
                    <clipPath id="clip0_30_2">
                    <rect width="383" height="764" rx="21" fill="white"/>
                    </clipPath>
                    </defs>
                    </svg>
                    <div class="effectBundleContainerDiv"></div>
                `;
                
                previewContainer.appendChild(effectBundleContainer);

                const effectBundleContainerDiv = effectBundleContainer.querySelector('.effectBundleContainerDiv');
                // Get the product ID from the first item
                const productId = product.items.find(item => item.type === item_types.PROFILE_EFFECT) ? product.items.find(item => item.type === item_types.PROFILE_EFFECT).id : null;
                
                if (productId && discordProfileEffectsCache) {
                    // Find the profile effect configuration
                    const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);

                    if (profileEffect) {
                        // Set container to full width and auto height
                        effectBundleContainerDiv.style.width = '100%';
                        effectBundleContainerDiv.style.height = '100%';
                        effectBundleContainerDiv.style.aspectRatio = '0.1';

                        // Create and initialize the profile effects card with card-level hover
                        const effectsCard = new ProfileEffectsCard(effectBundleContainerDiv, profileEffect, card);

                        // Store reference for cleanup if needed
                        card._profileEffectsCard = effectsCard;
                    } else {
                        // Fallback if profile effect not found
                        effectBundleContainerDiv.innerHTML = ``;
                    }
                } else {
                    // Fallback if no product ID or cache
                    effectBundleContainerDiv.innerHTML = ``;
                }
            }
            itemSummary.textContent = `Bundle includes: ${product.bundled_products.find(item => item.type === item_types.AVATAR_DECORATION).name} Decoration & ${product.bundled_products.find(item => item.type === item_types.PROFILE_EFFECT).name} Profile Effect`;
        } else if (product.type === item_types.VARIANTS_GROUP) {
            previewContainer.classList.add('type-2000-preview-container')

            const variantContainer = card.querySelector("[data-shop-card-var-container]");
            variantContainer.innerHTML = "";
            let currentSelectedVariant = null;
            let isFirstTimeLoadingVariant = true;

            product.variants.forEach((variant, index) => {
                
                let variantColorBlock = document.createElement("div");

                variantColorBlock.classList.add("shop-card-var");
                variantColorBlock.id = "shop-card-var";
                variantColorBlock.style.backgroundColor = `${variant.variant_value}`;
        
                // Add click event listener to switch variants
                variantColorBlock.addEventListener("click", () => {
                    if (currentSelectedVariant) {
                        currentSelectedVariant.classList.remove("shop-card-var-selected");
                    }
                    variantColorBlock.classList.add("shop-card-var-selected");
                    currentSelectedVariant = variantColorBlock;
                    applyVariant(variant)
                });
        
                // Append the color block to the container
                variantContainer.appendChild(variantColorBlock);
        
                // Set the first variant as the default selected
                if (index === 0) {
                    currentSelectedVariant = variantColorBlock;
                    variantColorBlock.classList.add("shop-card-var-selected");
                }
            });

            function applyVariant(selectedVariant) {
                card.querySelector("[data-shop-card-var-title]").textContent = `(${selectedVariant.variant_label})`;

                itemName.textContent = selectedVariant.base_variant_name;

                if (selectedVariant.type === 0) {
                    previewContainer.innerHTML = "";
                    let decorationBundleContainer = document.createElement("div");
    
                    decorationBundleContainer.classList.add('type-0-preview-container')
        
                    decorationBundleContainer.innerHTML = `
                        <div class="type-0-preview-background"></div>
                        <img class="type-0-preview" loading="lazy" src="https://cdn.discordapp.com/avatar-decoration-presets/${selectedVariant.items[0].asset}.png?size=4096&passthrough=false"></img>
                    `;
                    
                    previewContainer.appendChild(decorationBundleContainer);
                    
                    // Add the avatar decoration based on the selected variant
                    selectedVariant.items?.forEach(item => {
                        const decorationPreview = decorationBundleContainer.querySelector('.type-0-preview')
                        if (isFirstTimeLoadingVariant == true) {
                            decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=4096&passthrough=false`;
                            isFirstTimeLoadingVariant = false;
                        } else {
                            decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=4096&passthrough=true`;
                        }

                        card.addEventListener("mouseenter", () => {
                            decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=4096&passthrough=true`;
                        });
                        card.addEventListener("mouseleave", () => {
                            decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=4096&passthrough=false`;
                        });
                    });
                } else if (selectedVariant.type === 1) {
                    previewContainer.innerHTML = "";
                    previewContainer.classList.add('type-1-preview-container');

                    let effectBG = document.createElement("div");

                    effectBG.classList.add('type-1-effect-background')
    
                    effectBG.innerHTML = `
                        <svg width="383" height="764" viewBox="0 0 383 764" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clip-path="url(#clip0_30_2)">
                        <rect width="383" height="142" fill="#424549"/>
                        <rect y="142" width="383" height="625" fill="#282B30"/>
                        <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" fill="#424549"/>
                        <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" stroke="#282B30" stroke-width="7"/>
                        <path d="M90.5028 121.958C86.8115 120.235 82.9189 119.019 78.9189 118.335C78.3686 119.333 77.8719 120.358 77.429 121.411C73.1739 120.755 68.8383 120.755 64.5699 121.411C64.1269 120.358 63.6303 119.333 63.0799 118.335C59.0799 119.033 55.1739 120.249 51.4826 121.971C44.1537 133.015 42.1671 143.786 43.1604 154.407C47.4557 157.632 52.2611 160.093 57.3618 161.665C58.5162 160.093 59.5363 158.411 60.4088 156.662C58.7443 156.033 57.147 155.254 55.6168 154.338C56.0195 154.038 56.4088 153.737 56.798 153.436C65.7914 157.742 76.2075 157.742 85.2008 153.436C85.5901 153.75 85.9793 154.065 86.382 154.338C84.8518 155.254 83.2411 156.033 81.5766 156.676C82.4491 158.425 83.4693 160.093 84.6236 161.665C89.7377 160.093 94.5431 157.646 98.8384 154.407C100.006 142.091 96.8519 131.43 90.4894 121.958H90.5028ZM61.684 147.873C58.9189 147.873 56.6235 145.317 56.6235 142.173C56.6235 139.03 58.8249 136.446 61.6705 136.446C64.5162 136.446 66.7846 139.03 66.7309 142.173C66.6773 145.317 64.5028 147.873 61.684 147.873ZM80.3417 147.873C77.5632 147.873 75.2947 145.317 75.2947 142.173C75.2947 139.03 77.4961 136.446 80.3417 136.446C83.1874 136.446 85.4424 139.03 85.3887 142.173C85.335 145.317 83.1605 147.873 80.3417 147.873Z" fill="#929292"/>
                        <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" fill="#289960"/>
                        <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" stroke="#282B30" stroke-width="5"/>
                        <rect x="12" y="208" width="359" height="540" rx="9" fill="#1E2124"/>
                        <rect x="27" y="222" width="168" height="25" rx="10" fill="#424549"/>
                        <rect x="27" y="405" width="106" height="25" rx="10" fill="#424549"/>
                        <rect x="120" y="482" width="107" height="29" rx="10" fill="#424549"/>
                        <rect x="27" y="476" width="74" height="74" rx="10" fill="#424549"/>
                        <rect x="27" y="565" width="329" height="36" rx="4" fill="#282B30"/>
                        <rect x="27" y="336" width="316" height="25" rx="10" fill="#424549"/>
                        <rect x="27" y="252" width="83" height="15" rx="7.5" fill="#424549"/>
                        <rect x="27" y="384" width="186" height="15" rx="7.5" fill="#424549"/>
                        <rect x="27" y="453" width="118" height="15" rx="7.5" fill="#424549"/>
                        <rect x="120" y="517" width="69" height="18" rx="9" fill="#424549"/>
                        <rect x="37" y="647" width="18" height="18" rx="9" fill="#424549"/>
                        <rect x="69" y="648" width="106" height="16" rx="8" fill="#424549"/>
                        <path d="M333.564 652.993C333.259 652.726 333.243 652.257 333.53 651.97C333.793 651.707 334.217 651.695 334.494 651.945L338.174 655.257C338.615 655.654 338.615 656.346 338.174 656.743L334.494 660.055C334.217 660.305 333.793 660.293 333.53 660.03C333.243 659.743 333.259 659.274 333.564 659.007L336.14 656.753C336.595 656.354 336.595 655.646 336.14 655.247L333.564 652.993Z" fill="#424549"/>
                        <path d="M333.564 710.493C333.259 710.226 333.243 709.757 333.53 709.47C333.793 709.207 334.217 709.195 334.494 709.445L338.174 712.757C338.615 713.154 338.615 713.846 338.174 714.243L334.494 717.555C334.217 717.805 333.793 717.793 333.53 717.53C333.243 717.243 333.259 716.774 333.564 716.507L336.14 714.253C336.595 713.854 336.595 713.146 336.14 712.747L333.564 710.493Z" fill="#424549"/>
                        <rect x="69" y="706" width="106" height="16" rx="8" fill="#424549"/>
                        <rect x="37" y="705" width="18" height="18" rx="9" fill="#424549"/>
                        <rect x="27" y="315" width="71" height="15" rx="7.5" fill="#424549"/>
                        <rect x="27" y="290" width="329" height="1" rx="0.5" fill="#424549"/>
                        </g>
                        <defs>
                        <clipPath id="clip0_30_2">
                        <rect width="383" height="764" rx="21" fill="white"/>
                        </clipPath>
                        </defs>
                        </svg>
                    `;

                    card.appendChild(effectBG);

                    // Get the product ID from the first item
                    const productId = selectedVariant.items && selectedVariant.items[0] ? selectedVariant.items[0].id : null;

                    if (productId && discordProfileEffectsCache) {
                        // Find the profile effect configuration
                        const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);

                        if (profileEffect) {
                            // Set container to full width and auto height
                            previewContainer.style.width = '100%';
                            previewContainer.style.height = '100%';
                            previewContainer.style.aspectRatio = '0.1';



                            // Create and initialize the profile effects card with card-level hover
                            if (isFirstTimeLoadingVariant == true) {
                                const effectsCard = new ProfileEffectsCard(previewContainer, profileEffect, card, {
                                    startImmediately: false
                                });
                                isFirstTimeLoadingVariant = false;

                                // Store reference for cleanup if needed
                                card._profileEffectsCard = effectsCard;
                            } else {
                                card._profileEffectsCard.updateProfileEffect(profileEffect, true);
                            }
                        } else {
                            // Fallback if profile effect not found
                            previewContainer.innerHTML = ``;
                        }
                    } else {
                        // Fallback if no product ID or cache
                        previewContainer.innerHTML = ``;
                    }
                }
            }
        
            // Apply the default variant (first one) initially
            if (product.variants.length > 0) {
                applyVariant(product.variants[0]);
            }

        } else if (product.type === item_types.EXTERNAL_SKU) {
            if (product.sku_id === external_skus.ORB_PROFILE_BADGE) {
                previewContainer.classList.add('type-3000-card-preview-container');
                    
                previewContainer.innerHTML = `
                    <video loop disablepictureinpicture class="type-3000-card-preview profile-badge-orb-preview" id="orb-profile-badge-card-video" src="https://cdn.discordapp.com/assets/content/ccaa60fae2114887bfa2e413be11d62c6d194139ee0f33671825ff06a1050692.webm"></video>
                `;

                card.addEventListener("mouseenter", () => {
                    card.querySelector("#orb-profile-badge-card-video").play();
                });
                card.addEventListener("mouseleave", () => {
                    card.querySelector("#orb-profile-badge-card-video").pause();
                    card.querySelector("#orb-profile-badge-card-video").currentTime = 0;
                });
            } else if (product.sku_id === external_skus.NITRO_CREDITS_3_DAYS) {
                previewContainer.classList.add('type-3000-card-preview-container');
                    
                previewContainer.innerHTML = `
                    <svg class="type-3000-card-preview nitro-3-days-orb-preview" width="187" height="187" viewBox="0 0 187 187" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M161.164 3.17212H30.5663C16.8601 3.17212 5.74902 14.3031 5.74902 28.0339V158.866C5.74902 172.597 16.8601 183.728 30.5663 183.728H161.164C174.87 183.728 185.982 172.597 185.982 158.866V28.0339C185.982 14.3031 174.87 3.17212 161.164 3.17212Z" fill="url(#paint0_linear_170_2)"/>
                    <g filter="url(#filter0_d_170_2)">
                    <path d="M100.125 107.318C106.339 107.318 111.376 102.266 111.376 96.0332C111.376 89.8007 106.339 84.7483 100.125 84.7483C93.9113 84.7483 88.874 89.8007 88.874 96.0332C88.874 102.266 93.9113 107.318 100.125 107.318Z" fill="white"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M55.1214 50.8938C52.0146 50.8938 49.496 53.42 49.496 56.5362C49.496 59.6525 52.0146 62.1787 55.1214 62.1787H71.9979C75.1048 62.1787 77.6235 64.7049 77.6235 67.8211C77.6235 70.9373 75.1048 73.4635 71.9979 73.4635H46.6832C43.5763 73.4635 41.0576 75.9897 41.0576 79.106C41.0576 82.2222 43.5763 84.7484 46.6832 84.7484H60.7469C63.8539 84.7484 66.3724 87.2746 66.3724 90.3908C66.3724 93.5071 63.8539 96.0333 60.7469 96.0333H49.496C46.389 96.0333 43.8704 98.5595 43.8704 101.676C43.8704 104.792 46.389 107.318 49.496 107.318H56.5393C61.5352 126.787 79.1553 141.173 100.125 141.173C124.981 141.173 145.13 120.963 145.13 96.0333C145.13 71.1035 124.981 50.8938 100.125 50.8938H55.1214ZM100.125 118.603C112.553 118.603 122.627 108.498 122.627 96.0333C122.627 83.5683 112.553 73.4635 100.125 73.4635C87.6979 73.4635 77.6235 83.5683 77.6235 96.0333C77.6235 108.498 87.6979 118.603 100.125 118.603Z" fill="white"/>
                    <path d="M29.8064 84.7485C32.9133 84.7485 35.4319 82.2223 35.4319 79.1061C35.4319 75.9898 32.9133 73.4636 29.8064 73.4636H26.9936C23.8868 73.4636 21.3682 75.9898 21.3682 79.1061C21.3682 82.2223 23.8868 84.7485 26.9936 84.7485H29.8064Z" fill="white"/>
                    </g>
                    <defs>
                    <filter id="filter0_d_170_2" x="7.48094" y="42.5615" width="151.536" height="118.053" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="5.55489"/>
                    <feGaussianBlur stdDeviation="6.94361"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_170_2"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_170_2" result="shape"/>
                    </filter>
                    <linearGradient id="paint0_linear_170_2" x1="160.748" y1="183.303" x2="46.3474" y2="36.4729" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E978E6"/>
                    <stop offset="1" stop-color="#2F3EBB"/>
                    </linearGradient>
                    </defs>
                    </svg>
                `;
            } else {
                cardTag.innerHTML = `
                    <p class="shop-card-tag">UPDATE REQUIRED</p>
                `;
            }
        } else {
            createCardTag('UPDATE REQUIRED')
        }

        card.addEventListener("click", (event) => {
            if (event.target.matches(".shop-card-var")) {
            } else {
                openProductModal();
                addParams({itemSkuId: product.sku_id})
            }
        });

        if (currentOpenModalId === product.sku_id) {
            setTimeout(() => {
                openProductModal();
            }, 500);
        }

        async function openProductModal() {
            let modal = document.createElement("div");

            modal.classList.add('modalv2');

            let logoAsset = 'https://cdn.yapper.shop/assets/31.png'
            if (category.logo != null) {
                logoAsset = `https://cdn.discordapp.com/app-assets/1096190356233670716/${category.logo}.png?size=4096`
            }

            modal.innerHTML = `
                <div class="modalv2-inner">
                    <div class="modalv2-tabs-container">
                        <div class="tab selected" id="modalv2-tab-1">
                            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="24" r="6" fill="currentColor"/>
                                <circle cx="12" cy="72" r="6" fill="currentColor"/>
                                <circle cx="12" cy="48" r="6" fill="currentColor"/>
                                <rect x="28" y="20" width="60" height="8" rx="4" fill="currentColor"/>
                                <path d="M72.124 44.0029C64.5284 44.0668 57.6497 47.1046 52.6113 52H32C29.7909 52 28 50.2091 28 48C28 45.7909 29.7909 44 32 44H72C72.0415 44 72.0828 44.0017 72.124 44.0029Z" fill="currentColor"/>
                                <path d="M44.2852 68C44.0983 69.3065 44 70.6418 44 72C44 73.3582 44.0983 74.6935 44.2852 76H32C29.7909 76 28 74.2091 28 72C28 69.7909 29.7909 68 32 68H44.2852Z" fill="currentColor"/>
                                <circle cx="72" cy="72" r="16" stroke="currentColor" stroke-width="8"/>
                                <rect x="81" y="85.9497" width="7" height="16" rx="3.5" transform="rotate(-45 81 85.9497)" fill="currentColor"/>
                            </svg>
                            <p>Details</p>
                        </div>
                        <div class="tab" id="modalv2-tab-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.7376 3.18925C15.4883 2.93731 15.0814 2.93686 14.8316 3.18824L14.0087 4.01625C13.7618 4.26471 13.7614 4.66581 14.0078 4.91476L20.3804 11.3527C20.6265 11.6013 20.6265 12.0017 20.3804 12.2503L14.0078 18.6882C13.7614 18.9373 13.7618 19.3383 14.0087 19.5867L14.8316 20.4148C15.0814 20.6662 15.4883 20.6658 15.7376 20.4138L23.815 12.2503C24.061 12.0016 24.061 11.6014 23.815 11.3528L15.7376 3.18925Z" fill="currentColor"/>
                                <path d="M9.99171 4.91476C10.2381 4.66581 10.2377 4.26471 9.99081 4.01625L9.16787 3.18824C8.91804 2.93686 8.51118 2.93731 8.2619 3.18925L0.184466 11.3528C-0.0614893 11.6014 -0.061488 12.0016 0.184466 12.2503L8.2619 20.4138C8.51118 20.6658 8.91803 20.6662 9.16787 20.4148L9.99081 19.5867C10.2377 19.3383 10.2381 18.9373 9.99171 18.6882L3.61906 12.2503C3.37298 12.0017 3.37298 11.6013 3.61906 11.3527L9.99171 4.91476Z" fill="currentColor"/>
                            </svg>
                            <p>Raw</p>
                        </div>
                    </div>
                    
                    <div id="modalv2-inner-content">
                    </div>

                    <div data-modal-top-product-buttons>
                        <div class="has-tooltip" data-tooltip="Close" data-close-product-card-button>
                            <svg class="modalv2_top_icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path></svg>
                        </div>
                        <div class="has-tooltip" data-tooltip="Copy Discord Link">
                            <svg class="modalv2_top_icon" onclick="copyValue('https://canary.discord.com/shop#itemSkuId=${product.sku_id}');" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M16.32 14.72a1 1 0 0 1 0-1.41l2.51-2.51a3.98 3.98 0 0 0-5.62-5.63l-2.52 2.51a1 1 0 0 1-1.41-1.41l2.52-2.52a5.98 5.98 0 0 1 8.45 8.46l-2.52 2.51a1 1 0 0 1-1.41 0ZM7.68 9.29a1 1 0 0 1 0 1.41l-2.52 2.51a3.98 3.98 0 1 0 5.63 5.63l2.51-2.52a1 1 0 0 1 1.42 1.42l-2.52 2.51a5.98 5.98 0 0 1-8.45-8.45l2.51-2.51a1 1 0 0 1 1.42 0Z" class=""></path><path fill="currentColor" d="M14.7 10.7a1 1 0 0 0-1.4-1.4l-4 4a1 1 0 1 0 1.4 1.4l4-4Z" class=""></path></svg>
                        </div>
                    </div>
                </div>
            `;

            function changeModalTab(tab) {
                modal.querySelectorAll('.selected').forEach((el) => {
                    el.classList.remove("selected");
                });

                modal.querySelector('#modalv2-tab-'+tab).classList.add('selected');

                const modalInner = modal.querySelector('#modalv2-inner-content');

                if (tab === '1') {
                    modalInner.innerHTML = `
                        <div class="modalv2-left">
                            <div class="modalv2-preview-container"></div>
                            <div class="modalv2-bottom-container">
                                <p class="sku_id has-tooltip" data-tooltip="Click To Copy" onclick="copyValue('${product.sku_id}')">${product.sku_id}</p>
                                <h3>${product.name}</h3>
                                <p class="modal-summary">${product.summary}</p>
                                <div class="modalv2-price-container"></div>
                                <div class="modalv2-price-container-crossed"></div>
                                <div class="modalv2-var-container">
                                    <div class="shop-card-var-container" data-shop-card-var-container></div>
                                    <a class="shop-card-var-title" data-shop-card-var-title></a>
                                </div>
                                <button onclick="redirectToLink('https://discord.com/shop#itemSkuId=${product.sku_id}')" title="Open this item in the Discord Shop">Open In Shop</button>
                            </div>
                        </div>
                        <div class="modalv2-right">
                            <img class="modalv2-right-bg-img" src="https://cdn.discordapp.com/app-assets/1096190356233670716/${category.pdp_bg ? category.pdp_bg : category.banner}.png?size=4096"></img>
                            <img class="modalv2-right-logo-img" src="${logoAsset}"></img>

                            <div class="modal2-profile-preview">
                                <div class="modal-preview-profile" style="height: 210px;">
                                    <div class="options-preview-profile-banner-color"></div>
                                    <div class="options-preview-profile-banner"></div>
                                    <div class="profile-avatar-preview-bg"></div>
                                    <div class="profile-avatar-preview"></div>
                                    <p class="options-preview-profile-displayname">Shop Archives</p>
                                    <p class="options-preview-profile-username">yapper.shop</p>
                                    <img class="profile-avatar-deco-preview">
                                    <div class="options-preview-profile-status-bg"></div>
                                    <div class="options-preview-profile-status-color"></div>
                                    <div class="profile-profile-effects-preview"></div>
                                </div>
                            </div>

                        </div>
                    `;

                    if (currentUserData) {
                        if (currentUserData.banner_color) modalInner.querySelector('.options-preview-profile-banner-color').style.backgroundColor = currentUserData.banner_color;
                        if (currentUserData.avatar) modalInner.querySelector('.profile-avatar-preview').style.backgroundImage = `url(https://cdn.discordapp.com/avatars/${currentUserData.id}/${currentUserData.avatar}.webp?size=128)`;
                        if (currentUserData.banner) modalInner.querySelector('.options-preview-profile-banner').style.backgroundImage = `url(https://cdn.discordapp.com/banners/${currentUserData.id}/${currentUserData.banner}.webp?size=480)`;
                        if (currentUserData.global_name) {
                            modalInner.querySelector('.options-preview-profile-displayname').textContent = currentUserData.global_name;
                        } else {
                            modalInner.querySelector('.options-preview-profile-displayname').textContent = currentUserData.username;
                        }
                        modalInner.querySelector('.options-preview-profile-username').textContent = currentUserData.username;
                    }

                    const priceContainer = modalInner.querySelector(".modalv2-price-container");
                    const priceContainer2 = modalInner.querySelector(".modalv2-price-container-crossed");

                    let priceStandard = null;
                    let priceOrb = null;
                    let priceStandardCrossed = null;
                    let priceOrbCrossed = null;

                    if (currentUserData?.premium_type === 2 && product.prices) {
                        product.prices["4"]?.country_prices?.prices?.forEach(price => {
                            if (price.currency === "usd") {
                                priceStandard = price.amount;
                            }
                            if (price.currency === "discord_orb") {
                                priceOrb = price.amount;
                            }
                        });

                        product.prices["0"]?.country_prices?.prices?.forEach(price => {
                            if (price.currency === "usd") {
                                priceStandardCrossed = price.amount;
                            }
                            if (price.currency === "discord_orb") {
                                priceOrbCrossed = price.amount;
                            }
                        });

                        if (priceStandard != null) {
                            let us_price = document.createElement("div");
        
                            us_price.innerHTML = `
                                <div class="nitro-icon"></div>
                                <a>US$${(priceStandard / 100).toFixed(2)}</a>
                            `;
    
                            priceContainer.appendChild(us_price);
                        }
    
                        if (priceOrb != null) {
                            let orb_price = document.createElement("div");
        
                            orb_price.innerHTML = `
                                <div class="orb-icon"></div>
                                <a>${priceOrb}</a>
                            `;
                            if (priceStandard != null) {
                                orb_price.style.marginLeft = `auto`;
                            } else {
                                orb_price.style.marginLeft = `unset`;
                            }
    
                            priceContainer.appendChild(orb_price);
                        }


                        if (priceStandardCrossed != null) {
                            let us_price = document.createElement("div");
        
                            us_price.innerHTML = `
                                <a>US$${(priceStandardCrossed / 100).toFixed(2)}</a>
                            `;
    
                            priceContainer2.appendChild(us_price);
                        }
    
                        if (priceOrbCrossed != null) {
                            let orb_price = document.createElement("div");
        
                            orb_price.innerHTML = `
                                <div class="orb-icon"></div>
                                <a>${priceOrbCrossed}</a>
                            `;
                            if (priceStandard != null) {
                                orb_price.style.marginLeft = `auto`;
                            } else {
                                orb_price.style.marginLeft = `unset`;
                            }
    
                            priceContainer2.appendChild(orb_price);
                        }

                    } else if (product.prices) {
                        product.prices["0"]?.country_prices?.prices?.forEach(price => {
                            if (price.currency === "usd") {
                                priceStandard = price.amount;
                            }
                            if (price.currency === "discord_orb") {
                                priceOrb = price.amount;
                            }
                        });

                        product.prices["4"]?.country_prices?.prices?.forEach(price => {
                            if (price.currency === "usd") {
                                priceStandardCrossed = price.amount;
                            }
                            if (price.currency === "discord_orb") {
                                priceOrbCrossed = price.amount;
                            }
                        });

                        if (priceStandard != null) {
                            let us_price = document.createElement("div");
        
                            us_price.innerHTML = `
                                <a>US$${(priceStandard / 100).toFixed(2)}</a>
                            `;
    
                            priceContainer.appendChild(us_price);
                        }
    
                        if (priceOrb != null) {
                            let orb_price = document.createElement("div");
        
                            orb_price.innerHTML = `
                                <div class="orb-icon"></div>
                                <a>${priceOrb}</a>
                            `;
                            if (priceStandard != null) {
                                orb_price.style.marginLeft = `auto`;
                            } else {
                                orb_price.style.marginLeft = `unset`;
                            }
    
                            priceContainer.appendChild(orb_price);
                        }


                        if (priceStandardCrossed != null) {
                            let us_price = document.createElement("div");
        
                            us_price.innerHTML = `
                                <div class="nitro-icon"></div>
                                <a>US$${(priceStandardCrossed / 100).toFixed(2)}</a>
                            `;
    
                            priceContainer2.appendChild(us_price);
                        }
    
                        if (priceOrbCrossed != null) {
                            let orb_price = document.createElement("div");
        
                            orb_price.innerHTML = `
                                <div class="orb-icon"></div>
                                <a>${priceOrbCrossed}</a>
                            `;
                            if (priceStandard != null) {
                                orb_price.style.marginLeft = `auto`;
                            } else {
                                orb_price.style.marginLeft = `unset`;
                            }
    
                            priceContainer2.appendChild(orb_price);
                        }
                    }

                    const sku_id = modalInner.querySelector('.sku_id');

                    sku_id.addEventListener("click", function () {
                        sku_id.classList.add('clicked');
                        setTimeout(() => {
                            sku_id.classList.remove('clicked');
                        }, 500);
                    });

                    const modalPreviewContainer = modalInner.querySelector('.modalv2-preview-container');

                    const modalSummary = modalInner.querySelector('.modal-summary');

                    if (product.type === item_types.AVATAR_DECORATION) {

                        modalInner.querySelector('.profile-avatar-deco-preview').src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=true`

                        modalPreviewContainer.innerHTML = `
                            <div class="type-0-preview-container">
                                <div class="type-0-preview-background"></div>
                                <img class="type-0-preview" loading="lazy" src="https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=false">
                            </div>
                        `;

                        const decoPreview = modalPreviewContainer.querySelector('.type-0-preview');

                        decoPreview.addEventListener("mouseenter", () => {
                            decoPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=true`;
                        });
                        decoPreview.addEventListener("mouseleave", () => {
                            decoPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=false`;
                        });
                    } else if (product.type === item_types.PROFILE_EFFECT) {

                        modalInner.querySelector('.profile-avatar-deco-preview').remove();

                        modalInner.querySelector('.modal-preview-profile').style.height = '400px';

                        modalInner.querySelector('.profile-profile-effects-preview').innerHTML = `
                            <div class="modal-profile-profile-effect-preview"></div>
                        `;

                        const profileProfileEffectPreview = modalInner.querySelector('.modal-profile-profile-effect-preview');

                        // Get the product ID from the first item
                        const productId = product.items && product.items[0] ? product.items[0].id : null;

                        if (productId && discordProfileEffectsCache) {
                            // Find the profile effect configuration
                            const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);

                            if (profileEffect) {
                                // Set container to full width and auto height
                                profileProfileEffectPreview.style.width = '100%';
                                profileProfileEffectPreview.style.height = '100%';
                                profileProfileEffectPreview.style.aspectRatio = '0.1';

                                // Create and initialize the profile effects card with card-level hover
                                const effectsCard = new ProfileEffectsCard(profileProfileEffectPreview, profileEffect, document.querySelector('.something-nobody-is-gonna-hover'), {
                                    startImmediately: true
                                });

                                // Store reference for cleanup if needed
                                document.querySelector('.something-nobody-is-gonna-hover')._profileEffectsCard = effectsCard;
                            } else {
                                // Fallback if profile effect not found
                                profileProfileEffectPreview.innerHTML = ``;
                            }
                        } else {
                            // Fallback if no product ID or cache
                            profileProfileEffectPreview.innerHTML = ``;
                        }






                        let effectBG = document.createElement("div");

                        effectBG.classList.add('type-1-effect-background')
    
                        effectBG.innerHTML = `
                            <svg width="383" height="764" viewBox="0 0 383 764" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_30_2)">
                            <rect width="383" height="142" fill="#424549"/>
                            <rect y="142" width="383" height="625" fill="#282B30"/>
                            <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" fill="#424549"/>
                            <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" stroke="#282B30" stroke-width="7"/>
                            <path d="M90.5028 121.958C86.8115 120.235 82.9189 119.019 78.9189 118.335C78.3686 119.333 77.8719 120.358 77.429 121.411C73.1739 120.755 68.8383 120.755 64.5699 121.411C64.1269 120.358 63.6303 119.333 63.0799 118.335C59.0799 119.033 55.1739 120.249 51.4826 121.971C44.1537 133.015 42.1671 143.786 43.1604 154.407C47.4557 157.632 52.2611 160.093 57.3618 161.665C58.5162 160.093 59.5363 158.411 60.4088 156.662C58.7443 156.033 57.147 155.254 55.6168 154.338C56.0195 154.038 56.4088 153.737 56.798 153.436C65.7914 157.742 76.2075 157.742 85.2008 153.436C85.5901 153.75 85.9793 154.065 86.382 154.338C84.8518 155.254 83.2411 156.033 81.5766 156.676C82.4491 158.425 83.4693 160.093 84.6236 161.665C89.7377 160.093 94.5431 157.646 98.8384 154.407C100.006 142.091 96.8519 131.43 90.4894 121.958H90.5028ZM61.684 147.873C58.9189 147.873 56.6235 145.317 56.6235 142.173C56.6235 139.03 58.8249 136.446 61.6705 136.446C64.5162 136.446 66.7846 139.03 66.7309 142.173C66.6773 145.317 64.5028 147.873 61.684 147.873ZM80.3417 147.873C77.5632 147.873 75.2947 145.317 75.2947 142.173C75.2947 139.03 77.4961 136.446 80.3417 136.446C83.1874 136.446 85.4424 139.03 85.3887 142.173C85.335 145.317 83.1605 147.873 80.3417 147.873Z" fill="#929292"/>
                            <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" fill="#289960"/>
                            <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" stroke="#282B30" stroke-width="5"/>
                            <rect x="12" y="208" width="359" height="540" rx="9" fill="#1E2124"/>
                            <rect x="27" y="222" width="168" height="25" rx="10" fill="#424549"/>
                            <rect x="27" y="405" width="106" height="25" rx="10" fill="#424549"/>
                            <rect x="120" y="482" width="107" height="29" rx="10" fill="#424549"/>
                            <rect x="27" y="476" width="74" height="74" rx="10" fill="#424549"/>
                            <rect x="27" y="565" width="329" height="36" rx="4" fill="#282B30"/>
                            <rect x="27" y="336" width="316" height="25" rx="10" fill="#424549"/>
                            <rect x="27" y="252" width="83" height="15" rx="7.5" fill="#424549"/>
                            <rect x="27" y="384" width="186" height="15" rx="7.5" fill="#424549"/>
                            <rect x="27" y="453" width="118" height="15" rx="7.5" fill="#424549"/>
                            <rect x="120" y="517" width="69" height="18" rx="9" fill="#424549"/>
                            <rect x="37" y="647" width="18" height="18" rx="9" fill="#424549"/>
                            <rect x="69" y="648" width="106" height="16" rx="8" fill="#424549"/>
                            <path d="M333.564 652.993C333.259 652.726 333.243 652.257 333.53 651.97C333.793 651.707 334.217 651.695 334.494 651.945L338.174 655.257C338.615 655.654 338.615 656.346 338.174 656.743L334.494 660.055C334.217 660.305 333.793 660.293 333.53 660.03C333.243 659.743 333.259 659.274 333.564 659.007L336.14 656.753C336.595 656.354 336.595 655.646 336.14 655.247L333.564 652.993Z" fill="#424549"/>
                            <path d="M333.564 710.493C333.259 710.226 333.243 709.757 333.53 709.47C333.793 709.207 334.217 709.195 334.494 709.445L338.174 712.757C338.615 713.154 338.615 713.846 338.174 714.243L334.494 717.555C334.217 717.805 333.793 717.793 333.53 717.53C333.243 717.243 333.259 716.774 333.564 716.507L336.14 714.253C336.595 713.854 336.595 713.146 336.14 712.747L333.564 710.493Z" fill="#424549"/>
                            <rect x="69" y="706" width="106" height="16" rx="8" fill="#424549"/>
                            <rect x="37" y="705" width="18" height="18" rx="9" fill="#424549"/>
                            <rect x="27" y="315" width="71" height="15" rx="7.5" fill="#424549"/>
                            <rect x="27" y="290" width="329" height="1" rx="0.5" fill="#424549"/>
                            </g>
                            <defs>
                            <clipPath id="clip0_30_2">
                            <rect width="383" height="764" rx="21" fill="white"/>
                            </clipPath>
                            </defs>
                            </svg>
                        `;
                        

                        let effectContainer = document.createElement("div");

                        effectContainer.classList.add('type-1-effect-preview')
    
                        effectContainer.innerHTML = `
                            <div class="modal-profile-effect-preview"></div>
                        `;

                        effectContainer.appendChild(effectBG);

                        modalPreviewContainer.appendChild(effectContainer);


                        const effectPreview = effectContainer.querySelector('.modal-profile-effect-preview');

                        if (productId && discordProfileEffectsCache) {
                            // Find the profile effect configuration
                            const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);

                            if (profileEffect) {
                                // Set container to full width and auto height
                                effectPreview.style.width = '100%';
                                effectPreview.style.height = '100%';
                                effectPreview.style.aspectRatio = '0.1';

                                // Create and initialize the profile effects card with card-level hover
                                const effectsCard = new ProfileEffectsCard(effectPreview, profileEffect, effectContainer);

                                // Store reference for cleanup if needed
                                effectContainer._profileEffectsCard = effectsCard;
                            } else {
                                // Fallback if profile effect not found
                                effectPreview.innerHTML = ``;
                            }
                        } else {
                            // Fallback if no product ID or cache
                            effectPreview.innerHTML = ``;
                        }
                    } else if (product.type === item_types.NAMEPLATE) {
                        let nameplate_user = document.createElement("div");
                
                        nameplate_user.classList.add('nameplate-null-user');
                        nameplate_user.classList.add('nameplate-preview');
                        nameplate_user.innerHTML = `
                            <video disablepictureinpicture muted loop class="nameplate-null-user nameplate-video-preview" style="position: absolute; height: 100%; width: auto; right: 0;"></video>
                            <div class="nameplate-user-avatar avatar1"></div>
                            <p class="nameplate-user-name name1">Nameplate</p>
                        `;

                        const item = product.items[0];
                        const paletteName = item.palette;
                        const bgcolor = nameplate_palettes[paletteName].darkBackground;

                        const videoElement = nameplate_user.querySelector(".nameplate-video-preview");

                        videoElement.src = `https://cdn.discordapp.com/assets/collectibles/${item.asset}asset.webm`;

                        nameplate_user.style.backgroundImage = `linear-gradient(90deg, #00000000 -30%, ${bgcolor} 200%)`;

                        nameplate_user.addEventListener("mouseenter", () => {
                            videoElement.play();
                        });
                        nameplate_user.addEventListener("mouseleave", () => {
                            videoElement.pause();
                        });

                        modalPreviewContainer.appendChild(nameplate_user);

                        modalInner.querySelector('.modal2-profile-preview').innerHTML = `
                            <div class="modal-nameplate-profile-preview">
                                <div class="nameplate-null-user">
                                    <div class="nameplate-null-user-avatar"></div>
                                    <div class="nameplate-null-user-name _1"></div>
                                    <div class="nameplate-preview-status-bg"></div>
                                    <div class="nameplate-preview-status-color"></div>
                                </div>
                                <div class="nameplate-null-user">
                                    <div class="nameplate-null-user-avatar"></div>
                                    <div class="nameplate-null-user-name _2"></div>
                                    <div class="nameplate-preview-status-bg"></div>
                                    <div class="nameplate-preview-status-color"></div>
                                </div>
                                <div class="nameplate-null-user nameplate-preview" style="background-image: linear-gradient(90deg, #00000000 -30%, ${bgcolor} 200%);">
                                    <video disablepictureinpicture muted loop autoplay class="nameplate-null-user nameplate-video-preview" style="position: absolute; height: 100%; width: auto; right: 0;" src="https://cdn.discordapp.com/assets/collectibles/${item.asset}asset.webm"></video>
                                    <div class="nameplate-user-avatar avatar2"></div>
                                    <p class="nameplate-user-name name2">Nameplate</p>
                                </div>
                                <div class="nameplate-null-user">
                                    <div class="nameplate-null-user-avatar"></div>
                                    <div class="nameplate-null-user-name _2"></div>
                                    <div class="nameplate-preview-status-bg"></div>
                                    <div class="nameplate-preview-status-color"></div>
                                </div>
                                <div class="nameplate-null-user">
                                    <div class="nameplate-null-user-avatar"></div>
                                    <div class="nameplate-null-user-name _1"></div>
                                    <div class="nameplate-preview-status-bg"></div>
                                    <div class="nameplate-preview-status-color"></div>
                                </div>
                            </div>
                        `;

                        if (currentUserData) {
                            nameplate_user.querySelector('.name1').textContent = currentUserData.global_name ? currentUserData.global_name : currentUserData.username;
                            modalInner.querySelector('.name2').textContent = currentUserData.global_name ? currentUserData.global_name : currentUserData.username;
                            let userAvatar = 'https://cdn.discordapp.com/avatars/'+currentUserData.id+'/'+currentUserData.avatar+'.webp?size=128';
                            if (currentUserData.avatar.includes('a_')) {
                                userAvatar = 'https://cdn.discordapp.com/avatars/'+currentUserData.id+'/'+currentUserData.avatar+'.gif?size=128';
                            }

                            nameplate_user.querySelector('.avatar1').style.backgroundImage = `url(${userAvatar})`;

                            modalInner.querySelector('.avatar2').style.backgroundImage = `url(${userAvatar})`;
                        }

                    } else if (product.type === item_types.BUNDLE) {

                        modalInner.querySelector('.modal-preview-profile').style.height = '400px';

                        modalSummary.textContent = `Bundle includes: ${product.bundled_products.find(item => item.type === item_types.AVATAR_DECORATION).name} Decoration & ${product.bundled_products.find(item => item.type === item_types.PROFILE_EFFECT).name} Profile Effect`;

                        modalPreviewContainer.classList.add('type-1000-modal-preview-container')

                        if (product.items.find(item => item.type === item_types.AVATAR_DECORATION)) {

                            modalInner.querySelector('.profile-avatar-deco-preview').src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=true`

                            modalPreviewContainer.innerHTML = `
                                <div class="type-0-preview-container">
                                    <div class="type-0-preview-background"></div>
                                    <img class="type-0-preview" loading="lazy" src="https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=false">
                                </div>
                            `;

                            const decoPreview = modalPreviewContainer.querySelector('.type-0-preview');

                            modalPreviewContainer.addEventListener("mouseenter", () => {
                                decoPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=true`;
                            });
                            modalPreviewContainer.addEventListener("mouseleave", () => {
                                decoPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${product.items.find(item => item.type === item_types.AVATAR_DECORATION).asset}.png?size=4096&passthrough=false`;
                            });
                        }
                        if (product.items.find(item => item.type === item_types.PROFILE_EFFECT)) {


                            modalInner.querySelector('.profile-profile-effects-preview').innerHTML = `
                                <div class="modal-profile-profile-effect-preview"></div>
                            `;

                            const profileProfileEffectPreview = modalInner.querySelector('.modal-profile-profile-effect-preview');

                            // Get the product ID from the first item
                            const productId = product.items && product.items.find(item => item.type === item_types.PROFILE_EFFECT) ? product.items.find(item => item.type === item_types.PROFILE_EFFECT).id : null;

                            if (productId && discordProfileEffectsCache) {
                                // Find the profile effect configuration
                                const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);

                                if (profileEffect) {
                                    // Set container to full width and auto height
                                    profileProfileEffectPreview.style.width = '100%';
                                    profileProfileEffectPreview.style.height = '100%';
                                    profileProfileEffectPreview.style.aspectRatio = '0.1';

                                    // Create and initialize the profile effects card with card-level hover
                                    const effectsCard = new ProfileEffectsCard(profileProfileEffectPreview, profileEffect, document.querySelector('.something-nobody-is-gonna-hover'), {
                                        startImmediately: true
                                    });

                                    // Store reference for cleanup if needed
                                    card._profileEffectsCard = effectsCard;
                                } else {
                                    // Fallback if profile effect not found
                                    profileProfileEffectPreview.innerHTML = ``;
                                }
                            } else {
                                // Fallback if no product ID or cache
                                profileProfileEffectPreview.innerHTML = ``;
                            }

                            let effectBG = document.createElement("div");

                            effectBG.classList.add('type-1-effect-background')
    
                            effectBG.innerHTML = `
                                <svg width="383" height="764" viewBox="0 0 383 764" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clip-path="url(#clip0_30_2)">
                                <rect width="383" height="142" fill="#424549"/>
                                <rect y="142" width="383" height="625" fill="#282B30"/>
                                <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" fill="#424549"/>
                                <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" stroke="#282B30" stroke-width="7"/>
                                <path d="M90.5028 121.958C86.8115 120.235 82.9189 119.019 78.9189 118.335C78.3686 119.333 77.8719 120.358 77.429 121.411C73.1739 120.755 68.8383 120.755 64.5699 121.411C64.1269 120.358 63.6303 119.333 63.0799 118.335C59.0799 119.033 55.1739 120.249 51.4826 121.971C44.1537 133.015 42.1671 143.786 43.1604 154.407C47.4557 157.632 52.2611 160.093 57.3618 161.665C58.5162 160.093 59.5363 158.411 60.4088 156.662C58.7443 156.033 57.147 155.254 55.6168 154.338C56.0195 154.038 56.4088 153.737 56.798 153.436C65.7914 157.742 76.2075 157.742 85.2008 153.436C85.5901 153.75 85.9793 154.065 86.382 154.338C84.8518 155.254 83.2411 156.033 81.5766 156.676C82.4491 158.425 83.4693 160.093 84.6236 161.665C89.7377 160.093 94.5431 157.646 98.8384 154.407C100.006 142.091 96.8519 131.43 90.4894 121.958H90.5028ZM61.684 147.873C58.9189 147.873 56.6235 145.317 56.6235 142.173C56.6235 139.03 58.8249 136.446 61.6705 136.446C64.5162 136.446 66.7846 139.03 66.7309 142.173C66.6773 145.317 64.5028 147.873 61.684 147.873ZM80.3417 147.873C77.5632 147.873 75.2947 145.317 75.2947 142.173C75.2947 139.03 77.4961 136.446 80.3417 136.446C83.1874 136.446 85.4424 139.03 85.3887 142.173C85.335 145.317 83.1605 147.873 80.3417 147.873Z" fill="#929292"/>
                                <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" fill="#289960"/>
                                <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" stroke="#282B30" stroke-width="5"/>
                                <rect x="12" y="208" width="359" height="540" rx="9" fill="#1E2124"/>
                                <rect x="27" y="222" width="168" height="25" rx="10" fill="#424549"/>
                                <rect x="27" y="405" width="106" height="25" rx="10" fill="#424549"/>
                                <rect x="120" y="482" width="107" height="29" rx="10" fill="#424549"/>
                                <rect x="27" y="476" width="74" height="74" rx="10" fill="#424549"/>
                                <rect x="27" y="565" width="329" height="36" rx="4" fill="#282B30"/>
                                <rect x="27" y="336" width="316" height="25" rx="10" fill="#424549"/>
                                <rect x="27" y="252" width="83" height="15" rx="7.5" fill="#424549"/>
                                <rect x="27" y="384" width="186" height="15" rx="7.5" fill="#424549"/>
                                <rect x="27" y="453" width="118" height="15" rx="7.5" fill="#424549"/>
                                <rect x="120" y="517" width="69" height="18" rx="9" fill="#424549"/>
                                <rect x="37" y="647" width="18" height="18" rx="9" fill="#424549"/>
                                <rect x="69" y="648" width="106" height="16" rx="8" fill="#424549"/>
                                <path d="M333.564 652.993C333.259 652.726 333.243 652.257 333.53 651.97C333.793 651.707 334.217 651.695 334.494 651.945L338.174 655.257C338.615 655.654 338.615 656.346 338.174 656.743L334.494 660.055C334.217 660.305 333.793 660.293 333.53 660.03C333.243 659.743 333.259 659.274 333.564 659.007L336.14 656.753C336.595 656.354 336.595 655.646 336.14 655.247L333.564 652.993Z" fill="#424549"/>
                                <path d="M333.564 710.493C333.259 710.226 333.243 709.757 333.53 709.47C333.793 709.207 334.217 709.195 334.494 709.445L338.174 712.757C338.615 713.154 338.615 713.846 338.174 714.243L334.494 717.555C334.217 717.805 333.793 717.793 333.53 717.53C333.243 717.243 333.259 716.774 333.564 716.507L336.14 714.253C336.595 713.854 336.595 713.146 336.14 712.747L333.564 710.493Z" fill="#424549"/>
                                <rect x="69" y="706" width="106" height="16" rx="8" fill="#424549"/>
                                <rect x="37" y="705" width="18" height="18" rx="9" fill="#424549"/>
                                <rect x="27" y="315" width="71" height="15" rx="7.5" fill="#424549"/>
                                <rect x="27" y="290" width="329" height="1" rx="0.5" fill="#424549"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_30_2">
                                <rect width="383" height="764" rx="21" fill="white"/>
                                </clipPath>
                                </defs>
                                </svg>
                            `;
                            

                            let effectContainer = document.createElement("div");

                            effectContainer.classList.add('type-1-effect-preview')
    
                            effectContainer.innerHTML = `
                                <div class="modal-profile-effect-preview"></div>
                            `;

                            effectContainer.appendChild(effectBG);

                            modalPreviewContainer.appendChild(effectContainer);


                            const effectPreview = effectContainer.querySelector('.modal-profile-effect-preview');


                            if (productId && discordProfileEffectsCache) {
                                // Find the profile effect configuration
                                const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);

                                if (profileEffect) {
                                    // Set container to full width and auto height
                                    effectPreview.style.width = '100%';
                                    effectPreview.style.height = '100%';
                                    effectPreview.style.aspectRatio = '0.1';

                                    // Create and initialize the profile effects card with card-level hover
                                    const effectsCard = new ProfileEffectsCard(effectPreview, profileEffect, modalPreviewContainer);

                                    // Store reference for cleanup if needed
                                    card._profileEffectsCard = effectsCard;
                                } else {
                                    // Fallback if profile effect not found
                                    effectPreview.innerHTML = ``;
                                }
                            } else {
                                // Fallback if no product ID or cache
                                effectPreview.innerHTML = ``;
                            }
                        }
                    } else if (product.type === item_types.VARIANTS_GROUP) {

                        modalPreviewContainer.classList.add('type-2000-preview-container')

                        const variantContainer = modalInner.querySelector("[data-shop-card-var-container]");
                        variantContainer.innerHTML = "";
                        let currentSelectedVariant = null;

                        product.variants.forEach((variant, index) => {

                            let variantColorBlock = document.createElement("div");

                            variantColorBlock.classList.add("shop-card-var");
                            variantColorBlock.id = "shop-card-var";
                            variantColorBlock.style.backgroundColor = `${variant.variant_value}`;
                        
                            // Add click event listener to switch variants
                            variantColorBlock.addEventListener("click", () => {
                                if (currentSelectedVariant) {
                                    currentSelectedVariant.classList.remove("shop-card-var-selected");
                                }
                                variantColorBlock.classList.add("shop-card-var-selected");
                                currentSelectedVariant = variantColorBlock;
                                applyVariant(variant)
                            });
                        
                            // Append the color block to the container
                            variantContainer.appendChild(variantColorBlock);
                        
                            // Set the first variant as the default selected
                            if (index === 0) {
                                currentSelectedVariant = variantColorBlock;
                                variantColorBlock.classList.add("shop-card-var-selected");
                            }
                        });

                        function applyVariant(selectedVariant) {
                            modalInner.querySelector("[data-shop-card-var-title]").textContent = `(${selectedVariant.variant_label})`;

                            itemName.textContent = selectedVariant.base_variant_name;

                            if (selectedVariant.type === 0) {

                                modalInner.querySelector('.profile-avatar-deco-preview').src = `https://cdn.discordapp.com/avatar-decoration-presets/${selectedVariant.items[0].asset}.png?size=4096&passthrough=true`

                                modalPreviewContainer.innerHTML = "";
                                let decorationBundleContainer = document.createElement("div");
    
                                decorationBundleContainer.classList.add('type-0-preview-container')
                            
                                decorationBundleContainer.innerHTML = `
                                    <div class="type-0-preview-background"></div>
                                    <img class="type-0-preview" loading="lazy" src="https://cdn.discordapp.com/avatar-decoration-presets/${selectedVariant.items[0].asset}.png?size=4096&passthrough=false"></img>
                                `;

                                modalPreviewContainer.appendChild(decorationBundleContainer);

                                // Add the avatar decoration based on the selected variant
                                selectedVariant.items?.forEach(item => {
                                    const decorationPreview = decorationBundleContainer.querySelector('.type-0-preview')
                                    decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=4096&passthrough=false`;

                                    decorationBundleContainer.addEventListener("mouseenter", () => {
                                        decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=4096&passthrough=true`;
                                    });
                                    decorationBundleContainer.addEventListener("mouseleave", () => {
                                        decorationPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${item.asset}.png?size=4096&passthrough=false`;
                                    });
                                });
                            } else if (selectedVariant.type === 1) {
                                
                                if (modalInner.querySelector('.profile-avatar-deco-preview')) modalInner.querySelector('.profile-avatar-deco-preview').remove();

                                modalInner.querySelector('.modal-preview-profile').style.height = '400px';

                                modalInner.querySelector('.profile-profile-effects-preview').innerHTML = `
                                    <div class="modal-profile-profile-effect-preview"></div>
                                `;

                                const profileProfileEffectPreview = modalInner.querySelector('.modal-profile-profile-effect-preview');

                                // Get the product ID from the first item
                                const productId = selectedVariant.items && selectedVariant.items[0] ? selectedVariant.items[0].id : null;

                                if (productId && discordProfileEffectsCache) {
                                    // Find the profile effect configuration
                                    const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);

                                    if (profileEffect) {
                                        // Set container to full width and auto height
                                        profileProfileEffectPreview.style.width = '100%';
                                        profileProfileEffectPreview.style.height = '100%';
                                        profileProfileEffectPreview.style.aspectRatio = '0.1';

                                        // Create and initialize the profile effects card with card-level hover
                                        const effectsCard = new ProfileEffectsCard(profileProfileEffectPreview, profileEffect, document.querySelector('.something-nobody-is-gonna-hover'), {
                                            startImmediately: true
                                        });

                                        // Store reference for cleanup if needed
                                        document.querySelector('.something-nobody-is-gonna-hover')._profileEffectsCard = effectsCard;
                                    } else {
                                        // Fallback if profile effect not found
                                        profileProfileEffectPreview.innerHTML = ``;
                                    }
                                } else {
                                    // Fallback if no product ID or cache
                                    profileProfileEffectPreview.innerHTML = ``;
                                }



                                modalPreviewContainer.innerHTML = "";
                                previewContainer.classList.add('type-1-preview-container');

                                let effectBG = document.createElement("div");

                                effectBG.classList.add('type-1-effect-background')
    
                                effectBG.innerHTML = `
                                    <svg width="383" height="764" viewBox="0 0 383 764" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clip-path="url(#clip0_30_2)">
                                    <rect width="383" height="142" fill="#424549"/>
                                    <rect y="142" width="383" height="625" fill="#282B30"/>
                                    <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" fill="#424549"/>
                                    <rect x="21.5" y="90.5" width="99" height="99" rx="49.5" stroke="#282B30" stroke-width="7"/>
                                    <path d="M90.5028 121.958C86.8115 120.235 82.9189 119.019 78.9189 118.335C78.3686 119.333 77.8719 120.358 77.429 121.411C73.1739 120.755 68.8383 120.755 64.5699 121.411C64.1269 120.358 63.6303 119.333 63.0799 118.335C59.0799 119.033 55.1739 120.249 51.4826 121.971C44.1537 133.015 42.1671 143.786 43.1604 154.407C47.4557 157.632 52.2611 160.093 57.3618 161.665C58.5162 160.093 59.5363 158.411 60.4088 156.662C58.7443 156.033 57.147 155.254 55.6168 154.338C56.0195 154.038 56.4088 153.737 56.798 153.436C65.7914 157.742 76.2075 157.742 85.2008 153.436C85.5901 153.75 85.9793 154.065 86.382 154.338C84.8518 155.254 83.2411 156.033 81.5766 156.676C82.4491 158.425 83.4693 160.093 84.6236 161.665C89.7377 160.093 94.5431 157.646 98.8384 154.407C100.006 142.091 96.8519 131.43 90.4894 121.958H90.5028ZM61.684 147.873C58.9189 147.873 56.6235 145.317 56.6235 142.173C56.6235 139.03 58.8249 136.446 61.6705 136.446C64.5162 136.446 66.7846 139.03 66.7309 142.173C66.6773 145.317 64.5028 147.873 61.684 147.873ZM80.3417 147.873C77.5632 147.873 75.2947 145.317 75.2947 142.173C75.2947 139.03 77.4961 136.446 80.3417 136.446C83.1874 136.446 85.4424 139.03 85.3887 142.173C85.335 145.317 83.1605 147.873 80.3417 147.873Z" fill="#929292"/>
                                    <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" fill="#289960"/>
                                    <rect x="90.5" y="159.5" width="23" height="23" rx="11.5" stroke="#282B30" stroke-width="5"/>
                                    <rect x="12" y="208" width="359" height="540" rx="9" fill="#1E2124"/>
                                    <rect x="27" y="222" width="168" height="25" rx="10" fill="#424549"/>
                                    <rect x="27" y="405" width="106" height="25" rx="10" fill="#424549"/>
                                    <rect x="120" y="482" width="107" height="29" rx="10" fill="#424549"/>
                                    <rect x="27" y="476" width="74" height="74" rx="10" fill="#424549"/>
                                    <rect x="27" y="565" width="329" height="36" rx="4" fill="#282B30"/>
                                    <rect x="27" y="336" width="316" height="25" rx="10" fill="#424549"/>
                                    <rect x="27" y="252" width="83" height="15" rx="7.5" fill="#424549"/>
                                    <rect x="27" y="384" width="186" height="15" rx="7.5" fill="#424549"/>
                                    <rect x="27" y="453" width="118" height="15" rx="7.5" fill="#424549"/>
                                    <rect x="120" y="517" width="69" height="18" rx="9" fill="#424549"/>
                                    <rect x="37" y="647" width="18" height="18" rx="9" fill="#424549"/>
                                    <rect x="69" y="648" width="106" height="16" rx="8" fill="#424549"/>
                                    <path d="M333.564 652.993C333.259 652.726 333.243 652.257 333.53 651.97C333.793 651.707 334.217 651.695 334.494 651.945L338.174 655.257C338.615 655.654 338.615 656.346 338.174 656.743L334.494 660.055C334.217 660.305 333.793 660.293 333.53 660.03C333.243 659.743 333.259 659.274 333.564 659.007L336.14 656.753C336.595 656.354 336.595 655.646 336.14 655.247L333.564 652.993Z" fill="#424549"/>
                                    <path d="M333.564 710.493C333.259 710.226 333.243 709.757 333.53 709.47C333.793 709.207 334.217 709.195 334.494 709.445L338.174 712.757C338.615 713.154 338.615 713.846 338.174 714.243L334.494 717.555C334.217 717.805 333.793 717.793 333.53 717.53C333.243 717.243 333.259 716.774 333.564 716.507L336.14 714.253C336.595 713.854 336.595 713.146 336.14 712.747L333.564 710.493Z" fill="#424549"/>
                                    <rect x="69" y="706" width="106" height="16" rx="8" fill="#424549"/>
                                    <rect x="37" y="705" width="18" height="18" rx="9" fill="#424549"/>
                                    <rect x="27" y="315" width="71" height="15" rx="7.5" fill="#424549"/>
                                    <rect x="27" y="290" width="329" height="1" rx="0.5" fill="#424549"/>
                                    </g>
                                    <defs>
                                    <clipPath id="clip0_30_2">
                                    <rect width="383" height="764" rx="21" fill="white"/>
                                    </clipPath>
                                    </defs>
                                    </svg>
                                `;


                                let effectContainer = document.createElement("div");

                                effectContainer.classList.add('type-1-effect-preview')
    
                                effectContainer.innerHTML = `
                                    <div class="modal-profile-effect-preview"></div>
                                `;

                                effectContainer.appendChild(effectBG);

                                modalPreviewContainer.appendChild(effectContainer);


                                const effectPreview = effectContainer.querySelector('.modal-profile-effect-preview');


                                if (productId && discordProfileEffectsCache) {
                                    // Find the profile effect configuration
                                    const profileEffect = findProfileEffectByProductId(discordProfileEffectsCache, productId);

                                    if (profileEffect) {
                                        // Set container to full width and auto height
                                        effectPreview.style.width = '100%';
                                        effectPreview.style.height = '100%';
                                        effectPreview.style.aspectRatio = '0.1';

                                        // Create and initialize the profile effects card with card-level hover
                                        const effectsCard = new ProfileEffectsCard(effectPreview, profileEffect, effectContainer);

                                        // Store reference for cleanup if needed
                                        effectContainer._profileEffectsCard = effectsCard;
                                    } else {
                                        // Fallback if profile effect not found
                                        effectPreview.innerHTML = ``;
                                    }
                                } else {
                                    // Fallback if no product ID or cache
                                    effectPreview.innerHTML = ``;
                                }
                            }
                        }
                    
                        // Apply the default variant (first one) initially
                        if (product.variants.length > 0) {
                            applyVariant(product.variants[0]);
                        }

                    } else {
                        modalInner.querySelector('.modal2-profile-preview').remove();
                    }

                } else {
                    modal.querySelector('#modalv2-inner-content').innerHTML = `
                        <div class="view-raw-modalv2-inner">
                            <textarea class="view-raw-modal-textbox" readonly>${JSON.stringify(product, undefined, 4)}</textarea>
                        </div>
                    `;
                }
            }

            modal.querySelector('#modalv2-tab-1').addEventListener("click", function () {
                changeModalTab('1');
            });
            modal.querySelector('#modalv2-tab-2').addEventListener("click", function () {
                changeModalTab('2');
            });

            changeModalTab('1');

            document.body.appendChild(modal);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            });
            


            let modal_back = document.createElement("div");

            modal_back.classList.add('modalv2-back');
            modal_back.id = 'modalv2-back';

            document.body.appendChild(modal_back);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_back.classList.add('show');
                });
            });


            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.classList.remove('show');
                    modal_back.classList.remove('show');
                    setTimeout(() => {
                        modal.remove();
                        modal_back.remove();
                    }, 300);
                    removeParams('itemSkuId');
                    currentOpenModalId = null;
                }
            });

            document.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
                modal.classList.remove('show');
                modal_back.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    modal_back.remove();
                }, 300);
                removeParams('itemSkuId');
                currentOpenModalId = null;
            });
        }


        return card;
    }



    function paginate(items, page = 1, perPage = 5) {
        const start = (page - 1) * perPage;
        return items.slice(start, start + perPage);
    }
    
    function createPaginationControls(container, totalPages, currentPage, onPageChange) {
        if (container) {
            container.innerHTML = '';
    
            const btn = (text, page, disabled = false, isCurrent = false, isNav = false) => {
                const b = document.createElement('button');
                b.textContent = text;
                b.classList.add(isNav ? 'nav-btn' : 'circle-btn');
                if (disabled) b.disabled = true;
                if (isCurrent) b.classList.add('current-page');
                b.addEventListener('click', () => onPageChange(page));
                return b;
            };
    
            container.appendChild(btn('< Back', currentPage - 1, currentPage === 1, false, true));
    
            const range = Math.min(5, totalPages);
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + range - 1);
            if (endPage - startPage < range - 1) startPage = Math.max(1, endPage - range + 1);
    
            if (startPage > 1) {
                container.appendChild(btn('1', 1));
                if (startPage > 2) container.appendChild(document.createTextNode('...'));
            }
    
            for (let i = startPage; i <= endPage; i++) {
                container.appendChild(btn(i, i, false, i === currentPage));
            }
    
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) container.appendChild(document.createTextNode('...'));
                container.appendChild(btn(totalPages, totalPages));
            }
    
            container.appendChild(btn('Next >', currentPage + 1, currentPage === totalPages, false, true));
        }
    }
    
    function filterCategories(data, search) {
        if (!search.trim()) return data;
        const term = search.toLowerCase();
        return data.map(cat => {
            const catMatch = cat.name.toLowerCase().includes(term) || cat.sku_id?.toLowerCase().includes(term);
            const filteredProducts = cat.products?.filter(p =>
                p.name.toLowerCase().includes(term) || p.sku_id?.toLowerCase().includes(term)
            ) || [];
            if (catMatch || filteredProducts.length > 0) {
                return {
                    ...cat,
                    products: catMatch ? cat.products : filteredProducts
                };
            }
            return null;
        }).filter(Boolean);
    }
    
    async function renderShopData(data, output) {
        const searchInput = document.getElementById('searchInput');
        searchInput.classList.remove('hidden');
        const paginationContainer = document.getElementById('pagination');
        const itemsPerPage = 5;
    
        let filteredData = data;
        let currentPage = 1;
    
        const renderPage = (page) => {
            currentPage = page;
            output.innerHTML = '';
            const pageData = paginate(filteredData, page, itemsPerPage);
            output.scrollTo(0,0);

            if (data.length <= 5) {
                paginationContainer.classList.add('hidden');
            }
    
            pageData.forEach((categoryData) => {
                const category = document.createElement("div");
                category.classList.add('category-container');
                category.setAttribute('data-sku-id', categoryData.sku_id);
                category.setAttribute('data-listing-id', categoryData.store_listing_id);
    
                let categoryBanner = categoryData.banner_asset?.static ??
                    `https://cdn.discordapp.com/app-assets/1096190356233670716/${categoryData.banner}.png?size=4096`;

                if (categoryData.sku_id === "3") {
                    categoryBanner = "https://cdn.yapper.shop/assets/43.png"
                }

                let modalBanner;

                if (categoryData.sku_id === discord_categories.ORB) {
                    modalBanner = `https://cdn.discordapp.com/app-assets/1096190356233670716/1336165352392097853.png?size=4096`;
                } else if (categoryData.hero_banner_asset?.static) {
                    modalBanner = categoryData.hero_banner_asset?.static;
                } else if (categoryData.hero_banner) {
                    modalBanner = `https://cdn.discordapp.com/app-assets/1096190356233670716/${categoryData.hero_banner}.png?size=4096`;
                } else if (categoryData.banner) {
                    modalBanner = `https://cdn.discordapp.com/app-assets/1096190356233670716/${categoryData.banner}.png?size=4096`;
                }
    
                const bannerContainer = document.createElement('div');
                bannerContainer.classList.add('banner-container');
                bannerContainer.style.backgroundImage = `url(${categoryBanner})`;

                const categoryClientDataId = category_client_overrides.findIndex(cat => cat.sku_id === categoryData.sku_id);

                if (categoryData.logo && category_client_overrides[categoryClientDataId]?.addLogo) {
                    if (category_client_overrides[categoryClientDataId]?.banner_verification && category_client_overrides[categoryClientDataId]?.banner_verification === categoryData.banner || !category_client_overrides[categoryClientDataId].banner_verification) {
                        const bannerLogo = document.createElement("div");
                        bannerLogo.classList.add('shop-category-logo-holder')
                        bannerLogo.innerHTML = `
                            <img class="shop-category-banner-logo" loading="lazy" src="https://cdn.discordapp.com/app-assets/1096190356233670716/${categoryData.logo}.png?size=4096">
                        `;
                        bannerContainer.appendChild(bannerLogo);
                    }
                }

                if (category_client_overrides[categoryClientDataId]?.addAttributionLogo) {
                    if (category_client_overrides[categoryClientDataId]?.banner_verification && category_client_overrides[categoryClientDataId]?.banner_verification === categoryData.banner || !category_client_overrides[categoryClientDataId].banner_verification) {
                        const bannerWaterMark = document.createElement("div");
                        bannerWaterMark.classList.add('discordLogo_be5025')
                        bannerWaterMark.innerHTML = `
                            <div><svg class="discordIcon_be5025" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M19.73 4.87a18.2 18.2 0 0 0-4.6-1.44c-.21.4-.4.8-.58 1.21-1.69-.25-3.4-.25-5.1 0-.18-.41-.37-.82-.59-1.2-1.6.27-3.14.75-4.6 1.43A19.04 19.04 0 0 0 .96 17.7a18.43 18.43 0 0 0 5.63 2.87c.46-.62.86-1.28 1.2-1.98-.65-.25-1.29-.55-1.9-.92.17-.12.32-.24.47-.37 3.58 1.7 7.7 1.7 11.28 0l.46.37c-.6.36-1.25.67-1.9.92.35.7.75 1.35 1.2 1.98 2.03-.63 3.94-1.6 5.64-2.87.47-4.87-.78-9.09-3.3-12.83ZM8.3 15.12c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.89 2.27-2 2.27Zm7.4 0c-1.1 0-2-1.02-2-2.27 0-1.24.88-2.26 2-2.26s2.02 1.02 2 2.26c0 1.25-.88 2.27-2 2.27Z" class=""></path></svg><svg class="discordWordmark_be5025" aria-hidden="true" role="img" width="55" height="16" viewBox="0 0 55 16"><g fill="currentColor"><path d="M3 4.78717H6.89554C7.83025 4.78717 8.62749 4.93379 9.27812 5.22703C9.92875 5.52027 10.4144 5.92348 10.7352 6.44582C11.0559 6.96815 11.2208 7.5638 11.2208 8.24192C11.2208 8.90171 11.0559 9.49736 10.7168 10.038C10.3778 10.5695 9.8646 11.0002 9.17732 11.3118C8.49003 11.6234 7.6378 11.7791 6.6197 11.7791H3V4.78717ZM6.57388 10.0014C7.2071 10.0014 7.69278 9.84559 8.03184 9.52485C8.3709 9.21328 8.54501 8.77343 8.54501 8.23276C8.54501 7.72875 8.38923 7.32555 8.08682 7.02314C7.78442 6.72073 7.32623 6.56495 6.71225 6.56495H5.49255V10.0014H6.57388Z"></path><path d="M17.2882 11.7709C16.7475 11.6335 16.2618 11.4319 15.8311 11.1569V9.4983C16.161 9.75489 16.5917 9.95649 17.1416 10.1214C17.6914 10.2864 18.2229 10.3689 18.7361 10.3689C18.9743 10.3689 19.1576 10.3414 19.2767 10.2772C19.3959 10.2131 19.46 10.1398 19.46 10.0481C19.46 9.94733 19.4233 9.86485 19.3592 9.80071C19.2951 9.73656 19.1668 9.68158 18.9743 9.62659L17.7739 9.36084C17.0866 9.20506 16.6009 8.97596 16.3077 8.70105C16.0144 8.42613 15.877 8.05042 15.877 7.59223C15.877 7.20735 16.0053 6.86829 16.2527 6.58421C16.5093 6.30013 16.8667 6.0802 17.334 5.92442C17.8014 5.76863 18.342 5.68616 18.9743 5.68616C19.5333 5.68616 20.0465 5.74114 20.5138 5.86944C20.9812 5.98857 21.3661 6.14435 21.6685 6.32763V7.89464C21.3569 7.71136 20.9904 7.56474 20.5871 7.45477C20.1748 7.34481 19.7533 7.28982 19.3226 7.28982C18.6994 7.28982 18.3878 7.39979 18.3878 7.61056C18.3878 7.71136 18.4337 7.78467 18.5345 7.83966C18.6353 7.89464 18.8094 7.94046 19.066 7.99544L20.0648 8.17871C20.7155 8.28868 21.2011 8.49028 21.5219 8.77436C21.8426 9.05844 21.9984 9.47081 21.9984 10.0298C21.9984 10.6346 21.7326 11.1203 21.2011 11.4685C20.6696 11.8259 19.9182 12 18.9468 12C18.3787 11.9817 17.8289 11.9084 17.2882 11.7709Z"></path><path d="M24.4735 11.5602C23.9054 11.2761 23.4655 10.9004 23.1814 10.4239C22.8882 9.94733 22.7507 9.40666 22.7507 8.80185C22.7507 8.20621 22.8974 7.66554 23.1998 7.19819C23.5022 6.72167 23.942 6.35512 24.5194 6.0802C25.0967 5.81445 25.7931 5.677 26.5995 5.677C27.5984 5.677 28.4231 5.88776 29.0829 6.3093V8.1329C28.8538 7.97712 28.5789 7.83965 28.2673 7.74802C27.9558 7.64721 27.6259 7.6014 27.2777 7.6014C26.6545 7.6014 26.178 7.71137 25.8206 7.94046C25.4724 8.16956 25.2983 8.46279 25.2983 8.82934C25.2983 9.18673 25.4632 9.47998 25.8115 9.70907C26.1505 9.93817 26.6453 10.0573 27.2868 10.0573C27.6167 10.0573 27.9466 10.0115 28.2673 9.91067C28.5881 9.80987 28.8722 9.69991 29.1013 9.55329V11.3219C28.3681 11.7618 27.5159 11.9817 26.5537 11.9817C25.7381 11.9817 25.0509 11.8351 24.4735 11.5602Z"></path><path d="M31.6955 11.5602C31.1182 11.2761 30.6783 10.9004 30.3759 10.4147C30.0735 9.929 29.9177 9.38834 29.9177 8.78353C29.9177 8.18788 30.0735 7.64722 30.3759 7.17986C30.6783 6.71251 31.1182 6.34595 31.6863 6.0802C32.2545 5.81445 32.9418 5.677 33.7299 5.677C34.518 5.677 35.2053 5.80529 35.7743 6.0802C36.3425 6.34595 36.7824 6.71251 37.0848 7.17986C37.3872 7.64722 37.5338 8.17872 37.5338 8.78353C37.5338 9.37918 37.3872 9.929 37.0848 10.4147C36.7824 10.9004 36.3517 11.2852 35.7743 11.5602C35.1961 11.8351 34.518 11.9817 33.7299 11.9817C32.951 11.9817 32.2728 11.8351 31.6955 11.5602ZM34.7287 9.79155C34.967 9.55329 35.0953 9.22339 35.0953 8.82934C35.0953 8.42614 34.9762 8.11457 34.7287 7.87632C34.4813 7.63806 34.1514 7.51892 33.7391 7.51892C33.3084 7.51892 32.9785 7.63806 32.731 7.87632C32.4928 8.11457 32.3645 8.42614 32.3645 8.82934C32.3645 9.23255 32.4836 9.55329 32.731 9.79155C32.9785 10.039 33.3084 10.1581 33.7391 10.1581C34.1514 10.1489 34.4905 10.0298 34.7287 9.79155Z"></path><path d="M43.6644 6.0435V8.19699C43.4078 8.03204 43.0779 7.94956 42.6747 7.94956C42.1432 7.94956 41.7308 8.11451 41.4467 8.43524C41.1626 8.75598 41.016 9.25999 41.016 9.93811V11.7709H38.5693V5.9427H40.9702V7.80295C41.0985 7.12482 41.3184 6.62082 41.6117 6.30008C41.9049 5.97935 42.2898 5.80524 42.7572 5.80524C43.1054 5.80524 43.4078 5.88771 43.6644 6.0435Z"></path><path d="M51.9136 4.58649V11.7801H49.4659V10.4696C49.2552 10.9645 48.9436 11.3402 48.5221 11.5968C48.1005 11.8534 47.5782 11.9817 46.9551 11.9817C46.4052 11.9817 45.9195 11.8442 45.5072 11.5785C45.0948 11.3127 44.7741 10.937 44.5542 10.4696C44.3342 9.99313 44.2242 9.46163 44.2242 8.87514C44.2151 8.26117 44.3342 7.71134 44.5816 7.22566C44.8199 6.73998 45.1681 6.36426 45.608 6.08935C46.0479 5.81444 46.5519 5.67698 47.12 5.67698C48.2838 5.67698 49.0627 6.18099 49.4659 7.19817V4.58649H51.9136ZM49.0994 9.7457C49.3468 9.50744 49.4751 9.18671 49.4751 8.80183C49.4751 8.42612 49.356 8.12371 49.1086 7.89462C48.8611 7.66552 48.5312 7.5464 48.1189 7.5464C47.7065 7.5464 47.3766 7.66553 47.1292 7.90378C46.8818 8.14204 46.7626 8.44444 46.7626 8.82932C46.7626 9.2142 46.8818 9.51661 47.1292 9.75487C47.3766 9.99313 47.6973 10.1123 48.1097 10.1123C48.5221 10.1123 48.852 9.99313 49.0994 9.7457Z"></path><path d="M13.4751 6.29095C14.1789 6.29095 14.7489 5.77778 14.7489 5.14547C14.7489 4.51317 14.1789 4 13.4751 4C12.7723 4 12.2014 4.51317 12.2014 5.14547C12.2014 5.77778 12.7723 6.29095 13.4751 6.29095Z"></path><path d="M14.7489 7.07812C13.97 7.41719 12.9986 7.42635 12.2014 7.07812V11.7792H14.7489V7.07812Z"></path></g></svg></div>
                        `;
                        bannerContainer.appendChild(bannerWaterMark);
                    }
                }

                if (categoryData.summary) {
                    const bannerSummary = document.createElement("div");
                    bannerSummary.classList.add('shop-category-text-holder')
                    bannerSummary.innerHTML = `
                        <p>${categoryData.summary}</p>
                    `;
                    if (categoryData.banner_text_color) {
                        bannerSummary.style.color = categoryData.banner_text_color;
                    }
                    if (category_client_overrides[categoryClientDataId]?.showDarkBannerText || categoryData.sku_id === "3") {
                        bannerSummary.style.color = 'black';
                    }
                    bannerContainer.appendChild(bannerSummary);
                }
    
                if (categoryData.banner_asset?.animated) {
                    const videoBanner = document.createElement("video");
                    videoBanner.disablePictureInPicture = true;
                    videoBanner.autoplay = true;
                    videoBanner.muted = true;
                    videoBanner.loop = true;
                    videoBanner.playsInline = true;
                    videoBanner.src = categoryData.banner_asset.animated;
                    videoBanner.classList.add('banner-video');
                    bannerContainer.appendChild(videoBanner);
                }

                if (category_client_overrides[categoryClientDataId]?.animatedBanner?.includes('.webm')) {
                    const videoBanner = document.createElement("video");
                    videoBanner.disablePictureInPicture = true;
                    videoBanner.autoplay = true;
                    videoBanner.muted = true;
                    videoBanner.loop = true;
                    videoBanner.playsInline = true;
                    videoBanner.src = category_client_overrides[categoryClientDataId]?.animatedBanner;
                    videoBanner.classList.add('banner-video');
                    bannerContainer.appendChild(videoBanner);
                }
    
                category.appendChild(bannerContainer);
    
                if (categoryData.products?.length) {
                    const productsWrapper = document.createElement("div");
                    productsWrapper.classList.add("products-wrapper");
    
                    categoryData.products.forEach(async product => {
                        const item = await renderProduct(categoryData, product);
                        productsWrapper.appendChild(item);
                    });
    
                    category.appendChild(productsWrapper);
                }


                let categoryTags = document.createElement("div");
                categoryTags.classList.add('shop-card-tag-container');
                bannerContainer.appendChild(categoryTags)

                const cardTag = categoryTags;

                function createCategoryTag(text, type, toDate) {
                    let tag = document.createElement("p");
                    tag.classList.add('shop-card-tag');
                    tag.textContent = text;
                    cardTag.appendChild(tag);
                    if (type === 1) {
                        function updateTimer() {
                            const now = new Date();
                            const timeDiff = toDate - now;
                        
                            if (timeDiff <= 0) {
                                tag.textContent = `NOT IN STORE`;
                                clearInterval(timerInterval);
                            } else {
                                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / 1000);
                                tag.textContent = `${days} DAYS LEFT IN SHOP`;
                            }
                        }
                    
                        const timerInterval = setInterval(updateTimer, 1000);
                        updateTimer();
                    }
                }

                const unpublishedAt = new Date(categoryData.unpublished_at);

                if (categoryData.unpublished_at && !isNaN(unpublishedAt.getTime())) {
                    createCategoryTag(null, 1, unpublishedAt)
                }


                let categoryModalInfo;
                let firstTimeOpeningModal = true;

                bannerContainer.addEventListener("click", function () {
                    openProductModal();
                });

                if (currentOpenModalId === categoryData.sku_id) {
                    setTimeout(() => {
                        openProductModal();
                    }, 500);
                }

                async function openProductModal() {

                    addParams({itemSkuId: categoryData.sku_id})

                    let modal = document.createElement("div");
        
                    modal.classList.add('category-modal');
        
                    modal.innerHTML = `
                        <div class="category-modal-inner">
                            <div class="modalv2-tabs-container">
                                <div class="tab selected" id="category-modal-tab-1">
                                    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="24" r="6" fill="currentColor"/>
                                        <circle cx="12" cy="72" r="6" fill="currentColor"/>
                                        <circle cx="12" cy="48" r="6" fill="currentColor"/>
                                        <rect x="28" y="20" width="60" height="8" rx="4" fill="currentColor"/>
                                        <path d="M72.124 44.0029C64.5284 44.0668 57.6497 47.1046 52.6113 52H32C29.7909 52 28 50.2091 28 48C28 45.7909 29.7909 44 32 44H72C72.0415 44 72.0828 44.0017 72.124 44.0029Z" fill="currentColor"/>
                                        <path d="M44.2852 68C44.0983 69.3065 44 70.6418 44 72C44 73.3582 44.0983 74.6935 44.2852 76H32C29.7909 76 28 74.2091 28 72C28 69.7909 29.7909 68 32 68H44.2852Z" fill="currentColor"/>
                                        <circle cx="72" cy="72" r="16" stroke="currentColor" stroke-width="8"/>
                                        <rect x="81" y="85.9497" width="7" height="16" rx="3.5" transform="rotate(-45 81 85.9497)" fill="currentColor"/>
                                    </svg>
                                    <p>Details</p>
                                </div>
                                <div class="tab" id="category-modal-tab-3">
                                    <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" class=""></path>
                                    </svg>
                                    <p>Assets</p>
                                </div>
                                <div class="tab disabled has-tooltip" data-tooltip="Reviews have been disabled for this category" id="category-modal-tab-4">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fill="currentColor" d="M8 3C7.44771 3 7 3.44772 7 4V5C7 5.55228 7.44772 6 8 6H16C16.5523 6 17 5.55228 17 5V4C17 3.44772 16.5523 3 16 3H15.1245C14.7288 3 14.3535 2.82424 14.1002 2.52025L13.3668 1.64018C13.0288 1.23454 12.528 1 12 1C11.472 1 10.9712 1.23454 10.6332 1.64018L9.8998 2.52025C9.64647 2.82424 9.27121 3 8.8755 3H8Z"></path><path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M19 4.49996V4.99996C19 6.65681 17.6569 7.99996 16 7.99996H8C6.34315 7.99996 5 6.65681 5 4.99996V4.49996C5 4.22382 4.77446 3.99559 4.50209 4.04109C3.08221 4.27826 2 5.51273 2 6.99996V19C2 20.6568 3.34315 22 5 22H19C20.6569 22 22 20.6568 22 19V6.99996C22 5.51273 20.9178 4.27826 19.4979 4.04109C19.2255 3.99559 19 4.22382 19 4.49996ZM8 12C7.44772 12 7 12.4477 7 13C7 13.5522 7.44772 14 8 14H16C16.5523 14 17 13.5522 17 13C17 12.4477 16.5523 12 16 12H8ZM7 17C7 16.4477 7.44772 16 8 16H13C13.5523 16 14 16.4477 14 17C14 17.5522 13.5523 18 13 18H8C7.44772 18 7 17.5522 7 17Z"></path>
                                    </svg>
                                    <p>Reviews</p>
                                </div>
                                <div class="tab hidden disabled has-tooltip" data-tooltip="There are currently no XP rewards for this category" id="category-modal-tab-5">
                                    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                    </svg>
                                    <p>Rewards</p>
                                </div>
                                <div class="tab" id="category-modal-tab-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15.7376 3.18925C15.4883 2.93731 15.0814 2.93686 14.8316 3.18824L14.0087 4.01625C13.7618 4.26471 13.7614 4.66581 14.0078 4.91476L20.3804 11.3527C20.6265 11.6013 20.6265 12.0017 20.3804 12.2503L14.0078 18.6882C13.7614 18.9373 13.7618 19.3383 14.0087 19.5867L14.8316 20.4148C15.0814 20.6662 15.4883 20.6658 15.7376 20.4138L23.815 12.2503C24.061 12.0016 24.061 11.6014 23.815 11.3528L15.7376 3.18925Z" fill="currentColor"/>
                                        <path d="M9.99171 4.91476C10.2381 4.66581 10.2377 4.26471 9.99081 4.01625L9.16787 3.18824C8.91804 2.93686 8.51118 2.93731 8.2619 3.18925L0.184466 11.3528C-0.0614893 11.6014 -0.061488 12.0016 0.184466 12.2503L8.2619 20.4138C8.51118 20.6658 8.91803 20.6662 9.16787 20.4148L9.99081 19.5867C10.2377 19.3383 10.2381 18.9373 9.99171 18.6882L3.61906 12.2503C3.37298 12.0017 3.37298 11.6013 3.61906 11.3527L9.99171 4.91476Z" fill="currentColor"/>
                                    </svg>
                                    <p>Raw</p>
                                </div>
                            </div>

                            <img class="category-modal-banner-preview" src="${modalBanner}">
                            
                            <div id="category-modal-inner-content">
                                <div class="category-modal-bottom-container">
                                    <p class="sku_id has-tooltip" data-tooltip="Click To Copy" onclick="copyValue('${categoryData.sku_id}')">${categoryData.sku_id}</p>
                                    <h1>${categoryData.name}</h1>
                                    <p>${categoryData.summary ? categoryData.summary : ''}</p>
                                    <div class="category-modal-quick-info-d-container">
                                        <p>Prices</p>
                                        <p>Products</p>
                                        <p>Community Rating</p>
                                    </div>
                                </div>
                            </div>
        
                            <div data-modal-top-product-buttons>
                                <div class="has-tooltip" data-tooltip="Close" data-close-product-card-button>
                                    <svg class="modalv2_top_icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path></svg>
                                </div>
                            </div>
                        </div>
                    `;
        
                    function changeModalTab(tab) {
                        modal.querySelectorAll('.selected').forEach((el) => {
                            el.classList.remove("selected");
                        });
        
                        modal.querySelector('#category-modal-tab-'+tab).classList.add('selected');
        
                        const modalInner = modal.querySelector('#category-modal-inner-content');
        
                        if (tab === '1') {
                            modalInner.innerHTML = `
                                <div class="category-modal-bottom-container">
                                    <p class="sku_id has-tooltip" data-tooltip="Click To Copy" onclick="copyValue('${categoryData.sku_id}')">${categoryData.sku_id}</p>
                                    <h1>${categoryData.name}</h1>
                                    <p>${categoryData.summary ? categoryData.summary : ''}</p>
                                    <div class="category-modal-quick-info-d-container">
                                        <p class="quick-info-prices-title">Prices</p>
                                        <p>Products</p>
                                        <p>Community Rating</p>
                                    </div>
                                    <div class="category-modal-quick-info-container">
                                        <div class="block">
                                            <div class="price-titles">
                                                <p>Standard</p>
                                                <p>Nitro</p>
                                            </div>
                                            <div id="price-detail-block">
                                                
                                            </div>
                                        </div>
                                        <div class="block">
                                            <div id="products-details-block">
                                                
                                            </div>
                                        </div>
                                        <div class="block">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <g clip-path="url(#clip0_58_258)">
                                                <path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="#FFEC3E"/>
                                                </g>
                                                <defs>
                                                <clipPath id="clip0_58_258">
                                                <rect width="24" height="24" fill="white"/>
                                                </clipPath>
                                                </defs>
                                            </svg>
                                            <h2 id="average-rating">N/A</h2>
                                            <h2>/</h2>
                                            <h1>5</h1>
                                        </div>
                                    </div>
                                </div>
                            `;

                            if (firstTimeOpeningModal) {
                                modalInner.querySelectorAll('.block').forEach((el) => {
                                    el.classList.add("animated");
                                });
                            }

                            const pricesDetailBlock = modalInner.querySelector('#price-detail-block');

                            if (pricesDetailBlock) {
                                let standardUS = 0;
                                let standardOrb = 0;

                                let nitroUS = 0;
                                let nitroOrb = 0;
                                
                                categoryData.products.forEach(product => {
                                    if (!product.prices) {
                                        return;
                                    }
                                    if (product.type === item_types.AVATAR_DECORATION || product.type === item_types.PROFILE_EFFECT || product.type === item_types.NAMEPLATE || product.type === item_types.EXTERNAL_SKU) {

                                        product.prices["0"]?.country_prices?.prices?.forEach(price => {
                                            if (price.currency === "usd") {
                                                standardUS += price.amount;
                                            }
                                            if (price.currency === "discord_orb") {
                                                standardOrb += price.amount;
                                            }
                                        });

                                        product.prices["4"]?.country_prices?.prices?.forEach(price => {
                                            if (price.currency === "usd") {
                                                nitroUS += price.amount;
                                            }
                                            if (price.currency === "discord_orb") {
                                                nitroOrb += price.amount;
                                            }
                                        });

                                    } else if (product.type === item_types.VARIANTS_GROUP) {
                                        product.variants.forEach(variant => {

                                            variant.prices["0"]?.country_prices?.prices?.forEach(price => {
                                                if (price.currency === "usd") {
                                                    standardUS += price.amount;
                                                }
                                                if (price.currency === "discord_orb") {
                                                    standardOrb += price.amount;
                                                }
                                            });
    
                                            variant.prices["4"]?.country_prices?.prices?.forEach(price => {
                                                if (price.currency === "usd") {
                                                    nitroUS += price.amount;
                                                }
                                                if (price.currency === "discord_orb") {
                                                    nitroOrb += price.amount;
                                                }
                                            });

                                        });
                                    }

                                    if (product.type === item_types.BUNDLE) {
                                        modalInner.querySelector('.quick-info-prices-title').textContent = 'Prices (Excluding Bundles)'
                                    }
                                });

                                const standardPriceOutput = `US$${(standardUS / 100).toFixed(2)}`;
                                const nitroPriceOutput = `US$${(nitroUS / 100).toFixed(2)}`;

                                pricesDetailBlock.innerHTML = `
                                    <div class="raw-price-container" id="standardUS">
                                        <h3>${standardPriceOutput}</h3>
                                    </div>
                                    <div class="raw-price-container" id="nitroUS">
                                        <h3>${nitroPriceOutput}</h3>
                                    </div>
                                    <div class="raw-price-container" id="standardOrb">
                                        <div class="orb-icon"></div>
                                        <h3>${standardOrb}</h3>
                                    </div>
                                    <div class="raw-price-container" id="nitroOrb">
                                        <div class="orb-icon"></div>
                                        <h3>${nitroOrb}</h3>
                                    </div>
                                `;

                                if (standardUS === 0) {
                                    pricesDetailBlock.querySelector('#standardUS').classList.add('hidden');
                                }
                                if (nitroUS === 0) {
                                    pricesDetailBlock.querySelector('#nitroUS').classList.add('hidden');
                                }

                                if (standardOrb === 0) {
                                    pricesDetailBlock.querySelector('#standardOrb').classList.add('hidden');
                                }
                                if (nitroOrb === 0) {
                                    pricesDetailBlock.querySelector('#nitroOrb').classList.add('hidden');
                                }
                            }


                            const productsDetailBlock = modalInner.querySelector('#products-details-block');

                            if (productsDetailBlock) {
                                let total = 0;

                                let type0count = 0;
                                let type1count = 0;
                                let type2count = 0;
                                let type1000count = 0;
                                let type3000count = 0;
                                
                                categoryData.products.forEach(product => {
                                    if (product.type === 0) {
                                        total += 1;
                                        type0count += 1;
                                    } else if (product.type === 1) {
                                        total += 1;
                                        type1count += 1;
                                    } else if (product.type === 2) {
                                        total += 1;
                                        type2count += 1;
                                    } else if (product.type === 1000) {
                                        total += 1;
                                        type1000count += 1;
                                    } else if (product.type === 3000) {
                                        total += 1;
                                        type3000count += 1;
                                    } else if (product.type === 2000) {
                                        product.variants.forEach(variant => {
                                            total += 1;
                                            if (variant.type === 0) {
                                                type0count += 1;
                                            } else if (variant.type === 1) {
                                                type1count += 1;
                                            }
                                        });
                                    }
                                });

                                let totalItems = document.createElement("h1");
        
                                totalItems.textContent = '0';
        
                                productsDetailBlock.appendChild(totalItems);

                                if (firstTimeOpeningModal) {
                                    animateNumber(totalItems, total, 1500);
                                } else {
                                    totalItems.textContent = total;
                                }

                                if (type0count) {
                                    let itemCount = document.createElement("p");
        
                                    itemCount.textContent = 'Avatar Decorations: '+type0count;
        
                                    productsDetailBlock.appendChild(itemCount);
                                }
                                if (type1count) {
                                    let itemCount = document.createElement("p");
        
                                    itemCount.textContent = 'Profile Effects: '+type1count;
        
                                    productsDetailBlock.appendChild(itemCount);
                                }
                                if (type2count) {
                                    let itemCount = document.createElement("p");
        
                                    itemCount.textContent = 'Nameplates: '+type2count;
        
                                    productsDetailBlock.appendChild(itemCount);
                                }
                                if (type1000count) {
                                    let itemCount = document.createElement("p");
        
                                    itemCount.textContent = 'Bundles: '+type1000count;
        
                                    productsDetailBlock.appendChild(itemCount);
                                }
                                if (type3000count) {
                                    let itemCount = document.createElement("p");
        
                                    itemCount.textContent = 'External SKUs: '+type3000count;
        
                                    productsDetailBlock.appendChild(itemCount);
                                }
                            }
        
                            const sku_id = modalInner.querySelector('.sku_id');
        
                            sku_id.addEventListener("click", function () {
                                sku_id.classList.add('clicked');
                                setTimeout(() => {
                                    sku_id.classList.remove('clicked');
                                }, 500);
                            });
        
                            if (categoryModalInfo.reviews_disabled != true || settingsStore.staff_force_viewable_reviews_tab === 1) {
                                const reviewsTab = modal.querySelector('#category-modal-tab-4');
                                reviewsTab.classList.remove('disabled');
                                reviewsTab.classList.remove('has-tooltip');
                                reviewsTab.addEventListener("click", function () {
                                    // Reviews
                                    changeModalTab('4');
                                });
                                  
                                let total = 0;
                                  
                                categoryModalInfo.reviews.forEach(review => {
                                    total += review.rating;
                                });
                                  
                                const average = categoryModalInfo.reviews.length > 0 ? (total / categoryModalInfo.reviews.length).toFixed(1) : 'N/A';

                                modalInner.querySelector('#average-rating').textContent = '0';

                                if (firstTimeOpeningModal && average != 'N/A') {
                                    animateNumber(modalInner.querySelector('#average-rating'), average, 1500, {
                                        useDecimals: true
                                    });
                                } else {
                                    modalInner.querySelector('#average-rating').textContent = average;
                                }
                                  
                            }
        
                        } else if (tab === '2') {
                            modalInner.innerHTML = `
                                <div class="view-raw-modalv2-inner">
                                    <textarea class="view-raw-modal-textbox" readonly>${JSON.stringify(categoryData, undefined, 4)}</textarea>
                                </div>
                            `;
                        } else if (tab === '3') {
                            modalInner.innerHTML = `
                                <div class="category-modal-assets-container">
                                </div>
                            `;

                            const assetsContainer = modalInner.querySelector('.category-modal-assets-container');

                            const allAssets = {
                                "Banner": categoryData.banner,
                                "Banner Asset (Static)": categoryData.banner_asset?.static,
                                "Banner Asset (Animated)": categoryData.banner_asset?.animated,
                                "Logo": categoryData.logo,
                                "Mobile Background": categoryData.mobile_bg,
                                "Product Detail Page Background": categoryData.pdp_bg,
                                "Success Modal Background": categoryData.success_modal_bg,
                                "Mobile Banner": categoryData.mobile_banner,
                                "Featured Block": categoryData.featured_block,
                                "Hero Banner": categoryData.hero_banner,
                                "Hero Banner Asset (Static)": categoryData.hero_banner_asset?.static,
                                "Hero Banner Asset (Animated)": categoryData.hero_banner_asset?.animated,
                                "Wide Banner": categoryData.wide_banner,
                                "Hero Logo": categoryData.hero_logo,
                                "Category Background": categoryData.category_bg
                            };

                            let nullAssets = true;

                            Object.entries(allAssets).forEach(([asset, value]) => {
                                if (!value) return; // skip null or undefined

                                nullAssets = false;

                                let assetDiv = document.createElement("div");

                                assetDiv.classList.add('asset-div')

                                if (value.includes(".webm")) {
                                    assetDiv.innerHTML = `
                                        <h2>${asset}</h2>
                                        <video disablepictureinpicture autoplay muted loop src="${value}"></video> 
                                    `;
                                } else if (value.includes(".png") || value.includes(".jpg")) {
                                    assetDiv.innerHTML = `
                                        <h2>${asset}</h2>
                                        <img src="${value}"></img> 
                                    `;
                                } else {
                                    assetDiv.innerHTML = `
                                        <h2>${asset}</h2>
                                        <p class="asset_id has-tooltip" data-tooltip="Click To Copy" onclick="copyValue('${value}')">${value}</p>
                                        <img src="https://cdn.discordapp.com/app-assets/1096190356233670716/${value}.png?size=4096"></img> 
                                    `;
                                }

                                assetsContainer.appendChild(assetDiv);
                            });

                            if (nullAssets) {
                                assetsContainer.innerHTML = `
                                    <div class="no-assets-container">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M13.96 5.46002L18.54 10.04C18.633 10.1337 18.7436 10.2081 18.8655 10.2589C18.9873 10.3097 19.118 10.3358 19.25 10.3358C19.3821 10.3358 19.5128 10.3097 19.6346 10.2589C19.7565 10.2081 19.8671 10.1337 19.96 10.04L21.34 8.66002C21.7125 8.28529 21.9216 7.77839 21.9216 7.25002C21.9216 6.72164 21.7125 6.21474 21.34 5.84002L18.16 2.66002C17.7853 2.28751 17.2784 2.07843 16.75 2.07843C16.2217 2.07843 15.7148 2.28751 15.34 2.66002L13.96 4.04002C13.8663 4.13298 13.7919 4.24358 13.7412 4.36544C13.6904 4.4873 13.6642 4.618 13.6642 4.75002C13.6642 4.88203 13.6904 5.01273 13.7412 5.13459C13.7919 5.25645 13.8663 5.36705 13.96 5.46002ZM2.11005 20.16L2.84005 15.94C2.94422 15.3306 3.2341 14.7683 3.67005 14.33L11.54 6.46002C11.633 6.36629 11.7436 6.29189 11.8655 6.24112C11.9873 6.19036 12.118 6.16422 12.25 6.16422C12.3821 6.16422 12.5128 6.19036 12.6346 6.24112C12.7565 6.29189 12.8671 6.36629 12.96 6.46002L17.54 11.04C17.6338 11.133 17.7082 11.2436 17.7589 11.3654C17.8097 11.4873 17.8358 11.618 17.8358 11.75C17.8358 11.882 17.8097 12.0127 17.7589 12.1346C17.7082 12.2565 17.6338 12.3671 17.54 12.46L9.67005 20.33C9.2344 20.7641 8.67585 21.0539 8.07005 21.16L3.84005 21.89C3.60388 21.9301 3.36155 21.9131 3.13331 21.8403C2.90508 21.7676 2.69759 21.6412 2.52821 21.4719C2.35882 21.3025 2.23247 21.095 2.15972 20.8667C2.08697 20.6385 2.06993 20.3962 2.11005 20.16Z" fill="currentColor"/>
                                            <path d="M5 1L5.81027 3.18973L8 4L5.81027 4.81027L5 7L4.18973 4.81027L2 4L4.18973 3.18973L5 1Z" fill="currentColor"/>
                                            <path d="M14 19L14.5402 20.4598L16 21L14.5402 21.5402L14 23L13.4598 21.5402L12 21L13.4598 20.4598L14 19Z" fill="currentColor"/>
                                        </svg>
                                        <p>This category has no assets.</p>
                                    </div>
                                `;
                            }

                            document.querySelectorAll('.asset_id').forEach((el) => {
                                el.addEventListener("click", function () {
                                    el.classList.add('clicked');
                                    setTimeout(() => {
                                        el.classList.remove('clicked');
                                    }, 500);
                                });
                            });

                        } else if (tab === '4') {
                            modalInner.innerHTML = `
                                <div class="category-modal-reviews-container">
                                </div>
                                <div class="write-review-container" id="write-review-container">
                                    <p class="write-review-disclaimer-error"></p>
                                    <div class="write-review-input-container">
                                    </div>
                                </div>
                            `;

                            const reviewInputContainer = modalInner.querySelector('.write-review-input-container');

                            function refreshReviewBar() {
                                if (currentUserData) {

                                    let hasReviewAlready;

                                    categoryModalInfo.reviews.forEach(review => {
                                        if (review.user.id === currentUserData.id) {
                                            hasReviewAlready = true;
                                        }
                                    });

                                    if (currentUserData.ban_config.ban_type >= 1 || settingsStore.staff_simulate_ban_type_1 === 1 || settingsStore.staff_simulate_ban_type_2 === 1 || currentUserData.username_violates_tos === true || settingsStore.staff_simulate_guidelines_block === 1) {

                                        let banTitle = 'You have been suspended from submitting reviews.';
                                        let banDisclaimer = `
                                            <p>You have violated our</p>
                                            <a class="link" href="https://yapper.shop/legal-information/?page=tos">Terms of Service</a>
                                            <p>and can no longer submit reviews.</p>
                                            <a class="link" href="https://yapper.shop/bans-and-suspensions">Learn More</a>
                                        `;
                                        let appealable = true;

                                        if (currentUserData.ban_config.ban_type === 2 || settingsStore.staff_simulate_ban_type_2 === 1) {
                                            banTitle = 'You have been permanently banned from submitting reviews.';
                                            banDisclaimer = `
                                                <p>You have violated our</p>
                                                <a class="link" href="https://yapper.shop/legal-information/?page=tos">Terms of Service</a>
                                                <p>and can no longer submit reviews. This ban cannot be appealed.</p>
                                            `;
                                            appealable = false;
                                        }

                                        if (currentUserData.username_violates_tos === true || settingsStore.staff_simulate_guidelines_block === 1) {
                                            banTitle = 'You cannot submit reviews.';
                                            banDisclaimer = `
                                                <p>Your username violates our</p>
                                                <a class="link" href="https://yapper.shop/legal-information/?page=tos">Community Guidelines,</a>
                                                <p>all your reviews have been temporarily hidden from the public.</p>
                                            `;
                                            appealable = false;
                                        }

                                        reviewInputContainer.classList.add('banned');
                                        reviewInputContainer.innerHTML = `
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clip-path="url(#clip0_66_360)">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M18.0939 13.525C18.4939 12.825 19.5239 12.825 19.9139 13.525L23.8739 20.425C24.2539 21.085 23.7539 21.895 22.9639 21.895H15.0439C14.2539 21.895 13.7439 21.085 14.1339 20.415L18.0939 13.515V13.525ZM18.5539 15.395H19.4539C19.7539 15.395 19.9739 15.655 19.9539 15.945L19.7339 17.965C19.7239 18.125 19.5639 18.225 19.4039 18.195C19.1401 18.1391 18.8676 18.1391 18.6039 18.195C18.4439 18.225 18.2839 18.125 18.2739 17.965L18.0639 15.945C18.0569 15.8753 18.0646 15.8048 18.0866 15.7383C18.1085 15.6717 18.1443 15.6105 18.1914 15.5587C18.2386 15.5068 18.2961 15.4654 18.3603 15.4372C18.4244 15.409 18.4938 15.3946 18.5639 15.395H18.5539ZM19.0039 20.895C19.2691 20.895 19.5235 20.7896 19.711 20.6021C19.8985 20.4146 20.0039 20.1602 20.0039 19.895C20.0039 19.6298 19.8985 19.3754 19.711 19.1879C19.5235 19.0004 19.2691 18.895 19.0039 18.895C18.7387 18.895 18.4843 19.0004 18.2968 19.1879C18.1092 19.3754 18.0039 19.6298 18.0039 19.895C18.0039 20.1602 18.1092 20.4146 18.2968 20.6021C18.4843 20.7896 18.7387 20.895 19.0039 20.895Z" fill="currentColor"/>
                                            <path d="M10.4238 2.12421C12.6154 1.77616 14.8606 2.1665 16.8057 3.23456C18.7507 4.30263 20.2856 5.98766 21.168 8.02362C22.0095 9.96556 22.2098 12.1215 21.749 14.1818L20.2764 11.7082C19.7305 10.764 18.2893 10.7639 17.7295 11.7082V11.6945L12.1875 21.0031C11.9898 21.3304 11.9593 21.6822 12.0508 21.9982C12.0339 21.9983 12.0169 22.0002 12 22.0002H2.2002C2.00802 21.9999 1.8196 21.9444 1.6582 21.84C1.49684 21.7357 1.36915 21.5864 1.29004 21.4113C1.21109 21.2364 1.18366 21.0425 1.21191 20.8527C1.2403 20.6627 1.32336 20.4844 1.4502 20.34L3.50977 17.9699C3.65977 17.7999 3.6798 17.5496 3.5498 17.3596C2.3606 15.4863 1.82794 13.2708 2.03613 11.0617C2.24434 8.85254 3.18182 6.77552 4.7002 5.15741C6.21866 3.53928 8.23227 2.47226 10.4238 2.12421Z" fill="currentColor"/>
                                            </g>
                                            <defs>
                                            <clipPath id="clip0_66_360">
                                            <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            </defs>
                                            </svg>
                                            <div class="text-container">
                                                <h3>${banTitle}</h3>
                                                <div class="desc-container">${banDisclaimer}</div>
                                            </div>
                                            <button class="log-in-with-discord-button ${appealable ? '' : 'hidden'}">
                                                Appeal Suspension
                                            </button>
                                        `;
                                    } else if (categoryModalInfo.reviews_disabled === true) {
                                        reviewInputContainer.classList.add('normal');
                                        reviewInputContainer.innerHTML = `
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <g clip-path="url(#clip0_66_360)">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M18.0939 13.525C18.4939 12.825 19.5239 12.825 19.9139 13.525L23.8739 20.425C24.2539 21.085 23.7539 21.895 22.9639 21.895H15.0439C14.2539 21.895 13.7439 21.085 14.1339 20.415L18.0939 13.515V13.525ZM18.5539 15.395H19.4539C19.7539 15.395 19.9739 15.655 19.9539 15.945L19.7339 17.965C19.7239 18.125 19.5639 18.225 19.4039 18.195C19.1401 18.1391 18.8676 18.1391 18.6039 18.195C18.4439 18.225 18.2839 18.125 18.2739 17.965L18.0639 15.945C18.0569 15.8753 18.0646 15.8048 18.0866 15.7383C18.1085 15.6717 18.1443 15.6105 18.1914 15.5587C18.2386 15.5068 18.2961 15.4654 18.3603 15.4372C18.4244 15.409 18.4938 15.3946 18.5639 15.395H18.5539ZM19.0039 20.895C19.2691 20.895 19.5235 20.7896 19.711 20.6021C19.8985 20.4146 20.0039 20.1602 20.0039 19.895C20.0039 19.6298 19.8985 19.3754 19.711 19.1879C19.5235 19.0004 19.2691 18.895 19.0039 18.895C18.7387 18.895 18.4843 19.0004 18.2968 19.1879C18.1092 19.3754 18.0039 19.6298 18.0039 19.895C18.0039 20.1602 18.1092 20.4146 18.2968 20.6021C18.4843 20.7896 18.7387 20.895 19.0039 20.895Z" fill="currentColor"/>
                                            <path d="M10.4238 2.12421C12.6154 1.77616 14.8606 2.1665 16.8057 3.23456C18.7507 4.30263 20.2856 5.98766 21.168 8.02362C22.0095 9.96556 22.2098 12.1215 21.749 14.1818L20.2764 11.7082C19.7305 10.764 18.2893 10.7639 17.7295 11.7082V11.6945L12.1875 21.0031C11.9898 21.3304 11.9593 21.6822 12.0508 21.9982C12.0339 21.9983 12.0169 22.0002 12 22.0002H2.2002C2.00802 21.9999 1.8196 21.9444 1.6582 21.84C1.49684 21.7357 1.36915 21.5864 1.29004 21.4113C1.21109 21.2364 1.18366 21.0425 1.21191 20.8527C1.2403 20.6627 1.32336 20.4844 1.4502 20.34L3.50977 17.9699C3.65977 17.7999 3.6798 17.5496 3.5498 17.3596C2.3606 15.4863 1.82794 13.2708 2.03613 11.0617C2.24434 8.85254 3.18182 6.77552 4.7002 5.15741C6.21866 3.53928 8.23227 2.47226 10.4238 2.12421Z" fill="currentColor"/>
                                            </g>
                                            <defs>
                                            <clipPath id="clip0_66_360">
                                            <rect width="24" height="24" fill="white"/>
                                            </clipPath>
                                            </defs>
                                            </svg>
                                            <div class="text-container">
                                                <h3>Reviews disabled.</h3>
                                                <p>You cannot review this category.</p>
                                            </div>
                                        `;
                                    } else if (hasReviewAlready) {
                                        reviewInputContainer.innerHTML = `
                                            <div id="star-rating" class="stars">
                                                <svg class="has-tooltip" data-tooltip="1 Star" data-value="1" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                                <svg class="has-tooltip" data-tooltip="2 Stars" data-value="2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                                <svg class="has-tooltip" data-tooltip="3 Stars" data-value="3" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                                <svg class="has-tooltip" data-tooltip="4 Stars" data-value="4" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                                <svg class="has-tooltip" data-tooltip="5 Stars" data-value="5" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                            </div>

                                            <input autocomplete="off" id="write-review-post-input" placeholder="Edit review for ${categoryData.name}...">
                                            <p class="write-review-text-limit">100</p>
                                            <svg class="review-send-icon has-tooltip" data-tooltip="Submit Review" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 10.02 14 11.4a.6.6 0 0 1 0 1.18L6.6 14l-2.94 5.87a1.48 1.48 0 0 0 1.99 1.98l17.03-8.52a1.48 1.48 0 0 0 0-2.64L5.65 2.16a1.48 1.48 0 0 0-1.99 1.98l2.94 5.88Z" class=""></path></svg>
                                        `;
                                    } else {
                                        reviewInputContainer.innerHTML = `
                                            <div id="star-rating" class="stars">
                                                <svg class="has-tooltip" data-tooltip="1 Star" data-value="1" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                                <svg class="has-tooltip" data-tooltip="2 Stars" data-value="2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                                <svg class="has-tooltip" data-tooltip="3 Stars" data-value="3" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                                <svg class="has-tooltip" data-tooltip="4 Stars" data-value="4" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                                <svg class="has-tooltip" data-tooltip="5 Stars" data-value="5" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_131_2)"><path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="currentColor"></path></g><defs><clipPath id="clip0_131_2"><rect width="24" height="24" fill="currentColor"></rect></clipPath></defs></svg>
                                            </div>

                                            <input autocomplete="off" id="write-review-post-input" placeholder="Write a review for ${categoryData.name}...">
                                            <p class="write-review-text-limit">100</p>
                                            <svg class="review-send-icon has-tooltip" data-tooltip="Submit Review" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 10.02 14 11.4a.6.6 0 0 1 0 1.18L6.6 14l-2.94 5.87a1.48 1.48 0 0 0 1.99 1.98l17.03-8.52a1.48 1.48 0 0 0 0-2.64L5.65 2.16a1.48 1.48 0 0 0-1.99 1.98l2.94 5.88Z" class=""></path></svg>
                                        `;
                                    }

                                                                        
                                
                                    const reviewInput = modalInner.querySelector('#write-review-post-input');
                                    const reviewSendIcon = modalInner.querySelector('.review-send-icon');
                                    const errorOutput = modalInner.querySelector('.write-review-disclaimer-error');



                                    const input = reviewInput;
                                    const counter = modalInner.querySelector('.write-review-text-limit');
                                    let maxLength = 100;

                                    if (counter) {
                                        if (currentUserData.user_features.includes("LONGER_REVIEWS")) {
                                            maxLength = 200;
                                            counter.classList.add('has-tooltip');
                                            counter.setAttribute('data-tooltip', 'Your review length limit is doubled');
                                        }

                                        function updateCounter() {
                                            const currentLength = input.value.length;
                                            const remaining = maxLength - currentLength;

                                            counter.textContent = remaining;

                                            // Remove all classes first
                                            counter.classList.remove('warning', 'danger');
                                            input.classList.remove('limit-reached');

                                            // Add appropriate styling based on remaining characters
                                            if (remaining <= 0) {
                                                counter.classList.add('danger');
                                                input.classList.add('limit-reached');
                                            } else if (remaining <= 20) {
                                                counter.classList.add('warning');
                                            }
                                        }

                                        // Update counter on input
                                        input.addEventListener('input', updateCounter);

                                        // Prevent typing when limit is reached
                                        input.addEventListener('keydown', function(e) {
                                            const currentLength = input.value.length;

                                            // Allow backspace, delete, tab, escape, enter, and arrow keys
                                            if ([8, 9, 27, 13, 46, 37, 38, 39, 40].includes(e.keyCode) ||
                                                // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
                                                (e.ctrlKey && [65, 67, 86, 88, 90].includes(e.keyCode))) {
                                                return;
                                            }

                                            // Prevent typing if at max length
                                            if (currentLength >= maxLength) {
                                                e.preventDefault();
                                            }
                                        });

                                        updateCounter();
                                    }



                                    if (reviewSendIcon) {
                                        reviewSendIcon.addEventListener("click", function () {
                                            reviewPostHandle();
                                        });
                                    }

                                    const stars = modalInner.querySelectorAll('#star-rating svg');
                                    let selectedRating = 0;

                                    stars.forEach(star => {
                                        star.addEventListener('click', () => {
                                            selectedRating = parseInt(star.getAttribute('data-value'));
                                            stars.forEach(star => {
                                                const value = parseInt(star.getAttribute('data-value'));
                                                star.classList.toggle('filled', value <= selectedRating);
                                            });
                                        });
                                    });

                                    async function reviewPostHandle() {
                                        errorOutput.textContent = '';
                                        const domainRegex = /\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/;

                                        if (reviewInput.value.trim().length === 0) {
                                            errorOutput.textContent = 'Reviews cannot be blank';
                                        } else if (selectedRating === 0) {
                                            errorOutput.textContent = 'Rating must be 1-5 stars';
                                        } else if (domainRegex.test(reviewInput.value)) {
                                            errorOutput.textContent = 'Reviews cannot contain Links or Domains';
                                        } else {
                                            const status = await postReview(categoryData.sku_id, selectedRating, reviewInput.value);

                                            if (status.error && status.message) {
                                                errorOutput.textContent = `${status.error}, ${status.message}`;
                                            } else {
                                                await fetchCategoryData();
                                                fetchAndRenderReviews();
                                                refreshReviewBar();
                                            }
                                        }
                                    }

                                } else {
                                    reviewInputContainer.classList.add('normal');
                                    reviewInputContainer.innerHTML = `
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M11.9999 22C14.2189 21.9983 16.3744 21.2585 18.1268 19.8972C19.8792 18.5359 21.129 16.6304 21.6795 14.4807C22.23 12.3311 22.0498 10.0594 21.1674 8.02335C20.285 5.98732 18.7504 4.30264 16.8053 3.23457C14.8602 2.16651 12.6151 1.77574 10.4236 2.12379C8.23202 2.47185 6.21848 3.53896 4.70001 5.15709C3.18155 6.77522 2.24443 8.85245 2.03621 11.0617C1.82799 13.2709 2.36051 15.4867 3.54991 17.36C3.67991 17.55 3.65991 17.8 3.50991 17.97L1.44991 20.34C1.32307 20.4844 1.24052 20.6623 1.21214 20.8523C1.18376 21.0424 1.21074 21.2366 1.28987 21.4117C1.36899 21.5869 1.49691 21.7355 1.6583 21.8398C1.81969 21.9442 2.00773 21.9998 2.19991 22H11.9999Z" fill="currentColor"/>
                                        </svg>
                                        <div class="text-container">
                                            <h3>Login with Discord to submit reviews.</h3>
                                        </div>
                                        <button class="log-in-with-discord-button" onclick="loginWithDiscord();">
                                            <svg width="59" height="59" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M48.7541 12.511C45.2046 10.8416 41.4614 9.66246 37.6149 9C37.0857 9.96719 36.6081 10.9609 36.1822 11.9811C32.0905 11.3451 27.9213 11.3451 23.8167 11.9811C23.3908 10.9609 22.9132 9.96719 22.384 9C18.5376 9.67571 14.7815 10.8549 11.2319 12.5243C4.18435 23.2297 2.27404 33.67 3.2292 43.9647C7.35961 47.0915 11.9805 49.4763 16.8854 51C17.9954 49.4763 18.9764 47.8467 19.8154 46.1508C18.2149 45.5413 16.6789 44.7861 15.2074 43.8984C15.5946 43.6069 15.969 43.3155 16.3433 43.024C24.9913 47.1975 35.0076 47.1975 43.6557 43.024C44.03 43.3287 44.4043 43.6334 44.7915 43.8984C43.3201 44.7861 41.7712 45.5413 40.1706 46.164C41.0096 47.8599 41.9906 49.4763 43.1006 51C48.0184 49.4763 52.6393 47.1047 56.7697 43.9647C57.8927 32.0271 54.8594 21.6927 48.7412 12.511H48.7541ZM21.0416 37.6315C18.3827 37.6315 16.1755 35.1539 16.1755 32.1066C16.1755 29.0593 18.2923 26.5552 21.0287 26.5552C23.7651 26.5552 25.9465 29.0593 25.8949 32.1066C25.8432 35.1539 23.7522 37.6315 21.0416 37.6315ZM38.9831 37.6315C36.3113 37.6315 34.1299 35.1539 34.1299 32.1066C34.1299 29.0593 36.2467 26.5552 38.9831 26.5552C41.7195 26.5552 43.888 29.0593 43.8364 32.1066C43.7847 35.1539 41.6937 37.6315 38.9831 37.6315Z" fill="white"/>
                                            </svg>
                                            Login with Discord
                                        </button>
                                    `;
                                }
                            }

                            refreshReviewBar();

                            const reviewsContainer = modalInner.querySelector('.category-modal-reviews-container');

                            async function fetchAndRenderReviews() {
                                reviewsContainer.innerHTML = ``;
                                if (Array.isArray(categoryModalInfo.reviews) && categoryModalInfo.reviews.length != 0) {
                                    categoryModalInfo.reviews.forEach(review => {
                                        let reviewDiv = document.createElement("div");
                
                                        reviewDiv.classList.add('category-modal-review-container');
                                        if (review.types.system != 0) {
                                            const type = reviews_system_types.find(type => type.id === review.types.system).codename;
                                            reviewDiv.style.backgroundColor = `var(--bg-feedback-${type})`;
                                            reviewDiv.classList.add(`bg-feedback-${type}`);
                                        }
                                        reviewDiv.innerHTML = `
                                            <div class="shop-modal-review-moderation-buttons" data-modal-top-product-buttons></div>
                                            <div class="review-nameplate-container"></div>
                                            <div class="review-user-container">
                                                <div class="review-avatar-container">
                                                    <img class="review-avatar" src="https://cdn.yapper.shop/assets/31.png" onerror="this.parentElement.remove();">
                                                    <img class="review-avatar-decoration" src="https://cdn.yapper.shop/assets/31.png">
                                                </div>

                                                <div class="review-user-display-name-container">
                                                    <p class="inv"></p>
                                                    <p class="review-user-display-name"></p>
                                                </div>

                                                <div class="review-system-tag-container has-tooltip" data-tooltip="Official Shop Archives Message">
                                                    <p class="inv">SYSTEM</p>
                                                    <p class="review-system-tag">SYSTEM</p>
                                                </div>

                                                <div class="review-server-tag-container-container">
                                                    <div class="review-server-tag-container">
                                                        <img class="server-tag-img" src="https://cdn.yapper.shop/assets/31.png">
                                                        <div class="server-tag-title-container">
                                                            <p class="server-tag-title"></p>
                                                            <p class="inv"></p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div class="review-badges-container-container">
                                                    <div class="review-badges-container">
                                                    </div>
                                                </div>

                                                <div class="review-rating-container">
                                                    <div class="possible-stars">
                                                
                                                    </div>
                                                    <div class="star-rating">
                                                        
                                                    </div>
                                                </div>

                                                <div class="review-date-container">
                                                    <p class="inv">today</p>
                                                    <p class="review-date">today</p>
                                                </div>

                                            </div>
                                            <p class="review-text-content"></p>
                                        `;

                                        const date = new Date(review.created_at);

                                        const day = String(date.getDate()).padStart(2, '0');
                                        const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth is 0-indexed
                                        const year = date.getFullYear();

                                        const dateContainer = reviewDiv.querySelector(".review-date-container");

                                        if (settingsStore.non_us_timezone === 1) {
                                            const formatted = `${day}/${month}/${year}`;

                                            dateContainer.querySelector('.review-date').textContent = `${formatted}`;
                                            dateContainer.querySelector('.inv').textContent = `${formatted}`;
                                        } else {
                                            const formatted = `${month}/${day}/${year}`;
                                            
                                            dateContainer.querySelector('.review-date').textContent = `${formatted}`;
                                            dateContainer.querySelector('.inv').textContent = `${formatted}`;
                                        }

                                        if (currentUserData?.id === review.user.id || currentUserData?.types.admin_level >= 1) {
                                            let deleteReviewIcon = document.createElement("div");

                                            deleteReviewIcon.innerHTML = `
                                                <svg class="modalv2_top_icon has-tooltip" data-tooltip="Delete Review" style="color: var(--color-red);" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M14.25 1c.41 0 .75.34.75.75V3h5.25c.41 0 .75.34.75.75v.5c0 .41-.34.75-.75.75H3.75A.75.75 0 0 1 3 4.25v-.5c0-.41.34-.75.75-.75H9V1.75c0-.41.34-.75.75-.75h4.5Z" class=""></path><path fill="currentColor" fill-rule="evenodd" d="M5.06 7a1 1 0 0 0-1 1.06l.76 12.13a3 3 0 0 0 3 2.81h8.36a3 3 0 0 0 3-2.81l.75-12.13a1 1 0 0 0-1-1.06H5.07ZM11 12a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm3-1a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" clip-rule="evenodd" class=""></path></svg>
                                            `;

                                            deleteReviewIcon.addEventListener("click", function () {
                                                reviewDeleteHandle();
                                            });

                                            async function reviewDeleteHandle() {
                                                const status = await deleteReviewById(review.id);

                                                if (status.error && status.message) {
                                                } else {
                                                    await fetchCategoryData();
                                                    fetchAndRenderReviews();
                                                    refreshReviewBar();
                                                }
                                            }

                                            reviewDiv.querySelector(".shop-modal-review-moderation-buttons").appendChild(deleteReviewIcon);
                                        }
    
                                        if (review.user.avatar) {
    
                                            const avatarPreview = reviewDiv.querySelector('.review-avatar');
    
                                            avatarPreview.src = userAvatar = 'https://cdn.discordapp.com/avatars/'+review.user.id+'/'+review.user.avatar+'.webp?size=128';
    
                                            if (review.user.avatar.includes('a_')) {
                                                reviewDiv.addEventListener("mouseenter", () => {
                                                    avatarPreview.src = userAvatar = 'https://cdn.discordapp.com/avatars/'+review.user.id+'/'+review.user.avatar+'.gif?size=128';
                                                });
                                                reviewDiv.addEventListener("mouseleave", () => {
                                                    avatarPreview.src = userAvatar = 'https://cdn.discordapp.com/avatars/'+review.user.id+'/'+review.user.avatar+'.webp?size=128';
                                                });
                                            }
    
                                        }

                                        if (!review.user.types.system) {
                                            reviewDiv.querySelector('.review-system-tag-container').remove();
                                        }
    
                                        if (review.user.avatar_decoration_data?.asset) {
    
                                            const decoPreview = reviewDiv.querySelector('.review-avatar-decoration');
    
                                            decoPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${review.user.avatar_decoration_data.asset}.png?size=4096&passthrough=false`;
    
                                            reviewDiv.addEventListener("mouseenter", () => {
                                                decoPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${review.user.avatar_decoration_data.asset}.png?size=4096&passthrough=true`;
                                            });
                                            reviewDiv.addEventListener("mouseleave", () => {
                                                decoPreview.src = `https://cdn.discordapp.com/avatar-decoration-presets/${review.user.avatar_decoration_data.asset}.png?size=4096&passthrough=false`;
                                            });
    
                                        }
    
                                        const serverTagAsset = reviewDiv.querySelector('.review-server-tag-container-container');
    
                                        if (review.user.primary_guild) {
    
                                            serverTagAsset.querySelector('.server-tag-img').src = `https://cdn.discordapp.com/clan-badges/${review.user.primary_guild.identity_guild_id}/${review.user.primary_guild.badge}.png?size=24`;
    
                                            serverTagAsset.querySelector('.server-tag-title').textContent = review.user.primary_guild.tag;
                                            serverTagAsset.querySelector('.inv').textContent = review.user.primary_guild.tag;
    
                                        } else {
                                            serverTagAsset.remove();
                                        }
    
                                        const userBadgesElement = reviewDiv.querySelector('.review-badges-container-container');
                                        const userBadgesInnerElement = reviewDiv.querySelector('.review-badges-container');
    
                                        if (Array.isArray(review.user.badges)) {
                                            review.user.badges.forEach(badge => {
                                                const badgeImg = document.createElement("img");
                                                badgeImg.src = badge.src;
                                                badgeImg.alt = badge.name;
                                                badgeImg.setAttribute('data-tooltip', badge.name);
                                                badgeImg.classList.add("badge");
                                                badgeImg.classList.add("has-tooltip");
                                                
                                                if (badge.support) {
                                                    const badgeLink = document.createElement("a");
                                                    badgeLink.href = badge.support;
                                                    badgeLink.target = "_blank";
                                                    badgeLink.rel = "noopener noreferrer";
                                                    badgeLink.appendChild(badgeImg);
                                                    userBadgesInnerElement.appendChild(badgeLink);
                                                } else {
                                                    userBadgesInnerElement.appendChild(badgeImg);
                                                }
                                            });
                                        } else {
                                            userBadgesElement.remove();
                                        }
    
    
                                        if (review.user.collectibles?.nameplate) {
                                            if (review.user.collectibles.nameplate.sa_override_src) {
                                                let nameplatePreview = document.createElement("img");
                                                
                                                nameplatePreview.src = review.user.collectibles.nameplate.sa_override_src;
    
                                                reviewDiv.querySelector('.review-nameplate-container').appendChild(nameplatePreview);
                                            } else {
                                                let nameplatePreview = document.createElement("video");
                                                
                                                nameplatePreview.src = `https://cdn.discordapp.com/assets/collectibles/${review.user.collectibles.nameplate.asset}asset.webm`;
                                                nameplatePreview.disablePictureInPicture = true;
                                                nameplatePreview.muted = true;
                                                nameplatePreview.loop = true;
                                                nameplatePreview.playsInline = true;
    
                                                reviewDiv.addEventListener("mouseenter", () => {
                                                    nameplatePreview.play();
                                                });
                                                reviewDiv.addEventListener("mouseleave", () => {
                                                    nameplatePreview.pause();
                                                });

                                                const bgcolor = nameplate_palettes[review.user.collectibles.nameplate.palette].darkBackground;
    
                                                reviewDiv.querySelector('.review-nameplate-container').style.backgroundImage = `linear-gradient(90deg, #00000000 0%, ${bgcolor} 200%)`;
    
                                                reviewDiv.querySelector('.review-nameplate-container').appendChild(nameplatePreview);
                                            }
                                        }
    
                                        if (review.rating != null) {
                                            for (let i = 0; i < 5; i++) {
                                                let starRate = document.createElement("div");
        
                                                starRate.innerHTML = `
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <g clip-path="url(#clip0_58_258)">
                                                        <path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="#575757"></path>
                                                        </g>
                                                        <defs>
                                                        <clipPath id="clip0_58_258">
                                                        <rect width="24" height="24" fill="white"></rect>
                                                        </clipPath>
                                                        </defs>
                                                    </svg>
                                                `;
        
                                                reviewDiv.querySelector('.possible-stars').appendChild(starRate);
                                            }
        
                                            for (let i = 0; i < review.rating; i++) {
                                                let starRate = document.createElement("div");
        
                                                starRate.innerHTML = `
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <g clip-path="url(#clip0_58_258)">
                                                        <path d="M12 1L14.6942 9.2918H23.4127L16.3593 14.4164L19.0534 22.7082L12 17.5836L4.94658 22.7082L7.64074 14.4164L0.587322 9.2918H9.30583L12 1Z" fill="#FFEC3E"></path>
                                                        </g>
                                                        <defs>
                                                        <clipPath id="clip0_58_258">
                                                        <rect width="24" height="24" fill="white"></rect>
                                                        </clipPath>
                                                        </defs>
                                                    </svg>
                                                `;
        
                                                reviewDiv.querySelector('.star-rating').appendChild(starRate);
                                            }
                                        }
    
                                        reviewDiv.querySelector('.inv').textContent = review.user.global_name ? review.user.global_name : review.user.username;
                                        reviewDiv.querySelector('.review-user-display-name').textContent = review.user.global_name ? review.user.global_name : review.user.username;
                                        reviewDiv.querySelector('.review-text-content').textContent = review.text;
                
                                        reviewsContainer.appendChild(reviewDiv);
                                    });
                                } else {
                                    let reviewDiv = document.createElement("div");
                
                                    reviewDiv.classList.add('category-modal-review-container');
                                    reviewDiv.style.backgroundColor = 'var(--bg-feedback-info)';
                                    reviewDiv.innerHTML = `
                                        <p class="review-text-content">This category currently has no reviews.</p>
                                    `;

                                    if (categoryModalInfo.reviews_disabled === true) {
                                    } else if (currentUserData && currentUserData.ban_config.ban_type === 0) {
                                        reviewDiv.querySelector('.review-text-content').textContent = 'This category currently has no reviews. You could be the first!';
                                    } else if (currentUserData && currentUserData.ban_config.ban_type >= 1) {
                                    } else {
                                        reviewDiv.querySelector('.review-text-content').textContent = 'This category currently has no reviews. Login with Discord and you could be the first!';
                                    }

                
                                    reviewsContainer.appendChild(reviewDiv);
                                }
                            }

                            fetchAndRenderReviews();

                        } else if (tab === '5') {
                            modalInner.innerHTML = `
                                <div class="category-modal-xp-rewards-container">
                                </div>
                            `;
                            usersXPEventsCache.forEach(promo => {
                                if (promo.category_data?.sku_id === categoryData.sku_id && promo.already_claimed != true) {
                                    let promoCard = document.createElement("div");

                                    promoCard.classList.add('category-modal-xp-reward');
                                    promoCard.classList.add('unclaimed');

                                    promoCard.innerHTML = `
                                        <h3>Claim your free ${promo.xp_reward.toLocaleString()} XP!</h3>
                                        <p class="desc">You have ${promo.xp_reward.toLocaleString()} XP waiting for you.</p>
                                        <button id="claim-xp-button">
                                            Claim ${promo.xp_reward.toLocaleString()} XP
                                            <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                            </svg>
                                        </button>
                                    `;

                                    promoCard.querySelector('#claim-xp-button').addEventListener('click', () => {
                                        openClaimableClaimXPModal(promo.claimable_id);
                                    });
                                    
                                    modalInner.querySelector('.category-modal-xp-rewards-container').appendChild(promoCard)
                                } else if (promo.category_data?.sku_id === categoryData.sku_id && promo.already_claimed === true) {
                                    let promoCard = document.createElement("div");

                                    promoCard.classList.add('category-modal-xp-reward');

                                    promoCard.innerHTML = `
                                        <h3>Already Claimed.</h3>
                                        <p class="desc">You already claimed this event reward for ${promo.xp_reward.toLocaleString()} XP.</p>
                                    `;
                                    
                                    modalInner.querySelector('.category-modal-xp-rewards-container').appendChild(promoCard)
                                }
                            });
                        } else {
                            modalInner.innerHTML = ``;
                        }
                    }

                    window.changeModalTab = changeModalTab;

                    if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'xp_system')?.treatment === 1) {
                        modal.querySelector('#category-modal-tab-5').classList.remove('hidden');
                    }


                    document.body.appendChild(modal);
        
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            modal.classList.add('show');
                        });
                    });


                    let modal_back = document.createElement("div");
        
                    modal_back.classList.add('category-modal-back');
                    modal_back.id = 'category-modal-back';
        
                    document.body.appendChild(modal_back);
        
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            modal_back.classList.add('show');
                        });
                    });


                    if (!categoryModalInfo) {
                        await fetchCategoryData()
                    }

                    async function fetchCategoryData() {
                        const rawCategoryData = await fetch(redneredAPI + endpoints.CATEGORY_MODAL_INFO + categoryData.sku_id);

                        if (!rawCategoryData.ok) {
                            return
                        }

                        const data = await rawCategoryData.json();

                        if (data.message) {
                            console.error(data);
                        } else {
                            categoryModalInfo = data;
                        }
                    }

                    if (Array.isArray(usersXPEventsCache)) {
                        usersXPEventsCache.forEach(promo => {
                            if (promo.category_data?.sku_id === categoryData.sku_id) {
                                const xpRewardsTab = modal.querySelector('#category-modal-tab-5');
                                xpRewardsTab.classList.remove('disabled');
                                xpRewardsTab.classList.remove('has-tooltip');
                                xpRewardsTab.addEventListener("click", function () {
                                    // Rewards
                                    changeModalTab('5');
                                });
                            }
                        });
                    }
        
                    modal.querySelector('#category-modal-tab-1').addEventListener("click", function () {
                        // Details
                        changeModalTab('1');
                    });
                    modal.querySelector('#category-modal-tab-2').addEventListener("click", function () {
                        // Raw
                        changeModalTab('2');
                    });
                    modal.querySelector('#category-modal-tab-3').addEventListener("click", function () {
                        // Assets
                        changeModalTab('3');
                    });
        
                    changeModalTab('1');

                    firstTimeOpeningModal = false;
        
        
                    modal.addEventListener('click', (event) => {
                        if (event.target === modal) {
                            modal.classList.remove('show');
                            modal_back.classList.remove('show');
                            setTimeout(() => {
                                modal.remove();
                                modal_back.remove();
                            }, 300);
                            currentOpenModalId = null;
                            removeParams('itemSkuId');
                        }
                    });
        
                    document.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
                        modal.classList.remove('show');
                        modal_back.classList.remove('show');
                        setTimeout(() => {
                            modal.remove();
                            modal_back.remove();
                        }, 300);
                        currentOpenModalId = null;
                        removeParams('itemSkuId');
                    });
                }
    
                output.appendChild(category);
            });
    
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            createPaginationControls(paginationContainer, totalPages, page, renderPage);
    
            scrollToCategoryFromUrl();
        };
    
        const scrollToCategoryFromUrl = () => {
            const targetSkuId = currentOpenModalId;
            const targetListingId = scrollToCache;
            if (!targetSkuId && !targetListingId) return;

            if (targetListingId) {
                const targetIndex = filteredData.findIndex(cat =>
                    cat.store_listing_id === targetListingId ||
                    (cat.products?.some(p => p.store_listing_id === targetListingId))
                );

                if (targetIndex !== -1) {
                    const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
                    if (targetPage !== currentPage) {
                        renderPage(targetPage);
                    } else {
                        setTimeout(() => {
                            const el = document.querySelector(`[data-listing-id="${filteredData[targetIndex].store_listing_id}"]`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            removeParams('scrollTo');
                            scrollToCache = '';
                        }, 500);
                    }
                }
            } else {
                const targetIndex = filteredData.findIndex(cat =>
                    cat.sku_id === targetSkuId ||
                    (cat.products?.some(p => p.sku_id === targetSkuId))
                );

                if (targetIndex !== -1) {
                    const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
                    if (targetPage !== currentPage) {
                        renderPage(targetPage);
                    } else {
                        setTimeout(() => {
                            const el = document.querySelector(`[data-sku-id="${filteredData[targetIndex].sku_id}"]`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 500);
                    }
                }
            }
        };
    
        searchInput.addEventListener('input', () => {
            filteredData = filterCategories(data, searchInput.value);
            renderPage(1);
        });
    
        renderPage(1);
    }

    async function renderShopBrowseData(data, output) {
        document.getElementById("article-content").scrollTo(0,0);
        output.innerHTML = ``;
        data.shop_blocks.forEach((categoryData) => {
            const category = document.createElement("div");
            if (categoryData.type === category_types.HERO) {
                category.classList.add('category-container');
                category.classList.add('category-browse-container');
                category.setAttribute('data-sku-id', categoryData.sku_id);

                const bannerContainer = document.createElement('div');
                bannerContainer.classList.add('banner-container');

                const bannerSummaryAndLogo = document.createElement("div");
                bannerSummaryAndLogo.classList.add('shop-category-text-and-logo-container')

                bannerContainer.appendChild(bannerSummaryAndLogo);

                if (categoryData.summary) {
                    const bannerSummary = document.createElement("div");
                    bannerSummary.classList.add('shop-category-text-holder')
                    bannerSummary.innerHTML = `
                        <p>${categoryData.summary}</p>
                    `;
                    if (categoryData.banner_text_color) {
                        bannerSummary.style.color = categoryData.banner_text_color;
                    }
                    bannerSummaryAndLogo.appendChild(bannerSummary);
                }

                const bannerLogo = document.createElement("div");
                bannerLogo.classList.add('shop-category-logo-holder')
                bannerLogo.innerHTML = `
                    <img class="shop-category-banner-logo" loading="lazy" src="${categoryData.logo_url}">
                `;
                bannerSummaryAndLogo.appendChild(bannerLogo);

                const bannerButton = document.createElement("div");
                bannerButton.id = 'home-page-preview-button-container';
                bannerButton.innerHTML = `
                    <button class="home-page-preview-button" onclick="scrollToCache = '${categoryData.category_store_listing_id}'; addParams({scrollTo: '${categoryData.category_store_listing_id}'}); loadPage('2');">Shop the ${categoryData.name} Collection</button>
                `;
                bannerSummaryAndLogo.appendChild(bannerButton);

                if (categoryData.banner_asset?.animated) {
                    const videoBanner = document.createElement("video");
                    videoBanner.disablePictureInPicture = true;
                    videoBanner.autoplay = true;
                    videoBanner.muted = true;
                    videoBanner.loop = true;
                    videoBanner.playsInline = true;
                    videoBanner.src = categoryData.banner_asset.animated;
                    videoBanner.classList.add('banner-video');
                    bannerContainer.appendChild(videoBanner);
                }

                category.appendChild(bannerContainer);

                if (categoryData.ranked_sku_ids?.length) {
                    const productsWrapper = document.createElement("div");
                    productsWrapper.classList.add("products-wrapper");

                    categoryData.ranked_sku_ids.slice(0, 4).forEach(async productsku => {
                        const thisCategory = data.categories.find(category => category.sku_id === categoryData.category_sku_id);
                        const productData = thisCategory.products.find(product => product.sku_id === productsku);

                        const item = await renderProduct(thisCategory, productData);
                        productsWrapper.appendChild(item);
                    });

                    category.appendChild(productsWrapper);
                }
            } else if (categoryData.type === category_types.FEATURED) {

                category.classList.add('category-container');
                category.classList.add('category-featured-block-container');

                categoryData.subblocks.forEach(block => {
                    let featuredBlock = document.createElement("div");

                    featuredBlock.style.backgroundImage = `url(${block.banner_url})`;

                    featuredBlock.innerHTML = `
                        <button class="take-me-there-home-block-button" onclick="scrollToCache = '${block.category_store_listing_id}'; addParams({scrollTo: '${block.category_store_listing_id}'}); loadPage('2');">Take Me There</button>
                    `;

                    category.appendChild(featuredBlock);
                });
            } else if (categoryData.type === category_types.WIDE_BANNER) {

                category.classList.add('category-container');
                category.classList.add('category-wide-banner-container');

                if (categoryData.banner_text_color) category.style.color = categoryData.banner_text_color;
                if (categoryData.disable_cta) category.classList.add('hide-click-button');

                category.innerHTML = `
                    <img src="${categoryData.banner_url}">
                    <div class="text-container">
                        <h2>${categoryData.title}</h2>
                        <p>${categoryData.body}</p>
                    </div>
                    <button class="take-me-there-wide-banner-button" onclick="scrollToCache = '${categoryData.category_store_listing_id}'; addParams({scrollTo: '${categoryData.category_store_listing_id}'}); loadPage('2');">Take Me There</button>
                `;
            }

            output.appendChild(category);
        });
    }


    function renderShopLoadingError(error, output) {
        output.innerHTML = `
            <div class="shop-loading-error-container">
                <svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" width="140" height="131" viewBox="0 0 140 131" fill="none">
                <g clip-path="url(#clip0_7301_37419)">
                <path d="M33.585 53.8991C38.405 46.9991 46.485 43.5091 53.085 45.0491C59.685 46.5891 69.975 55.1691 63.625 67.4891L33.585 53.8991Z" fill="black"/>
                <path d="M92.0151 76.8108C98.0151 75.4008 105.725 77.6908 109.275 84.3208C114.155 93.4308 107.605 104.861 107.605 104.861L84.9551 99.2108L92.0151 76.8108Z" fill="#73767C"/>
                <path d="M135.955 1.12009C135.775 1.46009 133.425 6.06009 129.835 13.1201L127.085 18.5501L125.505 21.6301C125.055 22.5301 124.585 23.4401 124.105 24.3701L113.535 45.0001L111.895 48.2001C111.102 49.7734 110.302 51.3401 109.495 52.9001L106.715 58.3601L100.265 71.0001L98.455 74.5601L87.205 96.5601L40.665 63.5601L67.605 45.5001L70.745 43.3901L90.615 30.0001L93.615 28.0001L112.685 15.1601L115.595 13.1601C126.645 5.75009 134.545 0.440092 135.085 0.110092C135.222 0.0522836 135.373 0.0393153 135.517 0.0730567C135.662 0.106798 135.792 0.185506 135.888 0.297838C135.985 0.410169 136.044 0.550322 136.056 0.698097C136.068 0.845871 136.032 0.993635 135.955 1.12009Z" fill="#DCDDDE"/>
                <path d="M127.085 18.5505L124.765 20.4005C125.025 20.8005 125.275 21.2105 125.505 21.6305C125.055 22.5305 124.585 23.4405 124.105 24.3705C123.712 23.5496 123.261 22.7576 122.755 22.0005C117.445 26.1805 111.915 30.4105 106.425 34.5205C109.617 37.3796 112.058 40.9782 113.535 45.0005L111.895 48.2005C110.724 43.4508 108.099 39.1856 104.385 36.0005C97.9054 40.8405 91.5254 45.5105 85.6754 49.7205C90.42 53.1687 94.3211 57.6476 97.0854 62.8205C101.085 59.6905 105.325 56.3305 109.525 52.9205L106.745 58.3805C103.845 60.7005 100.975 62.9705 98.2154 65.1305C99.077 67.0338 99.7729 69.0078 100.295 71.0305L98.4854 74.5905C98.0506 71.8793 97.2814 69.2325 96.1954 66.7105C84.2654 76.0005 74.8154 82.9106 74.6554 83.0005C74.4433 83.1552 74.1879 83.2392 73.9254 83.2405C73.7301 83.2418 73.5373 83.1961 73.3633 83.1074C73.1893 83.0186 73.0391 82.8894 72.9254 82.7306C72.7352 82.4659 72.655 82.1377 72.7016 81.8151C72.7483 81.4926 72.9181 81.2006 73.1754 81.0005C73.3354 80.8805 82.9954 73.7705 95.0654 64.3705C92.3517 59.124 88.397 54.62 83.5454 51.2505C69.3754 61.4405 58.8554 68.6505 58.6454 68.8005C58.4383 68.9401 58.1951 69.0165 57.9454 69.0205C57.6757 69.0241 57.4121 68.9404 57.1939 68.7819C56.9757 68.6233 56.8147 68.3984 56.7348 68.1408C56.6549 67.8832 56.6605 67.6067 56.7507 67.3525C56.841 67.0983 57.011 66.8801 57.2354 66.7305C57.4454 66.5905 67.5354 59.6705 81.2354 49.8105C77.0629 47.3923 72.4097 45.9209 67.6054 45.5005L70.7454 43.3905C75.2565 44.1735 79.5749 45.8167 83.4654 48.2305C89.3354 44.0005 95.7754 39.3005 102.345 34.4005C98.8653 31.9752 94.8321 30.4623 90.6154 30.0005L93.6154 28.0005C97.5252 28.8185 101.21 30.4768 104.415 32.8605C110.065 28.6205 115.775 24.2605 121.245 19.9505C120.175 18.6533 118.885 17.5534 117.435 16.7005C115.983 15.8467 114.362 15.3211 112.685 15.1605L115.595 13.1605C116.674 13.4847 117.711 13.9345 118.685 14.5005C120.41 15.512 121.94 16.8225 123.205 18.3705C125.465 16.5905 127.675 14.8105 129.815 13.0605L127.085 18.5505Z" fill="#B9BBBE"/>
                <path d="M116.545 95.2996C125.605 85.5696 130.855 77.0896 134.695 65.5696C135.605 62.8296 140.065 64.2796 139.905 66.3596C139.255 75.4196 126.575 90.9196 118.735 97.1196C117.255 98.2796 115.895 95.9996 116.545 95.2996Z" fill="black"/>
                <path d="M112.738 112.387C118.371 112.275 122.847 107.617 122.734 101.983C122.621 96.3501 117.963 91.8747 112.33 91.9874C106.697 92.1001 102.221 96.7581 102.334 102.391C102.447 108.025 107.105 112.5 112.738 112.387Z" fill="#B9BBBE"/>
                <path d="M112.555 97.1791C111.055 97.5191 108.675 97.4691 108.615 95.9391C108.555 94.4091 110.165 93.1791 111.695 92.9391C113.225 92.6991 114.775 93.2191 115.035 94.6491C115.295 96.0791 114.085 96.8491 112.555 97.1791Z" fill="#F8F9F9"/>
                <path d="M120.985 113.78C119.355 102.51 110.405 97.2198 99.9847 99.9798C99.6208 95.8921 98.328 91.9416 96.2047 88.4298C91.2047 80.7298 81.8247 81.6598 77.1447 83.3598C79.1447 74.6998 78.2447 67.6698 72.2847 62.3598C65.5747 56.3798 55.0847 57.9998 50.8147 60.6398C51.2047 51.0198 43.3147 44.5498 35.6047 45.2398C25.6047 46.1398 18.8147 53.7898 18.7647 66.6098C13.4118 71.6689 8.42587 77.1026 3.84468 82.8698C-1.15532 89.2698 -1.04532 98.1698 3.59468 105.18C4.73468 106.92 7.24468 111.18 7.95468 112.3C8.23468 112.73 8.14468 113.21 7.56468 114.03C6.02172 115.939 4.6812 118.004 3.56468 120.19C1.59468 124.3 3.20468 131 9.42468 131C13.4747 131 74.2047 130.87 93.9447 131H123.135C127.375 131 128.785 128.91 128.785 126.15C128.785 122.41 126.865 120.08 122.915 117C122.391 116.622 121.95 116.142 121.618 115.589C121.286 115.035 121.071 114.419 120.985 113.78Z" fill="#73767C"/>
                <path d="M38.8153 123.551C51.8953 123.931 63.2053 123.851 73.7253 123.551C78.9853 123.431 80.2753 120.991 80.6553 118.041C81.3453 112.791 78.5153 110.661 73.4753 104.801C68.4353 98.9409 54.8953 85.5309 54.8953 85.5309C52.0053 82.5309 48.1053 81.4709 44.4553 84.4109C39.9353 88.0509 35.6453 91.6209 32.7253 96.1009C30.0953 100.101 31.2553 103.521 34.6453 108.431C35.2453 109.291 37.9853 112.431 38.1753 112.991C38.3653 113.551 35.7753 115.131 35.0953 117.561C34.3553 120.221 35.7753 123.461 38.8153 123.551Z" fill="#B9BBBE"/>
                <path d="M48.7048 102.9C47.5348 101.38 45.5748 99.2203 45.5748 99.2203C45.274 98.8642 44.9058 98.5711 44.4914 98.3577C44.077 98.1442 43.6245 98.0148 43.1599 97.9767C42.6954 97.9386 42.2279 97.9926 41.7842 98.1357C41.3406 98.2787 40.9296 98.508 40.5748 98.8103C39.9668 99.4294 39.5965 100.243 39.5288 101.108C39.4612 101.973 39.7005 102.834 40.2048 103.54C41.1448 104.76 42.2048 106.14 43.4548 107.46C44.1005 108.121 44.9664 108.522 45.8882 108.587C46.8099 108.651 47.7233 108.375 48.4548 107.81C49.109 107.175 49.4984 106.315 49.5448 105.404C49.5911 104.494 49.291 103.599 48.7048 102.9Z" fill="#73767C"/>
                <path d="M32.3315 82.3655C34.3322 80.4622 34.4112 77.2974 32.5079 75.2967C30.6047 73.2959 27.4398 73.2169 25.4391 75.1202C23.4383 77.0235 23.3593 80.1883 25.2626 82.1891C27.1659 84.1898 30.3307 84.2688 32.3315 82.3655Z" fill="black"/>
                <path d="M63.1852 115.8C62.2752 114.8 60.4453 114.35 59.4853 113.49C57.6053 111.8 54.7653 108.49 52.4853 110.49C51.0553 111.72 50.9653 113.41 52.1653 115.06C53.1762 116.681 54.5444 118.049 56.1653 119.06C57.9088 119.799 59.8246 120.035 61.6953 119.74C62.1393 119.713 62.5659 119.557 62.9239 119.293C63.282 119.029 63.5561 118.668 63.7135 118.251C63.8708 117.835 63.9047 117.383 63.811 116.948C63.7173 116.513 63.5 116.114 63.1852 115.8Z" fill="#73767C"/>
                <path d="M99.6054 120.931C99.6611 120.894 99.7145 120.854 99.7654 120.811C100.356 120.235 100.795 119.522 101.044 118.735C101.292 117.949 101.342 117.113 101.188 116.302C101.035 115.491 100.684 114.731 100.166 114.089C99.6473 113.448 98.9783 112.944 98.2181 112.623C97.4579 112.303 96.6303 112.175 95.8089 112.252C94.9875 112.329 94.1979 112.608 93.5105 113.064C92.8232 113.521 92.2593 114.14 91.8694 114.867C91.4794 115.594 91.2753 116.406 91.2754 117.231C92.8776 116.837 94.5654 116.986 96.0733 117.656C97.5813 118.326 98.8237 119.478 99.6054 120.931Z" fill="black"/>
                <path d="M94.2848 82.7695C93.8848 83.5395 93.4948 84.2995 93.1348 85.0195C95.321 86.74 97.0915 88.9309 98.3148 91.4295C98.4172 91.6365 98.5754 91.8107 98.7715 91.9326C98.9676 92.0546 99.1938 92.1193 99.4248 92.1195C99.6229 92.1169 99.8179 92.069 99.9948 91.9795C100.29 91.8297 100.515 91.5685 100.618 91.2534C100.721 90.9384 100.695 90.5953 100.545 90.2995C99.0997 87.319 96.9513 84.7347 94.2848 82.7695Z" fill="black"/>
                </g>
                <defs>
                <clipPath id="clip0_7301_37419">
                <rect width="139.83" height="130.95" fill="white" transform="translate(0.0849609)"/>
                </clipPath>
                </defs>
                </svg>
                <h2>Well, this is awkward.</h2>
                <p>Hmmm, we weren't able to load the shop. Check back later.</p>
                <p>Status: ${error}</p>
            </div>
        `;
    }
    




    async function openClaimableClaimXPModal(claimableId) {
        let modal = document.createElement("div");

        modal.classList.add('modalv2');


        let modal_back = document.createElement("div");

        modal_back.classList.add('modalv2-back');
        modal_back.id = 'modalv2-back';

        document.body.appendChild(modal_back);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal_back.classList.add('show');
            });
        });

        modal_back.style.zIndex = '400';


        let data;

        if (localStorage.token) {
            const dataClaimable = await fetch(redneredAPI + endpoints.CLAIMABLES_PUBLISHED + claimableId, {
                method: 'GET',
                headers: {
                    "Authorization": localStorage.token
                }
            });

            if (!dataClaimable.ok) {
                return
            }

            const data1 = await dataClaimable.json();

            data = data1;
        } else {
            const dataClaimable = await fetch(redneredAPI + endpoints.CLAIMABLES_PUBLISHED + claimableId, {
                method: 'GET'
            });

            if (!dataClaimable.ok) {
                return
            }

            const data1 = await dataClaimable.json();

            data = data1;
        }

        modal.innerHTML = `
            <div class="modalv2-inner xp-modal">
                
                <div class="xp-modal-inner" id="modalv2-inner-content">
                    <div class="xp-modal-banner">
                        <div class="xp-modal-flower"></div>
                        <div class="xp-modal-star var1"></div>
                        <div class="xp-modal-star var2"></div>
                        <div class="xp-modal-star var3"></div>
                        <div class="xp-modal-star var4"></div>
                        <div class="xp-modal-star var5"></div>
                        <p>${data.xp_reward.toLocaleString()} XP</p>
                    </div>
                    <h2>Congratulations!</h2>
                    <p>You have ${data.xp_reward.toLocaleString()} XP waiting for you.</p>
                    <p class="redeem-xp-error-output"></p>
                    <button class="claim-xp-button" id="claim-xp-button">
                        Claim ${data.xp_reward.toLocaleString()} XP
                        <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                        </svg>
                    </button>
                </div>

                <div data-modal-top-product-buttons>
                    <div class="has-tooltip" data-tooltip="Close" data-close-product-card-button>
                        <svg class="modalv2_top_icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path></svg>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('#claim-xp-button').addEventListener('click', async () => {
            modal.querySelector('.redeem-xp-error-output').textContent = '';
            modal.querySelector('#claim-xp-button').disabled = true;
            const response = await fetch(redneredAPI + endpoints.CLAIMABLES_REDEEM + data.id, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": localStorage.token
                }
            });
            if (!response.ok) {
                const data = await response.json();
                modal.querySelector('.redeem-xp-error-output').textContent = data.message;
                console.error(response)
                modal.querySelector('#claim-xp-button').disabled = false;
                return
            }
            await fetchAndUpdateXpEvents();
            await fetchAndUpdateXpInventory();
            await fetchAndUpdateUserInfo();
            animateXPNumber('my-xp-balance', usersXPBalance + data.xp_reward);
            try {
                animateXPNumber('my-xp-balance-modalv3', usersXPBalance + data.xp_reward);
            } catch {
            }
            try {
                changeModalTab('5');
            } catch {
            }
            try {
                refreshXPEventsList();
            } catch {
            }
            modal.classList.remove('show');
            modal_back.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                modal_back.remove();
            }, 300);
        });

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
        });
        

        modal.style.zIndex = '401';

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
                modal_back.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    modal_back.remove();
                }, 300);
            }
        });

        modal.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
            modal.classList.remove('show');
            modal_back.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                modal_back.remove();
            }, 300);
        });
    }

    window.openClaimableClaimXPModal = openClaimableClaimXPModal;



    async function openClaimablePurchaseModal(claimableId) {
        let modal = document.createElement("div");

        modal.classList.add('modalv2');


        let modal_back = document.createElement("div");

        modal_back.classList.add('modalv2-back');
        modal_back.id = 'modalv2-back';

        document.body.appendChild(modal_back);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal_back.classList.add('show');
            });
        });

        modal_back.style.zIndex = '400';


        let data;

        if (localStorage.token) {
            const dataClaimable = await fetch(redneredAPI + endpoints.CLAIMABLES_PUBLISHED + claimableId, {
                method: 'GET',
                headers: {
                    "Authorization": localStorage.token
                }
            });

            if (!dataClaimable.ok) {
                return
            }

            const data1 = await dataClaimable.json();

            data = data1;
        } else {
            const dataClaimable = await fetch(redneredAPI + endpoints.CLAIMABLES_PUBLISHED + claimableId, {
                method: 'GET'
            });

            if (!dataClaimable.ok) {
                return
            }

            const data1 = await dataClaimable.json();

            data = data1;
        }

        modal.innerHTML = `
            <div class="modalv2-inner xp-purchase-modal">
                
                <div class="xp-purchase-modal-inner" id="modalv2-inner-content">
                    <div class="xp-modal-banner">
                        <div class="xp-modal-flower"></div>
                        <div class="xp-modal-star var1"></div>
                        <div class="xp-modal-star var2"></div>
                        <div class="xp-modal-star var3"></div>
                        <div class="xp-modal-star var4"></div>
                        <div class="xp-modal-star var5"></div>
                    </div>
                    <div class="xp-purchase-modal-inner-content">
                        <h3>Claim Perk</h3>
                        <div class="xp-purchase-modal-details-container">
                            <p>${data.name}</p>
                        </div>
                        <div class="disclaimer">
                            <p>By clicking 'Claim for ${data.xp_price.toLocaleString()} XP', you agree to the</p><a class="link" href="https://yapper.shop/legal-information/?page=tos">Digital Currency Terms.</a>
                        </div>
                        <div class="disclaimer">
                            <p>Claiming this item means you have a limited licence to use this item on Shop Archives. This item is non-refundable.</p>
                        </div>
                        <p class="redeem-xp-error-output"></p>
                        <button class="claim-xp-perk-button" id="claim-xp-button">
                            Claim for ${data.xp_price.toLocaleString()} XP
                            <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div data-modal-top-product-buttons>
                    <div class="has-tooltip" data-tooltip="Close" data-close-product-card-button>
                        <svg class="modalv2_top_icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path></svg>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('#claim-xp-button').addEventListener('click', async () => {
            modal.querySelector('.redeem-xp-error-output').textContent = '';
            modal.querySelector('#claim-xp-button').disabled = true;
            const response = await fetch(redneredAPI + endpoints.CLAIMABLES_PURCHASE + data.id, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": localStorage.token
                }
            });
            if (!response.ok) {
                const data = await response.json();
                modal.querySelector('.redeem-xp-error-output').textContent = data.message;
                console.error(response)
                modal.querySelector('#claim-xp-button').disabled = false;
                return
            }
            await fetchAndUpdateXpEvents();
            await fetchAndUpdateXpInventory();
            await fetchAndUpdateUserInfo();
            await loadXpShopData();
            animateXPNumber('my-xp-balance', usersXPBalance - data.xp_price);
            try {
                animateXPNumber('my-xp-balance-modalv3', usersXPBalance - data.xp_price);
            } catch {
            }
            try {
                changeModalTab('5');
            } catch {
            }
            try {
                refreshXPEventsList();
            } catch {
            }
            modal.classList.remove('show');
            modal_back.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                modal_back.remove();
            }, 300);
        });

        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
        });

        modal.style.zIndex = '401';

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
                modal_back.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    modal_back.remove();
                }, 300);
            }
        });

        modal.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
            modal.classList.remove('show');
            modal_back.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                modal_back.remove();
            }, 300);
        });
    }

    window.openClaimablePurchaseModal = openClaimablePurchaseModal;
    
    
    
    

    async function setDiscordProfileEffectsCache() {
        const rawData = await fetch(redneredAPI + endpoints.DISCORD_PROFILE_EFFECTS);

        if (!rawData.ok) {

        } else {
            const data = await rawData.json();

            discordProfileEffectsCache = data;
        }
    }
    window.setDiscordProfileEffectsCache = setDiscordProfileEffectsCache;

    async function setDiscordLeakedCategoriesCache() {
        if (settingsStore.staff_force_leaks_dummy === 1) {
            discordLeakedCategoriesCache = leaks_dummy_data;

            const leaksTab = document.getElementById('shop-tab-1');
            leaksTab.classList.remove('hidden');
            leaksTab.setAttribute('data-tooltip', 'Dummy Data');

        } else {
            const rawData = await fetch(redneredAPI + endpoints.DISCORD_LEAKED_CATEGORIES);

            if (!rawData.ok) {

            } else {
                const data = await rawData.json();

                if (data.categories.length != 0 && data.version) {
                    const leaksTab = document.getElementById('shop-tab-1');
                    leaksTab.classList.remove('hidden');
                    let tooltipValue;
                    if (data.categories.length === 1) {
                        tooltipValue = 'New '+data.categories[0].name+' Leaks!';
                    } else if (data.categories.length === 2) {
                        tooltipValue = 'New '+data.categories[0].name+' & '+data.categories[1].name+' Leaks!';
                    } else if (data.categories.length >= 3) {
                        tooltipValue = data.categories.length+' New Leaked Categories!';
                    }
                    leaksTab.setAttribute('data-tooltip', tooltipValue);

                    if (localStorage.latest_discord_leaked_categories_version === data.version.toString()) {
                        leaksTab.classList.add('hide-new-tag');
                    }
                }

                discordLeakedCategoriesCache = data;
            }
        }
    }
    window.setDiscordLeakedCategoriesCache = setDiscordLeakedCategoriesCache;

    async function loadPage(key, firstLoad) {
        document.getElementById('searchInput').value = '';
        document.querySelectorAll('.selected').forEach((el) => {
            el.classList.remove("selected");
        });
        const container = document.getElementById("article-content");
        if (firstLoad && typeof key === "string") {
            pages.forEach(page => {
                if (page.url === key) {
                    const currentPage = pages.findIndex(page => page.url === key);
                    currentPageCache = pages[currentPage].url;
                    document.getElementById('shop-tab-' + currentPage).classList.add("selected");
                    document.getElementById("page-title-topbar").textContent = pages[currentPage].title;
                    container.innerHTML = `${pages[currentPage].body}`;
                    container.scrollTo(0,0);
                    document.title = `${pages[currentPage].title} | Shop Archives`;
                }
            });
        } else {
            const curerntPage = pages[key];
            setParams({page: pages[key].url});
            currentPageCache = pages[key].url;
            document.getElementById('shop-tab-' + key).classList.add("selected");
            document.getElementById("page-title-topbar").textContent = curerntPage.title;
            container.innerHTML = `${curerntPage.body}`;
            container.scrollTo(0,0);
            document.title = `${curerntPage.title} | Shop Archives`;
        }
        console.log('Current page is: ' + currentPageCache);

        if (!discordProfileEffectsCache) {
            await setDiscordProfileEffectsCache();
        }
        if (!discordLeakedCategoriesCache) {
            await setDiscordLeakedCategoriesCache();
        }

        const searchInput = document.getElementById('searchInput');

        if (currentPageCache === "home") {
            searchInput.classList.add('hidden');   
            const output = document.getElementById('categories-container');
            if (!discordCollectiblesShopHomeCache) {
                const rawData = await fetch(redneredAPI + endpoints.DISCORD_COLLECTIBLES_HOME);

                if (!rawData.ok) {
                    renderShopLoadingError(rawData.status, output);
                } else {
                    const data = await rawData.json();

                    discordCollectiblesShopHomeCache = data;

                    renderShopBrowseData(data, output);
                }
            } else {
                renderShopBrowseData(discordCollectiblesShopHomeCache, output);
            }
        } else if (currentPageCache === "leaks") {
            searchInput.classList.remove('hidden');    
            const leaksTab = document.getElementById('shop-tab-1');
            localStorage.latest_discord_leaked_categories_version = discordLeakedCategoriesCache.version;
            leaksTab.classList.add('hide-new-tag');

            const output = document.getElementById('categories-container');

            renderShopData(discordLeakedCategoriesCache.categories, output);
        } else if (currentPageCache === "catalog") {
            searchInput.classList.remove('hidden');   
            const output = document.getElementById('categories-container');
            if (!discordCollectiblesCategoriesCache) {
                const rawData = await fetch(redneredAPI + endpoints.DISCORD_COLLECTIBLES_CATEGORIES);

                if (!rawData.ok) {
                    renderShopLoadingError(rawData.status, output);
                } else {
                    const data = await rawData.json();

                    discordCollectiblesCategoriesCache = data;

                    renderShopData(data, output);
                }
            } else {
                renderShopData(discordCollectiblesCategoriesCache, output);
            }
        } else if (currentPageCache === "orbs") {
            searchInput.classList.remove('hidden');   
            const output = document.getElementById('categories-container');
            if (!discordOrbsCategoriesCache) {
                const rawData = await fetch(redneredAPI + endpoints.DISCORD_ORBS_CATEGORIES);

                if (!rawData.ok) {
                    renderShopLoadingError(rawData.status, output);
                } else {
                    const data = await rawData.json();

                    discordOrbsCategoriesCache = data;

                    renderShopData(data, output);
                }
            } else {
                renderShopData(discordOrbsCategoriesCache, output);
            }
        } else if (currentPageCache === "miscellaneous") {
            searchInput.classList.remove('hidden');
            const output = document.getElementById('categories-container');
            if (!discordMiscellaneousCategoriesCache) {
                url = redneredAPI + endpoints.DISCORD_MISCELLANEOUS_CATEGORIES;
                apiUrl = new URL(url);
                if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'published_items_category')?.treatment === 1) {
                    apiUrl.searchParams.append("include-published-items-category", "true");
                }
                const rawData = await fetch(apiUrl);

                if (!rawData.ok) {
                    renderShopLoadingError(rawData.status, output);
                } else {
                    const data = await rawData.json();

                    discordMiscellaneousCategoriesCache = data;

                    renderShopData(data, output);
                }
            } else {
                renderShopData(discordMiscellaneousCategoriesCache, output);
            }
        } else {
            loadPage('0')
        }
    }
    window.loadPage = loadPage;

    if (params.get("page")) {
        await loadPage(params.get("page"), true);
    } else {
        await loadPage('0');
    }

    if (appType === "Dev") {
        document.getElementById('logo-link').textContent = 'dev.yapper.shop'
    } else if (appType === "Pre-Release") {
        document.getElementById('logo-link').textContent = 'beta.yapper.shop'
    } else {
        document.getElementById('logo-link').textContent = 'yapper.shop'
    }

    // createNotice('You are currently using an experimental version of Shop Archives. By using this version you have a very high chance to encounter bugs or glitches. Expect things to change before the full release.', 2);



    function openNewDiscordLikeSettings() {
        let modal = document.createElement("div");

        modal.classList.add('modalv3');

        modal.innerHTML = `
            <div class="modalv3-inner" style="color: var(--white);">
                <div class="modalv3-inner-left">
                    <div class="modalv3-side-tabs-container-backer">
                    
                    </div>
                    <div class="modalv3-side-tabs-container" id="modalv3-side-tabs-container">
                    
                    </div>
                </div>
                <div class="modalv3-inner-right" id="modalv3-inner-right">
                    <div class="modalv3-right-content-container" id="modalv3-right-content-container">
                        <div class="modalv3-right-content-container-inner" id="modalv3-right-content-container-inner">
                        
                        </div>
                        <div class="container_c2b141" data-discord-like-settings-close-button>
                            <div class="closeButton_c2b141" aria-label="Close" role="button" tabindex="0">
                                <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path>
                                </svg>
                            </div>
                            <div class="keybind_c2b141" aria-hidden="true">ESC</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById("modalv3-side-tabs-container").innerHTML = `
            <div class="side-tabs-category-text-container">
                <p>USER SETTINGS</p>
            </div>

            <div class="side-tabs-button" id="modal-v3-tab-account" onclick="setModalv3InnerContent('account')">
                <p>Account</p>
            </div>

            <hr>
            <div class="side-tabs-category-text-container">
                <p>APP SETTINGS</p>
            </div>

            <div class="side-tabs-button" id="modal-v3-tab-appearance" onclick="setModalv3InnerContent('appearance')">
                <p>Appearance</p>
            </div>

            <div id="xp-rewards-tabs-modalv3-container"></div>

            <div id="staff-options-modalv3-container"></div>
        
            <hr>
            
            <div class="modalv3-side-tabs-app-info-container">
                <div>
                    <p>Website made by: </p><a class="link" href="https://github.com/DTACat/">DTACat</a>
                </div>
                <p>${appType} ${appVersion}</p>
                <a class="link" href="https://yapper.shop/legal-information/?page=tos">Terms of Service</a>
                <a class="link" href="https://yapper.shop/legal-information/?page=privacy">Privacy Policy</a>
            </div>
        `;

        if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'xp_system')?.treatment === 1) {
            document.getElementById("xp-rewards-tabs-modalv3-container").innerHTML = `
                <hr>
                <div class="side-tabs-category-text-container">
                    <p>XP PERKS</p>
                </div>

                <div class="side-tabs-button" id="modal-v3-tab-xp_events" onclick="setModalv3InnerContent('xp_events')">
                    <p>Events</p>
                </div>
                <div class="side-tabs-button" id="modal-v3-tab-xp_shop" onclick="setModalv3InnerContent('xp_shop')">
                    <p>Shop</p>
                </div>
            `;
        }

        if (settingsStore.dev === 1) {
            document.getElementById("staff-options-modalv3-container").innerHTML = `
                <hr>
                <div class="side-tabs-category-text-container">
                    <p>DEVELOPER ONLY</p>
                </div>

                <div class="side-tabs-button" id="modal-v3-tab-experiments" onclick="setModalv3InnerContent('experiments')">
                    <p>Experiments</p>
                </div>
            `;
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
        });

        setModalv3InnerContent('account');


        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        });

        document.querySelector("[data-discord-like-settings-close-button]").addEventListener('click', (event) => {
            closeModalV3()
        });

        function closeModalV3() {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }

        window.closeModalV3 = closeModalV3;
    }

    window.openNewDiscordLikeSettings = openNewDiscordLikeSettings;

    async function setModalv3InnerContent(tab) {
        if (!document.getElementById("modalv3-right-content-container-inner")) {
            openNewDiscordLikeSettings();
        }
        const tabPageOutput = document.getElementById("modalv3-right-content-container-inner");

        if (document.querySelector(".modalv3-tab-selected")) {
            document.querySelectorAll('.modalv3-tab-selected').forEach((el) => {
                el.classList.remove("modalv3-tab-selected");
            });
        }

        document.getElementById("modalv3-right-content-container").scrollTo(0,0);
        document.getElementById("modal-v3-tab-" + tab).classList.add("modalv3-tab-selected");

        if (tab === "account") {
            tabPageOutput.innerHTML = `
                <h2>Account</h2>
                <hr>
                <div class="modalv3-content-card-1" id="discord-account-container">
                    <h2 class="modalv3-content-card-header">Discord Account</h2>
                    <p class="modalv3-content-card-summary">The Discord account linked to Shop Archives.</p>

                    <div id="modalv3-account-account-details-container">
                        <div class="modalv3-account-account-details">
                            <div class="modalv3-account-banner-color" style="background-color: var(--background-secondary);"></div>
                            <div class="modalv3-account-banner-image"></div>
                            <div class="modalv3-account-banner-filler"></div>

                            <div class="modalv3-account-avatar-preview-bg"></div>
                            <img class="modalv3-account-avatar-preview" style="background-color: var(--background-secondary);">
                            <p class="modalv3-account-displayname">Loading...</p>

                            <div class="modalv3-account-account-details-inners-padding">
                                <div class="modalv3-account-account-details-inner">
                                    <div class="modalv3-account-account-details-card">
                                        <p class="modalv3-account-displayname-header">Display Name</p>
                                        <p class="modalv3-account-displayname-text">Loading...</p>
                                    </div>
                                    <div class="modalv3-account-account-details-card">
                                        <p class="modalv3-account-username-header">Username</p>
                                        <p class="modalv3-account-username-text">Loading...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (currentUserData) {
                if (currentUserData.banner) {
                    tabPageOutput.querySelector(".modalv3-account-banner-image").style.backgroundImage = `url(https://cdn.discordapp.com/banners/${currentUserData.id}/${currentUserData.banner}.png?size=480)`;
                }

                if (currentUserData.avatar) {
                    tabPageOutput.querySelector(".modalv3-account-avatar-preview").src = `https://cdn.discordapp.com/avatars/${currentUserData.id}/${currentUserData.avatar}.webp?size=128`;
                }

                if (currentUserData.banner_color) {
                    tabPageOutput.querySelector(".modalv3-account-banner-color").style.backgroundColor = currentUserData.banner_color;
                }
        
                if (currentUserData.global_name === null) {
                    tabPageOutput.querySelector(".modalv3-account-displayname").textContent = currentUserData.username;
                    tabPageOutput.querySelector(".modalv3-account-displayname-text").textContent = currentUserData.username;
                } else {
                    tabPageOutput.querySelector(".modalv3-account-displayname").textContent = currentUserData.global_name;
                    tabPageOutput.querySelector(".modalv3-account-displayname-text").textContent = currentUserData.global_name;
                }

                tabPageOutput.querySelector(".modalv3-account-username-text").textContent = currentUserData.username;
            } else {
                tabPageOutput.querySelector('#discord-account-container').innerHTML = `
                    <h2 class="modalv3-content-card-header">You are curently not logged in.</h2>
                    <p class="modalv3-content-card-summary">Login with Discord to view your account details.</p>

                    <button class="log-in-with-discord-button" onclick="loginWithDiscord();">
                        <svg width="59" height="59" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M48.7541 12.511C45.2046 10.8416 41.4614 9.66246 37.6149 9C37.0857 9.96719 36.6081 10.9609 36.1822 11.9811C32.0905 11.3451 27.9213 11.3451 23.8167 11.9811C23.3908 10.9609 22.9132 9.96719 22.384 9C18.5376 9.67571 14.7815 10.8549 11.2319 12.5243C4.18435 23.2297 2.27404 33.67 3.2292 43.9647C7.35961 47.0915 11.9805 49.4763 16.8854 51C17.9954 49.4763 18.9764 47.8467 19.8154 46.1508C18.2149 45.5413 16.6789 44.7861 15.2074 43.8984C15.5946 43.6069 15.969 43.3155 16.3433 43.024C24.9913 47.1975 35.0076 47.1975 43.6557 43.024C44.03 43.3287 44.4043 43.6334 44.7915 43.8984C43.3201 44.7861 41.7712 45.5413 40.1706 46.164C41.0096 47.8599 41.9906 49.4763 43.1006 51C48.0184 49.4763 52.6393 47.1047 56.7697 43.9647C57.8927 32.0271 54.8594 21.6927 48.7412 12.511H48.7541ZM21.0416 37.6315C18.3827 37.6315 16.1755 35.1539 16.1755 32.1066C16.1755 29.0593 18.2923 26.5552 21.0287 26.5552C23.7651 26.5552 25.9465 29.0593 25.8949 32.1066C25.8432 35.1539 23.7522 37.6315 21.0416 37.6315ZM38.9831 37.6315C36.3113 37.6315 34.1299 35.1539 34.1299 32.1066C34.1299 29.0593 36.2467 26.5552 38.9831 26.5552C41.7195 26.5552 43.888 29.0593 43.8364 32.1066C43.7847 35.1539 41.6937 37.6315 38.9831 37.6315Z" fill="white"/>
                        </svg>
                        Login with Discord
                    </button>
                `;
            }

        } else if (tab === "profile") {
            tabPageOutput.innerHTML = `
                <h2>${getTextString("MODAL_V3_TAB_PROFILE_HEADER")}</h2>
                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_HEADER")}</h2>
                    <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_SUMMARY")}</p>
                    <div class="modalv3-profile-editor-container">
                        <div class="modalv3-profile-editor-content-container" id="modalv3-profile-editor-content-container"></div>
                        <div class="modalv3-profile-editor-preview-container" id="modalv3-profile-editor-preview-container"></div>
                    </div>
                </div>
            `;

            document.getElementById("modalv3-profile-editor-preview-container").innerHTML = `
                <p>Preview:</p>
                <div class="modal-preview-profile2">
                    <div class="options-preview-profile-banner-color" id="options-preview-profile-banner-color" style="background-color: ${localStorage.discord_banner_color};"></div>
                    <div id="profileBannerPreview" class="options-preview-profile-banner" style="background-image: url(${localStorage.discord_banner});"></div>
                    <div class="profile-avatar-preview-bg"></div>
                    <img id="profileAvatarPreview" class="profile-avatar-preview" src="${localStorage.discord_avatar}" alt="No image uploaded">
                    <div class="options-preview-profile-status-bg"></div>
                    <div class="options-preview-profile-status-color"></div>
                    <p class="options-preview-profile-displayname" id="options-preview-profile-displayname">${localStorage.discord_displayname}</p>
                    <p class="options-preview-profile-username" id="options-username-preview"></p>
                </div>
            `;

            document.getElementById("modalv3-profile-editor-content-container").innerHTML = `
                <div id="modalv3-profile-tab-sign-in-notice">
                    
                </div>
                <div class="modalv3-profile-editor-content-card">
                    <p class="modalv3-profile-editor-option-header">${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_CHANGE_DISPLAY_NAME_HEADER")}</p>
                    <input type="text" class="modalv3-profile-editor-text-input" value="${localStorage.discord_displayname}" placeholder="${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_CHANGE_DISPLAY_NAME_PLACEHOLDER")}" autocomplete="off" oninput="changeUsernameFromInput();" id="profile-username-text-input">
                </div>
                <hr>
                <div class="modalv3-profile-editor-content-card">
                    <p class="modalv3-profile-editor-option-header-with-button">${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_CHANGE_AVATAR_HEADER")}</p>
                    <label for="profileAvatarInput" class="modalv3-profile-editor-image-upload">${getTextString("OPTIONS_EXTRA_PROFILE_CHANGE_AVATAR")}</label>
                    <input type="file" id="profileAvatarInput" class="profile-avatar-file-input" accept="image/*">
                    <button id="removeProfileAvatarButton" class="modalv3-profile-editor-image-remove">${getTextString("OPTIONS_EXTRA_PROFILE_REMOVE_AVATAR")}</button>
                    <div id="options-avatar-img-input-option-error"></div>
                </div>
                <hr>
                <div class="modalv3-profile-editor-content-card">
                    <p class="modalv3-profile-editor-option-header-with-button">${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_CHANGE_BANNER_HEADER")}</p>
                    <label for="profileBannerInput" class="modalv3-profile-editor-image-upload">${getTextString("OPTIONS_EXTRA_PROFILE_CHANGE_BANNER")}</label>
                    <input type="file" id="profileBannerInput" class="profile-avatar-file-input" accept="image/*">
                    <button id="removeProfileBannerButton" class="modalv3-profile-editor-image-remove">${getTextString("OPTIONS_EXTRA_PROFILE_REMOVE_BANNER")}</button>
                    <div id="options-banner-img-input-option-error"></div>
                </div>
                <hr>
                <div class="modalv3-profile-editor-content-card">
                    <p class="modalv3-profile-editor-option-header">${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_CHANGE_BANNER_COLOR_HEADER")}</p>
                    <input type="color" autocomplete="off" class="modalv3-profile-editor-color-input" oninput="changeBannerColorFromInput();" id="profile-banner-color-input" value="${localStorage.discord_banner_color}">
                </div>
            `;

            if (discord_token) {
                document.getElementById("modalv3-profile-tab-sign-in-notice").innerHTML = `
                    <div class="modalv3-profile-tab-sign-in-notice">
                        <p class="modalv3-profile-tab-sign-in-notice-title">${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_LOGGED_IN_TITLE")}</p>
                        <p class="modalv3-profile-tab-sign-in-notice-summary">${getTextString("MODAL_V3_TAB_PROFILE_DISCORD_PROFILE_LOGGED_IN_SUMMARY")}</p>
                    </div>
                `;
            }

            document.getElementById("options-username-preview").textContent = localStorage.discord_username.toLowerCase();

            const avatarImageInput = document.getElementById("profileAvatarInput");
            const avatarImagePreview = document.getElementById("profileAvatarPreview");
            const removeAvatarImageButton = document.getElementById("removeProfileAvatarButton");

            // Load saved image from localStorage on page load
            document.addEventListener("DOMContentLoaded", () => {
                const savedImage = localStorage.getItem("discord_avatar");
                if (savedImage) {
                    avatarImagePreview.src = savedImage;
                }
            });

            // Handle image upload
            avatarImageInput.addEventListener("change", function () {
                document.getElementById("options-avatar-img-input-option-error").innerHTML = ``;
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        const dataUrl = event.target.result;
                        try {
                            localStorage.setItem("discord_avatar", dataUrl);
                            avatarImagePreview.src = dataUrl;
                        } catch(error) {
                            document.getElementById("options-avatar-img-input-option-error").innerHTML = `
                                <div class="modalv3-profile-tab-file-too-large-warning">
                                    <p class="modalv3-profile-tab-file-too-large-warning-title">${getTextString("OPTIONS_EXTRA_PROFILE_FILE_TOO_BIG")}</p>
                                    <p class="modalv3-profile-tab-file-too-large-warning-summary">${getTextString("OPTIONS_EXTRA_PROFILE_FILE_TOO_BIG_SUMMARY")}</p>
                                </div>
                            `;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });

            // Handle image removal
            removeAvatarImageButton.addEventListener("click", function () {
                setRandomDiscordAvatar()
                avatarImagePreview.src = localStorage.discord_avatar;
                document.getElementById("options-avatar-img-input-option-error").innerHTML = ``;
            });


            const bannerImageInput = document.getElementById("profileBannerInput");
            const bannerImagePreview = document.getElementById("profileBannerPreview");
            const removeBannerImageButton = document.getElementById("removeProfileBannerButton");


            if (localStorage.discord_banner === ``) {
                removeBannerImageButton.style.display = 'none';
            }

            // Load saved image from localStorage on page load
            document.addEventListener("DOMContentLoaded", () => {
                const savedImage = localStorage.getItem("discord_banner");
                if (savedImage) {
                    bannerImagePreview.style.backgroundImage = `url(${savedImage})`;
                }
            });

            // Handle image upload
            bannerImageInput.addEventListener("change", function () {
                document.getElementById("options-banner-img-input-option-error").innerHTML = ``;
                removeBannerImageButton.style.display = 'unset';
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        const dataUrl = event.target.result;
                        try {
                            localStorage.setItem("discord_banner", dataUrl);
                            bannerImagePreview.style.backgroundImage = `url(${dataUrl})`;
                        } catch(error) {
                            document.getElementById("options-banner-img-input-option-error").innerHTML = `
                                <div class="modalv3-profile-tab-file-too-large-warning">
                                    <p class="modalv3-profile-tab-file-too-large-warning-title">${getTextString("OPTIONS_EXTRA_PROFILE_FILE_TOO_BIG")}</p>
                                    <p class="modalv3-profile-tab-file-too-large-warning-summary">${getTextString("OPTIONS_EXTRA_PROFILE_FILE_TOO_BIG_SUMMARY")}</p>
                                </div>
                            `;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Handle image removal
            removeBannerImageButton.addEventListener("click", function () {
                removeBannerImageButton.style.display = 'none';
                localStorage.discord_banner = ``
                bannerImagePreview.style.backgroundImage = '';
                document.getElementById("options-banner-img-input-option-error").innerHTML = ``;
            });

        } else if (tab === "reviews") {
            if (localStorage.experiment_2025_05_m === "Treatment 1: Enabled") {
                tabPageOutput.innerHTML = `
                    <h2>${getTextString("MODAL_V3_TAB_REVIEWS_HEADER")}</h2>
                    <div class="modalv3-content-card-1">
                        <h2 class="modalv3-content-card-sub-header">${getTextString("MODAL_V3_TAB_REVIEWS_UNAVAILABLE_HEADER")}</h2>
                        <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_UNAVAILABLE_SUMMARY")}</p>
                    </div>
                `;
            } else if (localStorage.discord_token && shop_archives_token) {
                tabPageOutput.innerHTML = `
                    <h2>${getTextString("MODAL_V3_TAB_REVIEWS_HEADER")}</h2>
                    <div class="modalv3-content-card-1">
                        <h2 class="modalv3-content-card-header">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_HEADER")}</h2>
                        <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SUMMARY")}</p>

                        <div class="modalv3-content-ratio-card green" id="modalv3-ratio-card-reviews-filter-3" onclick="updateReviewsFilterStore('3');">
                            <div class="modalv3-content-ratio-card-inner">
                                <h2 class="modalv3-content-card-sub-header">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_3")}</h2>
                                <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_3_SUMMARY")}</p>
                            </div>
                        </div>
                        <div class="modalv3-content-ratio-card orange" id="modalv3-ratio-card-reviews-filter-2" onclick="updateReviewsFilterStore('2');">
                            <div class="modalv3-content-ratio-card-inner">
                                <h2 class="modalv3-content-card-sub-header">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_2")}</h2>
                                <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_2_SUMMARY")}</p>
                            </div>
                        </div>
                        <div class="modalv3-content-ratio-card red" id="modalv3-ratio-card-reviews-filter-1"  onclick="updateReviewsFilterStore('1');">
                            <div class="modalv3-content-ratio-card-inner">
                                <h2 class="modalv3-content-card-sub-header">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_1")}</h2>
                                <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_1_SUMMARY")}</p>
                            </div>
                        </div>
                    </div>
                `;

                updateReviewsFilterStore();
            } else {
                tabPageOutput.innerHTML = `
                    <h2>${getTextString("MODAL_V3_TAB_REVIEWS_HEADER")}</h2>
                    <div class="modalv3-content-card-1">
                        <h2 class="modalv3-content-card-header">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_HEADER")}</h2>
                        <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_DISCORD_ACCOUNT_NOT_LOGGED_IN_SUMMARY")}</p>

                        <div class="modalv3-content-ratio-card green">
                            <div class="modalv3-content-ratio-card-inner">
                                <h2 class="modalv3-content-card-sub-header">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_3")}</h2>
                                <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_3_SUMMARY")}</p>
                            </div>
                        </div>
                        <div class="modalv3-content-ratio-card orange modalv3-content-ratio-card-selected">
                            <svg class="lock-icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M6 9h1V6a5 5 0 0 1 10 0v3h1a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Zm9-3v3H9V6a3 3 0 1 1 6 0Zm-1 8a2 2 0 0 1-1 1.73V18a1 1 0 1 1-2 0v-2.27A2 2 0 1 1 14 14Z" clip-rule="evenodd" class=""></path></svg>
                            <div class="lock-icon-block"></div>
                            <div class="modalv3-content-ratio-card-inner">
                                <h2 class="modalv3-content-card-sub-header">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_2")}</h2>
                                <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_2_SUMMARY")}</p>
                            </div>
                        </div>
                        <div class="modalv3-content-ratio-card red">
                            <div class="modalv3-content-ratio-card-inner">
                                <h2 class="modalv3-content-card-sub-header">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_1")}</h2>
                                <p class="modalv3-content-card-summary">${getTextString("MODAL_V3_TAB_REVIEWS_REVIEWS_FILTER_SETTINGS_1_SUMMARY")}</p>
                            </div>
                        </div>
                    </div>
                `;
            }

        } else if (tab === "appearance") {
            tabPageOutput.innerHTML = `
                <h2>Appearance</h2>
                
                <hr>

                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">Theme</h2>
                    <p class="modalv3-content-card-summary">Adjust the color of the interface for better visibility.</p>

                    <div class="modalv3-theme-selection-container" id="modalv3-theme-selection-container">
                    </div>
                </div>

                <hr>

                <div class="modalv3-content-card-1">
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">Day-Month-Year Date Format</div>
                            <div class="setting-description">Changes date formats to DD/MM/YYYY instead of MM/DD/YY</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="non_us_timezone_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">Profile Effects Cut Fix</div>
                            <div class="setting-description">Fixes some profile effects being cut off at the bottom</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="profile_effect_tweaks_fix_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            defaultThemes.forEach((theme) => {
                let themeCard = document.createElement("div");
                if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'advanced_theme_picker')?.treatment === 1) {
                    themeCard.classList.add('theme-selection-card');
                    themeCard.innerHTML = `
                        <div class="theme-preview" style="background-image: url(${theme.src})">
                        </div>
                        <div class="theme-card-bottom">
                            <h3>${theme.name}</h3>
                            <p>${theme.summary}</p>
                        </div>
                    `;
                    themeCard.id = 'theme-'+theme.codename+'-button';
                } else {
                    themeCard.innerHTML = `
                        <div class="theme-selection-box has-tooltip" id="theme-${theme.codename}-button" style="background-color: ${theme.color};" data-tooltip="${theme.name}"></div>
                        <svg class="checkmarkCircle" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" class=""></circle><path fill="currentColor" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm5.7-13.3a1 1 0 0 0-1.4-1.4L10 14.58l-2.3-2.3a1 1 0 0 0-1.4 1.42l3 3a1 1 0 0 0 1.4 0l7-7Z" clip-rule="evenodd" class="checkmark"></path></svg>
                    `;
                    themeCard.classList.add('theme-box-container');
                }
                themeCard.addEventListener("click", function () {
                    updateThemeStore(theme.codename, 'true');
                });
                document.getElementById("modalv3-theme-selection-container").appendChild(themeCard);
            });

            if (document.getElementById("theme-" + localStorage.sa_theme + "-button")) {
                document.getElementById("theme-" + localStorage.sa_theme + "-button").classList.add('theme-selection-box-selected');
            }

            
            updateToggleStates();

            tabPageOutput.querySelector('#non_us_timezone_toggle').addEventListener("click", () => {
                toggleSetting('non_us_timezone');
                updateToggleStates();
            });

            tabPageOutput.querySelector('#profile_effect_tweaks_fix_toggle').addEventListener("click", () => {
                toggleSetting('profile_effect_tweaks_fix');
                updateToggleStates();
                if (!document.body.classList.contains('profile-effect-bug-fix-thumbnails')) {
                    document.body.classList.add('profile-effect-bug-fix-thumbnails');
                } else {
                    document.body.classList.remove('profile-effect-bug-fix-thumbnails');
                }
            });

            // Function to toggle a setting (0 or 1)
            function toggleSetting(key) {
                if (key in settingsStore) {
                    const newValue = settingsStore[key] === 0 ? 1 : 0;
                    changeSetting(key, newValue);
                }
            }

            // Update toggle visual states
            function updateToggleStates() {
                for (let key in settingsStore) {
                    const toggle = document.getElementById(key + '_toggle');
                    if (toggle) {
                        if (settingsStore[key] === 1) {
                            toggle.classList.add('active');
                        } else {
                            toggle.classList.remove('active');
                        }
                    }
                }
            }

        } else if (tab === "accessibility") {
            tabPageOutput.innerHTML = `
                <h2>Accessibility</h2>

                <hr>

                <div class="modalv3-content-card-1">
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">Developer Mode</div>
                            <div class="setting-description">something dev idk</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="developer_mode_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } else if (tab === "xp_events") {
            tabPageOutput.innerHTML = `
                <h2>Events</h2>

                <hr>

                <div class="xp-balance-modalv3-container">
                    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="#D9D9D9"></path>
                    </svg>                            
                    <p id="my-xp-balance-modalv3">${currentUserData.xp_balance.toLocaleString()}</p>
                </div>

                <hr class="inv">

                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">Active Events</h2>
                    <p class="modalv3-content-card-summary">Events are a sweet way to earn free XP, keep an eye out for new events!</p>

                    <div class="modalv3-xp-events-container" id="xp-events-unclaimed">

                    </div>
                </div>

                <hr>

                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">Claimed Events</h2>
                    <p class="modalv3-content-card-summary">Past events that you've claimed.</p>

                    <div class="modalv3-xp-events-container" id="xp-events-claimed">

                    </div>
                </div>
            `;

            const xpBalance = tabPageOutput.querySelector('.xp-balance-modalv3-container');

            usersXPBalance = currentUserData.xp_balance;

            xpBalance.classList.add('has-tooltip');
            xpBalance.setAttribute('data-tooltip', 'You have '+usersXPBalance.toLocaleString()+' XP');


            const unclaimedOutput = tabPageOutput.querySelector('#xp-events-unclaimed');
            const claimedOutput = tabPageOutput.querySelector('#xp-events-claimed');

            if (usersXPEventsCache) {
                refreshXPEventsList()
            }

            function refreshXPEventsList() {
                unclaimedOutput.innerHTML = ``;
                claimedOutput.innerHTML = ``;
                let unclaimedCoint = 0;
                let claimedCoint = 0;
                usersXPEventsCache.forEach(promo => {

                    let renderedDate;

                    let promoCard = document.createElement("div");

                    if (promo.already_claimed != true && promo.category_data === null || promo.already_claimed != true && settingsStore.staff_allow_category_only_event_claiming_in_events_tab === 1) {

                        unclaimedCoint += 1;

                        promoCard.classList.add('modalv3-xp-reward');
                        promoCard.classList.add('unclaimed');

                        promoCard.innerHTML = `
                            <div id="xp-event-expires-at"></div>
                            <h3>${promo.name}</h3>
                            <p class="desc">You have ${promo.xp_reward.toLocaleString()} XP waiting for you.</p>
                            <button id="claim-xp-button">
                                Claim ${promo.xp_reward.toLocaleString()} XP
                                <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                </svg>
                            </button>
                        `;

                        promoCard.querySelector('#claim-xp-button').addEventListener('click', () => {
                            openClaimableClaimXPModal(promo.claimable_id);
                        });
                        
                        unclaimedOutput.appendChild(promoCard)
                    } else if (promo.already_claimed != true && promo.category_data != null) {

                        unclaimedCoint += 1;

                        promoCard.classList.add('modalv3-xp-reward');
                        promoCard.classList.add('unclaimed');

                        promoCard.innerHTML = `
                            <div id="xp-event-expires-at"></div>
                            <h3>${promo.name}</h3>
                            <p class="desc">You have ${promo.xp_reward.toLocaleString()} XP waiting for you, visit the category to claim it.</p>
                            <button id="take-me-there-xp-button">
                                Take Me There
                            </button>
                        `;

                        promoCard.querySelector('#take-me-there-xp-button').addEventListener('click', () => {
                            closeModalV3();
                            addParams({page: promo.category_data.page});
                            currentOpenModalId = promo.category_data.sku_id;
                            loadPage(promo.category_data.page, true);
                        });
                        
                        unclaimedOutput.appendChild(promoCard)
                    } else if (promo.already_claimed === true) {

                        claimedCoint += 1;

                        promoCard.classList.add('modalv3-xp-reward');

                        promoCard.innerHTML = `
                            <div id="xp-event-expires-at"></div>
                            <h3>${promo.name}</h3>
                            <p class="desc">You already claimed this event reward for ${promo.xp_reward.toLocaleString()} XP.</p>
                        `;
                        
                        claimedOutput.appendChild(promoCard)
                    }

                    const expiresAt = new Date(promo.expires_at);
                            
                    if (promo.expires_at && !isNaN(expiresAt.getTime())) {
                    
                        function updateTimer() {
                            const now = new Date();
                            const timeDiff = expiresAt - now;
                    
                            if (timeDiff <= 0) {
                                promoCard.classList.add("hidden");
                                clearInterval(timerInterval);
                            } else {
                                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                                const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

                                const date = `ENDS IN ${days}d ${hours}h ${minutes}m ${seconds}s`;

                                renderedDate = date.replace(" 0d 0h 0m", "").replace(" 0d 0h", "").replace(" 0d", "")

                                promoCard.querySelector('#xp-event-expires-at').innerHTML = `
                                    <p class="xp-event-expires-at-text">${renderedDate}</p>
                                `;
                            }
                        }
                    
                        const timerInterval = setInterval(updateTimer, 1000);
                        updateTimer();
                    }
                });

                if (claimedCoint === 0) {
                    let promoCard = document.createElement("div");

                    promoCard.classList.add('modalv3-xp-reward');

                    promoCard.innerHTML = `
                        <h3>Nothing yet...</h3>
                        <p class="desc">Looks like you haven't claimed any event rewards yet. When you do, they'll show up here.</p>
                    `;
                    
                    claimedOutput.appendChild(promoCard)
                }

                if (unclaimedCoint === 0) {
                    let promoCard = document.createElement("div");

                    promoCard.classList.add('modalv3-xp-reward');

                    promoCard.innerHTML = `
                        <h3>All is quiet...</h3>
                        <p class="desc">There are no events happening right now, check back later.</p>
                    `;
                    
                    unclaimedOutput.appendChild(promoCard)
                }
            }

            window.refreshXPEventsList = refreshXPEventsList;

        } else if (tab === "xp_shop") {
            tabPageOutput.innerHTML = `
                <h2>XP Shop</h2>

                <hr>

                <div class="xp-balance-modalv3-container">
                    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="#D9D9D9"></path>
                    </svg>                            
                    <p id="my-xp-balance-modalv3">${currentUserData.xp_balance.toLocaleString()}</p>
                </div>

                <hr class="inv">

                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">Featured Perks</h2>
                    <p class="modalv3-content-card-summary">Top picks from us we think you might like.</p>

                    <div class="modalv3-xp-featured-cards-container">
                        <div class="xp-featured-card">
                            <div class="xp-card-button-pad"></div>
                            <div class="xp-card-button-pad"></div>
                        </div>
                        <div class="xp-featured-card">
                            <div class="xp-card-button-pad"></div>
                            <div class="xp-card-button-pad"></div>
                        </div>
                    </div>
                </div>

                <hr>

                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">Additional Perks</h2>
                    <div class="modalv3-xp-shop-cards-container">
                        <div class="xp-featured-card">
                            <div class="xp-card-button-pad"></div>
                            <div class="xp-card-button-pad"></div>
                        </div>
                        <div class="xp-featured-card">
                            <div class="xp-card-button-pad"></div>
                            <div class="xp-card-button-pad"></div>
                        </div>
                    </div>
                </div>
            `;

            const xpBalance = tabPageOutput.querySelector('.xp-balance-modalv3-container');

            usersXPBalance = currentUserData.xp_balance;

            xpBalance.classList.add('has-tooltip');
            xpBalance.setAttribute('data-tooltip', 'You have '+usersXPBalance.toLocaleString()+' XP');


            const featuredXpOutput = tabPageOutput.querySelector('.modalv3-xp-featured-cards-container');
            const shopXpOutput = tabPageOutput.querySelector('.modalv3-xp-shop-cards-container');

            loadXpShopData();

            async function loadXpShopData() {
                
                if (!XPShopCache) {
                    await fetchAndUpdateXpShop();
                    renderXpShop(XPShopCache)
                } else {
                    renderXpShop(XPShopCache)
                }

            }
            
            window.loadXpShopData = loadXpShopData;

            function renderXpShop(data) {
                featuredXpOutput.innerHTML = ``;
                shopXpOutput.innerHTML = ``;
                data.featured.forEach(xpItem => {
                    let xpCard = document.createElement("div");

                    xpCard.classList.add('xp-featured-card')

                    xpCard.innerHTML = `
                        <h3>${xpItem.name}</h3>
                        <p>${xpItem.summary}</p>
                        <div class="xp-card-button-pad"></div>
                        <div class="xp-card-bottom">
                            <h3 class="xp-already-claimed-text hidden">Already Claimed</h3>
                            <button id="claim-item-for-xp-button">
                                Claim for ${xpItem.price} XP
                                <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                    const button = xpCard.querySelector('#claim-item-for-xp-button');
                    const alreadyClaimedText = xpCard.querySelector('.xp-already-claimed-text');

                    let alreadyClaimed = null;
                    usersXPInventoryCache.forEach(claimed => {
                        if (claimed.id === xpItem.id) {
                            alreadyClaimed = true;
                        }
                    });

                    if (!alreadyClaimed) {
                        if (xpItem.price > currentUserData.xp_balance) {
                            button.disabled = true;
                            button.classList.add('has-tooltip');
                            button.setAttribute('data-tooltip', 'Insufficient XP');
                        } else {
                            button.addEventListener('click', () => {
                                openClaimablePurchaseModal(xpItem.id);
                            });
                        }
                    } else {
                        alreadyClaimedText.classList.remove('hidden');
                        button.classList.add('hidden');
                    }

                    featuredXpOutput.appendChild(xpCard);
                });
                data.shop.forEach(xpItem => {
                    let xpCard = document.createElement("div");

                    xpCard.classList.add('xp-shop-card')

                    xpCard.innerHTML = `
                        <h3>${xpItem.name}</h3>
                        <p>${xpItem.summary}</p>
                        <div class="xp-card-button-pad"></div>
                        <div class="xp-card-bottom">
                            <h3 class="xp-already-claimed-text hidden">Already Claimed</h3>
                            <button id="claim-item-for-xp-button">
                                Claim for ${xpItem.price} XP
                                <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                </svg>
                            </button>
                        </div>
                    `;
                    const button = xpCard.querySelector('#claim-item-for-xp-button');
                    const alreadyClaimedText = xpCard.querySelector('.xp-already-claimed-text');

                    let alreadyClaimed = null;
                    usersXPInventoryCache.forEach(claimed => {
                        if (claimed.id === xpItem.id) {
                            alreadyClaimed = true;
                        }
                    });

                    if (!alreadyClaimed) {
                        if (xpItem.price > currentUserData.xp_balance) {
                            button.disabled = true;
                            button.classList.add('has-tooltip');
                            button.setAttribute('data-tooltip', 'Insufficient XP');
                        } else {
                            button.addEventListener('click', () => {
                                openClaimablePurchaseModal(xpItem.id);
                            });
                        }
                    } else {
                        alreadyClaimedText.classList.remove('hidden');
                        button.classList.add('hidden');
                    }

                    shopXpOutput.appendChild(xpCard);
                });
            }

        } else if (tab === "xp_inventory") {
            tabPageOutput.innerHTML = `
                <h2>Inventory</h2>

                <hr>

                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">Coming in update 7.1</h2>
                </div>
            `;

        } else if (tab === "experiments") {
            tabPageOutput.innerHTML = `
                <h2>Experiments</h2>

                <hr>

                <div class="modalv3-content-card-1" id="modalv3-experiment-output">
                </div>
            `;

            function loadOverrides() {
                try {
                  return JSON.parse(localStorage.getItem(overridesKey)) || [];
                } catch {
                  return [];
                }
            }
          
            function saveOverrides(overrides) {
                localStorage.setItem(overridesKey, JSON.stringify(overrides));
            }
          
            function loadServerExperiments() {
                try {
                  return JSON.parse(localStorage.getItem(serverKey)) || [];
                } catch {
                  return [];
                }
            }

            function saveOverride(codename, release_config, treatmentIndex) {
                let overrides = loadOverrides();
                const serverExperiments = loadServerExperiments();
                const index = overrides.findIndex(o => o.codename === codename);
          
                if (treatmentIndex === null) {
                  const serverMatch = serverExperiments.find(s => s.codename === codename);
                  if (serverMatch) {
                    // Restore from server rollout and mark as auto
                    if (index > -1) {
                      overrides[index].treatment = serverMatch.rollout;
                      overrides[index].release_config = release_config;
                      overrides[index].auto = true;
                    } else {
                      overrides.push({
                        codename,
                        release_config,
                        treatment: serverMatch.rollout,
                        auto: true
                      });
                    }
                  } else {
                    // Remove override entirely
                    if (index > -1) overrides.splice(index, 1);
                  }
                } else {
                  // Manual override — remove auto if it was present
                  if (index > -1) {
                    overrides[index].treatment = treatmentIndex;
                    overrides[index].release_config = release_config;
                    delete overrides[index].auto;
                  } else {
                    overrides.push({
                      codename,
                      release_config,
                      treatment: treatmentIndex
                    });
                  }
                }
          
                saveOverrides(overrides);
                renderExperiments();
            }
          
            function renderExperiments() {
                const container = document.getElementById('modalv3-experiment-output');
                container.innerHTML = '';
                const overrides = loadOverrides();
          
                experiments.forEach(exp => {
                  const wrapper = document.createElement('div');
                  wrapper.className = 'modalv3-experiment-container';

                  const isOverriden = document.createElement('p');
                  isOverriden.textContent = JSON.parse(localStorage.getItem(overridesKey)).find(e => e.codename === exp.codename).auto ? isOverriden.classList.add('hidden') : 'Overriden';
                  isOverriden.classList.add('modalv3-experiment-overriden');
                  isOverriden.classList.add('has-tooltip');
                  isOverriden.setAttribute('data-tooltip', 'This experiment has been overriden locally');
          
                  const label = document.createElement('p');
                  label.textContent = exp.title;
                  label.className = 'modalv3-experiment-title';

                  const summary = document.createElement('p');
                  summary.textContent = exp.release_config.year+'-'+exp.release_config.month+'_'+exp.codename;
                  summary.className = 'modalv3-experiment-id';

                  const serverRollout = document.createElement('p');
                  serverRollout.textContent = 'Server Rollout: '+JSON.parse(localStorage.getItem(serverKey)).find(e => e.codename === exp.codename).rollout;
                  serverRollout.className = 'modalv3-experiment-id';
          
                  const select = document.createElement('select');
                  const defaultOption = document.createElement('option');
                  defaultOption.value = '';
                  defaultOption.textContent = 'Reset';
                  select.className = 'modalv3-experiment-treatment-container';
                  select.appendChild(defaultOption);
          
                  exp.treatments.forEach((treatment, i) => {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = 'Treatment '+i+': '+treatment.title;
                    select.appendChild(option);
                  });
          
                  const saved = overrides.find(o => o.codename === exp.codename);
                  if (saved) select.value = saved.treatment;
          
                  select.addEventListener('change', () => {
                    const treatmentIndex = select.value === '' ? null : parseInt(select.value);
                    saveOverride(exp.codename, exp.release_config, treatmentIndex);
                  });
                  
                  wrapper.appendChild(isOverriden);
                  wrapper.appendChild(label);
                  wrapper.appendChild(summary);
                  wrapper.appendChild(serverRollout);
                  wrapper.appendChild(select);
                  container.appendChild(wrapper);
                });
            }
          
            renderExperiments();

        } else {
            console.error(tab + ' is not a valid tab');
        }
    }

    window.setModalv3InnerContent = setModalv3InnerContent;

    function toggleStaffDevTools() {

        const devtoolsContainer = document.querySelector('.staff-devtools-container');

        if (!devtoolsOpenCache) {

            devtoolsOpenCache = true;

            devtoolsContainer.innerHTML = `
                <div class="staff-devtools">
                    <h2>Devtools</h2>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">Shop: Force Leaks</div>
                            <div class="setting-description">Overrides the leaks endpoint with client side dummy data (requires restart)</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_force_leaks_dummy_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">Shop: Force Show Reviews</div>
                            <div class="setting-description">Allows you to view the reviews for a category even if its reviews are disabled.</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_force_viewable_reviews_tab_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">Simulate: Lite Ban</div>
                            <div class="setting-description">Simulate the user having ban_type 1.</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_simulate_ban_type_1_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">Simulate: Medium Ban</div>
                            <div class="setting-description">Simulate the user having ban_type 2.</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_simulate_ban_type_2_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">Simulate: Guidelines Block</div>
                            <div class="setting-description">Simulate the user having a username that doesn't follow the guidelines.</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_simulate_guidelines_block_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">XP: Unpublished Xp Events</div>
                            <div class="setting-description">Pretty self explanatory</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_show_unpublished_xp_events_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">XP: Unpublished Xp Shop</div>
                            <div class="setting-description">same for this</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_show_unpublished_xp_shop_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <div class="setting-title">XP: Bypass Category Requirement</div>
                            <div class="setting-description">Allows you to claim category only events from the events tab</div>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_allow_category_only_event_claiming_in_events_tab_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            updateToggleStates();

            devtoolsContainer.querySelector('#staff_force_leaks_dummy_toggle').addEventListener("click", () => {
                toggleSetting('staff_force_leaks_dummy');
                updateToggleStates();
            });

            devtoolsContainer.querySelector('#staff_force_viewable_reviews_tab_toggle').addEventListener("click", () => {
                toggleSetting('staff_force_viewable_reviews_tab');
                updateToggleStates();
            });

            devtoolsContainer.querySelector('#staff_simulate_ban_type_1_toggle').addEventListener("click", () => {
                toggleSetting('staff_simulate_ban_type_1');
                updateToggleStates();
            });

            devtoolsContainer.querySelector('#staff_simulate_ban_type_2_toggle').addEventListener("click", () => {
                toggleSetting('staff_simulate_ban_type_2');
                updateToggleStates();
            });

            devtoolsContainer.querySelector('#staff_simulate_guidelines_block_toggle').addEventListener("click", () => {
                toggleSetting('staff_simulate_guidelines_block');
                updateToggleStates();
            });

            devtoolsContainer.querySelector('#staff_show_unpublished_xp_events_toggle').addEventListener("click", () => {
                toggleSetting('staff_show_unpublished_xp_events');
                updateToggleStates();
                fetchAndUpdateXpEvents();
            });

            devtoolsContainer.querySelector('#staff_show_unpublished_xp_shop_toggle').addEventListener("click", () => {
                toggleSetting('staff_show_unpublished_xp_shop');
                updateToggleStates();
                fetchAndUpdateXpShop();
            });

            devtoolsContainer.querySelector('#staff_allow_category_only_event_claiming_in_events_tab_toggle').addEventListener("click", () => {
                toggleSetting('staff_allow_category_only_event_claiming_in_events_tab');
                updateToggleStates();
            });

            // Function to toggle a setting (0 or 1)
            function toggleSetting(key) {
                if (key in settingsStore) {
                    const newValue = settingsStore[key] === 0 ? 1 : 0;
                    changeSetting(key, newValue);
                }
            }

            // Update toggle visual states
            function updateToggleStates() {
                for (let key in settingsStore) {
                    const toggle = document.getElementById(key + '_toggle');
                    if (toggle) {
                        if (settingsStore[key] === 1) {
                            toggle.classList.add('active');
                        } else {
                            toggle.classList.remove('active');
                        }
                    }
                }
            }
        } else {
            devtoolsOpenCache = false;
            devtoolsContainer.innerHTML = ``;
        }
    }

    window.toggleStaffDevTools = toggleStaffDevTools;

    if (settingsStore.dev === 1) {
        document.getElementById('dev-tools-icon').classList.remove('hidden');
    }

}
window.loadSite = loadSite;

function triggerSafetyBlock() {
    console.warn('%cWarning!', 'color: lightblue; font-weight: bold; font-size: 30px; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;');
    console.warn('You\'re not visiting Shop Archives on a verified domain, the website "' + window.location.hostname + '" could be trying to hack you, please close the tab immediately!');

    // try {
    //     document.getElementById("title-brick").textContent = "Warning!";
    //     document.getElementById("summary-brick").textContent = 'You\'re not visiting Shop Archives on a verified domain, the website "' + window.location.hostname + '" could be trying to hack you, please close the tab immediately!';
    // } catch {
        
    // }

    try {
        document.getElementById("title-brick").textContent = "Error!";
        document.getElementById("summary-brick").textContent = 'Unable to verify origin';
    } catch {
        
    }
}

function triggerSessionExpiredBlock() {
    try {
        document.getElementById("title-brick").textContent = "Session Expired!";
        document.getElementById("summary-brick").textContent = 'Please log in again or continue as guest';
        document.querySelector('.brick-wall-buttons-container').innerHTML = `
            <button class="log-in-with-discord-button" onclick="loginWithDiscord();">
                <svg width="59" height="59" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M48.7541 12.511C45.2046 10.8416 41.4614 9.66246 37.6149 9C37.0857 9.96719 36.6081 10.9609 36.1822 11.9811C32.0905 11.3451 27.9213 11.3451 23.8167 11.9811C23.3908 10.9609 22.9132 9.96719 22.384 9C18.5376 9.67571 14.7815 10.8549 11.2319 12.5243C4.18435 23.2297 2.27404 33.67 3.2292 43.9647C7.35961 47.0915 11.9805 49.4763 16.8854 51C17.9954 49.4763 18.9764 47.8467 19.8154 46.1508C18.2149 45.5413 16.6789 44.7861 15.2074 43.8984C15.5946 43.6069 15.969 43.3155 16.3433 43.024C24.9913 47.1975 35.0076 47.1975 43.6557 43.024C44.03 43.3287 44.4043 43.6334 44.7915 43.8984C43.3201 44.7861 41.7712 45.5413 40.1706 46.164C41.0096 47.8599 41.9906 49.4763 43.1006 51C48.0184 49.4763 52.6393 47.1047 56.7697 43.9647C57.8927 32.0271 54.8594 21.6927 48.7412 12.511H48.7541ZM21.0416 37.6315C18.3827 37.6315 16.1755 35.1539 16.1755 32.1066C16.1755 29.0593 18.2923 26.5552 21.0287 26.5552C23.7651 26.5552 25.9465 29.0593 25.8949 32.1066C25.8432 35.1539 23.7522 37.6315 21.0416 37.6315ZM38.9831 37.6315C36.3113 37.6315 34.1299 35.1539 34.1299 32.1066C34.1299 29.0593 36.2467 26.5552 38.9831 26.5552C41.7195 26.5552 43.888 29.0593 43.8364 32.1066C43.7847 35.1539 41.6937 37.6315 38.9831 37.6315Z" fill="white"/>
                </svg>
                Login with Discord
            </button>
            <button class="log-in-with-discord-button" style="background-color: var(--color-primary);" onclick="logoutOfDiscord();">
                Continue as Guest
            </button>
        `;
    } catch {
        
    }
}

function createNotice(text, type) {
    const notice = document.getElementById('notice-container');
    let noticeDiv = document.createElement("div");

    noticeDiv.innerHTML = `
        <div class="notice">
            <p>${text}</p>
            <svg class="closeIcon" onclick="this.parentElement.remove();" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path></svg>
        </div>
    `;

    notice.appendChild(noticeDiv);
    if (type === 1) {
        notice.classList.add('neutral');
    } else if (type === 2) {
        notice.classList.add('brand');
    } else if (type === 4) {
        notice.classList.add('danger');
    } else {
        notice.classList.add('default');
    }
}

function updateThemeStore(theme, hasButtons) {
    if (hasButtons === "true") {
        try {
            if (document.querySelector(".theme-selection-box-selected")) {
                document.querySelectorAll('.theme-selection-box-selected').forEach((el) => {
                    el.classList.remove("theme-selection-box-selected");
                });
            }
            document.body.classList.remove('theme-' + localStorage.sa_theme);
        } catch (error) {
        }
        if (document.getElementById("theme-" + theme + "-button")) {
            document.getElementById("theme-" + theme + "-button").classList.add('theme-selection-box-selected');
        }
    }
    document.body.classList.add('theme-' + theme);
    localStorage.sa_theme = theme;
}

function copyValue(value) {
    navigator.clipboard.writeText(value)
}

function redirectToLink(link) {
    window.location.href = link;
}

function loginWithDiscord() {
    let redirect;
    if (appType === "Stable") {
        redirect = redneredAPI + endpoints.STABLE_LOGIN_CALLBACK
    } else if (appType === "Dev") {
        redirect = redneredAPI + endpoints.DEV_LOGIN_CALLBACK
    } else if (appType === "Pre-Release") {
        redirect = redneredAPI + endpoints.BETA_LOGIN_CALLBACK
    }
    const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=1342635740768501886&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=identify`;
    window.location.href = discordUrl;
}

function logoutOfDiscord() {
    localStorage.removeItem('token');
    location.reload();
}

function dev() {
    if (settingsStore.dev === 0) {
        changeSetting('dev', 1);
    } else {
        changeSetting('dev', 0);
    }
    location.reload();
}


async function postReview(categoryId, rating, text) {

    const response = await fetch(redneredAPI + endpoints.CATEGORY_MODAL_INFO + categoryId + endpoints.CATEGORY_MODAL_REVIEW, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": localStorage.token
        },
        body: JSON.stringify({
            rating,
            text
        })
    });

    const result = await response.json();

    return result;

};

async function deleteReviewById(reviewId) {

    const response = await fetch(redneredAPI + endpoints.CATEGORY_MODAL_REVIEW_DELETE + reviewId, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": localStorage.token
        }
    });

    const result = await response.json();

    return result;

};











// Smooth Animate Text Code

function animateNumber(element, targetValue, duration = 1000, options = {}) {
    // Handle both element ID strings and actual DOM elements
    const targetElement = typeof element === 'string' ? document.getElementById(element) : element;
    
    if (!targetElement) {
        console.error('Element not found');
        return;
    }
    
    const startValue = parseFloat(targetElement.textContent.replace(/,/g, '')) || 0;
    const difference = targetValue - startValue;
    const startTime = performance.now();
    
    // Options for formatting
    const useCommas = options.useCommas !== undefined ? options.useCommas : true;
    const useDecimals = options.useDecimals !== undefined ? options.useDecimals : false;
    
    // Store original styles to restore later
    const originalColor = targetElement.style.color || '#2563eb';
    const originalBgColor = targetElement.style.backgroundColor || '#f8fafc';
    
    // Easing function for smooth animation (ease-out)
    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing function
        const easedProgress = easeOut(progress);
        
        // Calculate current value
        const currentValue = startValue + (difference * easedProgress);
        
        // Format number based on options
        let formattedValue;
        if (useDecimals) {
            formattedValue = currentValue.toFixed(1);
            if (useCommas) {
                formattedValue = parseFloat(formattedValue).toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                });
            }
        } else if (useCommas) {
            formattedValue = Math.round(currentValue).toLocaleString();
        } else {
            formattedValue = Math.round(currentValue).toString();
        }
        
        targetElement.textContent = formattedValue;
        
        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}



function animateXPNumber(elementId, targetValue, duration = 1000) {
    const element = document.getElementById(elementId);
    const startValue = parseFloat(element.textContent.replace(/,/g, '')) || 0;
    const difference = targetValue - startValue;
    const startTime = performance.now();
    
    // Easing function for smooth animation (ease-out)
    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing function
        const easedProgress = easeOut(progress);
        
        // Calculate current value
        const currentValue = startValue + (difference * easedProgress);
        
        // Format number with commas for readability
        const formattedValue = Math.round(currentValue).toLocaleString();
        element.textContent = formattedValue;
        usersXPBalance = Math.round(currentValue);

        if (document.querySelector('.my-xp-value-container')) {
            document.querySelector('.my-xp-value-container').setAttribute('data-tooltip', 'You have '+usersXPBalance.toLocaleString()+' XP');
        }

        if (document.querySelector('.xp-balance-modalv3-container')) {
            document.querySelector('.xp-balance-modalv3-container').setAttribute('data-tooltip', 'You have '+usersXPBalance.toLocaleString()+' XP');
        }
        
        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}










// Tooltip Code

let tooltip = null;
let hideTimeout = null;
let currentTarget = null;

function cleanupTooltip() {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }
    if (tooltip) {
        tooltip.remove();
        tooltip = null;
    }
    currentTarget = null;
}

function createTooltip(target, text) {
    // Clean up any existing tooltip first
    cleanupTooltip();
    
    currentTarget = target;
    
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip-box';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = rect.top - tooltipRect.height - 8;
    let left = rect.left + (rect.width - tooltipRect.width) / 2;

    // Adjust if tooltip would go off screen
    if (top < 0) {
        top = rect.bottom + 8;
        // Move arrow to top when tooltip is below
        tooltip.style.setProperty('--arrow-position', 'top');
    }
    if (left < 0) {
        left = 8;
    } else if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8;
    }

    tooltip.style.top = `${top + window.scrollY}px`;
    tooltip.style.left = `${left + window.scrollX}px`;

    // Fade in
    requestAnimationFrame(() => {
        if (tooltip) {
            tooltip.style.opacity = '1';
        }
    });
}

function hideTooltip() {
    if (!tooltip) return;
    
    tooltip.style.opacity = '0';
    hideTimeout = setTimeout(() => {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
        currentTarget = null;
    }, 200);
}

// Use mouseover/mouseout for more reliable event handling
document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.has-tooltip');
    if (!target) return;
    
    // If we're already showing a tooltip for this target, don't recreate
    if (currentTarget === target) return;
    
    const text = target.getAttribute('data-tooltip');
    if (text) {
        createTooltip(target, text);
    }
});

document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.has-tooltip');
    if (!target || target !== currentTarget) return;
    
    // Check if we're moving to a child element
    if (target.contains(e.relatedTarget)) return;
    
    hideTooltip();
});

// Watch for DOM changes to cleanup tooltip if target element is removed
const observer = new MutationObserver((mutations) => {
    if (!currentTarget) return;
    
    // Check if the current target still exists in the DOM
    if (!document.contains(currentTarget)) {
        cleanupTooltip();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Cleanup on page visibility change or window blur
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        cleanupTooltip();
    }
});

window.addEventListener('blur', cleanupTooltip);
window.addEventListener('scroll', cleanupTooltip);









// Profile Effect Code

class ProfileEffectsPlayer {
    constructor() {
        this.activeEffects = new Map();
        this.loadedImages = new Map();
        this.timeouts = new Map();
        this.isPlaying = false;
    }

    async preloadImages(effects) {
        const promises = effects.map(effect => {
            return new Promise((resolve, reject) => {
                if (this.loadedImages.has(effect.src)) {
                    resolve(this.loadedImages.get(effect.src));
                    return;
                }

                const img = new Image();
                img.onload = () => {
                    this.loadedImages.set(effect.src, img);
                    resolve(img);
                };
                img.onerror = reject;
                img.src = effect.src;
            });
        });

        return Promise.all(promises);
    }

    async playEffects(container, effects) {
        if (this.isPlaying) {
            this.stopEffects(container);
        }

        this.isPlaying = true;
        
        try {
            // Select random variant index if any effects have randomizedSources
            let randomVariantIndex = null;
            for (const effect of effects) {
                if (effect.randomizedSources && effect.randomizedSources.length > 0) {
                    randomVariantIndex = Math.floor(Math.random() * effect.randomizedSources.length);
                    break;
                }
            }
            
            // Create modified effects with selected random sources
            const processedEffects = effects.map(effect => {
                const processedEffect = { ...effect };
                
                // Use randomized source if available and variant was selected
                if (randomVariantIndex !== null && 
                    effect.randomizedSources && 
                    effect.randomizedSources.length > randomVariantIndex) {
                    processedEffect.src = effect.randomizedSources[randomVariantIndex].src + '?' + Date.now() + '_' + Math.random();
                }
                
                return processedEffect;
            });
            
            // Preload all images (including randomized ones)
            await this.preloadImages(processedEffects);
            
            // Check if still playing after async operation
            if (!this.isPlaying) {
                return;
            }
            
            // Clear container
            container.innerHTML = '';
            container.style.position = 'relative';
            container.style.overflow = 'hidden';

            // Sort effects by zIndex to ensure proper layering
            const sortedEffects = [...processedEffects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

            // Schedule each effect
            sortedEffects.forEach((effect, index) => {
                this.scheduleEffect(container, effect, index);
            });

        } catch (error) {
            console.error('Error loading effect images:', error);
            this.stopEffects(container);
        }
    }

    scheduleEffect(container, effect, index) {
        const effectId = `effect_${index}_${Date.now()}`;
        
        // Schedule the effect to start
        const startTimeout = setTimeout(() => {
            if (!this.isPlaying) return;
            
            this.createEffectElement(container, effect, effectId);
            
            // Schedule removal after duration
            const removeTimeout = setTimeout(() => {
                // Check if effect should loop or stay on last frame
                if (effect.loop && this.isPlaying) {
                    if (effect.loopDelay === 0) {
                        // Keep the effect visible (don't remove it) - stays on last frame
                        return;
                    } else {
                        // Remove and schedule loop
                        this.removeEffect(container, effectId);
                        this.scheduleLoop(container, effect, effectId);
                    }
                } else {
                    // Normal removal for non-looping effects
                    this.removeEffect(container, effectId);
                }
            }, effect.duration);
            
            this.timeouts.set(`${effectId}_remove`, removeTimeout);
            
        }, effect.start);
        
        this.timeouts.set(`${effectId}_start`, startTimeout);
    }

    scheduleLoop(container, effect, baseEffectId) {
        const loopDelay = effect.loopDelay || 0;
        
        const loopTimeout = setTimeout(() => {
            if (!this.isPlaying) return;
            
            const newEffectId = `${baseEffectId}_loop_${Date.now()}`;
            this.createEffectElement(container, effect, newEffectId);
            
            // Schedule next loop cycle
            const cycleTimeout = setTimeout(() => {
                this.removeEffect(container, newEffectId);
                if (effect.loop && this.isPlaying) {
                    this.scheduleLoop(container, effect, baseEffectId);
                }
            }, effect.duration);
            
            this.timeouts.set(`${newEffectId}_cycle`, cycleTimeout);
            
        }, loopDelay);
        
        this.timeouts.set(`${baseEffectId}_loop`, loopTimeout);
    }

    createEffectElement(container, effect, effectId) {
        const img = this.loadedImages.get(effect.src);
        if (!img) return;

        const effectElement = document.createElement('img');
        effectElement.src = effect.src + '?' + Date.now() + '_' + Math.random();
        effectElement.style.position = 'absolute';
        effectElement.style.left = `${effect.position.x}px`;
        effectElement.style.top = `${effect.position.y}px`;
        effectElement.style.width = `100%`;
        effectElement.style.pointerEvents = 'none';
        effectElement.dataset.effectId = effectId;

        container.appendChild(effectElement);
        this.activeEffects.set(effectId, effectElement);
    }

    removeEffect(container, effectId) {
        const element = this.activeEffects.get(effectId);
        if (element && element.parentNode === container) {
            container.removeChild(element);
        }
        this.activeEffects.delete(effectId);
    }

    stopEffects(container) {
        this.isPlaying = false;
        
        // Clear all timeouts
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts.clear();
        
        // Remove all active effects
        this.activeEffects.forEach(element => {
            if (element.parentNode === container) {
                container.removeChild(element);
            }
        });
        this.activeEffects.clear();
        
        // Clear the container to prevent empty state
        container.innerHTML = '';
    }

    destroy() {
        this.stopEffects();
        this.loadedImages.clear();
        this.timeouts.clear();
        this.activeEffects.clear();
    }
}

// Profile Effects Card Component
class ProfileEffectsCard {
    constructor(container, profileEffect, hoverTarget = null, options = {}) {
        this.container = container;
        this.profileEffect = profileEffect;
        this.player = new ProfileEffectsPlayer();
        this.isHovered = false;
        this.hoverTarget = hoverTarget || container; // Use provided hover target or default to container
        this.options = {
            startImmediately: false,
            ...options
        };
        
        this.init();
    }

    init() {
        this.container.style.position = 'relative';
        
        // Set thumbnail as default
        this.showThumbnail();
        
        // Add hover listeners to the hover target (usually the card)
        this.hoverTarget.addEventListener('mouseenter', () => this.onMouseEnter());
        this.hoverTarget.addEventListener('mouseleave', () => this.onMouseLeave());
        
        // Start immediately if requested
        if (this.options.startImmediately) {
            this.isHovered = true;
            this.onMouseEnter();
        }
    }

    showThumbnail() {
        this.container.innerHTML = `
            <img src="${this.profileEffect.thumbnailPreviewSrc}" 
                 alt="${this.profileEffect.title}"
                 style="width: 100%; height: auto; object-fit: contain; display: block;">
        `;
    }

    async onMouseEnter() {
        this.isHovered = true;
        
        if (this.profileEffect.effects && this.profileEffect.effects.length > 0) {
            try {
                await this.player.playEffects(this.container, this.profileEffect.effects);
            } catch (error) {
                console.error('Failed to play effects:', error);
                // Only show thumbnail if still hovered
                if (this.isHovered) {
                    this.showThumbnail();
                }
            }
        }
    }

    onMouseLeave() {
        this.isHovered = false;
        this.player.stopEffects(this.container);
        this.showThumbnail();
    }

    destroy() {
        this.player.destroy();
        this.hoverTarget.removeEventListener('mouseenter', this.onMouseEnter);
        this.hoverTarget.removeEventListener('mouseleave', this.onMouseLeave);
    }

    // Method to update the profile effect (useful for dynamic changes)
    updateProfileEffect(newProfileEffect, startImmediately = false) {
        // Stop current effects completely
        this.player.stopEffects(this.container);
        
        // Update the profile effect
        this.profileEffect = newProfileEffect;
        
        // Show thumbnail by default
        this.showThumbnail();
        
        // If currently hovered or start immediately requested, start new effects
        if (this.isHovered || startImmediately) {
            this.onMouseEnter();
        }
    }
}

// Helper function to find profile effect by product ID
function findProfileEffectByProductId(discordProfileEffectsCache, productId) {
    if (!discordProfileEffectsCache || !discordProfileEffectsCache.profile_effect_configs) {
        return null;
    }
    
    return discordProfileEffectsCache.profile_effect_configs.find(effect => 
        effect.id === productId
    );
}