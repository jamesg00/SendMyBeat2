#!/usr/bin/env python3
"""
Test credit exhaustion scenarios
"""
import requests
import json
from datetime import datetime

class CreditExhaustionTester:
    def __init__(self, base_url="https://musicprodai-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None

    def create_test_user(self):
        """Create a fresh test user"""
        test_username = f"exhaust_test_{datetime.now().strftime('%H%M%S%f')}"
        test_password = "ExhaustTest123!"
        
        url = f"{self.base_url}/api/auth/register"
        response = requests.post(
            url,
            json={"username": test_username, "password": test_password},
            headers={'Content-Type': 'application/json'},
            timeout=30
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
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to get subscription status: {response.status_code}")
            return None

    def use_ai_credit(self, query):
        """Use one AI credit"""
        url = f"{self.base_url}/api/tags/generate"
        response = requests.post(
            url,
            json={"query": query},
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=30
        )
        return response

    def test_credit_exhaustion(self):
        """Test exhausting all AI credits"""
        print("\n🔍 Testing AI Credit Exhaustion...")
        
        # Get initial status
        status = self.get_subscription_status()
        if not status:
            return False
        
        initial_credits = status['daily_credits_remaining']
        print(f"Initial AI credits: {initial_credits}")
        
        # Use all available credits
        for i in range(initial_credits):
            print(f"Using credit {i+1}/{initial_credits}...")
            response = self.use_ai_credit(f"test beat {i+1}")
            
            if response.status_code == 200:
                print(f"  ✅ Credit {i+1} used successfully")
            else:
                print(f"  ❌ Failed to use credit {i+1}: {response.status_code}")
                return False
        
        # Verify credits are exhausted
        status = self.get_subscription_status()
        if status and status['daily_credits_remaining'] == 0:
            print("✅ All AI credits exhausted")
        else:
            print(f"❌ Credits not properly exhausted: {status['daily_credits_remaining'] if status else 'unknown'}")
            return False
        
        # Try to use another credit (should fail with 402)
        print("Attempting to use credit when exhausted...")
        response = self.use_ai_credit("should fail")
        
        if response.status_code == 402:
            try:
                error_data = response.json()
                if 'detail' in error_data and 'message' in error_data['detail']:
                    print(f"✅ Proper 402 error received: {error_data['detail']['message']}")
                    return True
                else:
                    print(f"✅ 402 error received but format unexpected: {error_data}")
                    return True
            except:
                print("✅ 402 error received (could not parse JSON)")
                return True
        else:
            print(f"❌ Expected 402 error, got {response.status_code}")
            try:
                print(f"Response: {response.json()}")
            except:
                print(f"Response text: {response.text}")
            return False

    def test_description_refine_exhaustion(self):
        """Test description refine when credits exhausted"""
        print("\n🔍 Testing Description Refine with Exhausted Credits...")
        
        url = f"{self.base_url}/api/descriptions/refine"
        response = requests.post(
            url,
            json={"description": "Test description to refine"},
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 402:
            print("✅ Description refine properly blocked when no credits")
            return True
        else:
            print(f"❌ Description refine should be blocked, got {response.status_code}")
            return False

    def run_exhaustion_tests(self):
        """Run all credit exhaustion tests"""
        print("🚀 Starting Credit Exhaustion Tests")
        print("=" * 50)
        
        if not self.create_test_user():
            return False
        
        if not self.test_credit_exhaustion():
            return False
        
        if not self.test_description_refine_exhaustion():
            return False
        
        print("\n" + "=" * 50)
        print("🎉 Credit Exhaustion Tests Completed Successfully!")
        return True

def main():
    tester = CreditExhaustionTester()
    success = tester.run_exhaustion_tests()
    return 0 if success else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())