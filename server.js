// The gemini server

const gemini = require('gemini-server')
const http = require('http')
const fs = require('fs')
const config = require('./config.js')
const pages = require('./pages.js')
const reddit = require('./reddit.js')

const app = gemini({cert: fs.readFileSync(config.cert),
key: fs.readFileSync(config.key)})

// app.on('/', (req, res) => {
//   res.file('static/index.gemini')
// })

app.on('*', function(req, res) {
  const session = reddit.getSession(req.fingerprint)
  if (!req.path || req.path == '/') {
    return pages.homepage(session)
    .then((t) => {res.data(pages.header() + t + pages.footer(), mimeType='text/gemini')})
  }
  const pathParts = req.path.split('/').slice(1)
  if (pathParts[0] == 'login') {
    if (!req.fingerprint) {
      return res.data(fs.readFileSync('static/auth-instructions.gmi'), mimeType='text/gemini')
    }
    if (reddit.sessionExists(req.fingerprint)) {
      return res.data(fs.readFileSync('static/already-logged.gmi'), mimeType='text/gemini')
    }
    return res.data(reddit.loginUrl(req.fingerprint), mimeType='text/gemini')
  }
  if (pathParts[0] == 'a') {
    console.log(req.fingerprint)
    if (!req.fingerprint) {
      return res.data(fs.readFileSync('static/auth-instructions.gmi'), mimeType='text/gemini')
    }
    if (pathParts[1] == 'info') {
      res.data('# Info\nPublic key fingerprint: ' + req.fingerprint + '\n', mimeType='text/gemini')
    }
    return
  }
  if (pathParts.length == 2 || pathParts.length == 3) {
    // console.log(pathParts[1])
    if (pathParts[0] == 'r') {
      // Subreddit
      return pages.subreddit(pathParts[1], session)
      .then((t) => {res.data(pages.header(pathParts[1]) + t + pages.footer(pathParts[1]), mimeType='text/gemini')})
      .catch((e) => {res.data(pages.error(e, pathParts))})
    }
    if (pathParts[0] == 'u') {
      // User
      return pages.user(pathParts[1], session)
      .then((t) => {res.data(pages.header(pathParts[1]) + t + pages.footer(pathParts[1]), mimeType='text/gemini')})
      .catch((e) => {res.data(pages.error(e, pathParts))})
    }
  } else if (pathParts.length > 6) {
    // console.log(pathParts[3], pathParts[5])
    return pages.reply(pathParts[3], pathParts[5], session)
    .then((t) => {res.data(pages.header(pathParts[3]) + t + pages.footer(pathParts[3]), mimeType='text/gemini')})
    .catch((e) => {res.data(pages.error(e, pathParts))})
  } else if (pathParts.length > 4) {
    // console.log(pathParts[3])
    return pages.submission(pathParts[3], session)
    .then((t) => {res.data(pages.header(pathParts[3]) + t + pages.footer(pathParts[3]), mimeType='text/gemini')})
    .catch((e) => {res.data(pages.error(e, pathParts))})
  }
})

app.listen()

http.createServer(function (req, res) {
  if (req.url.startsWith('/auth')) {
    const params = {}

    // There is probably an easier way to do this
    const parts = req.url.slice(req.url.indexOf('?') + 1).split('&')
    for (let i = 0; i < parts.length; i++) {
      const parts2 = parts[i].split('=')
      params[parts2[0]] = parts2[1]
    }

    if (!params.state || !params.code) {
      res.write('Missing parameters')
      res.end()
      return
    }
    reddit.createSession(params.state, params.code)
    res.write('<script>//window.close()</script>\nOK - You can close this page now')
    res.end()
    return
  }
  res.end()
}).listen(8080)
