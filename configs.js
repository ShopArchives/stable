
const appVersion = "7.2.2";
const appType = "Stable";

const endpoints = {
    MAIN: "https://api.yapper.shop/",
    VERSION: "v3",
    VERIFY_ORIGIN: "/heartbeat",
    SERVER_EXPERIMENTS: "/experiments",
    USER: "/users/@me",
    XP_EVENTS: "/xp-events",
    XP_INVENTORY: "/xp-inventory",
    XP_SHOP: "/claimables-shop",

    STABLE_LOGIN_CALLBACK: "/callback",
    DEV_LOGIN_CALLBACK: "/dev/callback",
    BETA_LOGIN_CALLBACK: "/beta/callback",

    USER_LOGIN: "/user-login",


    DISCORD_PROFILE_EFFECTS: "/discord-profile-effects",
    DISCORD_LEAKED_CATEGORIES: "/discord-leaked-categories",
    DISCORD_COLLECTIBLES_HOME: "/discord-collectibles-home",
    DISCORD_COLLECTIBLES_CATEGORIES: "/discord-collectibles-categories",
    DISCORD_ORBS_CATEGORIES: "/discord-orbs-categories",
    DISCORD_POTIONS: "/discord-consumables",
    DISCORD_MISCELLANEOUS_CATEGORIES: "/discord-miscellaneous-categories",
    CATEGORY_MODAL_INFO: "/category/",
    CATEGORY_MODAL_REVIEW: "/review",
    CATEGORY_MODAL_REVIEW_DELETE: "/reviews/",


    CLAIMABLES_PUBLISHED: "/claimables/published/",
    CLAIMABLES_REDEEM: "/claimables/redeem/",
    CLAIMABLES_PURCHASE: "/claimables/purchase/"
};

const redneredAPI = endpoints.MAIN + endpoints.VERSION;

const item_types = {
    NONE: 100,
    AVATAR_DECORATION: 0,
    PROFILE_EFFECT: 1,
    NAMEPLATE: 2,
    BUNDLE: 1e3,
    VARIANTS_GROUP: 2e3,
    EXTERNAL_SKU: 3e3
};

const category_types = {
    HERO: 0,
    FEATURED: 1,
    FEED: 2,
    WIDE_BANNER: 3
};

const discord_categories = {
    FANTASY: "1144003461608906824",
    ANIME: "1144302037593497701",
    BREAKFAST: "1144054000099012659",
    DISXCORE: "1144058340327047249",
    FALL: "1157406994873991284",
    HALLOWEEN: "1157410718711304313",
    WINTER: "1174459301239197856",
    MONSTERS: "1179493515038818325",
    CYBERPUNK: "1197342727608746044",
    LUNAR_NEW_YEAR: "1202069709281828935",
    ELEMENTS: "1207046915880124426",
    ANIME_V2: "1212565175790473246",
    SPECIAL_EVENTS: "1217175518781243583",
    SPECIAL_EVENTS_2: "1309309974266118144",
    ADS: "1382445856384487567",
    SPRINGTOONS: "1217622942175727736",
    SHY: "1220513972189663413",
    LOFI_VIBES: "1228243842684162121",
    GALAXY: "1232029045928099922",
    FEELIN_RETRO: "1237649643073044491",
    PIRATES: "1237653589896200272",
    ARCADE: "1245086656973901894",
    TIDE: "1252404112650407998",
    DARK_FANTASY: "1256321669388308595",
    ROBERT: "1262491137386614805",
    STORM: "1265375293397270650",
    DOJO: "1266520267946201099",
    THE_VAULT: "1277733175191277721",
    AUTUMN_EQUINOX: "1282816432056569866",
    BAND: "1285465421339693076",
    SPOOKY_NIGHT: "1287835634089594972",
    CHANCE: "1293373563494993952",
    MYTHICAL_CREATURES: "1298033986811068497",
    WARRIOR: "1303490165284802580",
    KAWAII_MODE: "1306330663213072494",
    LOFI_GIRL: "1309668861943218229",
    WINTER_WONDERLAND: "1314020997204283476",
    FANTASY_V2: "1324454241254903829",
    STEAMPUNK: "1326333074241486859",
    PROGRESS: "1333278032999485461",
    RADIATE: "1336483992429658112",
    VALENTINES: "1333866045521395723",
    ORB: "1332505418219655258",
    ANIME_V3: "1341506445249609728",
    INSOMNIA: "1343751621364027462",
    NAMEPLATE_TEST: "1344802365307621427",
    AESPA: "1346499610977243196",
    NAMEPLATE: "1349849614353829990",
    HOLIDAYS: "1349486948942745691",
    SHENANIGANS: "1352407446500675708",
    CHIBI_CAFE: "1354894010849820852",
    GGEZ: "1357589632723849316",
    HELLO: "1365410896222097539",
    COZY_VALLEY: "1369434230962262128",
    RC_TEST: "1370467303782617118",
    LEAF: "1373015260595884082",
    NAMEPLATE_V2: "1377377712200744990",
    SPELL: "1379220459316445257",
    ZEN_PROTOCOL: "1366494385746874428",
    NAMEPLATES_V3: "1382845914355470457",
    ODDS: "1385035256133849130",
    SUMMER_BLISS: "1385050947985735701",
    PAPER: "1387888352891764947"
};

