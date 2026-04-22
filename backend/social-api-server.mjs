import { createServer } from 'node:http'

const PORT = Number(process.env.PORT || 8787)

const goals = [
  {
    id: 'goal-1',
    title: 'Muziek maken',
    cadence: 'Dagelijks',
    minutesPerDay: 10,
    streak: 6,
    completionRate: 86,
    followers: [
      { id: 'f-1', name: 'Lina', handle: '@lina' },
      { id: 'f-2', name: 'Sam', handle: '@sam' },
    ],
    sharedWith: ['Lina', 'Sam'],
    lastUpdate: 'Vandaag 09:10',
    todayDone: true,
  },
  {
    id: 'goal-2',
    title: 'Elke dag schrijven',
    cadence: 'Werkdagen',
    minutesPerDay: 15,
    streak: 3,
    completionRate: 71,
    followers: [
      { id: 'f-3', name: 'Noor', handle: '@noor' },
    ],
    sharedWith: ['Noor'],
    lastUpdate: 'Gisteren 21:05',
    todayDone: false,
  },
]

const server = createServer(async (request, response) => {
  setCorsHeaders(response)

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url || '/', `http://${request.headers.host}`)

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/social-goals') {
    sendJson(response, 200, { goals })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/social-goals') {
    const body = await readJson(request)
    const nextGoal = {
      id: `goal-${Date.now()}`,
      title: String(body.title || 'Nieuw gedeeld doel'),
      cadence: String(body.cadence || 'Dagelijks'),
      minutesPerDay: Number(body.minutesPerDay || 10),
      streak: 0,
      completionRate: 0,
      followers: Array.isArray(body.followers) ? body.followers : [],
      sharedWith: Array.isArray(body.sharedWith) ? body.sharedWith : [],
      lastUpdate: 'Zojuist',
      todayDone: false,
    }

    goals.unshift(nextGoal)
    sendJson(response, 201, { goal: nextGoal })
    return
  }

  if (request.method === 'POST' && url.pathname.match(/^\/api\/social-goals\/[^/]+\/progress$/)) {
    const goalId = url.pathname.split('/')[3]
    const goal = goals.find((item) => item.id === goalId)

    if (!goal) {
      sendJson(response, 404, { error: 'Goal not found' })
      return
    }

    goal.todayDone = true
    goal.streak += 1
    goal.completionRate = Math.min(100, goal.completionRate + 4)
    goal.lastUpdate = 'Zojuist'
    sendJson(response, 200, { goal })
    return
  }

  sendJson(response, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Social API listening on http://localhost:${PORT}`)
})

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}
