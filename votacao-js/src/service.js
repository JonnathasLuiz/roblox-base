import * as domain from './domain/index.js';

/**
 * VotingService handles the business logic of the voting system.
 * it coordinates between the persistence layer and the domain logic.
 */
export class VotingService {
    /**
     * @param {PersistenceInterface} persistence - An implementation of PersistenceInterface.
     */
    constructor(persistence) {
        this.persistence = persistence;
    }

    setPersistence(persistence) {
        this.persistence = persistence;
    }

    async getMembers() { return this.persistence.getMembers(); }
    async getGroups() { return this.persistence.getGroups(); }
    async getRoles() { return this.persistence.getRoles(); }
    async getGmr() { return this.persistence.getGmr(); }
    async getProposals() { return this.persistence.getProposals(); }
    async getInstitutions() { return this.persistence.getInstitutions(); }
    async getCharacters() { return this.persistence.getCharacters(); }
    async getProducts() { return this.persistence.getProducts(); }
    async getBuildings() { return this.persistence.getBuildings(); }

    async saveGroup(groupData) { return this.persistence.saveGroup(groupData); }
    async updateGroup(id, groupData) { return this.persistence.updateGroup(id, groupData); }
    async saveRole(roleData) { return this.persistence.saveRole(roleData); }
    async updateRole(id, roleData) { return this.persistence.updateRole(id, roleData); }
    async saveMember(memberData) { return this.persistence.saveMember(memberData); }
    async saveInstitution(data) { return this.persistence.saveInstitution(data); }
    async updateInstitution(id, data) { return this.persistence.updateInstitution(id, data); }
    async saveCharacter(data) { return this.persistence.saveCharacter(data); }
    async updateCharacter(id, data) { return this.persistence.updateCharacter(id, data); }
    async saveProduct(data) { return this.persistence.saveProduct(data); }
    async updateProduct(id, data) { return this.persistence.updateProduct(id, data); }
    async saveBuilding(data) { return this.persistence.saveBuilding(data); }
    async updateBuilding(id, data) { return this.persistence.updateBuilding(id, data); }
    async updateGmr(characterId, groupId, roleId) { return this.persistence.updateGmr(characterId, groupId, roleId); }
    async deleteGmr(characterId, groupId) { return this.persistence.deleteGmr(characterId, groupId); }

    /**
     * Gets all proposals that a member is eligible to vote on in their current level.
     */
    async getPendingVotes(memberId) {
        const proposals = await this.persistence.getProposals();
        const pending = proposals.filter(p => p.status === domain.ProposalStatus.PENDING);
        const gmr = await this.persistence.getGmr();
        const votes = await this.persistence.getVotes();
        const characters = await this.persistence.getCharacters();

        const results = [];
        for (const p of pending) {
            const currentLevel = p.levels[p.current_level_index];

            // Check if already voted in this level
            const alreadyVoted = votes.some(v =>
                v.proposal_id === p.id &&
                v.level_index === p.current_level_index &&
                v.member_id === memberId
            );

            if (!alreadyVoted && domain.isEligibleToVote(memberId, currentLevel, gmr, characters)) {
                const hasVeto = domain.hasVetoPower(memberId, currentLevel, gmr, characters);

                // Calculate total eligible members for this level
                const eligibleMembers = domain.getEligibleMemberIds(currentLevel, gmr, characters);

                results.push({
                    ...p,
                    level_index: p.current_level_index,
                    min_approvals: currentLevel.min_approvals,
                    total_eligible: eligibleMembers.size,
                    has_veto_power: hasVeto
                });
            }
        }
        return results;
    }

    /**
     * Submits a vote and updates the proposal status.
     */
    async submitVote(proposalId, memberId, decision) {
        const proposal = await this.persistence.getProposalById(proposalId);
        if (!proposal || proposal.status !== domain.ProposalStatus.PENDING) {
            throw new Error('Proposal not found or not pending');
        }

        const votes = await this.persistence.getVotes();
        const alreadyVoted = votes.some(v =>
            v.proposal_id === proposalId &&
            v.level_index === proposal.current_level_index &&
            v.member_id === memberId
        );

        if (alreadyVoted) {
            throw new Error('Already voted in this level');
        }

        // Save the vote
        await this.persistence.saveVote({
            proposal_id: proposalId,
            level_index: proposal.current_level_index,
            member_id: memberId,
            decision
        });

        // Refresh data to calculate result
        const allVotes = await this.persistence.getVotes();
        const levelVotes = allVotes.filter(v =>
            v.proposal_id === proposalId &&
            v.level_index === proposal.current_level_index
        );

        const gmr = await this.persistence.getGmr();
        const characters = await this.persistence.getCharacters();
        const currentLevel = proposal.levels[proposal.current_level_index];

        // Calculate total eligible members for this level using domain logic
        const eligibleMembers = domain.getEligibleMemberIds(currentLevel, gmr, characters);

        const result = domain.calculateProposalResult(proposal, currentLevel, levelVotes, eligibleMembers.size);

        // Update proposal status based on result
        let newStatus = result.status;
        let newLevelIndex = result.current_level_index;

        if (result.status === 'next_step') {
            if (proposal.levels[result.current_level_index]) {
                newStatus = domain.ProposalStatus.PENDING;
                newLevelIndex = result.current_level_index;
            } else {
                newStatus = domain.ProposalStatus.APPROVED;
                newLevelIndex = proposal.current_level_index; // keep last valid index

                // If approved, apply effects
                if (proposal.effects && proposal.effects.length > 0) {
                    await this.applyProposalEffects(proposal.effects, proposal.institution_id);
                }
            }
        }

        await this.persistence.updateProposal(proposalId, {
            status: newStatus,
            current_level_index: newLevelIndex
        });

        return { status: newStatus };
    }

