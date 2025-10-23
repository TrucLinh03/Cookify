"""
Setup script for Enhanced Chatbot
Tự động cài đặt và cấu hình hệ thống chatbot nâng cao
"""
import os
import subprocess
import sys
import json
from pathlib import Path

def run_command(command, description):
    """Run shell command with error handling"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def install_requirements():
    """Install Python requirements"""
    requirements = [
        "fastapi==0.104.1",
        "uvicorn[standard]==0.24.0", 
        "sentence-transformers>=2.2.2",
        "faiss-cpu>=1.7.4",
        "pyarrow>=14.0.1",
        "pandas>=2.1.3",
        "numpy>=1.24.3",
        "pymongo>=4.4.0",
        "motor>=3.3.2",
        "google-generativeai>=0.3.2",
        "python-dotenv>=1.0.0",
        "scikit-learn>=1.3.2",
        "tqdm>=4.66.1"
    ]
    
    for req in requirements:
        if not run_command(f"pip install {req}", f"Installing {req}"):
            return False
    
    return True

def setup_environment():
    """Setup environment files"""
    print("🔧 Setting up environment...")
    
    # Create .env file if not exists
    env_file = Path(".env")
    if not env_file.exists():
        env_content = """# Enhanced Chatbot Configuration
GOOGLE_API_KEY=your_google_api_key_here
MONGODB_URI=mongodb+srv://admin:3dk5BqyUu0FlzQ4t@liliflowerstore.byu1dsr.mongodb.net/Cookify?retryWrites=true&w=majority&appName=LiliFlowerStore

# Server Configuration  
HOST=0.0.0.0
PORT=8000

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174

# Model Configuration
SENTENCE_TRANSFORMER_MODEL=paraphrase-multilingual-MiniLM-L12-v2
EMBEDDING_DIMENSION=384

# Vector DB Configuration
VECTOR_INDEX_PATH=./vector_index.faiss
VECTOR_METADATA_PATH=./vector_metadata.pkl

# Confidence Scoring
DEFAULT_CONFIDENCE_THRESHOLD=0.3
"""
        
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        print("✅ Created .env file")
        print("⚠️  Please update GOOGLE_API_KEY in .env file")
    else:
        print("✅ .env file already exists")
    
    return True

def create_startup_script():
    """Create startup script"""
    startup_script = """#!/bin/bash
# Enhanced Chatbot Startup Script

echo "🚀 Starting Enhanced Cooking Chatbot..."

# Activate virtual environment if exists
if [ -d ".venv" ]; then
    echo "📦 Activating virtual environment..."
    source .venv/bin/activate
fi

# Install/update requirements
echo "📚 Installing requirements..."
pip install -r requirements.txt

# Start the enhanced chatbot
echo "🎯 Starting enhanced chatbot server..."
python enhanced_main.py
"""
    
    with open("start_enhanced_chatbot.sh", 'w') as f:
        f.write(startup_script)
    
    # Make executable on Unix systems
    if os.name != 'nt':
        os.chmod("start_enhanced_chatbot.sh", 0o755)
    
    print("✅ Created startup script: start_enhanced_chatbot.sh")

def create_test_script():
    """Create test script"""
    test_script = """
import asyncio
import aiohttp
import json

async def test_enhanced_chatbot():
    \"\"\"Test enhanced chatbot functionality\"\"\"
    base_url = "http://localhost:8000"
    
    # Test questions
    test_questions = [
        "Cách làm phở bò?",
        "Nguyên liệu làm bánh mì?", 
        "Mẹo chiên cá không dính chảo?",
        "Công thức nước mắm chấm?",
        "Làm sao để cơm không bị nhão?"
    ]
    
    async with aiohttp.ClientSession() as session:
        print("🧪 Testing Enhanced Chatbot API...")
        
        # Test health check
        try:
            async with session.get(f"{base_url}/health") as response:
                if response.status == 200:
                    health_data = await response.json()
                    print("✅ Health check passed")
                    print(f"📊 Vector DB stats: {health_data.get('vector_db_stats', {})}")
                else:
                    print("❌ Health check failed")
                    return
        except Exception as e:
            print(f"❌ Cannot connect to chatbot: {e}")
            return
        
        # Test chat functionality
        for i, question in enumerate(test_questions, 1):
            try:
                payload = {
                    "message": question,
                    "include_recipes": True,
                    "confidence_threshold": 0.3
                }
                
                async with session.post(f"{base_url}/ask", json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"\\n✅ Test {i}: {question}")
                        print(f"📝 Response: {data['response'][:100]}...")
                        print(f"🎯 Confidence: {data['confidence']['percentage']}% ({data['confidence']['level']})")
                        print(f"📚 Sources: {len(data['sources'])} documents")
                    else:
                        print(f"❌ Test {i} failed: {response.status}")
                        
            except Exception as e:
                print(f"❌ Test {i} error: {e}")
        
        print("\\n🎉 Testing completed!")

if __name__ == "__main__":
    asyncio.run(test_enhanced_chatbot())
"""
    
    with open("test_enhanced_chatbot.py", 'w', encoding='utf-8') as f:
        f.write(test_script)
    
    print("✅ Created test script: test_enhanced_chatbot.py")

def main():
    """Main setup function"""
    print("🎯 Enhanced Chatbot Setup")
    print("=" * 50)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Setup steps
    steps = [
        ("Installing requirements", install_requirements),
        ("Setting up environment", setup_environment), 
        ("Creating startup script", create_startup_script),
        ("Creating test script", create_test_script)
    ]
    
    for description, func in steps:
        if not func():
            print(f"❌ Setup failed at: {description}")
            return False
    
    print("\n🎉 Enhanced Chatbot setup completed!")
    print("\n📋 Next steps:")
    print("1. Update GOOGLE_API_KEY in .env file")
    print("2. Run: python enhanced_main.py")
    print("3. Test: python test_enhanced_chatbot.py")
    print("4. Access API docs: http://localhost:8000/docs")
    
    return True

if __name__ == "__main__":
    main()
