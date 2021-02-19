#!/usr/bin/env node

import { load, Message, Root } from 'protobufjs';
import * as path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import * as Handlebars from 'handlebars';
import * as descriptor from 'protobufjs/ext/descriptor';
import 'protobufjs/ext/descriptor';
import { protoc } from 'protoc';
import util from 'util';

const asyncProtoc = util.promisify(protoc);

Handlebars.registerHelper('lowercase', function (text: string) {
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
});

interface RootWithToDescriptor extends Root {
  toDescriptor(version: string): Protofile;
}

type Protofile = Message<descriptor.IFileDescriptorSet>;

async function run(): Promise<void> {
  const args = process.argv;
  args.splice(0, 2);
  const [protofilePath, ...tsProtoOpts] = args;

  if (!protofilePath) {
    throw new Error('Provide the path to a service.proto file');
  }

  const fileParts = path.parse(protofilePath);
  if (fileParts.ext !== '.proto') {
    throw new Error('Path must point to a .proto file');
  }

  await asyncProtoc(
    [
      '--plugin=./node_modules/.bin/protoc-gen-ts_proto',
      `--ts_proto_out=.`,
      ...tsProtoOpts,
      '--ts_proto_opt=lowerCaseServiceMethods=false',
      protofilePath,
    ],
    {},
  );

  const root = await load(protofilePath);
  root.resolveAll();
  const descriptor = (root as RootWithToDescriptor).toDescriptor('proto3');
  const service = root.lookupService(getServiceName(descriptor));
  const namespace = service.fullName.split('.').slice(1, -1).join('.');
  const shortNamespace = namespace.split('.').slice(-1);

  const templateContext = {
    methods: service.methods,
    service: service.name,
    namespace,
    shortNamespace,
    protoFilename: fileParts.name,
  };

  await generateServer(`${fileParts.dir}/server.ts`, templateContext);
  await generateClient(`${fileParts.dir}/client.ts`, templateContext);
  await generateIndex(`${fileParts.dir}/index.ts`, templateContext);
}

function generateIndex(indexPath: string, templateContext: unknown): void {
  const template = readFileSync(path.join(__dirname, 'index.hbs'), 'utf8');
  const hbsTemplate = Handlebars.compile(template);
  const tsOutput = hbsTemplate(templateContext);
  writeFileSync(indexPath, tsOutput);
}

async function generateServer(tsServerPath: string, templateContext: unknown): Promise<void> {
  const template = readFileSync(path.join(__dirname, 'server.hbs'), 'utf8');
  const hbsTemplate = Handlebars.compile(template);
  const tsOutput = hbsTemplate(templateContext);
  writeFileSync(tsServerPath, tsOutput);
}

async function generateClient(tsClientPath: string, templateContext: unknown): Promise<void> {
  const template = readFileSync(path.join(__dirname, 'client.hbs'), 'utf8');
  const hbsTemplate = Handlebars.compile(template);
  const tsOutput = hbsTemplate(templateContext);
  writeFileSync(tsClientPath, tsOutput);
}

function getServiceName(protofile: Protofile): string {
  return protofile.toJSON().file[0].service[0].name;
}

run();