local CharacterManager = {}
CharacterManager.ActiveCharacters = {} -- [Player] = {CurrentChar, AllChars}
CharacterManager.Queues = {} -- [Model] = {task1, task2, ...}

local ServerStorage = game:GetService("ServerStorage")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Persistence = require(script.Parent.Persistence)

-- Create a basic character model if not exists for prototyping
local function getCharacterTemplate()
	local template = ServerStorage:FindFirstChild("CharacterTemplate")
	if not template then
		template = Instance.new("Model")
		template.Name = "CharacterTemplate"
		local hum = Instance.new("Humanoid", template)
		local root = Instance.new("Part", template)
		root.Name = "HumanoidRootPart"
		root.Size = Vector3.new(2, 5, 1)
		template.PrimaryPart = root
		template.Parent = ServerStorage
	end
	return template
end

function CharacterManager.initPlayer(player)
	local playerChars = Persistence.getCharactersByMemberId(player.UserId)

	if #playerChars == 0 then
		local char1 = { id = "char_" .. player.UserId .. "_1", name = player.Name .. " (Main)", member_id = player.UserId }
		local char2 = { id = "char_" .. player.UserId .. "_2", name = player.Name .. " (Alt)", member_id = player.UserId }

		Persistence.saveCharacter(player.UserId, char1)
		Persistence.saveCharacter(player.UserId, char2)

		playerChars = {char1, char2}
	end

	CharacterManager.ActiveCharacters[player] = {
		CurrentIndex = 1,
		Characters = playerChars,
		Instances = {}
	}

	for i, charData in ipairs(playerChars) do
		local model = getCharacterTemplate():Clone()
		model.Name = charData.name
		model.Parent = workspace
		model:MoveTo(Vector3.new(math.random(-10, 10), 5, math.random(-10, 10)))

		CharacterManager.ActiveCharacters[player].Instances[i] = model
		CharacterManager.setupTaskQueue(model)
	end

	-- Give StarterPack items manually since CharacterAutoLoads is false
	local starterPack = game:GetService("StarterPack")
	for _, item in ipairs(starterPack:GetChildren()) do
		item:Clone().Parent = player.Backpack
	end

	task.defer(function()
		CharacterManager.switchCharacter(player, 1)
	end)
end

function CharacterManager.switchCharacter(player, index)
	local data = CharacterManager.ActiveCharacters[player]
	if not data or not data.Instances[index] then return end

	data.CurrentIndex = index
	local targetModel = data.Instances[index]

	player.Character = targetModel
	if targetModel.PrimaryPart then
		pcall(function() targetModel.PrimaryPart:SetNetworkOwner(player) end)
	end

	local remote = ReplicatedStorage:FindFirstChild("SwitchCharacterCamera")
	if remote then remote:FireClient(player, targetModel) end
end

function CharacterManager.setupTaskQueue(model)
	CharacterManager.Queues[model] = {}

	task.spawn(function()
		while model and model.Parent do
			local queue = CharacterManager.Queues[model]
			if queue and #queue > 0 then
				local taskItem = table.remove(queue, 1)
				CharacterManager.executeTask(model, taskItem)
			else
				task.wait(1)
			end
		end
		CharacterManager.Queues[model] = nil
	end)
end

function CharacterManager.addTask(model, taskItem)
	if CharacterManager.Queues[model] then
		table.insert(CharacterManager.Queues[model], taskItem)
	end
end

function CharacterManager.executeTask(model, taskItem)
	if taskItem.type == "move" then
		local hum = model:FindFirstChildOfClass("Humanoid")
		if hum then
			hum:MoveTo(taskItem.position)
			hum.MoveToFinished:Wait()
		end
	elseif taskItem.type == "interact" then
		-- Placeholder for interaction logic (sit, use equipment, etc.)
		task.wait(taskItem.duration or 2)
	end
end

return CharacterManager
