local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local getVotesEvent = ReplicatedStorage:WaitForChild("GetPendingVotes")
local submitVoteEvent = ReplicatedStorage:WaitForChild("SubmitVote")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- UI Components
local screenGui
local mainFrame
local appListFrame
local votingPanel

local function createUI()
	if playerGui:FindFirstChild("SmartphoneUI") then
		playerGui.SmartphoneUI:Destroy()
	end

	screenGui = Instance.new("ScreenGui")
	screenGui.Name = "SmartphoneUI"
	screenGui.Enabled = false
	screenGui.Parent = playerGui

	mainFrame = Instance.new("Frame")
	mainFrame.Size = UDim2.new(0, 220, 0, 400)
	mainFrame.Position = UDim2.new(1, -230, 1, -410)
	mainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
	mainFrame.BorderSizePixel = 0
	mainFrame.Parent = screenGui

	local header = Instance.new("Frame")
	header.Size = UDim2.new(1, 0, 0, 40)
	header.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
	header.Parent = mainFrame

	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, 0, 1, 0)
	title.Text = "MEU SMARTPHONE"
	title.TextColor3 = Color3.new(1, 1, 1)
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.GothamBold
	title.Parent = header

	local backBtn = Instance.new("TextButton")
	backBtn.Size = UDim2.new(0, 30, 0, 30)
	backBtn.Position = UDim2.new(0, 5, 0, 5)
	backBtn.Text = "<"
	backBtn.Visible = false
	backBtn.Parent = header

	appListFrame = Instance.new("Frame")
	appListFrame.Size = UDim2.new(1, -20, 1, -60)
	appListFrame.Position = UDim2.new(0, 10, 0, 50)
	appListFrame.BackgroundTransparency = 1
	appListFrame.Parent = mainFrame

	local layout = Instance.new("UIGridLayout")
	layout.CellSize = UDim2.new(0, 60, 0, 60)
	layout.Parent = appListFrame

	local voteAppBtn = Instance.new("TextButton")
	voteAppBtn.Text = "Voto"
	voteAppBtn.BackgroundColor3 = Color3.fromRGB(0, 120, 215)
	voteAppBtn.TextColor3 = Color3.new(1, 1, 1)
	voteAppBtn.Parent = appListFrame

	votingPanel = Instance.new("ScrollingFrame")
	votingPanel.Size = UDim2.new(1, -10, 1, -60)
	votingPanel.Position = UDim2.new(0, 5, 0, 50)
	votingPanel.BackgroundTransparency = 1
	votingPanel.Visible = false
	votingPanel.Parent = mainFrame

	local function openApp(panel)
		appListFrame.Visible = false
		panel.Visible = true
		backBtn.Visible = true
	end

	backBtn.MouseButton1Click:Connect(function()
		appListFrame.Visible = true
		votingPanel.Visible = false
		backBtn.Visible = false
	end)

	voteAppBtn.MouseButton1Click:Connect(function()
		openApp(votingPanel)

		local success, votes = pcall(function() return getVotesEvent:InvokeServer() end)
		if not success then return end

		for _, child in ipairs(votingPanel:GetChildren()) do
			if child:IsA("Frame") then child:Destroy() end
		end

		local yPos = 0
		for _, v in ipairs(votes) do
			local frame = Instance.new("Frame")
			frame.Size = UDim2.new(1, 0, 0, 80)
			frame.Position = UDim2.new(0, 0, 0, yPos)
			frame.BackgroundColor3 = Color3.fromRGB(45, 45, 45)
			frame.Parent = votingPanel

			local label = Instance.new("TextLabel")
			label.Size = UDim2.new(1, -10, 0, 30)
			label.Position = UDim2.new(0, 5, 0, 0)
			label.Text = v.title .. " (" .. v.time_left .. "s)"
			label.TextColor3 = Color3.new(1, 1, 1)
			label.TextWrapped = true
			label.BackgroundTransparency = 1
			label.Parent = frame

			local function createVoteBtn(text, decision, color, xPos)
				local btn = Instance.new("TextButton")
				btn.Size = UDim2.new(0.24, -2, 0, 30)
				btn.Position = UDim2.new(xPos, 1, 0, 40)
				btn.Text = text
				btn.TextScaled = true
				btn.BackgroundColor3 = color
				btn.Parent = frame
				btn.MouseButton1Click:Connect(function()
					submitVoteEvent:FireServer(v.id, decision)
					frame:Destroy()
				end)
			end

			createVoteBtn("Sim", "approve", Color3.fromRGB(0, 180, 0), 0)
			createVoteBtn("Não", "reject", Color3.fromRGB(180, 0, 0), 0.25)
			if v.has_veto then createVoteBtn("Veto", "veto", Color3.fromRGB(150, 0, 150), 0.5) end
			createVoteBtn("Nulo", "null", Color3.fromRGB(80, 80, 80), 0.75)

			yPos = yPos + 85
		end
		votingPanel.CanvasSize = UDim2.new(0, 0, 0, yPos)
	end)
end

local function setupCharacter(char)
	createUI()

	local function checkTool(child)
		if child:IsA("Tool") and child.Name == "Smartphone" then
			screenGui.Enabled = true
		end
	end

	char.ChildAdded:Connect(checkTool)
	char.ChildRemoved:Connect(function(child)
		if child:IsA("Tool") and child.Name == "Smartphone" then
			screenGui.Enabled = false
		end
	end)

	-- Check if already holding it
	for _, child in ipairs(char:GetChildren()) do
		checkTool(child)
	end
end

player.CharacterAdded:Connect(setupCharacter)
if player.Character then setupCharacter(player.Character) end
