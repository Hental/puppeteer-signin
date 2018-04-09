import Client, { ClientOptions } from '@/app';
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
  return new Client({
    signinUrl: 'http://localhost',
    username: '',
    password: '',
    submit: '',
    ...opt,
  });
}

describe('test main', async () => {
  const client: Client = mockClient();

  beforeAll(async () => {
    await client.launch();
  });

  // beforeEach(async () => {
  //   const client: Client = new Client({
  //     signinUrl: 'http://localhost.com',
  //     username: '',
  //     password: '',
  //     submit: '',
  //   });
  //   await client.launch();
  //   return client;
  // });

  afterAll(async () => {
    await client.close();
  });

  function setCookies(...cookies: Cookie[]) {
    Reflect.set(client, '_cookies', cookies);
  }

  it('should lanch first', () => {
    const newClient = mockClient();
    expect.assertions(1);
    try {
      newClient.getCookies();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('get empty array if no cookies', () => {
    expect(client.getCookies().length).toBe(0);
    expect(client.hasCookies()).toBeFalsy();
  });

  it('warn if not signin success', async () => {
    const fn = console.warn = jest.fn();
    await client.signin('', '');
    expect(fn).toBeCalled();
    expect(client.hasCookies()).toBeFalsy();
  });

  it('option username add password can be string or function', async () => {
    const password = jest.fn();
    const username = jest.fn();
    const args: [string, string] = ['username', 'password'];
    client.setOptions({
      password,
      username,
    });
    await client.signin.apply(client, args);
    const page = Reflect.get(client, '_page');

    expect(username).toBeCalled();
    expect(password).toBeCalledWith(page, args[0]);
    expect(password).toBeCalled();
    expect(password).toBeCalledWith(page, args[1]);
  });

  it('call event when signin', async () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const cb3 = jest.fn();
    client.on('readySignin', cb1);
    client.on('beforeSubmit', cb2);
    client.on('beforeNavigation', cb3);
    await client.signin('', '');
    const page = Reflect.get(client, '_page');

    expect(cb1).toBeCalled();
    expect(cb1).toBeCalledWith(page);
    expect(cb2).toBeCalled();
    expect(cb2).toBeCalledWith(page);
    expect(cb3).toBeCalled();
    expect(cb3).toBeCalledWith(page);
  });

  it('register error event and it will handle All error', async () => {
    const newClient = mockClient({ signinUrl: '' });
    const errorCb = jest.fn();
    newClient.on('error', errorCb);
    newClient.getCookies();

    expect(errorCb).toBeCalled();
    const times = errorCb.mock.calls.length;

    await newClient.launch();
    await newClient.signin('', '');
    expect(errorCb).toHaveBeenCalledTimes(times + 1);
  });

  describe('get cookie can use filter', () => {
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

    const cookies: Cookie[] = [cookie1, cookie2, cookie3, cookie4];
    setCookies(...cookies);

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

  describe('clear cookies remove all cookies', async () => {
    setCookies(mockCookie());
    expect(client.hasCookies()).toBeTruthy();
    await client.clearCookies();
    expect(client.hasCookies()).toBeFalsy();
  });

  describe('get cookie map', () => {
    const cookie1: Cookie = mockCookie({
      name: 'name1',
      value: 'value1',
    });
    const cookie2: Cookie = mockCookie({
      name: 'name2',
      value: 'value2',
    });
    setCookies(cookie1, cookie2);
    expect(client.getCookiesMap()).toEqual({ name1: 'value1', name2: 'value2' });
  });

  describe('serialization cookies', () => {
    const cookie1: Cookie = mockCookie({
      name: 'name1',
      value: 'value1',
    });
    const cookie2: Cookie = mockCookie({
      name: 'name2',
      value: '"value2"',
    });
    setCookies(cookie1, cookie2);

    expect(client.toJson()).toBe(JSON.stringify({ name1: 'value1', name2: '"value2"' }));
    expect(client.toString()).toBe('name1=value1; name2="value2"');
  });
});
