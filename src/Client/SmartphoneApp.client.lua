local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local getVotesEvent = ReplicatedStorage:WaitForChild("GetPendingVotes")
local submitVoteEvent = ReplicatedStorage:WaitForChild("SubmitVote")

-- Basic UI Script
local function createUI()
	local player = Players.LocalPlayer
	local playerGui = player:WaitForChild("PlayerGui")

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "SmartphoneUI"
	screenGui.Parent = playerGui

	local mainFrame = Instance.new("Frame")
	mainFrame.Size = UDim2.new(0, 200, 0, 350)
	mainFrame.Position = UDim2.new(1, -210, 1, -360)
	mainFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
	mainFrame.Parent = screenGui

	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, 0, 0, 30)
	title.Text = "Smartphone"
	title.TextColor3 = Color3.new(1, 1, 1)
	title.BackgroundTransparency = 1
	title.Parent = mainFrame

	local voteAppBtn = Instance.new("TextButton")
	voteAppBtn.Size = UDim2.new(0.8, 0, 0, 40)
	voteAppBtn.Position = UDim2.new(0.1, 0, 0.2, 0)
	voteAppBtn.Text = "App de Votação"
	voteAppBtn.Parent = mainFrame

	local votingPanel = Instance.new("ScrollingFrame")
	votingPanel.Size = UDim2.new(1, 0, 0.6, 0)
	votingPanel.Position = UDim2.new(0, 0, 0.4, 0)
	votingPanel.Visible = false
	votingPanel.Parent = mainFrame

	voteAppBtn.MouseButton1Click:Connect(function()
		votingPanel.Visible = not votingPanel.Visible
		if votingPanel.Visible then
			-- Refresh votes
			local votes = getVotesEvent:InvokeServer()
			for _, child in ipairs(votingPanel:GetChildren()) do
				if child:IsA("Frame") then child:Destroy() end
			end

			local yPos = 0
			for _, v in ipairs(votes) do
				local frame = Instance.new("Frame")
				frame.Size = UDim2.new(1, 0, 0, 60)
				frame.Position = UDim2.new(0, 0, 0, yPos)
				frame.Parent = votingPanel

				local label = Instance.new("TextLabel")
				label.Size = UDim2.new(1, 0, 0, 20)
				label.Text = v.title .. " (" .. v.time_left .. "s)"
				label.Parent = frame

				local function createVoteBtn(text, decision, color, xPos)
					local btn = Instance.new("TextButton")
					btn.Size = UDim2.new(0.24, 0, 0, 30)
					btn.Position = UDim2.new(xPos, 0, 0, 25)
					btn.Text = text
					btn.BackgroundColor3 = color
					btn.Parent = frame
					btn.MouseButton1Click:Connect(function()
						submitVoteEvent:FireServer(v.id, decision)
						frame:Destroy()
					end)
				end

				createVoteBtn("Sim", "approve", Color3.fromRGB(0, 200, 0), 0)
				createVoteBtn("Não", "reject", Color3.fromRGB(200, 0, 0), 0.25)

				if v.has_veto then
					createVoteBtn("Veto", "veto", Color3.fromRGB(150, 0, 150), 0.5)
				end

				createVoteBtn("Nulo", "null", Color3.fromRGB(100, 100, 100), 0.75)

				yPos = yPos + 65
			end
		end
	end)
end

createUI()
