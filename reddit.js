// Do reddit stuff

const snoowrap = require('snoowrap')
const FormData = require('form-data')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

const clientId = 'qjuGunndIej__Of-o_FeKg'
const clientSecret = 'VW5XGYniGFNCBW5_2pTEcf6HtecXcg'
const sessions = []
let anonSession = null

function createAnonToken () {
  return fetch('https://www.reddit.com/api/v1/access_token', {
    headers: {
      authorization: 'Basic ' + btoa(clientId + ':' + clientSecret),
      'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryECXlBXLAFzVMhKTO',
    },
    body: '------WebKitFormBoundaryECXlBXLAFzVMhKTO\r\nContent-Disposition: form-data; name=\"grant_type\"\r\n\r\nhttps://oauth.reddit.com/grants/installed_client\r\n------WebKitFormBoundaryECXlBXLAFzVMhKTO\r\nContent-Disposition: form-data; name=\"device_id\"\r\n\r\nDO_NOT_TRACK_THIS_DEVICE\r\n------WebKitFormBoundaryECXlBXLAFzVMhKTO--\r\n',
    method: 'POST',
    credentials: 'include'
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
  if (id > -1) {
    return sessions[id]
  } else {
    return getAnonSession()
  }
}

// getAnonSession().then((id) => {anonSession.getSubreddit('place').getHot().then(console.log)})
// getAnonSession().then((id) => {anonSession.getSubmission('twb34n').author.name.then(console.log)})
// getAnonSession().then((id) => {console.log(anonSession.getUser('589kfzm6').name)})
// getAnonSession().then((id) => {anonSession.getSubmission('4a9u54').title.then(console.log)})

module.exports = {
  getSession: getSession
}
