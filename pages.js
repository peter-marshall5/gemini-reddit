// Formatting for reddit-specific elements

const reddit = require('./reddit.js')
const format = require('./format.js')
const fs = require('fs')

function header () {
  return fs.readFileSync('static/header.gmi') + '\n'
}

function footer () {
  return '\n' + fs.readFileSync('static/footer.gmi')
}

function formatAwards (awards) {
  if (awards.length > 0) {
    // let r = '[Awards:'
    // for (let i = 0; i < awards.length; i++) {
    //   r += ' "' + awards[i].name + '"'
    // }
    // return r + ']'
    return '[' + awards.length + ' award' + (awards.length != 1 ? 's' : '') + ']'
  } else {
    return '[No awards yet]'
  }
}

function formatPost (post) {
  // console.log(post)
  return format.text('static/post.gmi')
  .replace('%D', format.date(post.created_utc))
  .replace('%V', format.votes(post.ups, post.downs))
  .replace('%A', formatAwards(post.all_awardings))
  .replace('%C', format.number(post.num_comments))
  .replace('%E', format.edited(post.edited))
  .replace('%U', post.author.name)
  .replace(/%R/g, post.subreddit.display_name)
  .replace('%T', post.title)
  .replace('%L', format.page(post))
  .replace('%B', format.body(post, false))
  + '\n' + formatReplies(post.comments)
}

function formatPosts (post) {
  // console.log(post)
  return format.text('static/posts.gmi')
  .replace('%D', format.date(post.created_utc))
  .replace('%V', format.votes(post.ups, post.downs))
  .replace('%A', formatAwards(post.all_awardings))
  .replace('%C', format.number(post.num_comments))
  .replace('%E', format.edited(post.edited))
  .replace('%U', post.author.name)
  .replace('%R', post.subreddit.display_name)
  .replace('%T', post.title)
  .replace('%L', format.page(post))
  .replace('%B', format.body(post, true))
  + '\n' + formatReplies(post.comments)
}

function formatShortReply (comment, short) {
  return format.text('static/short-reply.gmi')
  .replace('%D', format.date(comment.created_utc))
  .replace('%A', formatAwards(comment.all_awardings))
  .replace('%C', format.number(comment.num_comments))
  .replace('%E', format.edited(comment.edited))
  .replace('%T', comment.link_title)
  .replace('%L', format.page(comment))
  .replace('%U', comment.author.name)
  .replace('%R', comment.subreddit.display_name)
  .replace('%O', comment.link_author)
  .replace('%B', format.reply(comment, short))
}

function getParentPermalink (comment, toplevel) {
  if (toplevel) {
    return comment.permalink
    .slice(0, comment.permalink.slice(0, -1).lastIndexOf('/'))
  }
  return comment.permalink
  .slice(0, comment.permalink.slice(0, -1).lastIndexOf('/'))
  + '/' + comment.parent_id.replace('t1_', '') + '/'
}

async function formatReplyToSubmission (comment, replies, parent) {
  // console.log(parent)
  return format.text('static/reply.gmi')
  // .replace('%D', format.date(parent.created_utc))
  // .replace('%V', format.votes(parent.ups, parent.downs))
  .replace('%G', format.date(comment.created_utc))
  .replace('%H', format.votes(comment.ups, comment.downs))
  .replace('%A', formatAwards(comment.all_awardings))
  .replace('%C', format.number(replies.length))
  .replace('%E', format.edited(comment.edited))
  // .replace(/%U/g, parent.author.name)
  // .replace('%R', parent.subreddit.display_name)
  .replace('%F', comment.author.name)
  // .replace('%L', format.page(parent))
  .replace('%L', getParentPermalink(comment, true))
  .replace('%I', format.page(comment))
  // .replace('%T', parent.title)
  .replace('%B', format.reply(comment))
  + '\n' + formatReplies(replies)
}

