"""
Service Web3 pour interagir avec le smart contract AquaToken
sur Polygon Amoy testnet
"""

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from dotenv import load_dotenv
import json
import os

load_dotenv()

# ═══════════════════════════════
# CONFIGURATION
# ═══════════════════════════════

AMOY_RPC_URL = os.getenv("AMOY_RPC_URL", "https://rpc-amoy.polygon.technology")
PRIVATE_KEY = os.getenv("BLOCKCHAIN_PRIVATE_KEY", "")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
ABI_PATH = os.path.join(os.path.dirname(__file__), "../abi/AquaToken.json")

# ═══════════════════════════════
# INITIALISATION WEB3
# ═══════════════════════════════

def get_web3():
    """Initialise et retourne une connexion Web3"""
    w3 = Web3(Web3.HTTPProvider(AMOY_RPC_URL))
    # Middleware requis pour Polygon (PoA chain)
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    return w3

def get_contract(w3: Web3):
    """Retourne l'instance du smart contract"""
    if not CONTRACT_ADDRESS:
        raise ValueError("[WEB3] CONTRACT_ADDRESS non configuré dans .env")
    if not os.path.exists(ABI_PATH):
        raise FileNotFoundError(f"[WEB3] ABI non trouvé: {ABI_PATH}")

    with open(ABI_PATH) as f:
        abi = json.load(f)

    return w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=abi
    )

# ═══════════════════════════════
# FONCTIONS PRINCIPALES
# ═══════════════════════════════

async def register_farmer_on_chain(
    farmer_address: str,
    aqua_id: str
) -> dict:
    """
    Enregistre un agriculteur sur la blockchain
    Appelé lors de l'inscription
    """
    try:
        w3 = get_web3()
        contract = get_contract(w3)
        account = w3.eth.account.from_key(PRIVATE_KEY)

        # Construire la transaction
        tx = contract.functions.registerFarmer(
            Web3.to_checksum_address(farmer_address),
            aqua_id
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 200000,
            'gasPrice': w3.to_wei('30', 'gwei'),
            'chainId': 80002
        })

        # Signer et envoyer
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        tx_hash_hex = tx_hash.hex()
        print(f"[WEB3] Agriculteur enregistré: {aqua_id} | tx: {tx_hash_hex}")

        return {
            "success": True,
            "tx_hash": tx_hash_hex,
            "aqua_id": aqua_id,
            "address": farmer_address
        }
    except Exception as e:
        print(f"[WEB3] Erreur registerFarmer: {e}")
        return {"success": False, "error": str(e)}

async def mint_tokens_on_chain(
    farmer_address: str,
    aqua_id: str,
    quota_litres: int,
    real_litres: int,
    tokens_amount: float
) -> dict:
    """
    Mint des tokens sur la blockchain pour un agriculteur
    Appelé après calcul des tokens dans token_service.py
    """
    try:
        w3 = get_web3()
        contract = get_contract(w3)
        account = w3.eth.account.from_key(PRIVATE_KEY)

        # Convertir tokens en entier (pas de décimales dans le contrat)
        tokens_int = max(1, int(tokens_amount))

        # Construire la transaction
        tx = contract.functions.mintWaterReward(
            Web3.to_checksum_address(farmer_address),
            aqua_id,
            int(quota_litres),
            int(real_litres),
            tokens_int
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 300000,
            'gasPrice': w3.to_wei('30', 'gwei'),
            'chainId': 80002
        })

        # Signer et envoyer
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        tx_hash_hex = tx_hash.hex()
        print(f"[WEB3] Tokens mintés: {tokens_int} AQUA | tx: {tx_hash_hex}")

        return {
            "success": True,
            "tx_hash": tx_hash_hex,
            "tokens_minted": tokens_int,
            "polygonscan_url": f"https://amoy.polygonscan.com/tx/{tx_hash_hex}"
        }
    except Exception as e:
        print(f"[WEB3] Erreur mintTokens: {e}")
        return {"success": False, "error": str(e)}

async def get_balance_on_chain(farmer_address: str) -> int:
    """Récupère le solde on-chain d'un agriculteur"""
    try:
        w3 = get_web3()
        contract = get_contract(w3)
        balance = contract.functions.getBalance(
            Web3.to_checksum_address(farmer_address)
        ).call()
        return balance
    except Exception as e:
        print(f"[WEB3] Erreur getBalance: {e}")
        return 0

def check_connection() -> bool:
    """Vérifie la connexion à la blockchain"""
    try:
        w3 = get_web3()
        connected = w3.is_connected()
        if connected:
            block = w3.eth.block_number
            print(f"[WEB3] Connecté à Amoy | Bloc: {block}")
        return connected
    except Exception as e:
        print(f"[WEB3] Erreur connexion: {e}")
        return False
