document.getElementById('logo-container').setAttribute('data-tooltip', appType+' '+appVersion);

// Cache
let currentPageCache;
let currentOpenModalId;
let isMobileCache;
let scrollToCache;
let devtoolsOpenCache;
let currentUserData;
let usersXPBalance;
let usersXPEventsCache;
let openModalsCache = 0;
let xpLevelStatsCache;

let discordProfileEffectsCache;
let discordLeakedCategoriesCache;
let discordCollectiblesShopHomeCache;
let discordCollectiblesCategoriesCache;
let discordOrbsCategoriesCache;
let discordMiscellaneousCategoriesCache;
let discordQuestsCache;

let hasDroveAdminPanelPlugin = false;
let baseYapperURL = 'https://yapper.shop/';

if (appType === 'Dev') baseYapperURL = 'https://dev.yapper.shop/';


const overridesKey = 'experimentOverrides';
const serverKey = 'serverExperiments';

const isMobile = navigator.userAgentData && navigator.userAgentData.mobile;
if (isMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    isMobileCache = true;
    document.body.classList.add('mobile');
}

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
if (params.get("itemId")) {
    currentOpenModalId = params.get("itemId");
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

        if (currentUserData && currentUserData.types.admin_level >= 1) {
            changeSetting('dev', 1);
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

async function fetchAndUpdateXpLevels() {
    try {
        url = redneredAPI + endpoints.XP_LEVELS;
        apiUrl = new URL(url);

        const xpLevelsRaw = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Authorization": localStorage.token
            }
        });

        if (!xpLevelsRaw.ok) {
            createNotice(`There was an error fetching ${endpoints.XP_LEVELS}`, 4);
        } else {
            const xpLevels = await xpLevelsRaw.json();

            xpLevelStatsCache = xpLevels;
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

async function fetchAndSyncUserInfo() {
    try {
        let success = true;
        const userRawData = await fetch(redneredAPI + endpoints.USER, {
            method: "POST",
            headers: {
                "Authorization": localStorage.token
            }
        });

        if (!userRawData.ok) {
            success = false;
        } else {
            const userData = await userRawData.json();

            localStorage.setItem('currentUser', JSON.stringify(userData));

            currentUserData = JSON.parse(localStorage.getItem('currentUser'));
        }
        return success
    } catch {}
}

async function updateXpLevelBar() {
    const xpNeeded = currentUserData.xp_information.xp_to_level - currentUserData.xp_information.xp_into_level;
    const nextLevel = currentUserData.xp_information.level + 1;
    
    const xpBar = document.querySelector('.xp-balance-modalv3-container');
    if (xpBar) {
        xpBar.setAttribute('data-tooltip', 'You need '+xpNeeded.toLocaleString()+' more XP for Level '+nextLevel);
        xpBar.querySelector('.bar').style.width = currentUserData.xp_information.level_percentage+'%';
        xpBar.querySelector('#my-xp-balance').textContent = 'Level '+currentUserData.xp_information.level;
    }

    const xpBar2 = document.querySelector('.my-xp-value-container');
    if (xpBar2) {

        xpBar2.setAttribute('data-tooltip', 'You need '+xpNeeded.toLocaleString()+' more XP for Level '+nextLevel);
        xpBar2.querySelector('.bar').style.width = currentUserData.xp_information.level_percentage+'%';
        xpBar2.querySelector('#my-xp-balance').textContent = 'Level '+currentUserData.xp_information.level;
    }
}


function findDisplayNameStyle(id) {
    const num = Number(id);
    const matchingName = Object.entries(display_name_styles_fonts).find(
        ([name, value]) => value === num
    )?.[0];

    return matchingName;
}

function decimalToHexColor(decimal) {
    const hex = decimal.toString(16).padStart(6, '0');
    return `#${hex.toUpperCase()}`;
}
function hexToDecimalColor(hex) {
    const cleanedHex = hex.replace(/^#/, '');
    return parseInt(cleanedHex, 16);
}

function renderDisplayNameStyle(data) {
    const font = findDisplayNameStyle(data.font_id);
    let style;

    if (data.effect_id === 1 && data.colors[0]) {
        style = {
            color: decimalToHexColor(data.colors[0])
        };
    }
    else if (data.effect_id === 2 && data.colors[0] && data.colors[1]) {
        style = {
            background: `linear-gradient(90deg, ${decimalToHexColor(data.colors[0])} 0%, ${decimalToHexColor(data.colors[1])} 100%)`
        };
    }
    else if (data.effect_id === 3 && data.colors[0]) {
        style = {
            textShadow: `0 0 10px ${decimalToHexColor(data.colors[0])}`
        };
    }

    return {
        class: `dns-${font}`,
        style
    }
}

function secondsToMinutes(seconds) {
    return Math.floor(seconds / 60);
}

function renderQuestRequirement(quest) {
    const anyTarget = Object.values(quest.task_config.tasks).find(task => task?.target)?.target;

    let section1 = `Play ${quest.messages.game_title} for ${secondsToMinutes(anyTarget)} minutes `
    if (quest.task_config.tasks["WATCH_VIDEO"] || quest.task_config.tasks["WATCH_VIDEO_ON_MOBILE"]) {
        section1 = `Watch the video `;
    }
    else if (quest.task_config.tasks["STREAM_ON_DESKTOP"]) {
        section1 = `Stream ${quest.messages.game_title} to a friend for ${secondsToMinutes(anyTarget)} minutes `;
    }

    let section2 = ``;
    if (quest.task_config.tasks["PLAY_ON_DESKTOP"] && !quest.task_config.tasks["PLAY_ON_PLAYSTATION"] && !quest.task_config.tasks["PLAY_ON_XBOX"]) {
        section2 = `with your Discord client open `
    }

    let section3 = `and win `
    if (quest.rewards_config.rewards[0].type === quest_reward_types.COLLECTIBLE) {
        section3 = `to unlock `
    }
    else if (quest.rewards_config.rewards[0].type === quest_reward_types.VIRTUAL_CURRENCY) {
        section3 = `to earn `
    }

    let section4 = quest.rewards_config.rewards[0].messages.name_with_article;
    if (quest.rewards_config.rewards[0].type === quest_reward_types.VIRTUAL_CURRENCY) {
        section4 = `${quest.rewards_config.rewards[0].orb_quantity} Discord Orbs`;
    }

    let section5 = `.`;
    if (quest.rewards_config.rewards[0].expiration_mode === 3) {
        section5 = `. Keep it with Nitro!`
    }
    else if (quest.rewards_config.rewards[0].type === quest_reward_types.VIRTUAL_CURRENCY) {
        section5 = `!`
    }

    let task = `${section1}${section2}`;
    let reward = `${quest.rewards_config.rewards[0].messages.name}.`
    if (quest.rewards_config.rewards[0].type === quest_reward_types.VIRTUAL_CURRENCY) {
        reward = `${quest.rewards_config.rewards[0].orb_quantity} Discord Orbs!`
    }

    const data = {
        requirements: `${section1}${section2}${section3} ${section4}${section5}`,
        task: `${task.trim()}.`,
        reward
    }
    return data;
}

function favorite(type, data) {
    if (type === "add") {
        const favorites = JSON.parse(localStorage.getItem("favoritesStore")) || [];
        favorites.unshift(data);
        localStorage.setItem("favoritesStore", JSON.stringify(favorites));
    } else if (type === "remove") {
        const favorites = JSON.parse(localStorage.getItem("favoritesStore")) || [];
        const updatedFavorites = favorites.filter(item => String(item.sku_id) !== String(data));
        localStorage.setItem("favoritesStore", JSON.stringify(updatedFavorites));
    }
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
        },
        {
            id: 6,
            title: "Quests",
            url: "quests",
            body: `
                <div class="quests-wrapper" id="quests-wrapper">
                    <div class="quest-card loading">
                    </div>
                    <div class="quest-card loading">
                    </div>
                    <div class="quest-card loading">
                    </div>
                    <div class="quest-card loading">
                    </div>
                    <div class="quest-card loading">
                    </div>
                    <div class="quest-card loading">
                    </div>
                    <div class="quest-card loading">
                    </div>
                    <div class="quest-card loading">
                    </div>
                    <div class="quest-card loading">
                    </div>
                </div>
            `
        },
        {
            id: 7,
            title: "Favorites",
            url: "favorites",
            body: `
                <div class="categories-container" id="categories-container">
                    <div class="category-container">
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


    if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'user_item_favorites')?.treatment === 1) {
        document.getElementById('shop-tab-7').classList.remove('hidden');
        let favorites;
        try {
            favorites = JSON.parse(localStorage.getItem("favoritesStore"));
            if (!Array.isArray(favorites)) {
                throw new Error("Not an array");
            }
        } catch {
            favorites = [];
            localStorage.setItem("favoritesStore", JSON.stringify(favorites));
        }
    }

    if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'quests_tab')?.treatment === 1 || JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'quests_tab')?.treatment === 2) {
        document.getElementById('shop-tab-6').classList.remove('hidden');
        document.getElementById('quests-sidebar-title').classList.remove('hidden');
    }

    if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'xp_system')?.treatment === 1 && currentUserData && currentUserData.ban_config.ban_type === 0) {
        let xpBalance = document.createElement("div");

        const xpNeeded = currentUserData.xp_information.xp_to_level - currentUserData.xp_information.xp_into_level;
        const nextLevel = currentUserData.xp_information.level + 1;

        xpBalance.classList.add('my-xp-value-container');
        xpBalance.addEventListener("click", () => {
            setModalv3InnerContent('xp_perks');
        });
        xpBalance.classList.add('has-tooltip');
        xpBalance.setAttribute('data-tooltip', 'You need '+xpNeeded.toLocaleString()+' more XP for Level '+nextLevel);

        xpBalance.innerHTML = `
            <div class="bar"></div>
            <p id="my-xp-balance">Level ${currentUserData.xp_information.level}</p>
        `;

        xpBalance.querySelector('.bar').style.width = currentUserData.xp_information.level_percentage+'%';
        
        document.querySelector('.topbar-content').appendChild(xpBalance);

        await fetchAndUpdateXpEvents();
        await fetchAndUpdateXpLevels();
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

    async function openModal(mainClass, type, data1, data2) {
        if (!mainClass || !type) return console.error('Sorry, you are NOT sigma!');

        let categoryModalInfo;
        let firstTimeOpeningModal = true;
        
        openModalsCache += 1;

        // Code to hide the not top most modal
        try {
            const amount = openModalsCache - 1;
            if (!document.querySelector('.open-modal-' + amount).classList.contains('modalv3')) {
                document.querySelector('.open-modal-' + amount).classList.remove('show');
                document.querySelector('.open-back-modal-' + amount).classList.remove('show');
            }
        } catch {}

        let modal = document.createElement("div");
        modal.classList.add(mainClass);
        modal.classList.add('open-modal-' + openModalsCache);

        modal.style.zIndex = 301 + openModalsCache;


        let modal_back = document.createElement("div");
        modal_back.classList.add(mainClass + '-back');
        modal_back.classList.add('open-back-modal-' + openModalsCache);
        modal_back.id = mainClass + '-back';

        modal_back.style.zIndex = 300 + openModalsCache;


        let modal_loading = document.createElement("div");
        modal_loading.classList.add('modal-loading');
        modal_loading.classList.add('open-loading-modal-' + openModalsCache);
        modal_loading.id = 'modal-loading';
        modal_loading.innerHTML = `
            <div class="modal-loading-inner">
                <div class="spinner"></div>
            </div>
        `;

        modal_loading.style.zIndex = 301 + openModalsCache;


        if (type === "fromCollectibleCard") {
            const category = data1;
            const product = data2;

            modal.setAttribute('data-clear-param', 'itemSkuId');
            modal.setAttribute('data-clear-cache', 'currentOpenModalId');

            let logoAsset;
            if (category.full_src && category.logo) {
                logoAsset = category.logo;
            }
            else if (category.logo) {
                logoAsset = `https://cdn.discordapp.com/app-assets/1096190356233670716/${category.logo}.png?size=4096`;
            }

            let pdpAsset;
            if (category.full_src && category.pdp_bg) {
                pdpAsset = category.pdp_bg;
            }
            else if (category.pdp_bg) {
                pdpAsset = `https://cdn.discordapp.com/app-assets/1096190356233670716/${category.pdp_bg}.png?size=4096`;
            }
            else if (category.full_src && category.banner) {
                pdpAsset = category.banner;
            }
            else if (category.banner) {
                pdpAsset = `https://cdn.discordapp.com/app-assets/1096190356233670716/${category.banner}.png?size=4096`;
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
                            <p>Overview</p>
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
                        <div class="has-tooltip" data-tooltip="Share">
                            <svg class="modalv2_top_icon" onclick="copyValue('${baseYapperURL}?page=${currentPageCache}&itemSkuId=${product.sku_id}');" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M21.7 7.3a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L18.58 9H13a7 7 0 0 0-7 7v4a1 1 0 1 1-2 0v-4a9 9 0 0 1 9-9h5.59l-3.3-3.3a1 1 0 0 1 1.42-1.4l5 5Z" class=""></path></svg>
                        </div>
                    </div>
                </div>
            `;
            const modalbuttons = modal.querySelector('[data-modal-top-product-buttons]');

            if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'user_item_favorites')?.treatment === 1) {
                const btn = document.createElement('div');
                btn.classList.add('has-tooltip');
                btn.innerHTML = `
                    <svg class="modalv2_top_icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0L14.6942 8.2918H23.4127L16.3593 13.4164L19.0534 21.7082L12 16.5836L4.94658 21.7082L7.64074 13.4164L0.587322 8.2918H9.30583L12 0Z" fill="currentColor"/></svg>
                `;
                if (JSON.parse(localStorage.getItem("favoritesStore"))[JSON.parse(localStorage.getItem("favoritesStore")).findIndex(i => i.sku_id === product.sku_id)]) {
                    btn.classList.add('fav');
                    btn.setAttribute('data-tooltip', 'Unfavorite');
                } else {
                    btn.setAttribute('data-tooltip', 'Favorite');
                }
                btn.addEventListener("click", () => {
                    if (!btn.classList.contains('fav')) {
                        copyNotice(3);
                        btn.setAttribute('data-tooltip', 'Unfavorite');
                        updateTooltipText('Unfavorite');
                        favorite("add", product);
                        btn.classList.add('fav');
                    } else {
                        copyNotice(4);
                        btn.setAttribute('data-tooltip', 'Favorite');
                        updateTooltipText('Favorite');
                        favorite("remove", product.sku_id);
                        btn.classList.remove('fav');
                    }
                });
                modalbuttons.appendChild(btn);
            }

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
                                <h3 class="modal-item-name">${product.name}</h3>
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
                            <img class="modalv2-right-bg-img"></img>
                            <img class="modalv2-right-logo-img"></img>

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

                    const modalBGImage = modalInner.querySelector('.modalv2-right-bg-img');
                    if (pdpAsset) modalBGImage.src = pdpAsset;
                    else modalBGImage.remove();

                    const modalLogoImage = modalInner.querySelector('.modalv2-right-logo-img');
                    if (logoAsset) modalLogoImage.src = logoAsset;
                    else modalLogoImage.remove();

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
                    const nothingHover = document.querySelector('.something-nobody-is-gonna-hover');

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
                                const effectsCard = new ProfileEffectsCard(profileProfileEffectPreview, profileEffect, nothingHover, {
                                    startImmediately: true
                                });

                                // Store reference for cleanup if needed
                                nothingHover._profileEffectsCard = effectsCard;
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
                                    const effectsCard = new ProfileEffectsCard(profileProfileEffectPreview, profileEffect, nothingHover, {
                                        startImmediately: true
                                    });

                                    // Store reference for cleanup if needed
                                    nothingHover._profileEffectsCard = effectsCard;
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
                                    nothingHover._profileEffectsCard = effectsCard;
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

                            modalInner.querySelector(".modal-item-name").textContent = selectedVariant.base_variant_name;

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
                                        const effectsCard = new ProfileEffectsCard(profileProfileEffectPreview, profileEffect, nothingHover, {
                                            startImmediately: true
                                        });

                                        // Store reference for cleanup if needed
                                        nothingHover._profileEffectsCard = effectsCard;
                                    } else {
                                        // Fallback if profile effect not found
                                        profileProfileEffectPreview.innerHTML = ``;
                                    }
                                } else {
                                    // Fallback if no product ID or cache
                                    profileProfileEffectPreview.innerHTML = ``;
                                }



                                modalPreviewContainer.innerHTML = "";

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
                    modalInner.innerHTML = `
                        <div class="view-raw-modalv2-inner">
                            <textarea class="view-raw-modal-textbox" readonly>${JSON.stringify(product, undefined, 4)}</textarea>
                        </div>
                    `;
                    // const rawOutput = modalInner.querySelector('.view-raw-modalv2-inner');
                    // if (product.type === item_types.PROFILE_EFFECT) {
                    //     let raw = document.createElement('textarea');
                    //     raw.classList.add('view-raw-modal-textbox');
                    //     raw.setAttribute('readonly', 'true');
                    //     raw.innerHTML = JSON.stringify(product, undefined, 4);
                    //     rawOutput.appendChild(raw);
                    // }
                    document.querySelectorAll('.view-raw-modal-textbox').forEach(textbox => {
                        textbox.style.height = 'auto';
                        textbox.style.width = '100%';
                        textbox.style.height = textbox.scrollHeight + 'px';
                    });
                }
            }

            modal.querySelector('#modalv2-tab-1').addEventListener("click", function () {
                changeModalTab('1');
            });
            modal.querySelector('#modalv2-tab-2').addEventListener("click", function () {
                changeModalTab('2');
            });

            changeModalTab('1');

            modal.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
                closeModal();
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        } else if (type === "fromCategoryBanner") {
            const categoryData = data1;
            const modalBanner = data2;

            modal.setAttribute('data-clear-param', 'itemSkuId');
            modal.setAttribute('data-clear-cache', 'currentOpenModalId');

            addParams({itemSkuId: categoryData.sku_id})
        
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
                            <p>Overview</p>
                        </div>
                        <div class="tab" id="category-modal-tab-3">
                            <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path fill="currentColor" d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" class=""></path>
                            </svg>
                            <p>Assets</p>
                        </div>
                        <div class="tab disabled" id="category-modal-tab-4">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill="currentColor" d="M8 3C7.44771 3 7 3.44772 7 4V5C7 5.55228 7.44772 6 8 6H16C16.5523 6 17 5.55228 17 5V4C17 3.44772 16.5523 3 16 3H15.1245C14.7288 3 14.3535 2.82424 14.1002 2.52025L13.3668 1.64018C13.0288 1.23454 12.528 1 12 1C11.472 1 10.9712 1.23454 10.6332 1.64018L9.8998 2.52025C9.64647 2.82424 9.27121 3 8.8755 3H8Z"></path><path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M19 4.49996V4.99996C19 6.65681 17.6569 7.99996 16 7.99996H8C6.34315 7.99996 5 6.65681 5 4.99996V4.49996C5 4.22382 4.77446 3.99559 4.50209 4.04109C3.08221 4.27826 2 5.51273 2 6.99996V19C2 20.6568 3.34315 22 5 22H19C20.6569 22 22 20.6568 22 19V6.99996C22 5.51273 20.9178 4.27826 19.4979 4.04109C19.2255 3.99559 19 4.22382 19 4.49996ZM8 12C7.44772 12 7 12.4477 7 13C7 13.5522 7.44772 14 8 14H16C16.5523 14 17 13.5522 17 13C17 12.4477 16.5523 12 16 12H8ZM7 17C7 16.4477 7.44772 16 8 16H13C13.5523 16 14 16.4477 14 17C14 17.5522 13.5523 18 13 18H8C7.44772 18 7 17.5522 7 17Z"></path>
                            </svg>
                            <p>Reviews</p>
                        </div>
                        <div class="tab hidden disabled" id="category-modal-tab-5">
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
                            <div class="category-modal-quick-info-container">
                                <div class="outer-block">
                                    <p>Prices</p>
                                </div>
                                <div class="outer-block">
                                    <p>Products</p>
                                </div>
                                <div class="outer-block">
                                    <p>Community Rating</p>
                                </div>
                            </div>
                        </div>
                    </div>
        
                    <div data-modal-top-product-buttons>
                        <div class="has-tooltip" data-tooltip="Close" data-close-product-card-button>
                            <svg class="modalv2_top_icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path></svg>
                        </div>
                        <div class="has-tooltip" data-tooltip="Share">
                            <svg class="modalv2_top_icon" onclick="copyValue('${baseYapperURL}?page=${currentPageCache}&itemSkuId=${categoryData.sku_id}');" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M21.7 7.3a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L18.58 9H13a7 7 0 0 0-7 7v4a1 1 0 1 1-2 0v-4a9 9 0 0 1 9-9h5.59l-3.3-3.3a1 1 0 0 1 1.42-1.4l5 5Z" class=""></path></svg>
                        </div>
                    </div>
                </div>
            `;

            const bannerBG = modal.querySelector('.category-modal-banner-preview');
            bannerBG.addEventListener("load", () => {
                if (bannerBG.naturalWidth === 0 || bannerBG.naturalHeight === 0) {
                    bannerBG.remove();
                }
            });
            bannerBG.addEventListener("error", () => {
                bannerBG.remove();
            });
        
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
                            <div class="category-modal-quick-info-container">
                                <div class="outer-block">
                                    <p class="quick-info-prices-title">Prices</p>
                                    <div class="block" id="price-detail-block-container">
                                        <div class="price-titles">
                                            <p>Standard</p>
                                            <p>Nitro</p>
                                        </div>
                                        <div id="price-detail-block">
                                        </div>
                                    </div>
                                </div>
                                <div class="outer-block">
                                    <p>Products</p>
                                    <div class="block">
                                        <div id="products-details-block">

                                        </div>
                                    </div>
                                </div>
                                <div class="outer-block">
                                    <p>Community Rating</p>
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

                        let justACounter = 0;

                        if (standardUS === 0) {
                            justACounter += 1;
                            pricesDetailBlock.querySelector('#standardUS').classList.add('hidden');
                        }
                        if (nitroUS === 0) {
                            justACounter += 1;
                            pricesDetailBlock.querySelector('#nitroUS').classList.add('hidden');
                        }

                        if (standardOrb === 0) {
                            justACounter += 1;
                            pricesDetailBlock.querySelector('#standardOrb').classList.add('hidden');
                        }
                        if (nitroOrb === 0) {
                            justACounter += 1;
                            pricesDetailBlock.querySelector('#nitroOrb').classList.add('hidden');
                        }
                        
                        if (justACounter === 4) {
                            modalInner.querySelector('#price-detail-block-container').innerHTML = `
                                <svg class="there-are-no-prices-here-silly" style="scale: 0.8; margin-right: 0;" width="163" height="78" viewBox="0 0 163 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clip-path="url(#clip0_108_43)">
                                <g clip-path="url(#clip1_108_43)">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M32.0048 7.99975C31.1592 7.88746 30.3043 8.11652 29.6279 8.63663L12.2261 22.0202C11.5499 22.5402 11.1078 23.3087 10.9971 24.1564L8.14938 45.9732C8.03872 46.8209 8.2685 47.6785 8.7882 48.3573L22.1628 65.8274C22.6825 66.5062 23.4496 66.9506 24.2952 67.063L46.0575 69.9525C46.9033 70.0647 47.7581 69.8356 48.4344 69.3157L65.8364 55.932C66.5126 55.4119 66.9546 54.6435 67.0654 53.7958L69.913 31.979C70.0237 31.1312 69.7939 30.2737 69.2741 29.5949L55.8997 12.1248C55.3799 11.446 54.6129 11.0015 53.7673 10.8892L32.0048 7.99975ZM32.0097 16.8906C32.4249 16.1686 33.346 15.9217 34.0666 16.3394L60.9873 31.9371C61.7081 32.3548 61.9556 33.2786 61.5402 34.0007L46.0251 60.969C45.6099 61.6911 44.6888 61.9379 43.9681 61.5202L17.0496 45.9219C16.3289 45.5042 16.0814 44.5804 16.4967 43.8583L32.0097 16.8906Z" fill="currentColor"/>
                                <path d="M36.8859 27.2991C38.1018 29.6301 39.9509 31.5692 42.2188 32.8916C44.4869 34.2143 47.0811 34.8663 49.701 34.7722C49.9576 34.7635 50.2094 34.8422 50.4158 34.9954C50.6222 35.1486 50.7708 35.3674 50.8374 35.6158C50.904 35.8644 50.8847 36.1282 50.7825 36.3641C50.6804 36.6 50.5016 36.7941 50.2751 36.9146C47.9584 38.1288 46.0346 39.9789 44.7286 42.2495C43.4223 44.52 42.7876 47.1171 42.8983 49.7378C42.9075 49.995 42.8295 50.2476 42.677 50.4543C42.5246 50.661 42.3066 50.8097 42.0587 50.8761C41.8109 50.9425 41.548 50.9227 41.3126 50.8199C41.0772 50.7171 40.8833 50.5374 40.7625 50.3101C39.5368 47.9888 37.682 46.0616 35.4122 44.7506C33.1423 43.4396 30.5499 42.7983 27.9343 42.9008C27.678 42.9096 27.426 42.831 27.2196 42.6778C27.0132 42.5246 26.8646 42.3058 26.798 42.0572C26.7314 41.8087 26.7507 41.5449 26.8529 41.3091C26.955 41.0732 27.1339 40.8791 27.3602 40.7584C29.6753 39.531 31.597 37.6733 32.9056 35.3989C34.2139 33.1246 34.8558 30.5253 34.7577 27.8996C34.7451 27.6425 34.8198 27.3888 34.9694 27.1801C35.1193 26.9712 35.3352 26.8196 35.5822 26.75C35.8292 26.6803 36.0926 26.6966 36.3292 26.7964C36.5661 26.8961 36.7624 27.0733 36.8859 27.2991Z" fill="currentColor"/>
                                </g>
                                <path d="M72 57L73.8906 62.1094L79 64L73.8906 65.8906L72 71L70.1094 65.8906L65 64L70.1094 62.1094L72 57Z" fill="currentColor"/>
                                <path d="M11 4L12.3505 7.64955L16 9L12.3505 10.3505L11 14L9.64955 10.3505L6 9L9.64955 7.64955L11 4Z" fill="currentColor"/>
                                <path d="M131.736 47.802C133.401 48.2481 135.175 48.0146 136.668 47.1526C138.161 46.2906 139.25 44.8709 139.696 43.2058C140.143 41.5407 139.909 39.7666 139.047 38.2735C138.185 36.7804 136.765 35.6911 135.1 35.2449C133.435 34.7988 131.661 35.0323 130.168 35.8944C128.675 36.7564 127.586 38.1761 127.139 39.8411C126.693 41.5062 126.927 43.2804 127.789 44.7734C128.651 46.2665 130.071 47.3558 131.736 47.802Z" fill="currentColor"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M115.033 9.68011C114.201 9.45702 113.314 9.57382 112.567 10.0048C111.821 10.4358 111.276 11.1456 111.053 11.9782C110.83 12.8108 110.946 13.6979 111.377 14.4444C111.808 15.1908 112.518 15.7355 113.351 15.9586L122.769 18.4821C123.601 18.7052 124.311 19.2499 124.742 19.9964C125.173 20.7428 125.29 21.6299 125.067 22.4625C124.844 23.2951 124.299 24.0049 123.552 24.436C122.806 24.867 121.919 24.9837 121.086 24.7606L106.96 20.9754C106.127 20.7523 105.24 20.8691 104.494 21.3001C103.747 21.7311 103.202 22.4409 102.979 23.2735C102.756 24.1061 102.873 24.9932 103.304 25.7397C103.735 26.4861 104.445 27.0308 105.277 27.2539L113.125 29.3568C113.958 29.5799 114.668 30.1248 115.099 30.8711C115.53 31.6175 115.647 32.5047 115.424 33.3373C115.201 34.1698 114.656 34.8798 113.909 35.3107C113.163 35.7415 112.276 35.8584 111.443 35.6353L105.165 33.953C104.332 33.7299 103.445 33.8469 102.698 34.2777C101.952 34.7086 101.407 35.4186 101.184 36.2511C100.961 37.0837 101.078 37.9709 101.509 38.7173C101.94 39.4636 102.65 40.0084 103.482 40.2315L107.406 41.283C107.362 46.1451 108.682 50.9223 111.216 55.0717C113.751 59.2214 117.398 62.5771 121.744 64.758C126.089 66.9389 130.96 67.8576 135.801 67.4094C140.643 66.9615 145.262 65.1645 149.134 62.2233C153.006 59.2817 155.975 55.3137 157.705 50.7695C159.434 46.2251 159.855 41.287 158.919 36.5155C157.983 31.7442 155.728 27.3308 152.41 23.7767C149.092 20.2226 144.843 17.6702 140.147 16.4094L115.033 9.68011ZM130.053 54.0805C133.384 54.9729 136.932 54.5058 139.918 52.7817C142.904 51.058 145.083 48.2186 145.975 44.8881C146.867 41.5577 146.4 38.0094 144.676 35.0234C142.952 32.0376 140.113 29.8588 136.783 28.9664C133.452 28.0741 129.904 28.5412 126.918 30.2652C123.932 31.989 121.753 34.8284 120.861 38.1588C119.969 41.4893 120.436 45.0376 122.16 48.0234C123.883 51.0094 126.723 53.1881 130.053 54.0805Z" fill="currentColor"/>
                                <path d="M95.8596 24.7304C96.6922 24.9535 97.5793 24.8367 98.3257 24.4058C99.0722 23.9748 99.6169 23.2649 99.84 22.4323C100.063 21.5998 99.9463 20.7127 99.5153 19.9662C99.0843 19.2197 98.3745 18.675 97.5419 18.4519L95.9723 18.0313C95.1397 17.8083 94.2526 17.9251 93.5061 18.356C92.7596 18.787 92.2149 19.4969 91.9918 20.3294C91.7688 21.162 91.8856 22.0491 92.3165 22.7956C92.7475 23.5421 93.4573 24.0868 94.2899 24.3099L95.8596 24.7304Z" fill="currentColor"/>
                                <path d="M147 67L148.35 70.6495L152 72L148.35 73.3505L147 77L145.65 73.3505L142 72L145.65 70.6495L147 67Z" fill="currentColor"/>
                                <path d="M85 7L86.8906 12.1094L92 14L86.8906 15.8906L85 21L83.1094 15.8906L78 14L83.1094 12.1094L85 7Z" fill="currentColor"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_108_43">
                                <rect width="163" height="78" fill="white"/>
                                </clipPath>
                                <clipPath id="clip1_108_43">
                                <rect width="64" height="64" fill="white" transform="translate(-0.191895 16.3726) rotate(-15)"/>
                                </clipPath>
                                </defs>
                                </svg>

                                <p>This category has no prices.</p>
                            `;
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
                    
                    const reviewsTab = modal.querySelector('#category-modal-tab-4');
                    if (categoryModalInfo.reviews_disabled != true || settingsStore.staff_force_viewable_reviews_tab === 1) {
                        reviewsTab.classList.remove('disabled');
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

                        if (average <= 2.5) {
                            console.log('nah')
                        } else if (average >= 2.6 && average <= 3.4) {
                            console.log('mid')
                        } else if (average >= 3.5) {
                            console.log('yea')
                        }
                          
                    } else {
                        reviewsTab.classList.add('has-tooltip');
                        reviewsTab.setAttribute('data-tooltip', 'Reviews have been disabled for this category');
                    }
        
                } else if (tab === '2') {
                    modalInner.innerHTML = `
                        <div class="view-raw-modalv2-inner">
                            <textarea class="view-raw-modal-textbox" readonly>${JSON.stringify(categoryData, undefined, 4)}</textarea>
                        </div>
                    `;
                    document.querySelectorAll('.view-raw-modal-textbox').forEach(textbox => {
                        textbox.style.height = 'auto';
                        textbox.style.width = '100%';
                        textbox.style.height = textbox.scrollHeight + 'px';
                    });
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
                        "Category Background": categoryData.category_bg,
                        "Condensed Banner Left": categoryData.condensed_banner_left,
                        "Condensed Banner Right": categoryData.condensed_banner_right
                    };

                    let nullAssets = true;

                    const categoryClientDataId = category_client_overrides.findIndex(cat => cat.sku_id === categoryData.sku_id);

                    if (category_client_overrides[categoryClientDataId]?.banner_override__credits) {
                        doTheAssetThing('Banner', category_client_overrides[categoryClientDataId]?.banner_override, category_client_overrides[categoryClientDataId]?.banner_override__credits);
                    } else if (category_client_overrides[categoryClientDataId]?.banner_override) {
                        doTheAssetThing('Banner', category_client_overrides[categoryClientDataId]?.banner_override);
                    }

                    if (category_client_overrides[categoryClientDataId]?.animatedBanner__credits) {
                        doTheAssetThing('Animated Banner', category_client_overrides[categoryClientDataId]?.animatedBanner, category_client_overrides[categoryClientDataId]?.animatedBanner__credits);
                    } else if (category_client_overrides[categoryClientDataId]?.animatedBanner) {
                        doTheAssetThing('Animated Banner', category_client_overrides[categoryClientDataId]?.animatedBanner);
                    }

                    if (category_client_overrides[categoryClientDataId]?.heroBanner?.animationSource__credits) {
                        doTheAssetThing('Animated Hero Banner', category_client_overrides[categoryClientDataId]?.modal_hero_banner, category_client_overrides[categoryClientDataId]?.heroBanner?.animationSource__credits);
                    } else if (category_client_overrides[categoryClientDataId]?.heroBanner?.animationSource) {
                        doTheAssetThing('Animated Hero Banner', category_client_overrides[categoryClientDataId]?.heroBanner?.animationSource);
                    }

                    if (category_client_overrides[categoryClientDataId]?.modal_hero_banner__credits) {
                        doTheAssetThing('Modal Banner', category_client_overrides[categoryClientDataId]?.modal_hero_banner, category_client_overrides[categoryClientDataId]?.modal_hero_banner__credits);
                    } else if (category_client_overrides[categoryClientDataId]?.modal_hero_banner) {
                        doTheAssetThing('Modal Banner', category_client_overrides[categoryClientDataId]?.modal_hero_banner);
                    }

                    function doTheAssetThing(asset, value, credits = null) {
                        nullAssets = false;

                        let assetDiv = document.createElement("div");

                        assetDiv.classList.add('asset-div')

                        if (value.includes(".webm")) {
                            assetDiv.innerHTML = `
                                <h2>${asset}</h2>
                                <p>This video is built into the client and overrides the existing asset or acts as an alternative.</p>
                                <div class="credits"></div>
                                <video disablepictureinpicture autoplay muted loop src="${value}"></video> 
                            `;
                            if (credits) {
                                const userIndex = user_preview_usernames.findIndex(user => user.id === credits);
                                assetDiv.querySelector('.credits').innerHTML = `
                                    <p>This asset was made by </p>
                                    <div class="mention" onclick="openModal('user-modal', 'openUserModal', '${credits}');">@${user_preview_usernames[userIndex].name}</div>
                                `;
                            } else {
                                assetDiv.querySelector('.credits').remove();
                            }
                        } else if (value.includes(".png") || value.includes(".jpg")) {
                            assetDiv.innerHTML = `
                                <h2>${asset}</h2>
                                <p>This image is built into the client and overrides the existing asset or acts as an alternative.</p>
                                <div class="credits"></div>
                                <img src="${value}"></img> 
                            `;
                            if (credits) {
                                const userIndex = user_preview_usernames.findIndex(user => user.id === credits);
                                assetDiv.querySelector('.credits').innerHTML = `
                                    <p>This asset was made by </p>
                                    <div class="mention" onclick="openModal('user-modal', 'openUserModal', '${credits}');">@${user_preview_usernames[userIndex].name}</div>
                                `;
                            } else {
                                assetDiv.querySelector('.credits').remove();
                            }
                        }

                        assetsContainer.appendChild(assetDiv);
                    }

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
                        if (isMobileCache) {
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
                                    <h3>Can't submit reviews on this platform.</h3>
                                    <p>Open Shop Archives on a desktop device to submit reviews.</p>
                                </div>
                            `;
                        } else if (currentUserData) {

                            let hasReviewAlready;

                            categoryModalInfo.reviews.forEach(review => {
                                if (review.user.id === currentUserData.id) {
                                    hasReviewAlready = true;
                                }
                            });

                            if (currentUserData.ban_config.ban_type >= 1 || settingsStore.staff_simulate_ban_type_1 === 1 || settingsStore.staff_simulate_ban_type_2 === 1 || currentUserData.types.guidelines_block === true || settingsStore.staff_simulate_guidelines_block === 1 || currentUserData.types.suspicious_account === true || settingsStore.staff_simulate_sus_block === 1) {

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

                                if (currentUserData.types.guidelines_block === true || settingsStore.staff_simulate_guidelines_block === 1) {
                                    banTitle = 'You cannot submit reviews.';
                                    banDisclaimer = `
                                        <p>Your username violates our</p>
                                        <a class="link" href="https://yapper.shop/legal-information/?page=tos">Community Guidelines,</a>
                                        <p>all your reviews have been temporarily hidden from the public.</p>
                                    `;
                                    appealable = false;
                                }

                                if (currentUserData.types.suspicious_account === true || settingsStore.staff_simulate_sus_block === 1) {
                                    banTitle = 'You cannot submit reviews.';
                                    banDisclaimer = `
                                        <p>Suspicious activity has been detected on your account, you cannot submit review temporarily.</p>
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
                                if (currentUserData.xp_information.level >= 3 || currentUserData.user_features.includes("REVIEW_200_CHAR")) {
                                    maxLength = 200;
                                    counter.classList.add('has-tooltip');
                                    counter.setAttribute('data-tooltip', 'Review length limit extended thanks to XP!');
                                }

                                if (currentUserData.xp_information.level >= 5 || currentUserData.user_features.includes("REVIEW_300_CHAR")) {
                                    maxLength = 300;
                                    counter.classList.add('has-tooltip');
                                    counter.setAttribute('data-tooltip', 'Review length limit extended thanks to XP!');
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
            
                                if (review.types.flag != 0 && review.user.id != currentUserData?.id && settingsStore.reviews_filter_setting === 1) {
                                    reviewDiv.innerHTML = `
                                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M1.3 21.3a1 1 0 1 0 1.4 1.4l20-20a1 1 0 0 0-1.4-1.4l-20 20ZM3.16 16.05c.18.24.53.26.74.05l.72-.72c.18-.18.2-.45.05-.66a15.7 15.7 0 0 1-1.43-2.52.48.48 0 0 1 0-.4c.4-.9 1.18-2.37 2.37-3.72C7.13 6.38 9.2 5 12 5c.82 0 1.58.12 2.28.33.18.05.38 0 .52-.13l.8-.8c.25-.25.18-.67-.15-.79A9.79 9.79 0 0 0 12 3C4.89 3 1.73 10.11 1.11 11.7a.83.83 0 0 0 0 .6c.25.64.9 2.15 2.05 3.75Z" class=""></path>
                                            <path fill="currentColor" d="M8.18 10.81c-.13.43.36.65.67.34l2.3-2.3c.31-.31.09-.8-.34-.67a4 4 0 0 0-2.63 2.63ZM12.85 15.15c-.31.31-.09.8.34.67a4.01 4.01 0 0 0 2.63-2.63c.13-.43-.36-.65-.67-.34l-2.3 2.3Z" class=""></path>
                                            <path fill="currentColor" d="M9.72 18.67a.52.52 0 0 0-.52.13l-.8.8c-.25.25-.18.67.15.79 1.03.38 2.18.61 3.45.61 7.11 0 10.27-7.11 10.89-8.7a.83.83 0 0 0 0-.6c-.25-.64-.9-2.15-2.05-3.75a.49.49 0 0 0-.74-.05l-.72.72a.51.51 0 0 0-.05.66 15.7 15.7 0 0 1 1.43 2.52c.06.13.06.27 0 .4-.4.9-1.18 2.37-2.37 3.72C16.87 17.62 14.8 19 12 19c-.82 0-1.58-.12-2.28-.33Z" class=""></path>
                                        </svg>
                                        <p class="review-text-content">This review has been censored due to inappropriate content.</p>
                                        <div style="flex: 1;"></div>
                                        <button class="generic-button brand">
                                            Show
                                        </button>
                                    `;
                                    reviewDiv.style.display = 'inline-flex';
                                    reviewDiv.style.gap = '3px';
                                    reviewDiv.style.alignItems = 'center';
                                    reviewDiv.querySelector('.generic-button').addEventListener("click", function () {
                                        revealReview();
                                        reviewDiv.style.display = 'unset';
                                        reviewDiv.style.alignItems = 'unset';
                                    });
                                    if (!currentUserData) reviewDiv.querySelector('.generic-button').remove();
                                } else {
                                    revealReview();
                                }

                                function revealReview() {
                                    if (review.types.system != 0) {
                                        const type = reviews_system_types.find(type => type.id === review.types.system).codename;
                                        reviewDiv.style.backgroundColor = `var(--bg-feedback-${type})`;
                                        reviewDiv.classList.add(`bg-feedback-${type}`);
                                    }
                                    reviewDiv.innerHTML = `
                                        <div class="shop-modal-review-moderation-buttons"></div>
                                        <div class="review-nameplate-container"></div>
                                        <div class="review-banner-container"></div>
                                        <div class="review-user-container">
                                            <div class="review-avatar-container">
                                                <img class="review-avatar" src="https://cdn.yapper.shop/assets/31.png" onerror="this.parentElement.remove();">
                                                <img class="review-avatar-decoration" src="https://cdn.yapper.shop/assets/31.png">
                                            </div>

                                            <p class="review-user-display-name"></p>

                                            <div class="review-system-tag-container has-tooltip" data-tooltip="Official Shop Archives Message">
                                                <p class="review-system-tag">SYSTEM</p>
                                            </div>

                                            <div class="review-server-tag-container">
                                                <img class="server-tag-img" src="https://cdn.yapper.shop/assets/31.png">
                                                <p class="server-tag-title"></p>
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

                                    reviewDiv.querySelector('.review-user-display-name').classList.add('clickable');
                                    reviewDiv.querySelector('.review-user-display-name').addEventListener("click", function () {
                                        openModal('user-modal', 'openUserModal', review.user.id);
                                    });

                                    const date = new Date(review.created_at);

                                    const day = String(date.getDate()).padStart(2, '0');
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
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

                                    if (review.text.length > 100 && JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'xp_system')?.treatment === 1) {
                                        let xpReviewIcon = document.createElement("div");

                                        xpReviewIcon.style.height = '20px';
                                        xpReviewIcon.classList.add('rawicon');
                                        xpReviewIcon.classList.add('clickable');
                                        xpReviewIcon.addEventListener("click", function () {
                                            closeModal();
                                            setModalv3InnerContent('xp_perks');
                                        });
                                        xpReviewIcon.innerHTML = `
                                            <svg class="has-tooltip" data-tooltip="This user unlocked extended reviews with an XP Perk!" width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                            </svg>
                                        `;

                                        reviewDiv.querySelector(".review-user-container").appendChild(xpReviewIcon);
                                    }

                                    if (review.types.flag != 0 && review.user.id === currentUserData?.id) {
                                        let hiddenReviewIcon = document.createElement("div");

                                        hiddenReviewIcon.style.height = '20px';
                                        hiddenReviewIcon.classList.add('rawicon');
                                        hiddenReviewIcon.innerHTML = `
                                            <svg class="has-tooltip" data-tooltip="This review has been flagged as inappropriate and may be hidden to some users" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M1.3 21.3a1 1 0 1 0 1.4 1.4l20-20a1 1 0 0 0-1.4-1.4l-20 20ZM3.16 16.05c.18.24.53.26.74.05l.72-.72c.18-.18.2-.45.05-.66a15.7 15.7 0 0 1-1.43-2.52.48.48 0 0 1 0-.4c.4-.9 1.18-2.37 2.37-3.72C7.13 6.38 9.2 5 12 5c.82 0 1.58.12 2.28.33.18.05.38 0 .52-.13l.8-.8c.25-.25.18-.67-.15-.79A9.79 9.79 0 0 0 12 3C4.89 3 1.73 10.11 1.11 11.7a.83.83 0 0 0 0 .6c.25.64.9 2.15 2.05 3.75Z" class=""></path>
                                                <path fill="currentColor" d="M8.18 10.81c-.13.43.36.65.67.34l2.3-2.3c.31-.31.09-.8-.34-.67a4 4 0 0 0-2.63 2.63ZM12.85 15.15c-.31.31-.09.8.34.67a4.01 4.01 0 0 0 2.63-2.63c.13-.43-.36-.65-.67-.34l-2.3 2.3Z" class=""></path>
                                                <path fill="currentColor" d="M9.72 18.67a.52.52 0 0 0-.52.13l-.8.8c-.25.25-.18.67.15.79 1.03.38 2.18.61 3.45.61 7.11 0 10.27-7.11 10.89-8.7a.83.83 0 0 0 0-.6c-.25-.64-.9-2.15-2.05-3.75a.49.49 0 0 0-.74-.05l-.72.72a.51.51 0 0 0-.05.66 15.7 15.7 0 0 1 1.43 2.52c.06.13.06.27 0 .4-.4.9-1.18 2.37-2.37 3.72C16.87 17.62 14.8 19 12 19c-.82 0-1.58-.12-2.28-.33Z" class=""></path>
                                            </svg>
                                        `;

                                        reviewDiv.querySelector(".review-user-container").appendChild(hiddenReviewIcon);
                                    } else if (review.types.flag != 0) {
                                        let hiddenReviewIcon = document.createElement("div");

                                        hiddenReviewIcon.style.height = '20px';
                                        hiddenReviewIcon.classList.add('rawicon');
                                        hiddenReviewIcon.innerHTML = `
                                            <svg class="has-tooltip" data-tooltip="This review has been flagged as inappropriate" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M1.3 21.3a1 1 0 1 0 1.4 1.4l20-20a1 1 0 0 0-1.4-1.4l-20 20ZM3.16 16.05c.18.24.53.26.74.05l.72-.72c.18-.18.2-.45.05-.66a15.7 15.7 0 0 1-1.43-2.52.48.48 0 0 1 0-.4c.4-.9 1.18-2.37 2.37-3.72C7.13 6.38 9.2 5 12 5c.82 0 1.58.12 2.28.33.18.05.38 0 .52-.13l.8-.8c.25-.25.18-.67-.15-.79A9.79 9.79 0 0 0 12 3C4.89 3 1.73 10.11 1.11 11.7a.83.83 0 0 0 0 .6c.25.64.9 2.15 2.05 3.75Z" class=""></path>
                                                <path fill="currentColor" d="M8.18 10.81c-.13.43.36.65.67.34l2.3-2.3c.31-.31.09-.8-.34-.67a4 4 0 0 0-2.63 2.63ZM12.85 15.15c-.31.31-.09.8.34.67a4.01 4.01 0 0 0 2.63-2.63c.13-.43-.36-.65-.67-.34l-2.3 2.3Z" class=""></path>
                                                <path fill="currentColor" d="M9.72 18.67a.52.52 0 0 0-.52.13l-.8.8c-.25.25-.18.67.15.79 1.03.38 2.18.61 3.45.61 7.11 0 10.27-7.11 10.89-8.7a.83.83 0 0 0 0-.6c-.25-.64-.9-2.15-2.05-3.75a.49.49 0 0 0-.74-.05l-.72.72a.51.51 0 0 0-.05.66 15.7 15.7 0 0 1 1.43 2.52c.06.13.06.27 0 .4-.4.9-1.18 2.37-2.37 3.72C16.87 17.62 14.8 19 12 19c-.82 0-1.58-.12-2.28-.33Z" class=""></path>
                                            </svg>
                                        `;

                                        reviewDiv.querySelector(".review-user-container").appendChild(hiddenReviewIcon);
                                    }

                                    if (review.types.pinned === true) {
                                        let pinnedReviewIcon = document.createElement("div");

                                        pinnedReviewIcon.style.height = '20px';
                                        pinnedReviewIcon.classList.add('rawicon');
                                        pinnedReviewIcon.innerHTML = `
                                            <svg class="has-tooltip" data-tooltip="This review is pinned" x="0" y="0" class="icon__9293f" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M19.38 11.38a3 3 0 0 0 4.24 0l.03-.03a.5.5 0 0 0 0-.7L13.35.35a.5.5 0 0 0-.7 0l-.03.03a3 3 0 0 0 0 4.24L13 5l-2.92 2.92-3.65-.34a2 2 0 0 0-1.6.58l-.62.63a1 1 0 0 0 0 1.42l9.58 9.58a1 1 0 0 0 1.42 0l.63-.63a2 2 0 0 0 .58-1.6l-.34-3.64L19 11l.38.38ZM9.07 17.07a.5.5 0 0 1-.08.77l-5.15 3.43a.5.5 0 0 1-.63-.06l-.42-.42a.5.5 0 0 1-.06-.63L6.16 15a.5.5 0 0 1 .77-.08l2.14 2.14Z" class=""></path>
                                            </svg>
                                        `;

                                        reviewDiv.querySelector(".review-user-container").appendChild(pinnedReviewIcon);
                                    }
    
                                    if (review.user.avatar) {
    
                                        const avatarPreview = reviewDiv.querySelector('.review-avatar');
                                        const container = reviewDiv.querySelector('.review-avatar-container');
    
                                        avatarPreview.src = 'https://cdn.discordapp.com/avatars/'+review.user.id+'/'+review.user.avatar+'.webp?size=128';

                                        avatarPreview.addEventListener("load", () => {
                                            if (avatarPreview.naturalWidth === 0 || avatarPreview.naturalHeight === 0) {
                                                container.remove();
                                            }
                                        });
                                        
                                        avatarPreview.addEventListener("error", () => {
                                            container.remove();
                                        });
    
                                        if (review.user.avatar.includes('a_')) {
                                            reviewDiv.addEventListener("mouseenter", () => {
                                                avatarPreview.src = 'https://cdn.discordapp.com/avatars/'+review.user.id+'/'+review.user.avatar+'.gif?size=128';
                                            });
                                            reviewDiv.addEventListener("mouseleave", () => {
                                                avatarPreview.src = 'https://cdn.discordapp.com/avatars/'+review.user.id+'/'+review.user.avatar+'.webp?size=128';
                                            });
                                        }
    
                                    } else {
                                        reviewDiv.querySelector('.review-avatar-container').remove();
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
    
                                    const serverTagAsset = reviewDiv.querySelector('.review-server-tag-container');
    
                                    if (review.user.primary_guild) {
    
                                        serverTagAsset.querySelector('.server-tag-img').src = `https://cdn.discordapp.com/clan-badges/${review.user.primary_guild.identity_guild_id}/${review.user.primary_guild.badge}.png?size=24`;
    
                                        serverTagAsset.querySelector('.server-tag-title').textContent = review.user.primary_guild.tag;
    
                                    } else {
                                        serverTagAsset.remove();
                                    }
    
                                    const userBadgesElement = reviewDiv.querySelector('.review-badges-container-container');
                                    const userBadgesInnerElement = reviewDiv.querySelector('.review-badges-container');
    
                                    if (Array.isArray(review.user.badges) && review.user.badges.length != 0) {
                                        review.user.badges.forEach(badge => {
                                            const badgeImg = document.createElement("img");
                                            badgeImg.src = `https://cdn.yapper.shop/assets/badges/${badge.id}.png`;
                                            badgeImg.setAttribute('data-tooltip', badge.name);
                                            badgeImg.classList.add("badge");
                                            badgeImg.classList.add("has-tooltip");

                                            if (badge.redirect) {
                                                const badgeLink = document.createElement("a");
                                                badgeLink.href = badge.redirect;
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
                                    
                                    reviewDiv.querySelector('.review-text-content').textContent = review.text;

                                    const displayName = reviewDiv.querySelector('.review-user-display-name');
                                    displayName.textContent = review.user.global_name ? review.user.global_name : review.user.username;
                                    if (review.user.display_name_styles && JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'display_name_style_render')?.treatment === 1) {
                                        const dns = renderDisplayNameStyle(review.user.display_name_styles);
                                        displayName.classList.add(dns.class);
                                        Object.assign(displayName.style, dns.style);

                                        if (review.user.display_name_styles.effect_id === 2) {
                                            displayName.classList.add('dns-gradient-type-2');
                                        }
                                    }
                                }
                                
                                if (review.types.pinned === true) {
                                    reviewsContainer.insertBefore(reviewDiv, reviewsContainer.firstChild);
                                } else {
                                    reviewsContainer.appendChild(reviewDiv);
                                }
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
                            } else if (isMobileCache) {
                                reviewDiv.querySelector('.review-text-content').textContent = 'This category currently has no reviews. Open Shop Archives on a desktop device to submit reviews!';
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
                        let promoCard = document.createElement("div");

                        if (promo.category_data?.sku_id === categoryData.sku_id && promo.already_claimed != true) {

                            promoCard.classList.add('category-modal-xp-reward');
                            promoCard.classList.add('unclaimed');

                            promoCard.innerHTML = `
                                <div id="xp-event-expires-at"></div>
                                <h3>Claim your free ${promo.xp_reward.toLocaleString()} XP!</h3>
                                <p class="desc">You have ${promo.xp_reward.toLocaleString()} XP waiting for you.</p>
                                <button id="claim-xp-button">
                                    Claim
                                    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                    </svg>
                                    ${promo.xp_reward.toLocaleString()}
                                </button>
                            `;

                            promoCard.querySelector('#claim-xp-button').addEventListener('click', () => {
                                openModal('modalv2', 'xpRedeem', promo.claimable_id, changeModalTab);
                            });

                            const expiresAt = new Date(promo.expires_at);
                    
                            if (promo.expires_at && !isNaN(expiresAt.getTime())) {
                            
                                function updateTimer() {
                                    const now = new Date();
                                    const timeDiff = expiresAt - now;
                                
                                    if (timeDiff <= 0) {
                                        if (settingsStore.staff_show_unpublished_xp_events) {
                                            promoCard.querySelector('#xp-event-expires-at').innerHTML = `
                                                <p class="xp-event-expires-at-text">EXPIRED</p>
                                            `;
                                        } else {
                                            promoCard.classList.remove('unclaimed');
                                            promoCard.innerHTML = `
                                                <div id="xp-event-expires-at">
                                                    <p class="xp-event-expires-at-text">EXPIRED</p>
                                                </div>
                                                <h3>Event Expired!</h3>
                                                <p class="desc">You missed out on ${promo.xp_reward.toLocaleString()} XP.</p>
                                            `;
                                        }
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

                            modalInner.querySelector('.category-modal-xp-rewards-container').appendChild(promoCard)
                        } else if (promo.category_data?.sku_id === categoryData.sku_id && promo.already_claimed === true) {

                            promoCard.classList.add('category-modal-xp-reward');

                            promoCard.innerHTML = `
                                <div id="xp-event-expires-at"></div>
                                <h3>Already Claimed.</h3>
                                <p class="desc">You already claimed this event reward for ${promo.xp_reward.toLocaleString()} XP.</p>
                            `;

                            const expiresAt = new Date(promo.expires_at);
                    
                            if (promo.expires_at && !isNaN(expiresAt.getTime())) {
                            
                                function updateTimer() {
                                    const now = new Date();
                                    const timeDiff = expiresAt - now;
                                
                                    if (timeDiff <= 0) {
                                        if (settingsStore.staff_show_unpublished_xp_events) {
                                            promoCard.querySelector('#xp-event-expires-at').innerHTML = `
                                                <p class="xp-event-expires-at-text">EXPIRED</p>
                                            `;
                                        } else {
                                            promoCard.innerHTML = `
                                                <div id="xp-event-expires-at">
                                                    <p class="xp-event-expires-at-text">EXPIRED</p>
                                                </div>
                                                <h3>Event Expired!</h3>
                                                <p class="desc">You already claimed this event reward for ${promo.xp_reward.toLocaleString()} XP.</p>
                                            `;
                                        }
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

            modal.querySelector('#category-modal-tab-1').addEventListener("click", function () {
                // Overview
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
            

            document.body.appendChild(modal);

            document.body.appendChild(modal_back);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_back.classList.add('show');
                });
            });

            document.body.appendChild(modal_loading);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_loading.classList.add('show');
                });
            });


            if (!categoryModalInfo) {
                await fetchCategoryData();
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
                const xpRewardsTab = modal.querySelector('#category-modal-tab-5');
                const hasMatchingPromo = usersXPEventsCache.some(promo =>
                    promo.category_data?.sku_id === categoryData.sku_id
                );
            
                if (hasMatchingPromo) {
                    xpRewardsTab.classList.remove('disabled');
                    xpRewardsTab.classList.remove('has-tooltip');
                    xpRewardsTab.removeAttribute('data-tooltip');
                    xpRewardsTab.addEventListener("click", function () {
                        changeModalTab('5');
                    });
                } else {
                    xpRewardsTab.classList.add('has-tooltip');
                    xpRewardsTab.setAttribute('data-tooltip', 'There are currently no XP rewards for this category');
                }
            }
        
            changeModalTab('1');

            firstTimeOpeningModal = false;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            });


            modal.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
                closeModal();
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        } else if (type === "userSettings") {

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
                                <div class="keybind_c2b141 remove-on-mobile" aria-hidden="true">ESC</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            modal.querySelector("#modalv3-side-tabs-container").innerHTML = `
                <div class="remove-on-mobile">
                    <div class="side-tabs-category-text-container">
                        <p>USER SETTINGS</p>
                    </div>

                    <div class="side-tabs-button" id="modal-v3-tab-account" onclick="setModalv3InnerContent('account')">
                        <p>Account</p>
                    </div>
                </div>

                <hr class="remove-on-mobile">

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

            if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'xp_system')?.treatment === 1&& currentUserData && currentUserData.ban_config.ban_type === 0) {
                modal.querySelector("#xp-rewards-tabs-modalv3-container").innerHTML = `
                    <hr>
                    <div class="side-tabs-category-text-container">
                        <p>XP PERKS</p>
                    </div>

                    <div class="side-tabs-button" id="modal-v3-tab-xp_events" onclick="setModalv3InnerContent('xp_events')">
                        <p>Events</p>
                    </div>
                    <div class="side-tabs-button" id="modal-v3-tab-xp_perks" onclick="setModalv3InnerContent('xp_perks')">
                        <p>Levels</p>
                    </div>
                `;
            }

            if (settingsStore.dev === 1) {
                modal.querySelector("#staff-options-modalv3-container").innerHTML = `
                    <hr>
                    <div class="side-tabs-category-text-container">
                        <p>DEVELOPER ONLY</p>
                    </div>

                    <div class="side-tabs-button" id="modal-v3-tab-experiments" onclick="setModalv3InnerContent('experiments')">
                        <p>Experiments</p>
                    </div>

                    <div class="side-tabs-button" id="modal-v3-tab-modal_testing" onclick="setModalv3InnerContent('modal_testing')">
                        <p>Modal Testing</p>
                    </div>
                `;
            }

            document.body.appendChild(modal);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            });

            if (isMobileCache) {
                setModalv3InnerContent('appearance');
            } else {
                setModalv3InnerContent('account');
            }

            document.querySelector("[data-discord-like-settings-close-button]").addEventListener('click', (event) => {
                closeModal();
            });
        } else if (type === "xpRedeem") {
            const claimableId = data1;
            const changeModalTab = data2;

            document.body.appendChild(modal_back);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_back.classList.add('show');
                });
            });

            document.body.appendChild(modal_loading);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_loading.classList.add('show');
                });
            });


            let methodAndHeaders = {
                method: 'GET'
            };

            if (localStorage.token) {
                methodAndHeaders = {
                    method: 'GET',
                    headers: {
                        "Authorization": localStorage.token
                    }
                };
            }

            const dataClaimable = await fetch(redneredAPI + endpoints.CLAIMABLES_PUBLISHED + claimableId,
                methodAndHeaders
            );

            if (!dataClaimable.ok) {
                closeModal();

                if (modal_loading) modal_loading.classList.remove('show');
                setTimeout(() => {
                    if (modal_loading) modal_loading.remove();
                }, 300);

                return
            }

            const data = await dataClaimable.json();

            if (data.message) {
                console.error(data.message);
                closeModal();

                if (modal_loading) modal_loading.classList.remove('show');
                setTimeout(() => {
                    if (modal_loading) modal_loading.remove();
                }, 300);
                
                return
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
                            Claim
                            <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                            </svg>
                            ${data.xp_reward.toLocaleString()}
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
                await fetchAndUpdateUserInfo();
                await updateXpLevelBar();
                try {
                    refreshXPEventsList();
                } catch {
                }
                try {
                    changeModalTab('5');
                } catch {
                }
                closeModal();
            });

            document.body.appendChild(modal);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            });


            modal.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
                closeModal();
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

        } else if (type === "xpClaim") {
            const claimableId = data1;
            const changeModalTab = data2;

            document.body.appendChild(modal_back);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_back.classList.add('show');
                });
            });

            document.body.appendChild(modal_loading);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_loading.classList.add('show');
                });
            });


            let methodAndHeaders = {
                method: 'GET'
            };

            if (localStorage.token) {
                methodAndHeaders = {
                    method: 'GET',
                    headers: {
                        "Authorization": localStorage.token
                    }
                };
            }

            const dataClaimable = await fetch(redneredAPI + endpoints.CLAIMABLES_PUBLISHED + claimableId,
                methodAndHeaders
            );

            if (!dataClaimable.ok) {
                closeModal();

                if (modal_loading) modal_loading.classList.remove('show');
                setTimeout(() => {
                    if (modal_loading) modal_loading.remove();
                }, 300);

                return
            }

            const data = await dataClaimable.json();

            if (data.message) {
                console.error(data.message);
                closeModal();

                if (modal_loading) modal_loading.classList.remove('show');
                setTimeout(() => {
                    if (modal_loading) modal_loading.remove();
                }, 300);
                
                return
            }
            

            let disclaimer2 = "";

            if (data.id === 2) {
                disclaimer2 = "Once you've claimed this item, your Discord server tag will be applied to all your existing and future reviews. Note that if you don't have a Discord server tag applied on your profile, this item is useless."
            } else if (data.id === 4) {
                disclaimer2 = "Once you've claimed this item, you'll be able to write reviews with up to 200 characters."
            } else if (data.id === 5) {
                disclaimer2 = "Once you've claimed this item, your Discord avatar decoration will be applied to all your existing and future reviews. Note that if you don't have a Discord avatar decoration applied on your profile, this item is useless."
            } else if (data.id === 19) {
                disclaimer2 = "Once you've claimed this item, your Discord nameplate will be applied to all your existing and future reviews. Note that if you don't have a Discord nameplate applied on your profile, this item is useless."
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
                            <div class="disclaimer2">
                                <p>${disclaimer2}</p>
                            </div>
                            <p class="redeem-xp-error-output"></p>
                            <button class="claim-xp-perk-button" id="claim-xp-button">
                                Claim for
                                <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                </svg>
                                ${data.xp_price.toLocaleString()}
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
                await fetchAndUpdateUserInfo();
                try {
                    changeModalTab('5');
                } catch {
                }
                try {
                    refreshXPEventsList();
                } catch {
                }
                closeModal();
            });

            document.body.appendChild(modal);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            });


            modal.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
                closeModal();
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

        } else if (type === "openUserModal") {
            const userID = data1;
            let cacheUserData;
            let firstTimeOpeningModal = true;


            document.body.appendChild(modal_loading);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_loading.classList.add('show');
                });
            });


            document.body.appendChild(modal_back);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_back.classList.add('show');
                });
            });

            let methodAndHeaders = {
                method: "GET"
            };

            if (hasDroveAdminPanelPlugin) {
                methodAndHeaders = {
                    method: "GET",
                    headers: {
                        "Authorization": localStorage.token
                    }
                };
            }

            apiUrl = new URL(redneredAPI + endpoints.USERS + userID);
            if (hasDroveAdminPanelPlugin) {
                apiUrl.searchParams.append("include-debug-info", "true");
            }
            const rawUserData = await fetch(apiUrl,
                methodAndHeaders
            );

            if (!rawUserData.ok) {
                closeModal();

                if (modal_loading) modal_loading.classList.remove('show');
                setTimeout(() => {
                    if (modal_loading) modal_loading.remove();
                }, 300);

                return
            }

            const data = await rawUserData.json();

            if (data.message) {
                console.error(data);
                closeModal();

                if (modal_loading) modal_loading.classList.remove('show');
                setTimeout(() => {
                    if (modal_loading) modal_loading.remove();
                }, 300);

                return
            } else {
                cacheUserData = data;
            }

        
            modal.innerHTML = `
                <div class="user-modal-inner">
                    <div class="modalv2-tabs-container">
                        <div class="tab selected" id="user-modal-tab-1">
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
                            <p>Profile</p>
                        </div>
                        <div class="tab" id="user-modal-tab-3">
                            <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path fill="currentColor" d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" class=""></path>
                            </svg>
                            <p>Edit</p>
                        </div>
                        <div class="tab" id="user-modal-tab-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.7376 3.18925C15.4883 2.93731 15.0814 2.93686 14.8316 3.18824L14.0087 4.01625C13.7618 4.26471 13.7614 4.66581 14.0078 4.91476L20.3804 11.3527C20.6265 11.6013 20.6265 12.0017 20.3804 12.2503L14.0078 18.6882C13.7614 18.9373 13.7618 19.3383 14.0087 19.5867L14.8316 20.4148C15.0814 20.6662 15.4883 20.6658 15.7376 20.4138L23.815 12.2503C24.061 12.0016 24.061 11.6014 23.815 11.3528L15.7376 3.18925Z" fill="currentColor"/>
                                <path d="M9.99171 4.91476C10.2381 4.66581 10.2377 4.26471 9.99081 4.01625L9.16787 3.18824C8.91804 2.93686 8.51118 2.93731 8.2619 3.18925L0.184466 11.3528C-0.0614893 11.6014 -0.061488 12.0016 0.184466 12.2503L8.2619 20.4138C8.51118 20.6658 8.91803 20.6662 9.16787 20.4148L9.99081 19.5867C10.2377 19.3383 10.2381 18.9373 9.99171 18.6882L3.61906 12.2503C3.37298 12.0017 3.37298 11.6013 3.61906 11.3527L9.99171 4.91476Z" fill="currentColor"/>
                            </svg>
                            <p>Raw</p>
                        </div>
                    </div>

                    <img class="user-modal-banner-preview">
                    
                    <div id="user-modal-inner-content">
                    </div>
        
                    <div data-modal-top-product-buttons>
                        <div class="has-tooltip" data-tooltip="Close" data-close-product-card-button>
                            <svg class="modalv2_top_icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path></svg>
                        </div>
                    </div>

                    <textarea id="always-existing-user-json" style="display: none;"></textarea>
                </div>
            `;

            if (cacheUserData.banner) {
                const bannerBG = modal.querySelector('.user-modal-banner-preview');
                bannerBG.src = `https://cdn.discordapp.com/banners/${cacheUserData.id}/${cacheUserData.banner}.png?size=480`;
                bannerBG.addEventListener("load", () => {
                    if (bannerBG.naturalWidth === 0 || bannerBG.naturalHeight === 0) {
                        bannerBG.remove();
                    }
                });
                bannerBG.addEventListener("error", () => {
                    bannerBG.remove();
                });
            }
        
            function changeModalTab(tab) {
                modal.querySelectorAll('.selected').forEach((el) => {
                    el.classList.remove("selected");
                });
        
                modal.querySelector('#user-modal-tab-'+tab).classList.add('selected');
        
                const modalInner = modal.querySelector('#user-modal-inner-content');
        
                if (tab === '1') {
                    modalInner.innerHTML = `
                        <div class="user-modal-bottom-container">
                            <div class="user-modal-part1">
                                <div class="xp-card-nameplate-container"></div>
                                <div class="user-modal-avatar-preview">
                                    <img class="avatar">
                                    <img class="deco">
                                </div>
                                <div class="sub">
                                    <div class="user-display-name-container">
                                        <h1 id="users-displayname"></h1>
                                        <div class="review-system-tag-container has-tooltip" data-tooltip="Official Shop Archives Account">
                                            <p class="review-system-tag">SYSTEM</p>
                                        </div>
                                        <div class="review-server-tag-container">
                                            <img class="server-tag-img" src="https://cdn.yapper.shop/assets/31.png">
                                            <p class="server-tag-title"></p>
                                        </div>
                                    </div>
                                    <p id="users-username"></p>
                                    <div class="user-badges-container-container">
                                        <div class="user-badges-container">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="user-modal-part2 xp-exp-only">
                                <div class="user-modal-xp-progress-left">
                                    <div class="user-modal-xp-progress">
                                        <div class="bar"></div>
                                        <div class="text">
                                            <p id="animate-level-xp">0</p>
                                            <p>/${cacheUserData.profile_information.xp_to_level}</p>
                                        </div>
                                    </div>
                                    <p id="user-level-rank">User Rank #${cacheUserData.profile_information.rank}</p>
                                </div>
                                <div class="user-modal-xp-level">
                                    <p>Level</p>
                                    <h1>${cacheUserData.profile_information.level}</h1>
                                </div>
                            </div>
                            <div class="user-modal-part3">
                                <div>
                                    <h3>Reviews</h3>
                                    <p>${cacheUserData.profile_information.reviews}</p>
                                </div>
                                <div>
                                    <h3>Joined Shop Archives</h3>
                                    <p class="sa-join-date">Date</p>
                                </div>
                            </div>
                        </div>
                    `;

                    if (cacheUserData.collectibles?.nameplate.sa_override_src) {
                        let nameplatePreview = document.createElement("img");

                        nameplatePreview.src = cacheUserData.collectibles.nameplate.sa_override_src;
    
                        modalInner.querySelector('.xp-card-nameplate-container').appendChild(nameplatePreview);
                    } else if (cacheUserData.collectibles?.nameplate) {
                        let nameplatePreview = document.createElement("video");

                        nameplatePreview.src = `https://cdn.discordapp.com/assets/collectibles/${cacheUserData.collectibles.nameplate.asset}asset.webm`;
                        nameplatePreview.disablePictureInPicture = true;
                        nameplatePreview.muted = true;
                        nameplatePreview.loop = true;
                        nameplatePreview.autoplay = true;
                        nameplatePreview.playsInline = true;

                        const bgcolor = nameplate_palettes[cacheUserData.collectibles.nameplate.palette].darkBackground;
    
                        modalInner.querySelector('.xp-card-nameplate-container').style.backgroundImage = `linear-gradient(90deg, #00000000 0%, ${bgcolor} 200%)`;
    
                        modalInner.querySelector('.xp-card-nameplate-container').appendChild(nameplatePreview);
                    }


                    const date = new Date(cacheUserData.profile_information.join_date);

                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();

                    const dateContainer = modalInner.querySelector(".sa-join-date");

                    if (settingsStore.non_us_timezone === 1) {
                        const formatted = `${day}/${month}/${year}`;

                        dateContainer.textContent = `${formatted}`;
                    } else {
                        const formatted = `${month}/${day}/${year}`;

                        dateContainer.textContent = `${formatted}`;
                    }


                    if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'render_user_level_stats')?.treatment === 1) {
                        if (firstTimeOpeningModal) {
                            animateNumber(modalInner.querySelector('#animate-level-xp'), cacheUserData.profile_information.xp_into_level, 2000, {
                                useCommas: false
                            });

                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    modalInner.querySelector('.bar').style.width = cacheUserData.profile_information.level_percentage+'%';
                                });
                            });
                        } else {
                            modalInner.querySelector('#animate-level-xp').textContent = cacheUserData.profile_information.xp_into_level;
                            modalInner.querySelector('.bar').style.width = cacheUserData.profile_information.level_percentage+'%';
                        }

                        if (cacheUserData.profile_information.xp_balance === 0) {
                            modalInner.querySelector('#user-level-rank').remove();
                        }
                    } else {
                        document.querySelectorAll('.xp-exp-only').forEach(el => {
                            el.remove();
                        });
                    }

                    const displayName = modalInner.querySelector('#users-displayname');
                    if (cacheUserData.global_name) displayName.textContent = cacheUserData.global_name;
                    else displayName.textContent = cacheUserData.username;
                    if (cacheUserData.display_name_styles && JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'display_name_style_render')?.treatment === 1) {
                        const dns = renderDisplayNameStyle(cacheUserData.display_name_styles);
                        displayName.classList.add(dns.class);
                        Object.assign(displayName.style, dns.style);

                        if (cacheUserData.display_name_styles.effect_id === 2) {
                            displayName.classList.add('dns-gradient-type-2');
                        }
                    }

                    if (cacheUserData.username) modalInner.querySelector('#users-username').textContent = cacheUserData.username;

                    if (!cacheUserData.types.system) modalInner.querySelector('.review-system-tag-container').remove();


                    const serverTagAsset = modalInner.querySelector('.review-server-tag-container');
    
                    if (cacheUserData.primary_guild) {
    
                        serverTagAsset.querySelector('.server-tag-img').src = `https://cdn.discordapp.com/clan-badges/${cacheUserData.primary_guild.identity_guild_id}/${cacheUserData.primary_guild.badge}.png?size=24`;
    
                        serverTagAsset.querySelector('.server-tag-title').textContent = cacheUserData.primary_guild.tag;
    
                    } else {
                        serverTagAsset.remove();
                    }


                    const avatar = modalInner.querySelector('.avatar');
                    let userAvatar = 'https://cdn.discordapp.com/avatars/'+cacheUserData.id+'/'+cacheUserData.avatar+'.webp?size=480';
                    if (cacheUserData.avatar?.includes('a_')) userAvatar = 'https://cdn.discordapp.com/avatars/'+cacheUserData.id+'/'+cacheUserData.avatar+'.gif?size=480';
                    avatar.src = userAvatar;

                    avatar.addEventListener("load", () => {
                        if (avatar.naturalWidth === 0 || avatar.naturalHeight === 0) {
                            avatar.src = "https://cdn.yapper.shop/assets/183.png";
                        }
                    });
                    avatar.addEventListener("error", () => {
                        avatar.src = "https://cdn.yapper.shop/assets/183.png";
                    });

                    
                    const deco = modalInner.querySelector('.deco');
                    if (cacheUserData.avatar_decoration_data) deco.src = `https://cdn.discordapp.com/avatar-decoration-presets/${cacheUserData.avatar_decoration_data.asset}.png?size=4096&passthrough=true`;
                    else deco.remove();


                    const userBadgesElement = modalInner.querySelector('.user-badges-container-container');
                    const userBadgesInnerElement = modalInner.querySelector('.user-badges-container');
    
                    if (Array.isArray(cacheUserData.badges) && cacheUserData.badges.length != 0) {
                        cacheUserData.badges.forEach(badge => {
                            const badgeImg = document.createElement("img");
                            badgeImg.src = `https://cdn.yapper.shop/assets/badges/${badge.id}.png`;
                            badgeImg.setAttribute('data-tooltip', badge.name);
                            badgeImg.classList.add("badge");
                            badgeImg.classList.add("has-tooltip");

                            if (badge.redirect) {
                                const badgeLink = document.createElement("a");
                                badgeLink.href = badge.redirect;
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
        
                } else if (tab === '2') {
                    modalInner.innerHTML = `
                        <div class="view-raw-modalv2-inner">
                            <textarea class="view-raw-modal-textbox" readonly>${JSON.stringify(cacheUserData, undefined, 4)}</textarea>
                        </div>
                    `;
                    document.querySelectorAll('.view-raw-modal-textbox').forEach(textbox => {
                        textbox.style.height = 'auto';
                        textbox.style.width = '100%';
                        textbox.style.height = textbox.scrollHeight + 'px';
                    });
                } else if (tab === '3') {
                    modalInner.innerHTML = `
                        <div class="admin-panel-edit-user-inner">
                        </div>
                    `;
                } else {
                    modalInner.innerHTML = ``;
                }
            }
            window.changeModalTab = changeModalTab;

            modal.querySelector('#user-modal-tab-1').addEventListener("click", function () {
                // Profile
                changeModalTab('1');
            });
            modal.querySelector('#user-modal-tab-2').addEventListener("click", function () {
                // Raw
                changeModalTab('2');
            });
            if (hasDroveAdminPanelPlugin) {
                modal.querySelector('#user-modal-tab-3').addEventListener("click", function () {
                    // Edit
                    changeModalTab('3');
                });
                modal.querySelector('#always-existing-user-json').innerHTML = JSON.stringify(cacheUserData, null, 4);
            } else {
                modal.querySelector('#user-modal-tab-3').classList.add('hidden');
            }
            

            document.body.appendChild(modal);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            });

        
            changeModalTab('1');

            firstTimeOpeningModal = false;


            modal.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
                closeModal();
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        } else if (type === "openLoadingTest") {
            document.body.appendChild(modal_loading);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_loading.classList.add('show');
                });
            });

            document.body.appendChild(modal_back);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal_back.classList.add('show');
                });
            });

            modal_loading.addEventListener('click', (event) => {
                if (event.target === modal_loading) {
                    closeModal();
                }
            });
        } else if (type === "discordQuestInfo") {

            const quest = data1;

            modal.setAttribute('data-clear-param', 'itemId');
            modal.setAttribute('data-clear-cache', 'currentOpenModalId');

            addParams({itemId: quest.id})

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
                            <p>Overview</p>
                        </div>
                        <div class="tab" id="category-modal-tab-3">
                            <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path fill="currentColor" d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" class=""></path>
                            </svg>
                            <p>Assets</p>
                        </div>
                        <div class="tab hidden disabled" id="category-modal-tab-4">
                            <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M9.25 3.35C7.87 2.45 6 3.38 6 4.96v14.08c0 1.58 1.87 2.5 3.25 1.61l10.85-7.04a1.9 1.9 0 0 0 0-3.22L9.25 3.35Z" class=""></path>
                            </svg>
                            <p>Video</p>
                        </div>
                        <div class="tab" id="category-modal-tab-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.7376 3.18925C15.4883 2.93731 15.0814 2.93686 14.8316 3.18824L14.0087 4.01625C13.7618 4.26471 13.7614 4.66581 14.0078 4.91476L20.3804 11.3527C20.6265 11.6013 20.6265 12.0017 20.3804 12.2503L14.0078 18.6882C13.7614 18.9373 13.7618 19.3383 14.0087 19.5867L14.8316 20.4148C15.0814 20.6662 15.4883 20.6658 15.7376 20.4138L23.815 12.2503C24.061 12.0016 24.061 11.6014 23.815 11.3528L15.7376 3.18925Z" fill="currentColor"/>
                                <path d="M9.99171 4.91476C10.2381 4.66581 10.2377 4.26471 9.99081 4.01625L9.16787 3.18824C8.91804 2.93686 8.51118 2.93731 8.2619 3.18925L0.184466 11.3528C-0.0614893 11.6014 -0.061488 12.0016 0.184466 12.2503L8.2619 20.4138C8.51118 20.6658 8.91803 20.6662 9.16787 20.4148L9.99081 19.5867C10.2377 19.3383 10.2381 18.9373 9.99171 18.6882L3.61906 12.2503C3.37298 12.0017 3.37298 11.6013 3.61906 11.3527L9.99171 4.91476Z" fill="currentColor"/>
                            </svg>
                            <p>Raw</p>
                        </div>
                    </div>

                    <img class="category-modal-banner-preview" src="https://cdn.discordapp.com/quests/${quest.id}/${quest.assets.hero}">
                    
                    <div id="category-modal-inner-content">
                    </div>
        
                    <div data-modal-top-product-buttons>
                        <div class="has-tooltip" data-tooltip="Close" data-close-product-card-button>
                            <svg class="modalv2_top_icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" class=""></path></svg>
                        </div>
                        <div class="has-tooltip" data-tooltip="Copy Discord Link">
                            <svg class="modalv2_top_icon" onclick="copyValue('https://canary.discord.com/quests/${quest.id}');" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M16.32 14.72a1 1 0 0 1 0-1.41l2.51-2.51a3.98 3.98 0 0 0-5.62-5.63l-2.52 2.51a1 1 0 0 1-1.41-1.41l2.52-2.52a5.98 5.98 0 0 1 8.45 8.46l-2.52 2.51a1 1 0 0 1-1.41 0ZM7.68 9.29a1 1 0 0 1 0 1.41l-2.52 2.51a3.98 3.98 0 1 0 5.63 5.63l2.51-2.52a1 1 0 0 1 1.42 1.42l-2.52 2.51a5.98 5.98 0 0 1-8.45-8.45l2.51-2.51a1 1 0 0 1 1.42 0Z" class=""></path><path fill="currentColor" d="M14.7 10.7a1 1 0 0 0-1.4-1.4l-4 4a1 1 0 1 0 1.4 1.4l4-4Z" class=""></path></svg>
                        </div>
                        <div class="has-tooltip" data-tooltip="Share">
                            <svg class="modalv2_top_icon" onclick="copyValue('${baseYapperURL}?page=quests&itemId=${quest.id}');" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M21.7 7.3a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L18.58 9H13a7 7 0 0 0-7 7v4a1 1 0 1 1-2 0v-4a9 9 0 0 1 9-9h5.59l-3.3-3.3a1 1 0 0 1 1.42-1.4l5 5Z" class=""></path></svg>
                        </div>
                    </div>
                </div>
            `;

            if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'quests_tab')?.treatment === 2) {
                modal.querySelector('#category-modal-tab-4').classList.remove('hidden');
            }

            function changeModalTab(tab) {
                modal.querySelectorAll('.selected').forEach((el) => {
                    el.classList.remove("selected");
                });
        
                modal.querySelector('#category-modal-tab-'+tab).classList.add('selected');
        
                const modalInner = modal.querySelector('#category-modal-inner-content');
        
                if (tab === '1') {
                    const required = renderQuestRequirement(quest);

                    modalInner.innerHTML = `
                        <div class="category-modal-bottom-container">
                            <p class="sku_id has-tooltip" data-tooltip="Click To Copy" onclick="copyValue('${quest.id}')">${quest.id}</p>
                            <h1>${quest.messages.quest_name} Quest</h1>
                            <div class="quest-modal-block">
                                <div class="task-icon">
                                    <img src="https://cdn.discordapp.com/quests/${quest.id}/dark/${quest.assets.game_tile}">
                                </div>
                                <div>
                                    <h2>Task</h2>
                                    <p>${required.task}</p>
                                </div>
                            </div>
                            <div class="quest-modal-block">
                                <div class="reward-icon">
                                    <img src="https://cdn.discordapp.com/quests/${quest.id}/${quest.rewards_config.rewards[0].asset}?format=webp">
                                </div>
                                <div>
                                    <h2>Reward</h2>
                                    <p>${required.reward}</p>
                                </div>
                            </div>
                        </div>
                    `;

                    const icon = modalInner.querySelector('.reward-icon');
                    const img = modalInner.querySelector('.reward-icon').querySelector('img');

                    if (quest.rewards_config.rewards[0].type === quest_reward_types.VIRTUAL_CURRENCY) {
                        img.src = `https://cdn.discordapp.com/assets/content/fb761d9c206f93cd8c4e7301798abe3f623039a4054f2e7accd019e1bb059fc8.webm?format=webp`;
                    } else if (quest.rewards_config.rewards[0].type === quest_reward_types.FRACTIONAL_PREMIUM) {
                        icon.innerHTML = `
                            <svg width="187" height="187" viewBox="0 0 187 187" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M161.164 3.17212H30.5663C16.8601 3.17212 5.74902 14.3031 5.74902 28.0339V158.866C5.74902 172.597 16.8601 183.728 30.5663 183.728H161.164C174.87 183.728 185.982 172.597 185.982 158.866V28.0339C185.982 14.3031 174.87 3.17212 161.164 3.17212Z" fill="url(#paint0_linear_170_2)"></path>
                            <g filter="url(#filter0_d_170_2)">
                            <path d="M100.125 107.318C106.339 107.318 111.376 102.266 111.376 96.0332C111.376 89.8007 106.339 84.7483 100.125 84.7483C93.9113 84.7483 88.874 89.8007 88.874 96.0332C88.874 102.266 93.9113 107.318 100.125 107.318Z" fill="white"></path>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M55.1214 50.8938C52.0146 50.8938 49.496 53.42 49.496 56.5362C49.496 59.6525 52.0146 62.1787 55.1214 62.1787H71.9979C75.1048 62.1787 77.6235 64.7049 77.6235 67.8211C77.6235 70.9373 75.1048 73.4635 71.9979 73.4635H46.6832C43.5763 73.4635 41.0576 75.9897 41.0576 79.106C41.0576 82.2222 43.5763 84.7484 46.6832 84.7484H60.7469C63.8539 84.7484 66.3724 87.2746 66.3724 90.3908C66.3724 93.5071 63.8539 96.0333 60.7469 96.0333H49.496C46.389 96.0333 43.8704 98.5595 43.8704 101.676C43.8704 104.792 46.389 107.318 49.496 107.318H56.5393C61.5352 126.787 79.1553 141.173 100.125 141.173C124.981 141.173 145.13 120.963 145.13 96.0333C145.13 71.1035 124.981 50.8938 100.125 50.8938H55.1214ZM100.125 118.603C112.553 118.603 122.627 108.498 122.627 96.0333C122.627 83.5683 112.553 73.4635 100.125 73.4635C87.6979 73.4635 77.6235 83.5683 77.6235 96.0333C77.6235 108.498 87.6979 118.603 100.125 118.603Z" fill="white"></path>
                            <path d="M29.8064 84.7485C32.9133 84.7485 35.4319 82.2223 35.4319 79.1061C35.4319 75.9898 32.9133 73.4636 29.8064 73.4636H26.9936C23.8868 73.4636 21.3682 75.9898 21.3682 79.1061C21.3682 82.2223 23.8868 84.7485 26.9936 84.7485H29.8064Z" fill="white"></path>
                            </g>
                            <defs>
                            <filter id="filter0_d_170_2" x="7.48094" y="42.5615" width="151.536" height="118.053" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                            <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"></feColorMatrix>
                            <feOffset dy="5.55489"></feOffset>
                            <feGaussianBlur stdDeviation="6.94361"></feGaussianBlur>
                            <feComposite in2="hardAlpha" operator="out"></feComposite>
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"></feColorMatrix>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_170_2"></feBlend>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_170_2" result="shape"></feBlend>
                            </filter>
                            <linearGradient id="paint0_linear_170_2" x1="160.748" y1="183.303" x2="46.3474" y2="36.4729" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#E978E6"></stop>
                            <stop offset="1" stop-color="#2F3EBB"></stop>
                            </linearGradient>
                            </defs>
                            </svg>
                        `;
                    }
        
                } else if (tab === '2') {
                    modalInner.innerHTML = `
                        <div class="view-raw-modalv2-inner">
                            <textarea class="view-raw-modal-textbox" readonly>${JSON.stringify(quest, undefined, 4)}</textarea>
                        </div>
                    `;
                    document.querySelectorAll('.view-raw-modal-textbox').forEach(textbox => {
                        textbox.style.height = 'auto';
                        textbox.style.width = '100%';
                        textbox.style.height = textbox.scrollHeight + 'px';
                    });
                } else if (tab === '3') {
                    modalInner.innerHTML = `
                        <div class="category-modal-assets-container">
                        </div>
                    `;

                    const assetsContainer = modalInner.querySelector('.category-modal-assets-container');

                    const allAssets = {
                        "Hero": quest.assets.hero,
                        "Logo Type (Dark)": `dark/${quest.assets.logotype}`,
                        "Logo Type (Light)": `light/${quest.assets.logotype}`,
                        "Game Tile (Dark)": `dark/${quest.assets.game_tile}`,
                        "Game Tile (Light)": `light/${quest.assets.game_tile}`,
                        "Hero Video": quest.assets.hero_video,
                        "Quest Bar Hero": quest.assets.quest_bar_hero,
                        "Quest Bar Hero Video": quest.assets.quest_bar_hero_video,
                        "Reward Asset": quest.rewards_config.rewards[0].asset
                    };

                    let nullAssets = true;

                    Object.entries(allAssets).forEach(([asset, value]) => {
                        if (!value) return; // skip null or undefined

                        nullAssets = false;

                        let assetDiv = document.createElement("div");

                        assetDiv.classList.add('asset-div')

                        if (value.includes(".webm") || value.includes(".mp4")) {
                            assetDiv.innerHTML = `
                                <h2>${asset}</h2>
                                <video controls disablepictureinpicture muted loop src="https://cdn.discordapp.com/quests/${quest.id}/${value}"></video> 
                            `;
                        } else if (value.includes(".png") || value.includes(".jpg") || value.includes(".jpeg") || value.includes(".svg")) {
                            assetDiv.innerHTML = `
                                <h2>${asset}</h2>
                                <img src="https://cdn.discordapp.com/quests/${quest.id}/${value}"></img> 
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
                                <p>This quest has no assets.</p>
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
                    let asset = null;
                    if (quest?.task_config_v2?.tasks?.WATCH_VIDEO?.assets?.video?.url) {
                        asset = quest.task_config_v2.tasks.WATCH_VIDEO.assets.video.url;
                    }
                    else if (quest?.task_config_v2?.tasks?.WATCH_VIDEO_ON_MOBILE?.assets?.video?.url) {
                        asset = quest.task_config_v2.tasks.WATCH_VIDEO_ON_MOBILE.assets.video.url;
                    }
                    modalInner.innerHTML = `
                        <div class="category-modal-bottom-container">
                            <div class="video-quest-disclaimer">
                                <p>Watching this video here will not grant you the quest reward.</p>
                                <p>Watch the video on Discord to claim the quest reward.</p>
                            </div>
                            <video controls src="https://cdn.discordapp.com/quests/${quest.id}/${asset}"></video>
                        </div>
                    `;
                    const video = modalInner.querySelector('video');
                    video.disablePictureInPicture = true;
                    if (data2 != 'startOnVideoTab') video.muted = true;
                    if (data2 === 'startOnVideoTab') video.autoplay = true;
                    video.playsInline = true;
                    video.volume = 0.1;
                    video.classList.add('quest-video-player');
                    if (asset === null) {
                        modalInner.innerHTML = `
                            <div class="category-modal-bottom-container">
                                <div class="shop-loading-error-container">
                                    <img src="https://cdn.yapper.shop/assets/207.png">
                                    <h2>Oopsie, something went wrong.</h2>
                                    <p>We weren't able to load this quest video.</p>
                                </div>
                            </div>
                        `;
                    }
                } else {
                    modalInner.innerHTML = ``;
                }
            }
            window.changeModalTab = changeModalTab;

            if (data2 === 'startOnVideoTab') {
                changeModalTab('4')
            } else {
                changeModalTab('1')
            }

            modal.querySelector('#category-modal-tab-1').addEventListener("click", function () {
                // Overview
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

            const tab = modal.querySelector('#category-modal-tab-4');
            if (quest.task_config.tasks["WATCH_VIDEO"] || quest.task_config.tasks["WATCH_VIDEO_ON_MOBILE"]) {
                tab.classList.remove('disabled');
                tab.classList.remove('has-tooltip');
                tab.removeAttribute('data-tooltip');
                tab.addEventListener("click", function () {
                    // Video
                    changeModalTab('4');
                });
            } else {
                tab.classList.add('has-tooltip');
                tab.setAttribute('data-tooltip', 'This is not a video quest');
            }


            modal.querySelector("[data-close-product-card-button]").addEventListener('click', () => {
                closeModal();
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        }

        if (type != "fromCategoryBanner" && type != "userSettings" && type != "openUserModal" && type != "openLoadingTest") {
            document.body.appendChild(modal);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.classList.add('show');
                });
            });

            if (type != "xpRedeem" && type != "xpClaim") {

                document.body.appendChild(modal_back);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        modal_back.classList.add('show');
                    });
                });
            }
        }

        if (type != "openLoadingTest") {
            if (modal_loading) modal_loading.classList.remove('show');
            setTimeout(() => {
                if (modal_loading) modal_loading.remove();
            }, 300);
        }
    }
    window.openModal = openModal;

    async function closeModal() {
        if (openModalsCache != 0) {
            const modal = document.querySelector('.open-modal-' + openModalsCache);
            const modal_back = document.querySelector('.open-back-modal-' + openModalsCache);
            const modal_loading = document.querySelector('.open-loading-modal-' + openModalsCache);

            // Code to hide the not top most modal
            try {
                const amount = openModalsCache - 1;
                if (!document.querySelector('.open-modal-' + amount).classList.contains('modalv3')) {
                    document.querySelector('.open-modal-' + amount).classList.add('show');
                    document.querySelector('.open-back-modal-' + amount).classList.add('show');
                }
            } catch {}

            if (modal?.hasAttribute('data-clear-param')) {
                removeParams(modal.getAttribute('data-clear-param'));
            }
            if (modal?.hasAttribute('data-clear-cache') && modal.getAttribute('data-clear-cache') === "currentOpenModalId") {
                currentOpenModalId = null;
            }

            if (modal) modal.classList.remove('show');
            if (modal_back) modal_back.classList.remove('show');
            if (modal_loading) modal_loading.classList.remove('show');
            setTimeout(() => {
                if (modal) modal.remove();
                if (modal_back) modal_back.remove();
                if (modal_loading) modal_loading.remove();
            }, 300);
            openModalsCache -= 1;
        }
    }
    window.closeModal = closeModal;

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeModal()
        }
    });


    async function renderQuest(quests, output) {

        const sorted = quests.sort((a, b) => {
            const dateA = new Date(a.expires_at);
            const dateB = new Date(b.expires_at);
        
            return dateB - dateA;
        });

        output.innerHTML = '';

        sorted.forEach(quest => {
            const expDate = new Date(quest.expires_at);

            const day = String(expDate.getDate()).padStart(2, '0');
            const month = String(expDate.getMonth() + 1).padStart(2, '0');
            const year = expDate.getFullYear();

            let formatted = `${month}/${day}/${year}`

            if (settingsStore.non_us_timezone === 1) {
                formatted = `${day}/${month}/${year}`;
            }


            const card = document.createElement("div");
            card.classList.add('quest-card');
            card.setAttribute('data-id', quest.id);
            card.innerHTML = `
                <div class="section1">
                    <img class="hero" src="https://cdn.discordapp.com/quests/${quest.id}/${quest.assets.hero}">
                    <img class="logo" src="https://cdn.discordapp.com/quests/${quest.id}/dark/${quest.assets.logotype}">
                    <p class="publisher">Promoted by ${quest.messages.game_publisher}</p>
                    <p class="date">Ends ${formatted}</p>
                </div>
                <div class="section2">
                    <div class="reward-icon">
                    </div>
                    <div class="info-container">
                        <p class="quest-name">${quest.messages.quest_name.toUpperCase()} QUEST</p>
                        <p class="reward-name">something idk</p>
                        <p class="reward-requirements"></p>
                    </div>
                </div>
                <div class="section3">
                    <button class="generic-button brand">
                        Open In Discord
                    </button>
                </div>
            `;
            const rewardRequirements = card.querySelector('.reward-requirements');

            const required = renderQuestRequirement(quest);

            rewardRequirements.textContent = required.requirements;

            const rewardName = card.querySelector('.reward-name');
            if (quest.rewards_config.rewards[0].type === quest_reward_types.REWARD_CODE || quest.rewards_config.rewards[0].type === quest_reward_types.COLLECTIBLE || quest.rewards_config.rewards[0].type === quest_reward_types.FRACTIONAL_PREMIUM) {
                rewardName.textContent = `Claim ${quest.rewards_config.rewards[0].messages.name_with_article}`;
            }
            else if (quest.rewards_config.rewards[0].type === quest_reward_types.VIRTUAL_CURRENCY) {
                rewardName.textContent = `${quest.rewards_config.rewards[0].orb_quantity} Discord Orbs`;
            }
            else {
                rewardName.textContent = quest.rewards_config.rewards[0].messages.name_with_article;
            }

            const rewardIcon = card.querySelector('.reward-icon');
            if (quest.rewards_config.rewards[0].type === quest_reward_types.FRACTIONAL_PREMIUM) {
                rewardIcon.innerHTML = `
                    <svg width="187" height="187" viewBox="0 0 187 187" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M161.164 3.17212H30.5663C16.8601 3.17212 5.74902 14.3031 5.74902 28.0339V158.866C5.74902 172.597 16.8601 183.728 30.5663 183.728H161.164C174.87 183.728 185.982 172.597 185.982 158.866V28.0339C185.982 14.3031 174.87 3.17212 161.164 3.17212Z" fill="url(#paint0_linear_170_2)"></path>
                    <g filter="url(#filter0_d_170_2)">
                    <path d="M100.125 107.318C106.339 107.318 111.376 102.266 111.376 96.0332C111.376 89.8007 106.339 84.7483 100.125 84.7483C93.9113 84.7483 88.874 89.8007 88.874 96.0332C88.874 102.266 93.9113 107.318 100.125 107.318Z" fill="white"></path>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M55.1214 50.8938C52.0146 50.8938 49.496 53.42 49.496 56.5362C49.496 59.6525 52.0146 62.1787 55.1214 62.1787H71.9979C75.1048 62.1787 77.6235 64.7049 77.6235 67.8211C77.6235 70.9373 75.1048 73.4635 71.9979 73.4635H46.6832C43.5763 73.4635 41.0576 75.9897 41.0576 79.106C41.0576 82.2222 43.5763 84.7484 46.6832 84.7484H60.7469C63.8539 84.7484 66.3724 87.2746 66.3724 90.3908C66.3724 93.5071 63.8539 96.0333 60.7469 96.0333H49.496C46.389 96.0333 43.8704 98.5595 43.8704 101.676C43.8704 104.792 46.389 107.318 49.496 107.318H56.5393C61.5352 126.787 79.1553 141.173 100.125 141.173C124.981 141.173 145.13 120.963 145.13 96.0333C145.13 71.1035 124.981 50.8938 100.125 50.8938H55.1214ZM100.125 118.603C112.553 118.603 122.627 108.498 122.627 96.0333C122.627 83.5683 112.553 73.4635 100.125 73.4635C87.6979 73.4635 77.6235 83.5683 77.6235 96.0333C77.6235 108.498 87.6979 118.603 100.125 118.603Z" fill="white"></path>
                    <path d="M29.8064 84.7485C32.9133 84.7485 35.4319 82.2223 35.4319 79.1061C35.4319 75.9898 32.9133 73.4636 29.8064 73.4636H26.9936C23.8868 73.4636 21.3682 75.9898 21.3682 79.1061C21.3682 82.2223 23.8868 84.7485 26.9936 84.7485H29.8064Z" fill="white"></path>
                    </g>
                    <defs>
                    <filter id="filter0_d_170_2" x="7.48094" y="42.5615" width="151.536" height="118.053" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                    <feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"></feColorMatrix>
                    <feOffset dy="5.55489"></feOffset>
                    <feGaussianBlur stdDeviation="6.94361"></feGaussianBlur>
                    <feComposite in2="hardAlpha" operator="out"></feComposite>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"></feColorMatrix>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_170_2"></feBlend>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_170_2" result="shape"></feBlend>
                    </filter>
                    <linearGradient id="paint0_linear_170_2" x1="160.748" y1="183.303" x2="46.3474" y2="36.4729" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#E978E6"></stop>
                    <stop offset="1" stop-color="#2F3EBB"></stop>
                    </linearGradient>
                    </defs>
                    </svg>
                `;
            } else {

                if (quest.rewards_config.rewards[0]?.asset?.includes('.mp4') || quest.rewards_config.rewards[0]?.asset?.includes('.webm') || quest.rewards_config.rewards[0].type === quest_reward_types.VIRTUAL_CURRENCY) {
                    const rewardImg = document.createElement("video");
                    let src = `https://cdn.discordapp.com/quests/${quest.id}/${quest.rewards_config.rewards[0].asset}`;
                    if (quest.rewards_config.rewards[0].type === quest_reward_types.VIRTUAL_CURRENCY) src = `https://cdn.discordapp.com/assets/content/fb761d9c206f93cd8c4e7301798abe3f623039a4054f2e7accd019e1bb059fc8.webm`;
                    rewardImg.src = src;

                    card.addEventListener("mouseenter", () => {
                        rewardImg.play();
                    });
                    card.addEventListener("mouseleave", () => {
                        rewardImg.pause();
                        rewardImg.currentTime = 0;
                    });

                    rewardImg.disablePictureInPicture = true;
                    rewardImg.muted = true;
                    rewardImg.loop = true;
                    rewardImg.playsInline = true;

                    rewardIcon.appendChild(rewardImg);
                } else {
                    const rewardImg = document.createElement("img");
                    let src = `https://cdn.discordapp.com/quests/${quest.id}/${quest.rewards_config.rewards[0].asset}?format=webp`;
                    rewardImg.src = src;

                    rewardIcon.appendChild(rewardImg);
                }
            }

            const openInDiscordButton = card.querySelector('.generic-button');


            const now = new Date();
            const timeDiff = expDate - now;
        
            if (timeDiff <= 0) {
                openInDiscordButton.classList.add('disabled');
                openInDiscordButton.textContent = `Quest ended ${formatted}`;
                card.querySelector('.date').remove();
                openInDiscordButton.addEventListener("click", (e) => {
                    e.stopPropagation();
                });
            } else {
                openInDiscordButton.addEventListener("click", (e) => {
                    e.stopPropagation();
                    redirectToLink('https://discord.com/discovery/quests#'+quest.id);
                });
            }

            if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'quests_tab')?.treatment === 2) {
                if (quest.task_config.tasks["WATCH_VIDEO"] || quest.task_config.tasks["WATCH_VIDEO_ON_MOBILE"]) {
                    let button = document.createElement('button');
                    button.classList.add('generic-button');
                    button.classList.add('primary');
                    button.innerHTML = `
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M9.25 3.35C7.87 2.45 6 3.38 6 4.96v14.08c0 1.58 1.87 2.5 3.25 1.61l10.85-7.04a1.9 1.9 0 0 0 0-3.22L9.25 3.35Z" class=""></path>
                        </svg>
                        Watch Video
                    `;
                    button.addEventListener("click", (e) => {
                        e.stopPropagation();
                        openModal('category-modal', 'discordQuestInfo', quest, 'startOnVideoTab');
                    });
                    card.querySelector('.section3').insertBefore(button, openInDiscordButton);
                }
            }

            card.addEventListener("click", () => {
                openModal('category-modal', 'discordQuestInfo', quest);
            });

            if (currentOpenModalId && currentOpenModalId === quest.id) {
                setTimeout(() => {
                    openModal('category-modal', 'discordQuestInfo', quest);
                }, 500);
            }

            output.appendChild(card);
        });

        if (currentOpenModalId != null && currentOpenModalId != undefined) {
            const targetSkuId = currentOpenModalId;
            const targetIndex = sorted.findIndex(q => q.id === targetSkuId );

            setTimeout(() => {
                const el = document.querySelector(`[data-id="${sorted[targetIndex].id}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }


    async function renderProduct(category, product) {
        const card = document.createElement("div");
        card.classList.add("shop-category-card");
        card.innerHTML = `
            <div data-shop-card-preview-container>
            </div>
            <div class="card-bottom">
                <h3 class="shop-card-name"></h3>
                <p class="shop-card-summary"></p>
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

        if (product.name) card.querySelector('.shop-card-name').textContent = product.name;
        if (product.summary) card.querySelector('.shop-card-summary').textContent = product.summary;

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
        const itemName = card.querySelector('.shop-card-name');
        const itemSummary = card.querySelector('.shop-card-summary');

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
            createCardTag('UPDATE REQUIRED');
        }

        card.addEventListener("click", (event) => {
            if (event.target.matches(".shop-card-var")) {
            } else {
                openModal('modalv2', 'fromCollectibleCard', category, product);
                addParams({itemSkuId: product.sku_id})
            }
        });

        if (currentOpenModalId === product.sku_id) {
            setTimeout(() => {
                openModal('modalv2', 'fromCollectibleCard', category, product);
            }, 500);
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
        let itemsPerPage = settingsStore.category_page_limit || 5;
    
        let filteredData = data;
        let currentPage = 1;
    
        const renderPage = (page) => {
            itemsPerPage = settingsStore.category_page_limit || 5;
            currentPage = page;
            output.innerHTML = '';
            const pageData = paginate(filteredData, page, itemsPerPage);
            output.scrollTo(0,0);

            if (data.length <= settingsStore.category_page_limit) {
                paginationContainer.classList.add('hidden');
            }
    
            pageData.forEach((categoryData) => {
                const category = document.createElement("div");
                category.classList.add('category-container');
                category.setAttribute('data-sku-id', categoryData.sku_id);
                category.setAttribute('data-listing-id', categoryData.store_listing_id);

                const categoryClientDataId = category_client_overrides.findIndex(cat => cat.sku_id === categoryData.sku_id);

                let categoryBanner;
                if (category_client_overrides[categoryClientDataId]?.banner_override) {
                    categoryBanner = category_client_overrides[categoryClientDataId]?.banner_override;
                }
                else if (categoryData.banner_asset?.static) {
                    categoryBanner = categoryData.banner_asset?.static;
                }
                else if (categoryData.full_src && categoryData.banner) {
                    categoryBanner = categoryData.banner;
                }
                else if (categoryData.banner) {
                    categoryBanner = `https://cdn.discordapp.com/app-assets/1096190356233670716/${categoryData.banner}.png?size=4096`;
                }

                let categoryHeroBanner;
                if (category_client_overrides[categoryClientDataId]?.hero_banner_override) {
                    categoryHeroBanner = category_client_overrides[categoryClientDataId]?.hero_banner_override;
                }
                else if (categoryData.hero_banner_asset?.static) {
                    categoryHeroBanner = categoryData.hero_banner_asset?.static;
                }
                else if (categoryData.full_src && categoryData.hero_banner) {
                    categoryHeroBanner = categoryData.hero_banner;
                }
                else if (categoryData.hero_banner) {
                    categoryHeroBanner = `https://cdn.discordapp.com/app-assets/1096190356233670716/${categoryData.hero_banner}.png?size=4096`;
                }

                let modalBanner;
                if (category_client_overrides[categoryClientDataId]?.modal_hero_banner) {
                    modalBanner = category_client_overrides[categoryClientDataId]?.modal_hero_banner
                }
                else if (categoryHeroBanner) {
                    modalBanner = categoryHeroBanner;
                }
                else if (categoryBanner) {
                    modalBanner = categoryBanner;
                }
    
                const bannerContainer = document.createElement('div');
                bannerContainer.classList.add('banner-container');
                bannerContainer.style.backgroundImage = `url(${categoryBanner})`;

                if (categoryData.logo && category_client_overrides[categoryClientDataId]?.addLogo) {
                    if (category_client_overrides[categoryClientDataId]?.banner_verification && category_client_overrides[categoryClientDataId]?.banner_verification === categoryData.banner || !category_client_overrides[categoryClientDataId].banner_verification) {
                        let logoAsset;
                        if (categoryData.full_src && categoryData.logo) {
                            logoAsset = categoryData.logo;
                        }
                        else if (categoryData.logo) {
                            logoAsset = `https://cdn.discordapp.com/app-assets/1096190356233670716/${categoryData.logo}.png?size=4096`;
                        }
                        const bannerLogo = document.createElement("div");
                        bannerLogo.classList.add('shop-category-logo-holder')
                        bannerLogo.innerHTML = `
                            <img class="shop-category-banner-logo" loading="lazy" src="${logoAsset}">
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


                bannerContainer.addEventListener("click", function () {
                    openModal('category-modal', 'fromCategoryBanner', categoryData, modalBanner);
                });

                if (currentOpenModalId === categoryData.sku_id) {
                    setTimeout(() => {
                        openModal('category-modal', 'fromCategoryBanner', categoryData, modalBanner);
                    }, 500);
                }
    
                output.appendChild(category);
            });
    
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            createPaginationControls(paginationContainer, totalPages, page, renderPage);
    
            scrollToCategoryFromUrl();
        };

        window.renderPage = renderPage;
    
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
                } else if (categoryData.banner_asset?.static) {
                    const imageBanner = document.createElement("img");
                    imageBanner.src = categoryData.banner_asset.static;
                    imageBanner.classList.add('banner-video');
                    bannerContainer.appendChild(imageBanner);
                }


                const bannerButton = document.createElement("div");
                bannerButton.id = 'home-page-preview-button-container';
                bannerButton.innerHTML = `
                    <svg class="has-tooltip" data-tooltip="Open Category Modal" width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="24" r="6" fill="currentColor"></circle>
                        <circle cx="12" cy="72" r="6" fill="currentColor"></circle>
                        <circle cx="12" cy="48" r="6" fill="currentColor"></circle>
                        <rect x="28" y="20" width="60" height="8" rx="4" fill="currentColor"></rect>
                        <path d="M72.124 44.0029C64.5284 44.0668 57.6497 47.1046 52.6113 52H32C29.7909 52 28 50.2091 28 48C28 45.7909 29.7909 44 32 44H72C72.0415 44 72.0828 44.0017 72.124 44.0029Z" fill="currentColor"></path>
                        <path d="M44.2852 68C44.0983 69.3065 44 70.6418 44 72C44 73.3582 44.0983 74.6935 44.2852 76H32C29.7909 76 28 74.2091 28 72C28 69.7909 29.7909 68 32 68H44.2852Z" fill="currentColor"></path>
                        <circle cx="72" cy="72" r="16" stroke="currentColor" stroke-width="8"></circle>
                        <rect x="81" y="85.9497" width="7" height="16" rx="3.5" transform="rotate(-45 81 85.9497)" fill="currentColor"></rect>
                    </svg>
                    <button class="home-page-preview-button" onclick="scrollToCache = '${categoryData.category_store_listing_id}'; addParams({scrollTo: '${categoryData.category_store_listing_id}'}); loadPage('2');">Shop the ${categoryData.name} Collection</button>
                `;
                bannerButton.querySelector('svg').addEventListener("click", () => {
                    openModal('category-modal', 'fromCategoryBanner', data.categories[0], categoryData.banner_asset?.static);
                });
                bannerSummaryAndLogo.appendChild(bannerButton);


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
                <img src="https://cdn.yapper.shop/assets/207.png">
                <h2>Oopsie, something went wrong.</h2>
                <p>We weren't able to load this page. Check back later.</p>
                <p>Error: ${error}</p>
            </div>
        `;
    }
    
    
    
    

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

    if (settingsStore.dismissible_favorites_tab_new === 1) {
        document.getElementById('shop-tab-7').classList.add('hide-new-tag');
    }

    async function loadPage(key, firstLoad, reFetch) {
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
            if (!discordCollectiblesShopHomeCache || discordCollectiblesShopHomeCache && reFetch) {
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
            if (!discordCollectiblesCategoriesCache || discordCollectiblesCategoriesCache && reFetch) {
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
            if (!discordOrbsCategoriesCache || discordOrbsCategoriesCache && reFetch) {
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
            if (!discordMiscellaneousCategoriesCache || discordMiscellaneousCategoriesCache && reFetch) {
                url = redneredAPI + endpoints.DISCORD_MISCELLANEOUS_CATEGORIES;
                apiUrl = new URL(url);
                if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'published_items_category')?.treatment === 1) {
                    apiUrl.searchParams.append("include-published-items-category", "true");
                }
                if (settingsStore.staff_show_test_categories_on_misc_page === 1) {
                    apiUrl.searchParams.append("include-test-categories", "true");
                }
                const rawData = await fetch(apiUrl, {
                    method: "GET",
                    headers: {
                        "Authorization": localStorage.token
                    }
                });

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
        } else if (currentPageCache === "quests") {
            searchInput.classList.add('hidden');   
            const output = document.getElementById('quests-wrapper');
            if (!discordQuestsCache || discordQuestsCache && reFetch) {
                const rawData = await fetch(redneredAPI + endpoints.DISCORD_QUESTS);

                if (!rawData.ok) {
                    renderShopLoadingError(rawData.status, output);
                } else {
                    const data = await rawData.json();

                    discordQuestsCache = data;

                    renderQuest(data, output);
                }
            } else {
                renderQuest(discordQuestsCache, output);
            }
        } else if (currentPageCache === "favorites") {
            searchInput.classList.add('hidden');
            const output = document.getElementById('categories-container');
            if (settingsStore.dismissible_favorites_tab_new === 0) {
                changeSetting('dismissible_favorites_tab_new', 1);
            }
            document.getElementById('shop-tab-7').classList.add('hide-new-tag')

            let items = JSON.parse(localStorage.getItem("favoritesStore"));
            const data = [{ ...favorites_category, products: items }];
            if (Array(items) && items.length !== 0) {
                renderShopData(data, output);
            } else {
                output.innerHTML = `
                    <div class="shop-loading-error-container">
                        <img src="https://cdn.yapper.shop/assets/208.png">
                        <h2>You have no favorites.</h2>
                        <p>Favorite an item and it will show up here.</p>
                    </div>
                `;
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

    async function setModalv3InnerContent(tab) {
        if (!document.getElementById("modalv3-right-content-container-inner")) {
            openModal('modalv3', 'userSettings');
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
            if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'enhanced_account_tab')?.treatment === 1) {
                tabPageOutput.innerHTML = `
                    <h2>Account</h2>
                    <hr>
                    <div class="enhanced-account-container">
                        <div class="enhanced-account-block title-card">
                            <div class="section">
                                <h3>Discord Account</h3>
                                <p>The Discord account linked to Shop Archives.</p>
                            </div>
                            <div class="buttons">
                                <button class="button has-tooltip" data-tooltip="Open your public user profile" id="profile">
                                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14.0833 10.8334C15.2326 10.8334 16.3348 10.3769 17.1475 9.56421C17.9601 8.75155 18.4167 7.64935 18.4167 6.50008C18.4167 5.35081 17.9601 4.24861 17.1475 3.43595C16.3348 2.62329 15.2326 2.16675 14.0833 2.16675C12.9341 2.16675 11.8319 2.62329 11.0192 3.43595C10.2065 4.24861 9.75 5.35081 9.75 6.50008C9.75 7.64935 10.2065 8.75155 11.0192 9.56421C11.8319 10.3769 12.9341 10.8334 14.0833 10.8334Z" fill="currentColor"/>
                                        <path d="M3.25 5.41667V4.60417C3.25 3.85667 3.85667 3.25 4.60417 3.25C5.35167 3.25 5.9475 3.85667 6.045 4.60417C6.63 9.37083 10.2483 13 14.0833 13H15.1667C17.4652 13 19.6696 13.9131 21.2949 15.5384C22.9202 17.1637 23.8333 19.3681 23.8333 21.6667C23.8333 22.2413 23.6051 22.7924 23.1987 23.1987C22.7924 23.6051 22.2413 23.8333 21.6667 23.8333C21.6179 23.833 21.5705 23.8171 21.5315 23.7878C21.4925 23.7586 21.4639 23.7176 21.45 23.6708C21.122 22.7634 20.6381 21.9201 20.02 21.1792C19.8575 20.9625 19.565 21.1142 19.5975 21.3633L19.8683 23.53C19.89 23.6925 19.76 23.8333 19.5975 23.8333H9.75C9.17536 23.8333 8.62426 23.6051 8.21793 23.1987C7.81161 22.7924 7.58333 22.2413 7.58333 21.6667V19.2617C7.58333 17.5608 6.8575 15.9575 5.92583 14.5275C4.1952 11.8025 3.26779 8.64476 3.25 5.41667Z" fill="currentColor"/>
                                    </svg>
                                    <p>View Profile</p>
                                </button>
                                <button class="button blue has-tooltip" data-tooltip="Re-sync your Discord profile with Shop Archives" id="resync">
                                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.7501 2.16668C23.0374 2.16668 23.313 2.28082 23.5161 2.48398C23.7193 2.68715 23.8334 2.9627 23.8334 3.25001V9.75001C23.8334 10.0373 23.7193 10.3129 23.5161 10.516C23.313 10.7192 23.0374 10.8333 22.7501 10.8333H16.2501C15.9628 10.8333 15.6872 10.7192 15.484 10.516C15.2809 10.3129 15.1667 10.0373 15.1667 9.75001C15.1667 9.4627 15.2809 9.18715 15.484 8.98398C15.6872 8.78082 15.9628 8.66668 16.2501 8.66668H20.5076C19.8814 7.58197 19.0276 6.64587 18.0049 5.92284C16.9822 5.19981 15.8149 4.70704 14.5835 4.47846C13.352 4.24988 12.0857 4.29093 10.8716 4.59877C9.65756 4.90662 8.52465 5.47394 7.55091 6.26168C7.32681 6.44269 7.03997 6.52726 6.75351 6.49679C6.46705 6.46631 6.20443 6.32329 6.02341 6.09918C5.8424 5.87507 5.75783 5.58824 5.78831 5.30178C5.81878 5.01531 5.96181 4.75269 6.18591 4.57168C7.31713 3.65318 8.62233 2.97283 10.0231 2.57149C11.4239 2.17016 12.8914 2.05612 14.3373 2.23623C15.7833 2.41635 17.178 2.8869 18.4375 3.61961C19.697 4.35232 20.7954 5.33208 21.6667 6.50001V3.25001C21.6667 2.9627 21.7809 2.68715 21.984 2.48398C22.1872 2.28082 22.4628 2.16668 22.7501 2.16668ZM3.25008 23.8333C2.96276 23.8333 2.68721 23.7192 2.48405 23.516C2.28088 23.3129 2.16675 23.0373 2.16675 22.75V16.25C2.16675 15.9627 2.28088 15.6871 2.48405 15.484C2.68721 15.2808 2.96276 15.1667 3.25008 15.1667H9.75008C10.0374 15.1667 10.3129 15.2808 10.5161 15.484C10.7193 15.6871 10.8334 15.9627 10.8334 16.25C10.8334 16.5373 10.7193 16.8129 10.5161 17.016C10.3129 17.2192 10.0374 17.3333 9.75008 17.3333H5.49258C6.11876 18.4181 6.9726 19.3542 7.9953 20.0772C9.018 20.8002 10.1853 21.293 11.4167 21.5216C12.6481 21.7501 13.9145 21.7091 15.1286 21.4013C16.3426 21.0934 17.4755 20.5261 18.4492 19.7383C18.5602 19.6487 18.6878 19.5818 18.8246 19.5415C18.9614 19.5012 19.1048 19.4882 19.2467 19.5032C19.3885 19.5183 19.526 19.5612 19.6512 19.6294C19.7765 19.6977 19.8871 19.7899 19.9767 19.9008C20.0664 20.0118 20.1333 20.1393 20.1736 20.2762C20.2139 20.413 20.2269 20.5564 20.2119 20.6983C20.1968 20.8401 20.1539 20.9776 20.0857 21.1028C20.0174 21.2281 19.9252 21.3387 19.8142 21.4283C18.6824 22.3454 17.3771 23.0245 15.9765 23.425C14.576 23.8255 13.109 23.9391 11.6634 23.759C10.2179 23.579 8.82357 23.1089 7.56404 22.3771C6.30451 21.6453 5.20569 20.6667 4.33341 19.5V22.75C4.33341 23.0373 4.21928 23.3129 4.01611 23.516C3.81295 23.7192 3.5374 23.8333 3.25008 23.8333Z" fill="currentColor"/>
                                    </svg>
                                    <p>Re-sync</p>
                                </button>
                                <button class="button red has-tooltip" data-tooltip="Log Out" onclick="logoutOfDiscord()">
                                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9.75033 13C10.0376 13 10.3132 13.1141 10.5164 13.3173C10.7195 13.5205 10.8337 13.796 10.8337 14.0833V16.25C10.8337 16.5373 10.7195 16.8129 10.5164 17.016C10.3132 17.2192 10.0376 17.3333 9.75033 17.3333C9.46301 17.3333 9.18746 17.2192 8.98429 17.016C8.78113 16.8129 8.66699 16.5373 8.66699 16.25V14.0833C8.66699 13.796 8.78113 13.5205 8.98429 13.3173C9.18746 13.1141 9.46301 13 9.75033 13Z" fill="currentColor"/>
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M2.97949 3.2715C3.28405 2.92483 3.65894 2.64699 4.07922 2.45646C4.4995 2.26593 4.95554 2.16709 5.41699 2.1665H16.2503C17.1123 2.1665 17.9389 2.50891 18.5484 3.11841C19.1579 3.7279 19.5003 4.55455 19.5003 5.4165V13.6932C19.5003 14.1698 18.9045 14.4515 18.4712 14.289C17.7764 14.0307 17.0142 14.0177 16.311 14.252C15.6078 14.4864 15.0059 14.9541 14.605 15.5776C14.2041 16.201 14.0284 16.9428 14.107 17.6798C14.1855 18.4169 14.5137 19.1049 15.037 19.6298L15.0587 19.6623C15.1329 19.738 15.1833 19.8339 15.2035 19.9379C15.2238 20.042 15.2131 20.1498 15.1728 20.2478C15.1324 20.3458 15.0641 20.4299 14.9764 20.4895C14.8888 20.5491 14.7855 20.5817 14.6795 20.5832H14.6253C14.4817 20.5832 14.3439 20.6402 14.2423 20.7418C14.1407 20.8434 14.0837 20.9812 14.0837 21.1248C14.0829 21.5925 13.9611 22.0521 13.73 22.4587C13.4989 22.8653 13.1665 23.2051 12.765 23.4451C12.3636 23.6851 11.9069 23.817 11.4393 23.8281C10.9718 23.8391 10.5093 23.7289 10.097 23.5082L3.81366 20.1607C3.31366 19.8771 2.89782 19.466 2.60854 18.9693C2.31926 18.4725 2.1669 17.908 2.16699 17.3332V5.4165C2.17112 4.62511 2.46387 3.86241 2.99033 3.2715H2.97949ZM4.38783 5.384C4.38213 5.38239 4.37617 5.38196 4.3703 5.38274C4.36443 5.38352 4.35879 5.38549 4.35371 5.38854C4.34864 5.39158 4.34424 5.39563 4.34079 5.40044C4.33734 5.40525 4.33491 5.41072 4.33366 5.4165V17.3332C4.33366 17.7232 4.55033 18.0698 4.86449 18.2648L11.1153 21.6015C11.1979 21.6467 11.2909 21.6696 11.385 21.6679C11.4792 21.6662 11.5712 21.64 11.6522 21.5919C11.7331 21.5438 11.8001 21.4754 11.8465 21.3935C11.893 21.3116 11.9172 21.219 11.917 21.1248V8.68817C11.9156 8.57998 11.8818 8.4747 11.82 8.38588C11.7582 8.29706 11.6713 8.22878 11.5703 8.18984L4.38783 5.37317V5.384Z" fill="currentColor"/>
                                        <path d="M16.575 18.0917C16.4185 17.883 16.3426 17.625 16.3611 17.3649C16.3795 17.1048 16.4912 16.86 16.6756 16.6756C16.86 16.4912 17.1048 16.3795 17.3649 16.3611C17.625 16.3426 17.883 16.4185 18.0917 16.575L22.75 21.2225V17.3333C22.75 17.046 22.8641 16.7705 23.0673 16.5673C23.2705 16.3641 23.546 16.25 23.8333 16.25C24.1207 16.25 24.3962 16.3641 24.5994 16.5673C24.8025 16.7705 24.9167 17.046 24.9167 17.3333V23.8333C24.9167 24.1207 24.8025 24.3962 24.5994 24.5994C24.3962 24.8025 24.1207 24.9167 23.8333 24.9167H17.3333C17.046 24.9167 16.7705 24.8025 16.5673 24.5994C16.3641 24.3962 16.25 24.1207 16.25 23.8333C16.25 23.546 16.3641 23.2705 16.5673 23.0673C16.7705 22.8641 17.046 22.75 17.3333 22.75H21.2225L16.5642 18.0917H16.575Z" fill="currentColor"/>
                                    </svg>
                                    <p>Log Out</p>
                                </button>
                            </div>
                        </div>

                        <div class="enhanced-account-block profile-card">
                            <div class="banner"></div>
                            <div class="nameplate"></div>
                            <div class="section avatar-container">
                                <img class="avatar">
                                <img class="deco">
                            </div>
                            <div class="section">
                                <h1 id="global_name"></h1>
                                <p id="username"></p>
                            </div>
                        </div>
                    </div>
                `;

                if (currentUserData) {
                    const displayName = tabPageOutput.querySelector('#global_name');
                    const username = tabPageOutput.querySelector('#username');
                    const avatar = tabPageOutput.querySelector('.avatar');
                    const deco = tabPageOutput.querySelector('.deco');
                    const nameplate = tabPageOutput.querySelector('.nameplate');

                    const profileButton = tabPageOutput.querySelector("#profile");
                    const resyncButton = tabPageOutput.querySelector("#resync");

                    if (currentUserData.global_name) displayName.textContent = currentUserData.global_name;
                    else displayName.textContent = currentUserData.username;
                    username.textContent = currentUserData.username;

                    if (currentUserData.display_name_styles && JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'display_name_style_render')?.treatment === 1) {
                        const dns = renderDisplayNameStyle(currentUserData.display_name_styles);
                        displayName.classList.add(dns.class);
                        Object.assign(displayName.style, dns.style);

                        if (currentUserData.display_name_styles.effect_id === 2) {
                            displayName.classList.add('dns-gradient-type-2');
                        }
                    }

                    let userAvatar = 'https://cdn.discordapp.com/avatars/'+currentUserData.id+'/'+currentUserData.avatar+'.webp?size=128';
                    if (currentUserData.avatar.includes('a_')) userAvatar = 'https://cdn.discordapp.com/avatars/'+currentUserData.id+'/'+currentUserData.avatar+'.gif?size=128';
                    if (currentUserData.avatar) avatar.src = userAvatar;
                    else avatar.remove();

                    if (currentUserData.avatar_decoration_data) deco.src = `https://cdn.discordapp.com/avatar-decoration-presets/${currentUserData.avatar_decoration_data.asset}.png?size=4096&passthrough=true`;
                    else deco.remove();

                    if (currentUserData.banner) tabPageOutput.querySelector(".banner").style.backgroundImage = `url(https://cdn.discordapp.com/banners/${currentUserData.id}/${currentUserData.banner}.png?size=480)`;

                    if (currentUserData.collectibles?.nameplate) {
                        if (currentUserData.collectibles.nameplate.sa_override_src) {
                            let nameplatePreview = document.createElement("img");

                            nameplatePreview.src = currentUserData.collectibles.nameplate.sa_override_src;
    
                            nameplate.appendChild(nameplatePreview);
                        } else {
                            let nameplatePreview = document.createElement("video");

                            nameplatePreview.src = `https://cdn.discordapp.com/assets/collectibles/${currentUserData.collectibles.nameplate.asset}asset.webm`;
                            nameplatePreview.disablePictureInPicture = true;
                            nameplatePreview.muted = true;
                            nameplatePreview.loop = true;
                            nameplatePreview.playsInline = true;
                            nameplatePreview.autoplay = true;

                            const bgcolor = nameplate_palettes[currentUserData.collectibles.nameplate.palette].darkBackground;
    
                            nameplate.style.backgroundImage = `linear-gradient(90deg, #00000000 0%, ${bgcolor} 200%)`;
    
                            nameplate.appendChild(nameplatePreview);
                        }
                    }

                    profileButton.addEventListener('click', async () => {
                        openModal('user-modal', 'openUserModal', currentUserData.id);
                    });
                    resyncButton.addEventListener('click', async () => {
                        resyncButton.disabled = true;
                        resyncButton.classList.add('svg-spin');
                        const success = await fetchAndSyncUserInfo();
                        if (success === true) {
                            try {
                                loadPage(currentPageCache, true);
                                document.getElementById('ubar-displayname').textContent = currentUserData.global_name ? currentUserData.global_name : currentUserData.username;
                                document.getElementById('ubar-username').textContent = currentUserData.username;
                            } catch {}
                            setModalv3InnerContent('account');
                        } else {
                            resyncButton.classList.remove('svg-spin');
                            let syncError = document.createElement("div");
                            syncError.classList.add('enhanced-account-block');
                            syncError.classList.add('error-card');
                            syncError.innerHTML = `
                                <div class="section">
                                    <h3>There was an error syncing your profile!</h3>
                                    <p>Your Discord access token has expired, please login again to sync your profile.</p>
                                </div>
                                <div class="section">
                                    <button class="generic-button brand" onclick="loginWithDiscord();">
                                        <svg width="59" height="59" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M48.7541 12.511C45.2046 10.8416 41.4614 9.66246 37.6149 9C37.0857 9.96719 36.6081 10.9609 36.1822 11.9811C32.0905 11.3451 27.9213 11.3451 23.8167 11.9811C23.3908 10.9609 22.9132 9.96719 22.384 9C18.5376 9.67571 14.7815 10.8549 11.2319 12.5243C4.18435 23.2297 2.27404 33.67 3.2292 43.9647C7.35961 47.0915 11.9805 49.4763 16.8854 51C17.9954 49.4763 18.9764 47.8467 19.8154 46.1508C18.2149 45.5413 16.6789 44.7861 15.2074 43.8984C15.5946 43.6069 15.969 43.3155 16.3433 43.024C24.9913 47.1975 35.0076 47.1975 43.6557 43.024C44.03 43.3287 44.4043 43.6334 44.7915 43.8984C43.3201 44.7861 41.7712 45.5413 40.1706 46.164C41.0096 47.8599 41.9906 49.4763 43.1006 51C48.0184 49.4763 52.6393 47.1047 56.7697 43.9647C57.8927 32.0271 54.8594 21.6927 48.7412 12.511H48.7541ZM21.0416 37.6315C18.3827 37.6315 16.1755 35.1539 16.1755 32.1066C16.1755 29.0593 18.2923 26.5552 21.0287 26.5552C23.7651 26.5552 25.9465 29.0593 25.8949 32.1066C25.8432 35.1539 23.7522 37.6315 21.0416 37.6315ZM38.9831 37.6315C36.3113 37.6315 34.1299 35.1539 34.1299 32.1066C34.1299 29.0593 36.2467 26.5552 38.9831 26.5552C41.7195 26.5552 43.888 29.0593 43.8364 32.1066C43.7847 35.1539 41.6937 37.6315 38.9831 37.6315Z" fill="white"/>
                                        </svg>
                                        Login with Discord
                                    </button>
                                </div>
                            `;
                            tabPageOutput.querySelector('.enhanced-account-container').insertBefore(syncError, tabPageOutput.querySelector('.title-card').nextSibling);
                        }
                    });

                    if (currentUserData.ban_config.ban_type != 0) {
                        let syncError = document.createElement("div");
                        syncError.classList.add('enhanced-account-block');
                        syncError.classList.add('error-card');
                        syncError.innerHTML = `
                            <div class="section">
                                <h3>You have been banned.</h3>
                                <p>You have been banned and will not be able to use some features on Shop Archives. This ban cannot be appealed.</p>
                            </div>
                        `;
                        tabPageOutput.querySelector('.enhanced-account-container').insertBefore(syncError, tabPageOutput.querySelector('.title-card').nextSibling);
                    }
                } else {
                    tabPageOutput.querySelector('.enhanced-account-container').innerHTML = `
                        <div class="enhanced-account-block title-card">
                            <div class="section">
                                <h3>Discord Account</h3>
                                <p>Login with Discord to preview your profile around the website, and more!</p>
                            </div>
                            <div class="section">
                                <button class="generic-button brand" onclick="loginWithDiscord();">
                                    <svg width="59" height="59" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M48.7541 12.511C45.2046 10.8416 41.4614 9.66246 37.6149 9C37.0857 9.96719 36.6081 10.9609 36.1822 11.9811C32.0905 11.3451 27.9213 11.3451 23.8167 11.9811C23.3908 10.9609 22.9132 9.96719 22.384 9C18.5376 9.67571 14.7815 10.8549 11.2319 12.5243C4.18435 23.2297 2.27404 33.67 3.2292 43.9647C7.35961 47.0915 11.9805 49.4763 16.8854 51C17.9954 49.4763 18.9764 47.8467 19.8154 46.1508C18.2149 45.5413 16.6789 44.7861 15.2074 43.8984C15.5946 43.6069 15.969 43.3155 16.3433 43.024C24.9913 47.1975 35.0076 47.1975 43.6557 43.024C44.03 43.3287 44.4043 43.6334 44.7915 43.8984C43.3201 44.7861 41.7712 45.5413 40.1706 46.164C41.0096 47.8599 41.9906 49.4763 43.1006 51C48.0184 49.4763 52.6393 47.1047 56.7697 43.9647C57.8927 32.0271 54.8594 21.6927 48.7412 12.511H48.7541ZM21.0416 37.6315C18.3827 37.6315 16.1755 35.1539 16.1755 32.1066C16.1755 29.0593 18.2923 26.5552 21.0287 26.5552C23.7651 26.5552 25.9465 29.0593 25.8949 32.1066C25.8432 35.1539 23.7522 37.6315 21.0416 37.6315ZM38.9831 37.6315C36.3113 37.6315 34.1299 35.1539 34.1299 32.1066C34.1299 29.0593 36.2467 26.5552 38.9831 26.5552C41.7195 26.5552 43.888 29.0593 43.8364 32.1066C43.7847 35.1539 41.6937 37.6315 38.9831 37.6315Z" fill="white"/>
                                    </svg>
                                    Login with Discord
                                </button>
                            </div>
                        </div>
                    `;
                }
            } else {
                tabPageOutput.innerHTML = `
                    <h2>Account</h2>
                    <hr>
                    <div class="modalv3-content-card-1" id="discord-account-container">
                        <h2 class="modalv3-content-card-header">Discord Account</h2>
                        <p class="modalv3-content-card-summary">The Discord account linked to Shop Archives.</p>

                        <div id="modalv3-account-account-outdated-container">
                        </div>

                        <div id="modalv3-account-account-details-container">
                            <div class="modalv3-account-account-details">
                                <div class="modalv3-account-banner-color" style="background-color: var(--background-secondary);"></div>
                                <div class="modalv3-account-banner-image"></div>
                                <div class="modalv3-account-banner-filler"></div>

                                <div class="modalv3-account-avatar-preview-bg"></div>
                                <img class="modalv3-account-avatar-preview" style="background-color: var(--background-secondary);">
                                <p class="modalv3-account-displayname">Loading...</p>

                                <div class="account-tab-edit-account-buttons-container">
                                    <svg class="has-tooltip" id="resync-profiles-button" data-tooltip="Re-sync your Discord profile with Shop Archives" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M21 2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 1 1 0-2h3.93A8 8 0 0 0 6.97 5.78a1 1 0 0 1-1.26-1.56A9.98 9.98 0 0 1 20 6V3a1 1 0 0 1 1-1ZM3 22a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H5.07a8 8 0 0 0 11.96 2.22 1 1 0 1 1 1.26 1.56A9.99 9.99 0 0 1 4 18v3a1 1 0 0 1-1 1Z" class=""></path>
                                    </svg>
                                    <svg class="has-tooltip" id="logout-button" style="color: var(--text-feedback-critical)" data-tooltip="Log Out" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M9 12a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Z" class=""></path>
                                        <path fill="currentColor" fill-rule="evenodd" d="M2.75 3.02A3 3 0 0 1 5 2h10a3 3 0 0 1 3 3v7.64c0 .44-.55.7-.95.55a3 3 0 0 0-3.17 4.93l.02.03a.5.5 0 0 1-.35.85h-.05a.5.5 0 0 0-.5.5 2.5 2.5 0 0 1-3.68 2.2l-5.8-3.09A3 3 0 0 1 2 16V5a3 3 0 0 1 .76-1.98Zm1.3 1.95A.04.04 0 0 0 4 5v11c0 .36.2.68.49.86l5.77 3.08a.5.5 0 0 0 .74-.44V8.02a.5.5 0 0 0-.32-.46l-6.63-2.6Z" clip-rule="evenodd" class=""></path>
                                        <path fill="currentColor" d="M15.3 16.7a1 1 0 0 1 1.4-1.4l4.3 4.29V16a1 1 0 1 1 2 0v6a1 1 0 0 1-1 1h-6a1 1 0 1 1 0-2h3.59l-4.3-4.3Z" class=""></path>
                                    </svg>
                                </div>

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
                    <div class="modalv3-content-card-1">
                        <div class="setting">
                            <div class="setting-info">
                                <p class="setting-title">Child Mode</p>
                                <p class="setting-description">Automatically censor reviews containing inappropriate content.</p>
                            </div>
                            <div class="toggle-container">
                                <div class="toggle" id="reviews_filter_setting_toggle">
                                    <div class="toggle-circle"></div>
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
                    
                    const resyncButton = tabPageOutput.querySelector("#resync-profiles-button");
                    resyncButton.addEventListener('click', async () => {
                        resyncButton.classList.add('disabled');
                        const success = await fetchAndSyncUserInfo();
                        if (success === true) {
                            try {
                                loadPage(currentPageCache, true);
                                document.getElementById('ubar-displayname').textContent = currentUserData.global_name ? currentUserData.global_name : currentUserData.username;
                                document.getElementById('ubar-username').textContent = currentUserData.username;
                            } catch {}
                            setModalv3InnerContent('account');
                        } else {
                            tabPageOutput.querySelector("#modalv3-account-account-outdated-container").innerHTML = `
                                <div class="modalv3-profile-tab-file-too-large-warning">
                                    <p class="title">There was an error syncing your profile!</p>
                                    <p class="summary">Your Discord access token has expired, please login again to sync your profile.</p>

                                    <button class="log-in-with-discord-button" onclick="loginWithDiscord();">
                                        <svg width="59" height="59" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M48.7541 12.511C45.2046 10.8416 41.4614 9.66246 37.6149 9C37.0857 9.96719 36.6081 10.9609 36.1822 11.9811C32.0905 11.3451 27.9213 11.3451 23.8167 11.9811C23.3908 10.9609 22.9132 9.96719 22.384 9C18.5376 9.67571 14.7815 10.8549 11.2319 12.5243C4.18435 23.2297 2.27404 33.67 3.2292 43.9647C7.35961 47.0915 11.9805 49.4763 16.8854 51C17.9954 49.4763 18.9764 47.8467 19.8154 46.1508C18.2149 45.5413 16.6789 44.7861 15.2074 43.8984C15.5946 43.6069 15.969 43.3155 16.3433 43.024C24.9913 47.1975 35.0076 47.1975 43.6557 43.024C44.03 43.3287 44.4043 43.6334 44.7915 43.8984C43.3201 44.7861 41.7712 45.5413 40.1706 46.164C41.0096 47.8599 41.9906 49.4763 43.1006 51C48.0184 49.4763 52.6393 47.1047 56.7697 43.9647C57.8927 32.0271 54.8594 21.6927 48.7412 12.511H48.7541ZM21.0416 37.6315C18.3827 37.6315 16.1755 35.1539 16.1755 32.1066C16.1755 29.0593 18.2923 26.5552 21.0287 26.5552C23.7651 26.5552 25.9465 29.0593 25.8949 32.1066C25.8432 35.1539 23.7522 37.6315 21.0416 37.6315ZM38.9831 37.6315C36.3113 37.6315 34.1299 35.1539 34.1299 32.1066C34.1299 29.0593 36.2467 26.5552 38.9831 26.5552C41.7195 26.5552 43.888 29.0593 43.8364 32.1066C43.7847 35.1539 41.6937 37.6315 38.9831 37.6315Z" fill="white"/>
                                        </svg>
                                        Login with Discord
                                    </button>
                                </div>
                            `;
                        }
                    });

                    const logoutButton = tabPageOutput.querySelector("#logout-button");
                    logoutButton.addEventListener('click', async () => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('currentUser');
                        location.reload();
                    });



                    updateToggleStates();

                    tabPageOutput.querySelector('#reviews_filter_setting_toggle').addEventListener("click", () => {
                        toggleSetting('reviews_filter_setting');
                        updateToggleStates();
                    });

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
                            <p class="setting-title">Day-Month-Year Date Format</p>
                            <p class="setting-description">Changes date formats to DD/MM/YYYY instead of MM/DD/YY.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="non_us_timezone_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Profile Effects Cut Fix.</p>
                            <p class="setting-description">Fixes some profile effects being cut off at the bottom</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="profile_effect_tweaks_fix_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Category page limit</p>
                            <p class="setting-description">How many categories are shown on a page. Large values may cause lag on low-end devices.</p>
                        </div>
                        <div class="toggle-container">
                            <select id="category_page_limit_select" class="modalv3-experiment-treatment-container">
                                <option value="1">1</option>
                                <option value="3">3</option>
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="999">No Limit</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

            const selectEl = document.querySelector('#category_page_limit_select');

            for (const option of selectEl.options) {
                if (option.value === String(settingsStore.category_page_limit)) {
                    option.selected = true;
                    break;
                }
            }

            selectEl.addEventListener('change', () => {
                const selectedValue = selectEl.value;
                changeSetting('category_page_limit', Number(selectedValue));
                try {
                    loadPage(currentPageCache, true);
                } catch {}
            });

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
                </div>

                <hr class="inv">

                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">Events</h2>
                    <p class="modalv3-content-card-summary">Events are a sweet way to earn free XP, keep an eye out for new events!</p>

                    <div class="modalv3-xp-events-container" id="xp-events-unclaimed">

                    </div>
                    <div class="modalv3-xp-events-container" id="xp-events-claimed">

                    </div>
                </div>
            `;

            const xpBalance = tabPageOutput.querySelector('.xp-balance-modalv3-container');
            if (currentUserData) {
                const xpNeeded = currentUserData.xp_information.xp_to_level - currentUserData.xp_information.xp_into_level;
                const nextLevel = currentUserData.xp_information.level + 1;

                xpBalance.classList.add('has-tooltip');
                xpBalance.setAttribute('data-tooltip', 'You need '+xpNeeded.toLocaleString()+' more XP for Level '+nextLevel);

                xpBalance.innerHTML = `
                    <div class="bar"></div>
                    <p id="my-xp-balance">Level ${currentUserData.xp_information.level}</p>
                `;

                xpBalance.querySelector('.bar').style.width = currentUserData.xp_information.level_percentage+'%';
            }


            const unclaimedOutput = tabPageOutput.querySelector('#xp-events-unclaimed');
            const claimedOutput = tabPageOutput.querySelector('#xp-events-claimed');

            if (usersXPEventsCache) {
                refreshXPEventsList()
            }

            function refreshXPEventsList() {
                unclaimedOutput.innerHTML = ``;
                claimedOutput.innerHTML = ``;
                let unclaimedCount = 0;
                let claimedCount = 0;
                usersXPEventsCache.forEach(promo => {

                    let renderedDate;

                    let promoCard = document.createElement("div");

                    if (promo.already_claimed != true && promo.category_data === null || promo.already_claimed != true && settingsStore.staff_allow_category_only_event_claiming_in_events_tab === 1) {

                        unclaimedCount += 1;

                        promoCard.classList.add('modalv3-xp-reward');
                        promoCard.classList.add('unclaimed');

                        promoCard.innerHTML = `
                            <div id="xp-event-expires-at"></div>
                            <h3>${promo.name}</h3>
                            <p class="desc">You have ${promo.xp_reward.toLocaleString()} XP waiting for you.</p>
                            <button id="claim-xp-button">
                                Claim
                                <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M13.5 0L17.1462 9.85378L27 13.5L17.1462 17.1462L13.5 27L9.85378 17.1462L0 13.5L9.85378 9.85378L13.5 0Z" fill="currentColor"></path>
                                </svg>
                                ${promo.xp_reward.toLocaleString()}
                            </button>
                        `;

                        promoCard.querySelector('#claim-xp-button').addEventListener('click', () => {
                            openModal('modalv2', 'xpRedeem', promo.claimable_id);
                        });
                        
                        unclaimedOutput.appendChild(promoCard)
                    } else if (promo.already_claimed != true && promo.category_data != null) {

                        unclaimedCount += 1;

                        promoCard.classList.add('modalv3-xp-reward');
                        promoCard.classList.add('unclaimed');

                        let renderedName = promo.name;

                        if (promo.category_data.type === 1) {
                            renderedName = `Check out the ${promo.name} category for ${promo.xp_reward.toLocaleString()} XP!`;
                        } else if (promo.category_data.type === 2) {
                            renderedName = `Check out the ${promo.name} leaks for ${promo.xp_reward.toLocaleString()} XP!`;
                        }

                        promoCard.innerHTML = `
                            <div id="xp-event-expires-at"></div>
                            <h3>${renderedName}</h3>
                            <p class="desc">You have ${promo.xp_reward.toLocaleString()} XP waiting for you, visit the category to claim it.</p>
                            <button id="take-me-there-xp-button">
                                Take Me There
                            </button>
                        `;

                        promoCard.querySelector('#take-me-there-xp-button').addEventListener('click', () => {
                            closeModal();
                            addParams({page: promo.category_data.page});
                            currentOpenModalId = promo.category_data.sku_id;
                            loadPage(promo.category_data.page, true);
                        });
                        
                        unclaimedOutput.appendChild(promoCard)
                    } else if (promo.already_claimed === true) {

                        claimedCount += 1;

                        promoCard.classList.add('modalv3-xp-reward');

                        let renderedName = promo.name;

                        if (promo.category_data?.type === 1) {
                            renderedName = `${promo.name} category.`;
                        } else if (promo.category_data?.type === 2) {
                            renderedName = `${promo.name} leaks.`;
                        }

                        promoCard.innerHTML = `
                            <div id="xp-event-expires-at"></div>
                            <h3>${renderedName}</h3>
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
                                if (!settingsStore.staff_show_unpublished_xp_events) {
                                    promoCard.classList.remove('unclaimed');
                                    if (promoCard.querySelector('#take-me-there-xp-button')) promoCard.querySelector('#take-me-there-xp-button').remove();
                                    if (promoCard.querySelector('#claim-xp-button')) promoCard.querySelector('#claim-xp-button').remove();
                                    if (promo.already_claimed != true) {
                                        promoCard.querySelector('.desc').textContent = `You missed out on ${promo.xp_reward.toLocaleString()} XP.`;
                                    }
                                }
                                promoCard.querySelector('#xp-event-expires-at').innerHTML = `
                                    <p class="xp-event-expires-at-text">EXPIRED</p>
                                `;
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

                if (unclaimedCount === 0 && claimedCount === 0) {
                    let promoCard = document.createElement("div");

                    promoCard.classList.add('modalv3-xp-reward');

                    promoCard.innerHTML = `
                        <h3>All is quiet...</h3>
                        <p class="desc">There are no events happening right now, check back later.</p>
                    `;
                    
                    unclaimedOutput.appendChild(promoCard);
                } else if (unclaimedCount === 0) {
                    unclaimedOutput.remove();
                }
            }

            window.refreshXPEventsList = refreshXPEventsList;

        } else if (tab === "xp_perks") {
            tabPageOutput.innerHTML = `
                <h2>Levels</h2>

                <hr>

                <div class="modalv3-content-card-1">
                    <h2 class="modalv3-content-card-header">Perks</h2>
                    <p class="modalv3-content-card-summary">Earn XP and level up! Higher levels grant you better perks.</p>

                    <div class="modalv3-xp-levels-container" id="all-levels">

                    </div>
                </div>

            `;

            if (xpLevelStatsCache) {
                xpLevelStatsCache.forEach(level => {

                    let promoCard = document.createElement("div");

                    promoCard.classList.add('modalv3-xp-level-card');

                    promoCard.innerHTML = `
                        <h3>Level ${level.level}</h3>
                        <div class="xp-balance-modalv3-container">
                        </div>
                        <p class="desc">Reaching Level ${level.level} will unlock the following perks:</p>
                        <div class="xp-level-card-perks"></div>
                    `;

                    const xpBalance = promoCard.querySelector('.xp-balance-modalv3-container');

                    xpBalance.innerHTML = `
                        <div class="bar"></div>
                        <p id="my-xp-balance">${currentUserData.xp_information.xp_into_level}/${level.required_xp}</p>
                    `;

                    if (currentUserData.xp_information.level >= level.level) {
                        xpBalance.querySelector('#my-xp-balance').textContent = `${level.required_xp}/${level.required_xp}`;
                        promoCard.querySelector('.desc').textContent = `Reaching Level ${level.level} has unlocked the following perks:`;
                        xpBalance.querySelector('.bar').classList.add('shimmer');
                        xpBalance.querySelector('.bar').style.width = '100%';
                    }
                    else if (currentUserData.xp_information.level < level.level - 1) {
                        xpBalance.querySelector('#my-xp-balance').textContent = `0/${level.required_xp}`;
                    }
                    else {
                        xpBalance.querySelector('.bar').style.width = currentUserData.xp_information.level_percentage+'%';
                    }


                    if (level.level === 1) {
                        let xpLevelPerk = document.createElement("div");
                        xpLevelPerk.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                            </svg>
                            <div class="main">
                                <p>Avatar Decoration Preview</p>
                                <p class="sub">Show off your Discord avatar decoration on your profile and reviews.</p>
                            </div>
                        `;
                        if (!currentUserData.avatar_decoration_data) {
                            let cardError = document.createElement("div");
                            cardError.classList.add('main-err');
                            cardError.innerHTML = `
                                <p class="has-tooltip" data-tooltip="You don't have an avatar decoration on your Discord profile">You are not eligible for this perk.</p>
                            `;
                            xpLevelPerk.appendChild(cardError);
                        }
                        else if (currentUserData.user_features.includes("DECO_PERK")) {
                            let cardPerk = document.createElement("div");
                            cardPerk.classList.add('main-perk');
                            cardPerk.innerHTML = `
                                <p class="has-tooltip" data-tooltip="You have been granted this perk to use without needing to reach this Level">Active</p>
                            `;
                            xpLevelPerk.appendChild(cardPerk);
                        }
                        promoCard.querySelector('.xp-level-card-perks').appendChild(xpLevelPerk);
                    }
                    else if (level.level === 2) {
                        let xpLevelPerk = document.createElement("div");
                        xpLevelPerk.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                            </svg>
                            <div class="main">
                                <p>Server Tag Preview</p>
                                <p class="sub">Show off your Discord server tag on your profile and reviews.</p>
                            </div>
                        `;
                        if (!currentUserData.primary_guild) {
                            let cardError = document.createElement("div");
                            cardError.classList.add('main-err');
                            cardError.innerHTML = `
                                <p class="has-tooltip" data-tooltip="You don't have a server tag on your Discord profile">You are not eligible for this perk.</p>
                            `;
                            xpLevelPerk.appendChild(cardError);
                        }
                        else if (currentUserData.user_features.includes("TAG_PERK")) {
                            let cardPerk = document.createElement("div");
                            cardPerk.classList.add('main-perk');
                            cardPerk.innerHTML = `
                                <p class="has-tooltip" data-tooltip="You have been granted this perk to use without needing to reach this Level">Active</p>
                            `;
                            xpLevelPerk.appendChild(cardPerk);
                        }
                        promoCard.querySelector('.xp-level-card-perks').appendChild(xpLevelPerk);
                    }
                    else if (level.level === 3) {
                        if (JSON.parse(localStorage.getItem(overridesKey)).find(exp => exp.codename === 'display_name_style_xp_level_perk')?.treatment === 1) {
                            let xpLevelPerk = document.createElement("div");
                            xpLevelPerk.innerHTML = `
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                                </svg>
                                <div class="main">
                                    <p>Display Name Style Preview</p>
                                    <p class="sub">Show off your Discord display name style on your profile and reviews.</p>
                                </div>
                            `;
                            if (!currentUserData.display_name_styles) {
                                let cardError = document.createElement("div");
                                cardError.classList.add('main-err');
                                cardError.innerHTML = `
                                    <p class="has-tooltip" data-tooltip="You don't have a display name style on your Discord profile">You are not eligible for this perk.</p>
                                `;
                                xpLevelPerk.appendChild(cardError);
                            }
                            else if (currentUserData.user_features.includes("NAME_STYLE_PERK")) {
                                let cardPerk = document.createElement("div");
                                cardPerk.classList.add('main-perk');
                                cardPerk.innerHTML = `
                                    <p class="has-tooltip" data-tooltip="You have been granted this perk to use without needing to reach this Level">Active</p>
                                `;
                                xpLevelPerk.appendChild(cardPerk);
                            }
                            promoCard.querySelector('.xp-level-card-perks').appendChild(xpLevelPerk);
                        }
                        let xpLevelPerk = document.createElement("div");
                        xpLevelPerk.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                            </svg>
                            <div class="main">
                                <p>Increased Review Character Limit</p>
                                <p class="sub">Lets you submit reviews with up to 200 characters.</p>
                            </div>
                        `;
                        if (currentUserData.user_features.includes("REVIEW_200_CHAR")) {
                            let cardPerk = document.createElement("div");
                            cardPerk.classList.add('main-perk');
                            cardPerk.innerHTML = `
                                <p class="has-tooltip" data-tooltip="You have been granted this perk to use without needing to reach this Level">Active</p>
                            `;
                            xpLevelPerk.appendChild(cardPerk);
                        }
                        promoCard.querySelector('.xp-level-card-perks').appendChild(xpLevelPerk);
                    }
                    else if (level.level === 4) {
                        let xpLevelPerk = document.createElement("div");
                        xpLevelPerk.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                            </svg>
                            <div class="main">
                                <p>Nameplate Preview</p>
                                <p class="sub">Show off your Discord nameplate on your profile and reviews.</p>
                            </div>
                        `;
                        if (!currentUserData.collectibles?.nameplate) {
                            let cardError = document.createElement("div");
                            cardError.classList.add('main-err');
                            cardError.innerHTML = `
                                <p class="has-tooltip" data-tooltip="You don't have a nameplate on your Discord profile">You are not eligible for this perk.</p>
                            `;
                            xpLevelPerk.appendChild(cardError);
                        }
                        else if (currentUserData.user_features.includes("NAMEPLATE_PERK")) {
                            let cardPerk = document.createElement("div");
                            cardPerk.classList.add('main-perk');
                            cardPerk.innerHTML = `
                                <p class="has-tooltip" data-tooltip="You have been granted this perk to use without needing to reach this Level">Active</p>
                            `;
                            xpLevelPerk.appendChild(cardPerk);
                        }
                        promoCard.querySelector('.xp-level-card-perks').appendChild(xpLevelPerk);
                    }
                    else if (level.level === 5) {
                        let xpLevelPerk = document.createElement("div");
                        xpLevelPerk.innerHTML = `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                            </svg>
                            <div class="main">
                                <p>Increased Review Character Limit</p>
                                <p class="sub">Lets you submit reviews with up to 300 characters.</p>
                            </div>
                        `;
                        if (currentUserData.user_features.includes("REVIEW_300_CHAR")) {
                            let cardPerk = document.createElement("div");
                            cardPerk.classList.add('main-perk');
                            cardPerk.innerHTML = `
                                <p class="has-tooltip" data-tooltip="You have been granted this perk to use without needing to reach this Level">Active</p>
                            `;
                            xpLevelPerk.appendChild(cardPerk);
                        }
                        promoCard.querySelector('.xp-level-card-perks').appendChild(xpLevelPerk);
                    }


                    tabPageOutput.querySelector('#all-levels').appendChild(promoCard);
                });
            }

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

        } else if (tab === "modal_testing") {
            const textCategory = JSON.stringify(leaks_dummy_data.categories[0], undefined, 4);
            const textProduct = JSON.stringify(dummy_products[0], undefined, 4);
            tabPageOutput.innerHTML = `
                <h2>Modal Testing</h2>

                <hr>

                <button class="generic-button brand" onclick="openModal('modalv3', 'userSettings');">Open User Settings Modal (Not Recommended)</button>

                <hr class="inv">

                <button class="generic-button brand" id="open-text-category-button">Open Category Modal</button>

                <hr class="inv">

                <button class="generic-button brand" id="open-text-product-button">Open Product Modal</button>

                <hr class="inv">

                <input type="text" class="modalv3-input" autocomplete="off" placeholder="User ID" id="open-user-modal-input"></input>
                <button class="generic-button brand" id="open-user-modal">Open User Modal</button>

                <hr class="inv">

                <input type="text" class="modalv3-input" autocomplete="off" placeholder="Claimable ID" id="open-xp-claim-modal-input"></input>
                <button class="generic-button brand" id="open-xp-claim-modal">Open XP Claim Modal</button>
                <button class="generic-button brand" id="open-xp-redeem-modal">Open XP Redeem Modal</button>

                <hr class="inv">

                <button class="generic-button brand" id="open-loading-animation-modal">Play Loading Animation</button>
            `;

            tabPageOutput.querySelector('#open-text-category-button').addEventListener("click", () => {
                openModal('category-modal', 'fromCategoryBanner', JSON.parse(textCategory), 'https://cdn.discordapp.com/app-assets/1096190356233670716/1336165352392097853.png?size=4096');
            });

            tabPageOutput.querySelector('#open-text-product-button').addEventListener("click", () => {
                openModal('modalv2', 'fromCollectibleCard', JSON.parse(textCategory), JSON.parse(textProduct));
            });

            tabPageOutput.querySelector('#open-user-modal').addEventListener("click", () => {
                if (tabPageOutput.querySelector('#open-user-modal-input').value.trim().length != 0) {
                    openModal('user-modal', 'openUserModal', `${tabPageOutput.querySelector('#open-user-modal-input').value}`);
                }
            });

            tabPageOutput.querySelector('#open-xp-claim-modal').addEventListener("click", () => {
                if (tabPageOutput.querySelector('#open-xp-claim-modal-input').value.trim().length != 0) {
                    openModal('modalv2', 'xpClaim', `${tabPageOutput.querySelector('#open-xp-claim-modal-input').value}`);
                }
            });

            tabPageOutput.querySelector('#open-xp-redeem-modal').addEventListener("click", () => {
                if (tabPageOutput.querySelector('#open-xp-claim-modal-input').value.trim().length != 0) {
                    openModal('modalv2', 'xpRedeem', `${tabPageOutput.querySelector('#open-xp-claim-modal-input').value}`);
                }
            });

            tabPageOutput.querySelector('#open-loading-animation-modal').addEventListener("click", () => {
                openModal('modalv2', 'openLoadingTest');
            });

        } else {
            console.error(tab + ' is not a valid tab');
        }
    }

    window.setModalv3InnerContent = setModalv3InnerContent;

    function setDevSidebarTab(tab) {

        const devtoolsContainer = document.querySelector('.staff-devtools-container');

        if (devtoolsOpenCache != 1 && tab === 1) {

            devtoolsOpenCache = 1;

            devtoolsContainer.innerHTML = `
                <div class="staff-devtools">
                    <h2>Devtools</h2>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Shop: Force Leaks</p>
                            <p class="setting-description">Overrides the leaks endpoint with client side dummy data (requires restart).</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_force_leaks_dummy_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Shop: Force Show Reviews</p>
                            <p class="setting-description">Allows you to view the reviews for a category even if its reviews are disabled.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_force_viewable_reviews_tab_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Shop: Test Categories</p>
                            <p class="setting-description">Shows the test categories in the misc tab.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_show_test_categories_on_misc_page_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Simulate: Lite Ban</p>
                            <p class="setting-description">Simulate the user having ban_type 1.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_simulate_ban_type_1_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Simulate: Medium Ban</p>
                            <p class="setting-description">Simulate the user having ban_type 2.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_simulate_ban_type_2_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Simulate: Guidelines Block</p>
                            <p class="setting-description">Simulate the user having a username that doesn't follow the guidelines.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_simulate_guidelines_block_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Simulate: Sus Block</p>
                            <p class="setting-description">Simulate the user having a sus account.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_simulate_sus_block_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">XP: Unpublished Xp Events</p>
                            <p class="setting-description">Allows you to see unpublished or expired XP events.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_show_unpublished_xp_events_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">XP: Unpublished Xp Shop</p>
                            <p class="setting-description">Allows you to see unpublished XP shop items.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_show_unpublished_xp_shop_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">XP: Bypass Category Requirement</p>
                            <p class="setting-description">Allows you to claim category only events from the events tab.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_allow_category_only_event_claiming_in_events_tab_toggle">
                                <div class="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                    <div class="setting">
                        <div class="setting-info">
                            <p class="setting-title">Auth: Remove prompt=none</p>
                            <p class="setting-description">You'll want to enable this if discord browser forces you to auth with the app when you don't want it to.</p>
                        </div>
                        <div class="toggle-container">
                            <div class="toggle" id="staff_auth_remove_none_promt_toggle">
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

            devtoolsContainer.querySelector('#staff_show_test_categories_on_misc_page_toggle').addEventListener("click", () => {
                toggleSetting('staff_show_test_categories_on_misc_page');
                updateToggleStates();
                console.log(currentPageCache)
                loadPage(currentPageCache, true, true);
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

            devtoolsContainer.querySelector('#staff_simulate_sus_block_toggle').addEventListener("click", () => {
                toggleSetting('staff_simulate_sus_block');
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

            devtoolsContainer.querySelector('#staff_auth_remove_none_promt_toggle').addEventListener("click", () => {
                toggleSetting('staff_auth_remove_none_promt');
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
        } else if (devtoolsOpenCache != 2 && tab === 2) {

            devtoolsOpenCache = 2;

            devtoolsContainer.innerHTML = `
                <div class="staff-devtools">
                    <h2>Built in user editor will go here</h2>
                </div>
            `;
        } else {
            devtoolsOpenCache = 0;
            devtoolsContainer.innerHTML = ``;
        }
    }

    window.setDevSidebarTab = setDevSidebarTab;

    if (settingsStore.dev === 1) {
        document.getElementById('dev-tools-icon').classList.remove('hidden');
    }

}
window.loadSite = loadSite;

const removeonMobileObserver = new MutationObserver(() => {
    if (isMobileCache) {
        const elements = document.querySelectorAll('.remove-on-mobile');
        elements.forEach(el => {
            el.remove();
        });
    }
});
removeonMobileObserver.observe(document.body, {
    childList: true,
    subtree: true
});

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
    navigator.clipboard.writeText(value);
    if (value.includes("http")) {
        copyNotice(2);
    } else {
        copyNotice(1);
    }
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
    let discordUrl = `https://discord.com/api/oauth2/authorize?client_id=1342635740768501886&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=identify&prompt=none`;
    if (settingsStore.staff_auth_remove_none_promt === 1) {
        discordUrl = `https://discord.com/api/oauth2/authorize?client_id=1342635740768501886&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=identify`;
    }
    window.location.href = discordUrl;
}

function logoutOfDiscord() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
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



function copyNotice(type) {
    if (type === 1) {
        string = "Content Copied to Clipboard";
    } else if (type === 2) {
        string = "Link Copied to Clipboard";
    } else if (type === 3) {
        string = "Item Added to Favorites";
    } else if (type === 4) {
        string = "Item Removed from Favorites";
    } else {
        string = "Something Went Wrong";
        console.warn('Invalid copyNotice')
    }

    let copyNotice = document.createElement("div");

    copyNotice.classList.add('copy-notice-container');
    copyNotice.innerHTML = `
        <p>${string}</p>
    `;
                 
    document.body.appendChild(copyNotice);
    setTimeout(() => {
        copyNotice.remove();
    }, 5000);
}









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

function updateTooltipText(text) {
    if (!tooltip) return false;
    
    tooltip.textContent = text;
    
    // Reposition tooltip in case the new text changes its size
    if (currentTarget) {
        const rect = currentTarget.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width - tooltipRect.width) / 2;

        // Adjust if tooltip would go off screen
        if (top < 0) {
            top = rect.bottom + 8;
        }
        if (left < 0) {
            left = 8;
        } else if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 8;
        }

        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left + window.scrollX}px`;
    }
    
    return true;
}

function createTooltip(target, text) {
    // If tooltip exists and it's for the same target, just update the text
    if (tooltip && currentTarget === target) {
        updateTooltipText(text);
        return;
    }
    
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