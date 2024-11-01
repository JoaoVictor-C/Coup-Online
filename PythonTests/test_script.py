# test_script.py

import os
import requests
import random
import string
import time
import logging
from signalrcore.hub_connection_builder import HubConnectionBuilder
import threading
import json

# Configure Logging
try:
    # Create a stream handler for console output
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Configure logging for console
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[console_handler]
    )
    
    # Remove the FileHandler to prevent malformed JSON
    # logging.getLogger().removeHandler(logging.getLogger().handlers[0])
    
except Exception as e:
    print(f"Failed to configure logging: {str(e)}")
    raise

# Base URL of your backend API
BASE_URL = os.getenv("BASE_URL", "http://localhost:5000/api")
SIGNALR_URL = os.getenv("SIGNALR_URL", "http://localhost:5000/gameHub")

# Headers
JSON_HEADERS = {
    "Content-Type": "application/json"
}

# Path to the JSON log file
JSON_LOG_FILE = "Interface/test_steps.json"

# Ensure the JSON log file exists
if not os.path.exists(JSON_LOG_FILE):
    with open(JSON_LOG_FILE, "w") as f:
        pass  # Create an empty file

# Function to log steps and game state as JSON
def log_step_json(step_description, game_state=None):
    try:
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "step": step_description,
            "game_state": game_state
        }
        with threading.Lock():
            with open(JSON_LOG_FILE, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        logging.error(f"Failed to log step to JSON: {str(e)}")

# Updated log_step function to handle both console and JSON logging
def log_step(step_description, game_state=None):
    try:
        log_entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "step": step_description,
            "game_state": game_state
        }
        # Log to console
        logging.info(json.dumps(log_entry))
        # Log to JSON file
        log_step_json(step_description, game_state)
    except Exception as e:
        logging.error(f"Failed to log step: {str(e)}")

# Utility Functions
def generate_random_email():
    try:
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=10)) + "@test.com"
    except Exception as e:
        logging.error(f"Failed to generate random email: {str(e)}")
        raise

def generate_random_password():
    try:
        return ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    except Exception as e:
        logging.error(f"Failed to generate random password: {str(e)}")
        raise

def on_disconnect():
    try:
        log_step("SignalR disconnected")
    except Exception as e:
        logging.error(f"Error in disconnect handler: {str(e)}")

def on_connection():
    try:
        log_step("SignalR connected")
    except Exception as e:
        logging.error(f"Error in connection handler: {str(e)}")

def generate_random_username():
    try:
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    except Exception as e:
        logging.error(f"Failed to generate random username: {str(e)}")
        raise

# SignalR Handlers
class SignalRConnection:
    def __init__(self, token, connection_name):
        try:
            self.token = token
            self.connection_name = connection_name
            self.connection = HubConnectionBuilder()\
                .with_url(f"{SIGNALR_URL}?access_token={self.token}")\
                .build()
            self.setup_event_handlers()
        except Exception as e:
            logging.error(f"Failed to initialize SignalR connection: {str(e)}")
            raise

    def setup_event_handlers(self):
        try:
            self.connection.on("PlayerJoined", self.on_player_joined)
            self.connection.on("GameStarted", self.on_game_started)
            self.connection.on("ActionPerformed", self.on_action_performed)
            self.connection.on("Error", self.on_error)
            self.connection.on("GameStateUpdated", self.on_game_state_updated)
            self.connection.on("ChallengeInitiated", self.on_challenge_initiated)
            self.connection.on("BlockInitiated", self.on_block_initiated)
        except Exception as e:
            logging.error(f"Failed to setup event handlers: {str(e)}")
            raise

    def on_player_joined(self, data):
        try:
            log_step(f"Player joined event received", {"connection": self.connection_name, "data": data})
        except Exception as e:
            logging.error(f"Error in player joined handler: {str(e)}")

    def on_game_started(self, data):
        try:
            log_step(f"Game started event received", {"connection": self.connection_name, "data": data})
        except Exception as e:
            logging.error(f"Error in game started handler: {str(e)}")

    def on_action_performed(self, data):
        try:
            log_step(f"Action performed event received", {"connection": self.connection_name, "data": data})
        except Exception as e:
            logging.error(f"Error in action performed handler: {str(e)}")

    def on_error(self, error):
        try:
            log_step(f"Error event received", {"connection": self.connection_name, "error": error})
        except Exception as e:
            logging.error(f"Error in error handler: {str(e)}")

    def on_game_state_updated(self, data):
        try:
            log_step(f"Game state updated event received", {"connection": self.connection_name, "data": data})
        except Exception as e:
            logging.error(f"Error in game state update handler: {str(e)}")

    def on_challenge_initiated(self, data):
        try:
            log_step(f"Challenge initiated event received", {"connection": self.connection_name, "data": data})
        except Exception as e:
            logging.error(f"Error in challenge initiated handler: {str(e)}")

    def on_block_initiated(self, data):
        try:
            log_step(f"Block initiated event received", {"connection": self.connection_name, "data": data})
        except Exception as e:
            logging.error(f"Error in block initiated handler: {str(e)}")

    def start(self):
        try:
            self.connection.start()
            log_step(f"SignalR connection started", {"connection": self.connection_name})
        except Exception as e:
            log_step(f"Failed to start SignalR connection", {"connection": self.connection_name, "error": str(e)})
            raise

    def stop(self):
        try:
            self.connection.stop()
            log_step(f"SignalR connection stopped", {"connection": self.connection_name})
        except Exception as e:
            log_step(f"Failed to stop SignalR connection", {"connection": self.connection_name, "error": str(e)})