const category_client_overrides = [
    {
        sku_id: discord_categories.FANTASY,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.ANIME,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.BREAKFAST,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.DISXCORE,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.FALL,
        banner_verification: "1157407583993339935",
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.HALLOWEEN,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.WINTER,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.MONSTERS,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.CYBERPUNK,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.LUNAR_NEW_YEAR,
        banner_verification: "1202069953306689626",
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.ELEMENTS,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.ANIME_V2,
        addLogo: !0,
        addAttributionLogo: !0,
        showDarkBannerText: !0
    },
    {
        sku_id: discord_categories.SPRINGTOONS,
        addLogo: !0,
        addAttributionLogo: !0,
        showDarkBannerText: !0
    },
    {
        sku_id: discord_categories.SHY,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.LOFI_VIBES,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.GALAXY,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.FEELIN_RETRO,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.PIRATES,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.ARCADE,
        addLogo: !0
    },
    {
        sku_id: discord_categories.TIDE,
        addLogo: !0,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.DARK_FANTASY,
        addAttributionLogo: !0
    },
    {
        sku_id: discord_categories.ROBERT,
        showDarkBannerText: !0
    },
    {
        sku_id: discord_categories.DOJO,
        showDarkBannerText: !0
    },
    {
        sku_id: discord_categories.THE_VAULT,
        modal_hero_banner: "https://cdn.yapper.shop/discord-assets/1.jpg"
    },
    {
        sku_id: discord_categories.AUTUMN_EQUINOX,
        modal_hero_banner: "https://cdn.yapper.shop/discord-assets/4.jpg"
    },
    {
        sku_id: discord_categories.BAND,
        animatedBanner: "https://cdn.discordapp.com/assets/content/7e328a07e057745faad2366c9ebdf03e2bd69d22dfe8d41c81a10d29a8de7cf7.png",
        modal_hero_banner: "https://cdn.yapper.shop/discord-assets/6.jpg"
    },
    {
        sku_id: discord_categories.WARRIOR,
        animatedBanner: "https://cdn.discordapp.com/assets/content/db9fb34f490b777a6e9712b129f9e23ad930595d2df73ca85d2b54f247806e01.png"
    },
    {
        sku_id: discord_categories.KAWAII_MODE,
        showDarkBannerText: !0,
        heroBanner: {
            darker: !0,
            gradientLeft: "linear-gradient(284deg, rgba(228, 23, 180, 0.00) 29.64%, rgba(228, 23, 180, 0.30) 68.69%)",
            gradientRight: "linear-gradient(76deg, rgba(228, 23, 180, 0.00) 29.64%, rgba(228, 23, 180, 0.30) 68.69%)",
            animationSource: "https://cdn.discordapp.com/assets/collectibles/drops/kawaii_mode/hero_banner.webm"
        },
        animatedBanner: "https://cdn.discordapp.com/assets/collectibles/drops/kawaii_mode/banner_animated.webm"
    },
    {
        sku_id: discord_categories.LOFI_GIRL,
        heroBanner: {
            animationSource: "https://cdn.discordapp.com/assets/collectibles/drops/lofi_girl/hero_banner.webm"
        },
        animatedBanner: "https://cdn.discordapp.com/assets/collectibles/drops/lofi_girl/banner_animated.webm"
    },
    {
        sku_id: discord_categories.ORB,
        modal_hero_banner: "https://cdn.discordapp.com/app-assets/1096190356233670716/1336165352392097853.png?size=4096"
    },
    {
        sku_id: discord_categories.NAMEPLATE,
        animatedBanner: "https://cdn.discordapp.com/assets/content/6f72be1e45f627e6b43894ca7dcda02c2851a3120a643a85c5132e87af6b50c4.webm"
    }
];

