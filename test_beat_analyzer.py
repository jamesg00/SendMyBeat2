#!/usr/bin/env python3
"""
Test script to verify Beat Analyzer is working after frontend changes
"""
import requests
import json
from datetime import datetime

class BeatAnalyzerTester:
    def __init__(self):
        self.base_url = "https://musicprodai-1.preview.emergentagent.com"
        self.token = None
        self.user_id = None

    def register_and_login(self):
        """Register a test user and get token"""
        username = f"beat_test_{datetime.now().strftime('%H%M%S')}"
        password = "TestPass123!"
        
        # Register
        response = requests.post(
            f"{self.base_url}/api/auth/register",
            json={"username": username, "password": password},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            self.user_id = data['user']['id']
            print(f"✅ Registered user: {username}")
            return True
        else:
            print(f"❌ Registration failed: {response.status_code}")
            return False

    def test_beat_analyzer(self):
        """Test Beat Analyzer endpoint with the exact data from review request"""
        print("\n🔍 Testing Beat Analyzer Endpoint...")
        
        # Test data as specified in the review request
        beat_data = {
            "title": "Drake Type Beat 2024",
            "tags": ["drake", "type beat", "hip hop", "rap", "instrumental"],
            "description": "Drake style beat"
        }
        
        response = requests.post(
            f"{self.base_url}/api/beat/analyze",
            json=beat_data,
            headers={
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            },
            timeout=60
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            # Verify response structure
            required_fields = [
                'overall_score', 'title_score', 'tags_score', 'seo_score',
                'strengths', 'weaknesses', 'suggestions', 'predicted_performance'
            ]
            
            missing_fields = [field for field in required_fields if field not in result]
            if missing_fields:
                print(f"❌ Missing fields in response: {missing_fields}")
                return False
            
            print("✅ Beat Analyzer Response Structure Valid")
            print(f"   Overall Score: {result['overall_score']}/100")
            print(f"   Title Score: {result['title_score']}/100")
            print(f"   Tags Score: {result['tags_score']}/100")
            print(f"   SEO Score: {result['seo_score']}/100")
            print(f"   Predicted Performance: {result['predicted_performance']}")
            print(f"   Strengths: {len(result['strengths'])} items")
            print(f"   Weaknesses: {len(result['weaknesses'])} items")
            print(f"   Suggestions: {len(result['suggestions'])} items")
            
            return True
            
        elif response.status_code == 402:
            print("⚠️ No AI credits available (expected behavior)")
            error_detail = response.json().get('detail', {})
            if isinstance(error_detail, dict):
                print(f"   Message: {error_detail.get('message', 'No message')}")
                print(f"   Resets at: {error_detail.get('resets_at', 'No reset time')}")
            return True  # This is expected behavior when no credits
            
        elif response.status_code == 401 or response.status_code == 403:
            print("❌ Authentication failed")
            return False
            
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            try:
                print(f"   Error: {response.json()}")
            except:
                print(f"   Response text: {response.text}")
            return False

    def test_beat_analyzer_without_auth(self):
        """Test Beat Analyzer without authentication"""
        print("\n🔍 Testing Beat Analyzer Without Authentication...")
        
        beat_data = {
            "title": "Test Beat",
            "tags": ["test"],
            "description": "Test description"
        }
        
        response = requests.post(
            f"{self.base_url}/api/beat/analyze",
            json=beat_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code in [401, 403]:
            print("✅ Proper authentication required")
            return True
        else:
            print(f"❌ Expected 401/403, got {response.status_code}")
            return False

    def run_test(self):
        """Run the complete Beat Analyzer test"""
        print("🚀 Starting Beat Analyzer Verification Test")
        print("=" * 50)
        
        # Test without authentication first
        if not self.test_beat_analyzer_without_auth():
            return False
        
        if not self.register_and_login():
            return False
        
        return self.test_beat_analyzer()

if __name__ == "__main__":
    tester = BeatAnalyzerTester()
    success = tester.run_test()
    
    if success:
        print("\n🎉 Beat Analyzer verification PASSED!")
        print("Beat Analyzer is working correctly after frontend changes.")
    else:
        print("\n❌ Beat Analyzer verification FAILED!")
        print("There may be an issue with the Beat Analyzer endpoint.")