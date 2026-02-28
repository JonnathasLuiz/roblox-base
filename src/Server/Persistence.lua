local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")

local Persistence = {}

local Stores = {
	Institutions = DataStoreService:GetDataStore("Voting_Institutions_v3"),
	Groups = DataStoreService:GetDataStore("Voting_Groups_v3"),
	Roles = DataStoreService:GetDataStore("Voting_Roles_v3"),
	Members = DataStoreService:GetDataStore("Voting_Members_v3"),
	Characters = DataStoreService:GetDataStore("Voting_Characters_v3"),
	GMR = DataStoreService:GetDataStore("Voting_GMR_v3"),
	Proposals = DataStoreService:GetDataStore("Voting_Proposals_v3"),
	Votes = DataStoreService:GetDataStore("Voting_Votes_v3"),
	Products = DataStoreService:GetDataStore("Voting_Products_v3"),
	Buildings = DataStoreService:GetDataStore("Voting_Buildings_v3")
}

-- Registry to keep track of IDs.
-- In a real production game, we should use a Cache or a better listing strategy.
local function getRegistry(store)
	local success, result = pcall(function()
		return store:GetAsync("Registry")
	end)
	return success and result or {}
end

local function addToRegistry(store, id)
	pcall(function()
		store:UpdateAsync("Registry", function(oldRegistry)
			local registry = oldRegistry or {}
			for _, existingId in ipairs(registry) do
				if existingId == id then return nil end
			end
			table.insert(registry, id)
			return registry
		end)
	end)
end

local function getAllItems(store)
	local registry = getRegistry(store)
	local items = {}
	-- Note: For large lists, this is slow. Use with caution or implement caching.
	for _, id in ipairs(registry) do
		local success, val = pcall(function() return store:GetAsync(tostring(id)) end)
		if success and val then
			table.insert(items, val)
		end
	end
	return items
end

function Persistence.getInstitutions() return getAllItems(Stores.Institutions) end
function Persistence.getGroups() return getAllItems(Stores.Groups) end
function Persistence.getRoles() return getAllItems(Stores.Roles) end
function Persistence.getMembers() return getAllItems(Stores.Members) end
function Persistence.getCharacters() return getAllItems(Stores.Characters) end
function Persistence.getGmr() return getAllItems(Stores.GMR) end
function Persistence.getProposals() return getAllItems(Stores.Proposals) end
function Persistence.getVotes() return getAllItems(Stores.Votes) end
function Persistence.getProducts() return getAllItems(Stores.Products) end
function Persistence.getBuildings() return getAllItems(Stores.Buildings) end

local function saveItem(store, id, data)
	local success, err = pcall(function()
		store:SetAsync(tostring(id), data)
	end)
	if success then
		addToRegistry(store, id)
	end
	return success, err
end

function Persistence.initSeed()
	local insts = getRegistry(Stores.Institutions)
	if #insts == 0 then
		local initialInstitutions = {
			{ id = "inst_1", name = "Federação Global", type = "governo", parent_id = nil },
			{ id = "inst_2", name = "Governo do País A", type = "governo", parent_id = "inst_1" },
			-- ... simplified seed for GUID transition
		}
		for _, item in ipairs(initialInstitutions) do saveItem(Stores.Institutions, item.id, item) end
	end
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

function Persistence.getMemberByUserId(userId)
	local success, member = pcall(function() return Stores.Members:GetAsync(tostring(userId)) end)
	if success and member then return member end

	local newMember = { id = tostring(userId), roblox_user_id = userId, name = "Player_" .. userId }
	saveItem(Stores.Members, userId, newMember)
	return newMember
end

return Persistence
