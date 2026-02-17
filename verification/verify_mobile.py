import os
import time
from playwright.sync_api import sync_playwright

SERVER_URL = "http://localhost:45967"
SCREENSHOT_PATH = "verification/mobile_upload_studio.png"

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
        is_mobile=True,
        has_touch=True
    )

    context.add_init_script("""
        localStorage.setItem('token', 'fake-token');
    """)

    page = context.new_page()

    # Mock API requests
    def handle_upload(route):
        route.fulfill(status=200, json={"file_id": "mock_file_123", "message": "Uploaded"})

    page.route("**/auth/me", lambda r: r.fulfill(status=200, json={"username": "TestUser", "id": 1}))
    page.route("**/descriptions", lambda r: r.fulfill(status=200, json=[]))
    page.route("**/tags/history", lambda r: r.fulfill(status=200, json=[]))
    page.route("**/youtube/status", lambda r: r.fulfill(status=200, json={"connected": True}))
    page.route("**/subscription/status", lambda r: r.fulfill(status=200, json={"is_subscribed": True}))
    page.route("**/growth/status", lambda r: r.fulfill(status=200, json={}))
    page.route("**/youtube/analytics", lambda r: r.fulfill(status=200, json={}))

    page.route("**/upload/audio", handle_upload)
    page.route("**/upload/image", handle_upload)

    print(f"Navigating to {SERVER_URL}/dashboard")
    page.goto(f"{SERVER_URL}/dashboard")
    page.wait_for_timeout(3000)

    print("Clicking Upload Tab...")
    next_btn = page.locator('button[aria-label="Next tab"]')
    if next_btn.is_visible():
         print("Mobile navigation detected.")
         next_btn.click()
         page.wait_for_timeout(500)
         next_btn.click()
         page.wait_for_timeout(500)
    else:
         print("Mobile navigation NOT detected, looking for desktop tab...")
         page.click('[data-testid="upload-tab"]')

    print("Uploading files...")
    with open("verification/test.mp3", "wb") as f:
        f.write(b"dummy audio content")
    with open("verification/test.png", "wb") as f:
        f.write(b"dummy image content")

    print("Setting audio file...")
    page.wait_for_selector("#audio-input", state="attached")
    page.set_input_files("#audio-input", "verification/test.mp3")
    page.wait_for_timeout(1000)

    print("Setting image file...")
    page.set_input_files("#image-input", "verification/test.png")
    page.wait_for_timeout(2000)

    # Check if studio is already open
    if page.is_visible("text=Upload Studio"):
        print("Studio opened automatically!")
    else:
        print("Clicking Enter Studio...")
        enter_btn = page.get_by_text("Enter Studio")
        enter_btn.click()

    print("Waiting for studio overlay...")
    page.wait_for_selector("text=Upload Studio")
    page.wait_for_timeout(2000)

    print("Verifying studio elements...")
    assert page.is_visible("text=Upload Studio")
    assert page.is_visible("text=Video Metadata")

    img = page.locator("img[alt='preview']")
    assert img.is_visible()

    print("Scrolling controls...")
    controls_section = page.locator(".overflow-y-auto").last
    controls_section.scroll_into_view_if_needed()
    page.mouse.wheel(0, 500)
    page.wait_for_timeout(1000)

    print(f"Taking screenshot to {SCREENSHOT_PATH}")
    page.screenshot(path=SCREENSHOT_PATH, full_page=False)

    context.close()
    browser.close()

with sync_playwright() as p:
    run(p)