const nameplate_palettes = {
    crimson: {
        "darkBackground": "#900007",
        "lightBackground": "#E7040F"
    },
    berry: {
        "darkBackground": "#893A99",
        "lightBackground": "#B11FCF"
    },
    sky: {
        "darkBackground": "#0080B7",
        "lightBackground": "#56CCFF"
    },
    teal: {
        "darkBackground": "#086460",
        "lightBackground": "#7DEED7"
    },
    forest: {
        "darkBackground": "#2D5401",
        "lightBackground": "#6AA624"
    },
    bubble_gum: {
        "darkBackground": "#DC3E97",
        "lightBackground": "#F957B3"
    },
    violet: {
        "darkBackground": "#730BC8",
        "lightBackground": "#972FED"
    },
    cobalt: {
        "darkBackground": "#0131C2",
        "lightBackground": "#4278FF"
    },
    clover: {
        "darkBackground": "#047B20",
        "lightBackground": "#63CD5A"
    },
    lemon: {
        "darkBackground": "#F6CD12",
        "lightBackground": "#FED400"
    },
    white: {
        "darkBackground": "#FFFFFF",
        "lightBackground": "#FFFFFF"
    }
};

const experiments = [
    {
        title: `Published Items Category`,
        codename: `published_items_category`,
        release_config: {
            year: `2025`,
            month: `06`
        },
        treatments: [
            {
                title: `Not Eligible`
            },
            {
                title: `Show Published Items Category In Misc Tab`
            }
        ]
    },
    {
        title: `Advanced Theme Picker`,
        codename: `advanced_theme_picker`,
        release_config: {
            year: `2025`,
            month: `06`
        },
        treatments: [
            {
                title: `Not Eligible`
            },
            {
                title: `Enabled`
            }
        ]
    },
    {
        title: `XP System`,
        codename: `xp_system`,
        release_config: {
            year: `2025`,
            month: `05`
        },
        treatments: [
            {
                title: `Not Eligible`
            },
            {
                title: `Enabled`
            }
        ]
    }
];

const external_skus = {
    ORB_PROFILE_BADGE: "1342211853484429445",
    NITRO_CREDITS_3_DAYS: "1333912750274904064"
};

