// Formatting for reddit-specific elements

//const reddit = require('./reddit.js')
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

function formatPost (post, actionLink) {
  // console.log(post)
  return format.text('static/post.gmi')
  .replace('%D', format.date(post.created_utc))
  .replace('%V', format.votes(post.ups, post.downs, post.likes))
  .replace('%A', formatAwards(post.all_awardings))
  .replace('%C', format.number(post.num_comments))
  .replace('%E', format.edited(post.edited))
  .replace('%J', actionLink)
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
  .replace('%V', format.votes(post.ups, post.downs, post.likes))
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
  .replace('%V', format.votes(comment.ups, comment.downs, comment.likes))
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

async function formatReplyToSubmission (comment, replies, actionLink, parent) {
  // console.log(parent)
  return format.text('static/reply.gmi')
  // .replace('%D', format.date(parent.created_utc))
  // .replace('%V', format.votes(parent.ups, parent.downs))
  .replace('%G', format.date(comment.created_utc))
  .replace('%H', format.votes(comment.ups, comment.downs, comment.likes))
  .replace('%A', formatAwards(comment.all_awardings))
  .replace('%C', format.number(replies.length))
  .replace('%E', format.edited(comment.edited))
  .replace('%J', actionLink)
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

async function formatReplyToReply (comment, replies, actionLink, parent) {
  // console.log(comment, comment.permalink.replace(/\/*\/$/, ''))
  return format.text('static/comment.gmi')
  // .replace('%D', format.date(parent.created_utc))
  // .replace('%V', format.votes(parent.ups, parent.downs))
  .replace('%G', format.date(comment.created_utc))
  .replace('%H', format.votes(comment.ups, comment.downs, comment.likes))
  .replace('%A', formatAwards(comment.all_awardings))
  .replace('%C', format.number(comment.replies.length))
  .replace('%E', format.edited(comment.edited))
  .replace('%J', actionLink)
  // .replace(/%U/g, parent.author.name)
  // .replace('%R', parent.subreddit.display_name)
  .replace('%F', comment.author.name)
  .replace('%L', getParentPermalink(comment))
  .replace('%I', format.page(comment))
  .replace('%B', format.reply(comment))
  + '\n' + formatReplies(replies)
}

const maxReplies = 30

function formatReplies (comments, level) {
  if (comments.length < 1) return ''
  if (!level) level = 0
  let t = ''
  for (let i = 0; i < Math.min(comments.length, maxReplies); i++) {
    const comment = comments[i]
    t += format.text('static/replies.gmi')
    .replace('%G', format.date(comment.created_utc))
    .replace('%H', format.votes(comment.ups, comment.downs, comment.likes))
    .replace('%A', formatAwards(comment.all_awardings))
    .replace('%C', format.number(comment.replies.length))
    .replace('%E', format.edited(comment.edited))
    .replace('%V', format.level(level))
    .replace('%F', comment.author.name)
    .replace('%L', format.page(comment))
    .replace('%B', format.reply(comment, true))
     + formatReplies(comments[i].replies, level + 1)
     + (level == 0 ? '\n\n' : '')
  }
  return t
}

function subreddit (name, session) {
  return session.then((s) => {return s.getSubreddit(name)}).then(async (subreddit) => {
    const posts = await subreddit.getHot()
    let t = []
    for (let i = 0; i < posts.length; i++) {
      t.push(formatPosts(posts[i]))
    }
    return format.text('static/subreddit.gmi')
    .replace('%R', await subreddit.display_name_prefixed)
    .replace('%M', format.number(await subreddit.subscribers))
    .replace('%A', format.number(await subreddit.active_user_count))
     + '\n' + format.list(t)
  })
}

function homepage (session) {
  return session.then((s) => {return s.getHot()}).then(async (posts) => {
    // console.log(posts)
    let t = []
    for (let i = 0; i < posts.length; i++) {
      t.push(formatPosts(posts[i]))
    }
    return format.text('static/homepage.gmi')
     + '\n' + format.list(t)
  })
}

function user (name, session) {
  return session.then((s) => {return s.getUser(name)}).then(async (user) => {
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

function submission (id, session) {
  return session
  .then((s) => {return s.getSubmission(id).fetch()})
  .then((p) => formatPost(p, formatActionLink(false, id)))
}

function reply (cid, session) {
  return session
  .then((s) => {
    const comment = s.getComment(cid)
    return Promise.all([
      comment.fetch(),
      comment.replies.fetchMore({amount: 20, skipReplies: false})
    ]).then((stuff) => {
      if (stuff[0].parent_id.startsWith('t1')) {
        return formatReplyToReply(stuff[0], stuff[1], formatActionLink(true, cid))
      } else {
        return formatReplyToSubmission(stuff[0], stuff[1], formatActionLink(true, cid))
      }
    })
  })
}

function formatActionLink (isComment, id) {
  if (isComment) {
    return `/a/c/${id}/`
  }
  return `/a/s/${id}/`
}

function submissionActions (id, session) {
  return session
  .then((s) => {return s.getContentByIds([s.getSubmission(id)])})
  .then(async (stuff) => {
    const submission = stuff[0]
    const like = await submission.likes
    const status = (like == true ? ' (You upvoted this)' : '')
    + (like == false ? ' (You downvoted this)' : '')
    return fs.readFileSync('static/actions.gmi').toString()
    .replace('%I', 'Post')
    .replace('%S', status)
    .replace('%T', await submission.author.name + ' (' + await submission.title + ')')
  })
}

function commentActions (id, session) {
  return session
  .then((s) => {return s.getComment(id)})
  .then(async (comment) => {
    const like = await comment.likes
    const status = (like == true ? ' (You upvoted this)' : '')
    + (like == false ? ' (You downvoted this)' : '')
    return fs.readFileSync('static/actions.gmi').toString()
    .replace('%I', 'Comment')
    .replace('%S', status)
    //.replace('%T', 'u/' + await comment.author.name)
  })
}

function actions (isComment, id, session) {
  if (isComment) {
    return commentActions(id, session)
  }
  return submissionActions(id, session)
}

function handleError (e, pathParts) {
  if (e.message.startsWith('The subreddit')) {
    return format.text('static/invalid-subreddit.gmi')
    .replace(/%R/g, pathParts[1])
  }
  // TODO: Report the error to a DB?
  // console.log(e)
  return `An unknown error occurred.\n\n\`\`\`\n${e.message}\n\`\`\``
}

module.exports = {
  subreddit: subreddit,
  user: user,
  submission: submission,
  reply: reply,
  header: header,
  footer: footer,
  homepage: homepage,
  actions: actions,
  error: handleError
}
