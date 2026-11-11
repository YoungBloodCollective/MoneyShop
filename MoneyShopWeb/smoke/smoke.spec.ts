import { expect, test } from '@playwright/test'

const routes = ['/', '/auth/login', '/auth/register', '/auth/otp-login', '/acord', '/despre', '/verifica-broker', '/legal']

const ignored = /Failed to load resource|net::ERR_|favicon|ERR_NAME_NOT_RESOLVED|blocked by CORS policy|the server responded with a status of (401|403|404)/i

for (const route of routes) {
  test(`renders ${route} without errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => {
      if (!ignored.test(err.message)) errors.push(`pageerror: ${err.message}`)
    })
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !ignored.test(msg.text())) errors.push(`console.error: ${msg.text()}`)
    })
    await page.goto(route, { waitUntil: 'networkidle', timeout: 15_000 }).catch(() => page.goto(route, { waitUntil: 'load' }))
    await page.waitForTimeout(1000)
    expect(errors, errors.join('\n')).toEqual([])
    expect(await page.locator('#root > *').count()).toBeGreaterThan(0)
    const text = await page.evaluate(() => document.body.innerText.trim().length)
    expect(text).toBeGreaterThan(50)
    if (route === '/auth/login') {
      await expect(page.getByRole('button', { name: /Autentificare/ }).first()).toBeVisible()
    }
  })
}
