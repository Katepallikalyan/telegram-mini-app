import os
import requests
import logging
from datetime import datetime

class HathorClient:
    """
    Client for interacting with the Hathor blockchain network
    """
    
    def __init__(self):
        """Initialize the Hathor client with API configuration"""
        self.api_url = os.environ.get("HATHOR_API_URL", "https://node1.testnet.hathor.network/v1a/")
        self.token_uid = os.environ.get("HATHOR_TOKEN_UID", "00")  # Default is HTR
        self.wallet_id = os.environ.get("HATHOR_WALLET_ID", "learn-earn-wallet")
        self.api_key = os.environ.get("HATHOR_API_KEY", "")
        
        # Default wallet for token distribution - this should be a real wallet with funds
        self.distribution_wallet = os.environ.get("HATHOR_DISTRIBUTION_WALLET", "")
        
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        
        logging.debug(f"Initialized Hathor client for token: {self.token_uid}")
    
    def get_balance(self, wallet_address):
        """Get token balance for a wallet address"""
        try:
            url = f"{self.api_url}wallet/balance"
            params = {"address": wallet_address, "token_id": self.token_uid}
            
            response = requests.get(url, params=params, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            return data.get("available", 0)
        except Exception as e:
            logging.error(f"Error getting balance: {str(e)}")
            return 0
    
    def send_tokens(self, destination_address, amount):
        """
        Send tokens to a destination address
        Returns transaction ID if successful
        """
        try:
            url = f"{self.api_url}wallet/simple-send-tx"
            
            payload = {
                "wallet_id": self.wallet_id,
                "address": destination_address,
                "value": int(amount * 100),  # Convert to smallest unit (cents)
                "token": self.token_uid
            }
            
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            tx_id = data.get("hash")
            
            logging.info(f"Sent {amount} tokens to {destination_address}, tx: {tx_id}")
            return tx_id
        except Exception as e:
            logging.error(f"Error sending tokens: {str(e)}")
            raise
    
    def execute_nano_contract(self, contract_id, method, args=None):
        """
        Execute a Hathor Nano Contract
        This is a simplified implementation - real implementation depends on Hathor's Nano Contract API
        """
        try:
            # This is a placeholder - replace with actual Hathor Nano Contract API when available
            url = f"{self.api_url}contract/execute"
            
            payload = {
                "contract_id": contract_id,
                "method": method,
                "args": args or {}
            }
            
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            return data
        except Exception as e:
            logging.error(f"Error executing nano contract: {str(e)}")
            raise
    
    def create_token(self, name, symbol, amount):
        """Create a new token on Hathor network"""
        try:
            url = f"{self.api_url}wallet/create-token"
            
            payload = {
                "wallet_id": self.wallet_id,
                "name": name,
                "symbol": symbol,
                "amount": amount
            }
            
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            return data.get("hash"), data.get("token_uid")
        except Exception as e:
            logging.error(f"Error creating token: {str(e)}")
            raise
