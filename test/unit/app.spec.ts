import Client, { ClientOptions, SigninOptions } from '@/app';
import { Cookie } from 'puppeteer';

function mockCookie(opt: Partial<Cookie> = {}): Cookie {
  return {
    name: 'name',
    value: 'value',
    domain: 'http://domain.com',
    path: '/path',
    secure: false,
    httpOnly: true,
    expires: 0,
    sameSite: 'Lax',
    ...opt,
  };
}

function mockClient(opt: Partial<ClientOptions> = {}) {
  const p: number = global.PORT;
  const c = new Client({
    signinUrl: `http://localhost:${p}`,
    username: '.username',
    password: '.password',
    submit: '.submit',
    ...opt,
  });
  return c;
}

async function mockLaunchClient(opt: Partial<ClientOptions> = {}) {
  const c = mockClient(opt);
  await c.launch();
  return c;
}

describe('test main', async () => {
  const globalClient: Client = mockClient();

  beforeAll(async () => {
    await globalClient.launch();
  });

  afterAll(async () => {
    await globalClient.close();
    const server = global.SERVER;
    if (server) {
      await new Promise((res) => server.close(res));
    }
  });

  function setCookies(c: Client | Cookie, ...cookies: Cookie[]) {
    if (!!Reflect.get(c, '_cookies')) {
      Reflect.set(c, '_cookies', cookies);
      return;
    }
    Reflect.set(globalClient, '_cookies', [c, ...cookies]);
  }

  it('should lanch first', async () => {
    const client = mockClient();
    expect.assertions(1);
    try {
      client.getCookies();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('options is readnoly', () => {
    expect.assertions(1);
    try {
      globalClient.options = globalClient.options;
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('can setOptions and add event listener before launch', () => {
    const client = mockClient();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const oldOpt = client.options;
    const opt = { signinUrl: 'newUrl', password: 'pwd', username: 'name', submit: 'sub' };
    client.setOptions(opt);
    client.on('readySignin', cb1);
    client.on('beforeSubmit', cb2);

    expect(client.options).toEqual({ ...oldOpt, ...opt });
  });

  it('get empty array if no cookies', async () => {
    const client = await mockLaunchClient();
    expect(client.getCookies().length).toBe(0);
    expect(client.hasCookies()).toBeFalsy();
    await client.close();
  });

  it('warn if not signin success', async () => {
    const client = await mockLaunchClient();
    const fn = console.warn = jest.fn();
    await client.signin('', '', { jump: false });
    expect(fn).toBeCalled();
    expect(client.hasCookies()).toBeFalsy();
    await client.close();
  });

  it('option username add password can be string or function', async () => {
    const password = jest.fn();
    const username = jest.fn();
    const submit = jest.fn();
    const args: [string, string, SigninOptions] = ['username', 'password', { jump: false }];
    const client = await mockLaunchClient({
      password,
      username,
      submit,
    });
    await client.signin.apply(client, args);
    const page = Reflect.get(client, '_page');

    expect(username).toBeCalled();
    expect(username).toBeCalledWith(page, args[0]);
    expect(password).toBeCalled();
    expect(password).toBeCalledWith(page, args[1]);
    expect(submit).toBeCalled();
    expect(submit).toBeCalledWith(page);
    await client.close();
  });

  it('call event when signin', async () => {
    const client = await mockLaunchClient();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const cb3 = jest.fn();
    client.on('readySignin', cb1);
    client.on('beforeSubmit', cb2);
    client.on('beforeNavigation', cb3);
    const args = ['', '', { jump: false }];
    await client.signin.apply(client, args);
    const page = Reflect.get(client, '_page');

    expect(cb1).toBeCalled();
    expect(cb1).toBeCalledWith(page, args);
    expect(cb2).toBeCalled();
    expect(cb2).toBeCalledWith(page, args);
    expect(cb3).toBeCalled();
    expect(cb3).toBeCalledWith(page, args);
    await client.close();
  });

  it('register error event and it will handle All error', async () => {
    const client = mockClient({ signinUrl: '' });
    const errorCb = jest.fn();
    client.on('error', errorCb);
    client.getCookies();

    expect(errorCb).toBeCalled();
    const times = errorCb.mock.calls.length;

    await client.launch();
    await client.signin('', '', { jump: false });
    expect(errorCb).toHaveBeenCalledTimes(times + 1);
    await client.close();
  });

  describe('get cookie can use filter', async () => {
    const nowTime = Date.now();
    const cookie1: Cookie = {
      name: 'name1',
      value: 'value1',
      domain: 'http://d1.com',
      path: '/a',
      secure: true,
      httpOnly: false,
      expires: nowTime - 10000,
      sameSite: 'Strict',
    };
    const cookie2: Cookie = {
      name: 'name2',
      value: 'value2',
      domain: 'http://d2.com',
      path: '/a',
      secure: false,
      httpOnly: true,
      expires: nowTime + 1000000,
      sameSite: 'Lax',
    };
    const cookie3: Cookie = {
      name: 'name3',
      value: 'value3',
      domain: 'https://d2.com',
      path: '/b',
      secure: false,
      httpOnly: true,
      expires: nowTime + 1000000,
      sameSite: 'Lax',
    };
    const cookie4: Cookie = {
      name: 'name4',
      value: 'value4',
      domain: 'https://d1.com',
      path: '/b',
      secure: false,
      expires: nowTime - 10000,
      httpOnly: false,
      sameSite: 'Strict',
    };

    // tslint:disable-next-line:no-shadowed-variable
    const client = mockClient();
    const cookies: Cookie[] = [cookie1, cookie2, cookie3, cookie4];

    beforeAll(() => {
      Reflect.set(client, '_page', {});
      Reflect.set(client, '_browser', {});
      setCookies(client, ...cookies);
    });

    afterAll(async () => {
      await client.close();
    });

    it('default get all cookies', () => {
      expect(client.getCookies()).toEqual(cookies);
    });

    it('filter domain', () => {
      expect(client.getCookies({ domain: '.' })).toEqual(cookies);
      expect(client.getCookies({ domain: 'https' })).toEqual([cookie3, cookie4]);
    });

    it('filter path', () => {
      expect(client.getCookies({ path: '.' })).toEqual(cookies);
      expect(client.getCookies({ path: '/a' })).toEqual([cookie1, cookie2]);
    });

    it('filter httpOnly', () => {
      expect(client.getCookies({ httpOnly: 'all' })).toEqual(cookies);
      expect(client.getCookies({ httpOnly: true })).toEqual([cookie2, cookie3]);
      expect(client.getCookies({ httpOnly: false })).toEqual([cookie1, cookie4]);
    });

    it('filter secure', () => {
      expect(client.getCookies({ secure: 'all' })).toEqual(cookies);
      expect(client.getCookies({ secure: true })).toEqual([cookie1]);
      expect(client.getCookies({ secure: false })).toEqual([cookie2, cookie3, cookie4]);
    });

    it('filter expired', () => {
      expect(client.getCookies({ expired: 'all' })).toEqual(cookies);
      expect(client.getCookies({ expired: true })).toEqual([cookie1, cookie4]);
      expect(client.getCookies({ expired: false })).toEqual([cookie2, cookie3]);
    });
  });

  it('clear cookies remove all cookies', async () => {
    setCookies(mockCookie());
    expect(globalClient.hasCookies()).toBeTruthy();
    await globalClient.clearCookies();
    expect(globalClient.hasCookies()).toBeFalsy();
  });

  it('get cookie map', () => {
    const cookie1: Cookie = mockCookie({
      name: 'name1',
      value: 'value1',
    });
    const cookie2: Cookie = mockCookie({
      name: 'name2',
      value: 'value2',
    });
    setCookies(cookie1, cookie2);
    expect(globalClient.getCookiesMap()).toEqual({ name1: 'value1', name2: 'value2' });
  });

  it('serialization cookies', () => {
    const cookie1: Cookie = mockCookie({
      name: 'name1',
      value: 'value1',
    });
    const cookie2: Cookie = mockCookie({
      name: 'name2',
      value: '"value2"',
    });
    setCookies(cookie1, cookie2);

    expect(globalClient.toJson()).toBe(JSON.stringify({ name1: 'value1', name2: '"value2"' }));
    expect(globalClient.toString()).toBe('name1=value1; name2="value2"');
  });
});
