from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000/dashboard.html")
    time.sleep(5) # Wait for socket stats
    page.screenshot(path="verification/dashboard_termux.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
