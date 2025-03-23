import os
import sys

print("Verifying Flask Backend Setup...")

# Check if requirements.txt exists
if not os.path.exists('requirements.txt'):
    print("ERROR: requirements.txt not found!")
    sys.exit(1)
else:
    print("✓ requirements.txt found")

# Check if .env exists
if not os.path.exists('.env'):
    print("ERROR: .env file not found!")
    sys.exit(1)
else:
    print("✓ .env file found")

# Check if app.py exists
if not os.path.exists('app.py'):
    print("ERROR: app.py not found!")
    sys.exit(1)
else:
    print("✓ app.py found")

# Try importing required packages
try:
    print("Checking if required packages are installed...")
    
    packages = [
        'flask', 
        'flask_cors', 
        'flask_bcrypt', 
        'pymongo', 
        'jwt', 
        'dotenv'
    ]
    
    missing_packages = []
    
    for package in packages:
        try:
            __import__(package)
            print(f"✓ {package} is installed")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} is not installed")
    
    if missing_packages:
        print("\nSome packages are missing. Install them with:")
        print(f"pip install {' '.join(missing_packages)}")
        print("Or run: pip install -r requirements.txt")
    else:
        print("\nAll required packages are installed!")
        print("\nYour Flask backend is set up correctly!")
        print("Run the server with: python app.py")
        
except Exception as e:
    print(f"An error occurred while checking packages: {e}")

print("\nVerification completed.") 