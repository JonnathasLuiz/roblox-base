local Constants = require(script.Parent.Constants)

local VotingLogic = {}

-- Checks if a member is eligible to vote in a specific level of a proposal.
function VotingLogic.isEligibleToVote(memberId, level, allGmr, allCharacters)
	local levelGroupIds = {}
	for _, g in ipairs(level.groups or {}) do
		table.insert(levelGroupIds, type(g) == "table" and g.group_id or g)
	end

	local levelRoleIds = level.roles or {}

	-- Find all characters belonging to this member
	local memberCharacterIds = {}
	for _, c in ipairs(allCharacters) do
		if c.member_id == memberId then
			table.insert(memberCharacterIds, c.id)
		end
	end

	-- Filter GMRs for this member's characters that are in the allowed groups for this level
	local eligibleGmr = {}
	for _, item in ipairs(allGmr) do
		local isMemberChar = false
		for _, mId in ipairs(memberCharacterIds) do
			if item.character_id == mId then
				isMemberChar = true
				break
			end
		end

		if isMemberChar then
			local inGroup = false
			for _, gId in ipairs(levelGroupIds) do
				if item.group_id == gId then
					inGroup = true
					break
				end
			end

			if inGroup then
				table.insert(eligibleGmr, item)
			end
		end
	end

	if #eligibleGmr == 0 then return false end

	-- If level has specific roles required
	if #levelRoleIds > 0 then
		for _, item in ipairs(eligibleGmr) do
			for _, rId in ipairs(levelRoleIds) do
				if item.role_id == rId then
					return true
				end
			end
		end
		return false
	end

	return true
end

-- Returns a table of member IDs eligible to vote in a specific level.
function VotingLogic.getEligibleMemberIds(level, allGmr, allCharacters)
	local levelGroupIds = {}
	for _, g in ipairs(level.groups or {}) do
		table.insert(levelGroupIds, type(g) == "table" and g.group_id or g)
	end
	local levelRoleIds = level.roles or {}

	-- Map character_id to member_id
	local charToMemberMap = {}
	for _, char in ipairs(allCharacters) do
		charToMemberMap[char.id] = char.member_id
	end

	local eligibleMemberIdsSet = {}
	local eligibleMemberIds = {}

	for _, item in ipairs(allGmr) do
		local groupMatch = false
		for _, gId in ipairs(levelGroupIds) do
			if item.group_id == gId then
				groupMatch = true
				break
			end
		end

		if groupMatch then
			local roleMatch = (#levelRoleIds == 0)
			if not roleMatch then
				for _, rId in ipairs(levelRoleIds) do
					if item.role_id == rId then
						roleMatch = true
						break
					end
				end
			end

			if roleMatch then
				local memberId = charToMemberMap[item.character_id]
				if memberId and not eligibleMemberIdsSet[memberId] then
					eligibleMemberIdsSet[memberId] = true
					table.insert(eligibleMemberIds, memberId)
				end
			end
		end
	end

	return eligibleMemberIds
end

-- Checks if a member has veto power in a specific level via any of their characters.
function VotingLogic.hasVetoPower(memberId, level, allGmr, allCharacters)
	local vetoGroupIds = {}
	for _, g in ipairs(level.groups or {}) do
		if type(g) == "table" and g.has_veto_power then
			table.insert(vetoGroupIds, g.group_id)
		end
	end

	if #vetoGroupIds == 0 then return false end

	local memberCharacterIds = {}
	for _, c in ipairs(allCharacters) do
		if c.member_id == memberId then
			table.insert(memberCharacterIds, c.id)
		end
	end

	for _, item in ipairs(allGmr) do
		local isMemberChar = false
		for _, mId in ipairs(memberCharacterIds) do
			if item.character_id == mId then
				isMemberChar = true
				break
			end
		end

		if isMemberChar then
			for _, gId in ipairs(vetoGroupIds) do
				if item.group_id == gId then
					return true
				end
			end
		end
	end

	return false
end

-- Calculates the required number of approvals based on a threshold
function VotingLogic.getRequiredApprovals(minApprovals, totalEligibleMembers)
	if type(minApprovals) == "number" then
		return minApprovals
	end

	if type(minApprovals) == "string" and string.find(minApprovals, "/") then
		local parts = string.split(minApprovals, "/")
		local num = tonumber(parts[1])
		local den = tonumber(parts[2])
		if den == 0 then return totalEligibleMembers end
		return math.ceil(totalEligibleMembers * (num / den))
	end

	local parsed = tonumber(minApprovals)
	return parsed or 1
end

-- Calculates the new state of a proposal based on a new vote.
function VotingLogic.calculateProposalResult(proposal, currentLevel, currentVotes, totalEligibleMembers)
	local lastVote = currentVotes[#currentVotes]

	if lastVote and lastVote.decision == Constants.VoteDecision.VETO then
		return {
			status = Constants.ProposalStatus.VETOED,
			current_level_index = proposal.current_level_index
		}
	end

	local approvals = 0
	local totalVoted = #currentVotes
	for _, v in ipairs(currentVotes) do
		if v.decision == Constants.VoteDecision.APPROVE then
			approvals = approvals + 1
		end
	end

	local minRequired = VotingLogic.getRequiredApprovals(currentLevel.min_approvals, totalEligibleMembers)

	if approvals >= minRequired then
		return {
			status = "next_step",
			current_level_index = proposal.current_level_index + 1
		}
	end

	-- Early rejection check
	local remainingPossibleVotes = totalEligibleMembers - totalVoted
	if approvals + remainingPossibleVotes < minRequired then
		return {
			status = Constants.ProposalStatus.REJECTED,
			current_level_index = proposal.current_level_index
		}
	end

	if totalVoted == totalEligibleMembers then
		return {
			status = Constants.ProposalStatus.REJECTED,
			current_level_index = proposal.current_level_index
		}
	end

	return {
		status = Constants.ProposalStatus.PENDING,
		current_level_index = proposal.current_level_index
	}
end

return VotingLogic
