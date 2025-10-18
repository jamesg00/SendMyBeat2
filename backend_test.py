import requests
import sys
import json
import asyncio
import concurrent.futures
import time
from datetime import datetime

class SendMyBeatAPITester:
    def __init__(self, base_url="https://tag-genius-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.pro_user_token = None
        self.pro_user_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        test_username = f"testuser_{datetime.now().strftime('%H%M%S')}"
        test_password = "TestPass123!"
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"username": test_username, "password": test_password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing user"""
        # First register a user
        test_username = f"logintest_{datetime.now().strftime('%H%M%S')}"
        test_password = "TestPass123!"
        
        # Register
        success, _ = self.run_test(
            "Register for Login Test",
            "POST",
            "auth/register",
            200,
            data={"username": test_username, "password": test_password}
        )
        
        if not success:
            return False
            
        # Now test login
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"username": test_username, "password": test_password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_tag_generation(self):
        """Test AI tag generation"""
        success, response = self.run_test(
            "Generate Tags",
            "POST",
            "tags/generate",
            200,
            data={"query": "lil uzi type beat"}
        )
        
        if success and 'tags' in response:
            tags_count = len(response['tags'])
            print(f"   Generated {tags_count} tags")
            if tags_count > 0:
                return True
        return False

    def test_tag_history(self):
        """Test getting tag history"""
        success, response = self.run_test(
            "Get Tag History",
            "GET",
            "tags/history",
            200
        )
        return success

    def test_description_crud(self):
        """Test description CRUD operations"""
        # Create description
        desc_data = {
            "title": "Test Description",
            "content": "This is a test description for a beat.",
            "is_ai_generated": False
        }
        
        success, response = self.run_test(
            "Create Description",
            "POST",
            "descriptions",
            200,
            data=desc_data
        )
        
        if not success:
            return False
            
        desc_id = response.get('id')
        if not desc_id:
            self.log_test("Create Description - Get ID", False, "No ID returned")
            return False
        
        # Get descriptions
        success, _ = self.run_test(
            "Get Descriptions",
            "GET",
            "descriptions",
            200
        )
        
        if not success:
            return False
        
        # Update description
        update_data = {
            "title": "Updated Test Description",
            "content": "This is an updated test description."
        }
        
        success, _ = self.run_test(
            "Update Description",
            "PUT",
            f"descriptions/{desc_id}",
            200,
            data=update_data
        )
        
        if not success:
            return False
        
        # Delete description
        success, _ = self.run_test(
            "Delete Description",
            "DELETE",
            f"descriptions/{desc_id}",
            200
        )
        
        return success

    def test_ai_refine_description(self):
        """Test AI description refinement"""
        success, response = self.run_test(
            "AI Refine Description",
            "POST",
            "descriptions/refine",
            200,
            data={"description": "This is a basic beat description that needs improvement."}
        )
        
        if success and 'refined_description' in response:
            print(f"   Refined description length: {len(response['refined_description'])}")
            return True
        return False

    def test_ai_generate_description(self):
        """Test AI description generation"""
        beat_data = {
            "email": "producer@example.com",
            "socials": "@producer",
            "key": "C minor",
            "bpm": "140",
            "prices": "$30 lease, $100 exclusive",
            "additional_info": "Dark trap beat"
        }
        
        success, response = self.run_test(
            "AI Generate Description",
            "POST",
            "descriptions/generate",
            200,
            data=beat_data
        )
        
        if success and 'generated_description' in response:
            print(f"   Generated description length: {len(response['generated_description'])}")
            return True
        return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting SendMyBeat API Tests")
        print("=" * 50)
        
        # Test authentication flow
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
            
        if not self.test_get_user_profile():
            print("❌ Profile fetch failed")
            
        # Test tag generation
        if not self.test_tag_generation():
            print("❌ Tag generation failed")
            
        if not self.test_tag_history():
            print("❌ Tag history failed")
            
        # Test description features
        if not self.test_description_crud():
            print("❌ Description CRUD failed")
            
        if not self.test_ai_refine_description():
            print("❌ AI refine failed")
            
        if not self.test_ai_generate_description():
            print("❌ AI generate failed")
        
        # Test login separately
        if not self.test_user_login():
            print("❌ Login test failed")
        
        # Print final results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            return False

def main():
    tester = SendMyBeatAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())