# Function to log steps and game state
def log_step_description(step_description, game_state=None):
    log_step(step_description, game_state)

# Function to perform game actions
def perform_action(session, connection, game_id, action, target_id=None):
    log_step(f"Attempting action: {action}", {
        "game_id": game_id,
        "action": action,
        "target_id": target_id
    })
    
    action_completed = threading.Event()

    def callback(message):
        try:
            log_step(f"Action callback received: {action}", {
                "action": action,
                "message": message
            })
            action_completed.set()
        except Exception as e:
            logging.error(f"Error in action callback: {str(e)}")

    try:
        connection.connection.send("PerformAction", [game_id, action, target_id], callback)
    except Exception as e:
        log_step(f"Failed to send action: {action}", {
            "action": action,
            "error": str(e)
        })
        return False

    # Wait for callback with timeout
    if not action_completed.wait(timeout=10):  # Increased timeout
        log_step("Action timeout", {
            "action": action,
            "timeout": 10
        })
        return False

    return True

# Block and Challenge Actions
def perform_response_action(session, connection, game_id, action_type, initiator_id, response_type):
    log_step(f"Attempting response action: {response_type} to {action_type}", {
        "game_id": game_id,
        "action_type": action_type,
        "initiator_id": initiator_id,
        "response_type": response_type
    })
    
    response_completed = threading.Event()

    def callback(message):
        try:
            log_step(f"Response action callback received: {response_type}", {
                "action_type": action_type,
                "response_type": response_type,
                "message": message
            })
            response_completed.set()
        except Exception as e:
            logging.error(f"Error in response callback: {str(e)}")

    try:
        if response_type == "Block":
            connection.connection.send("BlockGameAction", [game_id, action_type, initiator_id], callback)
        elif response_type == "Challenge":
            connection.connection.send("ChallengeGameAction", [game_id, action_type, initiator_id], callback)
    except Exception as e:
        log_step(f"Failed to send response action: {response_type}", {
            "action_type": action_type,
            "response_type": response_type,
            "error": str(e)
        })
        return False

    if not response_completed.wait(timeout=10):  # Increased timeout
        log_step("Response action timeout", {
            "action_type": action_type,
            "response_type": response_type,
            "timeout": 10
        })
        return False

    return True

