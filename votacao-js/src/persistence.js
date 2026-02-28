/**
 * Persistence Interface (Base Class)
 * Defines the contract for all persistence implementations.
 */
export class PersistenceInterface {
    async getMembers() { throw new Error('Not implemented'); }
    async getGroups() { throw new Error('Not implemented'); }
    async getRoles() { throw new Error('Not implemented'); }
    async getGmr() { throw new Error('Not implemented'); } // Group Member Roles
    async getProposals() { throw new Error('Not implemented'); }
    async getProposalById(id) { throw new Error('Not implemented'); }
    async getVotes() { throw new Error('Not implemented'); }
    async saveProposal(proposalData) { throw new Error('Not implemented'); }
    async updateProposal(proposalId, proposalData) { throw new Error('Not implemented'); }
    async saveVote(voteData) { throw new Error('Not implemented'); }
    async saveGroup(groupData) { throw new Error('Not implemented'); }
    async updateGroup(id, groupData) { throw new Error('Not implemented'); }
    async saveRole(roleData) { throw new Error('Not implemented'); }
    async updateRole(id, roleData) { throw new Error('Not implemented'); }
    async saveMember(memberData) { throw new Error('Not implemented'); }
    async getInstitutions() { throw new Error('Not implemented'); }
    async saveInstitution(data) { throw new Error('Not implemented'); }
    async updateInstitution(id, data) { throw new Error('Not implemented'); }
    async getCharacters() { throw new Error('Not implemented'); }
    async saveCharacter(data) { throw new Error('Not implemented'); }
    async updateCharacter(id, data) { throw new Error('Not implemented'); }
    async getProducts() { throw new Error('Not implemented'); }
    async saveProduct(data) { throw new Error('Not implemented'); }
    async updateProduct(id, data) { throw new Error('Not implemented'); }
    async getBuildings() { throw new Error('Not implemented'); }
    async saveBuilding(data) { throw new Error('Not implemented'); }
    async updateBuilding(id, data) { throw new Error('Not implemented'); }
    async updateGmr(characterId, groupId, roleId) { throw new Error('Not implemented'); }
    async deleteGmr(characterId, groupId) { throw new Error('Not implemented'); }
}

/**
 * LocalStorage Implementation of the Persistence Interface.
 */
export class LocalStoragePersistence extends PersistenceInterface {
    constructor() {
        super();
        this.STORAGE_KEYS = {
            GROUPS: 'voting_groups',
            ROLES: 'voting_roles',
            MEMBERS: 'voting_members',
            GMR: 'voting_gmr',
            PROPOSALS: 'voting_proposals',
            VOTES: 'voting_votes',
            INSTITUTIONS: 'voting_institutions',
            CHARACTERS: 'voting_characters',
            PRODUCTS: 'voting_products',
            BUILDINGS: 'voting_buildings'
        };
        this.initSeed();
    }

