// Do reddit stuff

const snoowrap = require('snoowrap')
const FormData = require('form-data')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
const fs = require('fs')

const sessions = []
let anonSession = null

const clientId = 'qjuGunndIej__Of-o_FeKg'
const clientSecret = 'VW5XGYniGFNCBW5_2pTEcf6HtecXcg'
const redirectUri = 'http://localhost:8080/auth'
const permissions = [
  'account',
  'edit',
  'flair',
  'history',
  'identity',
  'privatemessages',
  'read',
  'save',
  'submit',
  'subscribe',
  'vote'
]

function createAnonToken () {
  return fetch('https://www.reddit.com/api/v1/access_token', {
    body: 'grant_type=https://oauth.reddit.com/grants/installed_client&device_id=DO_NOT_TRACK_THIS_DEVICE',
    method: 'POST',
    credentials: 'include',
    headers: {
      authorization: 'Basic ' + btoa(clientId + ':' + clientSecret),
      'content-type': 'application/x-www-form-urlencoded',
    }
  }).then(response => response.text()).then(JSON.parse)
}

function createAnonSession (tokenInfo) {
  anonSession = new snoowrap({
    userAgent: 'Gemini proxy by petmshall',
    accessToken: tokenInfo.access_token
  })
  anonSession.expiry = tokenInfo.expires_in || 3600
  setTimeout(() => {
    // Purge the token after expiry
    anonSession = null
  }, anonSession.expiry * 1000)
  return anonSession
}

function getAnonSession () {
  if (!anonSession) {
    return createAnonToken().then(createAnonSession)
  } else {
    return new Promise((r) => r(anonSession))
  }
}

function getSession (id) {
  if (id && sessions[id]) {
    return new Promise((r) => r(sessions[id]))
  } else {
    return getAnonSession()
  }
}

function sessionExists (id) {
  return !!sessions[id]
}

async function createSession (id, code) {
  id = unescape(id)
  // Disallow double login
  if (sessions[id]) {
    return
  }
  // sessions[id] = null

  // Do token stuff
  let response = await fetch(`https://www.reddit.com/api/v1/access_token`,  {
    method: 'POST',
    body: 'grant_type=authorization_code&code=' + code + '&redirect_uri=' + redirectUri,
    headers: {
      authorization: 'Basic ' + btoa(clientId + ':' + clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  let body = await response.json()

  if (body.error) {
    return
  }
  // Check again in case a double request was sent
  if (sessions[id]) {
    return
  }

  sessions[id] = new snoowrap({
    userAgent: 'Gemini proxy by petmshall',
    clientId: clientId,
    clientSecret: clientSecret,
    refreshToken: body.refresh_token,
    accessToken: body.access_token
  })
}

function loginUrl (fingerprint) {
  return fs.readFileSync('static/auth-required.gmi').toString().replace('%L', 'https://www.reddit.com/api/v1/authorize?client_id=' + clientId + '&response_type=code&state=' + escape(fingerprint) + '&redirect_uri=' + redirectUri + '&duration=permanent&scope=' + permissions.join(','))
}

function vote (isComment, voteType, id, session) {
  return session
  .then((s) => {
    if (isComment) {
      return s.getComment(id)
    }
    return s.getSubmission(id)
  })
  .then((content) => {
    if (voteType == true) {
      return content.upvote()
    }
    if (voteType == null) {
      return content.unvote()
    }
    if (voteType == false) {
      return content.downvote()
    }
  })
}

module.exports = {
  getSession: getSession,
  createSession: createSession,
  loginUrl: loginUrl,
  sessionExists: sessionExists,
  vote: vote
}
