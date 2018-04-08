const Client = require('./app')
const http = require('http')
const cfg = require('./config')

const options = {
    debug: true,
    signinUri: 'https://www.zhihu.com/signin',
    username: {
        selector: 'input[name="username"]',
        val: 't181x@163.com',
    },
    password: {
        selector: 'input[name="password"]',
        val: 'Lt159357',
    },
    submit: {
        selector: '.SignFlow-submitButton',
    },
}

async function testApp() {
    const client = new Client(options)
    await client.signin()
    const cookies = await client.getCookies()
    const orCookies = await client.getOriginCookies()
    console.log(cookies)
    console.log(orCookies);
    // await client.close()
    process.on('uncaughtException', async () => {
        await client.close()
    })
}

async function testServer() {
    const data = await new Promise((res, rej) => {
        const req = http.request(
            {
                method: 'post',
                port: cfg.port,
                protocol: 'http:',
                host: '127.0.0.1',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            (r) => {
                r.setEncoding('utf-8')
                r.on('data', (chunk) => {
                    console.log('response: ', chunk);
                    res(chunk)
                })
                r.on('error', err => rej(err))
            },
        )
        req.write(JSON.stringify(options))
        req.end()
    })
    const cookies = JSON.parse(data)
    console.log(cookies)
}

if (process.argv[1] === __filename) {
    // testApp()
    testServer()
}
