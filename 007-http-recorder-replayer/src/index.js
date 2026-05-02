#!/usr/bin/env node

const CLI = require('./cli/cli');

const cli = new CLI();
cli.run(process.argv);
