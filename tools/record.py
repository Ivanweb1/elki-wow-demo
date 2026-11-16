"""Record the 13-second ?demo=1 loop. Requires: pip install playwright; playwright install chromium."""
import argparse
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("url", help="Published URL or local http:// URL")
    parser.add_argument("--out", default="reel.webm")
    args = parser.parse_args()
    output = Path(args.out).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1,
            record_video_dir=str(output.parent),
            record_video_size={"width": 1440, "height": 900},
        )
        page = await context.new_page()
        url = args.url + ("&" if "?" in args.url else "?") + "demo=1"
        await page.goto(url, wait_until="networkidle")
        await page.wait_for_timeout(13500)
        video = page.video
        await context.close()
        await video.save_as(str(output))
        await browser.close()
    print(output)


if __name__ == "__main__":
    asyncio.run(main())
