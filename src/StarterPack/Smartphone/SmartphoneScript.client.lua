local Players = game:GetService("Players")
local player = Players.LocalPlayer

local function setupTool(tool)
	tool.Equipped:Connect(function()
		-- Any specific tool sound or animation
	end)

	tool.Activated:Connect(function()
		-- Maybe toggle specific phone features?
	end)
end

-- Find tool if already in backpack
local backpack = player:WaitForChild("Backpack")
backpack.ChildAdded:Connect(function(child)
	if child:IsA("Tool") and child.Name == "Smartphone" then
		setupTool(child)
	end
end)

for _, child in ipairs(backpack:GetChildren()) do
	if child:IsA("Tool") and child.Name == "Smartphone" then
		setupTool(child)
	end
end