const defaultThemes = [
    {
        name: "Dark",
        codename: "dark",
        summary: "Easy on the eyes.",
        color: "#2B2D31",
        src: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODg2IiBoZWlnaHQ9IjQ5OSIgdmlld0JveD0iMCAwIDg4NiA0OTkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4ODUuNDM4IiBoZWlnaHQ9IjQ5OC4wNTkiIGZpbGw9IiMzOTNBNDEiLz4KPHJlY3QgeD0iMTIxLjc0OCIgd2lkdGg9Ijc2My42OSIgaGVpZ2h0PSIyMy45ODA2IiBmaWxsPSIjMzIzMzM5Ii8+CjxyZWN0IHdpZHRoPSIxMjEuNzQ4IiBoZWlnaHQ9IjQ5OC4wNTkiIGZpbGw9IiMzMjMzMzkiLz4KPHJlY3QgeD0iMTIyIiB5PSIyNCIgd2lkdGg9Ijc2MyIgaGVpZ2h0PSI0NzQiIGZpbGw9IiMzOTNBNDEiLz4KPHJlY3QgeD0iMTAiIHk9IjI4IiB3aWR0aD0iMTAyIiBoZWlnaHQ9IjI0IiByeD0iMyIgZmlsbD0iIzM5M0E0MSIvPgo8cmVjdCB4PSIxMCIgeT0iNTgiIHdpZHRoPSIxMDIiIGhlaWdodD0iMjQiIHJ4PSIzIiBmaWxsPSIjMzkzQTQxIi8+CjxyZWN0IHg9IjEwIiB5PSI4OCIgd2lkdGg9IjEwMiIgaGVpZ2h0PSIyNCIgcng9IjMiIGZpbGw9IiMzOTNBNDEiLz4KPHJlY3QgeD0iMTAiIHk9IjExOCIgd2lkdGg9IjEwMiIgaGVpZ2h0PSIyNCIgcng9IjMiIGZpbGw9IiMzOTNBNDEiLz4KPHJlY3QgeD0iMTAiIHk9IjE0OCIgd2lkdGg9IjEwMiIgaGVpZ2h0PSIyNCIgcng9IjMiIGZpbGw9IiMzOTNBNDEiLz4KPHJlY3QgeD0iMTc3IiB5PSI1MyIgd2lkdGg9IjY1NCIgaGVpZ2h0PSIxNDciIHJ4PSI5IiBmaWxsPSIjMTAxMjEzIiBzdHJva2U9IiMxRTFGMjIiIHN0cm9rZS13aWR0aD0iMiIvPgo8cmVjdCB5PSI0NjQiIHdpZHRoPSIxMjIiIGhlaWdodD0iMzQiIGZpbGw9IiMyQzJEMzIiLz4KPHJlY3QgeD0iMTc3IiB5PSIyMTkiIHdpZHRoPSIxNTIiIGhlaWdodD0iMjM5IiByeD0iOSIgZmlsbD0iIzEwMTIxMyIgc3Ryb2tlPSIjMUUxRjIyIiBzdHJva2Utd2lkdGg9IjIiLz4KPHJlY3QgeD0iNjc5IiB5PSIyMTkiIHdpZHRoPSIxNTIiIGhlaWdodD0iMjM5IiByeD0iOSIgZmlsbD0iIzEwMTIxMyIgc3Ryb2tlPSIjMUUxRjIyIiBzdHJva2Utd2lkdGg9IjIiLz4KPHJlY3QgeD0iMzQ1IiB5PSIyMTkiIHdpZHRoPSIxNTIiIGhlaWdodD0iMjM5IiByeD0iOSIgZmlsbD0iIzEwMTIxMyIgc3Ryb2tlPSIjMUUxRjIyIiBzdHJva2Utd2lkdGg9IjIiLz4KPHJlY3QgeD0iNTEyIiB5PSIyMTkiIHdpZHRoPSIxNTIiIGhlaWdodD0iMjM5IiByeD0iOSIgZmlsbD0iIzEwMTIxMyIgc3Ryb2tlPSIjMUUxRjIyIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+Cg=="
    },
    {
        name: "Midnight",
        codename: "midnight",
        summary: "Perfect for late-night browsing.",
        color: "#000000",
        src: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODg2IiBoZWlnaHQ9IjQ5OSIgdmlld0JveD0iMCAwIDg4NiA0OTkiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4ODUuNDM4IiBoZWlnaHQ9IjQ5OC4wNTkiIGZpbGw9IiMzOTNBNDEiLz4KPHJlY3QgeD0iMTIxLjc0OCIgd2lkdGg9Ijc2My42OSIgaGVpZ2h0PSIyMy45ODA2IiBmaWxsPSJibGFjayIvPgo8cmVjdCB3aWR0aD0iMTIxLjc0OCIgaGVpZ2h0PSI0OTguMDU5IiBmaWxsPSJibGFjayIvPgo8cmVjdCB4PSIxMjIiIHk9IjI0IiB3aWR0aD0iNzYzIiBoZWlnaHQ9IjQ3NCIgZmlsbD0iIzBDMEMwQyIvPgo8cmVjdCB4PSIxNzciIHk9IjUzIiB3aWR0aD0iNjU0IiBoZWlnaHQ9IjE0NyIgcng9IjkiIGZpbGw9ImJsYWNrIiBzdHJva2U9IiMxRTFGMjIiIHN0cm9rZS13aWR0aD0iMiIvPgo8cmVjdCB5PSI0NjQiIHdpZHRoPSIxMjIiIGhlaWdodD0iMzQiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjE3NyIgeT0iMjE5IiB3aWR0aD0iMTUyIiBoZWlnaHQ9IjIzOSIgcng9IjkiIGZpbGw9ImJsYWNrIiBzdHJva2U9IiMxRTFGMjIiIHN0cm9rZS13aWR0aD0iMiIvPgo8cmVjdCB4PSI2NzkiIHk9IjIxOSIgd2lkdGg9IjE1MiIgaGVpZ2h0PSIyMzkiIHJ4PSI5IiBmaWxsPSJibGFjayIgc3Ryb2tlPSIjMUUxRjIyIiBzdHJva2Utd2lkdGg9IjIiLz4KPHJlY3QgeD0iMzQ1IiB5PSIyMTkiIHdpZHRoPSIxNTIiIGhlaWdodD0iMjM5IiByeD0iOSIgZmlsbD0iYmxhY2siIHN0cm9rZT0iIzFFMUYyMiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxyZWN0IHg9IjUxMiIgeT0iMjE5IiB3aWR0aD0iMTUyIiBoZWlnaHQ9IjIzOSIgcng9IjkiIGZpbGw9ImJsYWNrIiBzdHJva2U9IiMxRTFGMjIiIHN0cm9rZS13aWR0aD0iMiIvPgo8cmVjdCB4PSIxMCIgeT0iMjgiIHdpZHRoPSIxMDIiIGhlaWdodD0iMjQiIHJ4PSIzIiBmaWxsPSIjMEMwQzBDIi8+CjxyZWN0IHg9IjEwIiB5PSI1OCIgd2lkdGg9IjEwMiIgaGVpZ2h0PSIyNCIgcng9IjMiIGZpbGw9IiMwQzBDMEMiLz4KPHJlY3QgeD0iMTAiIHk9Ijg4IiB3aWR0aD0iMTAyIiBoZWlnaHQ9IjI0IiByeD0iMyIgZmlsbD0iIzBDMEMwQyIvPgo8cmVjdCB4PSIxMCIgeT0iMTE4IiB3aWR0aD0iMTAyIiBoZWlnaHQ9IjI0IiByeD0iMyIgZmlsbD0iIzBDMEMwQyIvPgo8cmVjdCB4PSIxMCIgeT0iMTQ4IiB3aWR0aD0iMTAyIiBoZWlnaHQ9IjI0IiByeD0iMyIgZmlsbD0iIzBDMEMwQyIvPgo8L3N2Zz4K"
    }
];

