# Roblox Experience 9812735066

Repositório para o desenvolvimento de um servidor Roblox vazio.

## Descrição
Este projeto visa a criação e configuração de uma nova experiência no Roblox usando a API Creator.

## Configuração
1. Copie o arquivo `.env.exemplo` para `.env`.
2. Adicione sua `ROBLOX_API_KEY` no arquivo `.env`.
3. Instale as dependências: `pip install requests python-dotenv`.

## Uso
Para publicar o servidor vazio (baseplate) no Roblox, execute:
```bash
python publish.py
```
O script fará o upload do arquivo `baseplate.rbxlx` para o Place ID `107019093656176`.