    async applyProposalEffects(effects, proposingInstitutionId) {
        const products = await this.persistence.getProducts();
        const institutions = await this.persistence.getInstitutions();
        const proposingInst = institutions.find(i => i.id === proposingInstitutionId);

        for (const effect of effects) {
            try {
                const product = products.find(p => p.id === parseInt(effect.target_id));
                if (!product) continue;

                // Authority check:
                // "O preço do produto é definido pela instituição, caso o governo não regulamentar"
                let hasAuthority = false;
                const isGov = proposingInst && proposingInst.type === 'governo';

                if (product.regulated) {
                    // If regulated, only Government (of any level) has authority
                    if (isGov) {
                        hasAuthority = true;
                    }
                } else {
                    // If NOT regulated, the authority institution (or its parents) defines it
                    if (proposingInstitutionId === product.authority_id ||
                        this._isParentOf(institutions, proposingInstitutionId, product.authority_id)) {
                        hasAuthority = true;
                    }
                    // If government proposes, they have authority to regulate it
                    if (isGov) {
                        hasAuthority = true;
                    }
                }

                if (!hasAuthority) {
                    console.warn(`Institution ${proposingInstitutionId} has no authority over product ${product.id} (Regulated: ${product.regulated})`);
                    continue;
                }

                const updates = {};

                // If a government vote happens, it automatically becomes regulated
                if (isGov) {
                    updates.regulated = true;
                }

                if (effect.type === domain.EffectType.TAX_CHANGE) {
                    const val = parseFloat(effect.value);
                    if (product.tax_floor !== null && val < product.tax_floor) continue;
                    if (product.tax_ceiling !== null && val > product.tax_ceiling) continue;

                    const newTaxes = { ...(product.taxes || {}) };
                    newTaxes[proposingInstitutionId] = val;
                    updates.taxes = newTaxes;
                } else if (effect.type === domain.EffectType.TAX_FLOOR) {
                    updates.tax_floor = parseFloat(effect.value);
                } else if (effect.type === domain.EffectType.TAX_CEILING) {
                    updates.tax_ceiling = parseFloat(effect.value);
                } else if (effect.type === domain.EffectType.TAX_DISTRIBUTION) {
                    const dist = typeof effect.value === 'string' ? JSON.parse(effect.value) : effect.value;
                    updates.tax_distribution = dist;

                    // If it's a distribution, we should update multiple institutions' taxes
                    // This satisfies "quanto é pago para cada um dos governos filhos"
                    const newTaxes = { ...(product.taxes || {}) };

                    // The distribution might specify levels. We need to find the institutions for those levels.
                    // For simplicity, if dist is an array of { institution_id, value }, use it.
                    // If it uses target_level (as in the placeholder), we'd need to map it.
                    // Let's support both or stick to a simple mapping for now.
                    for (const d of dist) {
                        if (d.institution_id) {
                            newTaxes[d.institution_id] = parseFloat(d.value);
                        }
                    }
                    updates.taxes = newTaxes;
                } else if (effect.type === domain.EffectType.BASE_PRICE) {
                    const val = parseFloat(effect.value);
                    if (product.price_floor !== null && val < product.price_floor) continue;
                    if (product.price_ceiling !== null && val > product.price_ceiling) continue;
                    updates.base_price = val;
                } else if (effect.type === domain.EffectType.PRICE_FLOOR) {
                    updates.price_floor = parseFloat(effect.value);
                } else if (effect.type === domain.EffectType.PRICE_CEILING) {
                    updates.price_ceiling = parseFloat(effect.value);
                } else if (effect.type === domain.EffectType.REGULATION) {
                    updates.regulated = (effect.value === 'true' || effect.value === true);
                }

                if (Object.keys(updates).length > 0) {
                    await this.persistence.updateProduct(product.id, updates);
                }
            } catch (e) {
                console.error('Failed to apply effect:', effect, e);
            }
        }
    }

    _isParentOf(institutions, parentId, childId) {
        let current = institutions.find(i => i.id === childId);
        while (current && current.parent_id) {
            if (current.parent_id === parentId) return true;
            current = institutions.find(i => i.id === current.parent_id);
        }
        return false;
    }

    async saveProposal(proposalData) {
        return this.persistence.saveProposal(proposalData);
    }
}
