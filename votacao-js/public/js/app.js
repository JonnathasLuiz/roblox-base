import {
    ReactiveState,
    VotingService,
    LocalStoragePersistence,
    getRequiredApprovals,
    EffectType,
    calculateProductPrice
} from '../../src/index.js';

// --- State Management ---
const state = new ReactiveState({
    persistenceType: 'local',
    activeTab: 'voting', // 'voting', 'admin', 'world', 'institutions', 'finance'
    members: [],
    groups: [],
    roles: [],
    gmr: [],
    proposals: [],
    pendingVotes: [],
    institutions: [],
    characters: [],
    products: [],
    buildings: [],
    currentMemberId: 1,
    memberFilter: '',
    groupFilter: '',
    roleFilter: '',
    showModal: false,
    newProposalLevels: [
        { min_approvals: '1/2', groups: [], roles: [] }
    ],
    newProposalEffects: [],
    showAdminModal: false,
    adminModalConfig: { title: '', mode: '', data: {} },
    financeInstitutionId: ''
});

// Initialize service with LocalStorage
const service = new VotingService(new LocalStoragePersistence());

// --- DOM Elements ---
const el = {
    selectMember: document.getElementById('select-member'),
    proposalsList: document.getElementById('proposals-list'),
    pendingVotesList: document.getElementById('pending-votes-list'),
    modalCreate: document.getElementById('modal-create'),
    btnNewProposal: document.getElementById('btn-new-proposal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelProposal: document.getElementById('btn-cancel-proposal'),
    btnAddLevel: document.getElementById('btn-add-level'),
    formProposal: document.getElementById('form-proposal'),
    levelsContainer: document.getElementById('levels-container'),
    effectsContainer: document.getElementById('effects-container'),
    btnAddEffect: document.getElementById('btn-add-effect'),
    selectProposingInstitution: document.getElementById('select-proposing-institution'),

    // Tabs
    tabBtnVoting: document.getElementById('tab-btn-voting'),
    tabBtnWorld: document.getElementById('tab-btn-world'),
    tabBtnInstitutions: document.getElementById('tab-btn-institutions'),
    tabBtnFinance: document.getElementById('tab-btn-finance'),
    tabBtnAdmin: document.getElementById('tab-btn-admin'),
    viewVoting: document.getElementById('view-voting'),
    viewWorld: document.getElementById('view-world'),
    viewInstitutions: document.getElementById('view-institutions'),
    viewFinance: document.getElementById('view-finance'),
    viewAdmin: document.getElementById('view-admin'),

    // World View
    worldProductsList: document.getElementById('world-products-list'),
    worldBuildingsList: document.getElementById('world-buildings-list'),

    // Finance View
    selectFinanceInstitution: document.getElementById('select-finance-institution'),
    financeProductsList: document.getElementById('finance-products-list'),

    // Institutions View
    institutionsTree: document.getElementById('institutions-tree'),
    playerCharactersList: document.getElementById('player-characters-list'),

    // Admin Views
    adminGroupsList: document.getElementById('admin-groups-list'),
    adminRolesList: document.getElementById('admin-roles-list'),
    adminProductsList: document.getElementById('admin-products-list'),
    adminMembersList: document.getElementById('admin-members-list'),
    btnNewGroup: document.getElementById('btn-new-group'),
    btnNewRole: document.getElementById('btn-new-role'),
    btnNewMember: document.getElementById('btn-new-member'),
    inputMemberFilter: document.getElementById('input-member-filter'),
    selectGroupFilter: document.getElementById('select-group-filter'),
    selectRoleFilter: document.getElementById('select-role-filter'),

    // Admin Modal
    modalAdmin: document.getElementById('modal-admin'),
    modalAdminTitle: document.getElementById('modal-admin-title'),
    formAdmin: document.getElementById('form-admin'),
    formAdminFields: document.getElementById('form-admin-fields'),
    btnCloseAdminModal: document.getElementById('btn-close-admin-modal')
};

// --- Actions ---
async function refreshData() {
    const s = state.state;
    if (s.showModal || s.showAdminModal) return;
    try {
        const [proposals, pendingVotes, members, groups, roles, gmr, institutions, characters, products, buildings] = await Promise.all([
            service.getProposals(),
            service.getPendingVotes(s.currentMemberId),
            service.getMembers(),
            service.getGroups(),
            service.getRoles(),
            service.getGmr(),
            service.getInstitutions(),
            service.getCharacters(),
            service.getProducts(),
            service.getBuildings()
        ]);
        state.setState({ proposals, pendingVotes, members, groups, roles, gmr, institutions, characters, products, buildings });
    } catch (e) {
        console.error('Failed to refresh data:', e);
    }
}

async function init() {
    await refreshData();
    const s = state.state;
    if (!s.currentMemberId && s.members.length > 0) {
        state.setState({ currentMemberId: s.members[0].id });
    }
}

async function handleVote(proposalId, decision) {
    try {
        await service.submitVote(proposalId, state.state.currentMemberId, decision);
        await refreshData();
    } catch (e) {
        alert('Erro ao votar: ' + e.message);
    }
}

// --- Rendering functions ---
function render() {
    const s = state.state;

    // Proposing Institution select (in Modal)
    if (el.selectProposingInstitution) {
        const proposingInstHtml = '<option value="">Selecione Instituição</option>' +
            s.institutions.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        if (el.selectProposingInstitution.innerHTML !== proposingInstHtml) {
            el.selectProposingInstitution.innerHTML = proposingInstHtml;
        }
    }

    // Tab visibility
    el.viewVoting.classList.toggle('hidden', s.activeTab !== 'voting');
    el.viewWorld.classList.toggle('hidden', s.activeTab !== 'world');
    el.viewInstitutions.classList.toggle('hidden', s.activeTab !== 'institutions');
    el.viewFinance.classList.toggle('hidden', s.activeTab !== 'finance');
    el.viewAdmin.classList.toggle('hidden', s.activeTab !== 'admin');

    // Tab buttons style
    const tabs = ['voting', 'world', 'institutions', 'finance', 'admin'];
    tabs.forEach(tab => {
        const btn = el[`tabBtn${tab.charAt(0).toUpperCase() + tab.slice(1)}`];
        btn.className = s.activeTab === tab
            ? "px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600 transition-colors whitespace-nowrap"
            : "px-6 py-3 font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent transition-colors whitespace-nowrap";
    });

    // Member select
    const memberSelectHtml = s.members.map(m => `
        <option value="${m.id}" ${m.id == s.currentMemberId ? 'selected' : ''}>${m.name}</option>
    `).join('');
    if (el.selectMember.innerHTML !== memberSelectHtml) {
        el.selectMember.innerHTML = memberSelectHtml;
    }

    if (s.activeTab === 'voting') renderVotingView(s);
    else if (s.activeTab === 'world') renderWorldView(s);
    else if (s.activeTab === 'institutions') renderInstitutionsView(s);
    else if (s.activeTab === 'finance') renderFinanceView(s);
    else if (s.activeTab === 'admin') renderAdminView(s);

    // Modal visibility
    el.modalCreate.classList.toggle('hidden', !s.showModal);
    if (s.showModal) {
        renderEffects();
        renderLevels();
    }

    el.modalAdmin.classList.toggle('hidden', !s.showAdminModal);
    if (s.showAdminModal) renderAdminModal();
}

function renderWorldView(s) {
    el.worldProductsList.innerHTML = s.products.map(p => {
        const { totalTaxRate, finalPrice, breakdown } = calculateProductPrice(p);
        const authority = s.institutions.find(i => i.id === p.authority_id);
        const limits = [
            p.price_floor ? `Piso P: ${p.price_floor}` : null,
            p.price_ceiling ? `Teto P: ${p.price_ceiling}` : null,
            (p.tax_floor !== undefined && p.tax_floor !== null) ? `Piso T: ${(p.tax_floor * 100).toFixed(0)}%` : null,
            (p.tax_ceiling !== undefined && p.tax_ceiling !== null) ? `Teto T: ${(p.tax_ceiling * 100).toFixed(0)}%` : null,
            p.regulated ? 'Regulado' : 'Livre'
        ].filter(Boolean).join(' | ');

        const breakdownHtml = Object.entries(breakdown).map(([instId, rate]) => {
            const inst = s.institutions.find(i => i.id === parseInt(instId));
            return `<div class="text-[9px] leading-tight text-gray-500 uppercase font-bold">${inst?.name || instId}: ${(rate * 100).toFixed(1)}%</div>`;
        }).join('');

        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3 font-medium">
                    ${p.name}
                    <div class="text-[10px] text-gray-400 uppercase">Autoridade: ${authority?.name || '?'}</div>
                </td>
                <td class="py-3">${p.base_price.toFixed(2)}</td>
                <td class="py-3">
                    <div>${(totalTaxRate * 100).toFixed(1)}%</div>
                    ${breakdownHtml}
                </td>
                <td class="py-3 font-bold text-blue-600">${finalPrice.toFixed(2)}</td>
                <td class="py-3 text-sm text-gray-500">${limits}</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" class="py-4 text-center">Nenhum produto cadastrado.</td></tr>';
}

function renderFinanceView(s) {
    // Institution selector
    const instOptions = '<option value="">Selecione Instituição</option>' +
        s.institutions.map(i => `<option value="${i.id}" ${i.id == s.financeInstitutionId ? 'selected' : ''}>${i.name}</option>`).join('');
    if (el.selectFinanceInstitution.innerHTML !== instOptions) {
        el.selectFinanceInstitution.innerHTML = instOptions;
    }

    if (!s.financeInstitutionId) {
        el.financeProductsList.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-gray-400 italic">Selecione uma instituição para ver o detalhamento financeiro.</td></tr>';
        return;
    }

    const selectedInst = s.institutions.find(i => i.id === parseInt(s.financeInstitutionId));

    // Filter products: either authority or taxes applied by this inst or its parents
    const relevantProducts = s.products.filter(p => {
        const isAuth = p.authority_id === selectedInst.id;
        const isTaxing = p.taxes && p.taxes[selectedInst.id] !== undefined;
        // Also check if selected inst is parent of the authority
        const isParentAuth = service._isParentOf(s.institutions, selectedInst.id, p.authority_id);
        return isAuth || isTaxing || isParentAuth;
    });

    el.financeProductsList.innerHTML = relevantProducts.map(p => {
        const { totalTaxRate, finalPrice, breakdown } = calculateProductPrice(p);
        const authority = s.institutions.find(i => i.id === p.authority_id);

        const breakdownHtml = Object.entries(breakdown).map(([instId, rate]) => {
            const inst = s.institutions.find(i => i.id === parseInt(instId));
            const isSelected = inst.id === selectedInst.id;
            return `
                <div class="flex justify-between gap-4 text-xs ${isSelected ? 'font-bold text-blue-600' : 'text-gray-500'}">
                    <span>${inst?.name || instId}:</span>
                    <span>+ ${(rate * 100).toFixed(1)}% (${(p.base_price * rate).toFixed(2)})</span>
                </div>
            `;
        }).join('');

        const isCompanyProduct = authority && authority.type === 'empresa';

        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3 font-medium">
                    ${p.name}
                    <div class="text-[10px] text-gray-400 uppercase">Responsável: ${authority?.name || '?'}</div>
                </td>
                <td class="py-3">
                    <div class="font-bold">${p.base_price.toFixed(2)}</div>
                    ${isCompanyProduct ? '<div class="text-[10px] text-gray-400 uppercase">Oferta da Empresa</div>' : ''}
                </td>
                <td class="py-3">
                    ${breakdownHtml || '<span class="text-xs text-gray-400">Sem taxas</span>'}
                </td>
                <td class="py-3">
                    <div class="text-lg font-bold text-blue-600">${finalPrice.toFixed(2)}</div>
                    <div class="text-[10px] text-gray-400 uppercase">Total (${(totalTaxRate * 100).toFixed(1)}% taxa)</div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="4" class="py-8 text-center text-gray-400">Nenhum produto relacionado a esta instituição.</td></tr>';

    el.worldBuildingsList.innerHTML = s.buildings.map(b => {
        let ownerName = 'Desconhecido';
        if (b.owner_type === 'character') {
            ownerName = s.characters.find(c => c.id === b.owner_id)?.name || 'Character ?';
        } else {
            ownerName = s.institutions.find(i => i.id === b.owner_id)?.name || 'Institution ?';
        }

        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-3 font-medium">${b.name}</td>
                <td class="py-3 capitalize">${b.type}</td>
                <td class="py-3 text-sm">${ownerName} (${b.owner_type})</td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="3" class="py-4 text-center">Nenhuma edificação cadastrada.</td></tr>';
}

function renderInstitutionsView(s) {
    const rootInstitutions = s.institutions.filter(i => !i.parent_id);

    function renderInstNode(inst, depth = 0) {
        const instGroups = s.groups.filter(g => g.institution_id === inst.id);
        const subInsts = s.institutions.filter(i => i.parent_id === inst.id);
        const marginClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : '';

        return `
            <div class="border rounded-lg p-4 bg-white shadow-sm mb-4 ${marginClass}">
                <div class="flex items-center gap-2 mb-3 border-b pb-2">
                    ${depth > 0 ? '<span class="text-gray-400">﹂</span>' : ''}
                    <h3 class="font-bold text-lg text-blue-800">${inst.name}</h3>
                    <span class="text-[10px] px-1 bg-gray-100 rounded text-gray-500 uppercase font-bold">${inst.type}</span>
                </div>

                <div class="space-y-3 mb-4">
                    ${instGroups.map(g => {
                        const membersInGroup = s.gmr.filter(item => item.group_id === g.id);
                        return `
                            <div class="ml-4">
                                <div class="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                    <span class="w-2 h-2 bg-blue-400 rounded-full"></span> ${g.name}
                                </div>
                                <div class="ml-3 mt-1 flex flex-wrap gap-1">
                                    ${membersInGroup.map(item => {
                                        const char = s.characters.find(c => c.id === item.character_id);
                                        const role = s.roles.find(r => r.id === item.role_id);
                                        return `
                                            <span class="text-[10px] bg-gray-50 border px-1.5 py-0.5 rounded">
                                                <span class="font-semibold text-gray-700">${char?.name || '?'}</span>
                                                <span class="text-gray-400">(${role?.name || '?'})</span>
                                            </span>
                                        `;
                                    }).join('') || '<span class="text-[10px] text-gray-300 italic">Ninguém</span>'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                ${subInsts.length > 0 ? `
                    <div class="mt-4 border-t pt-4">
                        <div class="text-[10px] font-bold text-gray-300 uppercase mb-2">Sub-Instituições</div>
                        ${subInsts.map(si => renderInstNode(si, depth + 1)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    el.institutionsTree.innerHTML = rootInstitutions.map(i => renderInstNode(i)).join('') ||
        '<div class="text-gray-400 italic">Nenhuma instituição cadastrada.</div>';

    const playerCharacters = s.characters.filter(c => c.member_id === s.currentMemberId);
    el.playerCharactersList.innerHTML = playerCharacters.map(c => {
        const assignments = s.gmr.filter(item => item.character_id === c.id);
        return `
            <div class="border p-3 rounded bg-white shadow-sm">
                <div class="font-bold">${c.name}</div>
                <div class="text-xs text-gray-500 mb-2">ID: ${c.id}</div>
                <div class="space-y-1">
                    ${assignments.map(a => {
                        const group = s.groups.find(g => g.id === a.group_id);
                        const inst = group ? s.institutions.find(i => i.id === group.institution_id) : null;
                        const role = s.roles.find(r => r.id === a.role_id);
                        return `
                            <div class="text-xs bg-blue-50 text-blue-700 p-1 rounded">
                                ${inst?.name || '?'}: ${group?.name || '?'} - <b>${role?.name || '?'}</b>
                            </div>
                        `;
                    }).join('') || '<div class="text-xs text-gray-400">Sem cargos atuais</div>'}
                </div>
            </div>
        `;
    }).join('') || '<div class="text-gray-500">Você não possui personagens para este jogador.</div>';
}

function renderVotingView(s) {
    // Proposals list
    el.proposalsList.innerHTML = s.proposals.length > 0 ? s.proposals.map(p => `
        <tr class="border-b hover:bg-gray-50">
            <td class="py-3">
                <div class="font-medium">${p.title}</div>
                <div class="text-sm text-gray-500">${p.description || ''}</div>
            </td>
            <td class="py-3">
                <span class="px-2 py-1 rounded text-xs font-bold uppercase ${getStatusClass(p.status)}">
                    ${p.status}
                </span>
            </td>
            <td class="py-3 text-center">${p.current_level_index + 1}</td>
            <td class="py-3 text-sm text-gray-500">${new Date(p.created_at).toLocaleString('pt-BR')}</td>
        </tr>
    `).join('') : '<tr><td colspan="4" class="py-8 text-center text-gray-500">Nenhuma proposta encontrada.</td></tr>';

    // Pending votes
    el.pendingVotesList.innerHTML = s.pendingVotes.length > 0 ? s.pendingVotes.map(pv => {
        const minCount = getRequiredApprovals(pv.min_approvals, pv.total_eligible);
        return `
        <div class="border p-4 rounded-lg space-y-3 bg-gray-50">
            <h3 class="font-bold text-lg">${pv.title}</h3>
            <p class="text-sm text-gray-600">${pv.description || ''}</p>
            <div class="bg-blue-100 p-2 rounded text-sm text-blue-800">
                Nível ${pv.level_index + 1} - Mínimo: ${pv.min_approvals} (${minCount} de ${pv.total_eligible})
            </div>
            <div class="flex gap-2">
                <button data-vote="approve" data-id="${pv.id}" class="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">Aprovar</button>
                ${pv.has_veto_power ?
                    `<button data-vote="veto" data-id="${pv.id}" class="flex-1 bg-black text-white py-2 rounded hover:bg-gray-800">Vetar</button>` :
                    `<button data-vote="reject" data-id="${pv.id}" class="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700">Rejeitar</button>`
                }
            </div>
        </div>
    `; }).join('') : '<div class="text-gray-500 py-4">Você não tem votações pendentes neste nível.</div>';
}

function renderAdminView(s) {
    // Synchronize filter input values
    if (el.inputMemberFilter.value !== s.memberFilter) {
        el.inputMemberFilter.value = s.memberFilter;
    }

    // Populate and sync group filter
    const groupFilterHtml = '<option value="">Todos Grupos</option>' +
        s.groups.map(g => `<option value="${g.id}" ${s.groupFilter == g.id ? 'selected' : ''}>${g.name}</option>`).join('');
    if (el.selectGroupFilter.innerHTML !== groupFilterHtml) {
        el.selectGroupFilter.innerHTML = groupFilterHtml;
    }

    // Populate and sync role filter
    const roleFilterHtml = '<option value="">Todos Cargos</option>' +
        s.roles.map(r => `<option value="${r.id}" ${s.roleFilter == r.id ? 'selected' : ''}>${r.name}</option>`).join('');
    if (el.selectRoleFilter.innerHTML !== roleFilterHtml) {
        el.selectRoleFilter.innerHTML = roleFilterHtml;
    }

    // Groups list
    el.adminGroupsList.innerHTML = `
        <div class="mb-4">
            <h4 class="text-sm font-bold uppercase text-gray-400 mb-2">Instituições</h4>
            ${s.institutions.map(i => `
                <div class="flex justify-between items-center p-2 bg-blue-50 rounded border mb-1">
                    <span class="font-medium text-sm">${i.name}</span>
                    <button data-admin-edit="institution" data-id="${i.id}" class="text-blue-600 hover:underline text-xs">Editar</button>
                </div>
            `).join('')}
            <button id="btn-new-institution" class="w-full mt-1 border-dashed border-2 p-1 text-xs text-gray-500 hover:bg-gray-50">+ Nova Instituição</button>
        </div>
        <div>
            <h4 class="text-sm font-bold uppercase text-gray-400 mb-2">Grupos</h4>
            ${s.groups.map(g => `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded border mb-1">
                    <span class="font-medium text-sm">${g.name}</span>
                    <button data-admin-edit="group" data-id="${g.id}" class="text-blue-600 hover:underline text-xs">Editar</button>
                </div>
            `).join('')}
        </div>
    `;
    // Re-bind the dynamically created button
    document.getElementById('btn-new-institution').onclick = () => state.setState({
        showAdminModal: true,
        adminModalConfig: { title: 'Nova Instituição', mode: 'institution', data: {} }
    });

    // Roles list
    el.adminRolesList.innerHTML = s.roles.map(r => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded border">
            <span class="font-medium">${r.name}</span>
            <button data-admin-edit="role" data-id="${r.id}" class="text-blue-600 hover:underline text-sm">Editar</button>
        </div>
    `).join('');

    // Products list
    if (el.adminProductsList) {
        el.adminProductsList.innerHTML = s.products.map(p => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded border mb-1">
                <span class="font-medium text-sm">${p.name}</span>
                <button data-admin-edit="product" data-id="${p.id}" class="text-blue-600 hover:underline text-xs">Editar</button>
            </div>
        `).join('');
    }

    // Characters instead of Members in assignments
    const filteredCharacters = s.characters.filter(c => {
        const matchesName = !s.memberFilter || c.name.toLowerCase().includes(s.memberFilter.toLowerCase());
        const charGmr = s.gmr.filter(item => item.character_id === c.id);

        let matchesFilters = true;
        if (s.groupFilter && s.roleFilter) {
            matchesFilters = charGmr.some(item => item.group_id == s.groupFilter && item.role_id == s.roleFilter);
        } else if (s.groupFilter) {
            matchesFilters = charGmr.some(item => item.group_id == s.groupFilter);
        } else if (s.roleFilter) {
            matchesFilters = charGmr.some(item => item.role_id == s.roleFilter);
        }

        return matchesName && matchesFilters;
    });

    el.adminMembersList.innerHTML = filteredCharacters.map(c => {
        const assignments = s.gmr.filter(item => item.character_id === c.id);
        const player = s.members.find(m => m.id === c.member_id);
        const assignmentsHtml = assignments.map(a => {
            const group = s.groups.find(g => g.id === a.group_id);
            const role = s.roles.find(r => r.id === a.role_id);
            return `
                <div class="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs mr-1 mb-1 border border-blue-200">
                    ${group?.name || '?'}: ${role?.name || '?'}
                    <button data-admin-delete-gmr="${c.id}-${a.group_id}" class="ml-2 text-red-500 hover:text-red-700">&times;</button>
                </div>
            `;
        }).join('') || '<span class="text-gray-400 text-xs italic">Sem atribuições</span>';

        return `
            <tr class="border-b">
                <td class="py-3">
                    <div class="font-medium">${c.name}</div>
                    <div class="text-xs text-gray-500">Jogador: ${player?.name || '?'}(${c.member_id})</div>
                </td>
                <td class="py-3">${assignmentsHtml}</td>
                <td class="py-3 text-right">
                    <button data-admin-edit="character" data-id="${c.id}" class="text-gray-500 hover:underline text-xs mr-2">Editar</button>
                    <button data-admin-add-gmr="${c.id}" class="text-blue-600 hover:underline text-sm">Atribuir Grupo</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAdminModal() {
    const { title, mode, data } = state.state.adminModalConfig;
    el.modalAdminTitle.textContent = title;

    let fieldsHtml = '';
    if (mode === 'group' || mode === 'role' || mode === 'member' || mode === 'institution' || mode === 'character' || mode === 'product') {
        fieldsHtml = `
            <div>
                <label class="block text-sm font-medium mb-1">Nome</label>
                <input name="name" type="text" value="${data.name || ''}" class="w-full border rounded p-2" required>
            </div>
        `;
        if (mode === 'institution') {
            fieldsHtml += `
                <div class="mt-4">
                    <label class="block text-sm font-medium mb-1">Tipo</label>
                    <select name="type" class="w-full border rounded p-2">
                        <option value="governo" ${data.type === 'governo' ? 'selected' : ''}>Governo</option>
                        <option value="empresa" ${data.type === 'empresa' ? 'selected' : ''}>Empresa</option>
                        <option value="sindicato" ${data.type === 'sindicato' ? 'selected' : ''}>Sindicato</option>
                    </select>
                </div>
                <div class="mt-4">
                    <label class="block text-sm font-medium mb-1">Instituição Pai</label>
                    <select name="parent_id" class="w-full border rounded p-2">
                        <option value="">Nenhuma (Raiz)</option>
                        ${state.state.institutions.filter(i => i.id !== data.id).map(i => `<option value="${i.id}" ${data.parent_id == i.id ? 'selected' : ''}>${i.name}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (mode === 'group') {
            fieldsHtml += `
                <div class="mt-4">
                    <label class="block text-sm font-medium mb-1">Instituição</label>
                    <select name="institution_id" class="w-full border rounded p-2">
                        <option value="">Nenhuma</option>
                        ${state.state.institutions.map(i => `<option value="${i.id}" ${data.institution_id == i.id ? 'selected' : ''}>${i.name}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (mode === 'character') {
            fieldsHtml += `
                <div class="mt-4">
                    <label class="block text-sm font-medium mb-1">Jogador (Membro)</label>
                    <select name="member_id" class="w-full border rounded p-2" required>
                        <option value="">Selecione um jogador</option>
                        ${state.state.members.map(m => `<option value="${m.id}" ${data.member_id == m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (mode === 'product') {
            fieldsHtml += `
                <div class="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Preço Base</label>
                        <input name="base_price" type="number" step="0.01" value="${data.base_price || 0}" class="w-full border rounded p-2" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Autoridade</label>
                        <select name="authority_id" class="w-full border rounded p-2" required>
                            <option value="">Selecione Instituição</option>
                            ${state.state.institutions.map(i => `<option value="${i.id}" ${data.authority_id == i.id ? 'selected' : ''}>${i.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Piso de Preço</label>
                        <input name="price_floor" type="number" step="0.01" value="${data.price_floor || ''}" class="w-full border rounded p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Teto de Preço</label>
                        <input name="price_ceiling" type="number" step="0.01" value="${data.price_ceiling || ''}" class="w-full border rounded p-2">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Piso de Taxa (%)</label>
                        <input name="tax_floor" type="number" step="1" value="${data.tax_floor ? data.tax_floor * 100 : ''}" class="w-full border rounded p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Teto de Taxa (%)</label>
                        <input name="tax_ceiling" type="number" step="1" value="${data.tax_ceiling ? data.tax_ceiling * 100 : ''}" class="w-full border rounded p-2">
                    </div>
                </div>
            `;
        }
    } else if (mode === 'gmr') {
        const { groups, roles } = state.state;
        fieldsHtml = `
            <input type="hidden" name="character_id" value="${data.character_id}">
            <div>
                <label class="block text-sm font-medium mb-1">Grupo</label>
                <select name="group_id" class="w-full border rounded p-2" required>
                    <option value="">Selecione um grupo</option>
                    ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Cargo</label>
                <select name="role_id" class="w-full border rounded p-2" required>
                    <option value="">Selecione um cargo</option>
                    ${roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                </select>
            </div>
        `;
    }

    if (el.formAdminFields.innerHTML !== fieldsHtml) {
        el.formAdminFields.innerHTML = fieldsHtml;
    }
}

function renderEffects() {
    const s = state.state;
    const effectsHtml = s.newProposalEffects.map((effect, idx) => {
        const isReg = effect.type === EffectType.REGULATION;
        const isDist = effect.type === EffectType.TAX_DISTRIBUTION;

        return `
            <div class="bg-gray-50 p-2 rounded border text-sm mb-2">
                <div class="flex gap-2 items-center">
                    <select data-effect-field="type" data-idx="${idx}" class="border rounded p-1 bg-white">
                        <option value="${EffectType.TAX_CHANGE}" ${effect.type === EffectType.TAX_CHANGE ? 'selected' : ''}>Alterar Taxa (%)</option>
                        <option value="${EffectType.TAX_FLOOR}" ${effect.type === EffectType.TAX_FLOOR ? 'selected' : ''}>Piso Taxa (%)</option>
                        <option value="${EffectType.TAX_CEILING}" ${effect.type === EffectType.TAX_CEILING ? 'selected' : ''}>Teto Taxa (%)</option>
                        <option value="${EffectType.TAX_DISTRIBUTION}" ${effect.type === EffectType.TAX_DISTRIBUTION ? 'selected' : ''}>Distribuição</option>
                        <option value="${EffectType.BASE_PRICE}" ${effect.type === EffectType.BASE_PRICE ? 'selected' : ''}>Preço Base</option>
                        <option value="${EffectType.PRICE_FLOOR}" ${effect.type === EffectType.PRICE_FLOOR ? 'selected' : ''}>Piso Preço</option>
                        <option value="${EffectType.PRICE_CEILING}" ${effect.type === EffectType.PRICE_CEILING ? 'selected' : ''}>Teto Preço</option>
                        <option value="${EffectType.REGULATION}" ${effect.type === EffectType.REGULATION ? 'selected' : ''}>Regulamentação</option>
                    </select>
                    <select data-effect-field="target_id" data-idx="${idx}" class="border rounded p-1 bg-white flex-1">
                        <option value="">Selecione Produto</option>
                        ${s.products.map(p => `<option value="${p.id}" ${effect.target_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                    <button type="button" data-remove-effect="${idx}" class="text-red-500 font-bold px-2">&times;</button>
                </div>
                <div class="mt-2">
                    ${isDist ? `
                        <textarea data-effect-field="value" data-idx="${idx}"
                                  placeholder='Ex: [{"target_level": "pais", "value": 0.05, "mode": "fixed"}]'
                                  class="w-full border rounded p-1 text-[10px] h-12 font-mono">${effect.value || ''}</textarea>
                    ` : `
                        <input type="${isReg ? 'checkbox' : 'text'}"
                               data-effect-field="value" data-idx="${idx}"
                               value="${effect.value || ''}"
                               ${isReg && effect.value === 'true' ? 'checked' : ''}
                               placeholder="${isReg ? '' : 'Valor (Ex: 0.1 para 10%)'}"
                               class="w-full border rounded p-1">
                    `}
                </div>
            </div>
        `;
    }).join('');

    if (el.effectsContainer.innerHTML !== effectsHtml) {
        el.effectsContainer.innerHTML = effectsHtml;
    }
}

function renderLevels() {
    const s = state.state;

    // Attempt to preserve focus
    const activeEl = document.activeElement;
    const activeData = activeEl ? {
        idx: activeEl.dataset?.idx,
        field: activeEl.dataset?.levelField,
        minOne: activeEl.dataset?.levelMinOne,
        role: activeEl.dataset?.levelRole,
        group: activeEl.dataset?.levelGroup,
        veto: activeEl.dataset?.levelVeto,
        start: activeEl.selectionStart,
        end: activeEl.selectionEnd
    } : null;

    const levelsHtml = s.newProposalLevels.map((level, lIdx) => `
        <div class="bg-gray-50 p-4 rounded mb-4 relative border">
            <button type="button" data-remove-level="${lIdx}" class="absolute top-2 right-2 text-red-500 hover:text-red-700 ${s.newProposalLevels.length === 1 ? 'hidden' : ''}">&times;</button>
            <div class="font-bold mb-2">Nível ${lIdx + 1}</div>

            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="space-y-2">
                    <label class="block text-sm font-medium mb-1">Mín. Aprovações</label>
                    <select data-level-field="min_approvals" data-idx="${lIdx}" class="w-full border rounded p-1 ${level.min_approvals === 1 ? 'bg-gray-200 pointer-events-none opacity-50' : ''}">
                        <option value="1/3" ${level.min_approvals === '1/3' ? 'selected' : ''}>1/3 (33%)</option>
                        <option value="1/2" ${level.min_approvals === '1/2' ? 'selected' : ''}>1/2 (50%)</option>
                        <option value="2/3" ${level.min_approvals === '2/3' ? 'selected' : ''}>2/3 (66%)</option>
                    </select>
                    <label class="flex items-center text-xs cursor-help" title="Apenas um voto favorável é necessário para aprovação">
                        <input type="checkbox" data-level-min-one="true" data-idx="${lIdx}" ${level.min_approvals === 1 ? 'checked' : ''} class="mr-1">
                        Apenas 1 voto é necessário
                    </label>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Filtrar por Cargos (opcional)</label>
                    <div class="flex flex-wrap gap-2">
                        ${s.roles.map(r => `
                            <label class="flex items-center text-xs bg-white border p-1 rounded cursor-pointer">
                                <input type="checkbox" data-level-role="${r.id}" data-idx="${lIdx}" ${level.roles.includes(r.id) ? 'checked' : ''} class="mr-1"> ${r.name}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="mb-2 font-medium text-sm text-gray-700">Grupos Participantes:</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                ${s.groups.map(g => {
                    const groupConfig = level.groups.find(lg => lg.group_id === g.id);
                    const isSelected = !!groupConfig;
                    return `
                        <div class="flex items-center justify-between bg-white border p-2 rounded text-sm">
                            <div class="flex items-center">
                                <input type="checkbox" data-level-group="${g.id}" data-idx="${lIdx}" ${isSelected ? 'checked' : ''} class="mr-2">
                                <span>${g.name}</span>
                            </div>
                            ${isSelected ? `
                                <label class="flex items-center text-xs text-red-600 cursor-pointer">
                                    <input type="checkbox" data-level-veto="${g.id}" data-idx="${lIdx}" ${groupConfig.has_veto_power ? 'checked' : ''} class="mr-1"> Poder Veto
                                </label>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');

    if (el.levelsContainer.innerHTML !== levelsHtml) {
        el.levelsContainer.innerHTML = levelsHtml;

        // Restore focus if it was inside the container
        if (activeData && activeData.idx !== undefined) {
            let selector = '';
            if (activeData.field) selector = `[data-level-field="${activeData.field}"][data-idx="${activeData.idx}"]`;
            else if (activeData.minOne) selector = `[data-level-min-one="true"][data-idx="${activeData.idx}"]`;
            else if (activeData.role) selector = `[data-level-role="${activeData.role}"][data-idx="${activeData.idx}"]`;
            else if (activeData.group) selector = `[data-level-group="${activeData.group}"][data-idx="${activeData.idx}"]`;
            else if (activeData.veto) selector = `[data-level-veto="${activeData.veto}"][data-idx="${activeData.idx}"]`;

            if (selector) {
                const newEl = el.levelsContainer.querySelector(selector);
                if (newEl) {
                    newEl.focus();
                    if (activeData.start !== undefined && newEl.setSelectionRange) {
                        newEl.setSelectionRange(activeData.start, activeData.end);
                    }
                }
            }
        }
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'approved': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        case 'vetoed': return 'bg-gray-800 text-white';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// --- Event Listeners ---
el.tabBtnVoting.onclick = () => state.setState({ activeTab: 'voting' });
el.tabBtnWorld.onclick = () => state.setState({ activeTab: 'world' });
el.tabBtnInstitutions.onclick = () => state.setState({ activeTab: 'institutions' });
el.tabBtnFinance.onclick = () => state.setState({ activeTab: 'finance' });
el.tabBtnAdmin.onclick = () => state.setState({ activeTab: 'admin' });

el.selectFinanceInstitution.onchange = (e) => {
    state.setState({ financeInstitutionId: e.target.value });
};

el.selectMember.onchange = (e) => {
    state.setState({ currentMemberId: parseInt(e.target.value) });
    refreshData();
};

el.inputMemberFilter.oninput = (e) => {
    state.setState({ memberFilter: e.target.value });
};

el.selectGroupFilter.onchange = (e) => {
    state.setState({ groupFilter: e.target.value });
};

el.selectRoleFilter.onchange = (e) => {
    state.setState({ roleFilter: e.target.value });
};

// Admin UI Events
el.btnNewGroup.onclick = () => state.setState({
    showAdminModal: true,
    adminModalConfig: { title: 'Novo Grupo', mode: 'group', data: {} }
});

el.btnNewRole.onclick = () => state.setState({
    showAdminModal: true,
    adminModalConfig: { title: 'Novo Cargo', mode: 'role', data: {} }
});

const btnNewProduct = document.getElementById('btn-new-product');
if (btnNewProduct) {
    btnNewProduct.onclick = () => state.setState({
        showAdminModal: true,
        adminModalConfig: { title: 'Novo Produto', mode: 'product', data: {} }
    });
}

el.btnNewMember.onclick = () => state.setState({
    showAdminModal: true,
    adminModalConfig: { title: 'Novo Jogador', mode: 'member', data: {} }
});

document.getElementById('btn-new-character').onclick = () => state.setState({
    showAdminModal: true,
    adminModalConfig: { title: 'Novo Personagem', mode: 'character', data: {} }
});

el.viewAdmin.onclick = async (e) => {
    const editBtn = e.target.closest('[data-admin-edit]');
    if (editBtn) {
        const mode = editBtn.dataset.adminEdit;
        const id = parseInt(editBtn.dataset.id);
        let data = {};
        if (mode === 'group') data = state.state.groups.find(g => g.id === id);
        else if (mode === 'role') data = state.state.roles.find(r => r.id === id);
        else if (mode === 'institution') data = state.state.institutions.find(i => i.id === id);
        else if (mode === 'character') data = state.state.characters.find(c => c.id === id);
        else if (mode === 'product') data = state.state.products.find(p => p.id === id);

        state.setState({
            showAdminModal: true,
            adminModalConfig: { title: `Editar ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, mode, data }
        });
        return;
    }

    const addGmrBtn = e.target.closest('[data-admin-add-gmr]');
    if (addGmrBtn) {
        const characterId = parseInt(addGmrBtn.dataset.adminAddGmr);
        state.setState({
            showAdminModal: true,
            adminModalConfig: { title: 'Atribuir Grupo', mode: 'gmr', data: { character_id: characterId } }
        });
        return;
    }

    const deleteGmrBtn = e.target.closest('[data-admin-delete-gmr]');
    if (deleteGmrBtn) {
        const [characterId, groupId] = deleteGmrBtn.dataset.adminDeleteGmr.split('-').map(Number);
        if (confirm('Remover esta atribuição?')) {
            await service.deleteGmr(characterId, groupId);
            await refreshData();
        }
    }
};

el.btnCloseAdminModal.onclick = () => state.setState({ showAdminModal: false });

el.formAdmin.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(el.formAdmin);
    const { mode, data } = state.state.adminModalConfig;

    try {
        if (mode === 'institution') {
            const instData = {
                name: formData.get('name'),
                type: formData.get('type') || 'empresa',
                parent_id: parseInt(formData.get('parent_id')) || null
            };
            if (data.id) await service.updateInstitution(data.id, instData);
            else await service.saveInstitution(instData);
        } else if (mode === 'group') {
            const groupData = {
                name: formData.get('name'),
                institution_id: parseInt(formData.get('institution_id')) || null
            };
            if (data.id) await service.updateGroup(data.id, groupData);
            else await service.saveGroup(groupData);
        } else if (mode === 'role') {
            const roleData = { name: formData.get('name') };
            if (data.id) await service.updateRole(data.id, roleData);
            else await service.saveRole(roleData);
        } else if (mode === 'member') {
            await service.saveMember({ name: formData.get('name') });
        } else if (mode === 'character') {
            const charData = {
                name: formData.get('name'),
                member_id: parseInt(formData.get('member_id'))
            };
            if (data.id) await service.updateCharacter(data.id, charData);
            else await service.saveCharacter(charData);
        } else if (mode === 'product') {
            const productData = {
                name: formData.get('name'),
                base_price: parseFloat(formData.get('base_price')),
                authority_id: parseInt(formData.get('authority_id')),
                price_floor: formData.get('price_floor') ? parseFloat(formData.get('price_floor')) : null,
                price_ceiling: formData.get('price_ceiling') ? parseFloat(formData.get('price_ceiling')) : null,
                tax_floor: formData.get('tax_floor') ? parseFloat(formData.get('tax_floor')) / 100 : null,
                tax_ceiling: formData.get('tax_ceiling') ? parseFloat(formData.get('tax_ceiling')) / 100 : null
            };
            // Note: regulated status is now only changed via voting as requested by user
            if (data.id) await service.updateProduct(data.id, productData);
            else await service.saveProduct({
                ...productData,
                regulated: false,
                current_tax: 0,
                tax_distribution: []
            });
        } else if (mode === 'gmr') {
            await service.updateGmr(
                parseInt(formData.get('character_id')),
                parseInt(formData.get('group_id')),
                parseInt(formData.get('role_id'))
            );
        }

        state.setState({ showAdminModal: false });
        await refreshData();
    } catch (err) {
        alert('Erro ao salvar: ' + err.message);
    }
};

el.btnNewProposal.onclick = () => state.setState({
    showModal: true,
    newProposalLevels: [{ min_approvals: '1/2', groups: [], roles: [] }],
    newProposalEffects: []
});
el.btnCloseModal.onclick = () => state.setState({ showModal: false });
el.btnCancelProposal.onclick = () => state.setState({ showModal: false });

el.btnAddLevel.onclick = () => {
    state.setState(s => ({
        newProposalLevels: [...s.newProposalLevels, { min_approvals: 1, groups: [], roles: [] }]
    }));
};

el.btnAddEffect.onclick = () => {
    state.setState(s => ({
        newProposalEffects: [...s.newProposalEffects, { type: EffectType.TAX_CHANGE, target_id: '', value: '' }]
    }));
};

el.effectsContainer.onclick = (e) => {
    const removeIdx = e.target.dataset.removeEffect;
    if (removeIdx !== undefined) {
        state.setState(s => {
            const effects = [...s.newProposalEffects];
            effects.splice(parseInt(removeIdx), 1);
            return { newProposalEffects: effects };
        });
    }
};

el.effectsContainer.oninput = (e) => {
    const idx = parseInt(e.target.dataset.idx);
    if (isNaN(idx)) return;

    state.setState(s => {
        const effects = [...s.newProposalEffects];
        const effect = { ...effects[idx] };
        const field = e.target.dataset.effectField;

        if (field === 'value') {
            effect.value = e.target.type === 'checkbox' ? e.target.checked.toString() : e.target.value;
        } else {
            effect[field] = e.target.value;
        }

        effects[idx] = effect;
        return { newProposalEffects: effects };
    });
};

el.levelsContainer.onclick = (e) => {
    const removeIdx = e.target.dataset.removeLevel;
    if (removeIdx !== undefined) {
        state.setState(s => {
            const levels = [...s.newProposalLevels];
            levels.splice(parseInt(removeIdx), 1);
            return { newProposalLevels: levels };
        });
    }
};

el.levelsContainer.oninput = (e) => {
    const idx = parseInt(e.target.dataset.idx);
    if (isNaN(idx)) return;

    state.setState(s => {
        const levels = [...s.newProposalLevels];
        const level = { ...levels[idx] };

        if (e.target.dataset.levelField === 'min_approvals') {
            const val = e.target.value;
            level.min_approvals = val.includes('/') ? val : parseInt(val);
        } else if (e.target.dataset.levelMinOne) {
            level.min_approvals = e.target.checked ? 1 : '1/2';
        } else if (e.target.dataset.levelRole) {
            const roleId = parseInt(e.target.dataset.levelRole);
            if (e.target.checked) level.roles = [...level.roles, roleId];
            else level.roles = level.roles.filter(id => id !== roleId);
        } else if (e.target.dataset.levelGroup) {
            const groupId = parseInt(e.target.dataset.levelGroup);
            if (e.target.checked) level.groups = [...level.groups, { group_id: groupId, has_veto_power: false }];
            else level.groups = level.groups.filter(g => g.group_id !== groupId);
        } else if (e.target.dataset.levelVeto) {
            const groupId = parseInt(e.target.dataset.levelVeto);
            level.groups = level.groups.map(g => g.group_id === groupId ? { ...g, has_veto_power: e.target.checked } : g);
        }

        levels[idx] = level;
        return { newProposalLevels: levels };
    });
};

el.pendingVotesList.onclick = (e) => {
    const btn = e.target.closest('button[data-vote]');
    if (btn) {
        handleVote(parseInt(btn.dataset.id), btn.dataset.vote);
    }
};

el.formProposal.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(el.formProposal);
    const proposal = {
        title: formData.get('title'),
        institution_id: parseInt(formData.get('institution_id')),
        description: formData.get('description'),
        levels: state.state.newProposalLevels,
        effects: state.state.newProposalEffects
    };

    if (proposal.levels.some(l => l.groups.length === 0)) {
        return alert('Cada nível deve ter ao menos um grupo');
    }

    try {
        await service.saveProposal(proposal);
        state.setState({
            showModal: false,
            newProposalLevels: [{ min_approvals: 1, groups: [], roles: [] }],
            newProposalEffects: []
        });
        el.formProposal.reset();
        await refreshData();
    } catch (e) {
        alert('Erro ao criar proposta: ' + e.message);
    }
};

// --- Initialization ---
state.subscribe(render);
init();

// Auto refresh
setInterval(refreshData, 5000);
