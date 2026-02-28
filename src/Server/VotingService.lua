local Persistence = require(script.Parent.Persistence)
local VotingLogic = require(game:GetService("ReplicatedStorage").Shared.VotingLogic)
local Constants = require(game:GetService("ReplicatedStorage").Shared.Constants)

local VotingService = {}

function VotingService.getPendingVotes(memberId)
	local proposals = Persistence.getProposals()
	local votes = Persistence.getVotes() -- Still needs optimization for large number of votes
	local memberCharacters = Persistence.getCharactersByMemberId(memberId)

	-- Get GMR for all member characters
	local memberGmr = {}
	for _, char in ipairs(memberCharacters) do
		local gmrs = Persistence.getGmrByCharacterId(char.id)
		for _, gmr in ipairs(gmrs) do
			table.insert(memberGmr, gmr)
		end
	end

	local pending = {}
	for _, p in ipairs(proposals) do
		if p.status == Constants.ProposalStatus.PENDING then
			local levels = p.levels or {}
			local currentLevel = levels[p.current_level_index]
			if not currentLevel then continue end

			local alreadyVoted = false
			for _, v in ipairs(votes) do
				if v.proposal_id == p.id and v.level_index == p.current_level_index and tostring(v.member_id) == tostring(memberId) then
					alreadyVoted = true
					break
				end
			end

			local timeElapsed = os.time() - (p.level_started_at or p.created_at or os.time())
			local timeLimit = currentLevel.time_limit or 3600

			if not alreadyVoted and timeElapsed < timeLimit then
				-- Modified isEligibleToVote for optimization (using pre-fetched member data)
				if VotingService.checkEligibility(memberId, currentLevel, memberGmr, memberCharacters) then
					table.insert(pending, {
						id = p.id,
						title = p.title or "Sem título",
						description = p.description or "",
						time_left = math.max(0, timeLimit - timeElapsed),
						has_veto = VotingService.checkVeto(memberId, currentLevel, memberGmr, memberCharacters)
					})
				end
			end
		end
	end
	return pending
end

-- Optimization: Specific eligibility check that doesn't require loading ALL characters in the game
function VotingService.checkEligibility(memberId, level, memberGmr, memberCharacters)
    local levelGroupIds = {}
    for _, g in ipairs(level.groups or {}) do
        table.insert(levelGroupIds, type(g) == "table" and g.group_id or g)
    end
    local levelRoleIds = level.roles or {}

    local eligibleGmr = {}
    for _, item in ipairs(memberGmr) do
        local inGroup = false
        for _, gId in ipairs(levelGroupIds) do
            if item.group_id == gId then inGroup = true break end
        end
        if inGroup then table.insert(eligibleGmr, item) end
    end

    if #eligibleGmr == 0 then return false end
    if #levelRoleIds > 0 then
        for _, item in ipairs(eligibleGmr) do
            for _, rId in ipairs(levelRoleIds) do
                if item.role_id == rId then return true end
            end
        end
        return false
    end
    return true
end

function VotingService.checkVeto(memberId, level, memberGmr, memberCharacters)
    local vetoGroupIds = {}
    for _, g in ipairs(level.groups or {}) do
        if type(g) == "table" and g.has_veto_power then table.insert(vetoGroupIds, g.group_id) end
    end
    if #vetoGroupIds == 0 then return false end

    for _, item in ipairs(memberGmr) do
        for _, gId in ipairs(vetoGroupIds) do
            if item.group_id == gId then return true end
        end
    end
    return false
end

function VotingService.submitVote(proposalId, memberId, decision)
	local p = Persistence.updateProposal(proposalId, {})
	if not p or p.status ~= Constants.ProposalStatus.PENDING then
		return false, "Proposta não encontrada ou já encerrada"
	end

	Persistence.saveVote({
		proposal_id = proposalId,
		member_id = memberId,
		decision = decision,
		level_index = p.current_level_index
	})

	VotingService.processProposal(proposalId)
	return true
end

function VotingService.processProposal(proposalId)
	local proposals = Persistence.getProposals()
	local proposal
	for _, p in ipairs(proposals) do
		if p.id == proposalId then proposal = p break end
	end
	if not proposal then return end

	local allVotes = Persistence.getVotes()
	local levelVotes = {}
	for _, v in ipairs(allVotes) do
		if v.proposal_id == proposalId and v.level_index == proposal.current_level_index then
			table.insert(levelVotes, v)
		end
	end

	local currentLevel = proposal.levels[proposal.current_level_index]
	if not currentLevel then return end

	-- processProposal still needs to load related characters/gmr for calculation
	-- but we can optimize by loading only what's necessary in a real game.
	local gmr = Persistence.getGmr() -- Placeholder for optimized fetch
	local characters = Persistence.getCharacters() -- Placeholder

	local eligibleMembers = VotingLogic.getEligibleMemberIds(currentLevel, gmr, characters)
	local result = VotingLogic.calculateProposalResult(proposal, currentLevel, levelVotes, #eligibleMembers)

	local newStatus = result.status
	local newLevelIndex = result.current_level_index

	if result.status == "next_step" then
		if proposal.levels[newLevelIndex] then
			newStatus = Constants.ProposalStatus.PENDING
			proposal.level_started_at = os.time()
		else
			newStatus = Constants.ProposalStatus.APPROVED
			VotingService.applyEffects(proposal)
		end
	end

	Persistence.updateProposal(proposalId, {
		status = newStatus,
		current_level_index = newLevelIndex,
		level_started_at = proposal.level_started_at or os.time()
	})
end

function VotingService.applyEffects(proposal)
	if not proposal.effects then return end
	for _, effect in ipairs(proposal.effects) do
		local productId = effect.target_id
		if productId then
			local updates = {}
			if effect.type == Constants.EffectType.TAX_CHANGE then
				updates.tax_rate = tonumber(effect.value)
			elseif effect.type == Constants.EffectType.BASE_PRICE then
				updates.base_price = tonumber(effect.value)
			end
			Persistence.updateProduct(productId, updates)
		end
	end
end

function VotingService.checkExpirations()
	local proposals = Persistence.getProposals()
	for _, p in ipairs(proposals) do
		if p.status == Constants.ProposalStatus.PENDING then
			local currentLevel = p.levels[p.current_level_index]
			if not currentLevel then continue end
			local timeLimit = currentLevel.time_limit or 3600
			local timeElapsed = os.time() - (p.level_started_at or p.created_at or os.time())

			if timeElapsed >= timeLimit then
				VotingService.processProposal(p.id)
			end
		end
	end
end

return VotingService
