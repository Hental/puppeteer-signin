import * as http from 'http';

declare global {
  namespace NodeJS {
    interface Global {
      SERVER?: http.Server;
      PORT: number;
    }
  }
}

async function mockServer() {
  let server;
  let port = 12345;
  do {
    try {
      await new Promise((res, rej) => {
        server = http.createServer((request, response) => {
          response.end('test html, request:', request.url);
        });
        server.on('error', rej);
        server.on('listening', res);
        server.on('connection', res);
        server.listen(port);
      });
    } catch {
      port += 1;
      server = undefined;
    }
  } while (!server);
  (global as any).PORT = port;
  (global as any).SERVER = server;
  // tslint:disable-next-line:no-console
  console.log('server lanuch success, host: ', `http://localhost:${port}`);
  return server;
}

async function main() {
  await mockServer();
}

main();
