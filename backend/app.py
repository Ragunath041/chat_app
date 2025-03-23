from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import pymongo
from pymongo import MongoClient
import jwt
import os
import uuid
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from datetime import datetime, timedelta
import re
from bson.objectid import ObjectId

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# File upload configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# MongoDB Connection
try:
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/chat_app")
    client = MongoClient(mongo_uri)
    db = client.get_database("chat_app")
    users_collection = db.users
    messages_collection = db.messages
    # Create unique index for email and username
    users_collection.create_index([("email", pymongo.ASCENDING)], unique=True)
    users_collection.create_index([("username", pymongo.ASCENDING)], unique=True)
    # Create index for faster message retrieval
    messages_collection.create_index([("senderId", pymongo.ASCENDING)])
    messages_collection.create_index([("receiverId", pymongo.ASCENDING)])
    print("Connected to MongoDB")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# JWT Secret
JWT_SECRET = os.getenv("JWT_SECRET", "your_super_secret_jwt_key")

# Helper function to generate JWT token
def generate_token(user_id):
    payload = {
        'exp': datetime.utcnow() + timedelta(days=30),
        'iat': datetime.utcnow(),
        'sub': str(user_id)
    }
    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm='HS256'
    )

# JWT verification middleware function
def verify_token(f):
    def decorated(*args, **kwargs):
        token = None
        
        # Check if token is in the headers
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({"success": False, "message": "Token is missing"}), 401
        
        try:
            # Decode the token
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            # Get user from database
            current_user = users_collection.find_one({"_id": ObjectId(payload['sub'])})
            
            if not current_user:
                return jsonify({"success": False, "message": "Invalid token"}), 401
            
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token has expired"}), 401
        except (jwt.InvalidTokenError, Exception) as e:
            return jsonify({"success": False, "message": f"Invalid token: {str(e)}"}), 401
        
        return f(current_user, *args, **kwargs)
    
    # Preserve the original function name and docstring
    decorated.__name__ = f.__name__
    return decorated

# Routes
@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Chat API is running"})

# Register route
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        # Check if all required fields are provided
        if not username or not email or not password:
            return jsonify({"success": False, "message": "All fields are required"}), 400
        
        # Validate email format
        email_pattern = re.compile(r'^[\w\.-]+@[\w\.-]+\.\w+$')
        if not email_pattern.match(email):
            return jsonify({"success": False, "message": "Invalid email format"}), 400
        
        # Check if username already exists
        if users_collection.find_one({"username": username}):
            return jsonify({"success": False, "message": "Username already taken"}), 400
        
        # Check if email already exists
        if users_collection.find_one({"email": email}):
            return jsonify({"success": False, "message": "Email already in use"}), 400
        
        # Hash the password
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        
        # Create user document
        user = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "createdAt": datetime.utcnow()
        }
        
        # Insert user into database
        result = users_collection.insert_one(user)
        user_id = str(result.inserted_id)
        
        # Generate JWT token
        token = generate_token(user_id)
        
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "id": user_id,
                "username": username,
                "email": email
            }
        }), 201
    
    except pymongo.errors.DuplicateKeyError:
        return jsonify({"success": False, "message": "Username or email already exists"}), 400
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"success": False, "message": "Server error"}), 500

# Login route
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        email = data.get('email')
        password = data.get('password')
        
        # Check if all required fields are provided
        if not email or not password:
            return jsonify({"success": False, "message": "Email and password are required"}), 400
        
        # Find user by email
        user = users_collection.find_one({"email": email})
        
        if not user:
            return jsonify({"success": False, "message": "Invalid credentials"}), 401
        
        # Check password
        if not bcrypt.check_password_hash(user["password"], password):
            return jsonify({"success": False, "message": "Invalid credentials"}), 401
        
        # Generate JWT token
        token = generate_token(str(user["_id"]))
        
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"]
            }
        }), 200
    
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"success": False, "message": "Server error"}), 500