const reviews_system_types = [
    {
        id: 1,
        codename: "info"
    },
    {
        id: 2,
        codename: "critical"
    },
    {
        id: 3,
        codename: "warning"
    },
    {
        id: 4,
        codename: "positive"
    }
];

const settings = {
    "non_us_timezone": 0,
    "profile_effect_tweaks_fix": 0,
    "reviews_filter_setting": 1,
    "category_page_limit": 5,
    "dev": 0,
    "staff_force_leaks_dummy": 0,
    "staff_force_viewable_reviews_tab": 0,
    "staff_simulate_ban_type_1": 0,
    "staff_simulate_ban_type_2": 0,
    "staff_simulate_guidelines_block": 0,
    "staff_show_unpublished_xp_events": 0,
    "staff_show_unpublished_xp_shop": 0,
    "staff_allow_category_only_event_claiming_in_events_tab": 0
};

const leaks_dummy_data = {
    version: 0,
    categories: [
        {
            "sku_id": "0",
            "name": "Leaks Dummy Category",
            "summary": null,
            "store_listing_id": null,
            "banner": null,
            "unpublished_at": null,
            "styles": null,
            "logo": null,
            "hero_ranking": null,
            "mobile_bg": null,
            "pdp_bg": null,
            "success_modal_bg": null,
            "mobile_banner": null,
            "featured_block": null,
            "hero_banner": null,
            "wide_banner": null,
            "hero_logo": null,
            "products": []
        }
    ]
};