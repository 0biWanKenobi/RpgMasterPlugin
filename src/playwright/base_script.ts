import { chromium } from "playwright";


async function test(): Promise<boolean> {

    const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    const contexts = browser.contexts();
    
    if(!contexts[0]) return false;
    
    const page = contexts[0].pages()[0];

    if(!page) return false;
    
    const title = await page.evaluate(() => document.title);
    const bodyText = await page.locator("body").innerText();
    
    console.log({ title, bodyText });
    return true;
}

test();
