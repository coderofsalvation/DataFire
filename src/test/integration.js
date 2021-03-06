"use strict";
let expect = require('chai').expect;
let datafire = require('../entry');

let echo = new datafire.Action({
  handler: (input, context) => {
    return context.request;
  }
})

let project = new datafire.Project({
  paths: {
    '/hello': {
      get: {
        action: echo,
      }
    },
    '/bye/{name}': {
      post: {
        action: echo,
      }
    }
  }
})

let integration = datafire.Integration.fromOpenAPI({
  host: 'localhost:3333',
  swagger: '2.0',
  info: {version: '1.0'},
  schemes: ['http'],
  paths: {
    '/hello': {
      get: {
        responses: {
          200: {
            description: "OK"
          }
        },
        parameters: [{
          name: 'name',
          in: 'query',
          type: 'string',
        }, {
          name: 'head',
          in: 'header',
          type: 'string',
        }]
      },
    },
    '/bye/{name}': {
      post: {
        responses: {
          200: {
            description: "OK"
          }
        },
        parameters: [{
          name: 'name',
          in: 'path',
          required: true,
          type: 'string',
        }, {
          name: 'body',
          in: 'body',
          schema: {
            properties: {
              bar: {type: 'string'},
            }
          }
        }]
      }
    }
  }
})

describe('Integration', () => {

  before(() => {
    return project.serve(3333)
  })

  after(() => {
    project.server.close();
  })

  it("should build from OpenAPI", () => {
    expect(integration instanceof datafire.Integration).to.equal(true);
    expect(Object.keys(integration.actions).length).to.equal(2);
    let action = integration.actions.hello.get.action;
    expect(action instanceof datafire.Action).to.equal(true);
  });

  it("should pass query parameters", () => {
    return integration.actions.hello.get({name: 'world'})
      .then(data => {
        expect(data.query).to.deep.equal({name: 'world'});
      })
  });

  it("should pass header parameters", () => {
    return integration.actions.hello.get({head: 'foo'})
      .then(data => {
        expect(data.headers.head).to.equal('foo');
      })
  });

  it("should pass body parameter", () => {
    return integration.actions.bye.name.post({
      name: 'foo',
      body: {'bar': 'baz'},
    }).then(data => {
      expect(data.path).to.equal('/bye/foo');
      expect(data.body).to.deep.equal({bar: 'baz'});
    })
  });

  it('should handle circular refs', () => {
    let openapi = {
      host: 'api.acme.com',
      swagger: '2.0',
      info: {version: 'v1'},
      definitions: {
        Circle: {
          type: 'object',
          properties: {
            circles: {
              type: 'array',
              items: {$ref: '#/definitions/Circle'},
            }
          }
        }
      },
      parameters: {
        CircleBody: {
          in: 'body',
          name: 'body',
          required: true,
          schema: {$ref: '#/definitions/Circle'},
        }
      },
      paths: {
        '/foo': {
          get: {
            parameters: [{
              $ref: '#/parameters/CircleBody',
            }],
            responses: {
              200: {
                description: "OK",
                schema: {$ref: '#/definitions/Circle'}
              }
            }
          }
        }
      }
    };
    let integration = datafire.Integration.fromOpenAPI(JSON.parse(JSON.stringify(openapi)));
    let action = integration.actions.foo.get.action;
    expect(action.inputSchema).to.deep.equal({
      type: 'object',
      additionalProperties: false,
      properties: {
        body: {
          $ref: '#/definitions/Circle',
        }
      },
      definitions: openapi.definitions,
    });
    expect(action.outputSchema).to.deep.equal({
      definitions: openapi.definitions,
      $ref: '#/definitions/Circle',
    })
  })
})
