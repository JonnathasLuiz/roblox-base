local CharacterManager = {}
CharacterManager.ActiveCharacters = {} -- [Player] = {CurrentChar, AllChars}

local ServerStorage = game:GetService("ServerStorage")

-- Create a basic character model if not exists for prototyping
local function getCharacterTemplate()
	local template = ServerStorage:FindFirstChild("CharacterTemplate")
	if not template then
		-- Just as a placeholder, in a real game we would have a Rig
		template = Instance.new("Model")
		template.Name = "CharacterTemplate"
		local hum = Instance.new("Humanoid", template)
		local root = Instance.new("Part", template)
		root.Name = "HumanoidRootPart"
		root.Size = Vector3.new(2, 2, 1)
		template.PrimaryPart = root
		template.Parent = ServerStorage
	end
	return template
end

function CharacterManager.initPlayer(player)
	-- Load characters from Persistence (simulated for now)
	local chars = {
		{ id = player.UserId * 10 + 1, name = player.Name .. " (Main)", member_id = player.UserId },
		{ id = player.UserId * 10 + 2, name = player.Name .. " (Alt)", member_id = player.UserId }
	}

	CharacterManager.ActiveCharacters[player] = {
		CurrentIndex = 1,
		Characters = chars,
		Instances = {}
	}

	-- Spawn characters as NPCs
	for i, charData in ipairs(chars) do
		local model = getCharacterTemplate():Clone()
		model.Name = charData.name
		model.Parent = workspace
		model:MoveTo(Vector3.new(math.random(-10, 10), 5, math.random(-10, 10)))

		CharacterManager.ActiveCharacters[player].Instances[i] = model

		-- Setup Task Queue for this NPC
		CharacterManager.setupTaskQueue(model)
	end

	-- Set initial control
	CharacterManager.switchCharacter(player, 1)
end

function CharacterManager.switchCharacter(player, index)
	local data = CharacterManager.ActiveCharacters[player]
	if not data or not data.Instances[index] then return end

	data.CurrentIndex = index
	local targetModel = data.Instances[index]

	-- Point player to this character
	player.Character = targetModel

	-- RemoteEvent would be used here to tell client to update camera
	local remote = game:GetService("ReplicatedStorage"):FindFirstChild("SwitchCharacterCamera")
	if remote then
		remote:FireClient(player, targetModel)
	end
end

function CharacterManager.setupTaskQueue(model)
	local queue = {}
	model:SetAttribute("TaskQueue", "")

	task.spawn(function()
		while model.Parent do
			if #queue > 0 then
				local taskItem = table.remove(queue, 1)
				CharacterManager.executeTask(model, taskItem)
			else
				-- IDLE Animation or behavior
				task.wait(1)
			end
		end
	end)

	model.Destroying:Connect(function()
		-- cleanup
	end)
end

function CharacterManager.executeTask(model, taskItem)
	if taskItem.type == "move" then
		local hum = model:FindFirstChildOfClass("Humanoid")
		if hum then
			hum:MoveTo(taskItem.position)
			hum.MoveToFinished:Wait()
		end
	elseif taskItem.type == "interact" then
		-- Logic for interacting with objects
		task.wait(2)
	end
end

return CharacterManager