# Get all users endpoint
@app.route('/api/users', methods=['GET'])
@verify_token
def get_users(current_user):
    try:
        # Convert ObjectId to string for JSON serialization
        user_list = []
        for user in users_collection.find({}, {"password": 0}):
            user['id'] = str(user['_id'])
            del user['_id']
            user_list.append(user)
        
        return jsonify({
            "success": True,
            "users": user_list
        }), 200
    
    except Exception as e:
        print(f"Error getting users: {e}")
        return jsonify({"success": False, "message": "Server error"}), 500

# Helper functions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Add new endpoint for image uploads
@app.route('/api/upload', methods=['POST'])
@verify_token
def upload_file(current_user):
    if 'image' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Generate unique filename to prevent overwrites
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Return the path that can be used to access the file
        image_url = f"/api/uploads/{unique_filename}"
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': original_filename,
            'imageUrl': image_url
        }), 201
    
    return jsonify({'message': 'File type not allowed'}), 400

# Add endpoint to serve uploaded files
@app.route('/api/uploads/<filename>', methods=['GET'])
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# API to verify valid token
@app.route('/api/auth/validate', methods=['GET'])
@verify_token
def validate_token(current_user):
    return jsonify({
        'success': True,
        'user': {
            'id': str(current_user['_id']),
            'username': current_user['username'],
            'email': current_user['email']
        }
    }), 200

# Update the existing send_message endpoint to support image messages
@app.route('/api/messages', methods=['POST'])
@verify_token
def send_message(current_user):
    try:
        data = request.get_json()
        receiver_id = data.get('receiverId')
        text = data.get('text')
        message_type = data.get('type', 'text')  # Default to 'text' if not specified
        image_url = data.get('imageUrl', None)  # Optional image URL
        
        if not receiver_id or not text:
            return jsonify({'message': 'Receiver ID and message text are required'}), 400
        
        # Check if receiver exists
        receiver = users_collection.find_one({'_id': ObjectId(receiver_id)})
        if not receiver:
            return jsonify({'message': 'Receiver not found'}), 404
        
        # Create message document
        now = datetime.utcnow()
        message = {
            'senderId': str(current_user['_id']),
            'receiverId': receiver_id,
            'text': text,
            'timestamp': now,
            'status': 'sent',
            'type': message_type
        }
        
        # Add image URL if present
        if image_url:
            message['imageUrl'] = image_url
        
        # Insert message into database
        result = messages_collection.insert_one(message)
        
        # Return the created message
        message['id'] = str(result.inserted_id)
        message['timestamp'] = now.isoformat()
        
        return jsonify({'message': message}), 201
    except Exception as e:
        print(f"Error sending message: {e}")
        return jsonify({'message': 'Failed to send message'}), 500

# Get conversation history between two users
@app.route('/api/messages/<user_id>', methods=['GET'])
@verify_token
def get_messages(current_user, user_id):
    try:
        # Get all messages between current user and the specified user
        messages = list(messages_collection.find({
            '$or': [
                {'senderId': str(current_user['_id']), 'receiverId': user_id},
                {'senderId': user_id, 'receiverId': str(current_user['_id'])}
            ]
        }).sort('timestamp', 1))  # Sort by timestamp ascending
        
        # Format messages for response
        formatted_messages = []
        for msg in messages:
            message = {
                'id': str(msg['_id']),
                'senderId': msg['senderId'],
                'receiverId': msg['receiverId'],
                'text': msg['text'],
                'timestamp': msg['timestamp'].isoformat(),
                'status': msg.get('status', 'delivered')
            }
            
            # Include message type if present
            if 'type' in msg:
                message['type'] = msg['type']
            
            # Include image URL if this is an image message
            if 'imageUrl' in msg:
                message['imageUrl'] = msg['imageUrl']
            elif msg.get('type') == 'image' or '[Image:' in msg['text']:
                # Extract image name from text if needed
                image_match = re.search(r'\[Image: (.*?)\]', msg['text'])
                if image_match:
                    # We don't have a direct file reference here,
                    # but frontend might reconstruct it or display a placeholder
                    pass
            
            formatted_messages.append(message)
        
        return jsonify({'messages': formatted_messages}), 200
    except Exception as e:
        print(f"Error getting messages: {e}")
        return jsonify({'message': 'Failed to get messages'}), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True) 