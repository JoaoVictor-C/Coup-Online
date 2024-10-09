// Helper Functions
const getClaimedRole = (actionType) => {
    switch (actionType) {
        case 'taxes':
            return 'Duke';
        case 'assassinate':
            return 'Assassin';
        case 'steal':
            return 'Captain';
        case 'exchange':
            return 'Ambassador';
        case 'coup':
            return null; // No role required
        case 'income':
            return null;
        case 'foreignAid':
            return null;
        default:
            return null;
    }
};

const canActionBeBlocked = (actionType) => {
    const blockRules = {
        'foreignAid': ['Duke'],
        'steal': ['Captain', 'Ambassador'],
        'assassinate': ['Contessa']
    };
    return !!blockRules[actionType]; // Return true if the action can be blocked, false otherwise
};

const canActionBeChallenged = (actionType) => {
    const challengeRules = {
        'taxes': true,
        'assassinate': true,
        'steal': true,
        'exchange': true,
        'foreignAid': false,
        'income': false,
        'coup': false
    };
    return challengeRules[actionType] || false; // Return true if the action can be challenged, false otherwise
};

const getBlockingRoles = (actionType) => {
    const blockRules = {
        'foreignAid': ['Duke'],
        'steal': ['Captain', 'Ambassador'],
        'assassinate': ['Contessa']
    };
    return blockRules[actionType] || []; // Return an array of roles that can block the action
};

module.exports = {
    getClaimedRole,
    canActionBeBlocked,
    canActionBeChallenged,
    getBlockingRoles,
};
