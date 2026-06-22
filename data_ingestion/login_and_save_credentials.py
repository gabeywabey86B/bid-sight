from playwright.sync_api import sync_playwright
import json, time

LOGIN_URL = "https://boss.intranet.smu.edu.sg/OverallResults.aspx"

AUTH_FILE = "auth.json"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless = False)#headless means whether you can see the browser

        context = browser.new_context()
        page = context.new_page()

        page.goto(LOGIN_URL)

        print("\nBrowser window opened.")
        print("1. Log in manually (username, password, 2FA code).")
        print("2. Wait until you're fully on the logged-in page.")
        input("3. Then press Enter here to save the session...\n")


        context.storage_state(path=AUTH_FILE)
        print(f"Saved session to {AUTH_FILE}")

        browser.close()

if __name__ == "__main__":
    main()

