// Formatting for common elements

const fs = require('fs')
const config = require('./config.js')

const protocol = 'gemini://'

function formatLink (text, loc) {
  return '=> ' + loc + ' ' + text
}

function formatDate (d) {
  return '[DATE ' + d + ' UTC]'
}

function formatList (list) {
  return list.join('\n\n')
}

function formatEdited (isEdited) {
  return isEdited ? '(Edited)' : ''
}

const maxChars = 200

function shorten (longtext, oneline) {
  if (!longtext) {
    return ''
  }
  if (longtext.length < maxChars) {
    return longtext.replace(/\n/g, ' ')
  }
  return purify(longtext.slice(0, maxChars), oneline) + '...'
}

function purify (text, oneline) {
  if (oneline) {
    text = text.replace(/\n/g, ' ').replace(/\r/g, ' ')
  }
  return text.replace(/^\*/g, ' *').replace(/^#/g, ' #')
}

function formatBody (thing, short) {
  if (thing.is_self) {
    if (thing.selftext.length > 0) {
      if (short) {
        return shorten(thing.selftext)
      } else {
        return thing.selftext
      }
    } else {
      return '[No body]'
    }
  } else if (thing.url) {
    if (thing.url.indexOf('i.redd.it') > -1) {
      return formatLink('[Image]', thing.url)
    } else if (thing.url.indexOf('v.redd.it') > -1) {
      return formatLink('[Video]', thing.url)
    } else if (thing.url.indexOf('reddit.com/gallery') > -1) {
      return formatLink('[Gallery]', thing.url)
    }
    return formatLink(thing.url, thing.url)
  }
  return '[Unsupported post type]'
}

function formatReply (comment, short) {
  if (short) {
    return shorten(comment.body)
  } else {
    return comment.body
  }
}

function formatVotes (upvotes, downvotes) {
  return formatNumber(upvotes) + '⬆️ / ' + formatNumber(downvotes) + '⬇️'
}

function pageLink (thing) {
  return protocol + config.servername + thing.permalink
}

function formatNumber (num) {
  if (num >= 1000000) {
    return Math.round(num / 100000) / 10 + 'm'
  } else if (num >= 1000) {
    return Math.round(num / 100) / 10 + 'k'
  }
  return num
}

module.exports = {
  link: formatLink,
  date: formatDate,
  list: formatList,
  edited: formatEdited,
  text: (path) => {
    return fs.readFileSync(path, {encoding:'utf8', flag:'r'})
  },
  shorten: shorten,
  body: formatBody,
  reply: formatReply,
  votes: formatVotes,
  page: pageLink,
  number: formatNumber
}
