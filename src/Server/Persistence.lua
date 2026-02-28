local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")

local Persistence = {}

local Stores = {
	Institutions = DataStoreService:GetDataStore("Voting_Institutions_v6"),
	Groups = DataStoreService:GetDataStore("Voting_Groups_v6"),
	Roles = DataStoreService:GetDataStore("Voting_Roles_v6"),
	Members = DataStoreService:GetDataStore("Voting_Members_v6"),
	Characters = DataStoreService:GetDataStore("Voting_Characters_v6"),
	GMR = DataStoreService:GetDataStore("Voting_GMR_v6"),
	Proposals = DataStoreService:GetDataStore("Voting_Proposals_v6"),
	Votes = DataStoreService:GetDataStore("Voting_Votes_v6"),
	Products = DataStoreService:GetDataStore("Voting_Products_v6"),
	Buildings = DataStoreService:GetDataStore("Voting_Buildings_v6")
}

local function getRegistry(store)
	local success, result = pcall(function() return store:GetAsync("Registry") end)
	return success and result or {}
end

local function addToRegistry(store, id)
	pcall(function()
		store:UpdateAsync("Registry", function(old)
			local r = old or {}
			for _, eid in ipairs(r) do if eid == id then return nil end end
			table.insert(r, id)
			return r
		end)
	end)
end

local function getAllItems(store)
	local registry = getRegistry(store)
	local items = {}
	for _, id in ipairs(registry) do
		local success, val = pcall(function() return store:GetAsync(tostring(id)) end)
		if success and val then table.insert(items, val) end
	end
	return items
end

function Persistence.getInstitutions() return getAllItems(Stores.Institutions) end
function Persistence.getGroups() return getAllItems(Stores.Groups) end
function Persistence.getRoles() return getAllItems(Stores.Roles) end
function Persistence.getMembers() return getAllItems(Stores.Members) end
function Persistence.getProposals() return getAllItems(Stores.Proposals) end
function Persistence.getVotes() return getAllItems(Stores.Votes) end
function Persistence.getProducts() return getAllItems(Stores.Products) end

-- Global getters for processing
function Persistence.getCharacters()
	local registry = getRegistry(Stores.Characters)
	local items = {}
	for _, memberId in ipairs(registry) do
		local chars = Persistence.getCharactersByMemberId(memberId)
		for _, c in ipairs(chars) do table.insert(items, c) end
	end
	return items
end

function Persistence.getGmr()
	local registry = getRegistry(Stores.GMR)
	local items = {}
	for _, charId in ipairs(registry) do
		local gmrs = Persistence.getGmrByCharacterId(charId)
		for _, g in ipairs(gmrs) do table.insert(items, g) end
	end
	return items
end

function Persistence.getCharactersByMemberId(memberId)
	local success, charList = pcall(function() return Stores.Characters:GetAsync(tostring(memberId)) end)
	return (success and charList) or {}
end

function Persistence.getGmrByCharacterId(charId)
	local success, gmrList = pcall(function() return Stores.GMR:GetAsync(tostring(charId)) end)
	return (success and gmrList) or {}
end

local function saveItem(store, id, data)
	local success, err = pcall(function() store:SetAsync(tostring(id), data) end)
	if success then addToRegistry(store, id) end
	return success, err
end

function Persistence.initSeed()
	local insts = getRegistry(Stores.Institutions)
	if #insts == 0 then
		local initialInstitutions = {
			{ id = "inst_1", name = "Federação Global", type = "governo" },
			{ id = "inst_2", name = "Governo Local", type = "governo", parent_id = "inst_1" }
		}
		for _, item in ipairs(initialInstitutions) do saveItem(Stores.Institutions, item.id, item) end

		local initialGroups = {
			{ id = "group_1", name = "Conselho Global", institution_id = "inst_1" }
		}
		for _, item in ipairs(initialGroups) do saveItem(Stores.Groups, item.id, item) end

		local initialRoles = {
			{ id = "role_1", name = "Conselheiro" }
		}
		for _, item in ipairs(initialRoles) do saveItem(Stores.Roles, item.id, item) end
	end
end

function Persistence.saveCharacter(memberId, data)
	pcall(function()
		Stores.Characters:UpdateAsync(tostring(memberId), function(old)
			local list = old or {}
			table.insert(list, data)
			return list
		end)
	end)
	addToRegistry(Stores.Characters, memberId)

	-- Assign to test group
	Persistence.updateGmr(data.id, "group_1", "role_1")
end

function Persistence.updateGmr(charId, groupId, roleId)
	pcall(function()
		Stores.GMR:UpdateAsync(tostring(charId), function(old)
			local list = old or {}
			table.insert(list, { character_id = charId, group_id = groupId, role_id = roleId })
			return list
		end)
	end)
	addToRegistry(Stores.GMR, charId)
end

function Persistence.saveProposal(proposalData)
	local newId = "prop_" .. HttpService:GenerateGUID(false)
	proposalData.id = newId
	proposalData.status = "pending"
	proposalData.current_level_index = 1
	proposalData.created_at = os.time()
	saveItem(Stores.Proposals, newId, proposalData)
	return proposalData
end

function Persistence.updateProposal(proposalId, updateData)
	local success, p = pcall(function()
		return Stores.Proposals:UpdateAsync(tostring(proposalId), function(old)
			if not old then return nil end
			for k, v in pairs(updateData) do old[k] = v end
			return old
		end)
	end)
	return success and p
end

function Persistence.saveVote(voteData)
	local newId = "vote_" .. HttpService:GenerateGUID(false)
	voteData.voted_at = os.time()
	saveItem(Stores.Votes, newId, voteData)
	return true
end

function Persistence.getMemberByUserId(userId)
	local success, member = pcall(function() return Stores.Members:GetAsync(tostring(userId)) end)
	if success and member then return member end

	local newMember = { id = tostring(userId), roblox_user_id = userId, name = "Player_" .. userId }
	saveItem(Stores.Members, userId, newMember)
	return newMember
end

function Persistence.updateProduct(productId, updateData)
	local success, p = pcall(function()
		return Stores.Products:UpdateAsync(tostring(productId), function(old)
			if not old then return nil end
			for k, v in pairs(updateData) do old[k] = v end
			return old
		end)
	end)
	return success and p
end

return Persistence
