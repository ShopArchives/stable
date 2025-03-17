// tbh i forgot what this experiment was
EXPERIMENT_ID_1 = 1

// 2024-11_item_data_downloads
EXPERIMENT_ID_2 = -1

// 2024-11_top_selling_item_tag
EXPERIMENT_ID_3 = -1

// 2024-11_epic_profiles_plus_category_changes
EXPERIMENT_ID_4 = 1

// 2024-11_full_client_rework
EXPERIMENT_ID_5 = 1


EXPERIMENT_ID_6 = 1

const experimentsList = [
    {
        title: "Quick Info Tab",
        id: "2025-03_quick_info",
        name: "experiment_2025_03_quick_info",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enabled"
        ],
        rollout: "Treatment 1: Enabled",
        needs_api_token: "true"
    },
    {
        title: "Extra Options Dismissible Content",
        id: "2025-03_extra_options_dismissible_content",
        name: "experiment_2025_03_extra_options_dismissible_content",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: V1"
        ],
        rollout: "Treatment -1: Disabled"
    },
    {
        title: "Early Nameplate Warning",
        id: "2025-03_early_nameplate_warning",
        name: "experiment_2025_03_early_nameplate_warning",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enabled"
        ],
        rollout: "Treatment -1: Disabled"
    },
    {
        //21
        title: "Item Reviews",
        id: "2025-03_item_reviews",
        name: "experiment_2025_03_item_reviews",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enabled",
            "Treatment 2: Simulate not logged in",
            "Treatment 3: Simulate logged in"
        ],
        rollout: "Treatment -1: Disabled",
        needs_api_token: "true"
    },
    {
        title: "Heartbeat",
        id: "2025-03_heartbeat",
        name: "experiment_2025_03_heartbeat",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Fetch once on startup",
            "Treatment 2: Fetch every 60 seconds"
        ],
        rollout: "Treatment -1: Disabled",
        needs_api_token: "true"
    },
    {
        title: "Fetch From Vercel Endpoits",
        id: "2025-02_fetch_from_vercel_endpoits",
        name: "experiment_2025_02_fetch_from_vercel_endpoits",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enabled"
        ],
        rollout: "Treatment 1: Enabled"
    },
    {
        title: "Extra Options",
        id: "2025-02_extra_options",
        name: "experiment_2025_02_extra_options",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 4: Enabled",
            "Treatment 5: Enabled w/o currency picker",
            "Treatment 6: Settings like discord"
        ],
        rollout: "Treatment 4: Enabled"
    },
    {
        title: "Profiles Plus Home",
        id: "2025-02_profiles_plus_home",
        name: "experiment_2025_02_profiles_plus_home",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 2: Enabled",
            "Treatment 3: Hide All Profiles Plus Tabs"
        ],
        rollout: "Treatment 2: Enabled"
    },
    {
        title: "Shop Category Modals",
        id: "2025-02_shop_category_modals",
        name: "experiment_2025_02_shop_category_modals",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enable category modals",
            "Treatment 2: Enable category modals w/ data downloads"
        ],
        rollout: "Treatment 1: Enable category modals"
    },
    {
        title: "Shop Card Modals",
        id: "2025-02_shop_card_modals",
        name: "experiment_2025_02_shop_card_modals",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enable modals",
            "Treatment 2: Enable modals w/ data downloads",
            "Treatment 3: Enable modals w/ p+",
            "Treatment 4: Enable modals w/ p+ on p+ page",
            "Treatment 5: Enable modals w/ data downloads and p+",
            "Treatment 6: Enable modals w/ data downloads and p+ on p+ page"
        ],
        rollout: "Treatment 4: Enable modals w/ p+ on p+ page"
    },
    {
        title: "Mobile Render",
        id: "2025-02_mobile_render",
        name: "experiment_2025_02_mobile_render",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Use new mobile check",
            "Treatment 2: Use old mobile check"
        ],
        rollout: "Treatment 1: Use new mobile check"
    },
    {
        title: "Orbs Shop",
        id: "2025-02_orbs_shop",
        name: "experiment_2025_02_orbs_shop",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 2: Orb Shop done like default",
            "Treatment 3: Default + New tag"
        ],
        rollout: "Treatment 3: Default + New tag",
        needs_api_token: "true"
    },
    {
        title: "Orb Testing",
        id: "2025-01_orb_testing",
        name: "experiment_2025_01_orb_testing",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 4: Orb Converter"
        ],
        rollout: "Treatment -1: Disabled"
    },
    {
        title: "Show Leaks On Home Page",
        id: "2025-01_show_leaks_on_home_page",
        name: "experiment_2025_01_show_leaks_on_home_page",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enabled"
        ],
        rollout: "Treatment -1: Disabled"
    },
    {
        title: "Theme Picker",
        id: "2024-12_theme_picker",
        name: "experiment_2024_12_theme_picker",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enabled",
            "Treatment 2: Enabled with custom css"
        ],
        rollout: "Treatment 1: Enabled"
    },
    {
        title: "Profiles Plus Marketing Variants",
        id: "2024-12_profiles_plus_marketing_variants",
        name: "experiment_2024_12_profiles_plus_marketing_variants",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Paper Beach V2",
            "Treatment 2: Roblox Doors"
        ],
        rollout: "Treatment -1: Disabled"
    },
    {
        title: "Collectibles Variants",
        id: "2024-11_collectibles_variants",
        name: "experiment_2024_11_collectibles_variants",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enabled"
        ],
        rollout: "Treatment 1: Enabled"
    },
    {
        title: "2024 Recap",
        id: "2024-11_recap",
        name: "experiment_2024_11_recap",
        treatments: [
            "Treatment -1: Disabled",
            "Treatment 1: Enabled",
            "Treatment 2: Nameplate Marketing"
        ],
        rollout: "Treatment -1: Disabled"
    }
];

const dismissibleContentList = [
    {
        title: "Orbs Shop New Tag",
        id: "dismissible_content_orbs_shop_new_tag",
        name: "dismissible_orbs_shop_new_tag",
        treatments: [
            "Treatment -1: Unseen",
            "Treatment 1: Seen"
        ]
    },
    {
        title: "New Profile Settings",
        id: "dismissible_content_newProfileSettings",
        name: "dismissible_newProfileSettings",
        treatments: [
            "Treatment -1: Unseen",
            "Treatment 1: Seen"
        ]
    },
    {
        title: "Roblox Doors Marketing",
        id: "dismissible_content_roblox_doors_marketing",
        name: "dismissible_roblox_doors_marketing",
        treatments: [
            "Treatment -1: Unseen",
            "Treatment 1: Seen"
        ]
    },
    {
        title: "Paper Beach V2 Marketing",
        id: "dismissible_content_paper_beach_v2_marketing",
        name: "dismissible_paper_beach_v2_marketing",
        treatments: [
            "Treatment -1: Unseen",
            "Treatment 1: Seen"
        ]
    },
    {
        title: "Recap 2024",
        id: "dismissible_content_recap_2024",
        name: "dismissible_recap_2024",
        treatments: [
            "Treatment -1: Unseen",
            "Treatment 1: Seen"
        ]
    }
];