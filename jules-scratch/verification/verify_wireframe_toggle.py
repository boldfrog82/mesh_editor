
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://127.0.0.1:5000")
        # Wait for the canvas to be ready, which is a better indicator
        # that the scene has loaded than waiting for the loading div to disappear.
        await page.wait_for_selector("#viewer canvas")
        await page.screenshot(path="jules-scratch/verification/wireframe_on.png")
        await page.click("#toggle-wireframe")
        await page.screenshot(path="jules-scratch/verification/wireframe_off.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
