local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local switchCameraEvent = ReplicatedStorage:WaitForChild("SwitchCharacterCamera")

switchCameraEvent.OnClientEvent:Connect(function(targetModel)
	local camera = workspace.CurrentCamera
	camera.CameraSubject = targetModel:FindFirstChildOfClass("Humanoid")
end)
