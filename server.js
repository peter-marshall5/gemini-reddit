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

function requestHandler (req, res) {
  const session = reddit.getSession(req.fingerprint)
  if (!req.path || req.path == '/') {
    return pages.homepage(session)
  }
  const pathParts = req.path.split('/').slice(1)
  if (pathParts[0] == 'login' || !session) {
    if (!req.fingerprint) {
      return fs.readFileSync('static/auth-instructions.gmi').toString()
    }
    if (reddit.sessionExists(req.fingerprint)) {
      return fs.readFileSync('static/already-logged.gmi').toString()
    }
    return reddit.loginUrl(req.fingerprint)
  }
  if (pathParts[0] == 'a') {
    if (!req.fingerprint || !reddit.sessionExists(req.fingerprint)) {
      return fs.readFileSync('static/auth-instructions.gmi').toString()
    }
    if (pathParts[1] == 'info') {
      return '# Info\nPublic key fingerprint: '
       + req.fingerprint
    }
    if (pathParts[3] && pathParts[3] != '') {
      if (pathParts[1] != 'c' && pathParts[1] != 's') {
        return
      }
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
    }
    if (pathParts[1] == 'c') {
      return pages.actions(true, pathParts[2], session)
    }
    if (pathParts[1] == 's') {
      return pages.actions(false, pathParts[2], session)
    }
    return
  }
  if (pathParts.length == 2 || pathParts.length == 3) {
    // console.log(pathParts[1])
    if (pathParts[0] == 'r') {
      // Subreddit
      return pages.subreddit(pathParts[1], session)
    }
    if (pathParts[0] == 'u') {
      // User
      return pages.user(pathParts[1], session)
    }
  } else if (pathParts.length > 6) {
    return doComment(pathParts[5], pathParts, session)
  } else if (pathParts.length > 4) {
    return doSubmission(pathParts[3], pathParts, session)
  }
}

function doComment (cid, pathParts, session) {
  return pages.reply(cid, session)
  .then((t) => pages.header(pathParts[3]) + t + pages.footer(pathParts[3]))
}

function doSubmission (id, pathParts, session) {
  return pages.submission(id, session)
  .then((t) => pages.header(pathParts[3]) + t + pages.footer(pathParts[3]))
}

app.on('*', function(req, res) {
  const t = requestHandler(req, res)
  if (typeof t === 'string') {
    res.data(t, mimeType='text/gemini')
    return
  }
  return t.then((t) => res.data(pages.header() + t + pages.footer(), mimeType='text/gemini'))
  .catch((e) => {
    const pathParts = req.path.split('/').slice(1)
    res.data(pages.error(e, pathParts), mimeType='text/gemini')
  })
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
