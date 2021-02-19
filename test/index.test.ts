import { AsyncServer } from './async-server';
import fetch from 'node-fetch';

import {
  createHaberdasherProtobufClient,
  createHaberdasherHandler,
  haberdasherPathPrefix,
  createHaberdasherJSONClient,
  Haberdasher,
  Size,
} from './index';

let protobufClient: Haberdasher;
let jsonClient: Haberdasher;
let server: AsyncServer;

beforeAll(async () => {
  server = await new AsyncServer().listen();

  protobufClient = createHaberdasherProtobufClient({
    host: 'localhost',
    port: 8000,
  });

  jsonClient = createHaberdasherJSONClient({
    host: 'localhost',
    port: 8000,
  });
});

afterAll(async () => {
  await server.close();
});

test('Handling a Twirp protobuf call', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    },
  });

  const response = await protobufClient.MakeHat({
    inches: 42,
  });

  expect(response).toEqual({
    size: 42,
    name: 'fancy hat',
    color: 'red',
  });
});

test('Handling a Twirp JSON call', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    },
  });

  const response = await jsonClient.MakeHat({
    inches: 42,
  });

  expect(response).toEqual({
    size: 42,
    name: 'fancy hat',
    color: 'red',
  });
});

test('Protobuf error is returned as JSON', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(/* size: Size */) {
      throw new Error('thrown!');
    },
  });

  const request = protobufClient.MakeHat({
    inches: 42,
  });

  await expect(request).rejects.toEqual(
    expect.objectContaining({
      message: 'thrown!',
      name: 'internal',
    }),
  );
});

test('Missing route returns 404', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    },
  });

  const response = await fetch(`http://localhost:8000${haberdasherPathPrefix}MakePants`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  expect(response.status).toEqual(404);
  expect(response.headers.get('content-type')).toEqual('application/json');
  const body = JSON.parse(await response.text());
  expect(body).toEqual({
    code: 'bad_route',
    msg: `no handler for path ${haberdasherPathPrefix}MakePants`,
  });
});

test('Unknown content type returns 404', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    },
  });

  const response = await fetch(`http://localhost:8000${haberdasherPathPrefix}MakeHat`, {
    body: JSON.stringify({
      inches: 42,
    }),
    headers: {
      'Content-Type': 'image/png',
    },
    method: 'POST',
  });

  expect(response.status).toEqual(404);
  expect(response.headers.get('content-type')).toEqual('application/json');
  const body = JSON.parse(await response.text());
  expect(body).toEqual({
    code: 'bad_route',
    msg: 'unexpected Content-Type: image/png',
  });
});

test('Non POST verb returns 404', async () => {
  server.handler = createHaberdasherHandler({
    makeHat(size: Size) {
      return {
        color: 'red',
        name: 'fancy hat',
        size: size.inches,
      };
    },
  });

  const response = await fetch(`http://localhost:8000${haberdasherPathPrefix}MakeHat`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'GET',
  });

  expect(response.status).toEqual(404);
  expect(response.headers.get('content-type')).toEqual('application/json');
  const body = JSON.parse(await response.text());
  expect(body).toEqual({
    code: 'bad_route',
    msg: 'unsupported method GET (only POST is allowed)',
  });
});

test('exposing the path prefix', async () => {
  expect(haberdasherPathPrefix).toBe('/twirp/twitch.twirp.example.Haberdasher/');
});
