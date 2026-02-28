local ReplicatedStorage = game:GetService("ReplicatedStorage")
local VotingService = require(script.Parent.VotingService)
local CharacterManager = require(script.Parent.CharacterManager)
local Persistence = require(script.Parent.Persistence)

-- Initialize
Persistence.initSeed()

-- Create Remotes on Server
local getVotesEvent = ReplicatedStorage:FindFirstChild("GetPendingVotes") or Instance.new("RemoteFunction")
getVotesEvent.Name = "GetPendingVotes"
getVotesEvent.Parent = ReplicatedStorage

local submitVoteEvent = ReplicatedStorage:FindFirstChild("SubmitVote") or Instance.new("RemoteEvent")
submitVoteEvent.Name = "SubmitVote"
submitVoteEvent.Parent = ReplicatedStorage

local switchCameraEvent = ReplicatedStorage:FindFirstChild("SwitchCharacterCamera") or Instance.new("RemoteEvent")
switchCameraEvent.Name = "SwitchCharacterCamera"
switchCameraEvent.Parent = ReplicatedStorage

getVotesEvent.OnServerInvoke = function(player)
	local member = Persistence.getMemberByUserId(player.UserId)
	return VotingService.getPendingVotes(member.id)
end

submitVoteEvent.OnServerEvent:Connect(function(player, proposalId, decision)
	local member = Persistence.getMemberByUserId(player.UserId)

	-- Security Validation
	local pendingVotes = VotingService.getPendingVotes(member.id)
	local isEligible = false
	for _, p in ipairs(pendingVotes) do
		if p.id == proposalId then
			isEligible = true
			break
		end
	end

	if not isEligible then
		warn("Player " .. player.Name .. " attempted to vote on a proposal they are not eligible for: " .. tostring(proposalId))
		return
	end

	-- Validate decision type
	local validDecisions = {approve = true, reject = true, veto = true, ["null"] = true}
	if not validDecisions[decision] then
		warn("Player " .. player.Name .. " sent invalid decision type: " .. tostring(decision))
		return
	end

	VotingService.submitVote(proposalId, member.id, decision)
end)

game.Players.PlayerAdded:Connect(function(player)
	CharacterManager.initPlayer(player)
end)

-- Background loop for expirations
task.spawn(function()
	while true do
		VotingService.checkExpirations()
		task.wait(60)
	end
end)
