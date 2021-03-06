'use strict';

const koa = require('koa');
const session = require('koa-generic-session');
const userauth = require('..');
const route = require('koa-route');

module.exports = function(match, ignore) {
  const app = new koa();
  app.keys = ['i m secret'];
  app.use(session());

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        error: err.message,
        message: ctx.method + ' ' + ctx.url
      };
    }
  });

  app.use(userauth({
    match: match,
    ignore: ignore,
    loginURLForamter: url => {
      return '/mocklogin?redirect=' + url;
    },

    getUser: async ctx => {
      if (ctx.get('mockerror')) {
        const err = new Error('mock getUser error');
        err.data = {url: ctx.url};
        throw err;
      }

      if (ctx.get('mockempty')) {
        return null;
      }

      let user = ctx.session.user;
      if (ctx.get('mocklogin')) {
        user = {
          nick: 'mock user',
          userid: 1234
        };
      }

      if (ctx.get('mocklogin_redirect')) {
        user.loginRedirect = ctx.get('mocklogin_redirect');
      }

      if (ctx.get('mocklogin_callbackerror')) {
        user.loginError = ctx.get('mocklogin_callbackerror');
      }

      if (ctx.get('mocklogout_redirect')) {
        user.logoutRedirect = ctx.get('mocklogout_redirect');
      }

      if (ctx.get('mocklogout_callbackerror')) {
        user.logoutError = ctx.get('mocklogout_callbackerror');
      }
      return user;
    },

    loginCallback: async (ctx, user) => {
      if (user.loginError) {
        throw new Error(user.loginError);
      }
      return [user, user.loginRedirect];
    },

    logoutCallback: async (ctx, user) => {
      ctx.set('X-Logout', 'logoutCallback header');
      if (user.logoutError) {
        throw new Error(user.logoutError);
      }
      return user.logoutRedirect;
    }
  }));

  app.use(route.get('/mocklogin', async ctx => {
    ctx.redirect(ctx.query.redirect);
  }));

  app.use(async (ctx, next) => {
    ctx.body = {
      user: ctx.session.user || null,
      message: ctx.method + ' ' + ctx.url,
      userauthLoginReferer: ctx.session.userauthLoginReferer,
    };
  });

  return app.callback();
};
