let yargs = require('yargs').argv;
let logger = require('./util/logger');

const COMMANDS = [{
  name: 'version',
  description: "Shows the current version",
  runner: args => {
    console.log("DataFire v" + require('../package').version);
    return Promise.resolve();
  }
}, {
  name: 'serve',
  description: "Serve the DataFire project in the current directory",
  examples: ["datafire serve --port 3000"],
  runner: require('./commands/serve'),
  options: [{
    name: 'port',
    alias: 'p',
    description: "The port to use",
  }, {
    name: 'directory',
    alias: 'd',
    description: "Location of the DataFire project",
  }, {
    name: 'tasks',
    alias: 't',
    description: "Run tasks",
  }]
}, {
  name: 'list',
  description: "List integrations in the current project, or all available integrations if -a is used",
  examples: ["datafire list", "datafire list -a"],
  runner: require('./commands/list'),
  options: [{
    name: 'all',
    alias: 'a',
    description: "Show all available integrations",
  }, {
    name: 'query',
    alias: 'q',
    description: "Filter integrations by text",
  }]
}, {
  name: 'integrate [integrations..]',
  description: "Add an integration to the current project",
  examples: ["datafire integrate --rss https://www.reddit.com/.rss"],
  runner: require('./commands/integrate'),
  options: [{
    name: 'openapi',
    description: "The URL of an Open API JSON specification",
  }, {
    name: 'rss',
    description: "The URL of an RSS feed",
  }, {
    name: 'name',
    description: "An alias to use for the integration in this project",
  }, {
    name: 'save',
    description: "Save to package.json as a dependency",
  }]
}, {
  name: 'describe <action_or_integration>',
  description: "Show details for an integration or operation",
  examples: [
    "datafire describe hacker_news",
    "datafire describe hacker_news/getUser",
  ],
  runner: require('./commands/describe'),
  options: [{
    name: 'query',
    alias: 'q',
    description: "Filters for operations matching the query",
  }]
}, {
  name: 'authenticate <integration>',
  examples: ["datafire authenticate github"],
  description: "Store a set of credentials for a given integration",
  runner: require('./commands/authenticate'),
  check: argv => {
    if (!argv.alias) return true;
    return /^\w+$/.test(argv.alias) || "Alias can only contain letters, numbers, and _";
  },
  options: [{
    name: 'alias',
    alias: 'a',
    description: 'The alias of the account to edit',
  }, {
    name: 'client',
    description: "With generate_token, the account alias to use as the OAuth client",
  }]
}, {
  name: 'run <action>',
  description: "Run an action",
  runner: require('./commands/run'),
  examples: [
    "datafire run ./actions/doSomething.js",
    "datafire run hacker_news/getItem -i.itemID 8863",
    "datafire run github"
  ],
  options: [{
    name: 'input',
    alias: 'i',
    description: "Pass input to the action",
  }, {
    name: 'accounts',
    description: "Pass in credentials"
  }]
}]

let args = require('yargs')
           .option('v', {alias: 'verbose'})
           .global('v')
           .recommendCommands();

COMMANDS.forEach(cmd => {
  cmd.examples = cmd.examples || [];
  cmd.options = cmd.options || [];
  args = args.command(
        cmd.name,
        cmd.description,
        (yargs) => {
          cmd.options.forEach(o => {
            yargs.option(o.name, {
              alias: o.alias,
              describe: o.description,
              demand: o.required,
            })
          })
        },
        (args) => {
          if (args.action_or_integration) {
            let slash = args.action_or_integration.indexOf('/');
            if (slash === -1) {
              args.integration = args.action_or_integration;
            } else {
              args.action = args.action_or_integration;
            }
            delete args.action_or_integration;
          }
          cmd.runner(args)
            .then(_ => {
              if (cmd.name !== 'serve') {
                process.exit(0)
              }
            })
            .catch(e => {
              logger.logError(e.message);
              if (args.verbose) logger.logError(e.stack);
              process.exit(1);
            })
        });
  if (cmd.check) args = args.check(cmd.check);
  cmd.examples.forEach(ex => {
    args = args.example(cmd.name, ex);
  });
})

args = args.help('h').alias('h', 'help').strict().argv;
