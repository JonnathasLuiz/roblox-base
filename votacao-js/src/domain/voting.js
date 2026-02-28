import { VoteDecision, ProposalStatus } from './constants.js';

/**
 * Checks if a member is eligible to vote in a specific level of a proposal.
 * @param {number} memberId - The member (player) ID.
 * @param {Object} level - The level configuration.
 * @param {Array} gmr - Group-Character-Role assignments.
 * @param {Array} characters - All characters.
 */
export function isEligibleToVote(memberId, level, gmr, characters) {
    const levelGroupIds = level.groups.map(g => g.group_id);
    const levelRoleIds = level.roles || [];

    // Find all characters belonging to this member
    const memberCharacterIds = characters
        .filter(c => c.member_id === memberId)
        .map(c => c.id);

    // Filter GMRs for this member's characters that are in the allowed groups for this level
    const eligibleGmr = gmr.filter(item =>
        memberCharacterIds.includes(item.character_id) &&
        levelGroupIds.includes(item.group_id)
    );

    if (eligibleGmr.length === 0) return false;

    // If level has specific roles required
    if (levelRoleIds.length > 0) {
        return eligibleGmr.some(item => levelRoleIds.includes(item.role_id));
    }

    return true;
}

/**
 * Returns a Set of member IDs eligible to vote in a specific level.
 */
export function getEligibleMemberIds(level, allGmr, allCharacters) {
    const levelGroupIds = (level.groups || []).map(g => typeof g === 'object' ? g.group_id : g);
    const levelRoleIds = level.roles || [];

    // Map character_id to member_id
    const charToMemberMap = allCharacters.reduce((acc, char) => {
        acc[char.id] = char.member_id;
        return acc;
    }, {});

    const eligibleMemberIds = new Set();

    allGmr.forEach(item => {
        if (!levelGroupIds.includes(item.group_id)) return;
        if (levelRoleIds.length > 0 && !levelRoleIds.includes(item.role_id)) return;

        const memberId = charToMemberMap[item.character_id];
        if (memberId !== undefined) {
            eligibleMemberIds.add(memberId);
        }
    });

    return eligibleMemberIds;
}

/**
 * Checks if a member has veto power in a specific level via any of their characters.
 */
export function hasVetoPower(memberId, level, gmr, characters) {
    const vetoGroupIds = level.groups
        .filter(g => g.has_veto_power)
        .map(g => g.group_id);

    const memberCharacterIds = characters
        .filter(c => c.member_id === memberId)
        .map(c => c.id);

    return gmr.some(item =>
        memberCharacterIds.includes(item.character_id) &&
        vetoGroupIds.includes(item.group_id)
    );
}

/**
 * Calculates the required number of approvals based on a threshold (number or fraction)
 * and the total number of eligible members.
 */
export function getRequiredApprovals(minApprovals, totalEligibleMembers) {
    if (typeof minApprovals === 'number') return minApprovals;

    if (typeof minApprovals === 'string' && minApprovals.includes('/')) {
        const [num, den] = minApprovals.split('/').map(Number);
        if (den === 0) return totalEligibleMembers;
        return Math.ceil(totalEligibleMembers * (num / den));
    }

    const parsed = parseInt(minApprovals);
    return isNaN(parsed) ? 1 : parsed;
}

/**
 * Calculates the new state of a proposal based on a new vote.
 * @param {Object} proposal - The current proposal state.
 * @param {Object} currentLevel - The current level configuration.
 * @param {Array} currentVotes - All votes for the current level.
 * @param {number} totalEligibleMembers - Total number of members eligible for this level.
 * @returns {Object} { status, current_level_index, ... }
 */
export function calculateProposalResult(proposal, currentLevel, currentVotes, totalEligibleMembers) {
    const lastVote = currentVotes[currentVotes.length - 1];

    if (lastVote && lastVote.decision === VoteDecision.VETO) {
        return {
            status: ProposalStatus.VETOED,
            current_level_index: proposal.current_level_index
        };
    }

    const approvals = currentVotes.filter(v => v.decision === VoteDecision.APPROVE).length;
    const totalVoted = currentVotes.length;
    const minRequired = getRequiredApprovals(currentLevel.min_approvals, totalEligibleMembers);

    if (approvals >= minRequired) {
        // Move to next level or approve
        return {
            status: 'next_step', // Temporary status to indicate progress
            current_level_index: proposal.current_level_index + 1
        };
    }

    // Early rejection check: if it's impossible to reach minRequired approvals
    const remainingPossibleVotes = totalEligibleMembers - totalVoted;
    if (approvals + remainingPossibleVotes < minRequired) {
        return {
            status: ProposalStatus.REJECTED,
            current_level_index: proposal.current_level_index
        };
    }

    if (totalVoted === totalEligibleMembers) {
        return {
            status: ProposalStatus.REJECTED,
            current_level_index: proposal.current_level_index
        };
    }

    return {
        status: ProposalStatus.PENDING,
        current_level_index: proposal.current_level_index
    };
}
