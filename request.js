const package = require('./package.json');
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY || process.env.https_proxy || process.env.HTTPS_PROXY;

module.exports = (url, options, callback) => {
  if (httpProxy) options.agent = new HttpsProxyAgent(httpProxy);

  options.headers = options.headers || {};
  options.headers['User-Agent'] = `${package.name}/v${package.version} (node/${process.version}; ${process.platform} ${process.arch})`;
  options.headers['X-User-Agent'] = options.headers['User-Agent'];
  if (options.body || options.method !== 'get') options.headers['Content-Type'] = 'application/json';
  if (options.body) {
    if (typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }
  if (options.headers['Authorization'] === undefined) delete options.headers['Authorization'];
  fetch(url, options).then((res) => {
    if (res.headers.get('content-type') && res.headers.get('content-type').indexOf('json') > 0) {
      return new Promise((resolve, reject) => res.json().then((obj) => resolve({ res, obj })).catch(reject));
    } else {
      return { res };
    }
  }).then((ret) => callback(null, ret.res, ret.obj)).catch((err) => {
    if (err && err.message && err.message.indexOf('ENOTFOUND') > -1) {
      setTimeout(() => {
        fetch(url, options).then((res) => {
          if (res.headers.get('content-type') && res.headers.get('content-type').indexOf('json') > 0) {
            return new Promise((resolve, reject) => res.json().then((obj) => resolve({ res, obj })).catch(reject));
          } else {
            return { res };
          }
        }).then((ret) => callback(null, ret.res, ret.obj)).catch(callback);
      }, 3000);
      return;
    }
    callback(err);
  });
};
