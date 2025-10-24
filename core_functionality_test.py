#!/usr/bin/env python3
"""
Core functionality test focusing on credit system without heavy AI calls
"""
import requests
import json
from datetime import datetime

class CoreFunctionalityTester:
    def __init__(self, base_url="https://musicai-11.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None

    def create_test_user(self):
        """Create a fresh test user"""
        test_username = f"core_test_{datetime.now().strftime('%H%M%S%f')}"
        test_password = "CoreTest123!"
        
        url = f"{self.base_url}/api/auth/register"
        response = requests.post(
            url,
            json={"username": test_username, "password": test_password},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            self.user_id = data['user']['id']
            print(f"✅ Created test user: {test_username}")
            return True
        else:
            print(f"❌ Failed to create user: {response.status_code}")
            return False

    def get_subscription_status(self):
        """Get current subscription status"""
        url = f"{self.base_url}/api/subscription/status"
        response = requests.get(
            url,
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to get subscription status: {response.status_code}")
            return None

    def test_subscription_endpoint_comprehensive(self):
        """Comprehensive test of subscription endpoint"""
        print("\n🔍 Testing Subscription Endpoint Comprehensively...")
        
        status = self.get_subscription_status()
        if not status:
            return False
        
        print("Subscription Status Response:")
        for key, value in status.items():
            print(f"  {key}: {value}")
        
        # Test required fields
        required_fields = [
            'is_subscribed', 'plan', 'daily_credits_remaining', 
            'daily_credits_total', 'upload_credits_remaining', 
            'upload_credits_total', 'resets_at'
        ]
        
        missing_fields = [field for field in required_fields if field not in status]
        if missing_fields:
            print(f"❌ Missing required fields: {missing_fields}")
            return False
        
        # Test field types and values
        checks = [
            (status['is_subscribed'], bool, "is_subscribed should be boolean"),
            (status['plan'], str, "plan should be string"),
            (status['daily_credits_remaining'], int, "daily_credits_remaining should be int"),
            (status['daily_credits_total'], int, "daily_credits_total should be int"),
            (status['upload_credits_remaining'], int, "upload_credits_remaining should be int"),
            (status['upload_credits_total'], int, "upload_credits_total should be int"),
        ]
        
        for value, expected_type, description in checks:
            if not isinstance(value, expected_type):
                print(f"❌ {description}, got {type(value)}")
                return False
        
        # Test free user values
        if status['is_subscribed'] == False:
            if status['plan'] != 'free':
                print(f"❌ Free user should have plan='free', got '{status['plan']}'")
                return False
            
            if status['daily_credits_total'] != 2:
                print(f"❌ Free user should have 2 daily credits total, got {status['daily_credits_total']}")
                return False
            
            if status['upload_credits_total'] != 2:
                print(f"❌ Free user should have 2 upload credits total, got {status['upload_credits_total']}")
                return False
            
            if status['daily_credits_remaining'] < 0 or status['daily_credits_remaining'] > 2:
                print(f"❌ Free user daily credits should be 0-2, got {status['daily_credits_remaining']}")
                return False
            
            if status['upload_credits_remaining'] < 0 or status['upload_credits_remaining'] > 2:
                print(f"❌ Free user upload credits should be 0-2, got {status['upload_credits_remaining']}")
                return False
        
        print("✅ All subscription endpoint checks passed")
        return True

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication Endpoints...")
        
        # Test /auth/me
        url = f"{self.base_url}/api/auth/me"
        response = requests.get(
            url,
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            user_data = response.json()
            required_fields = ['id', 'username', 'created_at']
            missing_fields = [field for field in required_fields if field not in user_data]
            
            if missing_fields:
                print(f"❌ Missing user fields: {missing_fields}")
                return False
            
            print(f"✅ User profile retrieved: {user_data['username']}")
        else:
            print(f"❌ Failed to get user profile: {response.status_code}")
            return False
        
        # Test invalid token
        url = f"{self.base_url}/api/auth/me"
        response = requests.get(
            url,
            headers={'Authorization': 'Bearer invalid_token', 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 401:
            print("✅ Invalid token properly rejected")
        else:
            print(f"❌ Invalid token should return 401, got {response.status_code}")
            return False
        
        return True

    def test_description_endpoints(self):
        """Test description CRUD without AI"""
        print("\n🔍 Testing Description CRUD...")
        
        # Create description
        desc_data = {
            "title": "Test Beat Description",
            "content": "This is a test description for a beat. Contact: test@example.com",
            "is_ai_generated": False
        }
        
        url = f"{self.base_url}/api/descriptions"
        response = requests.post(
            url,
            json=desc_data,
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to create description: {response.status_code}")
            return False
        
        desc = response.json()
        desc_id = desc['id']
        print(f"✅ Created description: {desc_id}")
        
        # Get descriptions
        url = f"{self.base_url}/api/descriptions"
        response = requests.get(
            url,
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to get descriptions: {response.status_code}")
            return False
        
        descriptions = response.json()
        if not any(d['id'] == desc_id for d in descriptions):
            print("❌ Created description not found in list")
            return False
        
        print("✅ Description found in list")
        
        # Update description
        update_data = {
            "title": "Updated Test Beat Description",
            "content": "This is an updated test description."
        }
        
        url = f"{self.base_url}/api/descriptions/{desc_id}"
        response = requests.put(
            url,
            json=update_data,
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to update description: {response.status_code}")
            return False
        
        print("✅ Description updated")
        
        # Delete description
        url = f"{self.base_url}/api/descriptions/{desc_id}"
        response = requests.delete(
            url,
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to delete description: {response.status_code}")
            return False
        
        print("✅ Description deleted")
        return True

    def test_youtube_connection_status(self):
        """Test YouTube connection status endpoint"""
        print("\n🔍 Testing YouTube Connection Status...")
        
        url = f"{self.base_url}/api/youtube/status"
        response = requests.get(
            url,
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            status = response.json()
            required_fields = ['connected']
            missing_fields = [field for field in required_fields if field not in status]
            
            if missing_fields:
                print(f"❌ Missing YouTube status fields: {missing_fields}")
                return False
            
            print(f"✅ YouTube status: connected={status['connected']}")
            return True
        else:
            print(f"❌ Failed to get YouTube status: {response.status_code}")
            return False

    def test_stripe_config_endpoint(self):
        """Test Stripe configuration endpoint"""
        print("\n🔍 Testing Stripe Configuration...")
        
        url = f"{self.base_url}/api/subscription/config"
        response = requests.get(
            url,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            config = response.json()
            if 'publishable_key' in config and 'price_id' in config:
                print("✅ Stripe configuration available")
                return True
            else:
                print("❌ Stripe configuration missing required fields")
                return False
        else:
            print(f"❌ Failed to get Stripe config: {response.status_code}")
            return False

    def run_core_tests(self):
        """Run all core functionality tests"""
        print("🚀 Starting Core Functionality Tests")
        print("=" * 60)
        
        if not self.create_test_user():
            return False
        
        tests = [
            self.test_subscription_endpoint_comprehensive,
            self.test_auth_endpoints,
            self.test_description_endpoints,
            self.test_youtube_connection_status,
            self.test_stripe_config_endpoint,
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
        
        print("\n" + "=" * 60)
        print(f"📊 Core Tests Results: {passed}/{total} passed")
        
        if passed == total:
            print("🎉 All Core Tests Passed!")
            return True
        else:
            print(f"⚠️ {total - passed} Core Tests Failed")
            return False

def main():
    tester = CoreFunctionalityTester()
    success = tester.run_core_tests()
    return 0 if success else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())