async function formatReplyToReply (comment, replies, parent) {
  // console.log(comment, comment.permalink.replace(/\/*\/$/, ''))
  return format.text('static/comment.gmi')
  // .replace('%D', format.date(parent.created_utc))
  // .replace('%V', format.votes(parent.ups, parent.downs))
  .replace('%G', format.date(comment.created_utc))
  .replace('%H', format.votes(comment.ups, comment.downs))
  .replace('%A', formatAwards(comment.all_awardings))
  .replace('%C', format.number(comment.replies.length))
  .replace('%E', format.edited(comment.edited))
  // .replace(/%U/g, parent.author.name)
  // .replace('%R', parent.subreddit.display_name)
  .replace('%F', comment.author.name)
  .replace('%L', getParentPermalink(comment))
  .replace('%I', format.page(comment))
  .replace('%B', format.reply(comment))
  + '\n' + formatReplies(replies)
}

const maxReplies = 30

function formatReplies (comments) {
  let t = []
  for (let i = 0; i < Math.min(comments.length, maxReplies); i++) {
    const comment = comments[i]
    t.push(format.text('static/replies.gmi')
    .replace('%G', format.date(comment.created_utc))
    .replace('%H', format.votes(comment.ups, comment.downs))
    .replace('%A', formatAwards(comment.all_awardings))
    .replace('%C', format.number(comment.replies.length))
    .replace('%E', format.edited(comment.edited))
    .replace('%F', comment.author.name)
    .replace('%L', format.page(comment))
    .replace('%B', format.reply(comment, true)))
  }
  return format.list(t)
}

function subreddit (name) {
  return reddit.getSession().then((s) => {return s.getSubreddit(name)}).then(async (subreddit) => {
    const posts = await subreddit.getHot()
    let t = []
    for (let i = 0; i < posts.length; i++) {
      t.push(formatPosts(posts[i]))
    }
    return format.text('static/subreddit.gmi')
    .replace('%R', name)
    .replace('%M', format.number(await subreddit.subscribers))
    .replace('%A', format.number(await subreddit.active_user_count))
     + '\n' + format.list(t)
  })
}

function homepage () {
  return reddit.getSession().then((s) => {return s.getHot()}).then(async (posts) => {
    // console.log(posts)
    let t = []
    for (let i = 0; i < posts.length; i++) {
      t.push(formatPosts(posts[i]))
    }
    return format.text('static/homepage.gmi')
     + '\n' + format.list(t)
  })
}

function user (name) {
  return reddit.getSession().then((s) => {return s.getUser(name)}).then(async (user) => {
    const posts = await user.getOverview()
    let t = []
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].comment_type === null) {
        t.push(formatShortReply(posts[i], true))
      } else {
        t.push(formatPosts(posts[i]))
      }
    }
    return format.text('static/user.gmi')
    .replace('%U', name)
    .replace('%K', await user.link_karma)
     + '\n' + format.list(t)
  })
}

function submission (id) {
  return reddit.getSession()
  .then((s) => {return s.getSubmission(id).fetch()})
  .then(formatPost)
}

function reply (id, cid) {
  return reddit.getSession()
  .then((s) => {
    const comment = s.getComment(cid)
    return Promise.all([
      comment.fetch(),
      comment.replies.fetchMore({amount: 10, skipReplies: true})
    ]).then((stuff) => {
      if (stuff[0].parent_id.startsWith('t1')) {
        return formatReplyToReply(stuff[0], stuff[1])
      } else {
        return formatReplyToSubmission(stuff[0], stuff[1])
      }
    })
  })
}

function handleError (e, pathParts) {
  if (e.message.startsWith('The subreddit')) {
    return format.text('static/invalid-subreddit.gmi')
    .replace(/%R/g, pathParts[1])
  }
  // TODO: Report the error to a DB?
  // console.log(e)
  return `An unknown error occurred.\n\n(${e.message})`
}

module.exports = {
  subreddit: subreddit,
  user: user,
  submission: submission,
  reply: reply,
  header: header,
  footer: footer,
  homepage: homepage,
  error: handleError
}

// reddit.getSession().then(console.log)
// console.log(reddit.getSession().then((s) => {return s.getSubreddit(name).getHot()}))
