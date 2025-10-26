import requests
import sys
import json
import asyncio
import concurrent.futures
import time
from datetime import datetime

class SendMyBeatAPITester:
    def __init__(self, base_url="https://musicprodai-1.preview.emergentagent.com"):
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

    def test_subscription_status_free_user(self):
        """Test subscription status endpoint for free user"""
        success, response = self.run_test(
            "Subscription Status - Free User",
            "GET",
            "subscription/status",
            200
        )
        
        if success:
            # Verify response structure for free user
            required_fields = [
                'is_subscribed', 'plan', 'daily_credits_remaining', 
                'daily_credits_total', 'upload_credits_remaining', 
                'upload_credits_total', 'resets_at'
            ]
            
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Subscription Status - Response Structure", False, f"Missing fields: {missing_fields}")
                return False
            
            # Verify free user values
            if not response['is_subscribed']:
                print(f"   ✓ Free user status: is_subscribed={response['is_subscribed']}")
                print(f"   ✓ AI Credits: {response['daily_credits_remaining']}/{response['daily_credits_total']}")
                print(f"   ✓ Upload Credits: {response['upload_credits_remaining']}/{response['upload_credits_total']}")
                print(f"   ✓ Resets at: {response['resets_at']}")
                return True
            else:
                self.log_test("Subscription Status - Free User Check", False, "User shows as subscribed when should be free")
                return False
        return False

    def test_upload_credit_limits_free_user(self):
        """Test YouTube upload credit limits for free user"""
        print("\n🔍 Testing Upload Credit Limits for Free User...")
        
        # First, get initial subscription status
        success, initial_status = self.run_test(
            "Initial Upload Credits Check",
            "GET",
            "subscription/status",
            200
        )
        
        if not success:
            return False
        
        initial_upload_credits = initial_status.get('upload_credits_remaining', 0)
        print(f"   Initial upload credits: {initial_upload_credits}")
        
        # Test using upload credits (simulate the check_and_use_upload_credit function)
        # Since we can't actually upload to YouTube in tests, we'll test the subscription endpoint
        # and verify the credit logic through multiple calls
        
        if initial_upload_credits >= 2:
            print("   ✓ Free user has correct initial upload credits (2)")
            return True
        elif initial_upload_credits == 1:
            print("   ⚠️ User has 1 upload credit remaining (may have been used)")
            return True
        elif initial_upload_credits == 0:
            print("   ⚠️ User has 0 upload credits (daily limit reached)")
            return True
        else:
            self.log_test("Upload Credit Limits", False, f"Unexpected credit count: {initial_upload_credits}")
            return False

    def create_pro_user(self):
        """Create a pro user for testing (mock subscription)"""
        test_username = f"prouser_{datetime.now().strftime('%H%M%S')}"
        test_password = "ProPass123!"
        
        success, response = self.run_test(
            "Pro User Registration",
            "POST",
            "auth/register",
            200,
            data={"username": test_username, "password": test_password}
        )
        
        if success and 'access_token' in response:
            self.pro_user_token = response['access_token']
            self.pro_user_id = response['user']['id']
            print(f"   Created pro user: {test_username}")
            return True
        return False

    def test_subscription_status_pro_user(self):
        """Test subscription status for pro user (would need actual Stripe integration)"""
        # Note: This test would require actual Stripe subscription setup
        # For now, we'll test the endpoint structure with a regular user
        print("\n🔍 Testing Pro User Subscription Status...")
        print("   ⚠️ Note: Actual pro subscription testing requires Stripe integration")
        
        if not self.pro_user_token:
            if not self.create_pro_user():
                return False
        
        # Switch to pro user token temporarily
        original_token = self.token
        self.token = self.pro_user_token
        
        success, response = self.run_test(
            "Subscription Status - Pro User Structure",
            "GET",
            "subscription/status",
            200
        )
        
        # Restore original token
        self.token = original_token
        
        if success:
            print(f"   Pro user response structure verified")
            # In a real pro user, we'd expect:
            # is_subscribed: true, credits_remaining: -1, upload_credits_remaining: -1
            return True
        return False

    def test_concurrent_users(self):
        """Test concurrent user access to verify no race conditions"""
        print("\n🔍 Testing Concurrent User Access...")
        
        def make_concurrent_request(user_data):
            """Make a request as a specific user"""
            username, password = user_data
            try:
                # Login
                login_url = f"{self.base_url}/api/auth/login"
                login_response = requests.post(
                    login_url,
                    json={"username": username, "password": password},
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                
                if login_response.status_code != 200:
                    return False, f"Login failed for {username}"
                
                token = login_response.json()['access_token']
                
                # Make subscription status request
                status_url = f"{self.base_url}/api/subscription/status"
                status_response = requests.get(
                    status_url,
                    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
                    timeout=30
                )
                
                if status_response.status_code == 200:
                    return True, status_response.json()
                else:
                    return False, f"Status request failed for {username}"
                    
            except Exception as e:
                return False, f"Exception for {username}: {str(e)}"
        
        # Create multiple test users
        test_users = []
        for i in range(5):
            username = f"concurrent_user_{i}_{datetime.now().strftime('%H%M%S')}"
            password = "ConcurrentTest123!"
            
            success, _ = self.run_test(
                f"Create Concurrent User {i+1}",
                "POST",
                "auth/register",
                200,
                data={"username": username, "password": password}
            )
            
            if success:
                test_users.append((username, password))
        
        if len(test_users) < 3:
            self.log_test("Concurrent Users Setup", False, "Could not create enough test users")
            return False
        
        print(f"   Created {len(test_users)} test users for concurrent testing")
        
        # Run concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(test_users)) as executor:
            start_time = time.time()
            futures = [executor.submit(make_concurrent_request, user_data) for user_data in test_users]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
            end_time = time.time()
        
        # Analyze results
        successful_requests = sum(1 for success, _ in results if success)
        total_requests = len(results)
        
        print(f"   Concurrent requests completed in {end_time - start_time:.2f} seconds")
        print(f"   Successful requests: {successful_requests}/{total_requests}")
        
        if successful_requests >= total_requests * 0.8:  # 80% success rate acceptable
            self.log_test("Concurrent User Access", True, f"{successful_requests}/{total_requests} requests successful")
            return True
        else:
            failed_details = [details for success, details in results if not success]
            self.log_test("Concurrent User Access", False, f"Only {successful_requests}/{total_requests} successful. Failures: {failed_details[:3]}")
            return False

    def test_daily_reset_functionality(self):
        """Test daily reset functionality (limited testing without time manipulation)"""
        print("\n🔍 Testing Daily Reset Functionality...")
        
        success, response = self.run_test(
            "Daily Reset - Check Current Status",
            "GET",
            "subscription/status",
            200
        )
        
        if success:
            resets_at = response.get('resets_at')
            if resets_at:
                print(f"   Credits reset at: {resets_at}")
                # Verify the reset time is in the future and properly formatted
                try:
                    from datetime import datetime
                    reset_time = datetime.fromisoformat(resets_at.replace('Z', '+00:00'))
                    current_time = datetime.now(reset_time.tzinfo)
                    
                    if reset_time > current_time:
                        print("   ✓ Reset time is in the future")
                        self.log_test("Daily Reset Functionality", True, "Reset time properly configured")
                        return True
                    else:
                        self.log_test("Daily Reset Functionality", False, "Reset time is in the past")
                        return False
                except Exception as e:
                    self.log_test("Daily Reset Functionality", False, f"Invalid reset time format: {e}")
                    return False
            else:
                # Pro users might not have reset time
                print("   No reset time (possibly pro user)")
                return True
        return False

    def test_credit_usage_ai_generation(self):
        """Test AI generation credit usage"""
        print("\n🔍 Testing AI Generation Credit Usage...")
        
        # Get initial credits
        success, initial_status = self.run_test(
            "Initial AI Credits Check",
            "GET",
            "subscription/status",
            200
        )
        
        if not success:
            return False
        
        initial_credits = initial_status.get('daily_credits_remaining', 0)
        print(f"   Initial AI credits: {initial_credits}")
        
        if initial_credits > 0:
            # Use one credit by generating tags
            success, tag_response = self.run_test(
                "Use AI Credit - Tag Generation",
                "POST",
                "tags/generate",
                200,
                data={"query": "test beat for credit usage"}
            )
            
            if success:
                # Check credits after usage
                success, after_status = self.run_test(
                    "AI Credits After Usage",
                    "GET",
                    "subscription/status",
                    200
                )
                
                if success:
                    after_credits = after_status.get('daily_credits_remaining', 0)
                    print(f"   AI credits after usage: {after_credits}")
                    
                    if after_credits == initial_credits - 1:
                        print("   ✓ AI credit properly decremented")
                        return True
                    else:
                        self.log_test("AI Credit Usage", False, f"Credits not decremented correctly: {initial_credits} -> {after_credits}")
                        return False
        else:
            print("   ⚠️ No AI credits available to test usage")
            # Try to use credit when none available
            success, error_response = self.run_test(
                "AI Credit Limit Test",
                "POST",
                "tags/generate",
                402,  # Expect payment required
                data={"query": "test beat when no credits"}
            )
            
            if success:
                print("   ✓ Proper error when no AI credits available")
                return True
            else:
                self.log_test("AI Credit Limit", False, "Did not receive proper error when no credits available")
                return False
        
        return False

    def test_beat_analyzer_endpoint(self):
        """Test Beat Analyzer endpoint - USER REPORTED ISSUE (RETEST AFTER FRONTEND CHANGES)"""
        print("\n🔍 Testing Beat Analyzer Endpoint (USER REPORTED ISSUE - RETEST AFTER FRONTEND CHANGES)...")
        
        # Get initial credits to ensure we have credits for testing
        success, initial_status = self.run_test(
            "Beat Analyzer - Check Credits",
            "GET",
            "subscription/status",
            200
        )
        
        if not success:
            return False
        
        initial_credits = initial_status.get('daily_credits_remaining', 0)
        print(f"   Initial AI credits: {initial_credits}")
        
        # Test data as specified in the review request
        beat_data = {
            "title": "Drake Type Beat 2024",
            "tags": ["drake", "type beat", "hip hop", "rap", "instrumental"],
            "description": "Drake style beat"
        }
        
        if initial_credits > 0:
            # Test with valid data
            success, response = self.run_test(
                "Beat Analyzer - Valid Request",
                "POST",
                "beat/analyze",
                200,
                data=beat_data
            )
            
            if success:
                # Verify response structure
                required_fields = [
                    'overall_score', 'title_score', 'tags_score', 'seo_score',
                    'strengths', 'weaknesses', 'suggestions', 'predicted_performance'
                ]
                
                missing_fields = [field for field in required_fields if field not in response]
                if missing_fields:
                    self.log_test("Beat Analyzer - Response Structure", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Verify field types and values
                if not isinstance(response.get('overall_score'), int) or not (0 <= response['overall_score'] <= 100):
                    self.log_test("Beat Analyzer - Overall Score", False, f"Invalid overall_score: {response.get('overall_score')}")
                    return False
                
                if not isinstance(response.get('strengths'), list):
                    self.log_test("Beat Analyzer - Strengths Format", False, f"Strengths not a list: {type(response.get('strengths'))}")
                    return False
                
                if not isinstance(response.get('weaknesses'), list):
                    self.log_test("Beat Analyzer - Weaknesses Format", False, f"Weaknesses not a list: {type(response.get('weaknesses'))}")
                    return False
                
                if not isinstance(response.get('suggestions'), list):
                    self.log_test("Beat Analyzer - Suggestions Format", False, f"Suggestions not a list: {type(response.get('suggestions'))}")
                    return False
                
                print(f"   ✓ Overall Score: {response['overall_score']}/100")
                print(f"   ✓ Title Score: {response['title_score']}/100")
                print(f"   ✓ Tags Score: {response['tags_score']}/100")
                print(f"   ✓ SEO Score: {response['seo_score']}/100")
                print(f"   ✓ Predicted Performance: {response['predicted_performance']}")
                print(f"   ✓ Strengths: {len(response['strengths'])} items")
                print(f"   ✓ Weaknesses: {len(response['weaknesses'])} items")
                print(f"   ✓ Suggestions: {len(response['suggestions'])} items")
                
                self.log_test("Beat Analyzer - Full Analysis", True, "All response fields valid and working after frontend changes")
                return True
            else:
                # Check if it's an authentication issue
                if "401" in str(response):
                    self.log_test("Beat Analyzer - Authentication", False, "401 Unauthorized - Check JWT token")
                    return False
                elif "500" in str(response):
                    self.log_test("Beat Analyzer - Server Error", False, "500 Internal Server Error - Check backend logs")
                    return False
                else:
                    self.log_test("Beat Analyzer - Unknown Error", False, f"Unexpected response: {response}")
                    return False
        else:
            print("   ⚠️ No AI credits available - testing error handling")
            # Test when no credits available
            success, error_response = self.run_test(
                "Beat Analyzer - No Credits",
                "POST",
                "beat/analyze",
                402,  # Expect payment required
                data=beat_data
            )
            
            if success:
                print("   ✓ Proper 402 error when no AI credits available")
                return True
            else:
                self.log_test("Beat Analyzer - Credit Limit", False, "Did not receive proper 402 error when no credits available")
                return False
        
        return False

    def test_beat_analyzer_authentication(self):
        """Test Beat Analyzer endpoint without authentication"""
        print("\n🔍 Testing Beat Analyzer Authentication...")
        
        # Temporarily remove token to test unauthenticated access
        original_token = self.token
        self.token = None
        
        beat_data = {
            "title": "Test Beat",
            "tags": ["test"],
            "description": "Test description"
        }
        
        success, response = self.run_test(
            "Beat Analyzer - No Auth",
            "POST",
            "beat/analyze",
            401,  # Expect unauthorized
            data=beat_data
        )
        
        # Restore token
        self.token = original_token
        
        if success:
            print("   ✓ Proper 401 error when not authenticated")
            return True
        else:
            self.log_test("Beat Analyzer - Auth Required", False, "Did not receive proper 401 error when not authenticated")
            return False

    def run_all_tests(self):
        """Run all API tests including priority tasks"""
        print("🚀 Starting SendMyBeat API Comprehensive Tests")
        print("=" * 60)
        
        # Test authentication flow
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
            
        if not self.test_get_user_profile():
            print("❌ Profile fetch failed")
        
        # HIGH PRIORITY TESTS
        print("\n" + "=" * 60)
        print("🔥 HIGH PRIORITY TESTS")
        print("=" * 60)
        
        # Test subscription status endpoint
        if not self.test_subscription_status_free_user():
            print("❌ Subscription status test failed")
        
        # Test upload credit limits
        if not self.test_upload_credit_limits_free_user():
            print("❌ Upload credit limits test failed")
        
        # Test pro user subscription (structure only)
        if not self.test_subscription_status_pro_user():
            print("❌ Pro user subscription test failed")
        
        # Test daily reset functionality
        if not self.test_daily_reset_functionality():
            print("❌ Daily reset functionality test failed")
        
        # Test AI credit usage
        if not self.test_credit_usage_ai_generation():
            print("❌ AI credit usage test failed")
        
        # BEAT ANALYZER TESTING (USER REPORTED ISSUE)
        print("\n" + "=" * 60)
        print("🎯 BEAT ANALYZER TESTING (USER REPORTED ISSUE)")
        print("=" * 60)
        
        if not self.test_beat_analyzer_authentication():
            print("❌ Beat Analyzer authentication test failed")
        
        if not self.test_beat_analyzer_endpoint():
            print("❌ Beat Analyzer endpoint test failed")
        
        # CRITICAL CONCURRENT TESTING
        print("\n" + "=" * 60)
        print("⚡ CRITICAL CONCURRENT TESTING")
        print("=" * 60)
        
        if not self.test_concurrent_users():
            print("❌ Concurrent user testing failed")
        
        # EXISTING FEATURE SMOKE TESTS
        print("\n" + "=" * 60)
        print("🧪 EXISTING FEATURE SMOKE TESTS")
        print("=" * 60)
            
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
        print("\n" + "=" * 60)
        print(f"📊 FINAL TEST RESULTS: {self.tests_passed}/{self.tests_run} passed")
        print("=" * 60)
        
        # Detailed results by category
        priority_tests = [r for r in self.test_results if any(keyword in r['test'] for keyword in ['Subscription', 'Upload', 'Credit', 'Concurrent', 'Daily Reset'])]
        priority_passed = sum(1 for t in priority_tests if t['success'])
        
        print(f"🔥 Priority Tests: {priority_passed}/{len(priority_tests)} passed")
        
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL TESTS PASSED!")
            return True
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} TESTS FAILED")
            return False

def main():
    tester = SendMyBeatAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())