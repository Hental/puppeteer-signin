# puppeteer-signin

use puppeteer to sign in and get cookies

## example

```js
import Client from 'puppeteer-signin';

const client = new Client({
  signinUrl: 'http://example/path/to/signin',
  username: 'selector',
  password: 'selector',
  submit: 'selector',
});

(async function main(){
  await client.launch(); // must launch first
  await client.signin('username', 'password');
  const cookies = client.getCookies();
  await client.close(); // should close it if you won't use
  console.log(cookies);
})()
```

## api
