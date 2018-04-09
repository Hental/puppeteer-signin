import puppeteer, { Browser, Page, Cookie } from 'puppeteer';

type InputCallback = (page: Page, value: string) => void;
type InputConfig = string | InputCallback;

interface ClientOptions {
  debug?: boolean;
  signinUrl: string;
  username: InputConfig;
  password: InputConfig;
  submit: InputConfig;
}

interface EventsMap {
  beforeSubmit?(page: Page, options?: any): void;
  beforeNavigation?(page: Page, options?: any): void;
  ready?(page: Page, options?: any): void;
  error?(e: Error): void;
}

interface CookieFilter {
  domain?: string;
  path?: string;
  expired?: boolean | 'all';
  httpOnly?: boolean | 'all';
  secure?: boolean | 'all';
}

function hasContent(arr?: any[]) {
  return arr && arr.length > 0;
}

// tslint:disable-next-line:ban-types
function callable(fn: any): fn is Function {
  return typeof fn === 'function';
}

function warn(type: string, ...msgs: any[]) {
  console.warn(`[warning ${type}]`, ...msgs);
}

class Client {
  public options !: ClientOptions;

  private _browser !: Browser;
  private _page !: Page;
  private _cookies: Cookie[] = [];
  private _events: EventsMap = {};

  constructor(options: ClientOptions) {
    this._initOption(options);
    this._lanch();
  }

  public setOptions(opt: ClientOptions) {
    this.options = {
      ...this.options,
      ...opt,
    };
  }

  public on<T extends keyof EventsMap>(eventname: T, cb: EventsMap[T]) {
    this._events[eventname] = cb;
  }

  public async signin(username: string, password: string, options?: object) {
    const opt = this.options;
    const page = this._page;
    const mockSignin = async () => {
      await this._emit('ready', page, options);
      await this._callInput(page, opt.username, username);
      await this._callInput(page, opt.password, password);
      await this._emit('beforeSubmit', page, options);
      await this._callSubmit(page, opt.submit);
      await this._emit('beforeNavigation', page, options);
      await page.waitForNavigation();
    };

    return new Promise(async (res, rej) => {
      const handler = (err: Error) => this._handleError(err, rej);

      page.on('load', async () => {
        try {
          await mockSignin();
          res(this.getCookiesMap());
        } catch (error) {
          handler(error);
        }
      });
      page.on('error', handler);
      await page.goto(opt.signinUrl);
    });
  }

  public async getCookiesMap(): Promise<{ [key: string]: string | undefined }> {
    const cookieList = await this.getCookies();
    const cookies = cookieList.reduce((prev: any, cur) => {
      prev[cur.name] = cur.value;
      return prev;
    }, {});
    return cookies;
  }

  public async getCookies({
    domain = '.',
    path = '.',
    expired = 'all',
    httpOnly = 'all',
    secure = 'all',
  }: CookieFilter = {}): Promise<Cookie[]> {
    const cookies = await this._getCookies();
    const regDomain = new RegExp(domain);
    const refPath = new RegExp(path);
    const nowTime = Date.now();

    return cookies.filter((c) => (
      regDomain.test(c.domain) &&
      refPath.test(c.path) &&
      (httpOnly === 'all' ? true : c.httpOnly === httpOnly) &&
      (secure === 'all' ? true : c.secure === secure) &&
      expired === 'all' ? true : c.expires < nowTime === expired
    ));
  }

  public async toJson() {
    const map = await this.getCookiesMap();
    return JSON.stringify(map);
  }

  public toString(): string {
    const cookies = this._cookies;
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  }

  public async close() {
    await this._page.close();
    await this._browser.close();
  }

  private async _getCookies(): Promise<Cookie[]> {
    if (!hasContent(this._cookies)) {
      const cookies = await this._page.cookies();
      if (hasContent(cookies)) {
        this._cookies = cookies;
      } else {
        warn('get cookies', 'please signin first.');
        return [];
      }
    }
    return this._cookies;
  }

  private _initOption(opt: ClientOptions) {
    const defOptions = {
      debug: false,
    };

    this.options = {
      ...defOptions,
      ...opt,
    };
  }

  private async _lanch() {
    const opt = this.options;
    this._browser = await puppeteer.launch({ headless: !opt.debug });
    this._page = await this._browser.newPage();
  }

  private async _callInput(page: Page, cfg: InputConfig, val: string) {
    if (callable(cfg)) {
      cfg.call(null, page, val);
    } else {
      const el = await page.$(cfg);
      if (el) {
        el.type(val, { delay: 1 });
      } else {
        warn('input type', 'can\'t find input element', cfg, page);
      }
    }
  }

  private async _callSubmit(page: Page, cfg: InputConfig) {
    if (callable(cfg)) {
      cfg.call(null, page);
    } else {
      const el = await page.$(cfg);
      if (el) {
        el.click({ delay: 1 });
      } else {
        warn('submit', 'can\'t find submit button element', cfg, page);
      }
    }
  }

  private async _emit(name: keyof EventsMap, ...args: any[]) {
    const fn = this._events[name];
    if (callable(fn)) {
      await fn.apply(this, args);
    }
  }

  private _handleError(err: Error, cb?: (e: Error) => void) {
    const handler = this._events.error;
    if (callable(handler)) {
      handler(err);
    } else if (callable(cb)) {
      cb(err);
    } else {
      throw err;
    }
  }
}

export default Client;