# Main Test Function
def main():
    try:
        # Step 1: Create Fake Random Credentials
        user1_username = generate_random_username()
        user1_email = generate_random_email()
        user1_password = generate_random_password()

        user2_username = generate_random_username()
        user2_email = generate_random_email()
        user2_password = generate_random_password()

        log_step("Generated user credentials", {
            "user1": {
                "username": user1_username,
                "email": user1_email,
                "password": user1_password
            },
            "user2": {
                "username": user2_username,
                "email": user2_email,
                "password": user2_password
            }
        })

        # Session Objects
        session1 = requests.Session()
        session2 = requests.Session()

        # Step 2: Attempt to Login with Invalid Credentials
        def attempt_login(session, username, password):
            url = f"{BASE_URL}/Auth/login"
            payload = {
                "username": username,
                "password": password
            }
            try:
                response = session.post(url, json=payload, headers=JSON_HEADERS)
                return response
            except requests.RequestException as e:
                log_step("Login request failed", {"error": str(e)})
                return None

        log_step("Attempting login with invalid credentials", {"username": user1_username})
        response = attempt_login(session1, user1_username, user1_password)
        if response is None or response.status_code != 401:
            log_step("Invalid credentials test failed", {
                "expected_status": 401,
                "actual_status": response.status_code if response else "No Response"
            })
            return
        log_step("Invalid credentials test passed")

        # Step 3: Register Users
        def register_user(session, username, email, password):
            url = f"{BASE_URL}/Auth/register"
            payload = {
                "username": username,
                "email": email,
                "password": password
            }
            try:
                response = session.post(url, json=payload, headers=JSON_HEADERS)
                return response
            except requests.RequestException as e:
                log_step("Registration request failed", {"error": str(e)})
                return None

        log_step("Registering User 1", {"username": user1_username})
        response = register_user(session1, user1_username, user1_email, user1_password)
        if response is None or response.status_code != 200:
            log_step("User 1 registration failed", {
                "expected_status": 200,
                "actual_status": response.status_code if response else "No Response"
            })
            return
        log_step("User 1 registered successfully")

        log_step("Registering User 2", {"username": user2_username})
        response = register_user(session2, user2_username, user2_email, user2_password)
        if response is None or response.status_code != 200:
            log_step("User 2 registration failed", {
                "expected_status": 200,
                "actual_status": response.status_code if response else "No Response"
            })
            return
        log_step("User 2 registered successfully")

        # Step 4: Login and Obtain Tokens
        def login_user(session, username, password):
            url = f"{BASE_URL}/Auth/login"
            payload = {
                "username": username,
                "password": password
            }
            try:
                response = session.post(url, json=payload, headers=JSON_HEADERS)
                return response
            except requests.RequestException as e:
                log_step("Login request failed", {"error": str(e)})
                return None

        log_step("Logging in User 1", {"username": user1_username})
        response = login_user(session1, user1_username, user1_password)
        if response is None or response.status_code != 200:
            log_step("User 1 login failed", {
                "expected_status": 200,
                "actual_status": response.status_code if response else "No Response"
            })
            return
        token1 = response.json().get("token")
        if not token1:
            log_step("Token not received for User 1")
            return
        session1.headers.update({"Authorization": f"Bearer {token1}"})
        log_step("User 1 logged in successfully", {"token": token1})

        log_step("Logging in User 2", {"username": user2_username})
        response = login_user(session2, user2_username, user2_password)
        if response is None or response.status_code != 200:
            log_step("User 2 login failed", {
                "expected_status": 200,
                "actual_status": response.status_code if response else "No Response"
            })
            return
        token2 = response.json().get("token")
        if not token2:
            log_step("Token not received for User 2")
            return
        session2.headers.update({"Authorization": f"Bearer {token2}"})
        log_step("User 2 logged in successfully", {"token": token2})

        # Step 5: Create a Room
        def create_room(session, room_name="Test Room"):
            url = f"{BASE_URL}/rooms"
            payload = {
                "gameName": room_name,
                "playerCount": 2,
                "isPrivate": False
            }
            try:
                response = session.post(url, json=payload, headers=JSON_HEADERS)
                return response
            except requests.RequestException as e:
                log_step("Create room request failed", {"error": str(e)})
                return None

        log_step("Creating game room", {"creator": user1_username})
        response = create_room(session1)
        if response is None or response.status_code != 201:
            log_step("Room creation failed", {
                "expected_status": 201,
                "actual_status": response.status_code if response else "No Response"
            })
            return
        room_id = response.json().get("id")
        if not room_id:
            log_step("Room ID not received")
            return
        log_step("Room created successfully", {"room_id": room_id})

        # Step 6: User 2 Joins the Room
        def join_room(session, room_id):
            url = f"{BASE_URL}/game/join"
            payload = {
                "gameIdOrCode": room_id
            }
            try:
                response = session.post(url, json=payload, headers=JSON_HEADERS)
                return response
            except requests.RequestException as e:
                log_step("Join room request failed", {"error": str(e)})
                return None

        log_step("User 2 joining room", {"room_id": room_id})
        response = join_room(session2, room_id)
        if response is None or response.status_code != 200:
            log_step("Room join failed", {
                "expected_status": 200,
                "actual_status": response.status_code if response else "No Response"
            })
            return
        log_step("User 2 joined room successfully")

        # Step 7: Start the Game (User 1 Action)
        def start_game(session, room_id):
            url = f"{BASE_URL}/game/start"
            payload = {
                "gameIdOrCode": room_id
            }
            try:
                response = session.post(url, json=payload, headers=JSON_HEADERS)
                return response
            except requests.RequestException as e:
                log_step("Start game request failed", {"error": str(e)})
                return None

        log_step("Starting game", {"room_id": room_id})
        response = start_game(session1, room_id)
        if response is None or response.status_code != 200:
            log_step("Game start failed", {
                "expected_status": 200,
                "actual_status": response.status_code if response else "No Response"
            })
            return
        game_id = response.json().get("gameId")
        if not game_id:
            log_step("Game ID not received")
            return
        log_step("Game started successfully", {"game_id": game_id})

        # Create SignalR connections with access tokens
        connection1 = SignalRConnection(token1, "User1")
        connection2 = SignalRConnection(token2, "User2")

        # Start SignalR connections
        connection1.start()
        connection2.start()

        log_step("Waiting for SignalR connections to establish")
        time.sleep(2)

        # Step 8: Perform and Test Game Actions

        # Action: Steal
        def test_steal(session_attacker, connection, session_target, game_id, target_user_id):
            log_step("Testing steal action", {
                "attacker": connection.connection_name,
                "target": target_user_id
            })
            success = perform_action(session_attacker, connection, game_id, "steal", target_id=target_user_id)
            if not success:
                log_step("Steal action failed")
                return False
            log_step("Steal action succeeded")
            return True

        # Action: Tax
        def test_tax(session, connection, game_id):
            log_step("Testing tax action", {"player": connection.connection_name})
            success = perform_action(session, connection, game_id, "tax")
            if not success:
                log_step("Tax action failed")
                return False
            log_step("Tax action succeeded")
            return True

        # Action: Ambassador
        def test_ambassador(session, connection, game_id):
            log_step("Testing ambassador action", {"player": connection.connection_name})
            success = perform_action(session, connection, game_id, "ambassador")
            if not success:
                log_step("Ambassador action failed")
                return False
            log_step("Ambassador action succeeded")
            return True

        # Action: Assassinate
        def test_assassinate(session_attacker, connection, session_target, game_id, target_user_id):
            log_step("Testing assassinate action", {
                "attacker": connection.connection_name,
                "target": target_user_id
            })
            success = perform_action(session_attacker, connection, game_id, "assassinate", target_id=target_user_id)
            if not success:
                log_step("Assassinate action failed")
                return False
            log_step("Assassinate action succeeded")
            return True

        # Action: Income
        def test_income(session, connection, game_id):
            log_step("Testing income action", {"player": connection.connection_name})
            success = perform_action(session, connection, game_id, "income")
            if not success:
                log_step("Income action failed")
                return False
            log_step("Income action succeeded")
            return True

        # Action: Coup
        def test_coup(session_attacker, connection, session_target, game_id, target_user_id):
            log_step("Testing coup action", {
                "attacker": connection.connection_name,
                "target": target_user_id
            })
            success = perform_action(session_attacker, connection, game_id, "coup", target_id=target_user_id)
            if not success:
                log_step("Coup action failed")
                return False
            log_step("Coup action succeeded")
            return True

        # Example Action Tests
        if not test_steal(session1, connection1, session2, game_id, user2_username):
            return
        if not test_tax(session1, connection1, game_id):
            return
        if not test_ambassador(session1, connection1, game_id):
            return
        if not test_assassinate(session1, connection1, session2, game_id, user2_username):
            return
        if not test_income(session2, connection2, game_id):
            return
        if not test_coup(session2, connection2, session1, game_id, user1_username):
            return

        # Step 9: Test Block and Challenge Actions

        # Example Block and Challenge Tests
        log_step("Testing block action", {
            "action": "steal",
            "blocker": user2_username,
            "target": user1_username
        })
        if not perform_response_action(session2, connection2, game_id, "steal", user1_username, "Block"):
            log_step("Block steal action failed")
            return
        log_step("Block steal action succeeded")

        log_step("Testing challenge action", {
            "action": "tax",
            "challenger": user2_username,
            "target": user1_username
        })
        if not perform_response_action(session2, connection2, game_id, "tax", user1_username, "Challenge"):
            log_step("Challenge tax action failed")
            return
        log_step("Challenge tax action succeeded")

        # Clean up SignalR connections
        connection1.stop()
        connection2.stop()

        log_step("Test suite completed successfully")

    except Exception as e:
        logging.error(f"Test suite failed with error: {str(e)}")
        raise

if __name__ == "__main__":
    main()