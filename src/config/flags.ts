export const FLAGS = {
    // Feature gate for AI Mix Assistant
    // Currently disabled globally as per business rules
    AI_MIX_ASSISTANT_ENABLED: false,
};

export const PLANS = {
    ENGINEER_BASIC: {
        id: 'engineer_basic',
        name: 'Engineer Basic',
        priceMonthly: 12,
        quotaBytes: 53687091200, // 50 GB
        hasAiMixAssistant: false
    },
    ENGINEER_PRO: {
        id: 'engineer_pro',
        name: 'Engineer Pro',
        priceMonthly: 21,
        quotaBytes: 107374182400, // 100 GB
        hasAiMixAssistant: true
    }
};
