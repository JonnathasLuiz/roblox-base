import os
import requests
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

API_KEY = os.getenv("ROBLOX_API_KEY")
# Universe ID da experiência: https://create.roblox.com/dashboard/creations/experiences/9811373726/overview
UNIVERSE_ID = os.getenv("ROBLOX_UNIVERSE_ID", "9811373726")
# Place ID (Root Place) obtido via API pública
PLACE_ID = os.getenv("ROBLOX_PLACE_ID", "107019093656176")

def upload_place():
    """
    Realiza o upload do arquivo baseplate.rbxlx para a experiência Roblox.
    """
    url = f"https://apis.roblox.com/universes/v1/universes/{UNIVERSE_ID}/places/{PLACE_ID}/versions"

    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/xml",
        "User-Agent": "RobloxCloudAgent/1.0"
    }

    try:
        if not os.path.exists("baseplate.rbxlx"):
            print("Erro: arquivo baseplate.rbxlx não encontrado.")
            return

        with open("baseplate.rbxlx", "rb") as f:
            data = f.read()

        params = {
            "versionType": "Published"
        }

        print(f"Iniciando upload para o Place {PLACE_ID}...")
        response = requests.post(url, headers=headers, params=params, data=data)

        if response.status_code == 200:
            version = response.json().get('versionNumber')
            print(f"Sucesso! Nova versão publicada: {version}")
        else:
            print(f"Erro no upload ({response.status_code}): {response.text}")

    except Exception as e:
        print(f"Erro inesperado: {e}")

if __name__ == "__main__":
    if not API_KEY:
        print("Erro: ROBLOX_API_KEY não configurada no arquivo .env")
    else:
        upload_place()
