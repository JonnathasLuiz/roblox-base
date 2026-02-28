local Persistence = require(script.Parent.Persistence)
local VotingLogic = require(game:GetService("ReplicatedStorage").Shared.VotingLogic)
local Constants = require(game:GetService("ReplicatedStorage").Shared.Constants)

local VotingService = {}

function VotingService.getPendingVotes(memberId)
	local proposals = Persistence.getProposals()
	local allVotes = Persistence.getVotes()
	local gmr = Persistence.getGmr()
	local characters = Persistence.getCharacters()

	local pending = {}
	for _, p in ipairs(proposals) do
		if p.status == Constants.ProposalStatus.PENDING then
			local currentLevel = p.levels[p.current_level_index]

			-- Check if already voted
			local alreadyVoted = false
			for _, v in ipairs(allVotes) do
				if v.proposal_id == p.id and v.level_index == p.current_level_index and v.member_id == memberId then
					alreadyVoted = true
					break
				end
			end

			-- Check expiry
			local timeElapsed = os.time() - (p.level_started_at or p.created_at)
			local timeLimit = currentLevel.time_limit or 3600 -- Default 1 hour

			if not alreadyVoted and timeElapsed < timeLimit then
				if VotingLogic.isEligibleToVote(memberId, currentLevel, gmr, characters) then
					table.insert(pending, {
						id = p.id,
						title = p.title,
						description = p.description,
						time_left = timeLimit - timeElapsed,
						has_veto = VotingLogic.hasVetoPower(memberId, currentLevel, gmr, characters)
					})
				end
			end
		end
	end
	return pending
end

function VotingService.submitVote(proposalId, memberId, decision)
	local proposals = Persistence.getProposals()
	local proposal
	for _, p in ipairs(proposals) do
		if p.id == proposalId then
			proposal = p
			break
		end
	end

	if not proposal or proposal.status ~= Constants.ProposalStatus.PENDING then
		return false, "Proposta não encontrada ou já encerrada"
	end

	-- Save Vote
	Persistence.saveVote({
		proposal_id = proposalId,
		member_id = memberId,
		decision = decision,
		level_index = proposal.current_level_index
	})

	-- Re-calculate status
	VotingService.processProposal(proposalId)

	return true
end

function VotingService.processProposal(proposalId)
	local proposals = Persistence.getProposals()
	local proposal
	for _, p in ipairs(proposals) do
		if p.id == proposalId then
			proposal = p
			break
		end
	end

	local allVotes = Persistence.getVotes()
	local levelVotes = {}
	for _, v in ipairs(allVotes) do
		if v.proposal_id == proposalId and v.level_index == proposal.current_level_index then
			table.insert(levelVotes, v)
		end
	end

	local currentLevel = proposal.levels[proposal.current_level_index]
	local gmr = Persistence.getGmr()
	local characters = Persistence.getCharacters()
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
		level_started_at = proposal.level_started_at
	})
end

function VotingService.applyEffects(proposal)
	-- Similar to JS logic, updating products/taxes
	if not proposal.effects then return end

	for _, effect in ipairs(proposal.effects) do
		local productId = tonumber(effect.target_id)
		if productId then
			local updates = {}
			if effect.type == Constants.EffectType.TAX_CHANGE then
				-- simplified tax update
				updates.tax_rate = tonumber(effect.value)
			elseif effect.type == Constants.EffectType.BASE_PRICE then
				updates.base_price = tonumber(effect.value)
			end
			Persistence.updateProduct(productId, updates)
		end
	end
end

-- Background task to check for expired votes
function VotingService.checkExpirations()
	local proposals = Persistence.getProposals()
	for _, p in ipairs(proposals) do
		if p.status == Constants.ProposalStatus.PENDING then
			local currentLevel = p.levels[p.current_level_index]
			local timeLimit = currentLevel.time_limit or 3600
			local timeElapsed = os.time() - (p.level_started_at or p.created_at)

			if timeElapsed >= timeLimit then
				-- Close current level by counting null votes for those who didn't vote?
				-- Or just process with current votes.
				VotingService.processProposal(p.id)
			end
		end
	end
end

return VotingService
