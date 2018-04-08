import puppeteer from 'puppeteer';

class Client {
    constructor(options) {
        this._initOption(options)
        this.lanch()
    }

    _initOption(opt = {}) {
        const defOptions = {
            debug: false,
            signinUri: '',
            onSignIn: () => {},
            username: {
                selector: '',
                val: '',
            },
            password: {
                selector: '',
                val: '',
            },
            submit: {
                selector: '',
            },
        }

        this.options = {
            ...defOptions,
            ...opt,
        }
    }

    setOptions(opt = {}) {
        this.options = {
            ...this.options,
            ...opt,
        }
    }

    async lanch() {
        const opt = this.options
        this._browser = await puppeteer.launch({ headless: !opt.debug })
        this._page = await this._browser.newPage()
    }

    async signin() {
        const opt = this.options
        const page = this._page
        const mockSignin = async () => {
            try {
                const { username, password, submit } = opt
                const usernameInput = await page.$(username.selector)
                const pwdInput = await page.$(password.selector)
                const btn = await page.$(submit.selector)

                await usernameInput.click()
                await usernameInput.type(username.val)
                await pwdInput.click()
                await pwdInput.type(password.val)
                await opt.onSignIn(this._page)
                await btn.click()
                await page.waitForNavigation()
            } catch (error) {
                console.error('mock signin errror.', error);
                await this._page.screenshot({
                    path: './signin.png',
                    fullPage: true,
                    type: 'png',
                })
            }
        }

        return new Promise(async (res, rej) => {
            page.on('load', async () => {
                await mockSignin()
                res()
            })
            page.on('error', e => rej(e))
            await page.goto(opt.signinUri)
        })
    }

    async getCookies() {
        const cookieList = await this._page.cookies()
        const cookies = cookieList.reduce((prev, cur) => {
            prev[cur.name] = cur.value
            return prev
        }, {})
        return cookies
    }

    async getOriginCookies() {
        return this._page.cookies()
    }

    async close() {
        await this._page.close()
        await this._browser.close()
    }
}

export default Client;
