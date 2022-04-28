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
  if (pathParts[0] == 'login' || !session) {
    if (!req.fingerprint) {
      return res.data(fs.readFileSync('static/auth-instructions.gmi'), mimeType='text/gemini')
    }
    if (reddit.sessionExists(req.fingerprint)) {
      return res.data(fs.readFileSync('static/already-logged.gmi'), mimeType='text/gemini')
    }
    return res.data(reddit.loginUrl(req.fingerprint), mimeType='text/gemini')
  }
  if (pathParts[0] == 'a') {
    if (!req.fingerprint || !reddit.sessionExists(req.fingerprint)) {
      return res.data(fs.readFileSync('static/auth-instructions.gmi'), mimeType='text/gemini')
    }
    if (pathParts[1] == 'info') {
      return res.data('# Info\nPublic key fingerprint: '
       + req.fingerprint
      , mimeType='text/gemini')
    }
    if (pathParts[3] && pathParts[3] != '') {
      if (pathParts[1] != 'c' && pathParts[1] != 's') {
        return
      }
      // if (pathParts[3] != 'up' && pathParts[3] != 'down' && pathParts[3] != 'unvote') {
      //   return
      // }
      let voteType
      switch (pathParts[3]) {
        case 'up':
          voteType = true
          break
        case 'down':
          voteType = false
          break
        case 'unvote':
          voteType = null
          break
        default:
          return
      }
      return reddit.vote(pathParts[1] == 'c', voteType, pathParts[2], session)
      .then(() => pages.actions(pathParts[1] == 'c', pathParts[2], session))
      .then((t) => res.data(t, mimeType='text/gemini'))
      .catch((e) => {res.data(pages.error(e, pathParts))})
    }
    if (pathParts[1] == 'c') {
      return pages.actions(true, pathParts[2], session)
      .then((t) => res.data(t, mimeType='text/gemini'))
      .catch((e) => {res.data(pages.error(e, pathParts))})
      //return doComment(pathParts[2], pathParts, session).then((t) => res.data(t, mimeType='text/gemini'))
    }
    if (pathParts[1] == 's') {
      return pages.actions(false, pathParts[2], session)
      .then((t) => res.data(t, mimeType='text/gemini'))
      .catch((e) => {res.data(pages.error(e, pathParts))})
      //return doSubmission(pathParts[2], pathParts, session).then((t) => res.data(t, mimeType='text/gemini'))
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
    return doComment(pathParts[5], pathParts, session).then((t) => res.data(t, mimeType='text/gemini'))
  } else if (pathParts.length > 4) {
    return doSubmission(pathParts[3], pathParts, session).then((t) => res.data(t, mimeType='text/gemini'))
  }
})

function doComment (cid, pathParts, session) {
  return pages.reply(cid, session)
  .then((t) => pages.header(pathParts[3]) + t + pages.footer(pathParts[3]))
  .catch((e) => pages.error(e, pathParts))
}

function doSubmission (id, pathParts, session) {
  return pages.submission(id, session)
  .then((t) => pages.header(pathParts[3]) + t + pages.footer(pathParts[3]))
  .catch((e) => pages.error(e, pathParts))
}

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