    initSeed() {
        if (!localStorage.getItem(this.STORAGE_KEYS.INSTITUTIONS)) {
            const institutions = [
                { id: 1, name: 'Federação Global', type: 'governo', parent_id: null },
                { id: 2, name: 'Governo do País A', type: 'governo', parent_id: 1 },
                { id: 3, name: 'Estado de São Paulo', type: 'governo', parent_id: 2 },
                { id: 4, name: 'Cidade de Santos', type: 'governo', parent_id: 3 },
                { id: 5, name: 'Sindicato Nacional', type: 'sindicato', parent_id: null },
                { id: 6, name: 'Associação Comercial', type: 'empresa', parent_id: null }
            ];
            this._setData(this.STORAGE_KEYS.INSTITUTIONS, institutions);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.GROUPS)) {
            const groups = [
                { id: 1, name: 'Conselho Global', institution_id: 1 },
                { id: 2, name: 'Câmara Federal', institution_id: 2 },
                { id: 3, name: 'Assembleia Legislativa', institution_id: 3 },
                { id: 4, name: 'Câmara Municipal', institution_id: 4 },
                { id: 5, name: 'Diretoria Sindicato', institution_id: 5 },
                { id: 6, name: 'Conselho Empresarial', institution_id: 6 }
            ];
            this._setData(this.STORAGE_KEYS.GROUPS, groups);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.ROLES)) {
            const roles = [
                { id: 1, name: 'Presidente' },
                { id: 2, name: 'Secretário' },
                { id: 3, name: 'Conselheiro' },
                { id: 4, name: 'Membro' }
            ];
            this._setData(this.STORAGE_KEYS.ROLES, roles);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.MEMBERS)) {
            const members = [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
                { id: 3, name: 'Charlie' },
                { id: 4, name: 'David' }
            ];
            this._setData(this.STORAGE_KEYS.MEMBERS, members);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.CHARACTERS)) {
            const characters = [
                { id: 1, name: 'Alice Global', member_id: 1 },
                { id: 2, name: 'Alice Local', member_id: 1 },
                { id: 3, name: 'Bob Union', member_id: 2 },
                { id: 4, name: 'Charlie Biz', member_id: 3 },
                { id: 5, name: 'David Mayor', member_id: 4 }
            ];
            this._setData(this.STORAGE_KEYS.CHARACTERS, characters);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.GMR)) {
            const gmr = [
                { character_id: 1, group_id: 1, role_id: 1 }, // Alice Global in Conselho Global
                { character_id: 2, group_id: 3, role_id: 4 }, // Alice Local in Assembléia Legislativa
                { character_id: 3, group_id: 5, role_id: 1 }, // Bob in Sindicato
                { character_id: 4, group_id: 6, role_id: 3 }, // Charlie in Empresa
                { character_id: 5, group_id: 4, role_id: 1 }  // David in Câmara Municipal
            ];
            this._setData(this.STORAGE_KEYS.GMR, gmr);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.PRODUCTS)) {
            const products = [
                {
                    id: 1, name: 'Trigo', base_price: 10,
                    taxes: {},
                    price_floor: null, price_ceiling: null,
                    tax_floor: null, tax_ceiling: null, tax_distribution: [],
                    regulated: false, authority_id: 6
                },
                {
                    id: 2, name: 'Ferro', base_price: 50,
                    taxes: { 1: 0.05 }, // ID 1 is Global Federation
                    price_floor: null, price_ceiling: null,
                    tax_floor: null, tax_ceiling: null, tax_distribution: [],
                    regulated: true, authority_id: 1
                },
                {
                    id: 3, name: 'Madeira', base_price: 20,
                    taxes: {},
                    price_floor: null, price_ceiling: null,
                    tax_floor: null, tax_ceiling: null, tax_distribution: [],
                    regulated: false, authority_id: 6
                }
            ];
            this._setData(this.STORAGE_KEYS.PRODUCTS, products);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.BUILDINGS)) {
            const buildings = [
                { id: 1, name: 'Fazenda Santa Maria', type: 'moradia', owner_id: 1, owner_type: 'character' },
                { id: 2, name: 'Sede do Governo', type: 'instituicao', owner_id: 1, owner_type: 'institution' },
                { id: 3, name: 'Fábrica de Tecidos', type: 'edificacao', owner_id: 3, owner_type: 'institution' }
            ];
            this._setData(this.STORAGE_KEYS.BUILDINGS, buildings);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.PROPOSALS)) {
            this._setData(this.STORAGE_KEYS.PROPOSALS, []);
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.VOTES)) {
            this._setData(this.STORAGE_KEYS.VOTES, []);
        }
    }

    _getData(key) {
        return JSON.parse(localStorage.getItem(key));
    }

    _setData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    async getMembers() { return this._getData(this.STORAGE_KEYS.MEMBERS); }
    async getGroups() { return this._getData(this.STORAGE_KEYS.GROUPS); }
    async getRoles() { return this._getData(this.STORAGE_KEYS.ROLES); }
    async getGmr() { return this._getData(this.STORAGE_KEYS.GMR); }
    async getProposals() { return this._getData(this.STORAGE_KEYS.PROPOSALS); }
    async getVotes() { return this._getData(this.STORAGE_KEYS.VOTES); }
    async getInstitutions() { return this._getData(this.STORAGE_KEYS.INSTITUTIONS); }
    async getCharacters() { return this._getData(this.STORAGE_KEYS.CHARACTERS); }
    async getProducts() { return this._getData(this.STORAGE_KEYS.PRODUCTS); }
    async getBuildings() { return this._getData(this.STORAGE_KEYS.BUILDINGS); }

    async getProposalById(id) {
        const proposals = await this.getProposals();
        return proposals.find(p => p.id === id);
    }

    async saveProposal(proposalData) {
        const proposals = await this.getProposals();
        const newId = proposals.length > 0 ? Math.max(...proposals.map(p => p.id)) + 1 : 1;
        const newProposal = {
            ...proposalData,
            id: newId,
            status: 'pending',
            current_level_index: 0,
            created_at: new Date().toISOString()
        };
        proposals.push(newProposal);
        this._setData(this.STORAGE_KEYS.PROPOSALS, proposals);
        return { id: newId };
    }

    async updateProposal(proposalId, proposalData) {
        const proposals = await this.getProposals();
        const index = proposals.findIndex(p => p.id === proposalId);
        if (index === -1) throw new Error('Proposal not found');
        proposals[index] = { ...proposals[index], ...proposalData };
        this._setData(this.STORAGE_KEYS.PROPOSALS, proposals);
        return proposals[index];
    }

    async saveVote(voteData) {
        const votes = await this.getVotes();
        const newVote = {
            ...voteData,
            voted_at: new Date().toISOString()
        };
        votes.push(newVote);
        this._setData(this.STORAGE_KEYS.VOTES, votes);
        return { success: true };
    }

    async saveGroup(groupData) {
        const groups = await this.getGroups();
        const newId = groups.length > 0 ? Math.max(...groups.map(g => g.id)) + 1 : 1;
        const newGroup = { ...groupData, id: newId };
        groups.push(newGroup);
        this._setData(this.STORAGE_KEYS.GROUPS, groups);
        return newGroup;
    }

    async updateGroup(id, groupData) {
        const groups = await this.getGroups();
        const index = groups.findIndex(g => g.id === id);
        if (index === -1) throw new Error('Group not found');
        groups[index] = { ...groups[index], ...groupData };
        this._setData(this.STORAGE_KEYS.GROUPS, groups);
        return groups[index];
    }

    async saveRole(roleData) {
        const roles = await this.getRoles();
        const newId = roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1;
        const newRole = { ...roleData, id: newId };
        roles.push(newRole);
        this._setData(this.STORAGE_KEYS.ROLES, roles);
        return newRole;
    }

    async updateRole(id, roleData) {
        const roles = await this.getRoles();
        const index = roles.findIndex(r => r.id === id);
        if (index === -1) throw new Error('Role not found');
        roles[index] = { ...roles[index], ...roleData };
        this._setData(this.STORAGE_KEYS.ROLES, roles);
        return roles[index];
    }

    async saveMember(memberData) {
        const members = await this.getMembers();
        const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
        const newMember = { ...memberData, id: newId };
        members.push(newMember);
        this._setData(this.STORAGE_KEYS.MEMBERS, members);
        return newMember;
    }

    async saveInstitution(data) {
        const items = await this.getInstitutions();
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
        const newItem = { ...data, id: newId };
        items.push(newItem);
        this._setData(this.STORAGE_KEYS.INSTITUTIONS, items);
        return newItem;
    }

    async updateInstitution(id, data) {
        const items = await this.getInstitutions();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error('Institution not found');
        items[index] = { ...items[index], ...data };
        this._setData(this.STORAGE_KEYS.INSTITUTIONS, items);
        return items[index];
    }

    async saveCharacter(data) {
        const items = await this.getCharacters();
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
        const newItem = { ...data, id: newId };
        items.push(newItem);
        this._setData(this.STORAGE_KEYS.CHARACTERS, items);
        return newItem;
    }

    async updateCharacter(id, data) {
        const items = await this.getCharacters();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error('Character not found');
        items[index] = { ...items[index], ...data };
        this._setData(this.STORAGE_KEYS.CHARACTERS, items);
        return items[index];
    }

    async saveProduct(data) {
        const items = await this.getProducts();
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
        const newItem = { ...data, id: newId };
        items.push(newItem);
        this._setData(this.STORAGE_KEYS.PRODUCTS, items);
        return newItem;
    }

    async updateProduct(id, data) {
        const items = await this.getProducts();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error('Product not found');
        items[index] = { ...items[index], ...data };
        this._setData(this.STORAGE_KEYS.PRODUCTS, items);
        return items[index];
    }

    async saveBuilding(data) {
        const items = await this.getBuildings();
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
        const newItem = { ...data, id: newId };
        items.push(newItem);
        this._setData(this.STORAGE_KEYS.BUILDINGS, items);
        return newItem;
    }

    async updateBuilding(id, data) {
        const items = await this.getBuildings();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error('Building not found');
        items[index] = { ...items[index], ...data };
        this._setData(this.STORAGE_KEYS.BUILDINGS, items);
        return items[index];
    }

    async updateGmr(characterId, groupId, roleId) {
        const gmr = await this.getGmr();
        const index = gmr.findIndex(item => item.character_id === characterId && item.group_id === groupId);
        if (index !== -1) {
            gmr[index].role_id = roleId;
        } else {
            gmr.push({ character_id: characterId, group_id: groupId, role_id: roleId });
        }
        this._setData(this.STORAGE_KEYS.GMR, gmr);
        return { success: true };
    }

    async deleteGmr(characterId, groupId) {
        let gmr = await this.getGmr();
        gmr = gmr.filter(item => !(item.character_id === characterId && item.group_id === groupId));
        this._setData(this.STORAGE_KEYS.GMR, gmr);
        return { success: true };
    }
}
