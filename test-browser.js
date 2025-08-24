#!/usr/bin/env node

const puppeteer = require('puppeteer');

const args = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-web-security',
  '--disable-extensions',
  '--disable-plugins',
  '--disable-sync',
  '--disable-translate',
  '--disable-default-apps',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--disable-client-side-phishing-detection',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-zygote',
  '--memory-pressure-off',
  '--max-old-space-size=256',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=TranslateUI',
  '--disable-features=VizDisplayCompositor'
];

async function testBrowser() {
  console.log('Testing browser launch...');
  console.log('Timeout: 60000ms');
  console.log('Protocol timeout: 120000ms');
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: args,
      timeout: 60000,
      protocolTimeout: 120000,
      // pipe: true,  // Disable pipe mode for testing
      // slowMo: 100
    });

    console.log('✅ Browser launched successfully!');
    
    const page = await browser.newPage();
    await page.goto('data:text/html,<h1>Test</h1>');
    console.log('✅ Page created and navigated successfully!');
    
    const title = await page.title();
    console.log(`✅ Page title: ${title}`);
    
    await browser.close();
    console.log('✅ Browser closed successfully!');
    
  } catch (error) {
    console.error('❌ Browser test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testBrowser();
