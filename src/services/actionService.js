// Helper Functions
const getClaimedRole = (actionType) => {
    const actionRoleMap = {
        'taxes': 'Duke',
        'assassinate': 'Assassin',
        'steal': 'Captain',
        'exchange': 'Ambassador',
        'coup': null,
        'income': null,
        'foreignAid': null
    };
    return actionRoleMap[actionType] || null;
};

const canActionBeBlocked = (actionType) => {
    const blockRules = {
        'foreignAid': new Set(['Duke']),
        'steal': new Set(['Captain', 'Ambassador']),
        'assassinate': new Set(['Contessa'])
    };
    return blockRules[actionType] || new Set();
};

const canActionBeChallenged = (actionType) => {
    const challengeRules = new Set(['taxes', 'assassinate', 'steal', 'exchange']);
    return challengeRules.has(actionType);
};

const getBlockingRoles = (actionType) => {
    const blockRules = {
        'foreignAid': ['Duke'],
        'steal': ['Captain', 'Ambassador'],
        'assassinate': ['Contessa']
    };
    return blockRules[actionType] || [];
};

module.exports = {
    getClaimedRole,
    canActionBeBlocked,
    canActionBeChallenged,
    getBlockingRoles,
};