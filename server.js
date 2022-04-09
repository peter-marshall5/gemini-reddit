// The gemini server

const gemini = require('gemini-server')
const fs = require('fs')
const config = require('./config.js')
const pages = require('./pages.js')

const app = gemini({cert: fs.readFileSync(config.cert),
key: fs.readFileSync(config.key)})

// app.on('/', (req, res) => {
//   res.file('static/index.gemini')
// })

app.on('*', function(req, res) {
  if (!req.path || req.path == '/') {
    return pages.homepage()
    .then((t) => {res.data(pages.header() + t + pages.footer(), mimeType='text/gemini')})
  }
  const pathParts = req.path.split('/').slice(1)
  if (pathParts.length == 2 || pathParts.length == 3) {
    // console.log(pathParts[1])
    if (pathParts[0] == 'r') {
      // Subreddit
      return pages.subreddit(pathParts[1])
      .then((t) => {res.data(pages.header(pathParts[1]) + t + pages.footer(pathParts[1]), mimeType='text/gemini')})
      .catch((e) => {res.data(pages.error(e, pathParts))})
    }
    if (pathParts[0] == 'u') {
      // User
      return pages.user(pathParts[1])
      .then((t) => {res.data(pages.header(pathParts[1]) + t + pages.footer(pathParts[1]), mimeType='text/gemini')})
      .catch((e) => {res.data(pages.error(e, pathParts))})
    }
  } else if (pathParts.length > 6) {
    // console.log(pathParts[3], pathParts[5])
    return pages.reply(pathParts[3], pathParts[5])
    .then((t) => {res.data(pages.header(pathParts[3]) + t + pages.footer(pathParts[3]), mimeType='text/gemini')})
    .catch((e) => {res.data(pages.error(e, pathParts))})
  } else if (pathParts.length > 4) {
    // console.log(pathParts[3])
    return pages.submission(pathParts[3])
    .then((t) => {res.data(pages.header(pathParts[3]) + t + pages.footer(pathParts[3]), mimeType='text/gemini')})
    .catch((e) => {res.data(pages.error(e, pathParts))})
  }
})

app.listen()
